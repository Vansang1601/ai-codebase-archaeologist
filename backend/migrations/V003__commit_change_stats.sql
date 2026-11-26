CREATE TABLE IF NOT EXISTS commit_change_stats (
    commit_id VARCHAR(36) PRIMARY KEY REFERENCES commit_records(id) ON DELETE CASCADE,
    additions INTEGER NOT NULL,
    deletions INTEGER NOT NULL
);
