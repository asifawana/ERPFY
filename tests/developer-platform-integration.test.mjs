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
globalThis.__erpTestSecretKey = 'test-platform-master-secret-key-1234567890';

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
const profileApi = await route('app/api/developer/profile/route.ts');
const appsApi = await route('app/api/developer/apps/route.ts');
const versionsApi = await route('app/api/developer/apps/[appId]/versions/route.ts');
const submitApi = await route('app/api/developer/apps/[appId]/submit/route.ts');
const credentialsApi = await route('app/api/developer/credentials/route.ts');
const adminReviewApi = await route('app/api/admin/apps/review/route.ts');
const storeApi = await route('app/api/apps/store/route.ts');

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

function deleteRequest(path, body, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'DELETE',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function signIn(email = 'dev1@example.test') {
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
  const hash = passwordHash(password);

  // Accounts
  const accounts = [
    { id: 'acc_dev1', email: 'dev1@example.test', name: 'Dev Alice' },
    { id: 'acc_dev2', email: 'dev2@example.test', name: 'Dev Bob' },
    { id: 'acc_ordinary', email: 'ordinary@example.test', name: 'Cashier Carl' },
    { id: 'acc_admin', email: 'admin@example.test', name: 'Platform Admin' },
  ];

  for (const acc of accounts) {
    sqlite
      .prepare(
        `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
         VALUES (?, ?, ?, 'Asia/Karachi', ?, ?, ?)`,
      )
      .run(acc.id, acc.email, acc.name, now, now, now);

    sqlite
      .prepare(
        `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
         VALUES (?, ?, ?, 0, 0)`,
      )
      .run(acc.id, hash, now);
  }

  // Companies
  const insertCompany = sqlite.prepare(
    `INSERT INTO core_companies
      (id, name, slug, country_code, currency, timezone, language, sector_slug,
       industry_slug, business_models, employee_band, plan, state, trial_ends_at,
       onboarding_state, onboarding_steps, created_at, created_by, request_key)
     VALUES (?, ?, ?, ?, ?, ?, 'en', '', '', '[]', '', 'starter', 'trial', ?,
             'completed', '{}', ?, ?, ?)`,
  );
  insertCompany.run('comp_1', 'Company One', 'company-one', 'PK', 'PKR', 'Asia/Karachi', now + 86400000, now, 'acc_ordinary', 'comp_1');

  // Membership
  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES ('comp_1', 'acc_ordinary', 'member', 'active', '', ?)`,
    )
    .run(now);

  // Seed dev1 organization & profile
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, website, support_email, created_at)
       VALUES ('org_alice', 'Alice Labs', 'alice-labs', 'verified', 'https://alice.dev', 'alice@alice.dev', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_profiles (id, account_id, organization_id, display_name, bio, created_at)
       VALUES ('dev_alice', 'acc_dev1', 'org_alice', 'Alice Developer', 'Senior Plugin Architect', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_members (organization_id, account_id, role, created_at)
       VALUES ('org_alice', 'acc_dev1', 'owner', ?)`,
    )
    .run(now);
});

test('1. Authorized developer can load own developer profile', async () => {
  const cookie = await signIn('dev1@example.test');
  const res = await profileApi.GET(getRequest('/api/developer/profile', { cookie }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.registered, true);
  assert.equal(data.profile.name, 'Alice Labs');
  assert.equal(data.profile.slug, 'alice-labs');
  assert.equal(data.profile.verified, true);
  assert.equal(data.profile.contactEmail, 'alice@alice.dev');
  assert.equal(data.profile.organization.id, 'org_alice');
});

test('2. Unauthorized ordinary user without developer registration has registered = false and cannot create apps', async () => {
  const cookie = await signIn('ordinary@example.test');
  const profRes = await profileApi.GET(getRequest('/api/developer/profile', { cookie }));
  const profData = await profRes.json();
  assert.equal(profData.registered, false);
  assert.equal(profData.profile, null);

  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Unauthorized App', category: 'Sales', shortDescription: 'Test' },
      { cookie },
    ),
  );
  assert.equal(appRes.status, 400);
  const appData = await appRes.json();
  assert.match(appData.error, /You must register a developer account/);
});

