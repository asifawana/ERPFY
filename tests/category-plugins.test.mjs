import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

import {
  resolveCategoryPlugin,
  resolveModules,
  listAvailableCategoryTemplates,
} from '../lib/content/category-plugins.ts';

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
const categoryModulesApi = await route('app/api/apps/category-modules/route.ts');

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

const ownerAccountId = '00000000-0000-4000-8000-000000000001';
const memberAccountId = '00000000-0000-4000-8000-000000000002';
const companyAId = '11111111-1111-4111-8111-111111111111';

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
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, 'Asia/Karachi', ?, ?, ?)`,
    )
    .run(ownerAccountId, 'owner@example.test', 'Owner User', now, now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run(ownerAccountId, passwordHash(password), now);

  sqlite
    .prepare(
      `INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at, email_verified_at)
       VALUES (?, ?, ?, 'Asia/Karachi', ?, ?, ?)`,
    )
    .run(memberAccountId, 'member@example.test', 'Member User', now, now, now);

  sqlite
    .prepare(
      `INSERT INTO core_credentials (account_id, password_hash, password_updated_at, failed_attempts, locked_until)
       VALUES (?, ?, ?, 0, 0)`,
    )
    .run(memberAccountId, passwordHash(password), now);

  sqlite
    .prepare(
      `INSERT INTO core_companies (
         id, name, slug, country_code, currency, timezone, language, sector_slug,
         industry_slug, business_models, employee_band, plan, state, trial_ends_at,
         onboarding_state, onboarding_steps, created_at, created_by, request_key
       ) VALUES (
         ?, 'Acme Bistro', 'acme-bistro', 'US', 'USD', 'UTC', 'en', 'hospitality-food',
         'restaurant-operations', '["B2C"]', '1-5', 'starter', 'active', ?,
         'completed', '{}', ?, ?, ?
       )`,
    )
    .run(companyAId, now + 14 * 86400000, now, ownerAccountId, 'req-key-1');

  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES (?, ?, 'owner', 'active', '', ?)`,
    )
    .run(companyAId, ownerAccountId, now);

  sqlite
    .prepare(
      `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
       VALUES (?, ?, 'member', 'active', '', ?)`,
    )
    .run(companyAId, memberAccountId, now);
});

/* ------------------------------------------------------------------ *
 * Pure Registry Tests
 * ------------------------------------------------------------------ */

test('1. Category Plugin Registry resolves restaurant-operations to Restaurant ERP', () => {
  const plugin = resolveCategoryPlugin('restaurant-operations', '', 'my-diner');
  assert.equal(plugin.name, 'Restaurant ERP');
  const labels = plugin.modules.map((m) => m.label);
  assert.ok(labels.includes('Menu Items'), 'Menu Items label present');
  assert.ok(labels.includes('KOT / Kitchen'), 'KOT / Kitchen module present');
  assert.ok(labels.includes('Tables'), 'Tables module present');
  assert.ok(labels.includes('Recipes'), 'Recipes module present');

  // Check slug interpolation
  const menuMod = plugin.modules.find((m) => m.id === 'products');
  assert.equal(menuMod?.href, '/c/my-diner/products');
});

test('2. Category Plugin Registry resolves pharmacy to Pharmacy ERP', () => {
  const plugin = resolveCategoryPlugin('pharmacy', '', 'my-pharmacy');
  assert.equal(plugin.name, 'Pharmacy ERP');
  const labels = plugin.modules.map((m) => m.label);
  assert.ok(labels.includes('Prescriptions'), 'Prescriptions present');
  assert.ok(labels.includes('Batches'), 'Batches present');
  assert.ok(labels.includes('Expiry Tracking'), 'Expiry Tracking present');
});

test('3. Disabled module filtering excludes toggled-off modules', () => {
  const plugin = resolveCategoryPlugin('restaurant-operations', '', 'my-diner', ['kot', 'tables']);
  const ids = plugin.modules.map((m) => m.id);
  assert.ok(!ids.includes('kot'), 'KOT is filtered out');
  assert.ok(!ids.includes('tables'), 'Tables is filtered out');
  assert.ok(ids.includes('products'), 'Menu Items is still present');
});

test('4. listAvailableCategoryTemplates returns comprehensive template list', () => {
  const templates = listAvailableCategoryTemplates();
  assert.ok(templates.length > 20, 'At least 20 category templates available');
  const slugs = templates.map((t) => t.slug);
  assert.ok(slugs.includes('restaurant-operations'), 'restaurant-operations in templates');
  assert.ok(slugs.includes('general-retail'), 'general-retail in templates');
  assert.ok(slugs.includes('pharmacy'), 'pharmacy in templates');
  assert.ok(slugs.includes('discrete-manufacturing'), 'discrete-manufacturing in templates');
});

/* ------------------------------------------------------------------ *
 * API Route Tests: GET /api/apps/category-modules
 * ------------------------------------------------------------------ */

