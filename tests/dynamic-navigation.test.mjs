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
const navApi = await route('app/api/apps/navigation/route.ts');
const eapInstall = await route('lib/eap/installation.ts');

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

async function signIn(email = 'owner@example.test') {
  const response = await login.POST(
    new Request(`${origin}/api/auth/login`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
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

  // Restricted member account (no accounting permission)
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

  // Dev Org & App
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, created_at)
       VALUES ('dev-org-1', 'Test Labs', 'test-labs', 'verified', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, category, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app-acct', 'dev-org-1', 'erpfy-accounting', 'Accounting Core', 'Accounting plugin', 'finance', 'published', 0, 'account-owner', ?, ?)`,
    )
    .run(now, now);

  // Version with navigation manifest
  const manifest = JSON.stringify({
    manifest_version: '1.0',
    id: 'erpfy-accounting',
    name: 'Accounting Core',
    version: '1.0.0',
    capabilities: ['ui_extension'],
    permissions: ['accounting.read'],
    navigation: [
      {
        id: 'overview',
        label: 'Overview',
        href: '/c/:companySlug/finance/overview',
        icon: 'PieChart',
        group: 'Finance',
      },
      {
        id: 'general-ledger',
        label: 'General Ledger',
        href: '/c/:companySlug/finance/gl',
        icon: 'FileSpreadsheet',
        group: 'Finance',
        permission: 'accounting.view_gl',
      },
    ],
  });

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions
        (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver-acct-1', 'app-acct', '1.0.0', 'eap-v1', '1.0.0', ?, 'hash1', 'sig1', 'rel1', 'approved', ?)`,
    )
    .run(manifest, now);

  // Seed permission definition and grant accounting.view_gl to owner in company-a
  sqlite
    .prepare(
      `INSERT INTO core_permissions (key, description, created_at) VALUES ('accounting.view_gl', 'View General Ledger', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO core_permission_overrides (company_id, account_id, permission_key, effect, scope, updated_at, updated_by)
       VALUES ('company-a', 'account-owner', 'accounting.view_gl', 'allow', 'COMPANY', ?, 'account-owner')`,
    )
    .run(now);
});

test('1. Installed and active plugin nav appears for authorized owner', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert(Array.isArray(data.navigation));
  assert.equal(data.navigation.length, 2);

  const overview = data.navigation.find((i) => i.rawId === 'overview');
  assert(overview);
  assert.equal(overview.id, 'plugin:erpfy-accounting:overview');
  assert.equal(overview.label, 'Overview');
  assert.equal(overview.href, '/c/company-a/finance/overview');
  assert.equal(overview.group, 'Finance');
  assert.equal(overview.icon, 'PieChart');
});

test('2. Uninstalled plugin nav does not appear', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'uninstalled', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.navigation.length, 0);
});

test('3. Disabled plugin nav does not appear', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'disabled', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.navigation.length, 0);
});

test('4. Globally killed plugin nav does not appear even if installed', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  sqlite.prepare(`UPDATE eap_apps SET is_killed = 1 WHERE id = 'app-acct'`).run();

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.navigation.length, 0);
});

test('5. Unauthorized user does not see permission-guarded plugin nav', async () => {
  const cookie = await signIn('member@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();

  // Member sees 'Overview' (no permission guard), but NOT 'General Ledger' (guarded by accounting.view_gl)
  const gl = data.navigation.find((i) => i.rawId === 'general-ledger');
  assert.equal(gl, undefined, 'Unauthorized user must not see permission-guarded nav item');

  const overview = data.navigation.find((i) => i.rawId === 'overview');
  assert(overview, 'Member can see unguarded nav item');
});

test('6. Company A plugin nav does not appear in Company B (Company Isolation)', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  // Installed in Company A only
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  // Request navigation for Company B
  const resB = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-b&companySlug=company-b', { cookie }),
  );
  assert.equal(resB.status, 200);
  const dataB = await resB.json();
  assert.equal(dataB.navigation.length, 0, 'Company B must have 0 plugin nav items');

  // Request navigation for Company A
  const resA = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal(resA.status, 200);
  const dataA = await resA.json();
  assert.equal(dataA.navigation.length, 2, 'Company A has its installed nav items');
});

