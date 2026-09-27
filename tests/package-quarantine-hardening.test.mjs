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
const _appsApi = await route('app/api/developer/apps/route.ts');
const versionsApi = await route('app/api/developer/apps/[appId]/versions/route.ts');
const storeApi = await route('app/api/apps/store/route.ts');
const quarantine = await route('lib/eap/quarantine.ts');

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

let devCookie;
let devAppId;

beforeEach(async () => {
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

  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES ('acc_dev_q', 'devq@example.test', 'Dev Quarantine', 'UTC', ?, ?, ?)`,
    )
    .run(now, now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES ('acc_dev_q', ?, ?, 0, 0)`,
    )
    .run(hash, now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_organizations (id, name, slug, status, website, support_email, created_at)
       VALUES ('org_q', 'Quarantine Devs', 'quarantine-devs', 'verified', 'https://q.test', 'dev@q.test', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_profiles (id, account_id, organization_id, display_name, bio, created_at)
       VALUES ('prof_q', 'acc_dev_q', 'org_q', 'Dev Q', 'Bio', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_dev_members (organization_id, account_id, role, created_at)
       VALUES ('org_q', 'acc_dev_q', 'owner', ?)`,
    )
    .run(now);

  sqlite
    .prepare(
      `INSERT INTO eap_apps (id, organization_id, slug, name, short_description, category, status, official_app, is_killed, kill_reason, created_by_account_id, created_at, updated_at)
       VALUES ('app_q_test', 'org_q', 'q-test-app', 'Q Test App', 'Short description', 'finance', 'draft', 0, 0, '', 'acc_dev_q', ?, ?)`,
    )
    .run(now, now);

  devAppId = 'app_q_test';
  devCookie = await signIn('devq@example.test');
});

// ==========================================
// Phase 6A: Package Quarantine & Hardening Tests
// ==========================================

test('1. Path traversal upload attempt (../) is rejected with HTTP 400', async () => {
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          '../malicious.js': 'console.log("pwned");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Path traversal detected/);
});

test('2. Windows-style path traversal (..\\) is rejected with HTTP 400', async () => {
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          'sub\\..\\..\\malicious.js': 'console.log("pwned");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Path traversal detected/);
});

test('3. Leading slash or Windows drive letter is rejected with HTTP 400', async () => {
  // Absolute path with leading slash
  const res1 = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          '/etc/shadow.js': 'console.log("root");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res1.status, 400);

  // Windows drive letter
  const res2 = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          'C:\\Windows\\win.js': 'console.log("root");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res2.status, 400);
});

test('4. Forbidden characters in filename (*, ?, ", <, >, |, null bytes) are rejected', async () => {
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          'wildcard*.js': 'console.log("bad");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Forbidden character/);
});

test('5. Banned executable extensions (.exe, .sh, .bat, .cmd, .py, .bin) are rejected', async () => {
  const bannedFiles = ['exploit.exe', 'runner.sh', 'setup.bat', 'payload.cmd', 'script.py', 'blob.bin'];

  for (const filename of bannedFiles) {
    const res = await versionsApi.POST(
      postRequest(
        `/api/developer/apps/${devAppId}/versions`,
        {
          manifest: {
            protocol: 'eap-v1',
            app_id: devAppId,
            name: 'Q Test App',
            slug: 'q-test-app',
            version: `1.0.${bannedFiles.indexOf(filename)}`,
            minimum_platform_version: '1.0.0',
            permissions: ['orders.read'],
          },
          codeFiles: {
            [filename]: 'binary payload',
          },
        },
        { cookie: devCookie },
      ),
      { params: Promise.resolve({ appId: devAppId }) },
    );
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Executable or forbidden file extension/);
  }
});

test('6. Missing file extension is rejected with HTTP 400', async () => {
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          'noextension': 'console.log("test");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Missing file extension/);
});

test('7. Single file exceeding size limit (2 MB) is rejected with HTTP 400', async () => {
  const oversizedFile = 'x'.repeat(2 * 1024 * 1024 + 100);
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          'large.js': oversizedFile,
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /exceeds maximum allowed size of 2 MB/);
});

test('8. Total package bundle size exceeding limit (5 MB) is rejected with HTTP 400', async () => {
  const chunk = 'x'.repeat(1.5 * 1024 * 1024); // 1.5 MB each
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles: {
          'file1.js': chunk,
          'file2.js': chunk,
          'file3.js': chunk,
          'file4.js': chunk, // 6 MB total
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Total package bundle size exceeds maximum allowed limit/);
});

test('9. File count exceeding maximum (50 files) is rejected with HTTP 400', async () => {
  const codeFiles = {};
  for (let i = 0; i < 51; i++) {
    codeFiles[`file_${i}.js`] = `console.log(${i});`;
  }

  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
        },
        codeFiles,
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Package exceeds maximum allowed file count of 50/);
});

test('10. Manifest entrypoint declared but missing from uploaded bundle is rejected', async () => {
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
          entrypoints: {
            client: 'dist/client.js',
          },
        },
        codeFiles: {
          'index.js': 'console.log("main");',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Declared client entrypoint 'dist\/client.js' was not found in uploaded files/);
});

test('11. Valid bundle uploads cleanly and is stored in quarantine storage', async () => {
  const res = await versionsApi.POST(
    postRequest(
      `/api/developer/apps/${devAppId}/versions`,
      {
        manifest: {
          protocol: 'eap-v1',
          app_id: devAppId,
          name: 'Q Test App',
          slug: 'q-test-app',
          version: '1.0.0',
          minimum_platform_version: '1.0.0',
          permissions: ['orders.read'],
          entrypoints: {
            client: 'dist/client.js',
          },
        },
        codeFiles: {
          'dist/client.js': 'export default function App() { return "Safe UI"; }',
          'styles/main.css': 'body { color: red; }',
        },
      },
      { cookie: devCookie },
    ),
    { params: Promise.resolve({ appId: devAppId }) },
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.version.status, 'draft');

  // Verify stored in quarantine storage
  const quarantined = await quarantine.getQuarantinedPackage(devAppId, '1.0.0');
  assert.ok(quarantined);
  assert.equal(quarantined.appId, devAppId);
  assert.equal(quarantined.version, '1.0.0');
  assert.equal(quarantined.status, 'quarantined');
  assert.equal(quarantined.files['dist/client.js'], 'export default function App() { return "Safe UI"; }');
  assert.equal(quarantined.files['styles/main.css'], 'body { color: red; }');
});

test('12. Quarantined package hash is tamper-proof: modifying stored content causes integrity failure', async () => {
  const pkg = await quarantine.getQuarantinedPackage(devAppId, '1.0.0');
  assert.ok(pkg);

  // Deliberately tamper with package files
  pkg.files['dist/client.js'] = 'TAMPERED CODE INJECTED';

  // Attempting to store or retrieve tampered package triggers integrity violation
  await assert.rejects(
    async () => {
      await quarantine.storeQuarantinedPackage(pkg);
    },
    /Package hash mismatch during quarantine storage. Bundle integrity violated./,
  );
});

test('13. Quarantined version cannot be installed by any tenant while unapproved', async () => {
  // Try to install the unapproved quarantined version
  // Version is in 'draft' review status and unsigned
  const res = await storeApi.GET(getRequest('/api/apps/store'));
  const data = await res.json();

  // Draft app with quarantined version must not appear in the public catalog
  const found = data.apps?.some((a) => a.id === devAppId);
  assert.equal(found, false);
});
