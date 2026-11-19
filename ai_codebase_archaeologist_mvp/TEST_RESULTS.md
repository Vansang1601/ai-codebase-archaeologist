# Verification performed before delivery

Date: 2026-11-19

## Python syntax

```text
python -m compileall -q backend parser-worker benchmarks
PASS
```

## Backend tests

```text
DATABASE_URL=sqlite+pysqlite:///:memory: PYTHONPATH=. pytest -q
11 passed
```

## Worker tests

```text
DATABASE_URL=sqlite+pysqlite:///:memory: PYTHONPATH=. pytest -q
3 passed
```

## Backend API smoke test

Using a temporary SQLite file:

- `GET /health` -> `{"status":"ok"}`
- `POST /api/repos` with `https://github.com/pallets/flask` -> 200 and canonical URL
- `POST /api/repos/{id}/sync` -> 200, `queued`

## Static analysis-pipeline smoke test

The worker scanner/parser/chunker/vectorizer was run on this generated source tree itself:

```text
files: 53
symbols: 114
dependencies: 2
chunks: 161
findings: 0
```

This proves the deterministic analysis stages execute. The full GitHub-clone end-to-end path could not be executed inside the generation environment because outbound Git networking is unavailable there; Docker/real clone must be verified on a team machine with network access.

## Frontend

- `next.config.mjs` passes Node syntax check.
- A full `npm install && npm run build` was not executed in the generation environment because package download access is unavailable. Run it on the team machine before the frontend PR is merged.
