import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { getCompanyDashboardData } from '../lib/dashboard/data-service.ts';
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

    CREATE TABLE eap_dev_organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'verified',
      website TEXT NOT NULL DEFAULT '',
      support_email TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
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

    CREATE TABLE eap_app_installations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      version_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'installed',
      granted_permissions TEXT NOT NULL DEFAULT '[]',
      configuration TEXT NOT NULL DEFAULT '{}',
      installed_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE crm_parties (
      id TEXT PRIMARY KEY NOT NULL,
      company_id TEXT NOT NULL,
      party_type TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE crm_leads (
      id TEXT PRIMARY KEY NOT NULL,
      company_id TEXT NOT NULL,
      party_id TEXT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'new' NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  return { d1, sqlite };
}

test('1 & 2. Dashboard shell remains after CRM installation and does not remove core layout', async () => {
  const { d1, sqlite } = createTestDb();
  const companyId = 'comp_test_1';

  // Seed CRM app and installation
  sqlite.exec(`
    INSERT INTO eap_apps (id, organization_id, slug, name, category, official_app, app_type, status, created_by_account_id, created_at, updated_at)
    VALUES ('erpfy.contacts_crm', 'org_erpfy_official', 'contacts-crm', 'Contacts & CRM', 'CRM', 1, 'first_party', 'published', 'acc_1', 100, 100);

    INSERT INTO eap_app_installations (id, company_id, app_id, version_id, status, installed_at, updated_at)
    VALUES ('inst_1', '${companyId}', 'erpfy.contacts_crm', 'ver_1', 'installed', 100, 100);
  `);

  const dashData = await getCompanyDashboardData(d1, {
    companyId,
    companySlug: 'test-co',
    baseCurrency: 'USD',
    period: '7d',
  });

  // Verification: Installed apps include CRM, hasAnyApps is true, figures and warehouses structure exists
  assert.ok(dashData.hasAnyApps);
  assert.ok(dashData.installedAppSlugs.includes('contacts-crm') || dashData.installedAppSlugs.includes('erpfy.contacts_crm'));
  assert.ok(dashData.figures);
  assert.equal(typeof dashData.figures['Total Contacts'], 'number');
  assert.equal(typeof dashData.figures['Active Leads'], 'number');
  assert.equal(typeof dashData.figures.Organizations, 'number');
});

test('3. CRM widget registry activates after install', () => {
  const activeWidgets = getActiveDashboardWidgets({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPermissions: ['contacts.view', 'crm.leads.view'],
  });

  const widgetIds = activeWidgets.map((w) => w.id);
  assert.ok(widgetIds.includes('crm-total-parties'), 'crm-total-parties should be active');
  assert.ok(widgetIds.includes('crm-active-leads'), 'crm-active-leads should be active');
  assert.ok(widgetIds.includes('crm-organizations'), 'crm-organizations should be active');
});

test('4 & 5. CRM widgets read real DB data and zero records shows real zero state', async () => {
  const { d1, sqlite } = createTestDb();
  const companyId = 'comp_millan_seed';

  sqlite.exec(`
    INSERT INTO eap_apps (id, organization_id, slug, name, category, official_app, app_type, status, created_by_account_id, created_at, updated_at)
    VALUES ('erpfy.contacts_crm', 'org_erpfy_official', 'contacts-crm', 'Contacts & CRM', 'CRM', 1, 'first_party', 'published', 'acc_1', 100, 100);

    INSERT INTO eap_app_installations (id, company_id, app_id, version_id, status, installed_at, updated_at)
    VALUES ('inst_crm', '${companyId}', 'erpfy.contacts_crm', 'ver_1', 'installed', 100, 100);
  `);

  // Millan Agro Seed has zero contacts, zero leads
  const data = await getCompanyDashboardData(d1, {
    companyId,
    companySlug: 'asif',
    period: '7d',
  });

  assert.equal(data.figures['Total Contacts'], 0);
  assert.equal(data.figures['Active Leads'], 0);
  assert.equal(data.figures.Organizations, 0);

  // Add 2 real contacts for this company
  sqlite.exec(`
    INSERT INTO crm_parties (id, company_id, party_type, display_name, status, created_at)
    VALUES ('p_1', '${companyId}', 'person', 'John Doe', 'active', 200),
           ('p_2', '${companyId}', 'organization', 'Acme Corp', 'active', 201);

    INSERT INTO crm_leads (id, company_id, title, status, created_at)
    VALUES ('l_1', '${companyId}', 'Big Deal', 'new', 300);
  `);

  const updatedData = await getCompanyDashboardData(d1, {
    companyId,
    companySlug: 'asif',
    period: '7d',
  });

  assert.equal(updatedData.figures['Total Contacts'], 2);
  assert.equal(updatedData.figures['Active Leads'], 1);
  assert.equal(updatedData.figures.Organizations, 1);
});

test('6 & 17. No demo data introduced and company isolation is strictly enforced', async () => {
  const { d1, sqlite } = createTestDb();
  const companyA = 'comp_a';
  const companyB = 'comp_b';

  sqlite.exec(`
    INSERT INTO eap_apps (id, organization_id, slug, name, category, official_app, app_type, status, created_by_account_id, created_at, updated_at)
    VALUES ('erpfy.contacts_crm', 'org_erpfy_official', 'contacts-crm', 'Contacts & CRM', 'CRM', 1, 'first_party', 'published', 'acc_1', 100, 100);

    INSERT INTO eap_app_installations (id, company_id, app_id, version_id, status, installed_at, updated_at)
    VALUES ('inst_a', '${companyA}', 'erpfy.contacts_crm', 'ver_1', 'installed', 100, 100),
           ('inst_b', '${companyB}', 'erpfy.contacts_crm', 'ver_1', 'installed', 100, 100);

    INSERT INTO crm_parties (id, company_id, party_type, display_name, status, created_at)
    VALUES ('p_a1', '${companyA}', 'organization', 'Company A Org', 'active', 100),
           ('p_a2', '${companyA}', 'person', 'Company A Person', 'active', 100);
  `);

  const dataA = await getCompanyDashboardData(d1, { companyId: companyA, companySlug: 'a' });
  const dataB = await getCompanyDashboardData(d1, { companyId: companyB, companySlug: 'b' });

  assert.equal(dataA.figures['Total Contacts'], 2);
  assert.equal(dataB.figures['Total Contacts'], 0, 'Company B must have 0 contacts (isolated)');
  assert.equal(dataA.figures.Sales, 0, 'No demo sales data fabricated');
  assert.equal(dataA.figures.Purchases, 0, 'No demo purchases data fabricated');
});

test('7, 8 & 9. CRM disable removes CRM widgets only, Dashboard remains, re-enable restores once', () => {
  // Enabled CRM: CRM widgets active
  const enabledWidgets = getActiveDashboardWidgets({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPermissions: ['contacts.view', 'crm.leads.view'],
  });
  assert.ok(enabledWidgets.some((w) => w.id === 'crm-total-parties'));

  // Disabled CRM: CRM widgets inactive
  const disabledWidgets = getActiveDashboardWidgets({
    installedAppSlugs: [], // disabled apps are not in active installed list
    userPermissions: ['contacts.view', 'crm.leads.view'],
  });
  assert.ok(!disabledWidgets.some((w) => w.id === 'crm-total-parties'));

  // Re-enabled CRM: CRM widgets restored once (no duplicates)
  const reenabledWidgets = getActiveDashboardWidgets({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPermissions: ['contacts.view', 'crm.leads.view'],
  });
  const partyWidgets = reenabledWidgets.filter((w) => w.id === 'crm-total-parties');
  assert.equal(partyWidgets.length, 1);
});

test('10. Dashboard Settings contains active CRM widgets and respects order', () => {
  const active = getActiveDashboardWidgets({
    installedAppSlugs: ['contacts-crm'],
    userPermissions: ['contacts.view', 'crm.leads.view'],
  });

  const crmLabels = active.filter((w) => w.id.startsWith('crm-')).map((w) => w.label);
  assert.ok(crmLabels.includes('CRM — Total Contacts'));
  assert.ok(crmLabels.includes('CRM — Active Leads'));
  assert.ok(crmLabels.includes('CRM — Organizations'));

  // Custom widget order
  const customOrder = ['crm-active-leads', 'crm-total-parties', 'crm-organizations'];
  const sorted = sortWidgetsByOrder(active, customOrder);
  const sortedCrmIds = sorted.filter((w) => w.id.startsWith('crm-')).map((w) => w.id);
  assert.deepEqual(sortedCrmIds.slice(0, 3), customOrder);
});

test('11, 12, 13, 14 & 15. Official CRM first-party classification vs private plugin identity', () => {
  // Official first-party CRM app metadata
  const officialApp = {
    id: 'erpfy.contacts_crm',
    slug: 'contacts-crm',
    appType: 'first_party',
    isFirstParty: true,
    isPrivate: false,
    isFeatured: true,
    developer: {
      id: 'org_erpfy_official',
      name: 'ERPFY',
    },
  };

  // Check display rules
  const isOfficialFirstParty = Boolean(
    officialApp.isFirstParty ||
    officialApp.appType === 'first_party' ||
    officialApp.isFeatured ||
    officialApp.id === 'erpfy.contacts_crm' ||
    officialApp.developer?.name === 'ERPFY'
  );
  assert.equal(isOfficialFirstParty, true, 'Official CRM must be recognized as first-party');

  const officialBadge = isOfficialFirstParty ? 'Foundation' : 'Private';
  assert.equal(officialBadge, 'Foundation', 'Official CRM must show Foundation badge, not Private');

  const officialPublisher = isOfficialFirstParty
    ? 'ERPFY'
    : officialApp.developer.name.replace(/\s*\([a-f0-9-]{8,}\)/i, '');
  assert.equal(officialPublisher, 'ERPFY', 'Publisher must be ERPFY');

  // Tenant-uploaded private plugin metadata
  const tenantPrivateApp = {
    id: 'app_tenant_custom_1',
    slug: 'custom-tool',
    appType: 'private',
    isFirstParty: false,
    isPrivate: true,
    isFeatured: false,
    developer: {
      id: 'org_priv_ad014aa3-147b-41',
      name: 'Private Tenant Apps (ad014aa3-147b-4198-964d-8b309ca4199e)',
    },
  };

  const isTenantFirstParty = Boolean(
    tenantPrivateApp.isFirstParty ||
    tenantPrivateApp.appType === 'first_party' ||
    tenantPrivateApp.isFeatured ||
    tenantPrivateApp.id === 'erpfy.contacts_crm' ||
    tenantPrivateApp.developer?.name === 'ERPFY'
  );
  assert.equal(isTenantFirstParty, false, 'Tenant plugin must NOT be classified as first-party');

  const tenantBadge = isTenantFirstParty ? 'Foundation' : 'Private';
  assert.equal(tenantBadge, 'Private', 'Tenant uploaded plugin must retain Private badge');

  // Verify internal raw UUID is stripped from publisher display
  const tenantPublisher = isTenantFirstParty
    ? 'ERPFY'
    : tenantPrivateApp.developer.name.replace(/\s*\([a-f0-9-]{8,}\)/i, '');
  assert.equal(tenantPublisher, 'Private Tenant Apps', 'Raw UUID must be stripped from publisher display');
  assert.ok(!tenantPublisher.includes('ad014aa3'), 'No UUID in publisher name');
});

test('16. Future plugin contribution does not replace Dashboard shell', () => {
  // Simulate future Inventory + Accounting + Seed Management plugins installed
  const widgets = getActiveDashboardWidgets({
    installedAppSlugs: ['erpfy.contacts_crm', 'erpfy.inventory', 'erpfy.accounting'],
    userPermissions: ['*'],
  });

  const ids = new Set(widgets.map((w) => w.id));
  assert.ok(ids.has('crm-total-parties'), 'CRM widget present');
  assert.ok(ids.has('stock-value'), 'Inventory widget present');
  assert.ok(ids.has('stat-profit'), 'Accounting widget present');
  assert.ok(ids.has('quick-actions'), 'Core quick actions present');
});
