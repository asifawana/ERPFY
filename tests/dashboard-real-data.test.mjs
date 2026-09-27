import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import {
  calculateDateRangeBounds,
  getCompanyDashboardData,
} from '../lib/dashboard/data-service.ts';
import {
  getActiveDashboardWidgets,
  sortWidgetsByOrder,
  CORE_DASHBOARD_WIDGETS,
} from '../lib/dashboard/widget-registry.ts';

// Helper mock D1 database using in-memory SQLite
function createTestDb() {
  const sqlite = new DatabaseSync(':memory:');
  const d1 = {
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...args) {
          return {
            async all() {
              const rows = stmt.all(...args);
              return { results: rows };
            },
            async first() {
              const row = stmt.get(...args);
              return row ?? null;
            },
            async run() {
              const res = stmt.run(...args);
              return { success: true, meta: { changes: res.changes } };
            },
          };
        },
        async all() {
          const rows = stmt.all();
          return { results: rows };
        },
        async first() {
          const row = stmt.get();
          return row ?? null;
        },
      };
    },
    exec(sql) {
      sqlite.exec(sql);
    },
  };

  // Create core schema for branches & apps
  sqlite.exec(`
    CREATE TABLE core_branches (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      is_main INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      archived_at INTEGER
    );

    CREATE TABLE eap_apps (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      icon_url TEXT NOT NULL DEFAULT '',
      official_app INTEGER NOT NULL DEFAULT 0,
      app_type TEXT NOT NULL DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'published',
      is_killed INTEGER NOT NULL DEFAULT 0,
      created_by_account_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE eap_app_versions (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      version TEXT NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'eap-v1',
      min_platform_version TEXT NOT NULL DEFAULT '1.0.0',
      manifest_json TEXT NOT NULL,
      package_hash TEXT NOT NULL DEFAULT '',
      signature TEXT NOT NULL DEFAULT '',
      release_id TEXT NOT NULL DEFAULT '',
      review_status TEXT NOT NULL DEFAULT 'published',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE eap_app_installations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      version_id TEXT NOT NULL,
      installed_by_account_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'installed',
      granted_permissions TEXT NOT NULL DEFAULT '[]',
      configuration TEXT NOT NULL DEFAULT '{}',
      installed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      uninstalled_at INTEGER
    );
  `);

  return { d1, sqlite };
}

test('1 & 2: Production dashboard runtime contains no default SAMPLE DATA badge or Sample preview message', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(
    dashSrc.includes('showSampleData = false'),
    'showSampleData must default to false in production runtime',
  );
  assert.equal(
    dashSrc.includes('Sample preview for'),
    false,
    'ErpDashboard must not contain hardcoded Sample preview message',
  );
});

test('3, 4, 5: Production dashboard runtime does not import or use demo products, demo customers, or fake recent sales', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.equal(dashSrc.includes('DEMO_RECENT_SALES'), false, 'ErpDashboard must not import DEMO_RECENT_SALES');
  assert.equal(dashSrc.includes('SL_9061'), false, 'ErpDashboard must not contain fake SL_9061 reference');
  assert.equal(dashSrc.includes('Tennis Racket'), false, 'ErpDashboard must not contain hardcoded Tennis Racket');
  assert.equal(dashSrc.includes('Camping Tent 2P'), false, 'ErpDashboard must not contain hardcoded Camping Tent 2P');
  assert.equal(dashSrc.includes('Omar Khalil'), false, 'ErpDashboard must not contain hardcoded demo customers');
  assert.equal(dashSrc.includes('Lina Berrada'), false, 'ErpDashboard must not contain hardcoded Lina Berrada');
});

test('6, 7, 8, 9, 10: Production dashboard runtime does not contain fake sales, purchase, profit, stock values, or visitor metrics', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.equal(dashSrc.includes('1,496,060'), false);
  assert.equal(dashSrc.includes('4,195,602'), false);
  assert.equal(dashSrc.includes('179,214'), false);
  assert.equal(dashSrc.includes('1,823,213,088'), false);
  assert.equal(dashSrc.includes('GlobalStoreVisitorsModule'), false, 'ErpDashboard must not render fake globe visitors');
  assert.equal(dashSrc.includes('150 Online Now'), false);
  assert.equal(dashSrc.includes('16,310 Total Visits'), false);
});