test('5. GET /api/apps/category-modules returns modules, allModules and availableTemplates', async () => {
  const cookie = await signIn('owner@example.test');
  const res = await categoryModulesApi.GET(
    new Request(`${origin}/api/apps/category-modules?companyId=${companyAId}`, {
      headers: { cookie, origin },
    }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.categoryName, 'Restaurant ERP');
  assert.equal(data.industrySlug, 'restaurant-operations');
  assert.ok(Array.isArray(data.modules), 'modules is array');
  assert.ok(Array.isArray(data.allModules), 'allModules is array');
  assert.ok(data.allModules.every((m) => m.isActive === true), 'all default modules active');
  assert.ok(Array.isArray(data.availableTemplates), 'availableTemplates returned');
});

test('6. Unauthenticated request to /api/apps/category-modules is rejected', async () => {
  const res = await categoryModulesApi.GET(
    new Request(`${origin}/api/apps/category-modules?companyId=${companyAId}`, {
      headers: { origin },
    }),
  );
  assert.equal(res.status, 401);
});

/* ------------------------------------------------------------------ *
 * API Route Tests: POST /api/apps/category-modules
 * ------------------------------------------------------------------ */

test('7. POST toggle-module disables and enables category module with live persistence', async () => {
  const cookie = await signIn('owner@example.test');

  // Disable 'kot'
  const toggleRes = await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-module',
        companyId: companyAId,
        moduleId: 'kot',
        enabled: false,
      }),
    }),
  );
  assert.equal(toggleRes.status, 200);
  const toggleData = await toggleRes.json();
  assert.equal(toggleData.ok, true);
  assert.ok(toggleData.disabledModuleIds.includes('kot'), 'kot in disabledModuleIds');
  const kotMod = toggleData.allModules.find((m) => m.id === 'kot');
  assert.equal(kotMod?.isActive, false, 'kot is marked inactive');

  // GET confirms 'kot' excluded from active modules
  const getRes = await categoryModulesApi.GET(
    new Request(`${origin}/api/apps/category-modules?companyId=${companyAId}`, {
      headers: { cookie, origin },
    }),
  );
  const getData = await getRes.json();
  assert.ok(!getData.modules.some((m) => m.id === 'kot'), 'kot excluded from active modules');

  // Re-enable 'kot'
  const reEnableRes = await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-module',
        companyId: companyAId,
        moduleId: 'kot',
        enabled: true,
      }),
    }),
  );
  assert.equal(reEnableRes.status, 200);
  const reEnableData = await reEnableRes.json();
  assert.ok(!reEnableData.disabledModuleIds.includes('kot'), 'kot no longer in disabledModuleIds');
  const kotModRe = reEnableData.allModules.find((m) => m.id === 'kot');
  assert.equal(kotModRe?.isActive, true, 'kot is active again');
});

test('8. POST set-category switches company industry ERP template and modules', async () => {
  const cookie = await signIn('owner@example.test');

  // Switch to pharmacy
  const setCatRes = await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'set-category',
        companyId: companyAId,
        industrySlug: 'pharmacy',
      }),
    }),
  );
  assert.equal(setCatRes.status, 200);
  const data = await setCatRes.json();
  assert.equal(data.categoryName, 'Pharmacy ERP');
  assert.equal(data.industrySlug, 'pharmacy');
  const labels = data.modules.map((m) => m.label);
  assert.ok(labels.includes('Prescriptions'), 'Prescriptions present in new category');
  assert.ok(labels.includes('Batches'), 'Batches present in new category');

  // Verify in database
  const row = sqlite
    .prepare('SELECT industry_slug FROM core_companies WHERE id = ?')
    .get(companyAId);
  assert.equal(row.industry_slug, 'pharmacy');
});

test('9. POST reset-modules clears all disabled modules', async () => {
  const cookie = await signIn('owner@example.test');

  // Disable a module first
  await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-module',
        companyId: companyAId,
        moduleId: 'recipes',
        enabled: false,
      }),
    }),
  );

  // Reset modules
  const resetRes = await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'reset-modules',
        companyId: companyAId,
      }),
    }),
  );
  assert.equal(resetRes.status, 200);
  const data = await resetRes.json();
  assert.equal(data.disabledModuleIds.length, 0);
  assert.ok(data.allModules.every((m) => m.isActive === true));
});

test('10. RBAC: non-admin member cannot mutate category modules (403 Forbidden)', async () => {
  const memberCookie = await signIn('member@example.test');

  const res = await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie: memberCookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-module',
        companyId: companyAId,
        moduleId: 'kot',
        enabled: false,
      }),
    }),
  );
  assert.equal(res.status, 403);
});

test('11. Dependency protection: cannot disable products while dependent modules are active', async () => {
  const cookie = await signIn('owner@example.test');

  const res = await categoryModulesApi.POST(
    new Request(`${origin}/api/apps/category-modules`, {
      method: 'POST',
      headers: { cookie, origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle-module',
        companyId: companyAId,
        moduleId: 'products',
        enabled: false,
      }),
    }),
  );
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('depend on it'), 'Mentions dependent modules preventing disabling');
});
