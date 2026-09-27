import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
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

async function bundleModule(entryPath) {
  const output = await build({
    entryPoints: [entryPath],
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
      {
        name: 'alias-resolver',
        setup(builder) {
          builder.onResolve({ filter: /^@\// }, (args) => {
            const rel = args.path.replace(/^@\//, '');
            let resolved = path.resolve(process.cwd(), rel);
            if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx') && !resolved.endsWith('.js')) {
              try {
                if (readFileSync(resolved + '.ts')) resolved += '.ts';
              } catch {
                try {
                  if (readFileSync(resolved + '.tsx')) resolved += '.tsx';
                } catch {
                  // Fallback
                }
              }
            }
            return { path: resolved };
          });
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
  );
}

const { getBlueprint } = await bundleModule('lib/blueprints/registry.ts');
const { getActiveDashboardWidgets } = await bundleModule('lib/dashboard/widget-registry.ts');
const {
  getOrCreateStoreForCompany,
  resolveStoreBySlugOrDomain,
  createEcommerceOrder,
} = await bundleModule('lib/ecommerce/store.ts');
const {
  getStoreThemeSettings,
  saveStoreThemeSettings,
  publishTheme,
  listAvailableThemes,
} = await bundleModule('lib/theme-engine/settings.ts');
const {
  addCustomDomain,
  verifyCustomDomain,
  resolveTenantByDomain,
} = await bundleModule('lib/domains/resolver.ts');
const {
  getCompanySubscription,
  updateCompanySubscription,
  checkQuota,
} = await bundleModule('lib/billing/guard.ts');

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  const ddl = [
    readFileSync('drizzle/0000_core_baseline.sql', 'utf8'),
    readFileSync('drizzle/0001_auth.sql', 'utf8'),
    readFileSync('drizzle/0006_settings.sql', 'utf8'),
    readFileSync('drizzle/0010_crm_contacts_foundation.sql', 'utf8'),
  ].join('\n');

  for (const statement of ddl.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) sqlite.exec(trimmed);
  }

  // Seed sample account
  sqlite.exec(`
    INSERT INTO core_accounts (id, email, display_name, timezone, created_at, last_seen_at)
    VALUES ('acc_admin', 'merchant@brand.com', 'Admin User', 'UTC', 1700000000, 1700000000);
  `);
});

/* ------------------------------------------------------------------ *
 * Scenario A — Retail: Blueprint, Catalog, Storefront & Stock Decrement
 * ------------------------------------------------------------------ */
test('Scenario A — Retail: Product creation, checkout, CRM capture & inventory decrement', async () => {
  const companyId = 'comp_retail_1';
  const companySlug = 'supermart';

  sqlite.exec(`
    INSERT INTO core_companies (id, name, slug, country_code, currency, timezone, state, industry_slug, trial_ends_at, created_at, created_by, request_key)
    VALUES ('${companyId}', 'SuperMart Retail', '${companySlug}', 'US', 'USD', 'UTC', 'active', 'general-retail', 1800000000, 1700000000, 'acc_admin', 'req_1');
  `);

  // 1. Verify Blueprint resolution
  const blueprint = getBlueprint('general-retail');
  assert.equal(blueprint.slug, 'general-retail');
  assert.ok(blueprint.modules.some((m) => m.id === 'pos'));

  // 2. Initialize Store & Catalog with 50 units in stock
  const store = await getOrCreateStoreForCompany(db, companyId, 'SuperMart Retail', companySlug, 'USD');
  const initialStock = 50;
  const productId = 'prod_coffee_1';

  // Seed catalog product in settings
  const doc = {
    ecommerceStore: store,
    productsCatalog: [
      {
        id: productId,
        name: 'Whole Bean Espresso 1kg',
        salesPrice: 24.0,
        stockQuantity: initialStock,
      },
    ],
  };

  await db
    .prepare(
      'INSERT INTO core_company_settings (company_id, data, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (company_id) DO UPDATE SET data = excluded.data',
    )
    .bind(companyId, JSON.stringify(doc), Date.now(), 'acc_admin')
    .run();

  // 3. Customer places storefront order for 2 units
  const order = await createEcommerceOrder(db, store, {
    customerName: 'Jane Shopper',
    customerEmail: 'jane@shopper.test',
    customerPhone: '+1-555-0199',
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Shopper',
      address1: '123 Market St',
      city: 'Portland',
      countryCode: 'US',
    },
    items: [
      {
        productId,
        title: 'Whole Bean Espresso 1kg',
        price: 24.0,
        quantity: 2,
      },
    ],
  });

  assert.ok(order.id);
  assert.equal(order.total, 48.0 + store.shippingFlatRate); // 48 + 10 shipping = 58
  assert.equal(order.items[0].quantity, 2);

  // 4. Verify stock decremented to 48 and stock movement recorded
  const updatedSettingsRow = await db
    .prepare('SELECT data FROM core_company_settings WHERE company_id = ?1')
    .bind(companyId)
    .first();
  const updatedDoc = JSON.parse(updatedSettingsRow.data);

  const updatedProd = updatedDoc.productsCatalog.find((p) => p.id === productId);
  assert.equal(updatedProd.stockQuantity, 48); // 50 - 2 = 48!

  assert.ok(Array.isArray(updatedDoc.stockMovements));
  assert.equal(updatedDoc.stockMovements[0].quantity, -2);
  assert.equal(updatedDoc.stockMovements[0].referenceType, 'ecommerce_order');

  // 5. Verify CRM customer party was registered
  const party = await db
    .prepare('SELECT display_name, primary_email FROM crm_parties WHERE company_id = ?1 AND primary_email = ?2')
    .bind(companyId, 'jane@shopper.test')
    .first();
  assert.ok(party);
  assert.equal(party.display_name, 'Jane Shopper');
});

