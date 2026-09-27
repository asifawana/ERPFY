import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

let sqlite;

class Statement {
  constructor(sql, args = []) {
    this.sql = sql;
    this.args = args;
  }

  bind(...args) {
    return new Statement(this.sql, args);
  }

  async first() {
    return sqlite.prepare(this.sql).get(...this.args) || null;
  }

  async all() {
    return { results: sqlite.prepare(this.sql).all(...this.args) };
  }

  async run() {
    const result = sqlite.prepare(this.sql).run(...this.args);
    return { results: [], meta: { changes: Number(result.changes) } };
  }
}

const db = {
  prepare(sql) {
    return new Statement(sql);
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },
};

globalThis.__erpTestDB = db;
globalThis.__erpTestSecretKey = 'test-secret-key-material-0123456789abcdef';

async function route(path) {
  const output = await build({
    entryPoints: [path],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    plugins: [
      {
        name: 'test-d1-binding',
        setup(builder) {
          builder.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
            path: 'binding',
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents:
              'export const env = { get DB() { return globalThis.__erpTestDB; },' +
              ' get ERPFY_SECRET_KEY() { return globalThis.__erpTestSecretKey; } };',
          }));
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
  );
}

const login = await route('app/api/auth/login/route.ts');
const pluginSettingsApi = await route('app/api/settings/plugins/route.ts');
const pluginService = await route('lib/settings/plugin-settings.ts');

const origin = 'https://erp.test';
const password = 'a-correct-long-password';

function passwordHash(value) {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(value, salt, iterations, 32, 'sha256');
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function request(path, data, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
}

function _getRequest(path, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'GET',
    headers: { origin, ...headers },
  });
}

async function signIn(email = 'owner@example.test') {
  const response = await login.POST(
    request('/api/auth/login', { email, password }),
  );
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';', 1)[0];
}

