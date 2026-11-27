"""Auth and tenant isolation tests for M2.

Tests:
1. Anonymous request to /api/auth/me → 401
2. Register + login flow
3. User A cannot access User B's repository
4. User A cannot access User B's analysis job
5. Invalid token rejected
6. Missing tenant rejected
7. Auth status endpoint works
8. GitHub installations returns CONFIGURATION_REQUIRED
"""
from __future__ import annotations
import os
import pytest
from unittest.mock import patch

# Set AUTH_SECRET before importing app
os.environ.setdefault("AUTH_SECRET", "test-secret-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://archaeologist:archaeologist@postgres:5432/archaeologist")

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.auth_models import User, Tenant, TenantMember
from app.models import Repository
from app.auth import create_access_token

from uuid import uuid4

client = TestClient(app)


@pytest.fixture(autouse=True)
def _setup_db():
    """Ensure tables exist."""
    Base.metadata.create_all(bind=engine)
    yield


def _make_user(base_email: str) -> dict:
    """Register a user and return token info."""
    unique_email = f"{uuid4().hex[:8]}_{base_email}"
    resp = client.post("/api/auth/register", json={"email": unique_email, "name": f"Test {unique_email}"})
    assert resp.status_code == 200, resp.text
    return resp.json()


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------
# 1. Anonymous rejected
# ------------------------------------------------------------------
def test_anonymous_me_rejected():
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


