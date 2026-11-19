from __future__ import annotations
from pathlib import PurePosixPath
import posixpath
from .parser import ImportRef


def resolve_import(source_path: str, raw: str, available_paths: set[str]) -> str | None:
    source = PurePosixPath(source_path)
    if not raw:
        return None

    # JavaScript / TypeScript relative imports.
    if raw.startswith("."):
        base = (source.parent / raw).as_posix()
        base = posixpath.normpath(base)
        candidates = [base, base + ".ts", base + ".tsx", base + ".js", base + ".jsx", base + ".py"]
        candidates += [f"{base}/index.ts", f"{base}/index.tsx", f"{base}/index.js", f"{base}/index.jsx"]
        for c in candidates:
            norm = str(PurePosixPath(c))
            if norm in available_paths:
                return norm
        return None

    # Python absolute/relative module import heuristic.
    module = raw.lstrip(".").replace(".", "/")
    if module:
        for c in (module + ".py", module + "/__init__.py"):
            if c in available_paths:
                return c
    return None


def build_dependencies(source_path: str, imports: list[ImportRef], available_paths: set[str]) -> list[tuple[str, str]]:
    out = []
    seen = set()
    for ref in imports:
        target = resolve_import(source_path, ref.raw, available_paths)
        if target and target != source_path and target not in seen:
            seen.add(target)
            out.append((target, ref.kind))
    return out
