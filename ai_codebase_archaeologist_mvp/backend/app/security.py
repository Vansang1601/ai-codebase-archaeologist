from __future__ import annotations
import re
from dataclasses import dataclass
from urllib.parse import urlparse

OWNER_REPO = re.compile(r"^[A-Za-z0-9_.-]+$")


class RepositoryUrlError(ValueError):
    pass


@dataclass(frozen=True)
class CanonicalRepository:
    owner: str
    name: str
    url: str


def canonicalize_github_url(raw: str) -> CanonicalRepository:
    raw = (raw or "").strip()
    if len(raw) > 1000:
        raise RepositoryUrlError("Repository URL is too long")
    parsed = urlparse(raw)
    if parsed.scheme.lower() != "https":
        raise RepositoryUrlError("Only HTTPS repository URLs are allowed")
    if parsed.username or parsed.password:
        raise RepositoryUrlError("Credentials in repository URL are not allowed")
    host = (parsed.hostname or "").lower().rstrip(".")
    if host != "github.com":
        raise RepositoryUrlError("MVP only allows github.com repositories")
    if parsed.port not in (None, 443):
        raise RepositoryUrlError("Custom ports are not allowed")
    if parsed.query or parsed.fragment:
        raise RepositoryUrlError("Query strings and fragments are not allowed")
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) != 2:
        raise RepositoryUrlError("Use https://github.com/<owner>/<repo>")
    owner, name = parts
    if name.endswith(".git"):
        name = name[:-4]
    if not owner or not name or not OWNER_REPO.fullmatch(owner) or not OWNER_REPO.fullmatch(name):
        raise RepositoryUrlError("Invalid GitHub owner or repository name")
    return CanonicalRepository(owner=owner, name=name, url=f"https://github.com/{owner}/{name}.git")
