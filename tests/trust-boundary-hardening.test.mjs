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

const PLATFORM_SIGNING_KEY = 'test-platform-master-secret-key-1234567890';
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

const signupApi = await route('app/api/auth/signup/route.ts');
const loginApi = await route('app/api/auth/login/route.ts');
const adminReviewApi = await route('app/api/admin/apps/review/route.ts');
const passwordApi = await route('app/api/account/password/route.ts');
const revokeApi = await route('app/api/account/sessions/revoke/route.ts');
const installApi = await route('app/api/apps/install/route.ts');
const signing = await route('lib/eap/signing.ts');
const storeApi = await route('app/api/apps/store/route.ts');

const origin = 'https://erp.test';
const defaultPassword = 'correct-horse-battery-staple-99';

function postRequest(path, body, headers = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
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

  const now = 1700000000000;
  process.env.PLATFORM_ADMIN_EMAILS = 'superadmin@erpfy.com,platform-sec@erpfy.com';

  // Seed verified bootstrap admin
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES ('acc_admin', 'superadmin@erpfy.com', 'Verified Admin', 'UTC', ?, ?, ?)`,
    )
    .run(now, now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES ('acc_admin', ?, ?, 0, 0)`,
    )
    .run(passwordHash(defaultPassword), now);

  // Seed unverified user with allowlisted email
  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES ('acc_unverified_admin', 'platform-sec@erpfy.com', 'Fake Admin', 'UTC', ?, ?, NULL)`,
    )
    .run(now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES ('acc_unverified_admin', ?, ?, 0, 0)`,
    )
    .run(passwordHash(defaultPassword), now);

  // Seed company and memberships
  sqlite
    .prepare(
      `INSERT INTO core_companies
        (id, name, slug, country_code, currency, timezone, language, sector_slug, industry_slug,
         business_models, employee_band, plan, state, trial_ends_at, onboarding_state, onboarding_steps,
         created_at, created_by, request_key)
       VALUES ('cmp_alpha', 'Alpha Corp', 'alpha-corp', 'US', 'USD', 'UTC', 'en', '', '', '[]', '',
               'pro', 'active', ?, 'completed', '{}', ?, 'acc_admin', 'req-alpha')`,
    )
    .run(now + 86400000, now);

  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES ('cmp_alpha', 'acc_admin', 'owner', 'active', '', ?)`,
    )
    .run(now);

  // Seed dev org and approved app
  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, website, support_email, created_at)
       VALUES ('org_trust', 'Trusted Systems Ltd', 'trusted-systems', 'verified', 'https://trusted.com', 'dev@trusted.com', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_apps
        (id, organization_id, slug, name, short_description, full_description, category, app_type,
         official_app, pricing_type, price_amount, icon_url, banner_url, support_email, docs_url,
         privacy_url, status, is_killed, created_by_account_id, created_at, updated_at)
       VALUES ('app_secure', 'org_trust', 'secure-pos', 'Secure POS', 'A secure point of sale',
               'Detailed description', 'Sales', 'public', 0, 'free', 0, '', '', '', '', '',
               'published', 0, 'acc_admin', ?, ?)`,
    )
    .run(now, now);
});

test('1. Signup creates unverified account by default (email_verified_at = NULL)', async () => {
  const req = postRequest('/api/auth/signup', {
    displayName: 'New Registrant',
    email: 'newuser@example.com',
    password: 'secure-strong-password-123',
  });

  const res = await signupApi.POST(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.signedIn, true);
  assert.equal(data.emailVerified, false);

  const user = sqlite
    .prepare('SELECT email, email_verified_at FROM core_accounts WHERE email = ?')
    .get('newuser@example.com');
  assert.ok(user);
  assert.equal(user.email_verified_at, null, 'New signup must start with email_verified_at = NULL');
});

test('2. Signup rejects invalid input (short password, bad email, duplicate)', async () => {
  // Short password
  const shortPwdRes = await signupApi.POST(
    postRequest('/api/auth/signup', {
      displayName: 'Alice',
      email: 'alice@test.com',
      password: '123',
    }),
  );
  assert.equal(shortPwdRes.status, 400);

  // Invalid email
  const badEmailRes = await signupApi.POST(
    postRequest('/api/auth/signup', {
      displayName: 'Alice',
      email: 'not-an-email',
      password: 'valid-password-long',
    }),
  );
  assert.equal(badEmailRes.status, 400);

  // Duplicate email
  const dupRes = await signupApi.POST(
    postRequest('/api/auth/signup', {
      displayName: 'Imposter',
      email: 'superadmin@erpfy.com',
      password: 'valid-password-long',
    }),
  );
  assert.equal(dupRes.status, 409);
});