test('3. Developer organization data is isolated between developers', async () => {
  const cookieBob = await signIn('dev2@example.test');
  // Bob is not yet registered
  const bobProf = await profileApi.GET(getRequest('/api/developer/profile', { cookie: cookieBob }));
  const bobData = await bobProf.json();
  assert.equal(bobData.registered, false);

  // Bob registers
  const regRes = await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Bob Works', contactEmail: 'bob@bob.dev', websiteUrl: 'https://bob.dev' },
      { cookie: cookieBob },
    ),
  );
  assert.equal(regRes.status, 200);
  const regData = await regRes.json();
  assert.equal(regData.profile.name, 'Bob Works');
  assert.equal(regData.profile.slug, 'bob-works');
  assert.notEqual(regData.profile.organization.id, 'org_alice');
});

test('4. Developer sees only own/manageable apps', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const cookieBob = await signIn('dev2@example.test');

  // Register Bob
  await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Bob Works', contactEmail: 'bob@bob.dev' },
      { cookie: cookieBob },
    ),
  );

  // Alice creates app
  const aRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Alice Dispatcher', category: 'Shipping', tagline: 'Fast shipping' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(aRes.status, 200);

  // Bob creates app
  const bRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Bob Invoicing', category: 'Accounting', tagline: 'Quick invoice' },
      { cookie: cookieBob },
    ),
  );
  assert.equal(bRes.status, 200);

  // Alice queries apps
  const aListRes = await appsApi.GET(getRequest('/api/developer/apps', { cookie: cookieAlice }));
  const aListData = await aListRes.json();
  assert.equal(aListData.apps.length, 1);
  assert.equal(aListData.apps[0].name, 'Alice Dispatcher');

  // Bob queries apps
  const bListRes = await appsApi.GET(getRequest('/api/developer/apps', { cookie: cookieBob }));
  const bListData = await bListRes.json();
  assert.equal(bListData.apps.length, 1);
  assert.equal(bListData.apps[0].name, 'Bob Invoicing');
});

test('5. App draft creation uses authenticated publisher identity', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const res = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Inventory Sync', category: 'Inventory', tagline: 'Sync multi-warehouse stock' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.app.name, 'Inventory Sync');
  assert.equal(data.app.status, 'draft');

  // Check database row
  const row = sqlite.prepare('SELECT organization_id, created_by_account_id FROM eap_apps WHERE id = ?').get(data.app.id);
  assert.equal(row.organization_id, 'org_alice');
  assert.equal(row.created_by_account_id, 'acc_dev1');
});

test('6. Reserved namespaces and duplicate slugs are rejected', async () => {
  const cookieAlice = await signIn('dev1@example.test');

  // 1. Reserved prefix erpfy.
  const r1 = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Core System', slug: 'erpfy-finance', category: 'Finance', tagline: 'Fake core' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(r1.status, 400);
  assert.match((await r1.json()).error, /reserved core platform namespace/);

  // 2. Reserved slug
  const r2 = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Developer Tool', slug: 'developer', category: 'Tools', tagline: 'Spoof' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(r2.status, 400);
  assert.match((await r2.json()).error, /reserved core platform namespace/);

  // 3. Create valid app
  const ok = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Valid Plugin', slug: 'valid-plugin', category: 'Sales', tagline: 'Good' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(ok.status, 200);

  // 4. Duplicate slug
  const dup = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Duplicate Plugin', slug: 'valid-plugin', category: 'Sales', tagline: 'Dup' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(dup.status, 400);
  assert.match((await dup.json()).error, /already exists/);
});

