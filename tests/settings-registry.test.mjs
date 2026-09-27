import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllSettingsMetadata,
  getSettingsMetadata,
  getSettingsByOwnership,
  getSettingsByGroup,
  isPluginOwnedSetting,
  isCountryLocalizationSetting,
  SETTINGS_REGISTRY,
} from '../lib/settings/registry.ts';

test('settings registry contains all 30 standard settings destinations', () => {
  const allItems = getAllSettingsMetadata();
  assert.equal(allItems.length, 30);
  assert.equal(SETTINGS_REGISTRY.length, 30);
});

test('every settings item has valid ownership type and required metadata fields', () => {
  const validOwnershipTypes = new Set([
    'CORE_PLATFORM',
    'USER_PREFERENCE',
    'WORKSPACE_COMPANY',
    'PLUGIN_OWNED',
    'COUNTRY_LOCALIZATION',
    'PLATFORM_ADMIN',
    'DEVELOPER_ONLY',
  ]);

  for (const item of getAllSettingsMetadata()) {
    assert.ok(item.id, `Item must have an id`);
    assert.ok(item.label, `Item ${item.id} must have a label`);
    assert.ok(item.currentRoute, `Item ${item.id} must have a currentRoute`);
    assert.ok(item.tabId, `Item ${item.id} must have a tabId`);
    assert.ok(validOwnershipTypes.has(item.ownershipType), `Item ${item.id} has invalid ownershipType: ${item.ownershipType}`);
    assert.ok(['account', 'company', 'hybrid'].includes(item.scope), `Item ${item.id} has invalid scope`);
    assert.ok(typeof item.adminOnly === 'boolean', `Item ${item.id} must define adminOnly`);
    assert.ok(typeof item.futureDynamicEligible === 'boolean', `Item ${item.id} must define futureDynamicEligible`);
    assert.ok(item.compatibilityNotes, `Item ${item.id} must have compatibilityNotes`);
  }
});

test('workspace / company core settings classification', () => {
  const general = getSettingsMetadata('general');
  assert.ok(general);
  assert.equal(general.ownershipType, 'WORKSPACE_COMPANY');
  assert.equal(general.scope, 'company');

  const localization = getSettingsMetadata('localization');
  assert.ok(localization);
  assert.equal(localization.ownershipType, 'WORKSPACE_COMPANY');
  assert.equal(localization.scope, 'company');

  const invoicePdf = getSettingsMetadata('invoice-pdf');
  assert.ok(invoicePdf);
  assert.equal(invoicePdf.ownershipType, 'WORKSPACE_COMPANY');
  assert.ok(invoicePdf.futureOwnershipNotes?.includes('Accounting'));
});

