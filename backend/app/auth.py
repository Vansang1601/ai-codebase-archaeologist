"""Authentication and authorization middleware for M2.

Provides:
- JWT token creation/validation
- get_current_user dependency (returns User or raises 401)
- get_current_user_optional (returns User or None)
- require_repo_access (checks tenant isolation for repository endpoints)
"""
from __future__ import annotations

import datetime as _dt
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .auth_models import User, Tenant, TenantMember

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def create_access_token(user_id: str, tenant_id: str | None = None) -> str:
    """Create a signed JWT for the given user."""
    settings = get_settings()
    if not settings.auth_secret:
        raise RuntimeError("AUTH_SECRET is not configured")
    now = _dt.datetime.now(_dt.timezone.utc)
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "iat": now,
        "exp": now + _dt.timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=ALGORITHM)


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


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """FastAPI dependency: requires authenticated user, returns User ORM object."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # Attach tenant_id from token for quick access
    user._current_tenant_id = payload.get("tenant_id")  # type: ignore[attr-defined]
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
    user = db.get(User, user_id)
    if user:
        user._current_tenant_id = payload.get("tenant_id")  # type: ignore[attr-defined]
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