/* ------------------------------------------------------------------ *
 * Scenario B — Mobile Shop: IMEI Tracking & Repairs Blueprint
 * ------------------------------------------------------------------ */
test('Scenario B — Mobile Shop: Device Blueprint, IMEI capability and Repair Job Cards', () => {
  const bp = getBlueprint('mobile-shop');
  assert.equal(bp.slug, 'mobile-shop');
  assert.equal(bp.terminology.Products, 'Devices & Goods');

  // Check required specialized modules
  const moduleIds = bp.modules.map((m) => m.id);
  assert.ok(moduleIds.includes('imei'));
  assert.ok(moduleIds.includes('repairs'));
  assert.ok(moduleIds.includes('pos'));

  // Dashboard widgets include IMEI and Repairs KPIs
  const activeWidgets = getActiveDashboardWidgets(['dashboard', 'products', 'imei', 'repairs']);
  const widgetIds = activeWidgets.map((w) => w.id);
  assert.ok(widgetIds.includes('category.imei_stock'));
  assert.ok(widgetIds.includes('category.open_repairs'));
});

/* ------------------------------------------------------------------ *
 * Scenario C — Restaurant: Tables, KOT, and Dashboard Widgets
 * ------------------------------------------------------------------ */
test('Scenario C — Restaurant: Tables, KOT, Kitchen prep routing and Category Widgets', () => {
  const bp = getBlueprint('restaurant-operations');
  assert.equal(bp.slug, 'restaurant-operations');
  assert.equal(bp.terminology.Products, 'Menu Items');

  const moduleIds = bp.modules.map((m) => m.id);
  assert.ok(moduleIds.includes('tables'));
  assert.ok(moduleIds.includes('kot'));
  assert.ok(moduleIds.includes('recipes'));

  // Kitchen and Tables widgets become visible when modules active
  const activeWidgets = getActiveDashboardWidgets(['dashboard', 'tables', 'kot', 'pos']);
  const widgetIds = activeWidgets.map((w) => w.id);
  assert.ok(widgetIds.includes('category.live_kot'));
  assert.ok(widgetIds.includes('category.active_tables'));
});

/* ------------------------------------------------------------------ *
 * Scenario D — Tenant Isolation: Zero cross-tenant data leakage
 * ------------------------------------------------------------------ */
test('Scenario D — Tenant Isolation: Tenant A and Tenant B data is strictly isolated', async () => {
  const compA = 'comp_alpha';
  const compB = 'comp_beta';

  sqlite.exec(`
    INSERT INTO core_companies (id, name, slug, country_code, currency, timezone, state, industry_slug, trial_ends_at, created_at, created_by, request_key)
    VALUES
      ('${compA}', 'Alpha Brand', 'alpha-store', 'US', 'USD', 'UTC', 'active', 'general-retail', 1800000000, 1700000000, 'acc_admin', 'req_a'),
      ('${compB}', 'Beta Brand', 'beta-store', 'US', 'USD', 'UTC', 'active', 'pharmacy', 1800000000, 1700000000, 'acc_admin', 'req_b');
  `);

  await getOrCreateStoreForCompany(db, compA, 'Alpha Brand', 'alpha-store', 'USD');
  await getOrCreateStoreForCompany(db, compB, 'Beta Brand', 'beta-store', 'EUR');

  // Verify resolveStoreBySlugOrDomain returns strictly the right store
  const storeA = await resolveStoreBySlugOrDomain(db, 'alpha-store');
  const storeB = await resolveStoreBySlugOrDomain(db, 'beta-store');

  assert.equal(storeA.company.id, compA);
  assert.equal(storeA.store.name, 'Alpha Brand Online Store');
  assert.equal(storeA.store.currency, 'USD');

  assert.equal(storeB.company.id, compB);
  assert.equal(storeB.store.name, 'Beta Brand Online Store');
  assert.equal(storeB.store.currency, 'EUR');

  // Verify custom domain added to Tenant A cannot be claimed or resolved by Tenant B
  const addResA = await addCustomDomain(db, compA, 'shop.alpha.com');
  assert.equal(addResA.success, true);

  // Tenant B attempting to add the same domain is rejected
  const addResB = await addCustomDomain(db, compB, 'shop.alpha.com');
  assert.equal(addResB.success, false);
  assert.match(addResB.error, /already in use/i);

  // Verify DNS resolution resolves strictly to Tenant A
  await verifyCustomDomain(db, compA, addResA.record.id);
  const resolved = await resolveTenantByDomain(db, 'shop.alpha.com');
  assert.ok(resolved);
  assert.equal(resolved.companyId, compA);
  assert.notEqual(resolved.companyId, compB);
});

