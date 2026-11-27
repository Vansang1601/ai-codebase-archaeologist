"""Tests for session management, token revocation, audit logging, and rate limiting."""
from __future__ import annotations
import os
import pytest
from uuid import uuid4

os.environ.setdefault("AUTH_SECRET", "test-secret-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://archaeologist:archaeologist@postgres:5432/archaeologist")

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.auth import _rate_limiter, check_rate_limit
from fastapi import HTTPException

client = TestClient(app)


@pytest.fixture(autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_session_lifecycle_and_revocation():
    """Test login creates session, user can list sessions, and revoking a session blocks the token."""
    email = f"sess_{uuid4().hex[:8]}@example.com"
    # Register user
    reg_resp = client.post("/api/auth/register", json={"email": email, "name": "Session Test"})
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]

    # Check active sessions
    sess_resp = client.get("/api/auth/sessions", headers=_auth_header(token))
    assert sess_resp.status_code == 200
    sessions = sess_resp.json().get("sessions", [])
    assert len(sessions) >= 1
    session_id = sessions[0]["id"]
    assert sessions[0]["is_current"] is True

    # Check audit log contains login event
    audit_resp = client.get("/api/auth/audit-log", headers=_auth_header(token))
    assert audit_resp.status_code == 200
    events = audit_resp.json().get("events", [])
    assert any(e["event"] == "login_success" for e in events)

    # Revoke session
    del_resp = client.delete(f"/api/auth/sessions/{session_id}", headers=_auth_header(token))
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "revoked"

    # Token should now be rejected as revoked
    me_resp = client.get("/api/auth/me", headers=_auth_header(token))
    assert me_resp.status_code == 401
    assert "revoked" in me_resp.json()["detail"].lower()


def test_logout_revokes_token():
    """Logout invalidates the current session token."""
    email = f"logout_{uuid4().hex[:8]}@example.com"
    reg_resp = client.post("/api/auth/register", json={"email": email})
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]

    # Logout
    logout_resp = client.post("/api/auth/logout", headers=_auth_header(token))
    assert logout_resp.status_code == 200

    # Token should now be rejected
    me_resp = client.get("/api/auth/me", headers=_auth_header(token))
    assert me_resp.status_code == 401


def test_rate_limiter_blocks_abuse():
    """Verify rate limiter throws 429 when max hits are exceeded."""
    from fastapi import Request
    # Directly test check_rate_limit logic
    test_key = f"test_endpoint_{uuid4().hex[:6]}"
    ip = "192.168.1.99"

    for _ in range(5):
        assert _rate_limiter.check(test_key, ip, max_hits=5, window_seconds=60) is True

    # 6th hit must be blocked
    assert _rate_limiter.check(test_key, ip, max_hits=5, window_seconds=60) is False
