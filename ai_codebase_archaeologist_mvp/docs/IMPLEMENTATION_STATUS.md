# Implementation status against the assignment

| Requirement | MVP status | Evidence in this package | Next hardening step |
|---|---|---|---|
| Connect GitHub repository | Implemented for public GitHub HTTPS | backend URL validator + worker safe clone | GitHub App/OAuth for private repos |
| Snapshot by commit SHA | Implemented | `Snapshot` model and worker `git rev-parse HEAD` | branch/webhook incremental sync |
| File/symbol parsing | Implemented MVP | Python AST; conservative JS/TS extraction | replace JS/TS adapter with Tree-sitter |
| Dependency graph | Implemented for resolved local imports | `Dependency` model + graph endpoint | symbol/call graph and language packs |
| Chunk/index | Implemented | symbol-aware chunks + deterministic vectors | pgvector/real embedding model |
| Hybrid retrieval | Implemented MVP | lexical + vector weighted retrieval | benchmark/tune/rerank |
| Grounded Q&A | Implemented | evidence threshold + optional LLM | claim-level citation validator |
| Git history | Implemented commit timeline | worker `git log` mapping | PR/issue mapping through GitHub API |
| Impact analysis | Implemented bounded reverse traversal | `/impact` endpoint | change-aware symbol graph |
| Technical debt | Implemented rule baseline | size/coupling/cycle findings | churn + complexity + duplicate signals |
| 40 Q&A benchmark | Template started | `benchmarks/questions.csv` | team must manually label >=40 rows |
| 10 impact cases | Template started | `benchmarks/impact_cases.csv` | team must manually label >=10 cases |
| 3 controlled experiments | Harness foundation | benchmark runner | add keyword-only/vector-only/hybrid switches |
| Security basics | Implemented/Documented | safe URL/clone/scan, no code execution | auth, rate limits, private repo isolation |
| Docker/README | Implemented | root Compose + README | run on all three team machines |

## Important interpretation

The generated package is a **working MVP foundation**, not a false claim that every research milestone is already experimentally proven.
The remaining benchmark labels and results must be produced by the team on fixed repository SHAs, because those measurements are part of the assessed work and should be reproducible.
