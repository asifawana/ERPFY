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
const modulesApi = await route('app/api/apps/modules/route.ts');
const installApi = await route('app/api/apps/install/route.ts');
const navApi = await route('app/api/apps/navigation/route.ts');

const origin = 'https://erp.test';
const password = 'a-correct-long-password';

function passwordHash(value) {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(value, salt, iterations, 32, 'sha256');
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
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

  // Restricted member account
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

  // Dev Org & Apps
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, created_at)
       VALUES ('dev-org-1', 'Test Labs', 'test-labs', 'verified', ?)`,
    )
    .run(now);

  const insertApp = sqlite.prepare(
    `INSERT INTO eap_apps
      (id, organization_id, slug, name, short_description, category, status, is_killed, created_by_account_id, created_at, updated_at)
     VALUES (?, 'dev-org-1', ?, ?, ?, 'business', 'published', ?, 'account-owner', ?, ?)`,
  );

  insertApp.run('app-sales', 'erpfy.sales', 'Sales Management', 'Core sales features', 0, now, now);
  insertApp.run('app-pos', 'erpfy.pos', 'Point of Sale', 'Retail POS', 0, now, now);
  insertApp.run('app-accounting', 'erpfy.accounting', 'Accounting & Invoicing', 'Financial management', 0, now, now);
  insertApp.run('app-killed', 'erpfy.risky', 'Risky Module', 'Flagged module', 1, now, now);

  const insertVersion = sqlite.prepare(
    `INSERT INTO eap_app_versions
      (id, app_id, version, protocol, min_platform_version, manifest_json, package_hash, signature, release_id, review_status, created_at)
     VALUES (?, ?, '1.0.0', 'eap-v1', '1.0.0', ?, 'hash-placeholder', 'sig-placeholder', 'rel-placeholder', 'approved', ?)`,
  );

  const salesManifest = JSON.stringify({
    manifestVersion: '1.0.0',
    appId: 'erpfy.sales',
    name: 'Sales Management',
    version: '1.0.0',
    navigation: [
      {
        id: 'sales-orders',
        label: 'Sales Orders',
        href: '/c/:companySlug/sales/orders',
        icon: 'ShoppingCart',
      },
    ],
  });

  const posManifest = JSON.stringify({
    manifestVersion: '1.0.0',
    appId: 'erpfy.pos',
    name: 'Point of Sale',
    version: '1.0.0',
    dependencies: {
      'erpfy.sales': '>=1.0.0',
    },
    navigation: [
      {
        id: 'pos-terminal',
        label: 'POS Register',
        href: '/c/:companySlug/pos/register',
        icon: 'CreditCard',
      },
    ],
  });

  const accountingManifest = JSON.stringify({
    manifestVersion: '1.0.0',
    appId: 'erpfy.accounting',
    name: 'Accounting & Invoicing',
    version: '1.0.0',
    navigation: [
      {
        id: 'chart-of-accounts',
        label: 'Chart of Accounts',
        href: '/c/:companySlug/accounting/accounts',
        icon: 'BookOpen',
      },
    ],
  });

  const killedManifest = JSON.stringify({
    manifestVersion: '1.0.0',
    appId: 'erpfy.risky',
    name: 'Risky Module',
    version: '1.0.0',
    navigation: [],
  });

  insertVersion.run('ver-sales', 'app-sales', salesManifest, now);
  insertVersion.run('ver-pos', 'app-pos', posManifest, now);
  insertVersion.run('ver-accounting', 'app-accounting', accountingManifest, now);
  insertVersion.run('ver-killed', 'app-killed', killedManifest, now);

  // Install sales & pos for company-a
  const insertInstall = sqlite.prepare(
    `INSERT INTO eap_app_installations
      (id, app_id, version_id, company_id, installed_by_account_id, status, installed_at, updated_at)
     VALUES (?, ?, ?, ?, 'account-owner', ?, ?, ?)`,
  );
  insertInstall.run('inst-sales-a', 'app-sales', 'ver-sales', 'company-a', 'installed', now, now);
  insertInstall.run('inst-pos-a', 'app-pos', 'ver-pos', 'company-a', 'installed', now, now);
  insertInstall.run('inst-killed-a', 'app-killed', 'ver-killed', 'company-a', 'disabled', now, now);
});

test('GET /api/apps/modules returns truthful installed & uninstalled modules', async () => {
  const cookie = await signIn();
  const res = await modulesApi.GET(
    new Request(`${origin}/api/apps/modules?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.modules));

  // Verify installed app (Sales)
  const sales = data.modules.find((m) => m.appId === 'erpfy.sales');
  assert.ok(sales, 'Sales should be returned in modules');
  assert.equal(sales.isInstalled, true);
  assert.equal(sales.isActive, true);
  assert.equal(sales.status, 'active');
  assert.equal(sales.canToggle, true);

  // Verify uninstalled app (Accounting)
  const accounting = data.modules.find((m) => m.appId === 'erpfy.accounting');
  assert.ok(accounting, 'Accounting should be returned as uninstalled catalog module');
  assert.equal(accounting.isInstalled, false);
  assert.equal(accounting.isActive, false);
  assert.equal(accounting.status, 'not_installed');
  assert.equal(accounting.canToggle, false);

  // Verify killed app
  const killed = data.modules.find((m) => m.appId === 'erpfy.risky');
  assert.ok(killed, 'Killed app should be present');
  assert.equal(killed.isKilled, true);
  assert.equal(killed.canToggle, false);
  assert.equal(killed.status, 'killed');
});

