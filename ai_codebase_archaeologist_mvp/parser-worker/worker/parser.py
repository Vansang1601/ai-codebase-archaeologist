from __future__ import annotations
import ast
import re
from dataclasses import dataclass


@dataclass
class ParsedSymbol:
    kind: str
    name: str
    qualified_name: str
    line_start: int
    line_end: int


@dataclass
class ImportRef:
    raw: str
    kind: str = "import"


@dataclass
class ParseResult:
    symbols: list[ParsedSymbol]
    imports: list[ImportRef]


JS_IMPORT_RE = re.compile(r"(?:import\s+.*?\s+from\s+|import\s*\(|require\s*\()\s*['\"]([^'\"]+)['\"]")
JS_CLASS_RE = re.compile(r"^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)", re.MULTILINE)
JS_FUNC_RE = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", re.MULTILINE)
JS_ARROW_RE = re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^\n]*\)\s*=>", re.MULTILINE)


def parse_file(path: str, language: str, content: str) -> ParseResult:
    if language == "python":
        return _parse_python(path, content)
    if language in {"javascript", "typescript"}:
        return _parse_js_ts(path, content)
    return ParseResult(symbols=[], imports=[])


def _parse_python(path: str, content: str) -> ParseResult:
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return ParseResult(symbols=[], imports=[])
    symbols: list[ParsedSymbol] = []
    imports: list[ImportRef] = []

    def walk_body(body, prefix: str = ""):
        for node in body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                qn = f"{prefix}.{node.name}" if prefix else node.name
                symbols.append(ParsedSymbol("function", node.name, qn, node.lineno, getattr(node, "end_lineno", node.lineno)))
            elif isinstance(node, ast.ClassDef):
                qn = f"{prefix}.{node.name}" if prefix else node.name
                symbols.append(ParsedSymbol("class", node.name, qn, node.lineno, getattr(node, "end_lineno", node.lineno)))
                for child in node.body:
                    if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        cqn = f"{qn}.{child.name}"
                        symbols.append(ParsedSymbol("method", child.name, cqn, child.lineno, getattr(child, "end_lineno", child.lineno)))
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(ImportRef(alias.name))
            elif isinstance(node, ast.ImportFrom):
                prefix_dots = "." * int(node.level or 0)
                imports.append(ImportRef(prefix_dots + (node.module or "")))
    walk_body(tree.body)
    return ParseResult(symbols=symbols, imports=imports)


def _line_for_offset(content: str, offset: int) -> int:
    return content.count("\n", 0, offset) + 1


def _parse_js_ts(path: str, content: str) -> ParseResult:
    symbols: list[ParsedSymbol] = []
    imports = [ImportRef(m.group(1)) for m in JS_IMPORT_RE.finditer(content)]
    for kind, regex in [("class", JS_CLASS_RE), ("function", JS_FUNC_RE), ("function", JS_ARROW_RE)]:
        for m in regex.finditer(content):
            line = _line_for_offset(content, m.start())
            symbols.append(ParsedSymbol(kind, m.group(1), m.group(1), line, line))
    return ParseResult(symbols=symbols, imports=imports)
