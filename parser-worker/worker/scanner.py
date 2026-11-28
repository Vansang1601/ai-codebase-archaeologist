from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import hashlib
from .config import get_settings

EXCLUDED_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "vendor", "dist", "build", "target",
    ".next", ".cache", ".venv", "venv", "__pycache__", "coverage", ".idea", ".vscode",
}
SECRET_NAMES = {
    ".env", ".env.local", ".env.production", "id_rsa", "id_ed25519", "credentials.json",
}
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".keystore"}
TEXT_SUFFIXES = {
    ".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts",
    ".java", ".kt", ".go", ".rs", ".cs", ".php", ".rb", ".swift", ".dart", ".scala", ".lua",
    ".c", ".cpp", ".cc", ".h", ".hpp", ".vue", ".svelte",
    ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".xml", ".html", ".css", ".scss", ".sass", ".less",
    ".sql", ".graphql", ".gql", ".proto", ".prisma", ".sh", ".ps1", ".dockerfile",
}
SPECIAL_TEXT_NAMES = {"Dockerfile", "Makefile", "README", "LICENSE", ".gitignore", ".env.example", "Caddyfile"}


@dataclass
class ScannedFile:
    path: str
    language: str
    size_bytes: int
    line_count: int
    content_hash: str
    content: str


def language_for(path: Path) -> str:
    suffix = path.suffix.lower()
    return {
        ".py": "python", ".js": "javascript", ".jsx": "javascript",
        ".ts": "typescript", ".tsx": "typescript", ".java": "java",
        ".go": "go", ".rs": "rust", ".cs": "csharp", ".php": "php",
        ".rb": "ruby", ".md": "markdown", ".sql": "sql",
    }.get(suffix, "text")


def scan_repository(root: Path) -> tuple[list[ScannedFile], dict[str, int]]:
    settings = get_settings()
    root = root.resolve(strict=True)
    files: list[ScannedFile] = []
    skipped = {"excluded_dir": 0, "symlink": 0, "secret": 0, "large": 0, "binary_or_unsupported": 0, "limit": 0}
    for path in root.rglob("*"):
        if len(files) >= settings.max_repo_files:
            skipped["limit"] += 1
            break
        try:
            rel_parts = path.relative_to(root).parts
        except ValueError:
            skipped["symlink"] += 1
            continue
        if any(part in EXCLUDED_DIRS for part in rel_parts[:-1]):
            continue
        if not path.is_file():
            continue
        if path.is_symlink():
            skipped["symlink"] += 1
            continue
        resolved = path.resolve(strict=True)
        try:
            resolved.relative_to(root)
        except ValueError:
            skipped["symlink"] += 1
            continue
        name_lower = path.name.lower()
        if name_lower in SECRET_NAMES or path.suffix.lower() in SECRET_SUFFIXES:
            skipped["secret"] += 1
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size > settings.max_file_bytes:
            skipped["large"] += 1
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in SPECIAL_TEXT_NAMES:
            skipped["binary_or_unsupported"] += 1
            continue
        raw = path.read_bytes()
        if b"\x00" in raw[:4096]:
            skipped["binary_or_unsupported"] += 1
            continue
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            content = raw.decode("utf-8", errors="replace")
        rel = path.relative_to(root).as_posix()
        files.append(ScannedFile(
            path=rel,
            language=language_for(path),
            size_bytes=size,
            line_count=max(1, content.count("\n") + 1),
            content_hash=hashlib.sha256(raw).hexdigest(),
            content=content,
        ))
    return files, skipped