beforeEach(() => {
  sqlite?.close();
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(
    readFileSync('drizzle/0000_core_baseline.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0001_auth.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0006_settings.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0007_authority_foundation.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );
  sqlite.exec(
    readFileSync('drizzle/0008_developer_platform_eap.sql', 'utf8').replaceAll(
      '--> statement-breakpoint',
      '',
    ),
  );

  const now = Date.now();
  // Owner account
  sqlite
    .prepare(
      `INSERT INTO core_accounts
        (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run('account-owner', 'owner@example.test', 'Owner User', 'Asia/Karachi', now, now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials
        (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run('account-owner', passwordHash(password), now);

  // Restricted member account (no settings permission)
  sqlite
    .prepare(
      `INSERT INTO core_accounts
        (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run('account-member', 'member@example.test', 'Member User', 'Asia/Karachi', now, now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials
        (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run('account-member', passwordHash(password), now);

  // Company A
  const insertCompany = sqlite.prepare(
    `INSERT INTO core_companies
      (id, name, slug, country_code, currency, timezone, language, sector_slug,
       industry_slug, business_models, employee_band, plan, state, trial_ends_at,
       onboarding_state, onboarding_steps, created_at, created_by, request_key)
     VALUES (?, ?, ?, ?, ?, ?, 'en', '', '', '[]', '', 'starter', 'trial', ?,
             'completed', '{}', ?, ?, ?)`,
  );
  insertCompany.run('company-a', 'Company A', 'company-a', 'PK', 'PKR', 'Asia/Karachi', now + 86400000, now, 'account-owner', 'company-a');
  insertCompany.run('company-b', 'Company B', 'company-b', 'PK', 'PKR', 'Asia/Karachi', now + 86400000, now, 'account-owner', 'company-b');

  // Memberships
  const insertMember = sqlite.prepare(
    `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
     VALUES (?, ?, ?, 'active', '', ?)`,
  );
  insertMember.run('company-a', 'account-owner', 'owner', now);
  insertMember.run('company-b', 'account-owner', 'owner', now);
  insertMember.run('company-a', 'account-member', 'member', now);

  // Seed developer org and app
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, created_at)
       VALUES ('dev-org-1', 'Test Labs', 'test-labs', 'verified', ?)`,
    )
    .run(now);

  // Seed App 1: AI Demand Forecaster (Custom Plugin with settings)
  sqlite
    .prepare(
      `INSERT INTO eap_apps (id, organization_id, slug, name, short_description, category, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app-forecaster', 'dev-org-1', 'ai-forecaster', 'AI Demand Forecaster', 'Predict inventory demand', 'Analytics', 'published', 0, 'account-owner', ?, ?)`,
    )
    .run(now, now);

  const forecasterManifest = {
    protocol: 'eap-v1',
    app_id: 'app-forecaster',
    name: 'AI Demand Forecaster',
    slug: 'ai-forecaster',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    developer_id: 'dev-org-1',
    permissions: ['inventory.read'],
    settings: {
      forecastHorizonDays: {
        type: 'number',
        label: 'Forecast Horizon (Days)',
        default: 30,
      },
      modelMode: {
        type: 'select',
        label: 'Model Mode',
        default: 'balanced',
        options: [
          { label: 'Conservative', value: 'conservative' },
          { label: 'Balanced', value: 'balanced' },
          { label: 'Aggressive', value: 'aggressive' },
        ],
      },
      apiKey: {
        type: 'secret',
        label: 'Forecasting Engine API Key',
      },
      autoSyncWeekly: {
        type: 'boolean',
        label: 'Weekly Auto-Sync',
        default: true,
      },
    },
  };

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver-forecaster-1', 'app-forecaster', '1.0.0', 'eap-v1', '1.0.0', ?, 'hash1', 'sig1', 'rel1', 'published', ?)`,
    )
    .run(JSON.stringify(forecasterManifest), now);

  // Seed App 2: Sales plugin (Overlapping with legacy)
  sqlite
    .prepare(
      `INSERT INTO eap_apps (id, organization_id, slug, name, short_description, category, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app-sales', 'dev-org-1', 'erpfy-sales', 'Sales Management', 'Sales core app', 'Sales', 'published', 0, 'account-owner', ?, ?)`,
    )
    .run(now, now);

  const salesManifest = {
    protocol: 'eap-v1',
    app_id: 'app-sales',
    name: 'Sales Management',
    slug: 'erpfy-sales',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    developer_id: 'dev-org-1',
    permissions: ['sales.manage'],
    settings: {
      defaultLeadSource: {
        type: 'string',
        label: 'Default Lead Source',
        default: 'Direct',
      },
    },
  };

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver-sales-1', 'app-sales', '1.0.0', 'eap-v1', '1.0.0', ?, 'hash2', 'sig2', 'rel2', 'published', ?)`,
    )
    .run(JSON.stringify(salesManifest), now);

  // Seed App 3: Killed plugin
  sqlite
    .prepare(
      `INSERT INTO eap_apps (id, organization_id, slug, name, short_description, category, status, is_killed, kill_reason, created_by_account_id, created_at, updated_at)
       VALUES ('app-killed', 'dev-org-1', 'killed-plugin', 'Compromised Plugin', 'Banned plugin', 'Utilities', 'published', 1, 'Quarantine', 'account-owner', ?, ?)`,
    )
    .run(now, now);

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver-killed-1', 'app-killed', '1.0.0', 'eap-v1', '1.0.0', ?, 'hash3', 'sig3', 'rel3', 'published', ?)`,
    )
    .run(JSON.stringify({ protocol: 'eap-v1', app_id: 'app-killed', name: 'Compromised', slug: 'killed-plugin', version: '1.0.0', minimum_platform_version: '1.0.0', developer_id: 'dev-org-1', permissions: [], settings: { key: { type: 'string', label: 'Val' } } }), now);
});

/* ------------------------------------------------------------------ *
 * Phase 2 Automated Tests
 * ------------------------------------------------------------------ */

test('1. Installed and active plugin settings appear dynamically', async () => {
  const now = Date.now();
  // Install forecaster in Company A
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{"forecastHorizonDays":45}', ?, ?)`,
    )
    .run(now, now);

  const sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].pluginSlug, 'ai-forecaster');
  assert.equal(sections[0].pluginName, 'AI Demand Forecaster');
  assert.equal(sections[0].fields.length, 4);

  const horizonField = sections[0].fields.find((f) => f.key === 'forecastHorizonDays');
  assert.equal(horizonField.value, 45);
  assert.equal(horizonField.type, 'number');
});

test('2. Uninstalled plugin settings do not appear dynamically', async () => {
  // Forecaster is registered in catalog but NOT installed in Company A
  const sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sections.length, 0);
});

test('3. Disabled plugin settings do not appear dynamically', async () => {
  const now = Date.now();
  // Install forecaster as 'disabled' in Company A
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'disabled', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  const sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sections.length, 0);
});

test('4. Globally killed plugin settings do not appear dynamically even if installed', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-2', 'company-a', 'app-killed', 'ver-killed-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  const sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sections.length, 0);
});

test('5. Company isolation: Company A settings never leak into Company B', async () => {
  const now = Date.now();
  // Install forecaster in Company A with secret & config
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{"forecastHorizonDays":90}', ?, ?)`,
    )
    .run(now, now);

  const sectionsA = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sectionsA.length, 1);
  assert.equal(sectionsA[0].fields.find((f) => f.key === 'forecastHorizonDays').value, 90);

  // Company B has no installations
  const sectionsB = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-b');
  assert.equal(sectionsB.length, 0);
});

test('6. Permission denied: User without settings permission cannot access plugin settings', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  // 1. Outsider without membership is denied
  await assert.rejects(
    () => pluginService.loadTenantPluginSettings(db, 'account-outsider', 'company-a'),
    (err) => err.status === 404 || err.status === 403,
  );

  // 2. Member with explicit deny override is denied
  sqlite
    .prepare(
      `INSERT INTO core_permissions (key, description, created_at)
       VALUES ('settings.view', 'View settings', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO core_permission_overrides (company_id, account_id, permission_key, effect, scope, updated_at, updated_by)
       VALUES ('company-a', 'account-member', 'settings.view', 'deny', 'COMPANY', ?, 'account-owner')`,
    )
    .run(now);

  await assert.rejects(
    () => pluginService.loadTenantPluginSettings(db, 'account-member', 'company-a'),
    (err) => err.status === 403,
  );
});

