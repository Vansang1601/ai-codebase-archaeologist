from __future__ import annotations
import hashlib
import json
import shutil
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
from .models import Repository, Snapshot, AnalysisJob, CodeFile, Symbol, Dependency, Chunk, CommitRecord, Finding


def update_job(db: Session, job: AnalysisJob, phase: str, progress: int):
    job.phase = phase
    job.progress = progress
    job.status = "running"
    db.commit()


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
        if snapshot:
            # Reuse an immutable completed snapshot rather than mixing versions.
            job.snapshot_id = snapshot.id
            job.status = "completed"
            job.phase = "completed"
            job.progress = 100
            repo.status = "ready"
            db.commit()
            return

        snapshot = Snapshot(repository_id=repo.id, commit_sha=sha, branch=branch, status="building")
        db.add(snapshot)
        db.flush()
        job.snapshot_id = snapshot.id
        db.commit()

        update_job(db, job, "scanning", 20)
        scanned, skipped = scan_repository(workdir)
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
        for c in read_history(workdir, settings.max_history_commits):
            exists = db.scalar(select(CommitRecord).where(CommitRecord.repository_id == repo.id, CommitRecord.sha == c.sha))
            if not exists:
                db.add(CommitRecord(
                    repository_id=repo.id, sha=c.sha, author_name=c.author_name,
                    message=c.message, committed_at=c.committed_at,
                ))

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