test('11: A new company with no installed business plugins renders truthful empty workspace state', async () => {
  const { d1 } = createTestDb();
  const data = await getCompanyDashboardData(d1, {
    companyId: 'new-co',
    companySlug: 'new-co',
    baseCurrency: 'USD',
  });

  assert.equal(data.hasAnyApps, false, 'New company must have hasAnyApps = false');
  assert.equal(data.installedAppSlugs.length, 0);
  assert.equal(data.figures.Sales, 0);
  assert.equal(data.figures.Purchases, 0);
  assert.equal(data.figures.Profit, 0);
  assert.equal(data.recentSales.length, 0);
});

test('12, 13, 14, 15: Widget registry excludes widgets whose owning plugins are not installed', () => {
  // Scenario A: Only Sales installed
  const salesOnly = getActiveDashboardWidgets({ installedAppSlugs: ['erpfy.sales'] });
  const salesIds = salesOnly.map((w) => w.id);

  assert.ok(salesIds.includes('stat-sales'), 'stat-sales must be active when erpfy.sales is installed');
  assert.ok(salesIds.includes('recent-sales'), 'recent-sales must be active when erpfy.sales is installed');
  assert.equal(salesIds.includes('stat-purchases'), false, 'stat-purchases must be absent without erpfy.purchasing');
  assert.equal(salesIds.includes('stat-profit'), false, 'stat-profit must be absent without erpfy.accounting');
  assert.equal(salesIds.includes('stock-value'), false, 'stock-value must be absent without erpfy.inventory');
  assert.equal(salesIds.includes('payment-sent-received-chart'), false, 'payment-sent-received must be absent without accounting');

  // Scenario B: No plugins installed
  const none = getActiveDashboardWidgets({ installedAppSlugs: [] });
  assert.equal(none.length, 0, 'No business widgets should be active without plugins');
});

test('16: Installed app with zero records renders truthful zero / empty state', async () => {
  const { d1, sqlite } = createTestDb();
  const now = Date.now();

  // Install Sales app
  sqlite.exec(`
    INSERT INTO eap_apps (id, organization_id, slug, name, category, created_by_account_id, created_at, updated_at)
    VALUES ('app-sales', 'org-1', 'erpfy.sales', 'Sales App', 'sales', 'acc-1', ${now}, ${now});

    INSERT INTO eap_app_versions (id, app_id, version, manifest_json, created_at)
    VALUES ('ver-sales', 'app-sales', '1.0.0', '{"protocol":"eap-v1","app_id":"app-sales","name":"Sales App","slug":"erpfy.sales","version":"1.0.0","minimum_platform_version":"1.0.0","developer_id":"org-1","permissions":["sales.view"]}', ${now});

    INSERT INTO eap_app_installations (id, company_id, app_id, version_id, installed_by_account_id, installed_at, updated_at)
    VALUES ('inst-sales', 'co-sales', 'app-sales', 'ver-sales', 'acc-1', ${now}, ${now});
  `);

  const data = await getCompanyDashboardData(d1, {
    companyId: 'co-sales',
    companySlug: 'co-sales',
    baseCurrency: 'PKR',
  });

  assert.equal(data.hasAnyApps, true);
  assert.ok(data.installedAppSlugs.includes('erpfy.sales'));
  // Mathematically zero
  assert.equal(data.figures.Sales, 0);
  assert.equal(data.figures['Sales Due'], 0);
  assert.equal(data.figures.Invoices, 0);
  assert.deepEqual(data.recentSales, []);
  assert.deepEqual(data.topProducts, []);
});

test('17: calculateDateRangeBounds applies valid timestamp boundaries', () => {
  const today = calculateDateRangeBounds('today');
  assert.ok(today.startMs <= today.endMs);

  const sevenDays = calculateDateRangeBounds('7d');
  const thirtyDays = calculateDateRangeBounds('30d');
  assert.ok(thirtyDays.startMs < sevenDays.startMs);

  const custom = calculateDateRangeBounds('custom', { from: '2026-09-01', to: '2026-09-10' });
  assert.ok(custom.startMs < custom.endMs);
});