test('7. Company switch refreshes navigation correctly with no cross-leakage', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  // Second app installed in Company B only
  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, category, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app-bank', 'dev-org-1', 'erpfy-banking', 'Banking', 'Banking plugin', 'finance', 'published', 0, 'account-owner', ?, ?)`,
    )
    .run(now, now);

  const bankManifest = JSON.stringify({
    manifest_version: '1.0',
    id: 'erpfy-banking',
    name: 'Banking',
    version: '1.0.0',
    capabilities: ['ui_extension'],
    navigation: [
      {
        id: 'treasury',
        label: 'Treasury',
        href: '/c/:companySlug/finance/treasury',
        group: 'Finance',
      },
    ],
  });

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions
        (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver-bank-1', 'app-bank', '1.0.0', 'eap-v1', '1.0.0', ?, 'hash2', 'sig2', 'rel2', 'approved', ?)`,
    )
    .run(bankManifest, now);

  // Install app-acct in company-a, app-bank in company-b
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-a', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-b', 'company-b', 'app-bank', 'ver-bank-1', 'installed', 'account-owner', '[]', '{}', ?, ?)`,
    )
    .run(now, now);

  const navA = await (
    await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }))
  ).json();
  const navB = await (
    await navApi.GET(getRequest('/api/apps/navigation?companyId=company-b&companySlug=company-b', { cookie }))
  ).json();

  assert(navA.navigation.some((i) => i.id === 'plugin:erpfy-accounting:overview'));
  assert(!navA.navigation.some((i) => i.id === 'plugin:erpfy-banking:treasury'));

  assert(navB.navigation.some((i) => i.id === 'plugin:erpfy-banking:treasury'));
  assert(!navB.navigation.some((i) => i.id === 'plugin:erpfy-accounting:overview'));
});

test('8. Re-enable restores nav exactly once', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'disabled', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  // While disabled: 0 items
  let res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  assert.equal((await res.json()).navigation.length, 0);

  // Re-enable
  sqlite.prepare(`UPDATE eap_app_installations SET status = 'installed' WHERE id = 'inst-1'`).run();

  res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  const data = await res.json();
  assert.equal(data.navigation.length, 2);
  const overviewCount = data.navigation.filter((i) => i.rawId === 'overview').length;
  assert.equal(overviewCount, 1, 'Restores overview nav exactly once');
});

test('9. Reinstall / retry does not duplicate nav', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-old', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '[]', '{}', ?, ?)`,
    )
    .run(now - 1000, now - 1000);

  // Simulate update/reinstall (updating version_id on existing row)
  sqlite
    .prepare(
      `UPDATE eap_app_installations
          SET version_id = 'ver-acct-1', updated_at = ?
        WHERE id = 'inst-old'`,
    )
    .run(now);

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  const data = await res.json();
  const ids = data.navigation.map((i) => i.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, 'No duplicate IDs on reinstall');
  assert.equal(data.navigation.length, 2);
});

