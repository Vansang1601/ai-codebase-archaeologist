-- V004: Auth sessions table (JWT revocation) and auth audit log
-- Sessions track issued JWTs to allow server-side revocation on logout.
-- Audit log captures all authentication events for security observability.

CREATE TABLE IF NOT EXISTS auth_sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   TEXT,
    jti         TEXT NOT NULL UNIQUE,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  TEXT,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_jti     ON auth_sessions(jti);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_expires ON auth_sessions(expires_at);


CREATE TABLE IF NOT EXISTS auth_audit_log (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    event       TEXT NOT NULL,
    provider    TEXT,
    ip_address  TEXT,
    user_agent  TEXT,
    success     BOOLEAN NOT NULL DEFAULT TRUE,
    detail      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auth_audit_log_user_id    ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS ix_auth_audit_log_created_at ON auth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS ix_auth_audit_log_event      ON auth_audit_log(event);
