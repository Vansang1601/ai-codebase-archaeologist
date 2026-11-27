from __future__ import annotations
import hashlib
import hmac
import json
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from typing import Optional

from .config import get_settings
from .database import Base, engine, get_db
from .models import Repository, Snapshot, AnalysisJob, CodeFile, Symbol, Dependency, CommitChangeStat, CommitRecord, Finding, PullRequest, Chunk
from .schemas import RepositoryCreate, SyncRequest, QuestionRequest, ImpactRequest, AnswerOut, EvidenceOut
from .security import canonicalize_github_url, RepositoryUrlError
from .retrieval import retrieve, evidence_url, latest_snapshot
from .llm import synthesize
from .auth import get_current_user, get_current_user_optional, get_user_tenant_id, require_repo_access, require_job_access
from .auth_models import User, Tenant, TenantMember, AuthAccount, GitHubInstallation, AuthSession, AuthAuditLog  # ensure tables are registered
from .auth_routes import router as auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AI Codebase Archaeologist API", version="0.2.0", lifespan=lifespan)

cors_origins = list(set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
] + settings.cors_origin_list))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/repos")
def list_repositories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tenant_id = get_user_tenant_id(user)
    q = select(Repository).where(
        Repository.tenant_id.in_([tenant_id, "00000000-0000-0000-0000-000000000001"])
    ).order_by(Repository.created_at.desc())
    repos = db.scalars(q).all()
    out = []
    for repo in repos:
        snap = latest_snapshot(db, repo.id)
        out.append({
            "id": repo.id,
            "owner": repo.owner,
            "name": repo.name,
            "canonical_url": repo.canonical_url,
            "status": repo.status,
            "created_at": repo.created_at,
            "snapshot": _snapshot_dict(snap) if snap else None,
        })
    return out