test('POST /api/apps/install disable action toggles status and hides from navigation', async () => {
  const cookie = await signIn();

  // Initially, POS navigation is present
  const navResBefore = await navApi.GET(
    new Request(`${origin}/api/apps/navigation?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const navBefore = await navResBefore.json();
  const posItemBefore = navBefore.navigation.find((i) => i.id === 'plugin:erpfy.pos:pos-terminal');
  assert.ok(posItemBefore, 'POS item should be visible when active');

  // Disable POS
  const disableRes = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable', appId: 'erpfy.pos', companyId: 'company-a' }),
    }),
  );
  assert.equal(disableRes.status, 200);
  const disableData = await disableRes.json();
  assert.equal(disableData.success, true);
  assert.equal(disableData.installation.status, 'disabled');

  // Verify status in GET /api/apps/modules
  const modRes = await modulesApi.GET(
    new Request(`${origin}/api/apps/modules?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const modData = await modRes.json();
  const posMod = modData.modules.find((m) => m.appId === 'erpfy.pos');
  assert.equal(posMod.isActive, false);
  assert.equal(posMod.status, 'disabled');
  assert.equal(posMod.canToggle, true);

  // Verify POS disappeared from GET /api/apps/navigation
  const navResAfter = await navApi.GET(
    new Request(`${origin}/api/apps/navigation?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const navAfter = await navResAfter.json();
  const posItemAfter = navAfter.navigation.find((i) => i.id === 'plugin:erpfy.pos:pos-terminal');
  assert.equal(posItemAfter, undefined, 'Disabled app must disappear from navigation');
});

test('POST /api/apps/install enable action restores app in navigation', async () => {
  const cookie = await signIn();

  // First disable POS
  await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable', appId: 'erpfy.pos', companyId: 'company-a' }),
    }),
  );

  // Now enable POS
  const enableRes = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'enable', appId: 'erpfy.pos', companyId: 'company-a' }),
    }),
  );
  assert.equal(enableRes.status, 200);
  const enableData = await enableRes.json();
  assert.equal(enableData.success, true);
  assert.equal(enableData.installation.status, 'installed');

  // Verify POS reappeared in navigation
  const navRes = await navApi.GET(
    new Request(`${origin}/api/apps/navigation?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const navData = await navRes.json();
  const posItem = navData.navigation.find((i) => i.id === 'plugin:erpfy.pos:pos-terminal');
  assert.ok(posItem, 'Enabled app must reappear in navigation');
});

test('Dependency protection: cannot disable Sales while POS is active', async () => {
  const cookie = await signIn();

  // Try to disable Sales while POS (which depends on Sales) is active
  const res = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable', appId: 'erpfy.sales', companyId: 'company-a' }),
    }),
  );
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.ok(data.error.includes('Cannot disable'));
  assert.ok(data.error.includes('Point of Sale'));
});

test('Killswitch protection: cannot enable killed application', async () => {
  const cookie = await signIn();

  const res = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'enable', appId: 'erpfy.risky', companyId: 'company-a' }),
    }),
  );
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.ok(data.error.includes('suspended by platform administrators'));
});

