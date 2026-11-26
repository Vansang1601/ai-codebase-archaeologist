"""Tests for magic-link login flow and OAuth error propagation."""
from urllib.parse import urlparse, parse_qs
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


client = TestClient(app)


def test_magic_link_create_and_verify_flow(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "auth_secret", "test-magic-secret-0123456789abcdef")
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "allow_dev_login", True)

    email = f"magic-{uuid4().hex[:8]}@example.com"
    create_resp = client.post(
        "/api/auth/magic-link",
        json={"email": email, "name": "Magic Tester"},
    )
    assert create_resp.status_code == 200
    data = create_resp.json()
    assert data["expires_in_seconds"] == 900
    assert "/api/auth/magic-link/verify?token=" in data["login_url"]

    parsed = urlparse(data["login_url"])
    token = parse_qs(parsed.query)["token"][0]

    verify_resp = client.get(
        f"/api/auth/magic-link/verify?token={token}",
        follow_redirects=False,
    )
    assert verify_resp.status_code == 302
    location = verify_resp.headers["location"]
    assert "/login#session_token=" in location
    assert "session_token" in verify_resp.cookies


def test_magic_link_invalid_token_redirects_with_error(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "auth_secret", "test-magic-secret-0123456789abcdef")

    resp = client.get(
        "/api/auth/magic-link/verify?token=not-a-valid-jwt",
        follow_redirects=False,
    )
    assert resp.status_code in (302, 307)
    assert "/login?error=invalid_magic_link" in resp.headers["location"]


def test_magic_link_blocked_in_production_without_session(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "auth_secret", "test-magic-secret-0123456789abcdef")
    monkeypatch.setattr(settings, "environment", "production")

    resp = client.post("/api/auth/magic-link", json={"email": "user@example.com"})
    assert resp.status_code == 403