test('18: Warehouse filter scopes queries using real core_branches', async () => {
  const { d1, sqlite } = createTestDb();
  const now = Date.now();

  sqlite.exec(`
    INSERT INTO core_branches (id, company_id, code, name, status, is_main, created_at)
    VALUES
      ('br-1', 'co-branch', 'MAIN', 'Lahore Hub', 'active', 1, ${now}),
      ('br-2', 'co-branch', 'DEPOT', 'Karachi Depot', 'active', 0, ${now}),
      ('br-archived', 'co-branch', 'OLD', 'Archived Branch', 'archived', 0, ${now});
  `);

  const data = await getCompanyDashboardData(d1, {
    companyId: 'co-branch',
    companySlug: 'co-branch',
  });

  assert.equal(data.warehouses.length, 3, 'Must contain All Warehouses + 2 active branches');
  assert.equal(data.warehouses[0].id, 'all');
  assert.equal(data.warehouses[1].name, 'Lahore Hub');
  assert.equal(data.warehouses[2].name, 'Karachi Depot');
  assert.equal(data.warehouses.some((w) => w.name === 'Archived Branch'), false);
});

test('19: Base currency does not fake foreign exchange conversion', async () => {
  const { d1 } = createTestDb();
  const dataPKR = await getCompanyDashboardData(d1, {
    companyId: 'co-pkr',
    companySlug: 'co-pkr',
    baseCurrency: 'PKR',
  });
  assert.equal(dataPKR.baseCurrency, 'PKR');

  const dataAED = await getCompanyDashboardData(d1, {
    companyId: 'co-aed',
    companySlug: 'co-aed',
    baseCurrency: 'AED',
  });
  assert.equal(dataAED.baseCurrency, 'AED');
});

test('20: Dashboard API endpoint exists and handles authorized query params', () => {
  const routeSrc = readFileSync('app/api/companies/[companyId]/dashboard/route.ts', 'utf8');
  assert.ok(routeSrc.includes('requireCompanyAccess'), 'Route must enforce company membership authorization');
  assert.ok(routeSrc.includes('getCompanyDashboardData'), 'Route must query real data service');
  assert.ok(routeSrc.includes('period'), 'Route must read period query param');
  assert.ok(routeSrc.includes('warehouse'), 'Route must read warehouse query param');
});

test('21: Quick actions are dynamically filtered to installed plugins only', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(dashSrc.includes('if (hasPos) actions.push({ label: \'POS\''), 'POS action requires erpfy.pos');
  assert.ok(dashSrc.includes('if (hasSales) actions.push({ label: \'New sale\''), 'New sale requires erpfy.sales');
  assert.ok(dashSrc.includes('if (hasPurchasing) actions.push({ label: \'New purchase\''), 'New purchase requires erpfy.purchasing');
  assert.ok(dashSrc.includes('if (hasCatalog || hasInventory) actions.push({ label: \'Add product\''), 'Add product requires catalog or inventory');
});

test('22 & 23: Company isolation: Company A data is strictly separated from Company B', async () => {
  const { d1, sqlite } = createTestDb();
  const now = Date.now();

  sqlite.exec(`
    INSERT INTO core_branches (id, company_id, code, name, status, is_main, created_at)
    VALUES
      ('br-a', 'comp-a', 'A1', 'Company A Branch', 'active', 1, ${now}),
      ('br-b', 'comp-b', 'B1', 'Company B Branch', 'active', 1, ${now});
  `);

  const dataA = await getCompanyDashboardData(d1, { companyId: 'comp-a', companySlug: 'comp-a' });
  const dataB = await getCompanyDashboardData(d1, { companyId: 'comp-b', companySlug: 'comp-b' });

  assert.equal(dataA.warehouses.some((w) => w.name === 'Company B Branch'), false);
  assert.equal(dataB.warehouses.some((w) => w.name === 'Company A Branch'), false);
});

test('24: Dashboard widget ordering consumes and respects saved order', () => {
  const activeWidgets = CORE_DASHBOARD_WIDGETS.filter((w) => ['stat-sales', 'recent-sales', 'quick-actions'].includes(w.id));
  const customOrder = ['recent-sales', 'quick-actions', 'stat-sales'];

  const sorted = sortWidgetsByOrder(activeWidgets, customOrder);
  assert.deepEqual(sorted.map((w) => w.id), ['recent-sales', 'quick-actions', 'stat-sales']);
});

test('25: Test fixtures and demo content remain isolated and are not imported in production dashboard', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.equal(dashSrc.includes('@/lib/content/demo-dashboard'), false);
  assert.equal(dashSrc.includes('@/lib/content/demo-dashboard-ranges'), false);

  const filterSrc = readFileSync('components/dashboard/DashboardFilterBar.tsx', 'utf8');
  assert.equal(filterSrc.includes('@/lib/content/demo-dashboard-ranges'), false);
});
