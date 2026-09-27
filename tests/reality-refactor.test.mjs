import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
  normalizeAccountSystemSettings,
} from '../lib/settings/schema.ts';

test('DEFAULT_ACCOUNT_SYSTEM_SETTINGS contains no fake backup archives or demo warehouse labels', () => {
  assert.equal(Array.isArray(DEFAULT_ACCOUNT_SYSTEM_SETTINGS.backupArchives), true);
  assert.equal(DEFAULT_ACCOUNT_SYSTEM_SETTINGS.backupArchives.length, 0, 'backupArchives must be empty by default');
  assert.equal(DEFAULT_ACCOUNT_SYSTEM_SETTINGS.salesDefaultWarehouse, 'Main Warehouse');
  assert.equal(DEFAULT_ACCOUNT_SYSTEM_SETTINGS.salesDefaultWarehouse.includes('[DEMO]'), false);
});

test('Schema normalizes backup archives correctly preserving empty state', () => {
  const normalized = normalizeAccountSystemSettings({});
  assert.deepEqual(normalized.backupArchives, []);
});

test('Fake success probes are eliminated from Integration and POS panels', () => {
  const integrationSrc = readFileSync('components/account/settings/IntegrationSettingsPanels.tsx', 'utf8');
  assert.equal(
    integrationSrc.includes('Test email sent successfully to'),
    false,
    'Mail panel must not simulate fake email delivery'
  );
  assert.ok(
    integrationSrc.includes('Mail provider not configured'),
    'Mail panel must inform user if mail provider is not configured'
  );

  assert.equal(
    integrationSrc.includes('Database backup created successfully'),
    false,
    'Backup panel must not simulate fake backup creation'
  );
  assert.ok(
    integrationSrc.includes('Backup service not configured'),
    'Backup panel must inform user truthfully about backup service configuration'
  );

  const posSrc = readFileSync('components/account/settings/PosSettingsPanels.tsx', 'utf8');
  assert.equal(
    posSrc.includes('Connected to Thermal ESC/POS receipt printer'),
    false,
    'POS panel must not simulate fake network printer connection'
  );
  assert.ok(
    posSrc.includes('Printer service not configured'),
    'POS panel must inform user truthfully about network printer bridge'
  );
});

test('Appearance settings panel includes dark mode toggle', () => {
  const appearanceSrc = readFileSync('components/account/settings/AppearanceSettingsPanel.tsx', 'utf8');
  assert.ok(
    appearanceSrc.includes('appearance-dark-mode'),
    'Appearance panel must include dark mode switch'
  );
});

test('AccountSettingsForm segregates Core settings and dynamic plugin settings', () => {
  const formSrc = readFileSync('components/account/AccountSettingsForm.tsx', 'utf8');
  assert.ok(formSrc.includes('CORE_SETTINGS_GROUPS'), 'AccountSettingsForm must declare CORE_SETTINGS_GROUPS');
  assert.ok(formSrc.includes('Apps & Modules'), 'Modules must be renamed to Apps & Modules');
  assert.ok(formSrc.includes('installedSlugs'), 'AccountSettingsForm must track installedSlugs');
  assert.ok(
    formSrc.includes('companyId={company?.id}'),
    'SystemSettingsPanel must receive company context'
  );
});

test('SystemSettingsPanel connects Apps & Modules to real installation status', () => {
  const panelSrc = readFileSync('components/account/SystemSettingsPanel.tsx', 'utf8');
  assert.ok(
    panelSrc.includes('MODULE_APP_SLUGS'),
    'SystemSettingsPanel must map modules to canonical app slugs'
  );
  assert.ok(
    panelSrc.includes('Not Installed'),
    'SystemSettingsPanel must show Not Installed badge for uninstalled modules'
  );
  assert.ok(
    panelSrc.includes('View in App Store'),
    'SystemSettingsPanel must link uninstalled modules to App Store'
  );
});

test('ErpDashboard conditionalizes sample data badge and supports truthful empty state', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(
    dashSrc.includes('showSampleData &&'),
    'Sample data badge must only be shown when showSampleData is explicitly enabled'
  );
  assert.ok(
    dashSrc.includes('No sales recorded yet'),
    'Dashboard must display truthful empty state when sales are empty'
  );
});

test('Truthful empty states are standard across Customers, Orders, and Products modules', () => {
  const custSrc = readFileSync('components/modules/CustomersModule.tsx', 'utf8');
  assert.ok(custSrc.includes('initialCustomers = []'), 'CustomersModule must default to empty array');
  assert.ok(custSrc.includes('No customers found.'), 'CustomersModule must show truthful empty message');

  const ordSrc = readFileSync('components/modules/OrdersModule.tsx', 'utf8');
  assert.ok(ordSrc.includes('initialOrders = []'), 'OrdersModule must default to empty array');
  assert.ok(ordSrc.includes('No orders placed yet.'), 'OrdersModule must show truthful empty message');

  const prodSrc = readFileSync('components/modules/ProductsModule.tsx', 'utf8');
  assert.ok(prodSrc.includes('initialProducts = []'), 'ProductsModule must default to empty array');
  assert.ok(prodSrc.includes('No products in catalog.'), 'ProductsModule must show truthful empty message');
});

test('Sidebar navigation consumes sidebarMenuOrder preference in AccountShell', () => {
  const shellSrc = readFileSync('components/account/AccountShell.tsx', 'utf8');
  assert.ok(
    shellSrc.includes('sidebarMenuOrder'),
    'AccountShell must consume sidebarMenuOrder to order rail navigation'
  );
});

test('Dashboard datasets and warehouses contain no [DEMO] prefixes or fake warehouse tags', () => {
  const demoDashSrc = readFileSync('lib/content/demo-dashboard.ts', 'utf8');
  assert.equal(demoDashSrc.includes('[DEMO]'), false, 'demo-dashboard.ts must have zero [DEMO] strings');

  const demoRangesSrc = readFileSync('lib/content/demo-dashboard-ranges.ts', 'utf8');
  assert.equal(demoRangesSrc.includes('[DEMO]'), false, 'demo-dashboard-ranges.ts must have zero [DEMO] strings');
  assert.equal(demoRangesSrc.includes('[DEMO] Main Warehouse'), false);
  assert.equal(demoRangesSrc.includes('[DEMO] Depot 2'), false);
});

test('Dashboard implements truthful empty workspace container and capability-based widget scoping', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(dashSrc.includes('No business apps installed yet'), 'Dashboard must have truthful empty workspace container');
  assert.ok(dashSrc.includes('Browse App Store'), 'Dashboard empty state must link to App Store');
  assert.ok(dashSrc.includes('installedAppSlugs'), 'Dashboard must accept installedAppSlugs');
  assert.ok(dashSrc.includes('hasSales'), 'Dashboard must scope widgets by hasSales');
  assert.ok(dashSrc.includes('hasPurchasing'), 'Dashboard must scope widgets by hasPurchasing');
  assert.ok(dashSrc.includes('hasInventory'), 'Dashboard must scope widgets by hasInventory');
  assert.ok(dashSrc.includes('hasAccounting'), 'Dashboard must scope widgets by hasAccounting');
  assert.ok(dashSrc.includes('hasPayments'), 'Dashboard must scope widgets by hasPayments');
  assert.ok(dashSrc.includes('hasPos'), 'Dashboard must scope widgets by hasPos');
});

