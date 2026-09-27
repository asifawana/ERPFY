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

function patchRequest(path, body, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'PATCH',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function signIn(email) {
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
    { id: 'acc_dev_new', email: 'newdev@example.test', name: 'New Dev' },
    { id: 'acc_dev_verified', email: 'verifieddev@example.test', name: 'Verified Dev' },
    { id: 'acc_ordinary', email: 'ordinary@example.test', name: 'Ordinary Employee' },
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

  // Pre-seed an already verified organization for comparison
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, website, support_email, created_at)
       VALUES ('org_v', 'Verified Partners Inc', 'verified-partners', 'verified', 'https://v.dev', 'v@v.dev', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_profiles (id, account_id, organization_id, display_name, bio, created_at)
       VALUES ('dev_v', 'acc_dev_verified', 'org_v', 'Verified Developer', 'Pro Dev', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_members (organization_id, account_id, role, created_at)
       VALUES ('org_v', 'acc_dev_verified', 'owner', ?)`,
    )
    .run(now);
});

test('1. New developer registration does NOT automatically become verified', async () => {
  const cookie = await signIn('newdev@example.test');
  const res = await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Fresh Softworks', contactEmail: 'contact@fresh.dev', websiteUrl: 'https://fresh.dev' },
      { cookie },
    ),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.profile.verified, false);
  assert.equal(data.profile.status, 'unverified');
  assert.equal(data.profile.organization.status, 'unverified');

  // Verify DB state
  const orgRow = sqlite.prepare('SELECT status FROM eap_dev_organizations WHERE id = ?').get(data.profile.organization.id);
  assert.equal(orgRow.status, 'unverified');
});

test('2. Developer cannot submit verified=true or status=verified in request payload to forge verification', async () => {
  const cookie = await signIn('newdev@example.test');
  const res = await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      {
        organizationName: 'Hacker Labs',
        contactEmail: 'hacker@labs.dev',
        verified: true,
        status: 'verified',
        verification_status: 'verified',
      },
      { cookie },
    ),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.profile.verified, false);
  assert.equal(data.profile.status, 'unverified');
  assert.equal(data.profile.organization.status, 'unverified');

  const row = sqlite.prepare("SELECT status FROM eap_dev_organizations WHERE slug = 'hacker-labs'").get();
  assert.equal(row.status, 'unverified');
});

test('3. Developer cannot change their own verification state', async () => {
  const cookie = await signIn('newdev@example.test');
  await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Self Mod Dev', contactEmail: 'self@dev.test' },
      { cookie },
    ),
  );

  // Attempt to self-verify via PATCH
  const patchStatusRes = await profileApi.PATCH(
    patchRequest(
      '/api/developer/profile',
      { status: 'verified' },
      { cookie },
    ),
  );
  assert.equal(patchStatusRes.status, 403);
  assert.match((await patchStatusRes.json()).error, /cannot be changed by developer/i);

  const patchVerifiedRes = await profileApi.PATCH(
    patchRequest(
      '/api/developer/profile',
      { verified: true },
      { cookie },
    ),
  );
  assert.equal(patchVerifiedRes.status, 403);

  // Legitimate profile update succeeds without altering verification status
  const patchBioRes = await profileApi.PATCH(
    patchRequest(
      '/api/developer/profile',
      { bio: 'Building ERP integrations safely' },
      { cookie },
    ),
  );
  assert.equal(patchBioRes.status, 200);
  const bioData = await patchBioRes.json();
  assert.equal(bioData.profile.bio, 'Building ERP integrations safely');
  assert.equal(bioData.profile.verified, false);
  assert.equal(bioData.profile.status, 'unverified');
});

test('4. Unauthorized user cannot verify an organization', async () => {
  const cookieDev = await signIn('newdev@example.test');
  const cookieOrdinary = await signIn('ordinary@example.test');

  const profRes = await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Target Org', contactEmail: 'target@dev.test' },
      { cookie: cookieDev },
    ),
  );
  const { profile } = await profRes.json();
  const orgId = profile.organization.id;

  // Developer attempts to verify their own organization
  const devVerifyRes = await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'verify_org', organizationId: orgId },
      { cookie: cookieDev },
    ),
  );
  assert.equal(devVerifyRes.status, 403);
  assert.match((await devVerifyRes.json()).error, /Platform Admin authority required/i);

  // Ordinary employee attempts to verify organization
  const ordinaryVerifyRes = await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'verify_org', organizationId: orgId },
      { cookie: cookieOrdinary },
    ),
  );
  assert.equal(ordinaryVerifyRes.status, 403);
  assert.match((await ordinaryVerifyRes.json()).error, /Platform Admin authority required/i);

  // Organization remains unverified
  const orgRow = sqlite.prepare('SELECT status FROM eap_dev_organizations WHERE id = ?').get(orgId);
  assert.equal(orgRow.status, 'unverified');
});

test('5. Authorized platform admin verification path works if such endpoint already exists', async () => {
  const cookieDev = await signIn('newdev@example.test');
  const cookieAdmin = await signIn('admin@example.test');

  const profRes = await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Enterprise Soft', contactEmail: 'enterprise@dev.test' },
      { cookie: cookieDev },
    ),
  );
  const { profile } = await profRes.json();
  const orgId = profile.organization.id;

  // Authorized Platform Admin calls verify_org
  const adminVerifyRes = await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'verify_org', organizationId: orgId },
      { cookie: cookieAdmin },
    ),
  );
  assert.equal(adminVerifyRes.status, 200);
  const adminData = await adminVerifyRes.json();
  assert.equal(adminData.ok, true);
  assert.equal(adminData.status, 'verified');

  // Verify DB state
  const orgRow = sqlite.prepare('SELECT status FROM eap_dev_organizations WHERE id = ?').get(orgId);
  assert.equal(orgRow.status, 'verified');
});

test('6. Verification status is displayed truthfully', async () => {
  const cookieNew = await signIn('newdev@example.test');
  const cookieVerified = await signIn('verifieddev@example.test');

  // 1. Unverified profile returns truthful false/unverified
  await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Truthful Dev', contactEmail: 'truth@dev.test' },
      { cookie: cookieNew },
    ),
  );
  const newProfRes = await profileApi.GET(getRequest('/api/developer/profile', { cookie: cookieNew }));
  assert.equal(newProfRes.status, 200);
  const newData = await newProfRes.json();
  assert.equal(newData.profile.verified, false);
  assert.equal(newData.profile.status, 'unverified');
  assert.equal(newData.profile.organization.status, 'unverified');

  // 2. Verified profile returns truthful true/verified
  const verProfRes = await profileApi.GET(getRequest('/api/developer/profile', { cookie: cookieVerified }));
  assert.equal(verProfRes.status, 200);
  const verData = await verProfRes.json();
  assert.equal(verData.profile.verified, true);
  assert.equal(verData.profile.status, 'verified');
  assert.equal(verData.profile.organization.status, 'verified');
});

test('7. App approval remains independent of developer verification', async () => {
  const cookieAdmin = await signIn('admin@example.test');
  const cookieDev = await signIn('newdev@example.test');

  // Register developer org
  const profRes = await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Indie Dev', contactEmail: 'indie@dev.test' },
      { cookie: cookieDev },
    ),
  );
  const { profile } = await profRes.json();
  const orgId = profile.organization.id;

  // Platform Admin verifies the organization
  await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'verify_org', organizationId: orgId },
      { cookie: cookieAdmin },
    ),
  );

  // Create an app and upload version
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Indie App', slug: 'indie-app', category: 'Sales', tagline: 'Indie test' },
      { cookie: cookieDev },
    ),
  );
  const { app } = await appRes.json();

  const verRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Indie App',
          slug: 'indie-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieDev },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await verRes.json();

  // App version remains draft and unapproved, despite organization being verified!
  const verRow = sqlite.prepare('SELECT review_status, signature, release_id FROM eap_app_versions WHERE id = ?').get(version.id);
  assert.equal(verRow.review_status, 'draft');
  assert.ok(!verRow.signature);
  assert.ok(!verRow.release_id);
});

test('8. Developer cannot self-approve plugin version', async () => {
  const cookieDev = await signIn('verifieddev@example.test');

  // Create app and version under verified dev
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Self Approve App', slug: 'self-approve-app', category: 'Sales', tagline: 'Test' },
      { cookie: cookieDev },
    ),
  );
  const { app } = await appRes.json();

  const verRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Self Approve App',
          slug: 'self-approve-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie: cookieDev },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  const { version } = await verRes.json();

  // Submit version for review
  await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie: cookieDev },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );

  const revRow = sqlite.prepare('SELECT id FROM eap_app_reviews WHERE version_id = ?').get(version.id);

  // Developer attempts to approve their own version via admin review endpoint
  const selfApproveRes = await adminReviewApi.POST(
    postRequest(
      '/api/admin/apps/review',
      { action: 'approve', reviewId: revRow.id },
      { cookie: cookieDev },
    ),
  );
  assert.equal(selfApproveRes.status, 403);
  assert.match((await selfApproveRes.json()).error, /Platform Admin authority required/i);

  // Version remains in submitted status, NOT published/approved
  const verRow = sqlite.prepare('SELECT review_status FROM eap_app_versions WHERE id = ?').get(version.id);
  assert.equal(verRow.review_status, 'submitted');
});

test('9. Developer cannot self-assign official_app', async () => {
  const cookie = await signIn('verifieddev@example.test');
  const res = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      {
        name: 'Spoofed Official App',
        slug: 'spoofed-official',
        category: 'Sales',
        tagline: 'Spoof',
        officialApp: true,
        official_app: 1,
      },
      { cookie },
    ),
  );
  assert.equal(res.status, 200);
  const data = await res.json();

  const row = sqlite.prepare('SELECT official_app FROM eap_apps WHERE id = ?').get(data.app.id);
  assert.equal(row.official_app, 0);
});

test('10. Existing Developer workflows still work according to chosen pending/verified policy', async () => {
  const cookie = await signIn('newdev@example.test');
  await profileApi.POST(
    postRequest(
      '/api/developer/profile',
      { organizationName: 'Policy Test Lab', contactEmail: 'policy@test.dev' },
      { cookie },
    ),
  );

  // 1. Unverified dev CAN create draft apps
  const appRes = await appsApi.POST(
    postRequest(
      '/api/developer/apps',
      { name: 'Draft App', slug: 'draft-app', category: 'Sales', tagline: 'Draft test' },
      { cookie },
    ),
  );
  assert.equal(appRes.status, 200);
  const { app } = await appRes.json();
  assert.equal(app.status, 'draft');

  // 2. Unverified dev CAN upload draft version
  const uploadRes = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: app.id,
          name: 'Draft App',
          slug: 'draft-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
      },
      { cookie },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(uploadRes.status, 200);
  const { version } = await uploadRes.json();
  assert.equal(version.status, 'draft');

  // 3. Unverified dev CAN generate development / sandbox credentials
  const devCredRes = await credentialsApi.POST(
    postRequest(
      '/api/developer/credentials',
      { appId: app.id, environment: 'development' },
      { cookie },
    ),
  );
  assert.equal(devCredRes.status, 200);
  const devCredData = await devCredRes.json();
  assert.equal(devCredData.credential.environment, 'development');

  // 4. Unverified dev CANNOT submit version for platform review
  const submitRes = await submitApi.POST(
    postRequest(
      `/api/developer/apps/${app.id}/submit`,
      { versionId: version.id },
      { cookie },
    ),
    { params: Promise.resolve({ appId: app.id }) },
  );
  assert.equal(submitRes.status, 403);
  assert.match((await submitRes.json()).error, /must be verified by Platform Admin/i);

  // 5. Unverified dev CANNOT generate production credentials
  const prodCredRes = await credentialsApi.POST(
    postRequest(
      '/api/developer/credentials',
      { appId: app.id, environment: 'production' },
      { cookie },
    ),
  );
  assert.equal(prodCredRes.status, 403);
  assert.match((await prodCredRes.json()).error, /must be verified by Platform Admin/i);
});

test('11. Existing App Store remains unchanged and only serves approved published apps', async () => {
  const cookie = await signIn('ordinary@example.test');

  // Insert a draft app from an unverified org in DB
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, created_at)
       VALUES ('org_unver_store', 'Unver Store Org', 'unver-store-org', 'unverified', ?)`,
    )
    .run(now);
  sqlite
    .prepare(
      `INSERT INTO eap_apps (id, organization_id, slug, name, category, short_description, created_by_account_id, created_at, updated_at, status)
       VALUES ('app_draft_store', 'org_unver_store', 'draft-store-app', 'Draft Store App', 'Sales', 'Desc', 'acc_ordinary', ?, ?, 'draft')`,
    )
    .run(now, now);

  // Call App Store API
  const storeRes = await storeApi.GET(getRequest('/api/apps/store', { cookie }));
  assert.equal(storeRes.status, 200);
  const data = await storeRes.json();

  // All returned apps must be from verified publishers and draft apps never appear
  for (const storeApp of data.apps || []) {
    assert.notEqual(storeApp.id, 'app_draft_store');
    assert.equal(storeApp.developer.status, 'verified');
  }
});
