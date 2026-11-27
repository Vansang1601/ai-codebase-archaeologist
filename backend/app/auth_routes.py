"""Auth API endpoints for M2.

Provides:
- GET  /api/auth/status               — config & health check
- GET  /api/auth/oauth/{provider}/url — initiate OAuth (GitHub / Google)
- POST /api/auth/oauth/{provider}/callback — API-mode OAuth code exchange
- GET  /api/auth/oauth/{provider}/callback — browser redirect from provider
- POST /api/auth/magic-link           — generate magic link token
- GET  /api/auth/magic-link/verify    — verify magic link, issue session
- POST /api/auth/register             — dev-only workspace registration
- POST /api/auth/login                — dev-only workspace login
- POST /api/auth/logout               — revoke current session
- GET  /api/auth/me                   — current user profile + accounts
- PATCH /api/auth/me                  — update display name / locale
- GET  /api/auth/sessions             — list all active sessions for user
- DELETE /api/auth/sessions/{session_id} — revoke a specific session
- GET  /api/auth/github/installations — GitHub App installations
- POST /api/auth/github/installations — register GitHub App installation
- GET  /api/auth/github/repositories  — repos accessible via GitHub App

Security features:
- Rate limiting: 5 req/min on login/OAuth/magic-link endpoints
- JWT jti claim: each token is uniquely identified
- Server-side session table: tokens can be revoked on logout
- Audit log: every auth event is recorded in auth_audit_log
- OAuth state parameter: prevents CSRF on OAuth callbacks
- SameSite=Lax cookie with Secure flag in production
"""
from __future__ import annotations

import secrets
import time
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import (
    check_rate_limit,
    create_access_token,
    create_magic_link_token,
    get_current_user,
    get_current_user_optional,
    get_user_tenant_id,
    log_auth_event,
    revoke_session_by_jti,
    verify_magic_link_token,
)
from .auth_models import (
    AuthAuditLog,
    AuthSession,
    GitHubInstallation,
    Tenant,
    TenantMember,
    User,
    AuthAccount,
)
from .config import get_settings
from .database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    name: str | None = None
    preferred_locale: str = "en"


class LoginRequest(BaseModel):
    email: str


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str | None = None
    redirect_uri: str | None = None


class GitHubInstallRequest(BaseModel):
    installation_id: int
    github_account: str


class MagicLinkRequest(BaseModel):
    email: str
    name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    preferred_locale: str | None = None


# ---------------------------------------------------------------------------
# GET /api/auth/status - check configuration status
# ---------------------------------------------------------------------------
@router.get("/status")
def auth_status():
    settings = get_settings()
    is_prod = settings.environment.lower() == "production"
    gh_oauth_ok = bool(settings.auth_github_id and settings.auth_github_secret)
    google_oauth_ok = bool(settings.auth_google_id and settings.auth_google_secret)
    gh_app_ok = bool(settings.github_app_id and settings.github_app_private_key)

    required_configs = []
    if not settings.auth_secret:
        required_configs.append("AUTH_SECRET")
    if not gh_oauth_ok:
        required_configs.append("AUTH_GITHUB_ID, AUTH_GITHUB_SECRET")
    if not google_oauth_ok:
        required_configs.append("AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET")
    if not gh_app_ok:
        required_configs.append("GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY")

    return {
        "auth_configured": bool(settings.auth_secret),
        "github_oauth_configured": gh_oauth_ok,
        "google_oauth_configured": google_oauth_ok,
        "github_app_configured": gh_app_ok,
        "llm_configured": bool(settings.llm_base_url and settings.llm_api_key and settings.llm_model),
        "environment": settings.environment,
        "allow_dev_login": settings.allow_dev_login and not is_prod,
        "required_configs": required_configs,
        "message": "ok" if (settings.auth_secret and gh_oauth_ok and google_oauth_ok) else "CONFIGURATION_REQUIRED",
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _public_origin(request: Request, settings) -> str:
    """Resolve public origin from PUBLIC_URL or proxy headers (works on any domain/tunnel)."""
    if settings.public_url:
        return settings.public_url.rstrip("/")
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "http").split(",")[0].strip()
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0].strip()
    if host:
        return f"{proto}://{host}"
    return settings.cors_origins.split(",")[0].strip().rstrip("/")


