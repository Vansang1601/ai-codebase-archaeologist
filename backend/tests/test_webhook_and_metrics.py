"""Tests for M6 GitHub Webhook and Metrics endpoints."""
import hashlib
import hmac
import json
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app, settings
from app.database import SessionLocal
from app.models import Repository


client = TestClient(app)


def _sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def test_metrics_endpoint_returns_expected_shape():
    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "repositories_total" in data
    assert "snapshots_completed" in data
    assert set(data["jobs"].keys()) == {"queued", "running", "completed", "failed"}
    assert set(data["indexed"].keys()) == {"files", "symbols", "dependencies", "chunks", "findings", "pull_requests"}
    assert "llm_configured" in data


def test_webhook_ping_and_signature_verification(monkeypatch):
    secret = "test-webhook-secret"
    monkeypatch.setattr(settings, "github_webhook_secret", secret)

    body = json.dumps({"zen": "Design for failure."}).encode("utf-8")

    # Missing/invalid signature rejected with 401
    bad = client.post("/api/webhooks/github", content=body, headers={"X-GitHub-Event": "ping"})
    assert bad.status_code == 401

    # Valid signature accepted
    good = client.post(
        "/api/webhooks/github",
        content=body,
        headers={
            "X-GitHub-Event": "ping",
            "X-Hub-Signature-256": _sign(body, secret),
        },
    )
    assert good.status_code == 200
    assert good.json() == {"status": "pong"}


def test_webhook_push_queues_sync_job(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "")
    tag = uuid4().hex[:8]
    owner = f"whowner-{tag}"
    name = f"whrepo-{tag}"

    db = SessionLocal()
    try:
        repo = Repository(
            canonical_url=f"https://github.com/{owner}/{name}.git",
            owner=owner,
            name=name,
            status="ready",
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
        repo_id = repo.id
    finally:
        db.close()

    payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": f"{owner}/{name}"},
    }
    resp = client.post(
        "/api/webhooks/github",
        json=payload,
        headers={"X-GitHub-Event": "push"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert len(data["triggered_jobs"]) == 1
    assert data["triggered_jobs"][0]["repository_id"] == repo_id
    assert data["triggered_jobs"][0]["requested_ref"] == "main"
    assert data["triggered_jobs"][0]["status"] == "queued"
