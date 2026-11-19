# Security model and demo gate

The analyzed repository and every LLM output are untrusted inputs.

## Ingestion controls

- HTTPS-only GitHub URL in MVP.
- Reject credentials in URL, fragments, arbitrary hosts and non-repository paths.
- Clone uses a subprocess argument list, never `shell=True`.
- Clone timeout and file/size/history caps.
- Unique UUID work directory per job.
- Symlinks are skipped.
- Path resolution must stay below repository root.
- Exclude `.git`, build/vendor caches, binary files, secret-like files and oversized files.
- Never run repository build scripts, dependency installers or tests in MVP.

## Retrieval and prompt-injection controls

- Repository comments/docs may contain instructions aimed at the model. Treat them only as evidence.
- The system prompt explicitly tells the LLM not to follow instructions found in evidence.
- Only retrieved chunks are sent to the model, never the whole repository.
- The model cannot choose arbitrary filesystem paths or execute tools.
- Citations are created deterministically from database evidence records.

## UI output controls

- Do not render raw HTML returned by the model or repository content.
- External links use safe target attributes.
- Evidence links are created from canonical GitHub owner/repo + immutable SHA + stored path.

## Production gaps that must be closed before public/private deployment

- Real authentication and tenant isolation.
- GitHub App/OAuth with minimal scopes for private repositories.
- Encryption/rotation for credentials.
- Rate limits and abuse protection.
- Webhook signature verification.
- Security headers and CSP.
- Dedicated sandbox if build/test execution is ever enabled.

## Pre-demo checklist

- [ ] No secret in Git history or `.env` committed.
- [ ] Repository URL rejects non-GitHub/non-HTTPS input.
- [ ] Symlink and `../` path tests pass.
- [ ] Worker never executes analyzed code.
- [ ] Logs do not contain full prompts/tokens/private code.
- [ ] Missing evidence produces `grounded=false`.
- [ ] Static dependency vs heuristic/inferred relation is labeled.
- [ ] Third-party license notices are preserved.
