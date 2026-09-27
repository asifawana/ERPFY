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
const devProfile = await route('app/api/developer/profile/route.ts');
const devApps = await route('app/api/developer/apps/route.ts');
const devVersions = await route('app/api/developer/apps/[appId]/versions/route.ts');
const devSubmit = await route('app/api/developer/apps/[appId]/submit/route.ts');
const adminReview = await route('app/api/admin/apps/review/route.ts');
const storeRoute = await route('app/api/apps/store/route.ts');
const installRoute = await route('app/api/apps/install/route.ts');
const manifestEngine = await route('lib/eap/manifest.ts');
const scannerEngine = await route('lib/eap/scanner.ts');
const signingEngine = await route('lib/eap/signing.ts');

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

function getRequest(path, headers = {}) {
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
  sqlite
    .prepare(
      `INSERT INTO core_accounts
        (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'account-a',
      'owner@example.test',
      'Owner',
      'Asia/Karachi',
      now,
      now,
      now,
    );

  sqlite
    .prepare(
      `INSERT INTO core_accounts
        (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'acc_admin',
      'admin@example.test',
      'Platform Admin',
      'Asia/Karachi',
      now,
      now,
      now,
    );

  sqlite
    .prepare(
      `INSERT INTO core_credentials
        (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run('account-a', passwordHash(password), now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials
        (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run('acc_admin', passwordHash(password), now);

  const insertCompany = sqlite.prepare(
    `INSERT INTO core_companies
      (id, name, slug, country_code, currency, timezone, language, sector_slug,
       industry_slug, business_models, employee_band, plan, state, trial_ends_at,
       onboarding_state, onboarding_steps, created_at, created_by, request_key)
     VALUES (?, ?, ?, ?, ?, ?, 'en', '', '', '[]', '', 'starter', 'trial', ?,
             'completed', '{}', ?, ?, ?)`,
  );
  insertCompany.run(
    'company-a',
    'Company A',
    'company-a',
    'PK',
    'PKR',
    'Asia/Karachi',
    now + 86_400_000,
    now,
    'account-a',
    'company-a',
  );

  sqlite
    .prepare(
      `INSERT INTO core_memberships
        (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES (?, ?, 'owner', 'active', '', ?)`,
    )
    .run('company-a', 'account-a', now);
});

/* ------------------------------------------------------------------ *
 * EAP Manifest & Security Scanner Unit Tests
 * ------------------------------------------------------------------ */

test('manifest validator enforces eap-v1 protocol and valid semver', () => {
  const validManifest = {
    protocol: 'eap-v1',
    app_id: 'custom-plugin',
    name: 'Custom Plugin',
    slug: 'custom-plugin',
    version: '1.2.0',
    minimum_platform_version: '1.0.0',
    developer_id: 'dev_123',
    permissions: ['orders.read', 'customers.read'],
  };

  const validated = manifestEngine.validateEapManifest(validManifest);
  assert.equal(validated.app_id, 'custom-plugin');

  // Rejects bad version semver
  assert.throws(() =>
    manifestEngine.validateEapManifest({
      ...validManifest,
      version: 'bad-version',
    }),
  );

  // Rejects non-eap-v1 protocol
  assert.throws(() =>
    manifestEngine.validateEapManifest({
      ...validManifest,
      protocol: 'eap-v2-unknown',
    }),
  );
});

test('security scanner detects eval(), Function(), child_process and forbids raw dangerous code', () => {
  const cleanManifest = {
    protocol: 'eap-v1',
    app_id: 'clean-app',
    name: 'Clean App',
    slug: 'clean-app',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    developer_id: 'dev_123',
    permissions: ['orders.read'],
  };

  // 1. Clean code bundle passes
  const cleanScan = scannerEngine.scanEapPackage(cleanManifest, {
    'index.js': 'export default function render() { return "hello clean"; }',
  });
  assert.equal(cleanScan.status, 'PASS');

  // 2. Eval call is caught and fails
  const evilScan1 = scannerEngine.scanEapPackage(cleanManifest, {
    'index.js': 'function hack() { eval("alert(1)"); }',
  });
  assert.equal(evilScan1.status, 'FAIL');
  assert.match(evilScan1.issues[0], /eval\(\)/);

  // 3. child_process is caught and fails
  const evilScan2 = scannerEngine.scanEapPackage(cleanManifest, {
    'index.js': 'const cp = require("child_process");',
  });
  assert.equal(evilScan2.status, 'FAIL');

  // 4. Raw SQL table drop is caught and fails
  const evilScan3 = scannerEngine.scanEapPackage(cleanManifest, {
    'index.js': 'DROP TABLE core_accounts;',
  });
  assert.equal(evilScan3.status, 'FAIL');
});

test('cryptographic signing produces verifiable HMAC-SHA256 platform releases', () => {
  const secret = 'test-secret-key-material-0123456789abcdef';
  const pkgHash = signingEngine.computePackageHash('{"some":"content"}');
  assert.ok(pkgHash.length === 64); // SHA-256 hex length

  const release = signingEngine.signReleaseBuild(
    'app-123',
    '1.0.0',
    pkgHash,
    secret,
  );
  assert.ok(release.signature.length > 20);

  const isValid = signingEngine.verifyReleaseSignature(
    'app-123',
    '1.0.0',
    pkgHash,
    release.signedAt,
    release.releaseId,
    release.signature,
    secret,
  );
  assert.equal(isValid, true);

  // Tampered payload fails verification
  const isTamperedValid = signingEngine.verifyReleaseSignature(
    'app-123',
    '1.0.0',
    'tampered-hash-000000000000000000000000000000000000000000000000000000',
    release.signedAt,
    release.releaseId,
    release.signature,
    secret,
  );
  assert.equal(isTamperedValid, false);
});

/* ------------------------------------------------------------------ *
 * Full Platform API Integration Lifecycle Test
 * ------------------------------------------------------------------ */

test('full developer lifecycle: register org -> create app -> upload version -> automated scan -> review approve & sign -> store publish -> tenant install -> toggle -> emergency killswitch', async () => {
  const cookie = await signIn();
  const authHeaders = { cookie };
  const adminCookie = await signIn('admin@example.test');
  const adminHeaders = { cookie: adminCookie };

  // 1. Register Developer Organization
  const regRes = await devProfile.POST(
    request(
      '/api/developer/profile',
      {
        organizationName: 'Acme Software Labs',
        organizationSlug: 'acme-software-labs',
        displayName: 'Acme Developer',
        website: 'https://acme.test',
        supportEmail: 'dev@acme.test',
      },
      authHeaders,
    ),
  );
  assert.equal(regRes.status, 200);
  const regData = await regRes.json();
  assert.equal(regData.profile.displayName, 'Acme Developer');

  // 2. Create New App
  const appRes = await devApps.POST(
    request(
      '/api/developer/apps',
      {
        name: 'Smart Inventory Forecaster',
        slug: 'smart-inventory-forecaster',
        category: 'Inventory',
        shortDescription: 'AI demand forecasting and restock alerts.',
        fullDescription:
          'Predict seasonal sales patterns and automate purchasing requisition orders.',
      },
      authHeaders,
    ),
  );
  assert.equal(appRes.status, 200);
  const appData = await appRes.json();
  const createdAppId = appData.app.id;
  assert.ok(createdAppId);

  // 3. Upload App Version with EAP Manifest
  const manifest = {
    protocol: 'eap-v1',
    app_id: createdAppId,
    name: 'Smart Inventory Forecaster',
    slug: 'smart-inventory-forecaster',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    developer_id: regData.profile.id,
    permissions: ['inventory.read', 'orders.read'],
  };

  const verRes = await devVersions.POST(
    request(
      `/api/developer/apps/${createdAppId}/versions`,
      {
        manifest,
        changelog: 'Initial production release.',
        codeFiles: {
          'index.js':
            'export function Widget() { return "Demand forecasting active"; }',
        },
      },
      authHeaders,
    ),
    { params: Promise.resolve({ appId: createdAppId }) },
  );
  assert.equal(verRes.status, 200);
  const verData = await verRes.json();
  assert.equal(verData.version.scanResult, 'PASS');
  const createdVerId = verData.version.id;

  // 3b. Platform Admin verifies developer organization prior to review submission
  const verifyOrgRes = await adminReview.POST(
    request(
      '/api/admin/apps/review',
      {
        action: 'verify_org',
        organizationId: regData.profile.organization.id,
      },
      adminHeaders,
    ),
  );
  assert.equal(verifyOrgRes.status, 200);

  // 4. Submit Version for Admin Review
  const submitRes = await devSubmit.POST(
    request(
      `/api/developer/apps/${createdAppId}/submit`,
      {
        versionId: createdVerId,
      },
      authHeaders,
    ),
    { params: Promise.resolve({ appId: createdAppId }) },
  );
  assert.equal(submitRes.status, 200);

  // 5. Platform Admin Review: Fetch queue and Approve with Platform Sign
  const queueRes = await adminReview.GET(
    getRequest('/api/admin/apps/review', adminHeaders),
  );
  assert.equal(queueRes.status, 200);
  const queueData = await queueRes.json();
  const pendingReview = queueData.reviews.find(
    (r) => r.version.id === createdVerId,
  );
  assert.ok(pendingReview);

  const approveRes = await adminReview.POST(
    request(
      '/api/admin/apps/review',
      {
        action: 'approve',
        reviewId: pendingReview.id,
        notes: 'Passed manual verification and static security scanner.',
      },
      adminHeaders,
    ),
  );
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.ok(approveData.releaseId); // Has platform release ID

  // 6. App Store Catalog View
  const storeRes = await storeRoute.GET(
    getRequest('/api/apps/store', authHeaders),
  );
  assert.equal(storeRes.status, 200);
  const storeData = await storeRes.json();
  const foundApp = storeData.apps.find((a) => a.id === createdAppId);
  assert.ok(foundApp);
  assert.equal(foundApp.latestVersion.isSigned, true);
  assert.equal(foundApp.installation.isInstalled, false);

  // 7. Tenant Install App
  const installRes = await installRoute.POST(
    request(
      '/api/apps/install',
      {
        action: 'install',
        appId: createdAppId,
        grantedScopes: ['inventory.read', 'orders.read'],
      },
      authHeaders,
    ),
  );
  assert.equal(installRes.status, 200);
  const installData = await installRes.json();
  assert.equal(installData.success, true);
  assert.equal(installData.installation.appId, createdAppId);

  // 8. Re-check App Store: Now Installed!
  const storeInstalledRes = await storeRoute.GET(
    getRequest('/api/apps/store', authHeaders),
  );
  const storeInstalledData = await storeInstalledRes.json();
  const updatedApp = storeInstalledData.apps.find((a) => a.id === createdAppId);
  assert.equal(updatedApp.installation.isInstalled, true);
  assert.equal(updatedApp.installation.enabled, true);

  // 9. Toggle App Disabled/Enabled
  const toggleRes = await installRoute.POST(
    request(
      '/api/apps/install',
      {
        action: 'toggle',
        appId: createdAppId,
      },
      authHeaders,
    ),
  );
  assert.equal(toggleRes.status, 200);
  const toggleData = await toggleRes.json();
  assert.equal(toggleData.enabled, false);

  // 10. Emergency Kill Switch: Kill App
  const killRes = await adminReview.POST(
    request(
      '/api/admin/apps/review',
      {
        action: 'kill',
        appId: createdAppId,
        message: 'Urgent security quarantine test',
      },
      adminHeaders,
    ),
  );
  assert.equal(killRes.status, 200);

  // Verify App marked as killed
  const storeKilledRes = await storeRoute.GET(
    getRequest('/api/apps/store', authHeaders),
  );
  const storeKilledData = await storeKilledRes.json();
  const killedApp = storeKilledData.apps.find((a) => a.id === createdAppId);
  assert.equal(killedApp.isKilled, true);
  assert.equal(killedApp.killReason, 'Urgent security quarantine test');

  // 11. Unkill / Restore App
  const unkillRes = await adminReview.POST(
    request(
      '/api/admin/apps/review',
      {
        action: 'unkill',
        appId: createdAppId,
      },
      adminHeaders,
    ),
  );
  assert.equal(unkillRes.status, 200);

  // 12. Uninstall App
  const uninstallRes = await installRoute.POST(
    request(
      '/api/apps/install',
      {
        action: 'uninstall',
        appId: createdAppId,
      },
      authHeaders,
    ),
  );
  assert.equal(uninstallRes.status, 200);

  // Verify App uninstalled
  const storeUninstalledRes = await storeRoute.GET(
    getRequest('/api/apps/store', authHeaders),
  );
  const storeUninstalledData = await storeUninstalledRes.json();
  const uninstalledApp = storeUninstalledData.apps.find(
    (a) => a.id === createdAppId,
  );
  assert.equal(uninstalledApp.installation.isInstalled, false);
});
