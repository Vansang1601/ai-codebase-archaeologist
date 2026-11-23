from pathlib import Path
from worker.scanner import scan_repository


def test_scanner_skips_secret_and_symlink(tmp_path: Path, monkeypatch):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "a.py").write_text("def hello():\n    return 1\n", encoding="utf-8")
    (tmp_path / ".env").write_text("TOKEN=secret", encoding="utf-8")
    outside = tmp_path.parent / "outside.txt"
    outside.write_text("outside", encoding="utf-8")
    link = tmp_path / "leak.txt"
    try:
        link.symlink_to(outside)
    except OSError:
        pass
    files, skipped = scan_repository(tmp_path)
    paths = {f.path for f in files}
    assert "src/a.py" in paths
    assert ".env" not in paths
    assert "leak.txt" not in paths
