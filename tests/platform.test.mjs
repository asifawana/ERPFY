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
/**
 * Encryption key material for the tests, mirroring `.dev.vars` in a real deployment.
 * A test that unsets it is asserting the refusal path, not the happy path.
 */
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
const logout = await route('app/api/auth/logout/route.ts');
const accountSettings = await route('app/api/account/settings/route.ts');
const companies = await route('app/api/companies/route.ts');
const checkSlug = await route('app/api/companies/check-slug/route.ts');
const company = await route('app/api/companies/[companyId]/route.ts');
const openCompany = await route('app/api/companies/[companyId]/open/route.ts');
const settings = await route('app/api/settings/route.ts');
const authorization = await route('lib/core/authorization.ts');
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

function getRequest(path, cookie = '', headers = {}) {
  return new Request(`${origin}${path}`, {
    headers: { ...(cookie ? { cookie } : {}), ...headers },
  });
}

const companyContext = (companyId) => ({
  params: Promise.resolve({ companyId }),
});

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
    readFileSync('drizzle/0002_onboarding.sql', 'utf8').replaceAll(
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
      `INSERT INTO core_credentials
        (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run('account-a', passwordHash(password), now);
  sqlite
    .prepare(
      `INSERT INTO core_accounts
        (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'account-b',
      'outsider@example.test',
      'Outsider',
      'UTC',
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
    .run('account-b', passwordHash(password), now);

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
  insertCompany.run(
    'company-b',
    'Company B',
    'company-b',
    'GB',
    'GBP',
    'Europe/London',
    now + 86_400_000,
    now,
    'account-b',
    'company-b',
  );
  sqlite
    .prepare(
      `INSERT INTO core_memberships
        (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES (?, ?, 'owner', 'active', '', ?)`,
    )
    .run('company-a', 'account-a', now);
  sqlite
    .prepare(
      `INSERT INTO core_memberships
        (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES (?, ?, 'owner', 'active', '', ?)`,
    )
    .run('company-b', 'account-b', now);
});

test('login requires an exact same-origin JSON request', async () => {
  const crossOrigin = request(
    '/api/auth/login',
    { email: 'owner@example.test', password },
    { origin: 'https://attacker.test' },
  );
  assert.equal((await login.POST(crossOrigin)).status, 403);

  const wrongType = request(
    '/api/auth/login',
    { email: 'owner@example.test', password },
    { 'content-type': 'text/plain' },
  );
  assert.equal((await login.POST(wrongType)).status, 415);
});

test('valid credentials create an opaque, secure session and an audit event', async () => {
  const response = await login.POST(
    request('/api/auth/login', { email: 'OWNER@example.test', password }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    signedIn: true,
    secondFactorRequired: false,
  });

  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^erpfy_session=[^;]+;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) AS count FROM core_sessions').get().count,
    1,
  );
  assert.equal(
    sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM core_activity_events WHERE action='auth.signin.succeeded'",
      )
      .get().count,
    1,
  );
});

test('wrong credentials stay generic and record the failed attempt', async () => {
  const known = await login.POST(
    request('/api/auth/login', {
      email: 'owner@example.test',
      password: 'wrong-password-value',
    }),
  );
  const unknown = await login.POST(
    request('/api/auth/login', {
      email: 'missing@example.test',
      password: 'wrong-password-value',
    }),
  );

  assert.equal(known.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(
    sqlite
      .prepare(
        'SELECT failed_attempts FROM core_credentials WHERE account_id=?',
      )
      .get('account-a').failed_attempts,
    1,
  );
  assert.equal(
    sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM core_activity_events WHERE action='auth.signin.failed'",
      )
      .get().count,
    1,
  );
});

test('logout revokes the current session and clears its cookie', async () => {
  const signedIn = await login.POST(
    request('/api/auth/login', { email: 'owner@example.test', password }),
  );
  const sessionCookie = signedIn.headers.get('set-cookie').split(';', 1)[0];

  const response = await logout.POST(
    request('/api/auth/logout', {}, { cookie: sessionCookie }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { signedOut: true });
  assert.match(response.headers.get('set-cookie'), /^erpfy_session=;/);
  assert.notEqual(
    sqlite.prepare('SELECT revoked_at FROM core_sessions').get().revoked_at,
    null,
  );
});

test('hosting identity headers cannot create an account or session', async () => {
  const response = await logout.POST(
    request(
      '/api/auth/logout',
      {},
      {
        'oai-authenticated-user-id': 'spoofed-user',
        'oai-authenticated-user-email': 'spoofed@example.test',
      },
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(
    sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM core_accounts WHERE id='spoofed-user'",
      )
      .get().count,
    0,
  );
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) AS count FROM core_sessions').get().count,
    0,
  );
});

