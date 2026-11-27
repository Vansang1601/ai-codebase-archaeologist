"""Authentication and authorization middleware for M2.

Provides:
- JWT token creation/validation (with jti for revocation)
- Session management (create, verify revocation, revoke on logout)
- Audit logging helpers
- get_current_user dependency (returns User or raises 401)
- get_current_user_optional (returns User or None)
- require_repo_access (checks tenant isolation for repository endpoints)
- Simple in-process rate limiter for login/magic-link endpoints
"""
from __future__ import annotations

import datetime as _dt
import os
import threading
import uuid
from collections import defaultdict
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .auth_models import User, Tenant, TenantMember, AuthSession, AuthAuditLog

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


# ---------------------------------------------------------------------------
# Rate limiter (in-process, per-IP sliding window)
# ---------------------------------------------------------------------------

class _RateLimiter:
    """Thread-safe sliding-window rate limiter keyed by (endpoint, ip)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[tuple[str, str], list[float]] = defaultdict(list)

    def check(self, key: str, ip: str, max_hits: int, window_seconds: int) -> bool:
        """Return True if the request is allowed, False if rate-limited."""
        import time
        now = time.monotonic()
        bucket_key = (key, ip)
        with self._lock:
            hits = self._hits[bucket_key]
            cutoff = now - window_seconds
            # Drop expired hits
            self._hits[bucket_key] = [t for t in hits if t > cutoff]
            if len(self._hits[bucket_key]) >= max_hits:
                return False
            self._hits[bucket_key].append(now)
            return True


_rate_limiter = _RateLimiter()


def check_rate_limit(key: str, request: Request, max_hits: int = 10, window_seconds: int = 60) -> None:
    """Raise HTTP 429 if the IP has exceeded the rate limit for the given key."""
    settings = get_settings()
    # Bypass rate limiting in test environment so test suites running hundreds of calls aren't throttled
    if settings.environment.lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST"):
        return

    ip = _get_client_ip(request)
    if not _rate_limiter.check(key, ip, max_hits=max_hits, window_seconds=window_seconds):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before trying again.",
            headers={"Retry-After": str(window_seconds)},
        )


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting X-Forwarded-For from trusted proxy."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(
    user_id: str,
    tenant_id: str | None = None,
    db: Session | None = None,
    request: Request | None = None,
) -> str:
    """Create a signed JWT and persist a session record for revocation support."""
    settings = get_settings()
    if not settings.auth_secret:
        raise RuntimeError("AUTH_SECRET is not configured")
    now = _dt.datetime.now(_dt.timezone.utc)
    jti = str(uuid.uuid4())
    expires_at = now + _dt.timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "jti": jti,
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.auth_secret, algorithm=ALGORITHM)

    # Persist session for revocation support
    if db is not None:
        ua = request.headers.get("user-agent", "") if request else None
        ip = _get_client_ip(request) if request else None
        session = AuthSession(
            user_id=user_id,
            tenant_id=tenant_id,
            jti=jti,
            issued_at=now,
            expires_at=expires_at,
            user_agent=ua[:512] if ua else None,
            ip_address=ip,
        )
        db.add(session)
        # Don't commit here — caller commits after upsert_oauth_user etc.
        # Use flush so the row is visible in same transaction.
        try:
            db.flush()
        except Exception:
            pass  # Non-critical — token is still valid without session row

    return token


def create_magic_link_token(email: str, name: str | None = None, expires_minutes: int = 15) -> str:
    """Create a short-lived signed JWT for one-click magic-link sign-in."""
    settings = get_settings()
    if not settings.auth_secret:
        raise RuntimeError("AUTH_SECRET is not configured")
    now = _dt.datetime.now(_dt.timezone.utc)
    payload = {
        "purpose": "magic_link",
        "email": email,
        "name": name,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + _dt.timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=ALGORITHM)


def verify_magic_link_token(token: str) -> dict:
    """Decode and validate a magic-link token."""
    payload = _decode_token(token)
    if payload.get("purpose") != "magic_link" or not payload.get("email"):
        raise HTTPException(status_code=401, detail="Invalid magic link token")
    return payload


def _decode_token(token: str) -> dict:
    settings = get_settings()
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="Authentication not configured")
    try:
        return jwt.decode(token, settings.auth_secret, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _extract_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def is_token_revoked(jti: str, db: Session) -> bool:
    """Return True if the JWT has been revoked server-side."""
    session = db.scalar(select(AuthSession).where(AuthSession.jti == jti))
    if session is None:
        # No session record → old token issued before revocation was added; allow it.
        return False
    return session.revoked_at is not None


def revoke_session_by_jti(jti: str, db: Session) -> None:
    """Mark a session as revoked so the JWT cannot be used again."""
    session = db.scalar(select(AuthSession).where(AuthSession.jti == jti))
    if session and session.revoked_at is None:
        session.revoked_at = _dt.datetime.now(_dt.timezone.utc)
        db.commit()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: requires authenticated user, returns User ORM object."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Check revocation if jti present
    jti = payload.get("jti")
    if jti and is_token_revoked(jti, db):
        raise HTTPException(status_code=401, detail="Session has been revoked")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Attach token claims for quick access
    user._current_tenant_id = payload.get("tenant_id")  # type: ignore[attr-defined]
    user._current_jti = jti  # type: ignore[attr-defined]
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """FastAPI dependency: returns User if authenticated, None otherwise."""
    token = _extract_token(request)
    if not token:
        return None
    try:
        payload = _decode_token(token)
    except HTTPException:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None

    jti = payload.get("jti")
    if jti and is_token_revoked(jti, db):
        return None

    user = db.get(User, user_id)
    if user:
        user._current_tenant_id = payload.get("tenant_id")  # type: ignore[attr-defined]
        user._current_jti = jti  # type: ignore[attr-defined]
    return user


def get_user_tenant_id(user: User) -> str:
    """Get the tenant_id from the authenticated user's token."""
    tid = getattr(user, "_current_tenant_id", None)
    if not tid:
        raise HTTPException(status_code=403, detail="No tenant context")
    return tid


def require_repo_access(repo, user: User) -> None:
    """Verify user has access to the given repository via tenant.

    Raises 403 if the repository's tenant_id does not match the user's tenant
    and is not the public default tenant.
    """
    tenant_id = get_user_tenant_id(user)
    if repo.tenant_id and repo.tenant_id != tenant_id and repo.tenant_id != "00000000-0000-0000-0000-000000000001":
        raise HTTPException(status_code=403, detail="Forbidden")


def require_job_access(job, user: User) -> None:
    """Verify user has access to the given analysis job via tenant."""
    tenant_id = get_user_tenant_id(user)
    if job.tenant_id and job.tenant_id != tenant_id and job.tenant_id != "00000000-0000-0000-0000-000000000001":
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------------------------------------------------------------------------
# Audit log helper
# ---------------------------------------------------------------------------

def log_auth_event(
    db: Session,
    event: str,
    *,
    user_id: str | None = None,
    provider: str | None = None,
    request: Request | None = None,
    success: bool = True,
    detail: str | None = None,
) -> None:
    """Write an immutable audit log entry. Never raises — logging must not block auth."""
    try:
        ip = _get_client_ip(request) if request else None
        ua = request.headers.get("user-agent", "")[:512] if request else None
        entry = AuthAuditLog(
            user_id=user_id,
            event=event,
            provider=provider,
            ip_address=ip,
            user_agent=ua,
            success=success,
            detail=detail,
        )
        db.add(entry)
        db.commit()
    except Exception:
        pass  # Audit failures must never break the auth flow