/* ------------------------------------------------------------------ *
 * Scenario E — Subscriptions & Quota Enforcement
 * ------------------------------------------------------------------ */
test('Scenario E — Subscriptions: Server blocks over-limit operations; upgrades lift limits', async () => {
  const companyId = 'comp_quota_test';

  sqlite.exec(`
    INSERT INTO core_companies (id, name, slug, country_code, currency, timezone, state, industry_slug, trial_ends_at, created_at, created_by, request_key)
    VALUES ('${companyId}', 'Quota Test', 'quota-test', 'US', 'USD', 'UTC', 'active', 'default-standard', 1800000000, 1700000000, 'acc_admin', 'req_q');
  `);

  // Set company to Free tier (maxCustomDomains: 0)
  await updateCompanySubscription(db, companyId, 'free', 'monthly');
  const sub = await getCompanySubscription(db, companyId);
  assert.equal(sub.tier, 'free');

  // Check custom domains quota: Free plan has 0 custom domains allowed
  const checkFree = await checkQuota(db, companyId, 'custom_domains');
  assert.equal(checkFree.limit, 0);

  // Upgrade to Starter plan (maxCustomDomains: 1)
  await updateCompanySubscription(db, companyId, 'starter', 'monthly');
  const checkStarter = await checkQuota(db, companyId, 'custom_domains');
  assert.equal(checkStarter.limit, 1);
  assert.equal(checkStarter.allowed, true);

  // Add 1 domain (hits limit)
  await addCustomDomain(db, companyId, 'store.quotatest.com');
  const checkAfter1 = await checkQuota(db, companyId, 'custom_domains');
  assert.equal(checkAfter1.currentUsage, 1);
  assert.equal(checkAfter1.allowed, false); // 1 / 1 reached!

  // Upgrade to Professional plan (limit: 3)
  await updateCompanySubscription(db, companyId, 'professional', 'monthly');
  const checkPro = await checkQuota(db, companyId, 'custom_domains');
  assert.equal(checkPro.limit, 3);
  assert.equal(checkPro.allowed, true); // Now allowed again!
});

/* ------------------------------------------------------------------ *
 * Scenario F — Storefront & Theme Customizer
 * ------------------------------------------------------------------ */
test('Scenario F — Theme Engine: Multiple themes, publishing and dynamic persistence', async () => {
  const companyId = 'comp_theme_test';

  sqlite.exec(`
    INSERT INTO core_companies (id, name, slug, country_code, currency, timezone, state, industry_slug, trial_ends_at, created_at, created_by, request_key)
    VALUES ('${companyId}', 'Theme Co', 'theme-co', 'US', 'USD', 'UTC', 'active', 'default-standard', 1800000000, 1700000000, 'acc_admin', 'req_t');
  `);

  // 1. Verify available themes list contains portal-default and boutique-luxury
  const themes = listAvailableThemes();
  const themeIds = themes.map((t) => t.id);
  assert.ok(themeIds.includes('portal-default'));
  assert.ok(themeIds.includes('boutique-luxury'));

  // 2. Initial default theme settings
  const initialSettings = await getStoreThemeSettings(db, companyId);
  assert.equal(initialSettings.themeId, 'portal-default');

  // 3. Switch / Publish Boutique Luxury theme
  const published = await publishTheme(db, companyId, 'boutique-luxury', 'acc_admin');
  assert.equal(published.themeId, 'boutique-luxury');
  assert.equal(published.typography.fontFamily, 'Playfair Display, Georgia, serif');
  assert.equal(published.colors.primary, '#b45309');

  // 4. Customizer override: merchant customizes hero title & primary color
  const customized = await saveStoreThemeSettings(
    db,
    companyId,
    {
      ...published,
      colors: {
        ...published.colors,
        primary: '#92400e',
      },
      hero: {
        ...published.hero,
        title: 'Artisan Heritage Jewelry',
      },
    },
    'acc_admin',
  );

  assert.equal(customized.colors.primary, '#92400e');
  assert.equal(customized.hero.title, 'Artisan Heritage Jewelry');

  // 5. Verify re-reading settings from database preserves customizations
  const verified = await getStoreThemeSettings(db, companyId);
  assert.equal(verified.themeId, 'boutique-luxury');
  assert.equal(verified.colors.primary, '#92400e');
  assert.equal(verified.hero.title, 'Artisan Heritage Jewelry');
});
