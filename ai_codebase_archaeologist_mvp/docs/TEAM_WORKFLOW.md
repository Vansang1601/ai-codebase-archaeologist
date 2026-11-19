# Team workflow

## Ownership

| Member | Branch | Primary directories |
|---|---|---|
| Member 1 | `feat/frontend-product-ui` | `frontend/` |
| Member 2 | `feat/backend-repo-api` | `backend/`, DB/API docs |
| Member 3 | `feat/parser-rag-graph` | `parser-worker/`, `benchmarks/` |

## Daily workflow

```bash
git switch <your-branch>
git fetch origin
git rebase origin/main
# work + tests
git add <specific-files>
git commit -m "feat(scope): short description"
git push -u origin <your-branch>
```

After a rebase on your own branch use `git push --force-with-lease`, never plain `--force`.

## Merge order

1. Backend schema/API contract.
2. Worker stores data according to schema and completes a sample job.
3. Frontend swaps mock API data for real API.
4. Q&A + evidence integration.
5. Graph/impact/findings.
6. Benchmark + security regression.
7. Documentation/demo cleanup.

## Definition of Done

- Fresh clone starts with Docker Compose.
- Two fixed-SHA repositories can be analyzed.
- At least 40 Q&A benchmark rows and 10 impact cases are labeled.
- Three retrieval configurations are compared.
- Citation opens the exact file and line range at the analyzed SHA.
- At least one intentionally unanswerable question returns insufficient evidence.
- No secret/private repository/cache/embedding is committed.
- Third-party reuse is documented.