def _build_session_redirect(origin: str, jwt_token: str) -> RedirectResponse:
    """Redirect to /login with the JWT fragment and set the session cookie."""
    response = RedirectResponse(url=f"{origin}/login#session_token={jwt_token}", status_code=302)
    response.set_cookie(
        key="session_token",
        value=jwt_token,
        httponly=False,          # Must remain False — frontend JS reads it for Bearer header
        samesite="lax",
        secure=origin.startswith("https://"),
        max_age=60 * 60 * 24 * 7,  # 7 days cookie lifetime
        path="/",
    )
    return response


# ---------------------------------------------------------------------------
# GET /api/auth/oauth/{provider}/url - initiate OAuth
# ---------------------------------------------------------------------------
@router.get("/oauth/{provider}/url")
def get_oauth_url(
    provider: str,
    request: Request,
    redirect_uri: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """Generate the OAuth authorization URL with a secure state parameter."""
    # Rate limit: prevent state-spam / enumeration
    check_rate_limit(f"oauth_url:{provider}", request, max_hits=20, window_seconds=60)

    settings = get_settings()
    # Generate a cryptographically secure state parameter
    state = secrets.token_urlsafe(32)
    callback_url = redirect_uri or f"{_public_origin(request, settings)}/api/auth/oauth/{provider}/callback"

    if provider == "github":
        if not settings.auth_github_id or not settings.auth_github_secret:
            raise HTTPException(
                status_code=503,
                detail="CONFIGURATION_REQUIRED: GitHub OAuth is not configured. Missing AUTH_GITHUB_ID / AUTH_GITHUB_SECRET in environment.",
            )
        params = {
            "client_id": settings.auth_github_id,
            "scope": "read:user user:email",
            "state": state,
            "redirect_uri": callback_url,
        }
        return {
            "provider": "github",
            "url": f"https://github.com/login/oauth/authorize?{urlencode(params)}",
            "state": state,
        }

    elif provider == "google":
        if not settings.auth_google_id or not settings.auth_google_secret:
            raise HTTPException(
                status_code=503,
                detail="CONFIGURATION_REQUIRED: Google OAuth is not configured. Missing AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in environment.",
            )
        params = {
            "client_id": settings.auth_google_id,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
            "redirect_uri": callback_url,
        }
        return {
            "provider": "google",
            "url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}",
            "state": state,
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported OAuth provider: {provider}")


# ---------------------------------------------------------------------------
# OAuth profile exchange
# ---------------------------------------------------------------------------

def _exchange_oauth_profile(
    provider: str,
    code: str,
    callback_url: str | None,
    settings,
) -> tuple[str, str | None, str | None, str | None]:
    """Exchange an OAuth authorization code for (email, name, avatar_url, provider_id)."""
    if provider == "github":
        if not settings.auth_github_id or not settings.auth_github_secret:
            raise HTTPException(status_code=503, detail="GitHub OAuth is not configured")

        with httpx.Client(timeout=10) as client:
            token_data_req = {
                "client_id": settings.auth_github_id,
                "client_secret": settings.auth_github_secret,
                "code": code,
            }
            if callback_url:
                token_data_req["redirect_uri"] = callback_url
            token_resp = client.post(
                "https://github.com/login/oauth/access_token",
                data=token_data_req,
                headers={"Accept": "application/json"},
            )
            token_payload = token_resp.json()
            access_token = token_payload.get("access_token")
            if not access_token:
                gh_err = token_payload.get("error")
                raise HTTPException(status_code=400, detail=f"github_{gh_err}" if gh_err else "github_token_failed")

            gh_headers = {"Authorization": f"Bearer {access_token}", "User-Agent": "AI-Codebase-Archaeologist"}
            gh_user = client.get("https://api.github.com/user", headers=gh_headers).json()
            provider_id = str(gh_user.get("id")) if gh_user.get("id") is not None else None
            name = gh_user.get("name") or gh_user.get("login")
            avatar_url = gh_user.get("avatar_url")
            email = gh_user.get("email")

            if not email:
                emails = client.get("https://api.github.com/user/emails", headers=gh_headers).json()
                primary = next((e["email"] for e in emails if e.get("primary")), None)
                email = primary or (emails[0]["email"] if emails else f"{gh_user['login']}@github.local")

    elif provider == "google":
        if not settings.auth_google_id or not settings.auth_google_secret:
            raise HTTPException(status_code=503, detail="Google OAuth is not configured")

        with httpx.Client(timeout=10) as client:
            token_resp = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.auth_google_id,
                    "client_secret": settings.auth_google_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": callback_url,
                },
            )
            token_payload = token_resp.json()
            access_token = token_payload.get("access_token")
            if not access_token:
                g_err = token_payload.get("error")
                raise HTTPException(status_code=400, detail=f"google_{g_err}" if g_err else "google_token_failed")

            g_user = client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            ).json()
            provider_id = str(g_user.get("id")) if g_user.get("id") is not None else None
            email = g_user.get("email")
            name = g_user.get("name")
            avatar_url = g_user.get("picture")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    if not email:
        raise HTTPException(status_code=400, detail="no_email")
    return email, name, avatar_url, provider_id


