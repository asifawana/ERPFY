-- ==============================================================================
-- ERPfy.net — PostgreSQL 16+ Production Schema
-- Authority: UNIVERSAL-DATABASE-ROLES-PERMISSIONS-MASTER-PROMPT.md
-- Idempotent initialization & migration script for safe first-deployment.
-- ==============================================================================

-- 1. Accounts & Identity
CREATE TABLE IF NOT EXISTS core_accounts (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL DEFAULT '',
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    created_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    email_verified_at BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_accounts_email ON core_accounts (email);

CREATE TABLE IF NOT EXISTS core_account_preferences (
    account_id VARCHAR(64) PRIMARY KEY REFERENCES core_accounts(id) ON DELETE CASCADE,
    email_account_activity INT NOT NULL DEFAULT 1,
    email_security_alerts INT NOT NULL DEFAULT 1,
    email_billing_notices INT NOT NULL DEFAULT 1,
    email_product_updates INT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS core_credentials (
    account_id VARCHAR(64) PRIMARY KEY REFERENCES core_accounts(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_updated_at BIGINT NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until BIGINT NOT NULL DEFAULT 0
);

-- 2. Companies & Tenant Isolation
CREATE TABLE IF NOT EXISTS core_companies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    country_code VARCHAR(8) NOT NULL DEFAULT 'US',
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    sector_slug VARCHAR(128) NOT NULL DEFAULT '',
    industry_slug VARCHAR(128) NOT NULL DEFAULT '',
    business_models TEXT NOT NULL DEFAULT '[]',
    employee_band VARCHAR(64) NOT NULL DEFAULT '',
    plan VARCHAR(64) NOT NULL DEFAULT 'starter',
    state VARCHAR(32) NOT NULL DEFAULT 'trial',
    trial_ends_at BIGINT NOT NULL DEFAULT 0,
    onboarding_state VARCHAR(64) NOT NULL DEFAULT 'not_started',
    onboarding_steps TEXT NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES core_accounts(id),
    request_key VARCHAR(128) NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_companies_slug ON core_companies (slug);
CREATE INDEX IF NOT EXISTS idx_core_companies_creator ON core_companies (created_by);

CREATE TABLE IF NOT EXISTS core_memberships (
    id VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL REFERENCES core_accounts(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    role VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    branch_scope VARCHAR(128) NOT NULL DEFAULT '',
    joined_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_core_memberships_acc_comp ON core_memberships (account_id, company_id);

CREATE TABLE IF NOT EXISTS core_company_settings (
    company_id VARCHAR(64) PRIMARY KEY REFERENCES core_companies(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    updated_by VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS core_company_visits (
    account_id VARCHAR(64) NOT NULL REFERENCES core_accounts(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    last_opened_at BIGINT NOT NULL,
    PRIMARY KEY (account_id, company_id)
);

CREATE TABLE IF NOT EXISTS core_favorites (
    account_id VARCHAR(64) NOT NULL REFERENCES core_accounts(id) ON DELETE CASCADE,
    company_id VARCHAR(64) NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (account_id, company_id)
);

CREATE TABLE IF NOT EXISTS core_invitations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    invited_by VARCHAR(64) NOT NULL REFERENCES core_accounts(id),
    message TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    responded_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_core_invitations_email ON core_invitations (email);

-- 3. Security, Sessions & Audit Logging
CREATE TABLE IF NOT EXISTS core_sessions (
    id VARCHAR(128) PRIMARY KEY,
    account_id VARCHAR(64) NOT NULL REFERENCES core_accounts(id) ON DELETE CASCADE,
    ip_address VARCHAR(64) NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    revoked_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_core_sessions_account ON core_sessions (account_id);

CREATE TABLE IF NOT EXISTS core_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) REFERENCES core_companies(id) ON DELETE CASCADE,
    account_id VARCHAR(64) REFERENCES core_accounts(id),
    action VARCHAR(128) NOT NULL,
    detail TEXT,
    ip_address VARCHAR(64),
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_core_audit_company ON core_audit_logs (company_id, created_at);

-- 4. CRM & Contacts Foundation
CREATE TABLE IF NOT EXISTS crm_parties (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    party_type VARCHAR(32) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    primary_email VARCHAR(255),
    primary_phone VARCHAR(64),
    tax_identifier VARCHAR(64),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_parties_company ON crm_parties (company_id, party_type);

-- 5. Developer Platform & EAP
CREATE TABLE IF NOT EXISTS eap_consumed_tokens (
    token_hash VARCHAR(128) PRIMARY KEY,
    consumed_at BIGINT NOT NULL,
    company_id VARCHAR(64) NOT NULL REFERENCES core_companies(id) ON DELETE CASCADE,
    actor_id VARCHAR(64) NOT NULL
);

-- Done
