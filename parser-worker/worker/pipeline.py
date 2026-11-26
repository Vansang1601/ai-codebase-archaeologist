from __future__ import annotations
import hashlib
import json
import shutil
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import get_settings
from .git_ops import clone_repository, read_history
from .scanner import scan_repository
from .parser import parse_file
from .dependencies import build_dependencies
from .chunking import make_chunks
from .vectorizer import hash_vector
from .findings import build_findings
from .models import Repository, Snapshot, AnalysisJob, CodeFile, Symbol, Dependency, Chunk, CommitChangeStat, CommitRecord, Finding, PullRequest


def update_job(db: Session, job: AnalysisJob, phase: str, progress: int):
    job.phase = phase
    job.progress = progress
    job.status = "running"
    db.commit()


def sync_pull_requests(db: Session, repo: Repository, job: AnalysisJob, snapshot: Snapshot) -> None:
    """Fetch Pull Request metadata from GitHub API."""
    url = f"https://api.github.com/repos/{repo.owner}/{repo.name}/pulls?state=all&per_page=30"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "AI-Codebase-Archaeologist",
            "Accept": "application/vnd.github+json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                raw = json.loads(resp.read().decode("utf-8"))
                count = 0
                for item in raw:
                    pr_num = item.get("number")
                    if not pr_num:
                        continue
                    existing = db.scalar(
                        select(PullRequest).where(
                            PullRequest.repository_id == repo.id,
                            PullRequest.number == pr_num,
                        )
                    )
                    merged_at = None
                    closed_at = None
                    created_at_gh = None
                    try:
                        if item.get("merged_at"):
                            merged_at = datetime.fromisoformat(item["merged_at"].replace("Z", "+00:00"))
                        if item.get("closed_at"):
                            closed_at = datetime.fromisoformat(item["closed_at"].replace("Z", "+00:00"))
                        if item.get("created_at"):
                            created_at_gh = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                    except Exception:
                        pass

                    if not existing:
                        db.add(PullRequest(
                            repository_id=repo.id,
                            number=pr_num,
                            title=(item.get("title") or "")[:500],
                            state=item.get("state") or "open",
                            author_name=((item.get("user") or {}).get("login") or "")[:300],
                            head_sha=(item.get("head") or {}).get("sha"),
                            base_branch=(item.get("base") or {}).get("ref"),
                            merged_at=merged_at,
                            closed_at=closed_at,
                            created_at_gh=created_at_gh,
                        ))
                    count += 1
                job.pr_status = "completed"
                job.pr_count = count
                snapshot.pr_count = count
                return
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            job.pr_status = "rate_limited"
        elif exc.code in (401, 404):
            job.pr_status = "unauthorized_or_not_found"
        else:
            job.pr_status = f"http_{exc.code}"
    except Exception:
        job.pr_status = "failed"


def store_history(db: Session, repo_id: str, workdir: Path, limit: int):
    history = read_history(workdir, limit)
    hashes = [item.sha for item in history]
    records = {record.sha: record for record in db.scalars(select(CommitRecord).where(
        CommitRecord.repository_id == repo_id, CommitRecord.sha.in_(hashes)
    ))}
    for item in history:
        if item.sha not in records:
            record = CommitRecord(repository_id=repo_id, sha=item.sha, author_name=item.author_name,
                                  message=item.message, committed_at=item.committed_at)
            db.add(record)
            records[item.sha] = record
    db.flush()
    existing = set(db.scalars(select(CommitChangeStat.commit_id).where(
        CommitChangeStat.commit_id.in_([record.id for record in records.values()])
    )))
    for item in history:
        commit_id = records[item.sha].id
        if commit_id not in existing and item.additions is not None and item.deletions is not None:
            db.add(CommitChangeStat(commit_id=commit_id, additions=item.additions, deletions=item.deletions))


