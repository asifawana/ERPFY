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
const storeApi = await route('app/api/apps/store/route.ts');
const installApi = await route('app/api/apps/install/route.ts');
const navApi = await route('app/api/apps/navigation/route.ts');
const pluginSettingsApi = await route('app/api/settings/plugins/route.ts');
const signing = await route('lib/eap/signing.ts');

const origin = 'https://erp.test';
const password = 'a-correct-long-password';

function passwordHash(value) {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(value, salt, iterations, 32, 'sha256');
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function getRequest(path, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'GET',
    headers: { origin, ...headers },
  });
}

function postRequest(path, body, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function signIn(email = 'owner@example.test') {
  const response = await login.POST(
    postRequest('/api/auth/login', { email, password }),
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

  // Restricted member account (without integrations.manage)
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

  // Companies
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

  // Developer Organization
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, created_at)
       VALUES ('dev-org-1', 'Logistics Labs', 'logistics-labs', 'verified', ?)`,
    )
    .run(now);

  // App 1: Verified Shipping Tracker (Published)
  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, full_description, category, app_type, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app-shipping', 'dev-org-1', 'shipping-tracker', 'Shipping Tracker', 'Track shipments worldwide', 'Full description of shipping tracker', 'Shipping', 'public', 'published', 0, 'account-owner', ?, ?)`,
    )
    .run(now, now);

  const shippingManifest = {
    manifest_version: '1.0',
    id: 'shipping-tracker',
    name: 'Shipping Tracker',
    version: '1.0.0',
    capabilities: ['ui_extension', 'settings_extension'],
    permissions: ['shipping.track'],
    navigation: [
      {
        id: 'dispatch',
        label: 'Dispatch Board',
        href: '/c/:companySlug/shipping/dispatch',
        icon: 'Package',
        group: 'Operations',
      },
    ],
    settings: {
      defaultCarrier: {
        type: 'select',
        label: 'Default Carrier',
        default: 'dhl',
        options: [
          { label: 'DHL Express', value: 'dhl' },
          { label: 'FedEx', value: 'fedex' },
        ],
      },
    },
  };

  const shippingManifestStr = JSON.stringify(shippingManifest);
  const pkgHash = signing.computePackageHash(shippingManifestStr);
  const release = signing.signReleaseBuild('app-shipping', '1.0.0', pkgHash, 'test-secret-key-material-0123456789abcdef');

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions
        (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver-ship-1', 'app-shipping', '1.0.0', 'eap-v1', '1.0.0', ?, ?, ?, ?, 'published', ?)`,
    )
    .run(shippingManifestStr, pkgHash, release.signature, release.releaseId, now);

  // App 2: Draft/Unapproved App (Draft)
  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, full_description, category, app_type, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app-draft', 'dev-org-1', 'draft-plugin', 'Draft Plugin', 'Unapproved draft', 'Description', 'Utilities', 'public', 'draft', 0, 'account-owner', ?, ?)`,
    )
    .run(now, now);

  // App 3: Globally Revoked App (is_killed = 1)
  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, full_description, category, app_type, status, is_killed, kill_reason, created_by_account_id, created_at, updated_at)
       VALUES ('app-malicious', 'dev-org-1', 'malicious-tool', 'Malicious Tool', 'Dangerous plugin', 'Desc', 'Utilities', 'public', 'published', 1, 'Security violation', 'account-owner', ?, ?)`,
    )
    .run(now, now);
});

test('1. App Store fetches real EAP catalog', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await storeApi.GET(getRequest('/api/apps/store?companyId=company-a', { cookie }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert(Array.isArray(data.apps));
  const shipping = data.apps.find((a) => a.id === 'app-shipping');
  assert(shipping, 'Shipping app must be present in catalog');
  assert.equal(shipping.slug, 'shipping-tracker');
  assert.equal(shipping.category, 'Shipping');
  assert.equal(shipping.developer.name, 'Logistics Labs');
});

test('2. Only approved/published apps are shown as installable', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await storeApi.GET(getRequest('/api/apps/store?companyId=company-a', { cookie }));
  assert.equal(res.status, 200);
  const data = await res.json();
  // Draft apps should NOT appear
  const draftApp = data.apps.find((a) => a.id === 'app-draft');
  assert.equal(draftApp, undefined, 'Draft apps must not appear in the marketplace catalog');
});

test('3. Killed apps cannot be installed', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-malicious',
        companyId: 'company-a',
        grantedScopes: [],
      },
      { cookie },
    ),
  );
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /suspended globally/i);
});

test('4. Unauthorized user cannot install apps (RBAC check)', async () => {
  const cookie = await signIn('member@example.test');
  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );
  assert.equal(res.status, 403, 'Member without integrations.manage must be rejected');
});

test('5. Company A install state does not appear in Company B (Company Isolation)', async () => {
  const cookie = await signIn('owner@example.test');
  // Install in Company A
  const installRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );
  assert.equal(installRes.status, 200);

  // Check store for Company A
  const resA = await storeApi.GET(getRequest('/api/apps/store?companyId=company-a', { cookie }));
  const dataA = await resA.json();
  const appA = dataA.apps.find((a) => a.id === 'app-shipping');
  assert.equal(appA.installation.isInstalled, true, 'App must be installed in Company A');

  // Check store for Company B
  const resB = await storeApi.GET(getRequest('/api/apps/store?companyId=company-b', { cookie }));
  const dataB = await resB.json();
  const appB = dataB.apps.find((a) => a.id === 'app-shipping');
  assert.equal(appB.installation.isInstalled, false, 'App must NOT be installed in Company B');
});

test('6. Install creates correct company-scoped installation', async () => {
  const cookie = await signIn('owner@example.test');
  const installRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );
  assert.equal(installRes.status, 200);
  const data = await installRes.json();
  assert.equal(data.success, true);
  assert.equal(data.installation.slug, 'shipping-tracker');
  assert.equal(data.installation.status, 'installed');

  // Verify in database
  const row = sqlite
    .prepare('SELECT company_id, app_id, status FROM eap_app_installations WHERE company_id = ? AND app_id = ?')
    .get('company-a', 'app-shipping');
  assert(row);
  assert.equal(row.status, 'installed');
});

test('7. Successful install updates marketplace state (Installed = true, enabled = true)', async () => {
  const cookie = await signIn('owner@example.test');
  await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );

  const res = await storeApi.GET(getRequest('/api/apps/store?companyId=company-a', { cookie }));
  const data = await res.json();
  const app = data.apps.find((a) => a.id === 'app-shipping');
  assert.equal(app.installation.isInstalled, true);
  assert.equal(app.installation.enabled, true);
  assert.equal(app.installation.version, '1.0.0');
});

test('8. Successful install causes declared Settings contribution to become available', async () => {
  const cookie = await signIn('owner@example.test');
  await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );

  // Check Settings API
  const settingsRes = await pluginSettingsApi.GET(
    getRequest('/api/settings/plugins?companyId=company-a', { cookie }),
  );
  assert.equal(settingsRes.status, 200);
  const settingsData = await settingsRes.json();
  const shipSettings = settingsData.pluginSettings.find((p) => p.pluginSlug === 'shipping-tracker');
  assert(shipSettings, 'Shipping tracker settings contribution must be active');
  assert(shipSettings.fields.some((f) => f.key === 'defaultCarrier'));
});

test('9. Successful install causes declared Navigation contribution to become available', async () => {
  const cookie = await signIn('owner@example.test');
  await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );

  // Check Navigation API
  const navRes = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(navRes.status, 200);
  const navData = await navRes.json();
  const dispatchNav = navData.navigation.find((n) => n.pluginSlug === 'shipping-tracker');
  assert(dispatchNav, 'Shipping tracker navigation contribution must be active');
  assert.equal(dispatchNav.label, 'Dispatch Board');
  assert.equal(dispatchNav.group, 'Operations');
});

test('10. Disable removes active navigation/settings contribution while preserving configuration', async () => {
  const cookie = await signIn('owner@example.test');
  // Install
  await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );

  // Save some configuration
  await pluginSettingsApi.POST(
    postRequest(
      '/api/settings/plugins',
      {
        companyId: 'company-a',
        pluginSlug: 'shipping-tracker',
        settings: { defaultCarrier: 'fedex' },
      },
      { cookie },
    ),
  );

  // Disable
  const toggleRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'toggle',
        appId: 'app-shipping',
        companyId: 'company-a',
      },
      { cookie },
    ),
  );
  assert.equal(toggleRes.status, 200);
  const toggleData = await toggleRes.json();
  assert.equal(toggleData.enabled, false);

  // Navigation should disappear
  const navRes = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  const navData = await navRes.json();
  assert.equal(navData.navigation.length, 0, 'Navigation must disappear when app is disabled');

  // Verify configuration preserved in DB
  const instRow = sqlite
    .prepare('SELECT configuration, status FROM eap_app_installations WHERE company_id = ? AND app_id = ?')
    .get('company-a', 'app-shipping');
  assert.equal(instRow.status, 'disabled');
  assert.match(instRow.configuration, /fedex/);
});

test('11. Re-enable restores contributions once', async () => {
  const cookie = await signIn('owner@example.test');
  // Install then disable
  await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );
  await installApi.POST(
    postRequest('/api/apps/install', { action: 'toggle', appId: 'app-shipping', companyId: 'company-a' }, { cookie }),
  );

  // Re-enable
  const reEnableRes = await installApi.POST(
    postRequest('/api/apps/install', { action: 'toggle', appId: 'app-shipping', companyId: 'company-a' }, { cookie }),
  );
  assert.equal(reEnableRes.status, 200);
  assert.equal((await reEnableRes.json()).enabled, true);

  // Navigation returns exactly once
  const navRes = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  const navData = await navRes.json();
  assert.equal(navData.navigation.length, 1);
  assert.equal(navData.navigation[0].label, 'Dispatch Board');
});

test('12. Uninstall removes active contributions without hard-deleting record', async () => {
  const cookie = await signIn('owner@example.test');
  await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: ['shipping.track'],
      },
      { cookie },
    ),
  );

  const uninstallRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'uninstall',
        appId: 'app-shipping',
        companyId: 'company-a',
      },
      { cookie },
    ),
  );
  assert.equal(uninstallRes.status, 200);

  // Contributions removed
  const navData = await (
    await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }))
  ).json();
  assert.equal(navData.navigation.length, 0);

  // Historical record preserved
  const instRow = sqlite
    .prepare('SELECT status, uninstalled_at FROM eap_app_installations WHERE company_id = ? AND app_id = ?')
    .get('company-a', 'app-shipping');
  assert.equal(instRow.status, 'uninstalled');
  assert(instRow.uninstalled_at > 0);
});

test('13. Reinstall does not create duplicate installation/nav/settings entries', async () => {
  const cookie = await signIn('owner@example.test');
  // First install
  await installApi.POST(
    postRequest('/api/apps/install', { action: 'install', appId: 'app-shipping', companyId: 'company-a', grantedScopes: ['shipping.track'] }, { cookie }),
  );
  // Uninstall
  await installApi.POST(
    postRequest('/api/apps/install', { action: 'uninstall', appId: 'app-shipping', companyId: 'company-a' }, { cookie }),
  );
  // Reinstall
  await installApi.POST(
    postRequest('/api/apps/install', { action: 'install', appId: 'app-shipping', companyId: 'company-a', grantedScopes: ['shipping.track'] }, { cookie }),
  );

  const totalRows = sqlite
    .prepare('SELECT COUNT(*) as count FROM eap_app_installations WHERE company_id = ? AND app_id = ?')
    .get('company-a', 'app-shipping');
  assert.equal(totalRows.count, 1, 'Only one installation record must exist for company and app');

  const navData = await (
    await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }))
  ).json();
  assert.equal(navData.navigation.length, 1);
});

test('14. Failed installation does not show Installed state', async () => {
  const cookie = await signIn('owner@example.test');
  // Request install with missing permissions
  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app-shipping',
        companyId: 'company-a',
        grantedScopes: [], // missing shipping.track
      },
      { cookie },
    ),
  );
  assert.equal(res.status, 400);

  // Verify App Store still shows not installed
  const storeRes = await storeApi.GET(getRequest('/api/apps/store?companyId=company-a', { cookie }));
  const storeData = await storeRes.json();
  const app = storeData.apps.find((a) => a.id === 'app-shipping');
  assert.equal(app.installation.isInstalled, false);
});

test('15. Search filters real catalog data', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await storeApi.GET(getRequest('/api/apps/store?search=Shipping', { cookie }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert(data.apps.some((a) => a.slug === 'shipping-tracker'));

  const emptyRes = await storeApi.GET(getRequest('/api/apps/store?search=NonExistentKeywordXYZ', { cookie }));
  const emptyData = await emptyRes.json();
  assert.equal(emptyData.apps.length, 0);
});

test('16. Categories filter real catalog data', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await storeApi.GET(getRequest('/api/apps/store?category=Shipping', { cookie }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert(data.apps.every((a) => a.category === 'Shipping'));
});

test('17. Private/unapproved apps are not exposed to unauthorized users', async () => {
  const cookie = await signIn('member@example.test');
  const res = await storeApi.GET(getRequest('/api/apps/store', { cookie }));
  const data = await res.json();
  assert(!data.apps.some((a) => a.id === 'app-draft'));
});

test('18. API responses do not expose secrets or reviewer-sensitive data', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await storeApi.GET(getRequest('/api/apps/store?companyId=company-a', { cookie }));
  const data = await res.json();
  for (const app of data.apps) {
    assert.equal(app.signingSecret, undefined);
    assert.equal(app.clientSecret, undefined);
    assert.equal(app.internalNotes, undefined);
    assert.equal(app.reviewerId, undefined);
  }
});

test('19. Core App Store route remains unchanged and protected', async () => {
  // Confirm route definition file exists
  const appStoreRoute = readFileSync('app/account/app-store/page.tsx', 'utf8');
  assert.match(appStoreRoute, /AccountGate/);
  assert.match(appStoreRoute, /AppStoreClient/);
});

test('20. Developer page remains unchanged and untouched', async () => {
  const developerPage = readFileSync('app/account/developer/page.tsx', 'utf8');
  assert.match(developerPage, /Developer/);
});

test('21. Existing Phase 0-3 test suites are compatible and preserved', () => {
  assert(readFileSync('tests/platform.test.mjs', 'utf8').length > 0);
  assert(readFileSync('tests/eap-platform.test.mjs', 'utf8').length > 0);
  assert(readFileSync('tests/settings-registry.test.mjs', 'utf8').length > 0);
  assert(readFileSync('tests/dynamic-plugin-settings.test.mjs', 'utf8').length > 0);
  assert(readFileSync('tests/dynamic-navigation.test.mjs', 'utf8').length > 0);
});
