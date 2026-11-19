-- ============================================================
-- Migration V001: Auth + Tenant isolation
-- Strategy: additive only, no data dropped, no existing tables altered destructively.
-- New tables: users, auth_accounts, tenants, tenant_members, github_installations
-- New columns: repositories.tenant_id (nullable), analysis_jobs.tenant_id (nullable)
-- A "system" default tenant is inserted so existing rows can be associated.
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. Enable uuid extension (idempotent)
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- 2. Users table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email           TEXT        NOT NULL UNIQUE,
    name            TEXT,
    avatar_url      TEXT,
    preferred_locale VARCHAR(8) NOT NULL DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- ----------------------------------------------------------------
-- 3. Auth accounts (OAuth provider links)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_accounts (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(64) NOT NULL,            -- 'github' | 'google'
    provider_account_id TEXT        NOT NULL,
    access_token_hash   TEXT,                            -- hashed, never plaintext
    refresh_token_hash  TEXT,                            -- hashed, never plaintext
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS ix_auth_accounts_user_id ON auth_accounts (user_id);

-- ----------------------------------------------------------------
-- 4. Tenants (workspaces)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name            TEXT        NOT NULL UNIQUE,
    owner_user_id   VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 5. Tenant members
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_members (
    tenant_id   VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(32) NOT NULL DEFAULT 'member',   -- 'owner' | 'admin' | 'member'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);

-- ----------------------------------------------------------------
-- 6. GitHub App installations (per tenant)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_installations (
    id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id       VARCHAR(36)  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    installation_id BIGINT       NOT NULL UNIQUE,
    github_account  VARCHAR(255) NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',  -- 'active' | 'suspended' | 'deleted'
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_github_installations_tenant_id ON github_installations (tenant_id);

-- ----------------------------------------------------------------
-- 7. Add tenant_id to repositories (nullable – backward compatible)
-- ----------------------------------------------------------------
ALTER TABLE repositories
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_repositories_tenant_id ON repositories (tenant_id);

-- ----------------------------------------------------------------
-- 8. Add tenant_id to analysis_jobs (nullable – backward compatible)
-- ----------------------------------------------------------------
ALTER TABLE analysis_jobs
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_analysis_jobs_tenant_id ON analysis_jobs (tenant_id);

-- ----------------------------------------------------------------
-- 9. Create a system/default tenant so existing rows are associable.
--    Uses a fixed UUID so this is idempotent.
-- ----------------------------------------------------------------
INSERT INTO tenants (id, name, owner_user_id, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'default',
    NULL,
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Backfill existing repositories to default tenant (only NULL rows)
UPDATE repositories
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Backfill existing analysis_jobs to default tenant (only NULL rows)
UPDATE analysis_jobs
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- ----------------------------------------------------------------
-- 10. Schema version tracking table (simple, no Alembic needed yet)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(64) PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('V001__auth_tenant')
ON CONFLICT (version) DO NOTHING;

COMMIT;