test('7. Invalid manifest upload is rejected', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Test App', slug: 'test-app', category: 'Sales', tagline: 'Test' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  // Invalid protocol
  const badProtoRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v2',
          app_id: app.id,
          name: 'Test App',
          slug: 'test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(badProtoRes.status, 400);
  assert.match((await badProtoRes.json()).error, /protocol must be 'eap-v1'/);
});

test('8. Invalid SemVer is rejected', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'SemVer App', slug: 'semver-app', category: 'Sales', tagline: 'Test' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const badVerRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'SemVer App',
          slug: 'semver-app',
          version: '1.0', // Invalid semver
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(badVerRes.status, 400);
  assert.match((await badVerRes.json()).error, /SemVer string/);
});

test('9. Dangerous package fails automated security scan', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Scanner Test App', slug: 'scanner-test-app', category: 'Sales', tagline: 'Test' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Scanner Test App',
          slug: 'scanner-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeBundle: 'const x = eval("1 + 1"); const cp = require("child_process"); process.exit(1);',
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(uploadRes.status, 200);
  const data = await uploadRes.json();
  assert.equal(data.scan.passed, false);
  assert.equal(data.scan.status, 'FAIL');
  assert.equal(data.version.securityScanStatus, 'failed');
  assert.ok(data.scan.issues.some((i) => i.includes('eval()')));
  assert.ok(data.scan.issues.some((i) => i.includes('child_process')));
});

test('10. Safe package version can be uploaded as draft with scan passed', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Safe Plugin', slug: 'safe-plugin', category: 'Sales', tagline: 'Safe' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Safe Plugin',
          slug: 'safe-plugin',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeBundle: 'export function handleOrder(order) { return { status: "processed", id: order.id }; }',
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(uploadRes.status, 200);
  const data = await uploadRes.json();
  assert.equal(data.scan.passed, true);
  assert.equal(data.scan.status, 'PASS');
  assert.equal(data.version.status, 'draft');
  assert.equal(data.version.securityScanStatus, 'passed');
});

test('11. Upload does not automatically publish or install plugin', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Auto Guard App', slug: 'auto-guard-app', category: 'Sales', tagline: 'Guard' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Auto Guard App',
          slug: 'auto-guard-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  // Check app status is draft
  const appRow = sqlite.prepare('SELECT status, published_at FROM eap_apps WHERE id = ?').get(app.id);
  assert.equal(appRow.status, 'draft');
  assert.equal(appRow.published_at, null);

  // Check installations table is completely 0
  const installCount = sqlite.prepare('SELECT COUNT(*) as count FROM eap_app_installations WHERE app_id = ?').get(app.id);
  assert.equal(installCount.count, 0);

  // Check App Store does not list it
  const storeRes = await storeApi.GET(getRequest('/api/apps/store'));
  const storeData = await storeRes.json();
  assert.ok(!storeData.apps.some((a) => a.id === app.id));
});

test('12. Valid version can be submitted for review', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Review App', slug: 'review-app', category: 'Sales', tagline: 'Review me' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Review App',
          slug: 'review-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await uploadRes.json();

  const submitRes = await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(submitRes.status, 200);
  const submitData = await submitRes.json();
  assert.equal(submitData.status, 'submitted');

  // Verify database record
  const vRow = sqlite.prepare('SELECT review_status FROM eap_app_versions WHERE id = ?').get(version.id);
  assert.equal(vRow.review_status, 'submitted');
  const aRow = sqlite.prepare('SELECT status FROM eap_apps WHERE id = ?').get(app.id);
  assert.equal(aRow.status, 'in_review');
});

test('13. Invalid/failed version cannot be submitted for review', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Bad Review App', slug: 'bad-review-app', category: 'Sales', tagline: 'Bad' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Bad Review App',
          slug: 'bad-review-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeBundle: 'eval("bad code");',
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await uploadRes.json();

  const submitRes = await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(submitRes.status, 400);
  assert.match((await submitRes.json()).error, /Automated security scan failed/);
});