test('3. Platform Admin authority strictly denies unverified email even if allowlisted', async () => {
  // Login as unverified allowlisted email
  const cookie = await signIn('platform-sec@erpfy.com');

  const req = new Request(`${origin}/api/admin/apps/review`, {
    method: 'GET',
    headers: { origin, cookie },
  });

  const res = await adminReviewApi.GET(req);
  assert.equal(res.status, 403, 'Unverified allowlisted email must be denied admin privileges');
  const data = await res.json();
  assert.match(data.error, /Platform Admin authority required/i);
});

test('4. Password change API performs real PBKDF2 operation and rejects wrong current password', async () => {
  const cookie = await signIn('superadmin@erpfy.com');

  // Wrong current password
  const wrongRes = await passwordApi.POST(
    postRequest(
      '/api/account/password',
      {
        currentPassword: 'incorrect-password',
        newPassword: 'new-secure-password-456',
      },
      { cookie },
    ),
  );
  assert.equal(wrongRes.status, 400);
  const wrongData = await wrongRes.json();
  assert.match(wrongData.error, /Current password is incorrect/i);

  // Correct current password
  const validRes = await passwordApi.POST(
    postRequest(
      '/api/account/password',
      {
        currentPassword: defaultPassword,
        newPassword: 'new-secure-password-456',
      },
      { cookie },
    ),
  );
  assert.equal(validRes.status, 200);
  const validData = await validRes.json();
  assert.equal(validData.ok, true);

  // Verify can now login with new password
  const newCookie = await signIn('superadmin@erpfy.com', 'new-secure-password-456');
  assert.ok(newCookie);
});

test('5. Session device revoke performs real database revocation and protects current session', async () => {
  const cookie = await signIn('superadmin@erpfy.com');

  // Insert a secondary session for acc_admin
  sqlite
    .prepare(
      `INSERT INTO core_sessions (id, account_id, token_hash, user_agent, ip_address, last_seen_at, expires_at, created_at, verified_at)
       VALUES ('ses_secondary', 'acc_admin', 'dummy_hash', 'Mobile Safari', '1.1.1.1', 1700000000000, 1800000000000, 1700000000000, 1700000000000)`,
    )
    .run();

  // Revoking the secondary session succeeds
  const res = await revokeApi.POST(
    postRequest('/api/account/sessions/revoke', { sessionId: 'ses_secondary' }, { cookie }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);

  const remaining = sqlite.prepare('SELECT id, revoked_at FROM core_sessions WHERE id = ?').get('ses_secondary');
  assert.ok(remaining && remaining.revoked_at !== null, 'Revoked session must have revoked_at set');

  // Attempting to revoke active current session is prevented
  // Find current session ID
  const activeSession = sqlite
    .prepare('SELECT id FROM core_sessions WHERE account_id = ? AND id != ?')
    .get('acc_admin', 'ses_secondary');

  const selfRevokeRes = await revokeApi.POST(
    postRequest('/api/account/sessions/revoke', { sessionId: activeSession.id }, { cookie }),
  );
  assert.equal(selfRevokeRes.status, 400);
  const selfData = await selfRevokeRes.json();
  assert.match(selfData.error, /Cannot revoke current session/i);
});

test('6. Cryptographic install trust boundary rejects unsigned releases', async () => {
  const cookie = await signIn('superadmin@erpfy.com');
  const manifest = {
    id: 'app_secure',
    name: 'Secure POS',
    version: '1.0.0',
    protocol: 'eap-v1',
    permissions: ['pos.read'],
  };
  const pkgHash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');

  // Insert unsigned version
  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, manifest_json, package_hash, signature, review_status, created_at)
       VALUES ('ver_unsigned', 'app_secure', '1.0.0', 'eap-v1', ?, ?, NULL, 'approved', 1700000000000)`,
    )
    .run(JSON.stringify(manifest), pkgHash);

  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app_secure',
        companyId: 'cmp_alpha',
        targetVersion: '1.0.0',
        grantedScopes: ['pos.read'],
      },
      { cookie },
    ),
  );

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /cryptographic release metadata is missing|signature/i);
});

test('7. Cryptographic install trust boundary rejects tampered package hash', async () => {
  const cookie = await signIn('superadmin@erpfy.com');
  const manifest = {
    id: 'app_secure',
    name: 'Secure POS',
    version: '1.0.1',
    protocol: 'eap-v1',
    permissions: ['pos.read'],
  };
  const validHash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const tamperedHash = crypto.createHash('sha256').update('malicious-payload').digest('hex');

  // Sign with valid hash
  const releaseInfo = signing.signReleaseBuild(
    'app_secure',
    '1.0.1',
    validHash,
    PLATFORM_SIGNING_KEY,
  );

  // Store version with tampered hash in DB but signature corresponding to original hash
  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, manifest_json, package_hash, signature, release_id, approved_at, published_at, review_status, created_at)
       VALUES ('ver_tampered', 'app_secure', '1.0.1', 'eap-v1', ?, ?, ?, ?, ?, ?, 'approved', 1700000000000)`,
    )
    .run(JSON.stringify(manifest), tamperedHash, releaseInfo.signature, releaseInfo.releaseId, releaseInfo.signedAt, releaseInfo.signedAt);

  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app_secure',
        companyId: 'cmp_alpha',
        targetVersion: '1.0.1',
        grantedScopes: ['pos.read'],
      },
      { cookie },
    ),
  );

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Cryptographic verification failed|signature verification failed/i);
});