test('7. Direct API request without settings.manage permission is denied with 403', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  const cookie = await signIn('member@example.test');
  const res = await pluginSettingsApi.POST(
    request(
      '/api/settings/plugins',
      {
        companyId: 'company-a',
        pluginSlug: 'ai-forecaster',
        settings: { forecastHorizonDays: 99 },
      },
      { cookie },
    ),
  );
  assert.equal(res.status, 403);
});

test('8. Saving settings validates active installation and rejects unknown fields', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  // Valid save
  const saveRes = await pluginService.saveTenantPluginSettings(
    db,
    'account-owner',
    'company-a',
    'ai-forecaster',
    {
      forecastHorizonDays: 60,
      modelMode: 'conservative',
    },
  );
  assert.equal(saveRes.success, true);
  assert.deepEqual(saveRes.updatedFields, ['forecastHorizonDays', 'modelMode']);

  // Rejects unknown field
  await assert.rejects(
    () =>
      pluginService.saveTenantPluginSettings(
        db,
        'account-owner',
        'company-a',
        'ai-forecaster',
        {
          unknownMaliciousField: 'exploit',
        },
      ),
    (err) => err.status === 400 && err.message.includes('Unknown setting field'),
  );
});

test('9. Plugin A cannot modify Plugin B configuration', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  // Attempt to save settings for uninstalled plugin 'erpfy-sales'
  await assert.rejects(
    () =>
      pluginService.saveTenantPluginSettings(
        db,
        'account-owner',
        'company-a',
        'erpfy-sales',
        { defaultLeadSource: 'Partner' },
      ),
    (err) => err.status === 404,
  );
});

test('10. Sensitive values (secrets) are encrypted at rest and never returned in plaintext', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  // Save secret
  const saveRes = await pluginService.saveTenantPluginSettings(
    db,
    'account-owner',
    'company-a',
    'ai-forecaster',
    {
      apiKey: 'super-secret-production-token-999',
    },
  );
  assert.equal(saveRes.success, true);
  assert.deepEqual(saveRes.secretsUpdated, ['apiKey']);

  // Verify secret is NOT in eap_app_installations.configuration
  const instRow = sqlite
    .prepare(`SELECT configuration FROM eap_app_installations WHERE id = 'inst-1'`)
    .get();
  assert.ok(!instRow.configuration.includes('super-secret-production-token-999'));

  // Verify secret IS in core_company_secrets encrypted
  const secretRow = sqlite
    .prepare(`SELECT cipher, iv FROM core_company_secrets WHERE company_id = 'company-a' AND name = 'plugin:ai-forecaster:apiKey'`)
    .get();
  assert.ok(secretRow);
  assert.ok(secretRow.cipher);

  // Verify loadTenantPluginSettings returns isConfigured: true and value: '' (NO PLAINTEXT)
  const loaded = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  const secretField = loaded[0].fields.find((f) => f.key === 'apiKey');
  assert.equal(secretField.isSecret, true);
  assert.equal(secretField.isConfigured, true);
  assert.equal(secretField.value, '');
});

test('11. Overlap detection prevents duplicate tabs for Sales, POS, Pharmacy, and ZATCA', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-sales', 'company-a', 'app-sales', 'ver-sales-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  const sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  const salesSection = sections.find((s) => s.pluginSlug === 'erpfy-sales');
  assert.ok(salesSection);
  assert.equal(salesSection.isOverlappingWithLegacy, true);
  assert.equal(salesSection.legacyTabId, 'sales-defaults');
});

test('12. Re-enable restores dynamic plugin settings exactly once', async () => {
  const now = Date.now();
  // 1. Initially disabled
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'disabled', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  let sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sections.length, 0);

  // 2. Re-enable to 'installed'
  sqlite
    .prepare(`UPDATE eap_app_installations SET status = 'installed' WHERE id = 'inst-1'`)
    .run();

  sections = await pluginService.loadTenantPluginSettings(db, 'account-owner', 'company-a');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].pluginSlug, 'ai-forecaster');
});

test('13. Authenticated POST API endpoint saves valid plugin settings and returns result', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, installed_by_account_id, status, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-forecaster', 'ver-forecaster-1', 'account-owner', 'installed', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  const cookie = await signIn('owner@example.test');
  const res = await pluginSettingsApi.POST(
    request(
      '/api/settings/plugins',
      {
        companyId: 'company-a',
        pluginSlug: 'ai-forecaster',
        settings: {
          forecastHorizonDays: 14,
          autoSyncWeekly: false,
        },
      },
      { cookie },
    ),
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.deepEqual(data.updatedFields, ['forecastHorizonDays', 'autoSyncWeekly']);
});