test('Enable All and Disable All bulk operations', async () => {
  const cookie = await signIn();

  // Disable All
  const disableAllRes = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable-all', companyId: 'company-a' }),
    }),
  );
  assert.equal(disableAllRes.status, 200);

  // Both Sales and POS should now be disabled
  const navEmptyRes = await navApi.GET(
    new Request(`${origin}/api/apps/navigation?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const navEmpty = await navEmptyRes.json();
  assert.equal(navEmpty.navigation.length, 0);

  // Enable All
  const enableAllRes = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'enable-all', companyId: 'company-a' }),
    }),
  );
  assert.equal(enableAllRes.status, 200);

  // Sales and POS should now be restored (killed app remains untouched)
  const navRestoredRes = await navApi.GET(
    new Request(`${origin}/api/apps/navigation?companyId=company-a`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const navRestored = await navRestoredRes.json();
  assert.equal(navRestored.navigation.length, 2);
});

test('Company isolation: changes in Company A do not affect Company B', async () => {
  const cookie = await signIn();
  const now = Date.now();

  // Install Sales in Company B as active
  sqlite
    .prepare(
      `INSERT INTO eap_app_installations
        (id, app_id, version_id, company_id, installed_by_account_id, status, installed_at, updated_at)
       VALUES ('inst-sales-b', 'app-sales', 'ver-sales', 'company-b', 'account-owner', 'installed', ?, ?)`,
    )
    .run(now, now);

  // Disable Sales in Company A (first disable POS)
  await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable', appId: 'erpfy.pos', companyId: 'company-a' }),
    }),
  );
  await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable', appId: 'erpfy.sales', companyId: 'company-a' }),
    }),
  );

  // Check Company B navigation: Sales should still be active
  const navBRes = await navApi.GET(
    new Request(`${origin}/api/apps/navigation?companyId=company-b`, {
      method: 'GET',
      headers: { origin, cookie },
    }),
  );
  const navB = await navBRes.json();
  const salesB = navB.navigation.find((i) => i.id === 'plugin:erpfy.sales:sales-orders');
  assert.ok(salesB, 'Company B navigation must retain Sales');
});

test('RBAC enforcement: member without permissions cannot manage apps', async () => {
  const memberCookie = await signIn('member@example.test');

  const res = await installApi.POST(
    new Request(`${origin}/api/apps/install`, {
      method: 'POST',
      headers: { origin, cookie: memberCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'disable', appId: 'erpfy.pos', companyId: 'company-a' }),
    }),
  );
  assert.equal(res.status, 403);
});

test('UI Sentinels & Backward Compatibility: verified in source files', () => {
  const systemSettingsCode = readFileSync('components/account/SystemSettingsPanel.tsx', 'utf8');
  assert.ok(systemSettingsCode.includes('MODULE_APP_SLUGS'), 'MODULE_APP_SLUGS preserved');
  assert.ok(systemSettingsCode.includes('stockyModules'), 'stockyModules preserved');
  assert.ok(systemSettingsCode.includes('Not Installed'), 'Not Installed text preserved');
  assert.ok(systemSettingsCode.includes('View in App Store'), 'View in App Store text preserved');
  assert.ok(systemSettingsCode.includes('Apps & Modules'), 'Apps & Modules heading preserved');
  assert.ok(systemSettingsCode.includes('Sidebar Menu'), 'Sidebar Menu heading preserved');

  const accountSettingsCode = readFileSync('components/account/AccountSettingsForm.tsx', 'utf8');
  assert.ok(accountSettingsCode.includes('CORE_SETTINGS_GROUPS'), 'CORE_SETTINGS_GROUPS preserved');
  assert.ok(accountSettingsCode.includes('Apps & Modules'), 'Apps & Modules tab preserved');
  assert.ok(accountSettingsCode.includes('installedSlugs'), 'installedSlugs preserved');
  assert.ok(accountSettingsCode.includes('companyId={company?.id}'), 'companyId passed to SystemSettingsPanel');

  const accountShellCode = readFileSync('components/account/AccountShell.tsx', 'utf8');
  assert.ok(accountShellCode.includes('sidebarMenuOrder'), 'AccountShell respects sidebarMenuOrder');
});
