"""Auth API endpoints for M2.

Provides:
- GET  /api/auth/status (check auth and OAuth configuration)
- GET  /api/auth/oauth/{provider}/url (get OAuth redirect URL)
- POST /api/auth/oauth/{provider}/callback (OAuth code exchange)
- POST /api/auth/register (development workspace registration - disabled in production)
- POST /api/auth/login (development workspace login - disabled in production)
- POST /api/auth/logout (session termination)
- GET  /api/auth/me (get current user info)
- GET  /api/auth/github/installations (list tenant's GitHub App installations)
- POST /api/auth/github/installations (register a new GitHub App installation)
- GET  /api/auth/github/repositories (list repositories available to GitHub App)
"""
from __future__ import annotations

import secrets
import time
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, get_user_tenant_id
from .auth_models import User, Tenant, TenantMember, AuthAccount, GitHubInstallation
from .config import get_settings
from .database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str


# ------------------------------------------------------------------
# GET /api/auth/status - check configuration status
# ------------------------------------------------------------------
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
        "environment": settings.environment,
        "allow_dev_login": settings.allow_dev_login and not is_prod,
        "required_configs": required_configs,
        "message": "ok" if (settings.auth_secret and gh_oauth_ok and google_oauth_ok) else "CONFIGURATION_REQUIRED",
    }


# ------------------------------------------------------------------
# GET /api/auth/oauth/{provider}/url - initiate OAuth
# ------------------------------------------------------------------
@router.get("/oauth/{provider}/url")
def get_oauth_url(provider: str, redirect_uri: str | None = Query(default=None)):
    settings = get_settings()
    state = secrets.token_urlsafe(16)

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
        }
        if redirect_uri:
            params["redirect_uri"] = redirect_uri
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
        }
        if redirect_uri:
            params["redirect_uri"] = redirect_uri
        return {
            "provider": "google",
            "url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}",
            "state": state,
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported OAuth provider: {provider}")


# ------------------------------------------------------------------
# POST /api/auth/oauth/{provider}/callback - exchange OAuth code
# ------------------------------------------------------------------
@router.post("/oauth/{provider}/callback", response_model=TokenResponse)
def oauth_callback(provider: str, payload: OAuthCallbackRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET is not configured")

    email: str | None = None
    name: str | None = None
    avatar_url: str | None = None
    provider_id: str | None = None

    if provider == "github":
        if not settings.auth_github_id or not settings.auth_github_secret:
            raise HTTPException(status_code=503, detail="GitHub OAuth is not configured")

        try:
            with httpx.Client(timeout=10) as client:
                token_resp = client.post(
                    "https://github.com/login/oauth/access_token",
                    data={
                        "client_id": settings.auth_github_id,
                        "client_secret": settings.auth_github_secret,
                        "code": payload.code,
                        "redirect_uri": payload.redirect_uri,
                    },
                    headers={"Accept": "application/json"},
                )
                token_data = token_resp.json()
                access_token = token_data.get("access_token")
                if not access_token:
                    raise HTTPException(status_code=400, detail="Failed to obtain GitHub access token")

                user_resp = client.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"Bearer {access_token}", "User-Agent": "AI-Codebase-Archaeologist"},
                )
                gh_user = user_resp.json()
                provider_id = str(gh_user.get("id"))
                name = gh_user.get("name") or gh_user.get("login")
                avatar_url = gh_user.get("avatar_url")
                email = gh_user.get("email")

                if not email:
                    # Fetch private email
                    emails_resp = client.get(
                        "https://api.github.com/user/emails",
                        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "AI-Codebase-Archaeologist"},
                    )
                    emails = emails_resp.json()
                    primary = next((e["email"] for e in emails if e.get("primary")), None)
                    email = primary or (emails[0]["email"] if emails else f"{gh_user['login']}@github.local")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {str(exc)}")

    elif provider == "google":
        if not settings.auth_google_id or not settings.auth_google_secret:
            raise HTTPException(status_code=503, detail="Google OAuth is not configured")

        try:
            with httpx.Client(timeout=10) as client:
                token_resp = client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.auth_google_id,
                        "client_secret": settings.auth_google_secret,
                        "code": payload.code,
                        "grant_type": "authorization_code",
                        "redirect_uri": payload.redirect_uri,
                    },
                )
                token_data = token_resp.json()
                access_token = token_data.get("access_token")
                if not access_token:
                    raise HTTPException(status_code=400, detail="Failed to obtain Google access token")

                user_resp = client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                g_user = user_resp.json()
                provider_id = str(g_user.get("id"))
                email = g_user.get("email")
                name = g_user.get("name")
                avatar_url = g_user.get("picture")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Google OAuth error: {str(exc)}")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    if not email:
        raise HTTPException(status_code=400, detail="Failed to retrieve verified email from provider")

    # Find or create user
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, name=name, avatar_url=avatar_url)
        db.add(user)
        db.flush()

        tenant = Tenant(name=f"{email}'s workspace", owner_user_id=user.id)
        db.add(tenant)
        db.flush()

        member = TenantMember(tenant_id=tenant.id, user_id=user.id, role="owner")
        db.add(member)
        db.flush()
    else:
        membership = db.scalar(select(TenantMember).where(TenantMember.user_id == user.id).limit(1))
        tenant_id = membership.tenant_id if membership else None
        if not tenant_id:
            tenant = Tenant(name=f"{email}'s workspace", owner_user_id=user.id)
            db.add(tenant)
            db.flush()
            member = TenantMember(tenant_id=tenant.id, user_id=user.id, role="owner")
            db.add(member)
            db.flush()

    # Link AuthAccount
    if provider_id:
        acc = db.scalar(
            select(AuthAccount).where(
                AuthAccount.provider == provider,
                AuthAccount.provider_account_id == provider_id,
            )
        )
        if not acc:
            acc = AuthAccount(user_id=user.id, provider=provider, provider_account_id=provider_id)
            db.add(acc)

    db.commit()
    db.refresh(user)

    membership = db.scalar(select(TenantMember).where(TenantMember.user_id == user.id).limit(1))
    token = create_access_token(user.id, membership.tenant_id)
    return TokenResponse(access_token=token, user_id=user.id, tenant_id=membership.tenant_id)


