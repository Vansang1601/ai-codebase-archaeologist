from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import os
import re
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
    additions: int | None = None
    deletions: int | None = None


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
        env={**os.environ, "LC_ALL": "C"},
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


def list_remote_branches(url: str) -> list[str]:
    """Return remote branch names ordered by common priority."""
    validate_canonical_github_url(url)
    raw = _run(["git", "ls-remote", "--heads", "--", url], timeout=30)
    branches: list[str] = []
    for line in raw.splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2 and parts[1].startswith("refs/heads/"):
            branches.append(parts[1][len("refs/heads/"):])
    priority = {"main": 0, "master": 1, "develop": 2, "dev": 3, "integration/mvp": 4}
    branches.sort(key=lambda b: (priority.get(b, 99), b))
    return branches


def fetch_and_checkout_branch(destination: Path, branch: str) -> tuple[str, str]:
    """Fetch and detach-checkout a specific remote branch in an existing clone."""
    settings = get_settings()
    _run(
        ["git", "fetch", "--depth", str(settings.max_history_commits), "origin", branch],
        cwd=destination,
        timeout=settings.max_clone_seconds,
    )
    _run(["git", "checkout", "--detach", "FETCH_HEAD"], cwd=destination, timeout=30)
    sha = _run(["git", "rev-parse", "HEAD"], cwd=destination, timeout=10).strip()
    return sha, branch


def read_history(repo_dir: Path, limit: int) -> list[CommitInfo]:
    # Git treats a shallow boundary as a root; its whole tree is not a real change.
    shallow_file = repo_dir / ".git" / "shallow"
    shallow = set(shallow_file.read_text().splitlines()) if shallow_file.is_file() else set()
    fmt = "%x1e%H%x1f%an%x1f%aI%x1f%P%x1f%s%x00"
    command = ["git", "log", f"-n{limit}", f"--pretty=format:{fmt}"]
    have_stats = True
    try:
        raw = _run(command + ["--shortstat", "--find-renames"], cwd=repo_dir, timeout=60)
    except subprocess.TimeoutExpired:
        # Large diffs should not prevent the rest of a repository from being indexed.
        have_stats = False
        raw = _run(command, cwd=repo_dir, timeout=30)
    items: list[CommitInfo] = []
    for record in raw.split("\x1e"):
        header, marker, stat = record.partition("\x00")
        if not marker:
            continue
        parts = header.lstrip().split("\x1f", 4)
        if len(parts) != 5:
            continue
        sha, author, iso, parents, message = parts
        additions = deletions = None
        if have_stats and sha not in shallow and len(parents.split()) <= 1:
            added = re.search(r"(\d+) insertion", stat)
            removed = re.search(r"(\d+) deletion", stat)
            additions = int(added[1]) if added else 0
            deletions = int(removed[1]) if removed else 0
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except Exception:
            dt = None
        items.append(CommitInfo(sha=sha, author_name=author, message=message, committed_at=dt,
                                additions=additions, deletions=deletions))
    return items
