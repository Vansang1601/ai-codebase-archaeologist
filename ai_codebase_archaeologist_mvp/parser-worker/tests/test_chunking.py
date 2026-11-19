from worker.chunking import make_chunks
from worker.parser import ParsedSymbol


def test_symbol_chunk_preserves_line_range():
    content = "a\nb\nc\nd\ne\n"
    chunks = make_chunks(content, [ParsedSymbol("function", "f", "f", 2, 4)], max_lines=20)
    symbol = [c for c in chunks if c.symbol_name == "f"][0]
    assert symbol.line_start == 2
    assert symbol.line_end == 4
    assert symbol.content == "b\nc\nd"
