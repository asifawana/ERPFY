import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

let sqlite = new DatabaseSync(':memory:');
sqlite.exec(`
  CREATE TABLE core_accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE core_companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    industry TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL
  );

  CREATE TABLE core_memberships (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE core_company_settings (
    company_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT NOT NULL
  );

  CREATE TABLE crm_parties (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    party_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    primary_email TEXT,
    primary_phone TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE core_audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    account_id TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
  );
`);

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

const { getDomainProvider, LocalDevDomainAdapter } = await bundleModule('lib/domains/providers.ts');
const { getPaymentProvider, LocalTestPaymentAdapter } = await bundleModule('lib/billing/providers.ts');
const { getStorageProvider, LocalStorageDriver } = await bundleModule('lib/storage/index.ts');
const { getJobQueue, InMemoryJobQueueDriver } = await bundleModule('lib/jobs/index.ts');
const { isFirstPartyPlugin } = await bundleModule('lib/eap/runtime.ts');
const { isPlatformAdmin, requirePlatformAdmin } = await bundleModule('lib/core/admin.ts');
const { getAdminCategories } = await bundleModule('lib/categories/admin-registry.ts');
const { createEcommerceOrder } = await bundleModule('lib/ecommerce/store.ts');

test('1. Custom Domain Infrastructure: Provider Abstraction & Honest Reporting', async () => {
  const provider = getDomainProvider();
  assert.ok(provider instanceof LocalDevDomainAdapter, 'Defaults to LocalDevDomainAdapter in test environment');
  assert.equal(provider.isProduction, false, 'Honest reporting: local provider is not production');

  const dnsRes = await provider.verifyDns('store.testbrand.test', 'CNAME', 'cname.erpfy.net', 'token123');
  assert.equal(dnsRes.verified, true, 'Test domains verify against test harness');
  assert.ok(dnsRes.message.includes('[DEV/TEST MODE]'), 'Includes dev/test mode indicator');

  const sslRes = await provider.provisionSsl('store.testbrand.test');
  assert.equal(sslRes.sslStatus, 'active');
  assert.ok(sslRes.message.includes('[DEV/TEST MODE]'), 'Does not claim live public CA issuance');
});

test('2. Billing Platform: Provider-Neutral Payment Abstraction & Honest Mode', async () => {
  const provider = getPaymentProvider();
  assert.ok(provider instanceof LocalTestPaymentAdapter, 'Defaults to LocalTestPaymentAdapter');
  assert.equal(provider.isLiveMode, false, 'Honest reporting: test adapter is not live mode');

  const checkout = await provider.createCheckoutSession({
    companyId: 'comp_test_123',
    companyName: 'Acme Test Corp',
    planTier: 'professional',
    billingCycle: 'monthly',
    successUrl: 'https://app.erpfy.net/success',
    cancelUrl: 'https://app.erpfy.net/cancel',
  });

  assert.equal(checkout.mode, 'test', 'Session mode is explicitly test');
  assert.ok(checkout.checkoutUrl.includes('mode=test'), 'Checkout URL contains test parameter');
  assert.ok(checkout.sessionId.startsWith('test_sess_'), 'Session ID has test prefix');

  const cancelRes = await provider.cancelSubscription('sub_123');
  assert.equal(cancelRes.success, true);
  assert.ok(cancelRes.message.includes('[TEST MODE]'));
});

test('3. Storage Abstraction: Multi-Driver Isolation & Path Traversal Rejection', async () => {
  const storage = getStorageProvider();
  assert.ok(storage instanceof LocalStorageDriver);

  const tenantA = 'comp_tenant_a';
  const tenantB = 'comp_tenant_b';
  const fileContent = Buffer.from('Hello ERPfy Tenant Storage!');

  // Upload file for Tenant A
  const recordA = await storage.uploadFile({
    companyId: tenantA,
    namespace: 'products',
    filename: 'hero_image.png',
    content: fileContent,
    mimeType: 'image/png',
  });

  assert.equal(recordA.companyId, tenantA);
  assert.ok(recordA.path.includes(tenantA), 'Path contains Tenant A ID');

  // Verify Tenant A can fetch it
  const fetchedA = await storage.getFile({
    companyId: tenantA,
    namespace: 'products',
    filename: 'hero_image.png',
  });
  assert.ok(fetchedA, 'File fetched for Tenant A');
  assert.equal(fetchedA.content.toString(), fileContent.toString());

  // Verify Tenant B cannot fetch Tenant A file
  const fetchedB = await storage.getFile({
    companyId: tenantB,
    namespace: 'products',
    filename: 'hero_image.png',
  });
  assert.equal(fetchedB, null, 'Tenant B cannot read Tenant A storage');

  // Verify path traversal rejection
  await assert.rejects(
    async () => {
      await storage.uploadFile({
        companyId: tenantA,
        namespace: 'products',
        filename: '../../etc/passwd',
        content: fileContent,
        mimeType: 'text/plain',
      });
    },
    /Invalid or unsafe filename/,
    'Path traversal attempt rejected',
  );

  // Clean up
  await storage.deleteFile({
    companyId: tenantA,
    namespace: 'products',
    filename: 'hero_image.png',
  });
});

