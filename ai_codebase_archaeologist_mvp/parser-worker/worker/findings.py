from __future__ import annotations
from collections import Counter, defaultdict
from dataclasses import dataclass


@dataclass
class FindingDraft:
    kind: str
    severity: str
    title: str
    description: str
    evidence_path: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    meta: dict | None = None


def build_findings(files, symbols, dependencies) -> list[FindingDraft]:
    findings: list[FindingDraft] = []
    for f in files:
        if f.line_count >= 700:
            findings.append(FindingDraft(
                kind="large_file", severity="medium",
                title=f"Large file: {f.path}",
                description=f"File has {f.line_count} lines. Review whether responsibilities can be split; size alone is not proof of bad design.",
                evidence_path=f.path, line_start=1, line_end=min(f.line_count, 20),
                meta={"line_count": f.line_count},
            ))
    for sym in symbols:
        size = sym.line_end - sym.line_start + 1
        if size >= 180:
            findings.append(FindingDraft(
                kind="large_symbol", severity="medium",
                title=f"Large {sym.kind}: {sym.qualified_name}",
                description=f"Symbol spans {size} lines. Consider decomposition after checking cohesion and tests.",
                evidence_path=getattr(sym, "path", None), line_start=sym.line_start, line_end=sym.line_end,
                meta={"symbol": sym.qualified_name, "lines": size},
            ))
    degree = Counter(source for source, target in dependencies)
    if degree:
        threshold = max(8, sorted(degree.values())[max(0, int(len(degree) * 0.9) - 1)])
        for path, count in degree.items():
            if count >= threshold:
                findings.append(FindingDraft(
                    kind="high_out_coupling", severity="medium",
                    title=f"High outgoing coupling: {path}",
                    description=f"This file has {count} resolved outgoing dependencies (threshold {threshold}). Review whether it coordinates too many modules.",
                    evidence_path=path, line_start=1, line_end=1,
                    meta={"out_degree": count, "threshold": threshold},
                ))
    findings.extend(_cycle_findings(dependencies))
    return findings


def _cycle_findings(edges: list[tuple[str, str]]) -> list[FindingDraft]:
    graph = defaultdict(list)
    for src, dst in edges:
        graph[src].append(dst)
    findings = []
    visiting, visited = set(), set()
    stack = []
    seen_cycles = set()

    def dfs(node):
        if node in visiting:
            if node in stack:
                idx = stack.index(node)
                cycle = stack[idx:] + [node]
                key = tuple(sorted(set(cycle)))
                if key not in seen_cycles and len(key) > 1:
                    seen_cycles.add(key)
                    findings.append(FindingDraft(
                        kind="dependency_cycle", severity="high",
                        title="Dependency cycle detected",
                        description=" -> ".join(cycle),
                        evidence_path=node, line_start=1, line_end=1,
                        meta={"cycle": cycle},
                    ))
            return
        if node in visited:
            return
        visiting.add(node)
        stack.append(node)
        for nxt in graph.get(node, []):
            dfs(nxt)
        stack.pop()
        visiting.remove(node)
        visited.add(node)

    for n in list(graph):
        dfs(n)
    return findings[:20]