# ------------------------------------------------------------------
# 2. Register + login flow
# ------------------------------------------------------------------
def test_register_and_login():
    email = f"{uuid4().hex[:8]}_reg@example.com"
    # Register
    resp = client.post("/api/auth/register", json={"email": email, "name": f"Test {email}"})
    assert resp.status_code == 200
    reg = resp.json()
    assert reg["user_id"]
    assert reg["tenant_id"]
    assert reg["access_token"]

    # Login
    login = client.post("/api/auth/login", json={"email": email})
    assert login.status_code == 200
    data = login.json()
    assert data["user_id"] == reg["user_id"]

    # /me
    me = client.get("/api/auth/me", headers=_auth_header(data["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == email


# ------------------------------------------------------------------
# 3. User A cannot access User B's repository
# ------------------------------------------------------------------
def test_user_cannot_access_other_user_repo():
    user_a = _make_user("user-a-repo@example.com")
    user_b = _make_user("user-b-repo@example.com")
    unique_tag = uuid4().hex[:8]

    # Create a repo owned by User A's tenant
    db = SessionLocal()
    try:
        repo = Repository(
            canonical_url=f"https://github.com/testowner/privaterepo-a-{unique_tag}.git",
            owner="testowner",
            name=f"privaterepo-a-{unique_tag}",
            tenant_id=user_a["tenant_id"],
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
        repo_id = repo.id
    finally:
        db.close()

    # User A can access
    resp_a = client.get(f"/api/repos/{repo_id}", headers=_auth_header(user_a["access_token"]))
    assert resp_a.status_code == 200

    # User B gets 403
    resp_b = client.get(f"/api/repos/{repo_id}", headers=_auth_header(user_b["access_token"]))
    assert resp_b.status_code == 403


# ------------------------------------------------------------------
# 4. User A cannot access User B's analysis job
# ------------------------------------------------------------------
def test_user_cannot_access_other_user_job():
    from app.models import AnalysisJob

    user_a = _make_user("user-a-job@example.com")
    user_b = _make_user("user-b-job@example.com")
    unique_tag = uuid4().hex[:8]

    db = SessionLocal()
    try:
        repo = Repository(
            canonical_url=f"https://github.com/testowner/jobrepo-a-{unique_tag}.git",
            owner="testowner",
            name=f"jobrepo-a-{unique_tag}",
            tenant_id=user_a["tenant_id"],
        )
        db.add(repo)
        db.flush()
        job = AnalysisJob(
            repository_id=repo.id,
            tenant_id=user_a["tenant_id"],
            status="queued",
            phase="queued",
            progress=0,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_id = job.id
    finally:
        db.close()

    # User A can access
    resp_a = client.get(f"/api/jobs/{job_id}", headers=_auth_header(user_a["access_token"]))
    assert resp_a.status_code == 200

    # User B gets 403
    resp_b = client.get(f"/api/jobs/{job_id}", headers=_auth_header(user_b["access_token"]))
    assert resp_b.status_code == 403


# ------------------------------------------------------------------
# 5. Invalid token rejected
# ------------------------------------------------------------------
def test_invalid_token_rejected():
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401


# ------------------------------------------------------------------
# 6. Duplicate register rejected
# ------------------------------------------------------------------
def test_duplicate_register_rejected():
    email = f"{uuid4().hex[:8]}_dup@example.com"
    resp1 = client.post("/api/auth/register", json={"email": email})
    assert resp1.status_code == 200
    resp2 = client.post("/api/auth/register", json={"email": email})
    assert resp2.status_code == 409


# ------------------------------------------------------------------
# 7. Auth status endpoint
# ------------------------------------------------------------------
def test_auth_status():
    resp = client.get("/api/auth/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "auth_configured" in data


# ------------------------------------------------------------------
# 8. GitHub installations returns CONFIGURATION_REQUIRED
# ------------------------------------------------------------------
def test_github_installations_config_required():
    user = _make_user("gh-install-test@example.com")
    resp = client.get(
        "/api/auth/github/installations",
        headers=_auth_header(user["access_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "CONFIGURATION_REQUIRED"
    assert data["installations"] == []


# ------------------------------------------------------------------
# 9. Health endpoint (backward compat, no auth required)
# ------------------------------------------------------------------
def test_health_no_auth():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ------------------------------------------------------------------
# 10. Tenant-scoped repo list
# ------------------------------------------------------------------
def test_guest_can_start_analysis_but_cannot_list_the_library():
    assert client.get("/api/repos").status_code == 401
    assert client.get("/api/repos", headers=_auth_header("expired-or-invalid")).status_code == 401
    repo = client.post("/api/repos", json={"url": f"https://github.com/example/test-{uuid4().hex}"})
    assert repo.status_code == 200
    assert client.post(f"/api/repos/{repo.json()['id']}/sync", json={}).status_code == 200


def test_repo_list_tenant_scoped():
    user_a = _make_user("list-a@example.com")
    user_b = _make_user("list-b@example.com")
    tag = uuid4().hex[:8]

    db = SessionLocal()
    try:
        repo_a = Repository(
            canonical_url=f"https://github.com/listowner/repo-for-a-{tag}.git",
            owner="listowner", name=f"repo-for-a-{tag}", tenant_id=user_a["tenant_id"],
        )
        repo_b = Repository(
            canonical_url=f"https://github.com/listowner/repo-for-b-{tag}.git",
            owner="listowner", name=f"repo-for-b-{tag}", tenant_id=user_b["tenant_id"],
        )
        db.add_all([repo_a, repo_b])
        db.commit()
    finally:
        db.close()

    # User A sees only their repo
    resp_a = client.get("/api/repos", headers=_auth_header(user_a["access_token"]))
    assert resp_a.status_code == 200
    names_a = {r["name"] for r in resp_a.json()}
    assert f"repo-for-a-{tag}" in names_a
    assert f"repo-for-b-{tag}" not in names_a

    # User B sees only their repo
    resp_b = client.get("/api/repos", headers=_auth_header(user_b["access_token"]))
    assert resp_b.status_code == 200
    names_b = {r["name"] for r in resp_b.json()}
    assert f"repo-for-b-{tag}" in names_b
    assert f"repo-for-a-{tag}" not in names_b


# ------------------------------------------------------------------
# 11. User A cannot access User B's evidence or files
# ------------------------------------------------------------------
def test_user_cannot_access_other_user_evidence_and_files():
    user_a = _make_user("user-a-evidence@example.com")
    user_b = _make_user("user-b-evidence@example.com")
    tag = uuid4().hex[:8]

    db = SessionLocal()
    try:
        repo = Repository(
            canonical_url=f"https://github.com/testowner/evidencerepo-a-{tag}.git",
            owner="testowner",
            name=f"evidencerepo-a-{tag}",
            tenant_id=user_a["tenant_id"],
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
        repo_id = repo.id
    finally:
        db.close()

    # User B cannot ask questions / get evidence on User A's repo -> 403
    resp = client.post(
        f"/api/repos/{repo_id}/questions",
        json={"question": "how does this work?"},
        headers=_auth_header(user_b["access_token"]),
    )
    assert resp.status_code == 403

    # User B cannot view files of User A's repo -> 403
    resp_files = client.get(
        f"/api/repos/{repo_id}/files",
        headers=_auth_header(user_b["access_token"]),
    )
    assert resp_files.status_code == 403

    # User B cannot view graph of User A's repo -> 403
    resp_graph = client.get(
        f"/api/repos/{repo_id}/graph",
        headers=_auth_header(user_b["access_token"]),
    )
    assert resp_graph.status_code == 403


# ------------------------------------------------------------------
# 12. Token without tenant context rejected with 403
# ------------------------------------------------------------------
def test_token_without_tenant_rejected():
    user = _make_user("user-notenant@example.com")
    token_no_tenant = create_access_token(user["user_id"], tenant_id=None)

    resp = client.get("/api/auth/me", headers=_auth_header(token_no_tenant))
    assert resp.status_code == 403


# ------------------------------------------------------------------
# 13. Repository created with auth belongs to user's tenant
# ------------------------------------------------------------------
def test_create_repository_attaches_tenant():
    user = _make_user("creator@example.com")
    tag = uuid4().hex[:8]
    resp = client.post(
        "/api/repos",
        json={"url": f"https://github.com/creatortest/new-repo-{tag}"},
        headers=_auth_header(user["access_token"]),
    )
    assert resp.status_code == 200
    repo_id = resp.json()["id"]

    db = SessionLocal()
    try:
        repo = db.get(Repository, repo_id)
        assert repo is not None
        assert repo.tenant_id == user["tenant_id"]
    finally:
        db.close()


# ------------------------------------------------------------------
# 14. Dev login disabled in production
# ------------------------------------------------------------------
def test_dev_login_disabled_in_production(monkeypatch):
    from app.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "environment", "production")

    email = f"{uuid4().hex[:8]}_prodtest@example.com"
    resp = client.post("/api/auth/register", json={"email": email})
    assert resp.status_code == 403
    assert "disabled in production" in resp.json()["detail"]

    resp_login = client.post("/api/auth/login", json={"email": email})
    assert resp_login.status_code == 403


# ------------------------------------------------------------------
# 15. OAuth initiation requires configuration
# ------------------------------------------------------------------
def test_oauth_unconfigured_returns_configuration_required(monkeypatch):
    from app.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "auth_github_id", "")
    monkeypatch.setattr(settings, "auth_github_secret", "")
    monkeypatch.setattr(settings, "auth_google_id", "")
    monkeypatch.setattr(settings, "auth_google_secret", "")
    resp_gh = client.get("/api/auth/oauth/github/url")
    assert resp_gh.status_code == 503
    assert "CONFIGURATION_REQUIRED" in resp_gh.json()["detail"]

    resp_google = client.get("/api/auth/oauth/google/url")
    assert resp_google.status_code == 503
    assert "CONFIGURATION_REQUIRED" in resp_google.json()["detail"]


# ------------------------------------------------------------------
# 16. Logout endpoint
# ------------------------------------------------------------------
def test_logout_endpoint():
    user = _make_user("logout@example.com")
    resp = client.post("/api/auth/logout", headers=_auth_header(user["access_token"]))
    assert resp.status_code == 200


# ------------------------------------------------------------------
# 17. Pull requests tenant isolation
# ------------------------------------------------------------------
def test_pull_requests_tenant_isolation():
    from app.models import PullRequest
    user_a = _make_user("pr-a@example.com")
    user_b = _make_user("pr-b@example.com")
    tag = uuid4().hex[:8]

    db = SessionLocal()
    try:
        repo = Repository(
            canonical_url=f"https://github.com/prtest/repo-{tag}.git",
            owner="prtest",
            name=f"repo-{tag}",
            tenant_id=user_a["tenant_id"],
        )
        db.add(repo)
        db.flush()

        pr = PullRequest(
            repository_id=repo.id,
            number=1,
            title="Initial PR",
            state="open",
            author_name="contributor",
        )
        db.add(pr)
        db.commit()
        repo_id = repo.id
    finally:
        db.close()

    # User A can view PRs
    resp_a = client.get(f"/api/repos/{repo_id}/pulls", headers=_auth_header(user_a["access_token"]))
    assert resp_a.status_code == 200
    prs = resp_a.json()
    assert len(prs) == 1
    assert prs[0]["number"] == 1

    # User B is forbidden (403)
    resp_b = client.get(f"/api/repos/{repo_id}/pulls", headers=_auth_header(user_b["access_token"]))
    assert resp_b.status_code == 403

    # User B cannot delete User A's repo (403)
    del_b = client.delete(f"/api/repos/{repo_id}", headers=_auth_header(user_b["access_token"]))
    assert del_b.status_code == 403

    # User A can delete their own repo (200)
    del_a = client.delete(f"/api/repos/{repo_id}", headers=_auth_header(user_a["access_token"]))
    assert del_a.status_code == 200
    assert del_a.json()["status"] == "deleted"

    # Repo no longer exists
    get_del = client.get(f"/api/repos/{repo_id}", headers=_auth_header(user_a["access_token"]))
    assert get_del.status_code == 404


