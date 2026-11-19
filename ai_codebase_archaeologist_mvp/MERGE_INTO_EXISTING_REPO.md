# How to merge this MVP into the existing repository safely

The current team repository already contains `backend/`, `frontend/`, `parser-worker/`, `benchmarks/`, `docs/`
and a nested clone. Do **not** blindly delete existing work.

## Recommended workflow

```bash
git clone https://github.com/Vansang1601/ai-codebase-archaeologist.git
cd ai-codebase-archaeologist
git switch -c integration/mvp-shell
```

1. Copy this package to a separate temporary folder.
2. Compare each top-level directory before replacing it.
3. Keep any existing DeepWiki-derived code until you have completed a license/source audit.
4. Prefer moving useful upstream components into the new module boundaries rather than mixing them everywhere.
5. Run tests/build before each commit.

Suggested commit sequence:

```text
chore: add evidence-first architecture and security docs
feat(api): add versioned repository analysis API
feat(worker): add safe ingestion parser and indexing pipeline
feat(frontend): add repository dashboard grounded qa and explorer
feat(eval): add benchmark templates and runner
ci: add backend worker and frontend checks
```

## Important

This generated MVP intentionally disables private repositories and untrusted code execution.
Do not re-enable those features from the cloned upstream until authentication, permission isolation,
credential storage, sandboxing and regression tests are in place.
