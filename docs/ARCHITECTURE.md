# Architecture

## Data flow

1. The user registers a public GitHub repository URL.
2. Backend validates and canonicalizes the URL.
3. Backend creates an `AnalysisJob` row with `queued` status.
4. Worker locks one queued job, clones the repository into a UUID work directory and records the exact HEAD SHA.
5. Worker scans only allowed text files and stores a versioned `Snapshot`.
6. Worker extracts symbols/import dependencies and creates symbol-aware chunks.
7. Worker computes deterministic local vectors and Git history metadata.
8. Worker creates debt findings and marks the job `completed`.
9. Q&A retrieves only chunks from the selected snapshot and returns file/SHA/line evidence.
10. Optional LLM synthesis receives only those retrieved chunks; repository content is treated as untrusted evidence, not instructions.

## Core invariants

- `Snapshot.commit_sha` is immutable.
- `CodeFile`, `Symbol`, `Dependency`, `Chunk`, `Finding` belong to exactly one snapshot.
- Retrieval always filters by `repository_id` and `snapshot_id`.
- Citation line numbers are 1-based.
- Missing evidence returns `grounded=false`.
- Impact traversal has a configurable maximum depth.

## MVP queue

For a 3-person school project and a single worker, PostgreSQL is sufficient as the queue:
`queued -> running -> completed|failed`.
This avoids introducing Redis before it is needed. If concurrent workers become necessary,
move queue dispatch to Redis/Celery/RQ while keeping the job table as the system of record.

## Parser strategy

- Python: native `ast` module for classes/functions/imports.
- JavaScript/TypeScript: conservative import/class/function extraction for the MVP.
- Upgrade path: Tree-sitter registry per language with parser coverage metrics.

The UI and schema do not depend on a specific parser implementation, so Tree-sitter can replace
individual language adapters without breaking API contracts.
