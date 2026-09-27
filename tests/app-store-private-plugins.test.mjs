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

const PLATFORM_SIGNING_KEY = 'test-platform-master-secret-key-private-apps-123';
globalThis.__erpTestDB = db;
globalThis.__erpTestSecretKey = PLATFORM_SIGNING_KEY;

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

const loginApi = await route('app/api/auth/login/route.ts');
const privateUploadApi = await route('app/api/apps/private-upload/route.ts');
const privateInstallApi = await route('app/api/apps/private-install/route.ts');
const storeApi = await route('app/api/apps/store/route.ts');
const installApi = await route('app/api/apps/install/route.ts');

const origin = 'https://erp.test';
const defaultPassword = 'correct-horse-battery-staple-99';

function postRequest(path, body, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function getRequest(path, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'GET',
    headers: { origin, ...headers },
  });
}

function passwordHash(value) {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(value, salt, iterations, 32, 'sha256');
  return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function signIn(email, pwd = defaultPassword) {
  const response = await loginApi.POST(
    postRequest('/api/auth/login', { email, password: pwd }),
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie.split(';')[0];
}

const now = 1700000000000;

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

  // Accounts
  // 1. Company Owner (Alpha Corp)
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES ('acc_owner', 'owner@alpha.test', 'Owner Alpha', 'UTC', ?, ?, ?)`,
    )
    .run(now, now, now);
  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES ('acc_owner', ?, ?, 0, 0)`,
    )
    .run(passwordHash(defaultPassword), now);

  // 2. Regular Member (Alpha Corp) without integrations.manage
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES ('acc_member', 'member@alpha.test', 'Member Alpha', 'UTC', ?, ?, ?)`,
    )
    .run(now, now, now);
  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES ('acc_member', ?, ?, 0, 0)`,
    )
    .run(passwordHash(defaultPassword), now);

  // 3. User of Company Beta
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES ('acc_beta_user', 'user@beta.test', 'Beta User', 'UTC', ?, ?, ?)`,
    )
    .run(now, now, now);
  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES ('acc_beta_user', ?, ?, 0, 0)`,
    )
    .run(passwordHash(defaultPassword), now);

  // Companies
  // Company Alpha
  sqlite
    .prepare(
      `INSERT INTO core_companies
        (id, name, slug, country_code, currency, timezone, language, sector_slug, industry_slug,
         business_models, employee_band, plan, state, trial_ends_at, onboarding_state, onboarding_steps,
         created_at, created_by, request_key)
       VALUES ('cmp_alpha', 'Alpha Corp', 'alpha-corp', 'US', 'USD', 'UTC', 'en', '', '', '[]', '',
               'pro', 'active', ?, 'completed', '{}', ?, 'acc_owner', 'req-alpha')`,
    )
    .run(now + 86400000, now);

  // Company Beta
  sqlite
    .prepare(
      `INSERT INTO core_companies
        (id, name, slug, country_code, currency, timezone, language, sector_slug, industry_slug,
         business_models, employee_band, plan, state, trial_ends_at, onboarding_state, onboarding_steps,
         created_at, created_by, request_key)
       VALUES ('cmp_beta', 'Beta Logistics', 'beta-logistics', 'US', 'USD', 'UTC', 'en', '', '', '[]', '',
               'free', 'active', ?, 'completed', '{}', ?, 'acc_beta_user', 'req-beta')`,
    )
    .run(now + 86400000, now);

  // Memberships
  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES ('cmp_alpha', 'acc_owner', 'owner', 'active', '', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES ('cmp_alpha', 'acc_member', 'member', 'active', '', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES ('cmp_beta', 'acc_beta_user', 'owner', 'active', '', ?)`,
    )
    .run(now);
});

function createValidPackage(appId = 'app_custom_crm', version = '1.0.0') {
  return JSON.stringify({
    manifest: {
      protocol: 'eap-v1',
      platform: 'ERPFY',
      app_id: appId,
      slug: appId.replace(/_/g, '-'),
      name: 'Custom Internal CRM',
      version,
      entrypoint: 'dist/index.js',
      description: 'Private in-house customer relationship plugin for Alpha Corp',
      category: 'CRM',
      publisher: 'Alpha Internal Tools',
      permissions: ['customers.read', 'customers.write'],
      navigation: [
        {
          id: 'nav_crm',
          label: 'Private CRM',
          href: '/account/apps/custom-crm',
          icon: 'Users',
        },
      ],
      settings: {
        api_endpoint: {
          type: 'text',
          label: 'Internal API Endpoint',
          required: true,
          default: 'https://internal.alpha.local/api',
        },
      },
    },
    files: {
      'dist/index.js': 'console.log("Custom CRM Initialized");',
      'README.md': '# Custom CRM Private Plugin',
    },
  });
}

test('1. Private upload: Rejects unauthenticated requests with 401', async () => {
  const req = postRequest('/api/apps/private-upload', {
    companyId: 'cmp_alpha',
    packageContent: createValidPackage(),
  });
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 401);
});

test('2. Private upload: Rejects non-member requests with 403', async () => {
  const betaCookie = await signIn('user@beta.test');
  const req = postRequest(
    '/api/apps/private-upload',
    { companyId: 'cmp_alpha', packageContent: createValidPackage() },
    { cookie: betaCookie },
  );
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /access denied|not found/i);
});

test('3. Private upload: Rejects regular member without upload permissions with 403', async () => {
  const memberCookie = await signIn('member@alpha.test');
  const req = postRequest(
    '/api/apps/private-upload',
    { companyId: 'cmp_alpha', packageContent: createValidPackage() },
    { cookie: memberCookie },
  );
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /permission/i);
});

test('4. Private upload: Rejects invalid platform binding', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const invalidPkg = JSON.stringify({
    manifest: {
      manifest_version: 'eap-v1',
      platform: 'Shopify', // Invalid platform
      app_id: 'app_invalid_platform',
      name: 'Invalid Platform App',
      version: '1.0.0',
      entrypoint: 'dist/index.js',
    },
    files: { 'dist/index.js': 'console.log(1);' },
  });

  const req = postRequest(
    '/api/apps/private-upload',
    { companyId: 'cmp_alpha', packageContent: invalidPkg },
    { cookie: ownerCookie },
  );
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /platform must be/i);
});

test('5. Private upload: Rejects forbidden executable file extensions', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const badExtPkg = JSON.stringify({
    manifest: {
      manifest_version: 'eap-v1',
      platform: 'ERPFY',
      app_id: 'app_bad_ext',
      name: 'Bad Ext App',
      version: '1.0.0',
      entrypoint: 'dist/index.js',
    },
    files: {
      'dist/index.js': 'console.log(1);',
      'scripts/run.exe': 'BINARY_DATA',
    },
  });

  const req = postRequest(
    '/api/apps/private-upload',
    { companyId: 'cmp_alpha', packageContent: badExtPkg },
    { cookie: ownerCookie },
  );
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /forbidden file extension/i);
});

test('6. Private upload: Rejects path traversal attempts in bundle files', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const traversalPkg = JSON.stringify({
    manifest: {
      manifest_version: 'eap-v1',
      platform: 'ERPFY',
      app_id: 'app_traversal',
      name: 'Traversal App',
      version: '1.0.0',
      entrypoint: 'dist/index.js',
    },
    files: {
      '../escape.js': 'console.log("escaped");',
      'dist/index.js': 'console.log(1);',
    },
  });

  const req = postRequest(
    '/api/apps/private-upload',
    { companyId: 'cmp_alpha', packageContent: traversalPkg },
    { cookie: ownerCookie },
  );
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /path traversal/i);
});

test('7. Private upload: Successfully inspects and validates a clean package bundle without executing code', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const validPkg = createValidPackage();

  const req = postRequest(
    '/api/apps/private-upload',
    { companyId: 'cmp_alpha', packageContent: validPkg },
    { cookie: ownerCookie },
  );
  const res = await privateUploadApi.POST(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.validation);
  assert.equal(data.validation.name, 'Custom Internal CRM');
  assert.equal(data.validation.version, '1.0.0');
  assert.equal(data.validation.appId, 'app_custom_crm');
  assert.equal(data.validation.category, 'CRM');
  assert.equal(data.validation.platform, 'ERPFY');
  assert.equal(data.validation.visibility, 'Private');
  assert.equal(data.validation.securityStatus, 'PASS');
  assert.ok(data.validation.packageHash);
  assert.deepEqual(data.validation.permissions, ['customers.read', 'customers.write']);
  assert.equal(data.validation.navigation.length, 1);
  assert.equal(data.validation.navigation[0].label, 'Private CRM');
  assert.equal(data.validation.settings.length, 1);
  assert.equal(data.validation.settings[0], 'api_endpoint');
});

test('8. Private install: Rejects unauthenticated request with 401', async () => {
  const req = postRequest('/api/apps/private-install', {
    appId: 'app_custom_crm',
    version: '1.0.0',
    companyId: 'cmp_alpha',
  });
  const res = await privateInstallApi.POST(req);
  assert.equal(res.status, 401);
});

test('9. Private install: Rejects unauthorized tenant attempt with 403', async () => {
  const betaCookie = await signIn('user@beta.test');
  const req = postRequest(
    '/api/apps/private-install',
    {
      appId: 'app_custom_crm',
      version: '1.0.0',
      companyId: 'cmp_alpha',
    },
    { cookie: betaCookie },
  );
  const res = await privateInstallApi.POST(req);
  assert.equal(res.status, 403);
});

test('10. Private install: Creates private app, signs release with HMAC, and installs into tenant workspace', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const validPkg = createValidPackage();

  // Step 1: Upload and quarantine
  const uploadRes = await privateUploadApi.POST(
    postRequest(
      '/api/apps/private-upload',
      { companyId: 'cmp_alpha', packageContent: validPkg },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(uploadRes.status, 200);

  // Step 2: Install
  const installRes = await privateInstallApi.POST(
    postRequest(
      '/api/apps/private-install',
      {
        appId: 'app_custom_crm',
        version: '1.0.0',
        companyId: 'cmp_alpha',
        grantedScopes: ['customers.read', 'customers.write'],
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(installRes.status, 200);
  const installData = await installRes.json();
  assert.equal(installData.success, true);
  assert.equal(installData.installation.appId, 'app_custom_crm');
  assert.equal(installData.installation.status, 'installed');

  // Verify database record has app_type = 'private', status = 'private'
  const appRecord = sqlite
    .prepare('SELECT * FROM eap_apps WHERE id = ?')
    .get('app_custom_crm');
  assert.ok(appRecord);
  assert.equal(appRecord.app_type, 'private');
  assert.equal(appRecord.status, 'private');

  // Verify version is signed and review_status = 'private_approved'
  const versionRecord = sqlite
    .prepare('SELECT * FROM eap_app_versions WHERE app_id = ? AND version = ?')
    .get('app_custom_crm', '1.0.0');
  assert.ok(versionRecord);
  assert.equal(versionRecord.review_status, 'private_approved');
  assert.ok(versionRecord.signature);
  assert.ok(versionRecord.signature.length > 20);

  // Verify installation record
  const instRecord = sqlite
    .prepare(
      'SELECT * FROM eap_app_installations WHERE company_id = ? AND app_id = ?',
    )
    .get('cmp_alpha', 'app_custom_crm');
  assert.ok(instRecord);
  assert.equal(instRecord.status, 'installed');
  assert.equal(instRecord.version_id, versionRecord.id);

  // Verify audit log entry
  const audit = sqlite
    .prepare(
      'SELECT * FROM eap_app_audit_logs WHERE action = ? AND app_id = ?',
    )
    .get('app.installed', 'app_custom_crm');
  assert.ok(audit);
  assert.equal(audit.company_id, 'cmp_alpha');
});

test('11. Tenant isolation: Private plugin is visible ONLY to uploading company, NOT to others', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const betaCookie = await signIn('user@beta.test');
  const validPkg = createValidPackage();

  // Upload and install into cmp_alpha
  await privateUploadApi.POST(
    postRequest(
      '/api/apps/private-upload',
      { companyId: 'cmp_alpha', packageContent: validPkg },
      { cookie: ownerCookie },
    ),
  );
  await privateInstallApi.POST(
    postRequest(
      '/api/apps/private-install',
      {
        appId: 'app_custom_crm',
        version: '1.0.0',
        companyId: 'cmp_alpha',
        grantedScopes: ['customers.read', 'customers.write'],
      },
      { cookie: ownerCookie },
    ),
  );

  // Query catalog for cmp_alpha: should include Custom CRM
  const alphaStoreRes = await storeApi.GET(
    getRequest('/api/apps/store?companyId=cmp_alpha', { cookie: ownerCookie }),
  );
  assert.equal(alphaStoreRes.status, 200);
  const alphaStoreData = await alphaStoreRes.json();
  const alphaApp = alphaStoreData.apps.find((a) => a.id === 'app_custom_crm');
  assert.ok(alphaApp, 'Alpha store must contain the private plugin');
  assert.equal(alphaApp.isPrivate, true);
  assert.equal(alphaApp.installation.isInstalled, true);
  assert.equal(alphaApp.installation.version, '1.0.0');

  // Query catalog for cmp_beta: must NOT include Alpha Corp private plugin
  const betaStoreRes = await storeApi.GET(
    getRequest('/api/apps/store?companyId=cmp_beta', { cookie: betaCookie }),
  );
  assert.equal(betaStoreRes.status, 200);
  const betaStoreData = await betaStoreRes.json();
  const betaApp = betaStoreData.apps.find((a) => a.id === 'app_custom_crm');
  assert.equal(betaApp, undefined, 'Beta store must NOT see Alpha Corp private plugin');

  // Filter by category=Private for cmp_alpha
  const privateCatRes = await storeApi.GET(
    getRequest('/api/apps/store?companyId=cmp_alpha&category=Private', {
      cookie: ownerCookie,
    }),
  );
  assert.equal(privateCatRes.status, 200);
  const privateCatData = await privateCatRes.json();
  assert.ok(privateCatData.apps.some((a) => a.id === 'app_custom_crm'));
});

test('12. Lifecycle management: Disable and enable private plugin', async () => {
  const ownerCookie = await signIn('owner@alpha.test');
  const validPkg = createValidPackage();

  const upRes = await privateUploadApi.POST(
    postRequest(
      '/api/apps/private-upload',
      { companyId: 'cmp_alpha', packageContent: validPkg },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(upRes.status, 200);

  const instRes = await privateInstallApi.POST(
    postRequest(
      '/api/apps/private-install',
      {
        appId: 'app_custom_crm',
        version: '1.0.0',
        companyId: 'cmp_alpha',
        grantedScopes: ['customers.read', 'customers.write'],
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(instRes.status, 200);

  // Disable
  const disableRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        appId: 'app_custom_crm',
        companyId: 'cmp_alpha',
        action: 'disable',
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(disableRes.status, 200);
  const disabledInst = sqlite
    .prepare(
      'SELECT status FROM eap_app_installations WHERE company_id = ? AND app_id = ?',
    )
    .get('cmp_alpha', 'app_custom_crm');
  assert.equal(disabledInst.status, 'disabled');

  // Enable
  const enableRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        appId: 'app_custom_crm',
        companyId: 'cmp_alpha',
        action: 'enable',
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(enableRes.status, 200);
  const enabledInst = sqlite
    .prepare(
      'SELECT status FROM eap_app_installations WHERE company_id = ? AND app_id = ?',
    )
    .get('cmp_alpha', 'app_custom_crm');
  assert.equal(enabledInst.status, 'installed');
});

test('13. Lifecycle management: Uninstall blocked when dependent plugin is active', async () => {
  const ownerCookie = await signIn('owner@alpha.test');

  // Install base app
  await privateUploadApi.POST(
    postRequest(
      '/api/apps/private-upload',
      { companyId: 'cmp_alpha', packageContent: createValidPackage('app_base', '1.0.0') },
      { cookie: ownerCookie },
    ),
  );
  await privateInstallApi.POST(
    postRequest(
      '/api/apps/private-install',
      {
        appId: 'app_base',
        version: '1.0.0',
        companyId: 'cmp_alpha',
      },
      { cookie: ownerCookie },
    ),
  );

  // Install dependent app that requires app_base
  const dependentPkg = JSON.stringify({
    manifest: {
      protocol: 'eap-v1',
      platform: 'ERPFY',
      app_id: 'app_dependent',
      slug: 'app-dependent',
      name: 'Dependent App',
      version: '1.0.0',
      entrypoint: 'dist/index.js',
      dependencies: [
        { app_id: 'app_base', version: '1.0.0', required: true },
      ],
    },
    files: { 'dist/index.js': 'console.log("dependent");' },
  });

  await privateUploadApi.POST(
    postRequest(
      '/api/apps/private-upload',
      { companyId: 'cmp_alpha', packageContent: dependentPkg },
      { cookie: ownerCookie },
    ),
  );
  await privateInstallApi.POST(
    postRequest(
      '/api/apps/private-install',
      {
        appId: 'app_dependent',
        version: '1.0.0',
        companyId: 'cmp_alpha',
      },
      { cookie: ownerCookie },
    ),
  );

  // Attempt to uninstall app_base -> must fail because app_dependent relies on it
  const uninstallRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        appId: 'app_base',
        companyId: 'cmp_alpha',
        action: 'uninstall',
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(uninstallRes.status, 400);
  const uninstallData = await uninstallRes.json();
  assert.match(uninstallData.error, /Cannot uninstall/i);
  assert.match(uninstallData.error, /Dependent App|requires this application/i);

  // Uninstall dependent first
  const uninstallDepRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        appId: 'app_dependent',
        companyId: 'cmp_alpha',
        action: 'uninstall',
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(uninstallDepRes.status, 200);

  // Now uninstall base -> must succeed
  const uninstallBaseRes = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        appId: 'app_base',
        companyId: 'cmp_alpha',
        action: 'uninstall',
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(uninstallBaseRes.status, 200);
});
