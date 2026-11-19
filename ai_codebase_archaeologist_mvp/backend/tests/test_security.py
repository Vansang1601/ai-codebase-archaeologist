import pytest
from app.security import canonicalize_github_url, RepositoryUrlError


def test_accepts_canonical_github_url():
    repo = canonicalize_github_url("https://github.com/owner/repo")
    assert repo.owner == "owner"
    assert repo.name == "repo"
    assert repo.url == "https://github.com/owner/repo.git"


@pytest.mark.parametrize("url", [
    "http://github.com/owner/repo",
    "https://gitlab.com/owner/repo",
    "file:///etc/passwd",
    "ssh://github.com/owner/repo",
    "https://127.0.0.1/owner/repo",
    "https://github.com/owner/repo/extra",
    "https://github.com/user:pass@github.com/owner/repo",
    "https://github.com/owner/repo?x=1",
])
def test_rejects_unsafe_repository_urls(url):
    with pytest.raises(RepositoryUrlError):
        canonicalize_github_url(url)
