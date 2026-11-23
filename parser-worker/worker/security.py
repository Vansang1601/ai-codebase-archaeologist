from __future__ import annotations
import re
from urllib.parse import urlparse

OWNER_REPO = re.compile(r"^[A-Za-z0-9_.-]+$")


def validate_canonical_github_url(url: str) -> tuple[str, str]:
    p = urlparse((url or "").strip())
    if p.scheme.lower() != "https" or (p.hostname or "").lower().rstrip(".") != "github.com":
        raise ValueError("Only canonical HTTPS github.com URLs are allowed")
    if p.username or p.password or p.port not in (None, 443) or p.query or p.fragment:
        raise ValueError("Unsafe repository URL")
    parts = [x for x in p.path.split("/") if x]
    if len(parts) != 2:
        raise ValueError("Invalid repository path")
    owner, name = parts
    if name.endswith(".git"):
        name = name[:-4]
    if not OWNER_REPO.fullmatch(owner) or not OWNER_REPO.fullmatch(name):
        raise ValueError("Invalid repository owner/name")
    return owner, name
