from __future__ import annotations
from dataclasses import dataclass
from .parser import ParsedSymbol


@dataclass
class TextChunk:
    symbol_name: str | None
    line_start: int
    line_end: int
    content: str


def make_chunks(content: str, symbols: list[ParsedSymbol], max_lines: int = 120, overlap: int = 12) -> list[TextChunk]:
    lines = content.splitlines()
    if not lines:
        return []
    chunks: list[TextChunk] = []
    covered = set()
    for sym in symbols:
        start = max(1, sym.line_start)
        end = min(len(lines), max(sym.line_end, start))
        if end - start + 1 <= max_lines:
            text = "\n".join(lines[start - 1:end])
            chunks.append(TextChunk(sym.qualified_name, start, end, text))
            covered.update(range(start, end + 1))
        else:
            cursor = start
            while cursor <= end:
                part_end = min(end, cursor + max_lines - 1)
                text = "\n".join(lines[cursor - 1:part_end])
                chunks.append(TextChunk(sym.qualified_name, cursor, part_end, text))
                covered.update(range(cursor, part_end + 1))
                cursor = part_end - overlap + 1
                if cursor <= start:
                    cursor = part_end + 1
                start = cursor

    # Add module/file chunks for content not covered by symbols or files without symbols.
    cursor = 1
    while cursor <= len(lines):
        end = min(len(lines), cursor + max_lines - 1)
        if not all(i in covered for i in range(cursor, end + 1)):
            text = "\n".join(lines[cursor - 1:end])
            chunks.append(TextChunk(None, cursor, end, text))
        if end == len(lines):
            break
        cursor = max(cursor + 1, end - overlap + 1)

    # Deduplicate identical ranges.
    unique = {}
    for ch in chunks:
        unique[(ch.symbol_name, ch.line_start, ch.line_end)] = ch
    return list(unique.values())
