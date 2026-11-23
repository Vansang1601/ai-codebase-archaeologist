from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
from .config import get_settings
from .security import validate_canonical_github_url


@dataclass
class CommitInfo:
    sha: str
    author_name: str
    message: str
    committed_at: datetime | None


def _run(args: list[str], cwd: Path | None = None, timeout: int | None = None) -> str:
    completed = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        check=False,
        shell=False,
    )
    if completed.returncode != 0:
        safe_err = completed.stderr.strip().splitlines()[-1:] or ["git command failed"]
        raise RuntimeError(safe_err[0][:500])
    return completed.stdout


def clone_repository(url: str, destination: Path, requested_ref: str | None = None) -> tuple[str, str | None]:
    settings = get_settings()
    validate_canonical_github_url(url)
    if destination.exists():
        shutil.rmtree(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "git", "clone", "--depth", str(settings.max_history_commits), "--no-tags", "--", url, str(destination)
    ], timeout=settings.max_clone_seconds)
    if requested_ref:
        # requested_ref is passed as an argument, never interpolated into a shell command.
        _run(["git", "fetch", "--depth", str(settings.max_history_commits), "origin", requested_ref], cwd=destination, timeout=settings.max_clone_seconds)
        _run(["git", "checkout", "--detach", "FETCH_HEAD"], cwd=destination, timeout=30)
    sha = _run(["git", "rev-parse", "HEAD"], cwd=destination, timeout=10).strip()
    branch = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=destination, timeout=10).strip()
    if branch == "HEAD":
        branch = None
    return sha, branch


def read_history(repo_dir: Path, limit: int) -> list[CommitInfo]:
    fmt = "%H%x1f%an%x1f%aI%x1f%s%x1e"
    raw = _run(["git", "log", f"-n{limit}", f"--pretty=format:{fmt}"], cwd=repo_dir, timeout=30)
    items: list[CommitInfo] = []
    for record in raw.split("\x1e"):
        record = record.strip()
        if not record:
            continue
        parts = record.split("\x1f")
        if len(parts) < 4:
            continue
        sha, author, iso, message = parts[0], parts[1], parts[2], parts[3]
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except Exception:
            dt = None
        items.append(CommitInfo(sha=sha, author_name=author, message=message, committed_at=dt))
    return items