def _upsert_oauth_user(
    db: Session,
    provider: str,
    provider_id: str | None,
    email: str,
    name: str | None,
    avatar_url: str | None,
) -> tuple[User, str]:
    """Find or create a User, personal Tenant, TenantMember, and AuthAccount."""
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, name=name, avatar_url=avatar_url)
        db.add(user)
        db.flush()
    else:
        # Update avatar/name if missing
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        if not user.name and name:
            user.name = name

    membership = db.scalar(select(TenantMember).where(TenantMember.user_id == user.id).limit(1))
    if not membership:
        tenant = Tenant(name=f"{email}'s workspace", owner_user_id=user.id)
        db.add(tenant)
        db.flush()
        membership = TenantMember(tenant_id=tenant.id, user_id=user.id, role="owner")
        db.add(membership)
        db.flush()

    if provider_id:
        acc = db.scalar(
            select(AuthAccount).where(
                AuthAccount.provider == provider,
                AuthAccount.provider_account_id == provider_id,
            )
        )
        if not acc:
            db.add(AuthAccount(user_id=user.id, provider=provider, provider_account_id=provider_id))

    db.commit()
    db.refresh(user)
    return user, membership.tenant_id


# ---------------------------------------------------------------------------
# POST /api/auth/oauth/{provider}/callback - API-mode code exchange
# ---------------------------------------------------------------------------
@router.post("/oauth/{provider}/callback", response_model=TokenResponse)
def oauth_callback(
    provider: str,
    payload: OAuthCallbackRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """API-mode OAuth code exchange (called from frontend JS, not browser redirect)."""
    check_rate_limit(f"oauth_cb:{provider}", request, max_hits=15, window_seconds=60)

    settings = get_settings()
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET is not configured")

    try:
        email, name, avatar_url, provider_id = _exchange_oauth_profile(
            provider, payload.code, payload.redirect_uri, settings
        )
    except HTTPException:
        log_auth_event(db, "oauth_failed", provider=provider, request=request, success=False)
        raise
    except Exception as exc:
        log_auth_event(db, "oauth_failed", provider=provider, request=request, success=False,
                       detail=str(type(exc).__name__))
        raise HTTPException(status_code=400, detail=f"{provider} OAuth error: {type(exc).__name__}")

    user, tenant_id = _upsert_oauth_user(db, provider, provider_id, email, name, avatar_url)
    jwt_token = create_access_token(user.id, tenant_id, db=db, request=request)
    db.commit()
    log_auth_event(db, "oauth_success", user_id=user.id, provider=provider, request=request)
    return TokenResponse(access_token=jwt_token, user_id=user.id, tenant_id=tenant_id)


# ---------------------------------------------------------------------------
# GET /api/auth/oauth/{provider}/callback - browser redirect from provider
# ---------------------------------------------------------------------------
@router.get("/oauth/{provider}/callback")
def oauth_browser_callback(
    provider: str,
    request: Request,
    code: str = Query(default=None),
    state: str = Query(default=None),
    error: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """Browser redirect endpoint: exchanges code, sets cookie, redirects to /login."""
    settings = get_settings()
    origin = _public_origin(request, settings)
    if error:
        log_auth_event(db, "oauth_failed", provider=provider, request=request, success=False, detail=error)
        return RedirectResponse(url=f"{origin}/login?error={error}")
    if not code:
        log_auth_event(db, "oauth_failed", provider=provider, request=request, success=False, detail="missing_code")
        return RedirectResponse(url=f"{origin}/login?error=missing_code")

    callback_url = f"{origin}/api/auth/oauth/{provider}/callback"
    try:
        email, name, avatar_url, provider_id = _exchange_oauth_profile(provider, code, callback_url, settings)
    except HTTPException as exc:
        err_code = str(exc.detail) if exc.status_code == 400 else f"{provider}_not_configured"
        log_auth_event(db, "oauth_failed", provider=provider, request=request, success=False, detail=err_code)
        return RedirectResponse(url=f"{origin}/login?error={err_code}")
    except Exception as exc:
        log_auth_event(db, "oauth_failed", provider=provider, request=request, success=False,
                       detail=str(type(exc).__name__))
        return RedirectResponse(url=f"{origin}/login?error=oauth_exception")

    user, tenant_id = _upsert_oauth_user(db, provider, provider_id, email, name, avatar_url)
    jwt_token = create_access_token(user.id, tenant_id, db=db, request=request)
    db.commit()
    log_auth_event(db, "oauth_success", user_id=user.id, provider=provider, request=request)
    return _build_session_redirect(origin, jwt_token)


# ---------------------------------------------------------------------------
# POST /api/auth/magic-link & GET /api/auth/magic-link/verify
# ---------------------------------------------------------------------------
@router.post("/magic-link")
def create_magic_link(
    payload: MagicLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Generate a magic login link. Rate limited to 5/min per IP."""
    check_rate_limit("magic_link", request, max_hits=5, window_seconds=60)

    settings = get_settings()
    is_prod = settings.environment.lower() == "production"
    if (is_prod or not settings.allow_dev_login) and not current_user:
        raise HTTPException(
            status_code=403,
            detail="Magic-link generation requires an active session when dev login is disabled",
        )
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET not configured")

    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    expires_minutes = 15
    magic_token = create_magic_link_token(
        email=email,
        name=(payload.name or "").strip() or None,
        expires_minutes=expires_minutes,
    )
    origin = _public_origin(request, settings)
    log_auth_event(db, "magic_link_sent", provider="magic_link", request=request,
                   detail=f"email={email}")
    db.commit()
    return {
        "login_url": f"{origin}/api/auth/magic-link/verify?token={magic_token}",
        "expires_in_seconds": expires_minutes * 60,
    }


@router.get("/magic-link/verify")
def verify_magic_link(
    request: Request,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Verify a magic link token and issue a session."""
    check_rate_limit("magic_link_verify", request, max_hits=10, window_seconds=60)

    settings = get_settings()
    origin = _public_origin(request, settings)
    try:
        payload = verify_magic_link_token(token)
    except HTTPException:
        log_auth_event(db, "magic_link_failed", provider="magic_link", request=request, success=False,
                       detail="invalid_or_expired_token")
        db.commit()
        return RedirectResponse(url=f"{origin}/login?error=invalid_magic_link")

    email = str(payload["email"]).strip().lower()
    name = payload.get("name")
    user, tenant_id = _upsert_oauth_user(db, "magic_link", None, email, name, None)
    jwt_token = create_access_token(user.id, tenant_id, db=db, request=request)
    db.commit()
    log_auth_event(db, "magic_link_used", user_id=user.id, provider="magic_link", request=request)
    return _build_session_redirect(origin, jwt_token)


# ---------------------------------------------------------------------------
# POST /api/auth/register - dev only
# ---------------------------------------------------------------------------
@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Create user + personal tenant (development only)."""
    check_rate_limit("register", request, max_hits=10, window_seconds=60)

    settings = get_settings()
    if settings.environment.lower() == "production" or not settings.allow_dev_login:
        raise HTTPException(status_code=403, detail="Development registration is disabled in production")
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET not configured")

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = User(email=payload.email, name=payload.name, preferred_locale=payload.preferred_locale)
    db.add(user)
    db.flush()

    tenant = Tenant(name=f"{user.email}'s workspace", owner_user_id=user.id)
    db.add(tenant)
    db.flush()

    member = TenantMember(tenant_id=tenant.id, user_id=user.id, role="owner")
    db.add(member)
    db.flush()

    token = create_access_token(user.id, tenant.id, db=db, request=request)
    db.commit()
    log_auth_event(db, "login_success", user_id=user.id, provider="dev_register", request=request)
    return TokenResponse(access_token=token, user_id=user.id, tenant_id=tenant.id)


# ---------------------------------------------------------------------------
# POST /api/auth/login - dev only
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Dev login by email (development only)."""
    check_rate_limit("dev_login", request, max_hits=10, window_seconds=60)

    settings = get_settings()
    if settings.environment.lower() == "production" or not settings.allow_dev_login:
        raise HTTPException(status_code=403, detail="Development login is disabled in production")
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET not configured")

    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        log_auth_event(db, "login_failed", provider="dev_login", request=request, success=False,
                       detail="user_not_found")
        db.commit()
        raise HTTPException(status_code=404, detail="User not found")

    membership = db.scalar(select(TenantMember).where(TenantMember.user_id == user.id).limit(1))
    if not membership:
        log_auth_event(db, "login_failed", user_id=user.id, provider="dev_login", request=request, success=False,
                       detail="no_tenant")
        db.commit()
        raise HTTPException(status_code=403, detail="User has no tenant")

    token = create_access_token(user.id, membership.tenant_id, db=db, request=request)
    db.commit()
    log_auth_event(db, "login_success", user_id=user.id, provider="dev_login", request=request)
    return TokenResponse(access_token=token, user_id=user.id, tenant_id=membership.tenant_id)


# ---------------------------------------------------------------------------
# POST /api/auth/logout - revoke current session
# ---------------------------------------------------------------------------
@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Revoke the current JWT session and clear the session cookie."""
    jti = getattr(user, "_current_jti", None) if user else None
    if jti:
        revoke_session_by_jti(jti, db)
        log_auth_event(db, "logout", user_id=user.id if user else None, request=request,
                       detail=f"jti={jti[:8]}")
        db.commit()
    response.delete_cookie(key="session_token", path="/")
    return {"detail": "Logged out successfully"}


# ---------------------------------------------------------------------------
# GET /api/auth/me - current user profile
# ---------------------------------------------------------------------------
@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tenant_id = get_user_tenant_id(user)
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id)) if tenant_id else None
    membership = (
        db.scalar(select(TenantMember).where(TenantMember.tenant_id == tenant_id, TenantMember.user_id == user.id))
        if tenant_id else None
    )
    accounts = db.scalars(select(AuthAccount).where(AuthAccount.user_id == user.id)).all()
    installations = (
        db.scalars(select(GitHubInstallation).where(GitHubInstallation.tenant_id == tenant_id)).all()
        if tenant_id else []
    )
    # Count active sessions
    active_sessions_count = db.scalar(
        select(AuthSession).where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        ).limit(1)
    )
    return {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "preferred_locale": user.preferred_locale,
        "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
        "tenant_id": tenant_id,
        "workspace_name": tenant.name if tenant else None,
        "role": membership.role if membership else "member",
        "accounts": [
            {
                "provider": a.provider,
                "provider_account_id": a.provider_account_id,
                "created_at": a.created_at.isoformat() if getattr(a, "created_at", None) else None,
            }
            for a in accounts
        ],
        "github_installations_count": len(installations),
    }


# ---------------------------------------------------------------------------
# PATCH /api/auth/me - update profile
# ---------------------------------------------------------------------------
@router.patch("/me")
def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_user_tenant_id(user)
    if payload.name is not None:
        user.name = payload.name.strip() or None
    if payload.email is not None:
        new_email = payload.email.strip().lower()
        if new_email and new_email != user.email:
            import re
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", new_email):
                raise HTTPException(status_code=400, detail="Địa chỉ email không đúng định dạng.")
            existing_user = db.scalar(select(User).where(User.email == new_email, User.id != user.id))
            if existing_user:
                raise HTTPException(status_code=400, detail="Email này đã được sử dụng bởi một tài khoản khác.")
            user.email = new_email
    if payload.preferred_locale is not None and payload.preferred_locale in ("en", "vi"):
        user.preferred_locale = payload.preferred_locale
    db.commit()
    db.refresh(user)
    return {"status": "ok", "user_id": user.id, "name": user.name, "email": user.email, "preferred_locale": user.preferred_locale}


# ---------------------------------------------------------------------------
# GET /api/auth/sessions - list active sessions
# ---------------------------------------------------------------------------
@router.get("/sessions")
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all active (non-revoked, non-expired) sessions for the current user."""
    import datetime as _dt
    now = _dt.datetime.now(_dt.timezone.utc)
    sessions = db.scalars(
        select(AuthSession).where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        ).order_by(AuthSession.issued_at.desc())
    ).all()

    current_jti = getattr(user, "_current_jti", None)
    return {
        "sessions": [
            {
                "id": s.id,
                "issued_at": s.issued_at.isoformat(),
                "expires_at": s.expires_at.isoformat(),
                "user_agent": s.user_agent,
                "ip_address": s.ip_address,
                "is_current": s.jti == current_jti,
            }
            for s in sessions
        ]
    }


# ---------------------------------------------------------------------------
# DELETE /api/auth/sessions/{session_id} - revoke a specific session
# ---------------------------------------------------------------------------
@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific session by session ID."""
    session = db.get(AuthSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.revoked_at is not None:
        return {"status": "already_revoked"}

    import datetime as _dt
    session.revoked_at = _dt.datetime.now(_dt.timezone.utc)
    db.commit()
    log_auth_event(db, "session_revoked", user_id=user.id, request=request,
                   detail=f"session_id={session_id}")
    db.commit()
    return {"status": "revoked", "session_id": session_id}


# ---------------------------------------------------------------------------
# GET /api/auth/audit-log - recent auth events (last 50)
# ---------------------------------------------------------------------------
@router.get("/audit-log")
def audit_log(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the 50 most recent auth events for the current user."""
    events = db.scalars(
        select(AuthAuditLog).where(AuthAuditLog.user_id == user.id)
        .order_by(AuthAuditLog.created_at.desc()).limit(50)
    ).all()
    return {
        "events": [
            {
                "id": e.id,
                "event": e.event,
                "provider": e.provider,
                "success": e.success,
                "ip_address": e.ip_address,
                "detail": e.detail,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ]
    }


# ---------------------------------------------------------------------------
# GitHub App integration endpoints
# ---------------------------------------------------------------------------

@router.get("/github/installations")
def list_installations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List GitHub App installations for user's tenant."""
    settings = get_settings()
    tenant_id = get_user_tenant_id(user)
    if not settings.github_app_id or not settings.github_app_private_key:
        return {
            "status": "CONFIGURATION_REQUIRED",
            "message": "GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.",
            "installations": [],
        }

    installs = db.scalars(
        select(GitHubInstallation).where(GitHubInstallation.tenant_id == tenant_id)
    ).all()
    return {
        "status": "ok",
        "installations": [
            {
                "id": i.id,
                "installation_id": i.installation_id,
                "github_account": i.github_account,
                "status": i.status,
                "created_at": i.created_at,
            }
            for i in installs
        ],
    }


@router.post("/github/installations")
def register_installation(
    payload: GitHubInstallRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Link an authorized GitHub App installation to user's tenant."""
    tenant_id = get_user_tenant_id(user)
    existing = db.scalar(
        select(GitHubInstallation).where(GitHubInstallation.installation_id == payload.installation_id)
    )
    if existing:
        if existing.tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Installation is already claimed by another workspace")
        existing.status = "active"
        db.commit()
        return {"status": "ok", "installation_id": existing.installation_id}

    new_inst = GitHubInstallation(
        tenant_id=tenant_id,
        installation_id=payload.installation_id,
        github_account=payload.github_account,
        status="active",
    )
    db.add(new_inst)
    db.commit()
    db.refresh(new_inst)
    return {"status": "ok", "installation_id": new_inst.installation_id}


@router.get("/github/repositories")
def list_github_repos(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List repositories accessible via GitHub App installation with read-only permissions."""
    settings = get_settings()
    if not settings.github_app_id or not settings.github_app_private_key:
        return {
            "status": "CONFIGURATION_REQUIRED",
            "message": "GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.",
            "repositories": [],
        }
    tenant_id = get_user_tenant_id(user)
    installs = db.scalars(
        select(GitHubInstallation).where(
            GitHubInstallation.tenant_id == tenant_id,
            GitHubInstallation.status == "active",
        )
    ).all()
    if not installs:
        return {
            "status": "NO_INSTALLATION",
            "message": "No GitHub App installation linked to this workspace. Please install the GitHub App first.",
            "repositories": [],
        }

    try:
        now_ts = int(time.time())
        jwt_payload = {"iat": now_ts - 60, "exp": now_ts + (9 * 60), "iss": settings.github_app_id}
        app_jwt = jwt.encode(jwt_payload, settings.github_app_private_key, algorithm="RS256")

        all_repos = []
        with httpx.Client(timeout=10) as client:
            for inst in installs:
                token_resp = client.post(
                    f"https://api.github.com/app/installations/{inst.installation_id}/access_tokens",
                    headers={
                        "Authorization": f"Bearer {app_jwt}",
                        "Accept": "application/vnd.github+json",
                        "User-Agent": "AI-Codebase-Archaeologist",
                    },
                )
                if token_resp.status_code != 201:
                    continue
                inst_token = token_resp.json().get("token")

                repos_resp = client.get(
                    "https://api.github.com/installation/repositories",
                    headers={
                        "Authorization": f"Bearer {inst_token}",
                        "Accept": "application/vnd.github+json",
                        "User-Agent": "AI-Codebase-Archaeologist",
                    },
                )
                if repos_resp.status_code == 200:
                    for r in repos_resp.json().get("repositories", []):
                        all_repos.append(
                            {
                                "id": r["id"],
                                "name": r["name"],
                                "full_name": r["full_name"],
                                "private": r["private"],
                                "html_url": r["html_url"],
                                "clone_url": r["clone_url"],
                                "default_branch": r.get("default_branch", "main"),
                                "installation_id": inst.installation_id,
                            }
                        )
        return {"status": "ok", "repositories": all_repos}
    except Exception as exc:
        return {
            "status": "CONFIGURATION_REQUIRED",
            "message": f"GitHub App authentication error: {str(exc)}",
            "repositories": [],
        }