test('plugin owned settings classification (Sales, POS, Pharmacy, Printing)', () => {
  // Sales
  const salesDefaults = getSettingsMetadata('sales-defaults');
  assert.equal(salesDefaults?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(salesDefaults?.owningCapability, 'erpfy.sales');
  assert.equal(isPluginOwnedSetting('sales-defaults'), true);

  const salesFeatures = getSettingsMetadata('sales-features');
  assert.equal(salesFeatures?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(salesFeatures?.owningCapability, 'erpfy.sales');

  const prefixes = getSettingsMetadata('prefixes');
  assert.equal(prefixes?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(prefixes?.owningCapability, 'erpfy.sales');

  // Pharmacy
  const pharmacy = getSettingsMetadata('pharmacy');
  assert.equal(pharmacy?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(pharmacy?.owningCapability, 'erpfy.pharmacy');
  assert.equal(isPluginOwnedSetting('pharmacy'), true);

  // POS & Printing
  const posSettings = getSettingsMetadata('pos-settings');
  assert.equal(posSettings?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(posSettings?.owningCapability, 'erpfy.pos');

  const posReceipt = getSettingsMetadata('pos-receipt');
  assert.equal(posReceipt?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(posReceipt?.owningCapability, 'erpfy.pos');

  const networkPrinting = getSettingsMetadata('network-printing');
  assert.equal(networkPrinting?.ownershipType, 'PLUGIN_OWNED');
  assert.equal(networkPrinting?.owningCapability, 'erpfy.printing');
});

test('country statutory localization classification', () => {
  const zatca = getSettingsMetadata('zatca');
  assert.ok(zatca);
  assert.equal(zatca.ownershipType, 'COUNTRY_LOCALIZATION');
  assert.equal(zatca.owningCapability, 'erpfy.l10n_sa');
  assert.equal(isCountryLocalizationSetting('zatca'), true);
});

test('user preference settings classification', () => {
  const userPrefs = ['dashboard', 'sidebar-menu', 'datatable', 'appearance'];
  for (const id of userPrefs) {
    const item = getSettingsMetadata(id);
    assert.equal(item?.ownershipType, 'USER_PREFERENCE', `${id} should be USER_PREFERENCE`);
    assert.equal(item?.scope, 'account', `${id} should be account-scoped`);
  }
});

test('platform admin settings classification', () => {
  const adminSettings = ['security', 'backup', 'maintenance', 'demo-data', 'backup-archives'];
  for (const id of adminSettings) {
    const item = getSettingsMetadata(id);
    assert.equal(item?.ownershipType, 'PLATFORM_ADMIN', `${id} should be PLATFORM_ADMIN`);
    assert.equal(item?.adminOnly, true, `${id} should be adminOnly: true`);
  }
});

test('core platform integration and extension framework classification', () => {
  const integrations = ['mail', 'sms', 'payment-gateway', 'custom-fields', 'modules', 'export', 'calendar', 'pwa', 'mobile-app', 'login-devices'];
  for (const id of integrations) {
    const item = getSettingsMetadata(id);
    assert.equal(item?.ownershipType, 'CORE_PLATFORM', `${id} should be CORE_PLATFORM`);
  }
});

test('getSettingsByOwnership and getSettingsByGroup filters return expected counts', () => {
  const pluginOwned = getSettingsByOwnership('PLUGIN_OWNED');
  assert.equal(pluginOwned.length, 7); // sales-defaults, sales-features, prefixes, pharmacy, pos-settings, pos-receipt, network-printing

  const userPrefs = getSettingsByOwnership('USER_PREFERENCE');
  assert.equal(userPrefs.length, 4); // dashboard, sidebar-menu, datatable, appearance

  const workspaceCompany = getSettingsByOwnership('WORKSPACE_COMPANY');
  assert.equal(workspaceCompany.length, 3); // general, localization, invoice-pdf

  const platformAdmin = getSettingsByOwnership('PLATFORM_ADMIN');
  assert.equal(platformAdmin.length, 5); // security, backup, maintenance, demo-data, backup-archives

  const countryL10n = getSettingsByOwnership('COUNTRY_LOCALIZATION');
  assert.equal(countryL10n.length, 1); // zatca

  const corePlatform = getSettingsByOwnership('CORE_PLATFORM');
  assert.equal(corePlatform.length, 10); // modules, export, calendar, pwa, mobile-app, mail, sms, payment-gateway, custom-fields, login-devices
  assert.equal(pluginOwned.length + userPrefs.length + workspaceCompany.length + platformAdmin.length + countryL10n.length + corePlatform.length, 30);

  const salesGroup = getSettingsByGroup('Sales');
  assert.equal(salesGroup.length, 5);

  const posGroup = getSettingsByGroup('POS');
  assert.equal(posGroup.length, 3);

  const systemGroup = getSettingsByGroup('System');
  assert.equal(systemGroup.length, 10);

  const integrationGroup = getSettingsByGroup('Integrations');
  assert.equal(integrationGroup.length, 10);

  const generalGroup = getSettingsByGroup(null);
  assert.equal(generalGroup.length, 2);
});

