from worker.parser import parse_file


def test_python_parser_extracts_symbols_and_imports():
    src = """import os\nfrom app import service\n\nclass A:\n    def method(self):\n        return 1\n\ndef top():\n    return A()\n"""
    result = parse_file("x.py", "python", src)
    names = {s.qualified_name for s in result.symbols}
    assert "A" in names
    assert "A.method" in names
    assert "top" in names
    assert any(i.raw == "os" for i in result.imports)