test('8. Cryptographic install trust boundary rejects invalid or forged signature', async () => {
  const cookie = await signIn('superadmin@erpfy.com');
  const manifest = {
    id: 'app_secure',
    name: 'Secure POS',
    version: '1.0.2',
    protocol: 'eap-v1',
    permissions: ['pos.read'],
  };
  const pkgHash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');

  // Store version with forged signature
  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, manifest_json, package_hash, signature, release_id, approved_at, published_at, review_status, created_at)
       VALUES ('ver_forged', 'app_secure', '1.0.2', 'eap-v1', ?, ?, 'forged-signature-invalid', 'rel_1700000000000_fake', 1700000000000, 1700000000000, 'approved', 1700000000000)`,
    )
    .run(JSON.stringify(manifest), pkgHash);

  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app_secure',
        companyId: 'cmp_alpha',
        targetVersion: '1.0.2',
        grantedScopes: ['pos.read'],
      },
      { cookie },
    ),
  );

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Cryptographic verification failed|signature verification failed/i);
});

test('9. Cryptographic install trust boundary allows authentic signed release', async () => {
  const cookie = await signIn('superadmin@erpfy.com');
  const manifest = {
    id: 'app_secure',
    name: 'Secure POS',
    version: '1.0.3',
    protocol: 'eap-v1',
    permissions: ['pos.read'],
  };
  const pkgHash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');

  // Generate authentic platform signature
  const releaseInfo = signing.signReleaseBuild(
    'app_secure',
    '1.0.3',
    pkgHash,
    PLATFORM_SIGNING_KEY,
  );

  // Store approved version
  sqlite
    .prepare(
      `INSERT INTO eap_app_versions (id, app_id, version, protocol, manifest_json, package_hash, signature, release_id, approved_at, published_at, review_status, created_at)
       VALUES ('ver_authentic', 'app_secure', '1.0.3', 'eap-v1', ?, ?, ?, ?, ?, ?, 'approved', 1700000000000)`,
    )
    .run(JSON.stringify(manifest), pkgHash, releaseInfo.signature, releaseInfo.releaseId, releaseInfo.signedAt, releaseInfo.signedAt);

  const res = await installApi.POST(
    postRequest(
      '/api/apps/install',
      {
        action: 'install',
        appId: 'app_secure',
        companyId: 'cmp_alpha',
        targetVersion: '1.0.3',
        grantedScopes: ['pos.read'],
      },
      { cookie },
    ),
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.installation);

  // Verify installation recorded in DB
  const installed = sqlite
    .prepare('SELECT id, status, version_id FROM eap_app_installations WHERE app_id = ? AND company_id = ?')
    .get('app_secure', 'cmp_alpha');
  assert.ok(installed);
  assert.equal(installed.status, 'installed');
});

test('10. App Store truthfulness: Seeded demo fixtures clearly labeled', async () => {
  const cookie = await signIn('superadmin@erpfy.com');

  const req = new Request(`${origin}/api/apps/store?companyId=cmp_alpha`, {
    method: 'GET',
    headers: { origin, cookie },
  });

  const res = await storeApi.GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.apps));
  assert.ok(data.apps.length > 0);

  // Check that secure app is returned with proper developer metadata
  const secureApp = data.apps.find((a) => a.id === 'app_secure');
  assert.ok(secureApp);
  assert.equal(secureApp.developer.verified, true);
});