test('account settings require a session, same origin and a valid timezone', async () => {
  const values = {
    displayName: 'Portal Owner',
    timezone: 'Asia/Karachi',
    emailAccountActivity: true,
    emailSecurityAlerts: true,
    emailBillingNotices: false,
    emailProductUpdates: false,
  };
  assert.equal(
    (await accountSettings.POST(request('/api/account/settings', values)))
      .status,
    401,
  );

  const ownerCookie = await signIn();
  assert.equal(
    (
      await accountSettings.POST(
        request('/api/account/settings', values, {
          cookie: ownerCookie,
          origin: 'https://attacker.test',
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await accountSettings.POST(
        request(
          '/api/account/settings',
          { ...values, timezone: 'Not/A-Timezone' },
          { cookie: ownerCookie },
        ),
      )
    ).status,
    400,
  );
});

test('account settings save personal, regional and notification preferences atomically', async () => {
  const ownerCookie = await signIn();
  const response = await accountSettings.POST(
    request(
      '/api/account/settings',
      {
        displayName: 'Portal Owner',
        timezone: 'Asia/Dubai',
        emailAccountActivity: false,
        emailSecurityAlerts: true,
        emailBillingNotices: false,
        emailProductUpdates: true,
      },
      { cookie: ownerCookie },
    ),
  );
  assert.equal(response.status, 200);

  const account = sqlite
    .prepare(
      'SELECT display_name, timezone, email FROM core_accounts WHERE id=?',
    )
    .get('account-a');
  assert.deepEqual(
    {
      displayName: account.display_name,
      timezone: account.timezone,
      email: account.email,
    },
    {
      displayName: 'Portal Owner',
      timezone: 'Asia/Dubai',
      email: 'owner@example.test',
    },
  );
  const preferences = sqlite
    .prepare(
      `SELECT email_account_activity, email_security_alerts,
              email_billing_notices, email_product_updates
         FROM core_account_preferences WHERE account_id=?`,
    )
    .get('account-a');
  assert.deepEqual(
    {
      activity: preferences.email_account_activity,
      security: preferences.email_security_alerts,
      billing: preferences.email_billing_notices,
      updates: preferences.email_product_updates,
    },
    { activity: 0, security: 1, billing: 0, updates: 1 },
  );
  assert.equal(
    sqlite
      .prepare(
        "SELECT COUNT(*) AS count FROM core_activity_events WHERE action='account.settings.updated'",
      )
      .get().count,
    1,
  );
});

test('company collection lists only active memberships', async () => {
  assert.equal((await companies.GET(getRequest('/api/companies'))).status, 401);

  const ownerCookie = await signIn();
  const response = await companies.GET(
    getRequest('/api/companies', ownerCookie),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(
    payload.companies.map((item) => item.id),
    ['company-a'],
  );
  assert.equal(payload.companies[0].role, 'owner');
});

test('foreign company reads return the same 404 as a missing company', async () => {
  const ownerCookie = await signIn();
  const foreign = await company.GET(
    getRequest('/api/companies/company-b', ownerCookie),
    companyContext('company-b'),
  );
  const missing = await company.GET(
    getRequest('/api/companies/missing', ownerCookie),
    companyContext('missing'),
  );

  assert.equal(foreign.status, 404);
  assert.equal(missing.status, 404);
  assert.deepEqual(await foreign.json(), await missing.json());
});

test('opening an ERP records only an explicitly authorized company visit', async () => {
  const ownerCookie = await signIn();
  const opened = await openCompany.POST(
    request('/api/companies/company-a/open', {}, { cookie: ownerCookie }),
    companyContext('company-a'),
  );
  assert.equal(opened.status, 200);

  const denied = await openCompany.POST(
    request('/api/companies/company-b/open', {}, { cookie: ownerCookie }),
    companyContext('company-b'),
  );
  assert.equal(denied.status, 404);

  const visits = sqlite
    .prepare(
      'SELECT account_id, company_id FROM core_company_visits ORDER BY company_id',
    )
    .all()
    .map((row) => ({ account_id: row.account_id, company_id: row.company_id }));
  assert.deepEqual(visits, [
    { account_id: 'account-a', company_id: 'company-a' },
  ]);
});

test('settings require a session', async () => {
  assert.equal((await settings.GET(getRequest('/api/settings'))).status, 401);
  assert.equal(
    (await settings.POST(request('/api/settings', { settings: {} }))).status,
    401,
  );
});

test('personal preferences save without a company in context', async () => {
  const cookie = await signIn();
  const response = await settings.POST(
    request(
      '/api/settings',
      { settings: { tableDensity: 'compact' } },
      { cookie },
    ),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.settings.tableDensity, 'compact');
  assert.equal(payload.company, null);

  const stored = sqlite
    .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
    .get('account-a');
  assert.equal(JSON.parse(stored.data).tableDensity, 'compact');
});

test('a business setting is refused rather than dropped when no ERP is open', async () => {
  const cookie = await signIn();
  const response = await settings.POST(
    request('/api/settings', { settings: { prefixSales: 'SL-' } }, { cookie }),
  );
  assert.equal(response.status, 400);
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) AS n FROM core_company_settings').get().n,
    0,
  );
});

test('business settings save onto the company, not the account', async () => {
  const cookie = await signIn();
  const logoDataUrl = 'data:image/png;base64,aGVsbG8=';
  const response = await settings.POST(
    request(
      '/api/settings',
      {
        companyId: 'company-a',
        settings: {
          companyName: 'Company A Trading',
          companyPhone: '+92 300 1234567',
          companyEmail: 'hello@companya.test',
          companyAddress: 'Lahore, Pakistan',
          companyFooter: 'Company A — trusted commerce.',
          companyDevelopedBy: 'ERPFY',
          companyLogoDataUrl: logoDataUrl,
          sidebarLogoWidth: 44,
          sidebarLogoHeight: 38,
          showSidebarLogo: true,
          showSidebarCompanyName: false,
          defaultLanguage: 'ur',
          defaultCurrency: 'PKR',
          companyTimezone: 'Asia/Karachi',
          dateFormat: 'DD/MM/YYYY',
          priceFormat: '1,234.56',
          showLanguages: true,
          darkMode: true,
          rtl: true,
          prefixSales: 'SL-',
          tableDensity: 'compact',
        },
      },
      { cookie },
    ),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();

  const companyDoc = JSON.parse(
    sqlite
      .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
      .get('company-a').data,
  );
  const accountDoc = JSON.parse(
    sqlite
      .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
      .get('account-a').data,
  );

  assert.equal(companyDoc.prefixSales, 'SL-');
  assert.equal(companyDoc.companyPhone, '+92 300 1234567');
  assert.equal(companyDoc.companyEmail, 'hello@companya.test');
  assert.equal(companyDoc.companyAddress, 'Lahore, Pakistan');
  assert.equal(companyDoc.companyFooter, 'Company A — trusted commerce.');
  assert.equal(companyDoc.companyDevelopedBy, 'ERPFY');
  assert.equal(companyDoc.companyLogoDataUrl, logoDataUrl);
  assert.equal(companyDoc.sidebarLogoWidth, 44);
  assert.equal(companyDoc.sidebarLogoHeight, 38);
  assert.equal(companyDoc.showSidebarLogo, true);
  assert.equal(companyDoc.showSidebarCompanyName, false);
  assert.equal(companyDoc.defaultLanguage, 'ur');
  assert.equal(companyDoc.defaultCurrency, 'PKR');
  assert.equal(companyDoc.companyTimezone, 'Asia/Karachi');
  assert.equal(companyDoc.dateFormat, 'DD/MM/YYYY');
  assert.equal(companyDoc.priceFormat, '1,234.56');
  assert.equal(companyDoc.showLanguages, true);
  assert.equal(companyDoc.darkMode, true);
  assert.equal(companyDoc.rtl, true);
  assert.equal(companyDoc.tableDensity, undefined);
  assert.equal(accountDoc.tableDensity, 'compact');
  assert.equal(accountDoc.prefixSales, undefined);
  assert.equal(payload.settings.companyName, 'Company A Trading');
  const companyRegional = sqlite
    .prepare(
      'SELECT name, currency, timezone, language FROM core_companies WHERE id = ?',
    )
    .get('company-a');
  assert.deepEqual(
    { ...companyRegional },
    {
      name: 'Company A Trading',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      language: 'ur',
    },
  );
});

test("another company's settings are unreachable", async () => {
  const cookie = await signIn();
  assert.equal(
    (
      await settings.GET(
        getRequest('/api/settings?companyId=company-b', cookie),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await settings.POST(
        request(
          '/api/settings',
          { companyId: 'company-b', settings: { prefixSales: 'X-' } },
          { cookie },
        ),
      )
    ).status,
    404,
  );
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) AS n FROM core_company_settings').get().n,
    0,
  );
});

test('a credential is stored encrypted and never returned', async () => {
  const cookie = await signIn();
  const response = await settings.POST(
    request(
      '/api/settings',
      {
        companyId: 'company-a',
        settings: { stripeSecretKey: 'sk_live_secret_value' },
      },
      { cookie },
    ),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();

  // The response must not carry the value back, in any field.
  assert.equal(payload.settings.stripeSecretKey, '');
  assert.ok(!JSON.stringify(payload).includes('sk_live_secret_value'));
  assert.equal(payload.secrets.stripeSecretKey.configured, true);

  const row = sqlite
    .prepare(
      'SELECT cipher FROM core_company_secrets WHERE company_id = ? AND name = ?',
    )
    .get('company-a', 'stripeSecretKey');
  assert.ok(row.cipher.length > 0);
  assert.ok(!row.cipher.includes('sk_live_secret_value'));

  // The plaintext must not reach the settings document or the audit trail either.
  const doc = sqlite
    .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
    .get('company-a');
  assert.ok(!(doc?.data ?? '').includes('sk_live_secret_value'));
  const audit = sqlite
    .prepare(
      "SELECT detail FROM core_activity_events WHERE action = 'settings.updated'",
    )
    .all();
  assert.ok(
    audit.every((event) => !event.detail.includes('sk_live_secret_value')),
  );
});

test('Pakistani payment methods save company configuration and encrypt credentials', async () => {
  const cookie = await signIn();
  const response = await settings.POST(
    request(
      '/api/settings',
      {
        companyId: 'company-a',
        settings: {
          easypaisaEnabled: true,
          easypaisaStoreId: 'EP-STORE-101',
          easypaisaHashKey: 'easypaisa-private-hash',
          jazzcashEnabled: true,
          jazzcashMerchantId: 'JC-MERCHANT-202',
          jazzcashPassword: 'jazzcash-private-password',
          jazzcashIntegritySalt: 'jazzcash-private-salt',
          jazzcashMode: 'live',
          offlineBankTransferEnabled: true,
          offlineBankDetails:
            'Meezan Bank\nAccount title: Company A\nIBAN: PK00TEST',
        },
      },
      { cookie },
    ),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.settings.easypaisaEnabled, true);
  assert.equal(payload.settings.easypaisaStoreId, 'EP-STORE-101');
  assert.equal(payload.settings.jazzcashEnabled, true);
  assert.equal(payload.settings.jazzcashMerchantId, 'JC-MERCHANT-202');
  assert.equal(payload.settings.jazzcashMode, 'live');
  assert.equal(payload.settings.offlineBankTransferEnabled, true);
  assert.equal(payload.settings.easypaisaHashKey, '');
  assert.equal(payload.settings.jazzcashPassword, '');
  assert.equal(payload.settings.jazzcashIntegritySalt, '');
  assert.equal(payload.secrets.easypaisaHashKey.configured, true);
  assert.equal(payload.secrets.jazzcashPassword.configured, true);
  assert.equal(payload.secrets.jazzcashIntegritySalt.configured, true);

  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes('easypaisa-private-hash'));
  assert.ok(!serialized.includes('jazzcash-private-password'));
  assert.ok(!serialized.includes('jazzcash-private-salt'));

  const companyDoc = sqlite
    .prepare('SELECT data FROM core_company_settings WHERE company_id = ?')
    .get('company-a').data;
  assert.ok(companyDoc.includes('EP-STORE-101'));
  assert.ok(companyDoc.includes('JC-MERCHANT-202'));
  assert.ok(companyDoc.includes('PK00TEST'));
  assert.ok(!companyDoc.includes('private'));

  const storedSecrets = sqlite
    .prepare(
      'SELECT name, cipher FROM core_company_secrets WHERE company_id = ? ORDER BY name',
    )
    .all('company-a');
  assert.deepEqual(
    storedSecrets.map((row) => row.name),
    ['easypaisaHashKey', 'jazzcashIntegritySalt', 'jazzcashPassword'],
  );
  assert.ok(
    storedSecrets.every(
      (row) => row.cipher.length > 0 && !row.cipher.includes('private'),
    ),
  );
});

test('re-saving a masked form does not erase a stored credential', async () => {
  const cookie = await signIn();
  await settings.POST(
    request(
      '/api/settings',
      {
        companyId: 'company-a',
        settings: { stripeSecretKey: 'sk_live_secret_value' },
      },
      { cookie },
    ),
  );
  // The form always posts an empty string for a secret it never received.
  const response = await settings.POST(
    request(
      '/api/settings',
      {
        companyId: 'company-a',
        settings: { stripeSecretKey: '', prefixSales: 'SL-' },
      },
      { cookie },
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(
    (await response.json()).secrets.stripeSecretKey.configured,
    true,
  );
});

test('a member without a settings role cannot change company settings', async () => {
  sqlite
    .prepare(
      'UPDATE core_memberships SET role = ? WHERE company_id = ? AND account_id = ?',
    )
    .run('member', 'company-a', 'account-a');

  const cookie = await signIn();
  const read = await settings.GET(
    getRequest('/api/settings?companyId=company-a', cookie),
  );
  assert.equal(read.status, 200);
  assert.equal((await read.json()).company.canEdit, false);

  const write = await settings.POST(
    request(
      '/api/settings',
      { companyId: 'company-a', settings: { prefixSales: 'SL-' } },
      { cookie },
    ),
  );
  assert.equal(write.status, 403);
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) AS n FROM core_company_settings').get().n,
    0,
  );
});

test('unknown keys in a settings payload are discarded', async () => {
  const cookie = await signIn();
  const response = await settings.POST(
    request(
      '/api/settings',
      {
        settings: {
          tableDensity: 'compact',
          isPlatformAdmin: true,
          __proto__: { x: 1 },
        },
      },
      { cookie },
    ),
  );
  assert.equal(response.status, 200);
  const stored = JSON.parse(
    sqlite
      .prepare('SELECT data FROM core_account_settings WHERE account_id = ?')
      .get('account-a').data,
  );
  assert.equal(stored.isPlatformAdmin, undefined);
});

test('login devices come from real sessions', async () => {
  const cookie = await signIn();
  const response = await settings.GET(getRequest('/api/settings', cookie));
  const payload = await response.json();

  const sessionCount = sqlite
    .prepare('SELECT COUNT(*) AS n FROM core_sessions WHERE account_id = ?')
    .get('account-a').n;
  assert.equal(payload.settings.loginDevices.length, sessionCount);
  assert.equal(
    payload.settings.loginDevices.filter((device) => device.current).length,
    1,
  );
});

test('permissions default deny and legacy grants are deliberately narrow', async () => {
  const view = await authorization.authorize(
    db,
    'account-a',
    'company-a',
    'settings.view',
  );
  assert.equal(view.allowed, true);
  assert.equal(view.source, 'legacy');

  const unknown = await authorization.authorize(
    db,
    'account-a',
    'company-a',
    'customers.export',
  );
  assert.equal(unknown.allowed, false);
  assert.equal(unknown.source, 'default-deny');
});

test('relational role grants replace legacy role-name authority', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      'INSERT INTO core_permissions (key, description, created_at) VALUES (?, ?, ?)',
    )
    .run('settings.view', 'View company settings', now);
  sqlite
    .prepare(
      `INSERT INTO core_roles (id, company_id, key, name, is_system, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
    )
    .run('role-auditor', 'company-a', 'auditor', 'Auditor', now);
  sqlite
    .prepare(
      `INSERT INTO core_membership_roles
       (company_id, account_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run('company-a', 'account-a', 'role-auditor', now, 'account-a');

  const denied = await authorization.authorize(
    db,
    'account-a',
    'company-a',
    'settings.manage',
  );
  assert.equal(denied.allowed, false);
  assert.equal(denied.source, 'default-deny');

  sqlite
    .prepare(
      `INSERT INTO core_role_permissions (role_id, permission_key, effect, scope)
       VALUES (?, ?, 'allow', 'COMPANY')`,
    )
    .run('role-auditor', 'settings.view');
  const allowed = await authorization.authorize(
    db,
    'account-a',
    'company-a',
    'settings.view',
  );
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.source, 'role');
  assert.equal(allowed.scope, 'COMPANY');
});

test('branch scope denies until a valid active branch is assigned', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      'INSERT INTO core_permissions (key, description, created_at) VALUES (?, ?, ?)',
    )
    .run('reports.view', 'View reports', now);
  sqlite
    .prepare(
      `INSERT INTO core_roles (id, company_id, key, name, is_system, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    )
    .run('role-branch', 'company-a', 'branch-viewer', 'Branch viewer', now);
  sqlite
    .prepare(
      `INSERT INTO core_membership_roles
       (company_id, account_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run('company-a', 'account-a', 'role-branch', now, 'account-a');
  sqlite
    .prepare(
      `INSERT INTO core_role_permissions (role_id, permission_key, effect, scope)
       VALUES (?, ?, 'allow', 'BRANCH')`,
    )
    .run('role-branch', 'reports.view');

  assert.equal(
    (
      await authorization.authorize(
        db,
        'account-a',
        'company-a',
        'reports.view',
      )
    ).allowed,
    false,
  );

  sqlite
    .prepare(
      `INSERT INTO core_branches
       (id, company_id, code, name, status, is_main, created_at)
       VALUES (?, ?, ?, ?, 'active', 1, ?)`,
    )
    .run('branch-a', 'company-a', 'MAIN', 'Main branch', now);
  sqlite
    .prepare(
      `INSERT INTO core_membership_branches
       (company_id, account_id, branch_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run('company-a', 'account-a', 'branch-a', now, 'account-a');

  const allowed = await authorization.authorize(
    db,
    'account-a',
    'company-a',
    'reports.view',
  );
  assert.equal(allowed.allowed, true);
  assert.deepEqual(allowed.branchIds, ['branch-a']);
});

test('an explicit user deny overrides role allow', async () => {
  const now = Date.now();
  sqlite
    .prepare(
      'INSERT INTO core_permissions (key, description, created_at) VALUES (?, ?, ?)',
    )
    .run('reports.export', 'Export reports', now);
  sqlite
    .prepare(
      `INSERT INTO core_roles (id, company_id, key, name, is_system, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    )
    .run('role-export', 'company-a', 'exporter', 'Exporter', now);
  sqlite
    .prepare(
      `INSERT INTO core_membership_roles
       (company_id, account_id, role_id, assigned_at, assigned_by)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run('company-a', 'account-a', 'role-export', now, 'account-a');
  sqlite
    .prepare(
      `INSERT INTO core_role_permissions (role_id, permission_key, effect, scope)
       VALUES (?, ?, 'allow', 'COMPANY')`,
    )
    .run('role-export', 'reports.export');
  sqlite
    .prepare(
      `INSERT INTO core_permission_overrides
       (company_id, account_id, permission_key, effect, scope, updated_at, updated_by)
       VALUES (?, ?, ?, 'deny', 'COMPANY', ?, ?)`,
    )
    .run('company-a', 'account-a', 'reports.export', now, 'account-a');

  const result = await authorization.authorize(
    db,
    'account-a',
    'company-a',
    'reports.export',
  );
  assert.equal(result.allowed, false);
  assert.equal(result.source, 'override');
});
test('check-slug API identifies valid, taken, and reserved ERP handles', async () => {
  const cookie = await signIn();

  // Reserved slug
  const reservedRes = await checkSlug.GET(
    getRequest('/api/companies/check-slug?slug=admin', cookie),
  );
  assert.equal(reservedRes.status, 200);
  const reservedData = await reservedRes.json();
  assert.equal(reservedData.available, false);
  assert.ok(reservedData.reason?.includes('reserved'));

  // Taken slug
  const takenRes = await checkSlug.GET(
    getRequest('/api/companies/check-slug?slug=company-a', cookie),
  );
  assert.equal(takenRes.status, 200);
  const takenData = await takenRes.json();
  assert.equal(takenData.available, false);
  assert.ok(takenData.reason?.includes('already taken'));

  // Valid new slug
  const validRes = await checkSlug.GET(
    getRequest('/api/companies/check-slug?slug=acme-industrial', cookie),
  );
  assert.equal(validRes.status, 200);
  const validData = await validRes.json();
  assert.equal(validData.available, true);
  assert.equal(validData.slug, 'acme-industrial');
});

test('provisions a new ERP company idempotently with owner membership and 14-day trial', async () => {
  const cookie = await signIn();
  const requestKey = 'test-idempotency-key-' + Date.now();

  const payload = {
    name: 'Prime Distribution Global',
    slug: 'prime-distribution-global',
    countryCode: 'PK',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    language: 'en',
    sectorSlug: 'retail-wholesale',
    industrySlug: 'wholesale-trade',
    businessModels: ['B2B (Business to Business)', 'Wholesale & Distribution'],
    employeeBand: '21–50 employees',
    branchCount: 3,
    requestKey,
  };

  const response = await companies.POST(
    request('/api/companies', payload, { cookie }),
  );
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.company.name, 'Prime Distribution Global');
  assert.equal(body.company.slug, 'prime-distribution-global');
  assert.equal(body.company.role, 'owner');
  assert.equal(body.company.state, 'trial');
  assert.ok(body.company.trialDaysLeft >= 13);

  // Verify stored records in SQLite
  const storedCompany = sqlite
    .prepare('SELECT * FROM core_companies WHERE slug = ?')
    .get('prime-distribution-global');
  assert.ok(storedCompany);
  assert.equal(storedCompany.name, 'Prime Distribution Global');
  assert.equal(storedCompany.country_code, 'PK');
  assert.equal(storedCompany.currency, 'PKR');
  assert.equal(storedCompany.created_by, 'account-a');

  // Verify owner membership
  const membership = sqlite
    .prepare('SELECT * FROM core_memberships WHERE company_id = ? AND account_id = ?')
    .get(storedCompany.id, 'account-a');
  assert.ok(membership);
  assert.equal(membership.role, 'owner');
  assert.equal(membership.status, 'active');

  // Idempotency: Re-submitting with the same requestKey must return the existing company
  const dupResponse = await companies.POST(
    request('/api/companies', payload, { cookie }),
  );
  assert.equal(dupResponse.status, 201);
  const dupBody = await dupResponse.json();
  assert.equal(dupBody.company.id, body.company.id);

  // Multi-ERP: The new company immediately appears in the user's workspace list
  const listResponse = await companies.GET(
    getRequest('/api/companies', cookie),
  );
  assert.equal(listResponse.status, 200);
  const listBody = await listResponse.json();
  const found = listBody.companies.find((c) => c.slug === 'prime-distribution-global');
  assert.ok(found);
  assert.equal(found.role, 'owner');

  // Duplicate slug with DIFFERENT requestKey should be rejected with 409 Conflict
  const conflictResponse = await companies.POST(
    request(
      '/api/companies',
      { ...payload, requestKey: 'different-request-key-xyz' },
      { cookie },
    ),
  );
  assert.equal(conflictResponse.status, 409);
});

test('accepting an invitation creates membership and marks invitation accepted', async () => {
  const cookie = await signIn('owner@example.test');
  const respondRoute = await route(
    'app/api/account/invitations/[invitationId]/respond/route.ts',
  );

  // Insert test company and invitation for account-a
  const companyId = 'comp-inv-test-1';
  const invitationId = 'inv-12345';
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO core_companies (id, name, slug, country_code, currency, timezone, language, plan, state, trial_ends_at, onboarding_state, created_at, created_by, request_key)
       VALUES (?, ?, ?, 'PK', 'PKR', 'Asia/Karachi', 'en', 'starter', 'active', ?, 'completed', ?, 'account-b', ?)`,
    )
    .run(companyId, 'Invitation Test Corp', 'inv-test-corp', now + 86400000, now, 'req-inv-1');

  sqlite
    .prepare(
      `INSERT INTO core_invitations (id, company_id, email, role, status, invited_by, message, created_at, expires_at)
       VALUES (?, ?, 'owner@example.test', 'administrator', 'pending', 'account-b', 'Welcome!', ?, ?)`,
    )
    .run(invitationId, companyId, now, now + 86400000);

  // Accept invitation
  const res = await respondRoute.POST(
    request(
      `/api/account/invitations/${invitationId}/respond`,
      { action: 'accept' },
      { cookie },
    ),
    { params: Promise.resolve({ invitationId }) },
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.action, 'accepted');

  // Verify membership was created
  const member = sqlite
    .prepare('SELECT * FROM core_memberships WHERE company_id = ? AND account_id = ?')
    .get(companyId, 'account-a');
  assert.ok(member);
  assert.equal(member.role, 'administrator');
  assert.equal(member.status, 'active');

  // Verify invitation status updated to accepted
  const inv = sqlite
    .prepare('SELECT status FROM core_invitations WHERE id = ?')
    .get(invitationId);
  assert.equal(inv.status, 'accepted');
});