def run_job(db: Session, job: AnalysisJob):
    settings = get_settings()
    repo = db.get(Repository, job.repository_id)
    if not repo:
        raise RuntimeError("Repository no longer exists")
    workdir = Path(settings.repo_workdir) / job.id
    try:
        update_job(db, job, "cloning", 8)
        sha, branch = clone_repository(repo.canonical_url, workdir, job.requested_ref)

        snapshot = db.scalar(select(Snapshot).where(Snapshot.repository_id == repo.id, Snapshot.commit_sha == sha))
        if snapshot and snapshot.status == "ready":
            # Existing installations can populate line counts on their first re-sync.
            has_stats = db.scalar(select(CommitChangeStat.commit_id).join(
                CommitRecord, CommitRecord.id == CommitChangeStat.commit_id
            ).where(CommitRecord.repository_id == repo.id).limit(1))
            if not has_stats:
                store_history(db, repo.id, workdir, settings.max_history_commits)
            job.snapshot_id = snapshot.id
            job.status = "completed"
            job.phase = "snapshot_reused"
            job.progress = 100
            repo.status = "ready"
            db.commit()
            return

        if snapshot:
            active = db.scalar(select(AnalysisJob.id).where(
                AnalysisJob.snapshot_id == snapshot.id, AnalysisJob.status == "running", AnalysisJob.id != job.id
            ).limit(1))
            if active:
                raise RuntimeError("Another job is building this revision")
            # A previous failed attempt can leave rows committed before indexing finished.
            db.delete(snapshot)
            db.flush()
        snapshot = Snapshot(repository_id=repo.id, commit_sha=sha, branch=branch, status="building")
        db.add(snapshot)
        db.flush()
        job.snapshot_id = snapshot.id
        db.commit()

        update_job(db, job, "scanning", 20)
        scanned, skipped = scan_repository(workdir)
        job.skipped_files_json = json.dumps(skipped)
        db.commit()
        if not scanned:
            raise RuntimeError("No supported text source files were found within configured limits")

        file_rows: dict[str, CodeFile] = {}
        parsed_by_path = {}
        for f in scanned:
            row = CodeFile(
                snapshot_id=snapshot.id, path=f.path, language=f.language, size_bytes=f.size_bytes,
                line_count=f.line_count, content_hash=f.content_hash, content=f.content,
            )
            db.add(row)
            file_rows[f.path] = row
        db.flush()

        update_job(db, job, "parsing", 42)
        all_symbol_rows = []
        available = set(file_rows)
        dependency_edges: list[tuple[str, str]] = []
        for f in scanned:
            parsed = parse_file(f.path, f.language, f.content)
            parsed_by_path[f.path] = parsed
            for s in parsed.symbols:
                row = Symbol(
                    file_id=file_rows[f.path].id, snapshot_id=snapshot.id, kind=s.kind, name=s.name,
                    qualified_name=s.qualified_name, line_start=s.line_start, line_end=s.line_end,
                )
                # convenience attribute used only while building findings
                row.path = f.path
                db.add(row)
                all_symbol_rows.append(row)
            for target, kind in build_dependencies(f.path, parsed.imports, available):
                db.add(Dependency(
                    snapshot_id=snapshot.id, source_path=f.path, target_path=target,
                    kind=kind, evidence_type="static", confidence=1.0,
                ))
                dependency_edges.append((f.path, target))
        db.flush()

        update_job(db, job, "indexing", 63)
        chunk_count = 0
        for f in scanned:
            parsed = parsed_by_path[f.path]
            for ch in make_chunks(f.content, parsed.symbols):
                if not ch.content.strip():
                    continue
                raw = ch.content.encode("utf-8", errors="replace")
                db.add(Chunk(
                    snapshot_id=snapshot.id, file_id=file_rows[f.path].id, path=f.path,
                    symbol_name=ch.symbol_name, line_start=ch.line_start, line_end=ch.line_end,
                    content_hash=hashlib.sha256(raw).hexdigest(), content=ch.content,
                    vector_json=json.dumps(hash_vector(ch.content), separators=(",", ":")),
                ))
                chunk_count += 1
        db.flush()

        update_job(db, job, "history_mapping", 78)
        store_history(db, repo.id, workdir, settings.max_history_commits)

        update_job(db, job, "pull_requests", 85)
        sync_pull_requests(db, repo, job, snapshot)
        db.commit()

        update_job(db, job, "findings", 90)
        # findings use in-memory data so they are reproducible without an LLM
        finding_drafts = build_findings(scanned, all_symbol_rows, dependency_edges)
        for d in finding_drafts:
            db.add(Finding(
                snapshot_id=snapshot.id, kind=d.kind, severity=d.severity, title=d.title,
                description=d.description, evidence_path=d.evidence_path,
                line_start=d.line_start, line_end=d.line_end,
                meta_json=json.dumps(d.meta or {}, ensure_ascii=False),
            ))

        snapshot.file_count = len(scanned)
        snapshot.symbol_count = len(all_symbol_rows)
        snapshot.dependency_count = len(dependency_edges)
        snapshot.chunk_count = chunk_count
        snapshot.status = "ready"
        repo.status = "ready"
        job.status = "completed"
        job.phase = "completed"
        job.progress = 100
        job.error = None
        db.commit()
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