# ------------------------------------------------------------------
# POST /api/auth/register - create user + personal tenant (dev only)
# ------------------------------------------------------------------
@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
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
    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    token = create_access_token(user.id, tenant.id)
    return TokenResponse(access_token=token, user_id=user.id, tenant_id=tenant.id)


# ------------------------------------------------------------------
# POST /api/auth/login - dev login by email (dev only)
# ------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    if settings.environment.lower() == "production" or not settings.allow_dev_login:
        raise HTTPException(status_code=403, detail="Development login is disabled in production")
    if not settings.auth_secret:
        raise HTTPException(status_code=503, detail="AUTH_SECRET not configured")

    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    membership = db.scalar(select(TenantMember).where(TenantMember.user_id == user.id).limit(1))
    if not membership:
        raise HTTPException(status_code=403, detail="User has no tenant")

    token = create_access_token(user.id, membership.tenant_id)
    return TokenResponse(access_token=token, user_id=user.id, tenant_id=membership.tenant_id)


# ------------------------------------------------------------------
# POST /api/auth/logout - end session
# ------------------------------------------------------------------
@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    return {"detail": "Logged out successfully"}


# ------------------------------------------------------------------
# GET /api/auth/me - get current user info
# ------------------------------------------------------------------
@router.get("/me")
def me(user: User = Depends(get_current_user)):
    tenant_id = get_user_tenant_id(user)
    return {
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "preferred_locale": user.preferred_locale,
        "tenant_id": tenant_id,
    }


# ------------------------------------------------------------------
# GitHub App integration endpoints
# ------------------------------------------------------------------
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

    # When private key is set, sign JWT (RS256) to get installation access token
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