@app.post("/api/repos")
def create_repository(payload: RepositoryCreate, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    try:
        canonical = canonicalize_github_url(payload.url)
    except RepositoryUrlError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    repo = db.scalar(select(Repository).where(Repository.canonical_url == canonical.url))
    tenant_id = get_user_tenant_id(user) if user else None
    if repo is None:
        repo = Repository(
            canonical_url=canonical.url,
            owner=canonical.owner,
            name=canonical.name,
            default_branch=payload.branch,
            tenant_id=tenant_id,
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
    elif tenant_id and repo.tenant_id is None:
        repo.tenant_id = tenant_id
        db.commit()
        db.refresh(repo)
        db.refresh(repo)
    return {"id": repo.id, "owner": repo.owner, "name": repo.name, "canonical_url": repo.canonical_url, "status": repo.status}


def _queue_repo_sync(db: Session, repo: Repository, requested_ref: str | None = None) -> AnalysisJob:
    """Return an active queued/running job or enqueue a new analysis job for the repository."""
    active = db.scalar(
        select(AnalysisJob).where(
            AnalysisJob.repository_id == repo.id,
            AnalysisJob.status.in_(["queued", "running"]),
        ).order_by(AnalysisJob.created_at.desc()).limit(1)
    )
    if active:
        return active
    job = AnalysisJob(
        repository_id=repo.id,
        requested_ref=requested_ref,
        status="queued",
        phase="queued",
        progress=0,
        tenant_id=repo.tenant_id,
    )
    repo.status = "queued"
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@app.post("/api/repos/{repo_id}/sync")
def sync_repository(repo_id: str, payload: SyncRequest, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    return _job_dict(_queue_repo_sync(db, repo, payload.ref))


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    job = db.get(AnalysisJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user is not None:
        require_job_access(job, user)
    return _job_dict(job)


@app.get("/api/repos/{repo_id}")
def get_repository(repo_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshots = db.scalars(select(Snapshot).where(
        Snapshot.repository_id == repo_id, Snapshot.status == "ready"
    ).order_by(Snapshot.created_at.desc(), Snapshot.id.desc()).limit(12)).all()
    active = db.scalar(select(AnalysisJob).where(AnalysisJob.repository_id == repo_id,
        AnalysisJob.status.in_(["running", "queued"])).order_by(AnalysisJob.created_at.desc()).limit(1)) if repo.status in ("queued", "running") else None
    snap = snapshots[0] if snapshots else None
    return {
        "active_job": _job_dict(active) if active else None,
        "snapshot_history": [_snapshot_dict(row) for row in reversed(snapshots)],
        "id": repo.id,
        "owner": repo.owner,
        "name": repo.name,
        "canonical_url": repo.canonical_url,
        "status": repo.status,
        "snapshot": _snapshot_dict(snap) if snap else None,
    }


def _read_snapshot(db: Session, repo_id: str, commit_sha: str | None) -> Snapshot:
    snapshot = latest_snapshot(db, repo_id) if commit_sha is None else db.scalar(
        select(Snapshot).where(Snapshot.repository_id == repo_id, Snapshot.commit_sha == commit_sha, Snapshot.status == "ready")
    )
    if commit_sha is not None and not snapshot:
        raise HTTPException(status_code=404, detail="Cited revision not found")
    if not snapshot:
        raise HTTPException(status_code=409, detail="Repository has no completed snapshot")
    return snapshot


@app.get("/api/repos/{repo_id}/files")
def get_files(repo_id: str, limit: int = Query(default=200, ge=1, le=1000), offset: int = Query(default=0, ge=0),
              commit_sha: str | None = None, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshot = _read_snapshot(db, repo_id, commit_sha)
    rows = db.execute(select(CodeFile.id, CodeFile.path, CodeFile.language, CodeFile.size_bytes, CodeFile.line_count,
        CodeFile.content_hash).where(CodeFile.snapshot_id == snapshot.id).order_by(CodeFile.path).offset(offset).limit(limit)).all()
    return [{
        "id": f.id, "path": f.path, "language": f.language, "size_bytes": f.size_bytes,
        "line_count": f.line_count, "content_hash": f.content_hash,
    } for f in rows]


@app.get("/api/repos/{repo_id}/file")
def get_file(repo_id: str, path: str = Query(min_length=1, max_length=1000), commit_sha: str | None = None, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshot = _read_snapshot(db, repo_id, commit_sha)
    # Database lookup only: user input is never interpreted as a filesystem path.
    row = db.scalar(select(CodeFile).where(CodeFile.snapshot_id == snapshot.id, CodeFile.path == path).limit(1))
    if not row:
        raise HTTPException(status_code=404, detail="File not found in analyzed snapshot")
    return {
        "path": row.path,
        "language": row.language,
        "content": row.content,
        "line_count": row.line_count,
        "commit_sha": snapshot.commit_sha,
    }


@app.post("/api/repos/{repo_id}/questions", response_model=AnswerOut)
def ask_question(repo_id: str, payload: QuestionRequest, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshot, scored = retrieve(db, repo_id, payload.question, payload.top_k)
    if not snapshot:
        raise HTTPException(status_code=409, detail="Repository has no completed snapshot")
    kept = [x for x in scored if x.score >= settings.min_evidence_score]
    if not kept:
        return AnswerOut(
            answer="Không đủ bằng chứng trong snapshot hiện tại để trả lời câu hỏi này.",
            grounded=False,
            evidence=[],
            warnings=["No retrieved chunk passed the evidence threshold."],
        )
    blocks = [{
        "path": x.chunk.path,
        "line_start": x.chunk.line_start,
        "line_end": x.chunk.line_end,
        "commit_sha": snapshot.commit_sha,
        "content": x.chunk.content,
        "symbol_name": x.chunk.symbol_name,
        "score": x.score,
    } for x in kept]
    try:
        history_turns = [{"role": h.role, "content": h.content} for h in payload.history]
        answer, warnings = synthesize(payload.question, blocks, history=history_turns)
    except Exception as exc:
        answer = "LLM không khả dụng; trả về evidence đã truy xuất."
        warnings = [f"LLM call failed: {type(exc).__name__}"]
    evidence = [EvidenceOut(
        path=x.chunk.path,
        line_start=x.chunk.line_start,
        line_end=x.chunk.line_end,
        commit_sha=snapshot.commit_sha,
        github_url=evidence_url(repo, snapshot.commit_sha, x.chunk.path, x.chunk.line_start, x.chunk.line_end),
        score=round(x.score, 4),
        symbol_name=x.chunk.symbol_name,
        repository_id=repo.id,
        tenant_id=repo.tenant_id,
    ) for x in kept]
    return AnswerOut(answer=answer, grounded=True, evidence=evidence, warnings=warnings)


@app.get("/api/repos/{repo_id}/timeline")
def timeline(repo_id: str, limit: int = Query(default=100, ge=1, le=300), db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    commits = db.execute(
        select(CommitRecord, CommitChangeStat).outerjoin(CommitChangeStat, CommitChangeStat.commit_id == CommitRecord.id).where(CommitRecord.repository_id == repo_id)
        .order_by(CommitRecord.committed_at.desc()).limit(limit)
    ).all()
    return [{
        "sha": c.sha, "short_sha": c.sha[:8], "author_name": c.author_name,
        "message": c.message, "committed_at": c.committed_at,
        "additions": stat.additions if stat else None, "deletions": stat.deletions if stat else None,
    } for c, stat in commits]


@app.get("/api/repos/{repo_id}/graph")
def graph(repo_id: str, focus: str | None = None, commit_sha: str | None = None, limit: int = Query(default=500, ge=1, le=2000), db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshot = _read_snapshot(db, repo_id, commit_sha)
    query = select(Dependency).where(Dependency.snapshot_id == snapshot.id)
    if focus:
        query = query.where((Dependency.source_path == focus) | (Dependency.target_path == focus))
    deps = db.scalars(query.order_by(Dependency.source_path, Dependency.target_path, Dependency.id).limit(limit)).all()
    # Lightweight path index also covers isolated files and nodes outside the edge budget.
    paths = select(CodeFile.path).where(CodeFile.snapshot_id == snapshot.id).union(
        select(Dependency.source_path).where(Dependency.snapshot_id == snapshot.id),
        select(Dependency.target_path).where(Dependency.snapshot_id == snapshot.id))
    all_paths = sorted(db.scalars(paths).all())
    node_paths = sorted({d.source_path for d in deps} | {d.target_path for d in deps})
    if focus in all_paths and focus not in node_paths:
        node_paths.append(focus)
    nodes = [{"id": p, "label": p.split("/")[-1], "path": p} for p in node_paths]
    edges = [{
        "id": d.id, "source": d.source_path, "target": d.target_path,
        "kind": d.kind, "evidence_type": d.evidence_type, "confidence": d.confidence,
    } for d in deps]
    return {"snapshot_sha": snapshot.commit_sha, "nodes": nodes, "edges": edges, "all_paths": all_paths}


@app.post("/api/repos/{repo_id}/impact")
def impact(repo_id: str, payload: ImpactRequest, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshot = _read_snapshot(db, repo_id, payload.commit_sha)
    deps = db.scalars(select(Dependency).where(Dependency.snapshot_id == snapshot.id)).all()
    reverse: dict[str, set[str]] = {}
    for dep in deps:
        reverse.setdefault(dep.target_path, set()).add(dep.source_path)
    if payload.target_path not in reverse and payload.target_path not in {d.source_path for d in deps}:
        if not db.scalar(select(CodeFile.id).where(CodeFile.snapshot_id == snapshot.id, CodeFile.path == payload.target_path)):
            raise HTTPException(status_code=404, detail="Target path does not exist in dependency graph")
    visited = {payload.target_path}
    frontier = [(payload.target_path, [payload.target_path], 0)]
    paths = []
    while frontier:
        current, path, depth = frontier.pop(0)
        if depth >= payload.depth:
            continue
        for nxt in sorted(reverse.get(current, set())):
            new_path = path + [nxt]
            paths.append({"affected_path": nxt, "depth": depth + 1, "path": new_path})
            if nxt not in visited:
                visited.add(nxt)
                frontier.append((nxt, new_path, depth + 1))
    return {
        "target_path": payload.target_path,
        "max_depth": payload.depth,
        "affected": sorted(visited - {payload.target_path}),
        "paths": paths,
    }


@app.get("/api/repos/{repo_id}/findings")
def findings(repo_id: str, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    snapshot = latest_snapshot(db, repo_id)
    if not snapshot:
        raise HTTPException(status_code=409, detail="Repository has no completed snapshot")
    rows = db.scalars(
        select(Finding).where(Finding.snapshot_id == snapshot.id).order_by(Finding.severity.desc(), Finding.kind.asc())
    ).all()
    # Keep only cited windows in memory, even when many findings reference large files.
    windows = {}
    for row in rows:
        if row.evidence_path and row.line_start:
            windows.setdefault(row.evidence_path, []).append(row)
    snippets = {}
    if windows:
        files = select(CodeFile.path, CodeFile.content).where(
            CodeFile.snapshot_id == snapshot.id, CodeFile.path.in_(windows)
        ).execution_options(yield_per=8)
        for path, content in db.execute(files):
            lines = content.splitlines()
            for row in windows[path]:
                end = min(row.line_start + 3, row.line_end or row.line_start)
                snippets[row.id] = [line[:240] for line in lines[row.line_start - 1:end]]
    return [{
        "excerpt": snippets.get(x.id, []), "commit_sha": snapshot.commit_sha,
        "id": x.id, "kind": x.kind, "severity": x.severity, "title": x.title,
        "description": x.description, "evidence_path": x.evidence_path,
        "line_start": x.line_start, "line_end": x.line_end,
        "meta": json.loads(x.meta_json or "{}"),
    } for x in rows]


@app.get("/api/repos/{repo_id}/pulls")
def list_pull_requests(
    repo_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    repo = db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if user is not None:
        require_repo_access(repo, user)
    prs = db.scalars(
        select(PullRequest).where(PullRequest.repository_id == repo_id)
        .order_by(PullRequest.number.desc()).limit(limit)
    ).all()
    return [{
        "id": p.id,
        "number": p.number,
        "title": p.title,
        "state": p.state,
        "author_name": p.author_name,
        "head_sha": p.head_sha,
        "base_branch": p.base_branch,
        "merged_at": p.merged_at,
        "closed_at": p.closed_at,
        "created_at_gh": p.created_at_gh,
    } for p in prs]


def _snapshot_dict(s: Snapshot):
    return {
        "id": s.id, "commit_sha": s.commit_sha, "branch": s.branch, "status": s.status,
        "file_count": s.file_count, "symbol_count": s.symbol_count,
        "dependency_count": s.dependency_count, "chunk_count": s.chunk_count,
        "pr_count": s.pr_count,
        "created_at": s.created_at,
    }


def _job_dict(job: AnalysisJob):
    return {
        "id": job.id, "repository_id": job.repository_id, "requested_ref": job.requested_ref,
        "status": job.status, "phase": job.phase, "progress": job.progress,
        "snapshot_id": job.snapshot_id, "error": job.error,
        "skipped_files": json.loads(job.skipped_files_json or "{}"),
        "pr_status": job.pr_status,
        "pr_count": job.pr_count,
        "created_at": job.created_at, "updated_at": job.updated_at,
    }


def _verify_github_signature(raw_body: bytes, signature_header: str | None, secret: str) -> bool:
    """Verify GitHub X-Hub-Signature-256 HMAC header in constant time."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@app.post("/api/webhooks/github")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive GitHub push / pull_request webhooks and enqueue re-analysis for tracked repos."""
    raw_body = await request.body()
    if settings.github_webhook_secret:
        sig = request.headers.get("x-hub-signature-256")
        if not _verify_github_signature(raw_body, sig, settings.github_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("x-github-event", "ping")
    if event == "ping":
        return {"status": "pong"}

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if event not in ("push", "pull_request"):
        return {"status": "ignored", "event": event, "triggered_jobs": []}

    repo_info = payload.get("repository") or {}
    full_name = (repo_info.get("full_name") or "").strip()
    if "/" not in full_name:
        return {"status": "ignored", "event": event, "triggered_jobs": []}

    owner, name = full_name.split("/", 1)
    ref = payload.get("ref")
    branch = ref.removeprefix("refs/heads/") if isinstance(ref, str) and ref.startswith("refs/heads/") else None

    matching_repos = db.scalars(
        select(Repository).where(
            func.lower(Repository.owner) == owner.lower(),
            func.lower(Repository.name) == name.lower(),
        )
    ).all()

    triggered = [_job_dict(_queue_repo_sync(db, repo, branch)) for repo in matching_repos]
    return {"status": "ok", "event": event, "triggered_jobs": triggered}


@app.get("/api/metrics")
def get_metrics(db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    """Return aggregate indexing and quality metrics for M6 observability."""
    repo_filter = Repository.id.isnot(None)
    if user is not None:
        tenant_id = get_user_tenant_id(user)
        repo_filter = (Repository.tenant_id == tenant_id) | (Repository.tenant_id == "00000000-0000-0000-0000-000000000001")

    repo_ids = db.scalars(select(Repository.id).where(repo_filter)).all()
    if not repo_ids:
        return {
            "repositories_total": 0,
            "snapshots_completed": 0,
            "jobs": {"queued": 0, "running": 0, "completed": 0, "failed": 0},
            "indexed": {"files": 0, "symbols": 0, "dependencies": 0, "chunks": 0, "findings": 0, "pull_requests": 0},
            "llm_configured": bool(settings.llm_base_url and settings.llm_api_key and settings.llm_model),
        }

    job_rows = db.execute(
        select(AnalysisJob.status, func.count(AnalysisJob.id))
        .where(AnalysisJob.repository_id.in_(repo_ids))
        .group_by(AnalysisJob.status)
    ).all()
    job_counts = {"queued": 0, "running": 0, "completed": 0, "failed": 0}
    for status_name, count_val in job_rows:
        if status_name in job_counts:
            job_counts[status_name] = int(count_val)

    snapshot_ids = db.scalars(
        select(Snapshot.id).where(Snapshot.repository_id.in_(repo_ids), Snapshot.status == "completed")
    ).all()
    return {
        "repositories_total": len(repo_ids),
        "snapshots_completed": len(snapshot_ids),
        "jobs": job_counts,
        "indexed": {
            "files": int(db.scalar(select(func.count(CodeFile.id)).where(CodeFile.snapshot_id.in_(snapshot_ids))) or 0) if snapshot_ids else 0,
            "symbols": int(db.scalar(select(func.count(Symbol.id)).where(Symbol.snapshot_id.in_(snapshot_ids))) or 0) if snapshot_ids else 0,
            "dependencies": int(db.scalar(select(func.count(Dependency.id)).where(Dependency.snapshot_id.in_(snapshot_ids))) or 0) if snapshot_ids else 0,
            "chunks": int(db.scalar(select(func.count(Chunk.id)).where(Chunk.snapshot_id.in_(snapshot_ids))) or 0) if snapshot_ids else 0,
            "findings": int(db.scalar(select(func.count(Finding.id)).where(Finding.snapshot_id.in_(snapshot_ids))) or 0) if snapshot_ids else 0,
            "pull_requests": int(db.scalar(select(func.count(PullRequest.id)).where(PullRequest.repository_id.in_(repo_ids))) or 0),
        },
        "llm_configured": bool(settings.llm_base_url and settings.llm_api_key and settings.llm_model),
    }