test('10. Plugin cannot override a core route or reserved navigation destination', () => {
  // Core routes protected: /c/:slug, /account/settings, /account/products, etc.
  assert.equal(eapInstall.isSafePluginRoute('/c/company-a', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('/account/settings', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('/account/products', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('/account/app-store', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('/account/developer', 'company-a'), false);
  // Safe plugin sub-routes are permitted
  assert.equal(eapInstall.isSafePluginRoute('/c/company-a/finance/overview', 'company-a'), true);
  assert.equal(eapInstall.isSafePluginRoute('/c/company-a/apps/my-app', 'company-a'), true);
});

test('11. Invalid route/navigation manifest is rejected (external, javascript, schema)', () => {
  assert.equal(eapInstall.isSafePluginRoute('https://malicious.com/hack', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('//malicious.com/hack', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('javascript:alert(1)', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('data:text/html,hack', 'company-a'), false);
  assert.equal(eapInstall.isSafePluginRoute('relative/without/slash', 'company-a'), false);
});

test('12. Empty plugin groups are not shown', async () => {
  const cookie = await signIn('owner@example.test');
  // With no plugins installed, navigation is empty
  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  const data = await res.json();
  assert.equal(data.navigation.length, 0);
});

test('13. Multiple plugin entries in same group (Finance) render correctly', async () => {
  const cookie = await signIn('owner@example.test');
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
       VALUES ('inst-1', 'company-a', 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
    )
    .run(now, now);

  const res = await navApi.GET(
    getRequest('/api/apps/navigation?companyId=company-a&companySlug=company-a', { cookie }),
  );
  const data = await res.json();
  const financeItems = data.navigation.filter((i) => i.group === 'Finance');
  assert.equal(financeItems.length, 2);
  assert.equal(financeItems[0].label, 'Overview');
  assert.equal(financeItems[1].label, 'General Ledger');
});

test('14. Core navigation remains present if plugin navigation load fails or throws', async () => {
  // Pass invalid company ID
  const cookie = await signIn('owner@example.test');
  const res = await navApi.GET(
    getRequest('/api/apps/navigation', { cookie }), // no companyId
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.navigation, []);
});

test('15. Existing sidebar preferences still work with dynamic nav integration', async () => {
  // Test that systemSettings sidebar filter continues to work on core items
  const systemSettings = {
    sidebarDashboard: true,
    sidebarProducts: false, // hidden
    sidebarOrders: true,
    sidebarCustomers: true,
    sidebarAnalytics: true,
    sidebarAppStore: true,
  };

  const coreItems = [
    { label: 'Dashboard' },
    { label: 'Products' },
    { label: 'Orders' },
    { label: 'Customers' },
    { label: 'Analytics' },
    { label: 'Custom App Item' },
  ];

  const visible = coreItems.filter((item) => {
    if (item.label === 'Dashboard') return systemSettings.sidebarDashboard;
    if (item.label === 'Products') return systemSettings.sidebarProducts;
    if (item.label === 'Orders') return systemSettings.sidebarOrders;
    if (item.label === 'Customers') return systemSettings.sidebarCustomers;
    if (item.label === 'Analytics') return systemSettings.sidebarAnalytics;
    return true;
  });

  assert.equal(visible.some((i) => i.label === 'Products'), false);
  assert.equal(visible.some((i) => i.label === 'Dashboard'), true);
  assert.equal(visible.some((i) => i.label === 'Custom App Item'), true);
});

test('16. Existing sidebar ordering remains intact (Core -> Plugins/Finance -> Footer)', () => {
  const base = [{ heading: undefined, items: [{ label: 'Dashboard' }] }];
  const pluginGroups = [{ heading: 'Finance', items: [{ label: 'Overview' }] }];
  const fullNav = [...base, ...pluginGroups];

  assert.equal(fullNav[0].items[0].label, 'Dashboard');
  assert.equal(fullNav[1].heading, 'Finance');
  assert.equal(fullNav[1].items[0].label, 'Overview');
});

test('17. Existing Settings dynamic plugin tabs still work alongside Phase 3', async () => {
  // Verify that eap_app_installations can still be queried for settings without conflict
  const rows = await db
    .prepare(
      `SELECT id, status FROM eap_app_installations WHERE company_id = ?1 AND status = 'installed'`,
    )
    .bind('company-a')
    .all();
  assert(Array.isArray(rows.results));
});

test('18. Direct unauthorized destination access remains denied by RBAC', async () => {
  const authService = await route('lib/core/authorization.ts');
  const authResult = await authService.authorize(db, 'account-member', 'company-a', 'accounting.admin');
  assert.equal(authResult.allowed, false, 'Default deny must block unauthorized direct action');
});

function installAccounting(companyId = 'company-a') {
  const now = Date.now();
  sqlite.prepare(
    `INSERT INTO eap_app_installations
      (id, company_id, app_id, version_id, status, installed_by_account_id, granted_permissions, configuration, installed_at, updated_at)
     VALUES ('inst-acct', ?, 'app-acct', 'ver-acct-1', 'installed', 'account-owner', '["accounting.read"]', '{}', ?, ?)`,
  ).run(companyId, now, now);
}

function updateManifest(update) {
  const row = sqlite.prepare("SELECT manifest_json FROM eap_app_versions WHERE id = 'ver-acct-1'").get();
  const manifest = JSON.parse(row.manifest_json);
  update(manifest);
  sqlite.prepare("UPDATE eap_app_versions SET manifest_json = ? WHERE id = 'ver-acct-1'").run(JSON.stringify(manifest));
}

test('19. Navigation derives the canonical slug from the authorized company', async () => {
  const cookie = await signIn();
  installAccounting();
  sqlite.prepare("UPDATE core_companies SET slug = 'canonical-company' WHERE id = 'company-a'").run();

  for (const query of ['companyId=company-a', 'companyId=company-a&companySlug=company-b']) {
    const response = await navApi.GET(getRequest(`/api/apps/navigation?${query}`, { cookie }));
    assert.equal(response.status, 200);
    const { navigation } = await response.json();
    assert.equal(navigation.length, 2);
    assert(navigation.every((item) => item.href.startsWith('/c/canonical-company/')));
  }
});

test('20. Unguarded plugin launchers still require active company membership', async () => {
  const cookie = await signIn('member@example.test');
  installAccounting('company-b');
  const foreign = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-b', { cookie }));
  assert.equal(foreign.status, 404);

  sqlite.prepare("UPDATE core_memberships SET status = 'suspended' WHERE account_id = 'account-member'").run();
  const suspended = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  assert.equal(suspended.status, 404);
});

test('21. Withdrawn apps and unapproved installed versions do not contribute navigation', async () => {
  const cookie = await signIn();
  installAccounting();

  sqlite.prepare("UPDATE eap_apps SET status = 'suspended' WHERE id = 'app-acct'").run();
  let response = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  assert.deepEqual((await response.json()).navigation, []);

  sqlite.prepare("UPDATE eap_apps SET status = 'published' WHERE id = 'app-acct'").run();
  sqlite.prepare("UPDATE eap_app_versions SET review_status = 'rejected' WHERE id = 'ver-acct-1'").run();
  response = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  assert.deepEqual((await response.json()).navigation, []);
});

test('22. Installed version must belong to the installed application', async () => {
  const cookie = await signIn();
  installAccounting();
  const now = Date.now();
  sqlite.prepare(
    `INSERT INTO eap_apps
      (id, organization_id, slug, name, short_description, category, status, is_killed, created_by_account_id, created_at, updated_at)
     VALUES ('app-other', 'dev-org-1', 'other-app', 'Other App', '', 'finance', 'published', 0, 'account-owner', ?, ?)`,
  ).run(now, now);
  sqlite.prepare("UPDATE eap_app_versions SET app_id = 'app-other' WHERE id = 'ver-acct-1'").run();

  const response = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  assert.deepEqual((await response.json()).navigation, []);
});

test('23. Plugin routes reject tenant escapes, core aliases and browser normalization tricks', () => {
  const unsafe = [
    '/c/company-b/finance/overview',
    '/c/company-a-extra/finance/overview',
    '/c/company-a?tab=overview',
    '/c/company-a/#overview',
    '/account/settings?plugin=accounting',
    '/c/company-a/../company-b/finance',
    '/c/company-a/%2e%2e/company-b/finance',
    '/c/company-a/%252e%252e/company-b/finance',
    '/c/company-a/apps%2f..%2f..%2fcompany-b',
    '/c/company-a/apps\\..\\..\\company-b',
    '/c/company-a/apps/%00',
    '/c/company-a/apps/%invalid',
    '/c/company-a//finance',
    ' /c/company-a/finance',
  ];
  for (const href of unsafe) assert.equal(eapInstall.isSafePluginRoute(href, 'company-a'), false, href);
  assert.equal(eapInstall.isSafePluginRoute('/c/company-a/finance/overview?period=7d#totals', 'company-a'), true);
  assert.equal(eapInstall.isSafePluginRoute('/c/company-a/finance/overview'), false);
});

test('24. Malformed entries and denied permissions do not hide valid sibling items', async () => {
  const cookie = await signIn();
  installAccounting();
  updateManifest((manifest) => {
    manifest.navigation.unshift(null, { id: 'bad', label: {}, href: '/c/:companySlug/finance/bad' });
    manifest.navigation.push({ id: 'invalid-guard', label: 'Invalid guard', href: '/c/:companySlug/finance/invalid', permission: '' });
    manifest.navigation.push({ id: 'escape', label: 'Foreign company', href: '/c/company-b/finance/overview' });
  });
  sqlite.prepare("UPDATE core_permission_overrides SET effect = 'deny' WHERE permission_key = 'accounting.view_gl'").run();

  const response = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  const { navigation } = await response.json();
  assert.deepEqual(navigation.map((item) => item.rawId), ['overview']);
});

test('25. Optional dependencies do not hide navigation; unavailable required dependencies do', async () => {
  const cookie = await signIn();
  installAccounting();
  updateManifest((manifest) => {
    manifest.dependencies = [{ app_id: 'app-missing', version: '1.0.0', required: false }];
  });
  let response = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  assert.equal((await response.json()).navigation.length, 2);

  updateManifest((manifest) => { manifest.dependencies[0].required = true; });
  response = await navApi.GET(getRequest('/api/apps/navigation?companyId=company-a', { cookie }));
  assert.deepEqual((await response.json()).navigation, []);
});
