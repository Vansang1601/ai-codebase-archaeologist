"""Bounded, snapshot-based edits. Never execute model output or mutate indexed files."""
import ast
import difflib
import re


def prepare_edit(path: str, content: str, start: int, end: int, replacement: str) -> dict:
    if not re.fullmatch(r'[A-Za-z0-9_./@+\-]+', path) or path.startswith('/') or '..' in path.split('/') or '.git' in path.split('/'):
        raise ValueError('Unsupported patch path')
    lines = content.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines) or end - start >= 200:
        raise ValueError('Select between 1 and 200 existing lines')
    if '\x00' in replacement or '\r' in replacement or len(replacement) > 40000:
        raise ValueError('Invalid replacement text')
    before = ''.join(lines[start-1:end])
    # Preserve the source line ending and boundary; an empty replacement deletes the range.
    eol = '\r\n' if '\r\n' in before else '\n'
    new = replacement.replace('\n', eol)
    if new and before.endswith(('\n', '\r')) and not new.endswith(eol):
        new += eol
    after = ''.join(lines[:start-1]) + new + ''.join(lines[end:])
    if after == content:
        raise ValueError('No changes proposed')
    if path.endswith('.py'):
        try:
            ast.parse(after)
        except SyntaxError as exc:
            raise ValueError(f'Python syntax error at line {exc.lineno}') from None
    # git apply understands explicit no-newline markers.
    diff = difflib.unified_diff(content.splitlines(keepends=True), after.splitlines(keepends=True), fromfile='a/'+path, tofile='b/'+path)
    patch = ''.join(line if line.endswith('\n') else line+'\n\\ No newline at end of file\n' for line in diff)
    return {'before': before, 'after': new, 'content': after, 'patch': patch, 'validation': 'python_ast' if path.endswith('.py') else 'range_only'}