test('14. Review status and messages are correctly returned in version list', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Status Check App', slug: 'status-check-app', category: 'Sales', tagline: 'Status' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Status Check App',
          slug: 'status-check-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await uploadRes.json();

  await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  // Admin requests changes
  const cookieAdmin = await signIn('admin@example.test');
  const reviewRow = sqlite.prepare('SELECT id FROM eap_app_reviews WHERE version_id = ?').get(version.id);
  await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'request_changes', reviewId: reviewRow.id, message: 'Please update documentation' },
      { cookie: cookieAdmin },
    ),
  );

  // Developer inspects versions
  const vListRes = await versionsApi.GET(
    getRequest(`/api/developer/apps/${app.id}/versions`, { cookie: cookieAlice }),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const vListData = await vListRes.json();
  assert.equal(vListData.versions[0].status, 'changes_requested');
  assert.equal(vListData.versions[0].reviewMessages.length, 1);
  assert.equal(vListData.versions[0].reviewMessages[0].message, 'Please update documentation');
});

test('15. Developer cannot self-approve or self-sign releases', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Self Approve Test', slug: 'self-approve-test', category: 'Sales', tagline: 'Self' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Self Approve Test',
          slug: 'self-approve-test',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await uploadRes.json();

  // Version status cannot be set to approved via developer routes
  // Developer calls submit
  await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  // Version remains 'submitted', not 'published' or signed
  const row = sqlite.prepare('SELECT review_status, signature FROM eap_app_versions WHERE id = ?').get(version.id);
  assert.equal(row.review_status, 'submitted');
  assert.equal(Boolean(row.signature), false);
});

test('16. Developer cannot obtain platform signing secret from developer APIs', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const profRes = await profileApi.GET(getRequest('/api/developer/profile', { cookie: cookieAlice }));
  const profText = await profRes.text();
  assert.ok(!profText.includes('test-platform-master-secret-key'));

  const appsRes = await appsApi.GET(getRequest('/api/developer/apps', { cookie: cookieAlice }));
  const appsText = await appsRes.text();
  assert.ok(!appsText.includes('test-platform-master-secret-key'));
});

test('17. Credentials are securely created, displayed once, and never exposed as secret hash', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Cred App', slug: 'cred-app', category: 'Sales', tagline: 'Cred' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  // Generate credential
  const credRes = await credentialsApi.POST(
    postRequest(
      '/api/developer/credentials',
      { appId: app.id, environment: 'development' },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(credRes.status, 200);
  const credData = await credRes.json();
  assert.ok(credData.clientSecret.startsWith('erp_secret_'));
  assert.ok(credData.credential.clientId.startsWith('erp_client_'));

  // Subsequent GET returns clientId but NO clientSecret and NO secretHash
  const listRes = await credentialsApi.GET(getRequest('/api/developer/credentials', { cookie: cookieAlice }));
  const listData = await listRes.json();
  assert.equal(listData.credentials.length, 1);
  assert.equal(listData.credentials[0].clientId, credData.credential.clientId);
  assert.equal(listData.credentials[0].clientSecret, undefined);
  assert.equal(listData.credentials[0].client_secret_hash, undefined);
  assert.equal(listData.credentials[0].secretHash, undefined);
});

test('18. Credential revocation works cleanly and updates audit log', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Revoke App', slug: 'revoke-app', category: 'Sales', tagline: 'Revoke' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const credRes = await credentialsApi.POST(
    postRequest(
      '/api/developer/credentials',
      { appId: app.id },
      { cookie: cookieAlice },
    ),
  );
  const { credential } = await credRes.json();

  // Revoke credential
  const delRes = await credentialsApi.DELETE(
    deleteRequest(
      '/api/developer/credentials',
      { credentialId: credential.id },
      { cookie: cookieAlice },
    ),
  );
  assert.equal(delRes.status, 200);

  // Check status is revoked
  const row = sqlite.prepare('SELECT status FROM eap_dev_credentials WHERE id = ?').get(credential.id);
  assert.equal(row.status, 'revoked');

  // Check audit log
  const auditRow = sqlite.prepare("SELECT action FROM eap_app_audit_logs WHERE action = 'credentials.revoked'").get();
  assert.ok(auditRow);
});

