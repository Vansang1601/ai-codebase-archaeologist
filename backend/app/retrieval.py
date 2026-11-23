from __future__ import annotations
import hashlib
import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Chunk, Snapshot, Repository

TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]{1,}")
VECTOR_DIM = 256


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in TOKEN_RE.findall(text or "")]


def hash_vector(text: str, dim: int = VECTOR_DIM) -> list[float]:
    vec = [0.0] * dim
    for token, count in Counter(tokenize(text)).items():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = -1.0 if digest[4] & 1 else 1.0
        vec[idx] += sign * (1.0 + math.log1p(count))
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))


def lexical_score(query: str, content: str) -> float:
    q = Counter(tokenize(query))
    if not q:
        return 0.0
    c = Counter(tokenize(content))
    overlap = sum(min(c[t], n) for t, n in q.items())
    coverage = overlap / max(1, sum(q.values()))
    exact_bonus = 0.15 if query.lower().strip() in content.lower() else 0.0
    return min(1.0, coverage + exact_bonus)


@dataclass
class ScoredChunk:
    chunk: Chunk
    score: float
    lexical: float
    vector: float


def latest_snapshot(db: Session, repo_id: str) -> Snapshot | None:
    return db.scalar(
        select(Snapshot)
        .where(Snapshot.repository_id == repo_id, Snapshot.status == "ready")
        .order_by(Snapshot.created_at.desc())
        .limit(1)
    )


def retrieve(db: Session, repo_id: str, question: str, top_k: int = 5) -> tuple[Snapshot | None, list[ScoredChunk]]:
    snapshot = latest_snapshot(db, repo_id)
    if not snapshot:
        return None, []
    chunks = db.scalars(select(Chunk).where(Chunk.snapshot_id == snapshot.id)).all()
    qvec = hash_vector(question)
    scored: list[ScoredChunk] = []
    for ch in chunks:
        try:
            cvec = json.loads(ch.vector_json)
        except Exception:
            cvec = []
        lscore = lexical_score(question, ch.content)
        vscore = max(0.0, cosine(qvec, cvec))
        # Lexical is weighted more heavily because deterministic vectors are intentionally lightweight.
        score = 0.62 * lscore + 0.38 * vscore
        if score > 0:
            scored.append(ScoredChunk(ch, score, lscore, vscore))
    scored.sort(key=lambda x: x.score, reverse=True)
    return snapshot, scored[:top_k]


def evidence_url(repo: Repository, sha: str, path: str, line_start: int, line_end: int) -> str:
    base = f"https://github.com/{repo.owner}/{repo.name}/blob/{sha}/{path}"
    if line_end > line_start:
        return f"{base}#L{line_start}-L{line_end}"
    return f"{base}#L{line_start}"
