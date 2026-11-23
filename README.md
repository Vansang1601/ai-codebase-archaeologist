# AI Codebase Archaeologist

Evidence-first web application for understanding an unfamiliar Git repository.
The MVP analyzes a public GitHub repository, captures an immutable commit snapshot,
extracts symbols/dependencies, indexes symbol-aware chunks, supports grounded Q&A,
shows Git history, computes bounded impact paths, and emits evidence-backed technical-debt findings.

> This repository is a clean integration shell intended to sit beside / absorb selected pieces
> from the existing DeepWiki-derived code. Preserve third-party licenses and attribution when
> moving code from the nested clone into these modules.

## MVP principles

- **Fail closed on evidence.** No matching evidence => `grounded=false`.
- **Immutable snapshots.** Every file/chunk/evidence record is tied to a commit SHA.
- **No execution of analyzed code.** The worker reads code and Git metadata only.
- **Public GitHub only in MVP.** Private-repository support is intentionally deferred until auth/credential isolation is ready.
- **Small number of moving parts.** PostgreSQL doubles as the MVP job queue. Redis can be added later if throughput requires it.
- **Hybrid retrieval.** Lexical score + deterministic vector score; an LLM is optional and only receives retrieved evidence.

## Architecture

```text
Browser (Next.js)
      |
      v
FastAPI backend -----------------------> PostgreSQL
      |                                      ^
      | create analysis job                  |
      v                                      |
PostgreSQL job queue  ---> parser-worker ----+
                              |
                              +-> safe git clone
                              +-> scan/filter
                              +-> AST/symbol parse
                              +-> dependency graph
                              +-> chunks + deterministic vectors
                              +-> Git history mapping
                              +-> debt findings
```

## Quick start with Docker

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Web: http://localhost:3000
- API docs: http://localhost:8000/docs
- API health: http://localhost:8000/health

Paste a public repository URL such as `https://github.com/pallets/flask` and click **Analyze**.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Worker

```bash
cd parser-worker
python -m venv .venv
# activate the environment
pip install -r requirements.txt
python -m worker.main
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## What is implemented

- Repository URL validation and normalization (HTTPS GitHub only).
- Database-backed asynchronous analysis jobs.
- Safe clone command without shell interpolation and with timeout/limits.
- File filtering (binary/build/vendor/secrets/large files/symlinks).
- Python AST parsing plus conservative JS/TS symbol/import extraction.
- Versioned files, symbols, dependencies, chunks and evidence.
- Deterministic hashed vectors for offline semantic-ish retrieval.
- Hybrid lexical + vector retrieval.
- Optional OpenAI-compatible LLM synthesis.
- Code/file browser and line-based evidence links.
- Commit timeline.
- Dependency graph API and bounded reverse-dependency impact analysis.
- Technical-debt findings: oversized files/functions, high coupling, cycles.
- Benchmark templates and a simple API benchmark runner.

## What is deliberately not claimed complete

- Private repository OAuth/GitHub App flows.
- Full multi-language semantic call graph.
- Sandboxed build/test execution of untrusted repositories.
- Production multi-tenant authorization.
- Scalable pgvector ANN indexing for very large repositories.
- Guaranteed explanation of *why* a change happened when Git/PR evidence does not say why.

These are extension milestones, not hidden limitations.

## Team branches

- `feat/frontend-product-ui`
- `feat/backend-repo-api`
- `feat/parser-rag-graph`

See `docs/TEAM_WORKFLOW.md` for the merge order and Definition of Done.