test('19. App and version ownership prevents cross-developer tampering', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const cookieBob = await signIn('dev2@example.test');

  // Register Bob
  await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Bob Works', contactEmail: 'bob@bob.dev' },
      { cookie: cookieBob },
    ),
  );

  // Alice creates app
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Alice Fortress', slug: 'alice-fortress', category: 'Security', tagline: 'Fortress' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  // Bob tries to upload a version to Alice's app
  const bobUploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Alice Fortress',
          slug: 'alice-fortress',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieBob },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(bobUploadRes.status, 400);
  assert.match((await bobUploadRes.json()).error, /unauthorized/i);

  // Bob tries to view Alice's versions
  const bobViewRes = await versionsApi.GET(
    getRequest(`/api/developer/apps/${app.id}/versions`, { cookie: cookieBob }),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(bobViewRes.status, 400);
  assert.match((await bobViewRes.json()).error, /unauthorized/i);
});

test('20. Version history remains intact across multiple uploads', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'History App', slug: 'history-app', category: 'Sales', tagline: 'Hist' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  // Upload v1.0.0
  await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'History App',
          slug: 'history-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        changelog: 'Initial release',
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  // Upload v1.1.0
  await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'History App',
          slug: 'history-app',
          version: '1.1.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        changelog: 'Added analytics hook',
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  const listRes = await versionsApi.GET(
    getRequest(`/api/developer/apps/${app.id}/versions`, { cookie: cookieAlice }),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const listData = await listRes.json();
  assert.equal(listData.versions.length, 2);
  assert.equal(listData.versions[0].version, '1.1.0');
  assert.equal(listData.versions[1].version, '1.0.0');
});

test('21. Same version conflict follows safe immutability policy', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Immutable App', slug: 'immutable-app', category: 'Sales', tagline: 'Safe' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  // First upload v1.0.0
  await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Immutable App',
          slug: 'immutable-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  // Second upload with same v1.0.0 is strictly rejected
  const dupRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Immutable App',
          slug: 'immutable-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(dupRes.status, 400);
  assert.match((await dupRes.json()).error, /already exists/);
});

test('22. Admin review approves, signs, and publishes app to existing App Store', async () => {
  const cookieAlice = await signIn('dev1@example.test');
  const cookieAdmin = await signIn('admin@example.test');

  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Marketplace Bound', slug: 'marketplace-bound', category: 'Sales', tagline: 'Ready for market' },
      { cookie: cookieAlice },
    ),
  );
  const { app } = await appRes.json();

  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Marketplace Bound',
          slug: 'marketplace-bound',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await uploadRes.json();

  await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie: cookieAlice },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  // Admin approves release
  const reviewRow = sqlite.prepare('SELECT id FROM eap_app_reviews WHERE version_id = ?').get(version.id);
  const approveRes = await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'approve', reviewId: reviewRow.id, notes: 'Approved for production' },
      { cookie: cookieAdmin },
    ),
  );
  assert.equal(approveRes.status, 200);

  // Verify App Store now returns this approved app
  const storeRes = await storeApi.GET(getRequest('/api/apps/store'));
  const storeData = await storeRes.json();
  const found = storeData.apps.find((a) => a.id === app.id);
  assert.ok(found);
  assert.equal(found.name, 'Marketplace Bound');
  assert.equal(found.latestVersion.version, '1.0.0');
  assert.equal(found.latestVersion.isSigned, true);
});
