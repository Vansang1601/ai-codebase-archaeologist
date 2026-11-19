from __future__ import annotations
import hashlib
import math
import re
from collections import Counter

TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]{1,}")
VECTOR_DIM = 256


def hash_vector(text: str, dim: int = VECTOR_DIM) -> list[float]:
    vec = [0.0] * dim
    tokens = [t.lower() for t in TOKEN_RE.findall(text or "")]
    for token, count in Counter(tokens).items():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = -1.0 if digest[4] & 1 else 1.0
        vec[idx] += sign * (1.0 + math.log1p(count))
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]
