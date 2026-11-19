# API contract

Base URL: `/api`

## Repository

### `POST /api/repos`

```json
{"url":"https://github.com/owner/repo","branch":null}
```

Returns repository metadata. The backend only accepts HTTPS GitHub repository URLs in MVP.

### `POST /api/repos/{repo_id}/sync`

```json
{"ref": null}
```

Returns a queued job.

### `GET /api/repos/{repo_id}`

Returns metadata and the latest completed snapshot.

### `GET /api/repos/{repo_id}/files?limit=200`

Returns versioned file metadata from the latest snapshot.

### `GET /api/repos/{repo_id}/file?path=src/example.py`

Returns stored source text for the exact database path. This endpoint never opens a user-supplied filesystem path.

## Jobs

### `GET /api/jobs/{job_id}`

```json
{
  "id":"uuid",
  "status":"running",
  "phase":"parsing",
  "progress":45,
  "error":null
}
```

## Grounded Q&A

### `POST /api/repos/{repo_id}/questions`

```json
{"question":"How is authentication initialized?","top_k":5}
```

```json
{
  "answer":"...",
  "grounded":true,
  "evidence":[
    {
      "path":"src/auth.py",
      "line_start":10,
      "line_end":42,
      "commit_sha":"...",
      "github_url":"https://github.com/owner/repo/blob/<sha>/src/auth.py#L10-L42",
      "score":0.82
    }
  ],
  "warnings":[]
}
```

No evidence above the minimum threshold => `grounded=false`.

## Timeline

`GET /api/repos/{repo_id}/timeline?limit=100`

## Graph

`GET /api/repos/{repo_id}/graph?limit=500`

## Impact

`POST /api/repos/{repo_id}/impact`

```json
{"target_path":"src/auth.py","depth":2}
```

## Findings

`GET /api/repos/{repo_id}/findings`
