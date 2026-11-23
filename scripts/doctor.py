from __future__ import annotations
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def version(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT, timeout=5).strip().splitlines()[0]
    except Exception:
        return "NOT FOUND"


def main() -> int:
    checks = {
        "python": version([sys.executable, "--version"]),
        "git": version(["git", "--version"]),
        "node": version(["node", "--version"]),
        "npm": version(["npm", "--version"]),
        "docker": version(["docker", "--version"]),
    }
    print("AI Codebase Archaeologist - doctor")
    for name, value in checks.items():
        print(f"{name:8} {value}")
    required = [
        ROOT / ".env.example", ROOT / "docker-compose.yml",
        ROOT / "backend" / "app" / "main.py",
        ROOT / "parser-worker" / "worker" / "main.py",
        ROOT / "frontend" / "package.json",
    ]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
    if missing:
        print("Missing required files:")
        for m in missing:
            print(" -", m)
        return 1
    if (ROOT / ".env").exists():
        print(".env: present (verify it is ignored by Git)")
    else:
        print(".env: missing; copy .env.example to .env before Docker Compose")
    print("Project structure: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
