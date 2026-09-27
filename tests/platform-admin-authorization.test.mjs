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
const adminReviewApi = await route('app/api/admin/apps/review/route.ts');

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

async function signIn(email) {
  const response = await login.POST(
    postRequest('/api/auth/login', { email, password }),
  );
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';', 1)[0];
}

const originalPlatformAdminEmails = process.env.PLATFORM_ADMIN_EMAILS;

beforeEach(() => {
  process.env.PLATFORM_ADMIN_EMAILS = originalPlatformAdminEmails;

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

  const accounts = [
    { id: 'acc_admin', email: 'admin@erpfy.test', name: 'Platform Admin' },
    { id: 'acc_admin_attacker', email: 'admin@attacker.com', name: 'Attacker' },
    { id: 'acc_admin_fake', email: 'admin-fake@erpfy.com', name: 'Admin Lookalike' },
    { id: 'acc_admin_suffix', email: 'admin@example.com.attacker.com', name: 'Suffix Attacker' },
    { id: 'acc_admin_sys', email: 'regular@company.com', name: 'System Administrator' },
    { id: 'acc_company_owner', email: 'owner@tenant.test', name: 'Company Owner' },
    { id: 'acc_dev_owner', email: 'devowner@plugins.test', name: 'Developer Org Owner' },
    { id: 'acc_allowlisted', email: 'trusted.admin@erpfy.org', name: 'Allowlisted Admin' },
    { id: 'acc_ordinary', email: 'ordinary@company.test', name: 'Ordinary Employee' },
  ];

  for (const acc of accounts) {
    sqlite
      .prepare(
        `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
         VALUES (?, ?, ?, 'UTC', ?, ?, ?)`,
      )
      .run(acc.id, acc.email, acc.name, now, now, now);

    sqlite
      .prepare(
        `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
         VALUES (?, ?, ?, 0, 0)`,
      )
      .run(acc.id, hash, now);
  }

  // Setup Company and Company Owner
  sqlite
    .prepare(
      `INSERT INTO core_companies (id, name, slug, country_code, currency, timezone, language, sector_slug, industry_slug, business_models, employee_band, plan, state, trial_ends_at, onboarding_state, onboarding_steps, created_at, created_by, request_key)
       VALUES ('comp_1', 'Tenant Corp', 'tenant-corp', 'US', 'USD', 'UTC', 'en', '', '', '[]', '', 'enterprise', 'active', ?, 'completed', '{}', ?, 'acc_company_owner', 'req_comp_1')`,
    )
    .run(now + 86400000, now);

  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES ('comp_1', 'acc_company_owner', 'owner', 'active', '', ?)`,
    )
    .run(now);

  // Setup Developer Org and Developer Org Owner
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, website, support_email, created_at)
       VALUES ('org_test', 'Dev Org', 'dev-org', 'unverified', 'https://dev.test', 'support@dev.test', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_members (organization_id, account_id, role, created_at)
       VALUES ('org_test', 'acc_dev_owner', 'owner', ?)`,
    )
    .run(now);

  // Seed an app, version, and review for testing review actions
  sqlite
    .prepare(
      `INSERT INTO eap_apps (id, organization_id, slug, name, short_description, category, status, official_app, is_killed, kill_reason, created_by_account_id, created_at, updated_at)
       VALUES ('app_test', 'org_test', 'test-app', 'Test App', 'Short description', 'finance', 'in_review', 0, 0, '', 'acc_dev_owner', ?, ?)`,
    )
    .run(now, now);

  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, min_platform_version, manifest_json, changelog, package_hash, signature, release_id, review_status, created_at)
       VALUES ('ver_test', 'app_test', '1.0.0', 'eap-v1', '1.0.0', '{"id":"test-app"}', 'Init', 'hash_test_123', '', '', 'pending', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_app_reviews (id, version_id, status, automated_scan_result, created_at)
       VALUES ('rev_test', 'ver_test', 'pending', 'passed', ?)`,
    )
    .run(now);
});

// ==========================================
// 17 Targeted Platform Admin Security Tests
// ==========================================

test('1. Email containing "admin" is denied when not explicitly authorized', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('admin@attacker.com');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /Unauthorized: Platform Admin authority required/);
});

test('2. Username/display name containing "admin" is denied', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  // Account display name is "System Administrator", email is regular@company.com
  const cookie = await signIn('regular@company.com');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 403);
});

test('3. admin@ lookalike / suffix attack is denied', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  // Suffix attack: admin@example.com.attacker.com
  const cookie1 = await signIn('admin@example.com.attacker.com');
  const res1 = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie: cookie1 }));
  assert.equal(res1.status, 403);

  // Prefix lookalike: admin-fake@erpfy.com
  const cookie2 = await signIn('admin-fake@erpfy.com');
  const res2 = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie: cookie2 }));
  assert.equal(res2.status, 403);
});

test('4. Company owner is denied Platform Admin powers', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('owner@tenant.test');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 403);
});

test('5. Developer org owner is denied Platform Admin powers', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('devowner@plugins.test');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 403);
});

test('6. Exact allowlisted email succeeds', async () => {
  process.env.PLATFORM_ADMIN_EMAILS = 'trusted.admin@erpfy.org';
  const cookie = await signIn('trusted.admin@erpfy.org');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.reviews));
});

test('7. Near-match email fails', async () => {
  process.env.PLATFORM_ADMIN_EMAILS = 'trusted.admin@erpfy.org';
  // Attempt with another account not in allowlist
  const cookie = await signIn('ordinary@company.test');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 403);
});

test('8. Case-normalized exact match behaves consistently', async () => {
  // Allowlist has mixed casing and whitespace
  process.env.PLATFORM_ADMIN_EMAILS = '  TrUsTeD.AdMiN@ErPfy.OrG  , other@admin.test ';
  const cookie = await signIn('trusted.admin@erpfy.org');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 200);
});

test('9. Missing PLATFORM_ADMIN_EMAILS fails closed unless verified bootstrap admin applies', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;

  // Normal user fails closed
  const cookieOrdinary = await signIn('ordinary@company.test');
  const resOrdinary = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie: cookieOrdinary }));
  assert.equal(resOrdinary.status, 403);

  // Canonical bootstrap admin succeeds
  const cookieAdmin = await signIn('admin@erpfy.test');
  const resAdmin = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie: cookieAdmin }));
  assert.equal(resAdmin.status, 200);
});

test('10. Normal user cannot view review queue', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('ordinary@company.test');
  const res = await adminReviewApi.GET(getRequest('/api/admin/apps/review', { cookie }));
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'Unauthorized: Platform Admin authority required.');
});

test('11. Normal user cannot verify org', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('ordinary@company.test');
  const res = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'verify_org', organizationId: 'org_test' }, { cookie }),
  );
  assert.equal(res.status, 403);

  // Verify status did not change in database
  const org = sqlite.prepare('SELECT status FROM eap_dev_organizations WHERE id = ?').get('org_test');
  assert.equal(org.status, 'unverified');
});

test('12. Normal user cannot approve/reject app review', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('ordinary@company.test');

  // Attempt approve
  const resApprove = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'approve', reviewId: 'rev_test' }, { cookie }),
  );
  assert.equal(resApprove.status, 403);

  // Attempt reject
  const resReject = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'reject', reviewId: 'rev_test', message: 'Reject' }, { cookie }),
  );
  assert.equal(resReject.status, 403);

  // Verify review remains pending
  const rev = sqlite.prepare('SELECT status FROM eap_app_reviews WHERE id = ?').get('rev_test');
  assert.equal(rev.status, 'pending');
});

test('13. Normal user cannot kill/unkill apps', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('ordinary@company.test');

  // Attempt kill
  const resKill = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'kill', appId: 'app_test', message: 'Malicious kill' }, { cookie }),
  );
  assert.equal(resKill.status, 403);

  // Verify app is NOT killed
  const app = sqlite.prepare('SELECT is_killed FROM eap_apps WHERE id = ?').get('app_test');
  assert.equal(app.is_killed, 0);
});

test('14. Platform Admin action produces audit event', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('admin@erpfy.test');

  const res = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'verify_org', organizationId: 'org_test' }, { cookie }),
  );
  assert.equal(res.status, 200);

  // Check audit log in database
  const auditLogs = sqlite
    .prepare("SELECT * FROM eap_app_audit_logs WHERE action = 'developer.verified'")
    .all();
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].actor_type, 'admin');
  assert.equal(auditLogs[0].actor_id, 'acc_admin');
  assert.match(auditLogs[0].details, /org_test/);
});

test('15. Signing secrets are never returned or logged during review approval', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  const cookie = await signIn('admin@erpfy.test');

  // First verify the developer org so app approval is allowed
  sqlite.prepare("UPDATE eap_dev_organizations SET status = 'verified' WHERE id = 'org_test'").run();

  const res = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'approve', reviewId: 'rev_test', notes: 'Approved for release' }, { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();

  // Response must contain safe release metadata, never secret keys
  assert.equal(data.ok, true);
  assert.ok(data.releaseId);
  assert.equal(JSON.stringify(data).includes('test-platform-master-secret-key'), false);

  // Check audit log details
  const audit = sqlite
    .prepare("SELECT * FROM eap_app_audit_logs WHERE action = 'version.approved_and_signed'")
    .get();
  assert.ok(audit);
  assert.equal(audit.details.includes('test-platform-master-secret-key'), false);
});

test('16. Developer self-verification remains impossible', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  // Dev owner attempts to verify their own organization
  const cookie = await signIn('devowner@plugins.test');
  const res = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'verify_org', organizationId: 'org_test' }, { cookie }),
  );
  assert.equal(res.status, 403);

  // Confirm database status remains 'unverified'
  const org = sqlite.prepare('SELECT status FROM eap_dev_organizations WHERE id = ?').get('org_test');
  assert.equal(org.status, 'unverified');
});

test('17. Developer self-approval remains impossible', async () => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
  // Dev owner attempts to self-approve their own app submission
  const cookie = await signIn('devowner@plugins.test');
  const res = await adminReviewApi.POST(
    postRequest('/api/admin/apps/review', { action: 'approve', reviewId: 'rev_test' }, { cookie }),
  );
  assert.equal(res.status, 403);

  // Confirm review record remains pending
  const review = sqlite.prepare('SELECT status FROM eap_app_reviews WHERE id = ?').get('rev_test');
  assert.equal(review.status, 'pending');

  // Confirm version is not published or signed
  const version = sqlite.prepare('SELECT signature, release_id, review_status FROM eap_app_versions WHERE id = ?').get('ver_test');
  assert.equal(version.signature, '');
  assert.equal(version.release_id, '');
  assert.equal(version.review_status, 'pending');
});