test('4. Background Job & Queue System: Non-blocking Async Processing', async () => {
  const queue = getJobQueue();
  assert.ok(queue instanceof InMemoryJobQueueDriver);

  let processed = false;
  let receivedData = null;

  queue.process('test_queue', async (job) => {
    processed = true;
    receivedData = job.data;
  });

  const jobId = await queue.enqueue('test_queue', 'test_job', { testKey: 'testVal' });
  assert.ok(jobId.startsWith('job_'), 'Returns generated job ID');

  // Wait for setImmediate microtask loop
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(processed, true, 'Job was processed asynchronously by worker');
  assert.deepEqual(receivedData, { testKey: 'testVal' }, 'Job payload delivered intact');
});

test('5. App / Plugin Security Boundary: First-Party vs Untrusted Third-Party', () => {
  assert.equal(isFirstPartyPlugin('erpfy.contacts_crm'), true, 'Official ERPfy extension is recognized as trusted');
  assert.equal(isFirstPartyPlugin('core.pos'), true, 'Core extension is recognized as trusted');
  assert.equal(isFirstPartyPlugin('contacts-crm'), true, 'Legacy official CRM alias recognized');
  assert.equal(isFirstPartyPlugin('untrusted_dev.bitcoin_miner'), false, 'Third-party app flagged as untrusted');
  assert.equal(isFirstPartyPlugin('external-shop-plugin'), false, 'External plugin flagged as untrusted');
});

test('6. Platform Admin Authorization: Strict Guarding', () => {
  assert.equal(isPlatformAdmin({ accountId: 'acc_admin', email: 'admin@erpfy.net' }), true, 'acc_admin has platform authority');
  assert.equal(isPlatformAdmin({ accountId: 'acc_regular_merchant', email: 'merchant@store.com' }), false, 'Regular merchant fails platform authority');
  assert.throws(
    () => {
      requirePlatformAdmin({ accountId: 'acc_merchant', email: 'merchant@test.com' });
    },
    /Platform Admin authority required/,
    'requirePlatformAdmin throws 403 for non-admins',
  );
});

test('7. Category Management: 22 Built-in Blueprints Integrity', async () => {
  const categories = await getAdminCategories();
  assert.ok(categories.length >= 22, `Expected at least 22 blueprints, found ${categories.length}`);

  const retail = categories.find((c) => c.slug === 'general-retail');
  assert.ok(retail, 'General Retail blueprint present');

  const mobile = categories.find((c) => c.slug === 'mobile-shop');
  assert.ok(mobile, 'Mobile Shop blueprint present');

  const restaurant = categories.find((c) => c.slug === 'restaurant-operations');
  assert.ok(restaurant, 'Restaurant Operations blueprint present');
});

test('8. Ecommerce Failure Resilience: Out of Stock & Invalid Coupons', async () => {
  const compId = `comp_ecom_${Date.now()}`;
  await db
    .prepare(
      `INSERT INTO core_companies (id, name, slug, industry, created_at, created_by)
       VALUES (?1, 'Ecom Fail Test Co', ?1, 'retail', ?2, 'acc_admin')`,
    )
    .bind(compId, Date.now())
    .run();

  const settingsDoc = {
    ecommerceStore: {
      id: 'store_1',
      name: 'Test Store',
      slug: compId,
      currency: 'USD',
      status: 'active',
      companyId: compId,
    },
    productsCatalog: [
      {
        id: 'prod_limited',
        title: 'Rare Vintage Watch',
        stockQuantity: 1,
        status: 'published',
      },
    ],
  };

  await db
    .prepare(
      `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
       VALUES (?1, ?2, ?3, 'acc_admin')`,
    )
    .bind(compId, JSON.stringify(settingsDoc), Date.now())
    .run();

  const store = {
    id: 'store_1',
    companyId: compId,
    name: 'Test Store',
    slug: compId,
    currency: 'USD',
    taxRatePercent: 0,
    shippingFlatRate: 0,
    freeShippingThreshold: 100,
    status: 'active',
  };

  // Test 1: Ordering 5 units when only 1 is in stock should be rejected
  await assert.rejects(
    async () => {
      await createEcommerceOrder(db, store, {
        customerName: 'Alice Buyer',
        customerEmail: 'alice@example.com',
        shippingAddress: {
          firstName: 'Alice',
          lastName: 'Buyer',
          address1: '456 High St',
          city: 'London',
          countryCode: 'GB',
        },
        items: [
          {
            productId: 'prod_limited',
            title: 'Rare Vintage Watch',
            price: 500,
            quantity: 5, // Exceeds available stock
          },
        ],
      });
    },
    /Insufficient inventory/,
    'Order rejected due to insufficient stock',
  );

  // Test 2: Ordering with an invalid discount code should be rejected
  await assert.rejects(
    async () => {
      await createEcommerceOrder(db, store, {
        customerName: 'Alice Buyer',
        customerEmail: 'alice@example.com',
        shippingAddress: {
          firstName: 'Alice',
          lastName: 'Buyer',
          address1: '456 High St',
          city: 'London',
          countryCode: 'GB',
        },
        items: [
          {
            productId: 'prod_limited',
            title: 'Rare Vintage Watch',
            price: 500,
            quantity: 1,
          },
        ],
        discountCode: 'BOGUS_INVALID_COUPON',
      });
    },
    /Discount code "BOGUS_INVALID_COUPON" is invalid/,
    'Order rejected due to invalid discount coupon',
  );
});
