-- ============================================================
-- Migration V002: Pull Requests & Ingestion Metrics
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS pull_requests (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    repository_id   VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    number          INTEGER     NOT NULL,
    title           VARCHAR(500) NOT NULL,
    state           VARCHAR(32)  NOT NULL DEFAULT 'open',
    author_name     VARCHAR(300) NOT NULL DEFAULT '',
    head_sha        VARCHAR(64),
    base_branch     VARCHAR(200),
    merged_at       TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    created_at_gh   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_repo_pr_number UNIQUE (repository_id, number)
);
CREATE INDEX IF NOT EXISTS ix_pull_requests_repo ON pull_requests (repository_id);

ALTER TABLE analysis_jobs
    ADD COLUMN IF NOT EXISTS skipped_files_json TEXT DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pr_status VARCHAR(32) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS pr_count INTEGER DEFAULT 0;

ALTER TABLE snapshots
    ADD COLUMN IF NOT EXISTS pr_count INTEGER DEFAULT 0;

INSERT INTO schema_migrations (version) VALUES ('V002__pull_requests')
ON CONFLICT (version) DO NOTHING;

COMMIT;
