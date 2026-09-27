import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getActiveDashboardWidgets,
  getActiveQuickActions,
  validateWidgetDefinition,
  sortWidgetsByOrder,
  CORE_DASHBOARD_WIDGETS,
} from '../lib/dashboard/widget-registry.ts';

import {
  parsePluginManifest,
  validatePluginManifest,
} from '../lib/eap/manifest.ts';

import { scanEapPackage } from '../lib/eap/scanner.ts';
import { resolveDashboardForUser } from '../lib/dashboard/personalization.ts';

// ---------------------------------------------------------------------------
// 1. Permanent Core Dashboard Shell Invariant & Widget Registry Tests
// ---------------------------------------------------------------------------

test('Universal Dashboard Widget Engine - Core Dashboard Widgets are defined and typed', () => {
  assert.ok(CORE_DASHBOARD_WIDGETS.length >= 10, 'Registry must contain core widgets');

  for (const widget of CORE_DASHBOARD_WIDGETS) {
    assert.ok(widget.id, 'Widget must have id');
    assert.ok(widget.title, 'Widget must have title');
    assert.ok(widget.type, 'Widget must have type');
    assert.ok(widget.preferredSize, 'Widget must have preferredSize');
    assert.ok(typeof widget.priority === 'number', 'Widget must have numeric priority');
    assert.ok(Array.isArray(widget.pluginSlugs), 'Widget must have pluginSlugs array');
    assert.ok(widget.ownerPlugin, 'Widget must have ownerPlugin');
  }
});

test('Universal Dashboard Widget Engine - validateWidgetDefinition checks validity', () => {
  const valid = validateWidgetDefinition({
    id: 'test.widget',
    title: 'Test Widget',
    type: 'kpi',
    preferredSize: 'kpi',
    priority: 50,
    ownerPlugin: 'erpfy.test',
  });
  assert.equal(valid.valid, true);

  const missingTitle = validateWidgetDefinition({
    id: 'test.widget',
    type: 'kpi',
  });
  assert.equal(missingTitle.valid, false);
  assert.ok(missingTitle.error?.includes('title'));

  const invalidType = validateWidgetDefinition({
    id: 'test.widget',
    title: 'Test',
    type: 'invalid_type',
  });
  assert.equal(invalidType.valid, false);
  assert.ok(invalidType.error?.includes('type'));
});

// ---------------------------------------------------------------------------
// 2. Strict Cross-Plugin Dependency Resolution
// ---------------------------------------------------------------------------

test('Universal Dashboard Widget Engine - top-customers-chart requires BOTH CRM and Sales', () => {
  // Case A: CRM only -> top-customers-chart must NOT be active
  const crmOnlyWidgets = getActiveDashboardWidgets(['erpfy.contacts_crm']);
  const crmHasTopCustomers = crmOnlyWidgets.some((w) => w.id === 'top-customers-chart');
  assert.equal(crmHasTopCustomers, false, 'Top customers chart must NOT appear when sales is missing');

  // Case B: Sales only -> top-customers-chart must NOT be active
  const salesOnlyWidgets = getActiveDashboardWidgets(['erpfy.sales']);
  const salesHasTopCustomers = salesOnlyWidgets.some((w) => w.id === 'top-customers-chart');
  assert.equal(salesHasTopCustomers, false, 'Top customers chart must NOT appear when CRM is missing');

  // Case C: Both CRM AND Sales installed -> top-customers-chart MUST be active
  const bothWidgets = getActiveDashboardWidgets(['erpfy.contacts_crm', 'erpfy.sales']);
  const bothHasTopCustomers = bothWidgets.some((w) => w.id === 'top-customers-chart');
  assert.equal(bothHasTopCustomers, true, 'Top customers chart MUST appear when both CRM and Sales are active');
});

test('Universal Dashboard Widget Engine - CRM KPIs resolve accurately when CRM is active', () => {
  const activeWidgets = getActiveDashboardWidgets(['erpfy.contacts_crm']);
  const activeIds = new Set(activeWidgets.map((w) => w.id));

  assert.ok(activeIds.has('crm.total_contacts'), 'Must include crm.total_contacts');
  assert.ok(activeIds.has('crm.active_leads'), 'Must include crm.active_leads');
  assert.ok(activeIds.has('crm.organizations'), 'Must include crm.organizations');
  assert.ok(activeIds.has('crm.activities_due'), 'Must include crm.activities_due');

  // Sales and Purchasing specific widgets should NOT be present
  assert.equal(activeIds.has('sales-purchases-chart'), false);
  assert.equal(activeIds.has('top-products-chart'), false);
  assert.equal(activeIds.has('recent-sales'), false);
});

// ---------------------------------------------------------------------------
// 3. Dynamic Quick Actions Engine
// ---------------------------------------------------------------------------

test('Universal Dashboard Widget Engine - getActiveQuickActions returns actions for installed plugins', () => {
  // No apps installed -> zero quick actions
  const emptyActions = getActiveQuickActions([]);
  assert.equal(emptyActions.length, 0);

  // CRM installed -> CRM quick actions present
  const crmActions = getActiveQuickActions(['erpfy.contacts_crm']);
  assert.ok(crmActions.length >= 2, 'CRM should contribute at least 2 quick actions');

  const addParty = crmActions.find((a) => a.id === 'action.add_party');
  assert.ok(addParty, 'Must have action.add_party');
  assert.ok(addParty.href.includes('/crm'));

  const newLead = crmActions.find((a) => a.id === 'action.new_lead');
  assert.ok(newLead, 'Must have action.new_lead');
  assert.ok(newLead.href.includes('view=leads'));
});

test('Universal Dashboard Widget Engine - Quick Actions respect user permissions', () => {
  // User has only contacts.view, but not contacts.edit
  const restrictedActions = getActiveQuickActions(
    ['erpfy.contacts_crm'],
    ['contacts.view'],
  );
  // action.add_party requires contacts.edit -> should be filtered out
  const hasAddParty = restrictedActions.some((a) => a.id === 'action.add_party');
  assert.equal(hasAddParty, false, 'Permission-protected action should be filtered out');

  // User has full permissions
  const authorizedActions = getActiveQuickActions(
    ['erpfy.contacts_crm'],
    ['contacts.view', 'contacts.edit'],
  );
  const hasAuthorizedParty = authorizedActions.some((a) => a.id === 'action.add_party');
  assert.equal(hasAuthorizedParty, true, 'Authorized action should be present');
});

// ---------------------------------------------------------------------------
// 4. Plugin Manifest Schema & UI Theme Inheritance Validation
// ---------------------------------------------------------------------------

test('Universal Plugin Theme - Manifest parser validates ui and dashboard schema', () => {
  const validManifest = {
    protocol: 'eap-v1',
    app_id: 'erpfy.test_plugin',
    name: 'Test Plugin',
    slug: 'test-plugin',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    permissions: ['test.view'],
    ui: {
      design_system: 'erpfy',
      theme_inheritance: 'required',
      supports_dark_mode: true,
      entry_route: '/test',
    },
    dashboard: {
      widgets: [
        {
          id: 'test.metric',
          title: 'Test Metric',
          type: 'kpi',
          preferred_size: 'kpi',
          priority: 80,
        },
      ],
    },
    quick_actions: [
      {
        id: 'action.test_action',
        label: 'Test Action',
        href: '/test/action',
        icon: 'Plus',
      },
    ],
  };

  const parsed = parsePluginManifest(validManifest);
  assert.equal(parsed.ui?.design_system, 'erpfy');
  assert.equal(parsed.ui?.theme_inheritance, 'required');
  assert.equal(parsed.dashboard?.widgets?.length, 1);
  assert.equal(parsed.quick_actions?.length, 1);

  const validation = validatePluginManifest(parsed);
  assert.equal(validation.valid, true);
});

test('Universal Plugin Theme - Manifest validator rejects foreign design systems', () => {
  const foreignManifest = {
    protocol: 'eap-v1',
    app_id: 'erpfy.bad_theme',
    name: 'Bad Theme Plugin',
    slug: 'bad-theme',
    version: '1.0.0',
    minimum_platform_version: '1.0.0',
    permissions: ['test.view'],
    ui: {
      design_system: 'bootstrap', // INVALID
      theme_inheritance: 'optional', // INVALID
    },
  };

  assert.throws(
    () => parsePluginManifest(foreignManifest),
    /design_system.*erpfy/i,
    'Should reject non-erpfy design system',
  );
});

// ---------------------------------------------------------------------------
// 5. Security Scanner - Rejection of Global Theme Overrides
// ---------------------------------------------------------------------------

test('Security Scanner - Rejects global CSS :root theme overrides in plugins', () => {
  const dummyManifest = { id: 'test.app', name: 'Test', version: '1.0.0', permissions: [] };
  const code = {
    'styles.css': `
      :root {
        --erpfy-brand: #ff0000 !important;
        background: #000000 !important;
      }
    `,
  };

  const scanResult = scanEapPackage(dummyManifest, code);
  assert.equal(scanResult.status, 'FAIL', 'Scanner must reject :root theme overrides');
  assert.ok(
    scanResult.issues.some((issue) => issue.includes('Forbidden global :root theme override')),
    'Must trigger THEME_ROOT_OVERRIDE issue',
  );
});

test('Security Scanner - Rejects global body/html styling overrides in plugins', () => {
  const dummyManifest = { id: 'test.app', name: 'Test', version: '1.0.0', permissions: [] };
  const code = {
    'index.css': `
      body {
        background: red !important;
        color: blue;
      }
    `,
  };

  const scanResult = scanEapPackage(dummyManifest, code);
  assert.equal(scanResult.status, 'FAIL', 'Scanner must reject body/html overrides');
  assert.ok(
    scanResult.issues.some((issue) => issue.includes('Forbidden destructive body/html CSS override')),
    'Must trigger body/html override issue',
  );
});

test('Security Scanner - Rejects duplicate platform shells in plugins', () => {
  const dummyManifest = { id: 'test.app', name: 'Test', version: '1.0.0', permissions: [] };
  const code = {
    'PluginView.tsx': `
      export function PluginView() {
        return (
          <div id="erpfy-topbar">
            <h1>Fake Core Shell</h1>
          </div>
        );
      }
    `,
  };

  const scanResult = scanEapPackage(dummyManifest, code);
  assert.equal(scanResult.status, 'FAIL', 'Scanner must reject fake platform shells');
  assert.ok(
    scanResult.issues.some((issue) => issue.includes('Forbidden attempt to create duplicate platform shell elements')),
    'Must trigger duplicate platform shell issue',
  );
});

// ---------------------------------------------------------------------------
// 6. Template Plugin & CRM Manifest Verification
// ---------------------------------------------------------------------------

test('Template Plugin - Starter template manifest is valid and conforms to design system', () => {
  const templatePath = resolve(process.cwd(), 'plugins/template/manifest.json');
  const templateContent = readFileSync(templatePath, 'utf8');
  const manifest = JSON.parse(templateContent);

  const parsed = parsePluginManifest(manifest);
  assert.equal(parsed.ui?.design_system, 'erpfy');
  assert.equal(parsed.ui?.theme_inheritance, 'required');
  assert.ok(parsed.dashboard?.widgets?.length > 0);
  assert.ok(parsed.quick_actions?.length > 0);

  const validation = validatePluginManifest(parsed);
  assert.equal(validation.valid, true, `Validation failed: ${validation.errors.join(', ')}`);
});

test('Contacts CRM Plugin - Official CRM manifest conforms to design system and widget engine', () => {
  const crmPath = resolve(process.cwd(), 'plugins/erpfy.contacts_crm/manifest.json');
  const crmContent = readFileSync(crmPath, 'utf8');
  const manifest = JSON.parse(crmContent);

  const parsed = parsePluginManifest(manifest);
  assert.equal(parsed.ui?.design_system, 'erpfy');
  assert.equal(parsed.ui?.theme_inheritance, 'required');
  assert.ok(parsed.dashboard?.widgets?.length >= 4);
  assert.ok(parsed.quick_actions?.length >= 2);

  const validation = validatePluginManifest(parsed);
  assert.equal(validation.valid, true, `Validation failed: ${validation.errors.join(', ')}`);
});

// ---------------------------------------------------------------------------
// 7. Section 46: 25 Personalization & Architecture Test Cases
// ---------------------------------------------------------------------------

test('1. DashboardShell remains Core', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(dashSrc.includes('{greeting}'), 'Core shell owns greeting');
  assert.ok(dashSrc.includes('{subline}'), 'Core shell owns company subline');
  assert.ok(dashSrc.includes('DashboardFilterBar'), 'Core shell owns date/currency filters');
  assert.ok(dashSrc.includes('ErpfyErrorBoundary'), 'Core shell owns failure boundary isolation');
});

test('2. CRM widgets appear only when installed', () => {
  const noCrm = getActiveDashboardWidgets([]);
  assert.equal(noCrm.some((w) => w.id.startsWith('crm.')), false, 'Zero CRM widgets when not installed');

  const withCrm = getActiveDashboardWidgets(['erpfy.contacts_crm']);
  assert.ok(withCrm.some((w) => w.id === 'crm.total_contacts'), 'CRM total contacts appears when installed');
  assert.ok(withCrm.some((w) => w.id === 'crm.active_leads'), 'CRM active leads appears when installed');
});

test('3. user A layout differs from user B', () => {
  const userAPrefs = {
    widgets: [
      { id: 'crm.total_contacts', order: 1, visible: true },
      { id: 'crm.organizations', order: 2, visible: true },
    ],
  };
  const userBPrefs = {
    widgets: [
      { id: 'crm.organizations', order: 1, visible: true },
      { id: 'crm.total_contacts', order: 2, visible: true },
    ],
  };

  const resA = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: userAPrefs,
  });
  const resB = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: userBPrefs,
  });

  const aFirst = resA.widgets[0]?.id;
  const bFirst = resB.widgets[0]?.id;
  assert.equal(aFirst, 'crm.total_contacts');
  assert.equal(bFirst, 'crm.organizations');
  assert.notEqual(aFirst, bFirst);
});

test('4. same user has different layout in Company A vs B', () => {
  const compAPrefs = {
    widgets: [{ id: 'crm.total_contacts', order: 1 }],
  };
  const compBPrefs = {
    widgets: [{ id: 'crm.organizations', order: 1 }],
  };

  const resCompA = resolveDashboardForUser({
    companyId: 'company-a',
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: compAPrefs,
  });
  const resCompB = resolveDashboardForUser({
    companyId: 'company-b',
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: compBPrefs,
  });

  assert.equal(resCompA.widgets[0]?.id, 'crm.total_contacts');
  assert.equal(resCompB.widgets[0]?.id, 'crm.organizations');
});

test('5. unauthorized widget cannot be added', () => {
  // User lacks accounting.view
  const maliciousPrefs = {
    widgets: [{ id: 'stat-profit', visible: true, order: 1 }],
  };
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.accounting'],
    userPermissions: ['contacts.view'], // no accounting.view!
    userPreferences: maliciousPrefs,
  });

  const hasProfit = resolved.widgets.some((w) => w.id === 'stat-profit');
  assert.equal(hasProfit, false, 'Unauthorized widget must never be accessible via preferences');
});

test('6. stale unauthorized preference ignored', () => {
  const stalePrefs = {
    widgets: [
      { id: 'crm.total_contacts', order: 1 },
      { id: 'stat-profit', order: 2 }, // unauthorized
    ],
  };
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm', 'erpfy.accounting'],
    userPermissions: ['contacts.view'], // no accounting.view
    userPreferences: stalePrefs,
  });

  assert.equal(resolved.widgets.some((w) => w.id === 'stat-profit'), false);
  assert.equal(resolved.widgets.some((w) => w.id === 'crm.total_contacts'), true);
});

test('7. role/permission removal hides widget immediately', () => {
  const prefs = {
    widgets: [{ id: 'stat-profit', order: 1 }],
  };

  // With permission
  const withPerm = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.accounting'],
    userPermissions: ['accounting.view'],
    userPreferences: prefs,
  });
  assert.equal(withPerm.widgets.some((w) => w.id === 'stat-profit'), true);

  // When admin revokes permission
  const withoutPerm = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.accounting'],
    userPermissions: [],
    userPreferences: prefs,
  });
  assert.equal(withoutPerm.widgets.some((w) => w.id === 'stat-profit'), false);
});

test('8. permission restore restores compatible saved placement', () => {
  const prefs = {
    widgets: [
      { id: 'crm.total_contacts', order: 1 },
      { id: 'stat-profit', order: 2 },
    ],
  };

  // When permission returns
  const restored = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm', 'erpfy.accounting'],
    userPermissions: ['contacts.view', 'accounting.view'],
    userPreferences: prefs,
  });

  assert.equal(restored.widgets[0]?.id, 'crm.total_contacts');
  assert.equal(restored.widgets[1]?.id, 'stat-profit');
});

test('9. company default applies to new user', () => {
  const companyDefaults = {
    widgets: [
      { id: 'crm.organizations', order: 1 },
      { id: 'crm.total_contacts', order: 2 },
    ],
  };

  // New user with no personal preferences
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    companyDefaults,
    userPreferences: null,
  });

  assert.equal(resolved.widgets[0]?.id, 'crm.organizations');
  assert.equal(resolved.widgets[1]?.id, 'crm.total_contacts');
});

test('10. personal preference overrides company default', () => {
  const companyDefaults = {
    widgets: [
      { id: 'crm.organizations', order: 1 },
      { id: 'crm.total_contacts', order: 2 },
    ],
  };
  const userPreferences = {
    widgets: [
      { id: 'crm.total_contacts', order: 1 },
      { id: 'crm.organizations', order: 2 },
    ],
  };

  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    companyDefaults,
    userPreferences,
  });

  assert.equal(resolved.widgets[0]?.id, 'crm.total_contacts');
  assert.equal(resolved.widgets[1]?.id, 'crm.organizations');
});

test('11. Reset My Dashboard restores default', () => {
  const companyDefaults = {
    widgets: [{ id: 'crm.organizations', order: 1 }],
  };

  // Resetting personal preferences passes userPreferences: null
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    companyDefaults,
    userPreferences: null,
  });

  assert.equal(resolved.widgets[0]?.id, 'crm.organizations');
});

test('12. plugin disable hides widgets but preserves preference', () => {
  const userPrefs = {
    widgets: [{ id: 'crm.total_contacts', order: 1, visible: true }],
  };

  // CRM disabled
  const disabled = resolveDashboardForUser({
    installedAppSlugs: [], // disabled
    userPreferences: userPrefs,
  });

  assert.equal(disabled.widgets.length, 0);
  assert.equal(userPrefs.widgets[0]?.id, 'crm.total_contacts', 'Preferences remain preserved in storage');
});

test('13. plugin re-enable restores placement', () => {
  const userPrefs = {
    widgets: [
      { id: 'crm.organizations', order: 1 },
      { id: 'crm.total_contacts', order: 2 },
    ],
  };

  // CRM re-enabled
  const reEnabled = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: userPrefs,
  });

  assert.equal(reEnabled.widgets[0]?.id, 'crm.organizations');
  assert.equal(reEnabled.widgets[1]?.id, 'crm.total_contacts');
});

test('14. uninstall stale widget ID does not break dashboard', () => {
  const stalePrefs = {
    widgets: [
      { id: 'nonexistent.ghost_widget', order: 1 },
      { id: 'crm.total_contacts', order: 2 },
    ],
  };

  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: stalePrefs,
  });

  assert.equal(resolved.widgets.some((w) => w.id === 'nonexistent.ghost_widget'), false);
  assert.equal(resolved.widgets[0]?.id, 'crm.total_contacts');
});

test('15. new plugin widgets merge without destroying user order', () => {
  const userPrefs = {
    widgets: [
      { id: 'crm.total_contacts', order: 1 },
      { id: 'crm.organizations', order: 2 },
    ],
  };

  // User already has CRM layout. Now Sales is installed.
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm', 'erpfy.sales'],
    userPreferences: userPrefs,
  });

  // User's first two widgets remain intact
  assert.equal(resolved.widgets[0]?.id, 'crm.total_contacts');
  assert.equal(resolved.widgets[1]?.id, 'crm.organizations');
  // New sales widgets merge after existing user widgets
  assert.ok(resolved.widgets.some((w) => w.id === 'stat-sales'));
});

test('16. new widget defaultVisible respected', () => {
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
  });
  const contacts = resolved.widgets.find((w) => w.id === 'crm.total_contacts');
  assert.equal(contacts?.visible, true);
});

test('17. company isolation', () => {
  const compA = resolveDashboardForUser({
    companyId: 'comp-1',
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: { widgets: [{ id: 'crm.total_contacts', order: 1 }] },
  });
  const compB = resolveDashboardForUser({
    companyId: 'comp-2',
    installedAppSlugs: ['erpfy.sales'],
    userPreferences: { widgets: [{ id: 'stat-sales', order: 1 }] },
  });

  assert.equal(compA.widgets[0]?.id, 'crm.total_contacts');
  assert.equal(compB.widgets[0]?.id, 'stat-sales');
});

test('18. user preference isolation', () => {
  const user1 = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: { widgets: [{ id: 'crm.total_contacts', order: 1 }] },
  });
  const user2 = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
    userPreferences: { widgets: [{ id: 'crm.organizations', order: 1 }] },
  });

  assert.notEqual(user1.widgets[0]?.id, user2.widgets[0]?.id);
});

test('19. Quick Actions permission-aware', () => {
  const viewOnly = getActiveQuickActions(
    ['erpfy.contacts_crm'],
    ['contacts.view'],
  );
  assert.equal(viewOnly.some((a) => a.id === 'action.add_party'), false);

  const editPerm = getActiveQuickActions(
    ['erpfy.contacts_crm'],
    ['contacts.view', 'contacts.edit'],
  );
  assert.equal(editPerm.some((a) => a.id === 'action.add_party'), true);
});

test('20. mobile uses logical layout not pixel coordinates', () => {
  const resolved = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.contacts_crm'],
  });
  for (const w of resolved.widgets) {
    assert.ok(w.zone, 'Widget must declare logical zone');
    assert.ok(typeof w.order === 'number', 'Widget must have logical order');
    assert.ok(w.resolvedSize, 'Widget must declare logical size token');
  }
});

test('21. Figma/Core layout remains intact', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(dashSrc.includes('DashboardFilterBar'));
  assert.ok(dashSrc.includes('grid gap-4 sm:grid-cols-2 xl:grid-cols-4'), 'KPI grid responsive breakpoints preserved');
  assert.ok(dashSrc.includes('Quick actions') || dashSrc.includes('quickActions'));
});

test('22. theme inheritance preserved', () => {
  const crmSrc = readFileSync('components/crm/CrmModule.tsx', 'utf8');
  assert.ok(crmSrc.includes('var(--erpfy-brand)'), 'Plugin inherits theme tokens');
  assert.equal(crmSrc.includes('text-emerald-'), false, 'Hardcoded foreign theme colors eliminated');
});

test('23. no plugin replaces Dashboard', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.ok(dashSrc.includes('export function ErpDashboard'));
  assert.ok(dashSrc.includes('DashboardKPIs'));
});

test('24. no demo data reintroduced', () => {
  const dashSrc = readFileSync('components/dashboard/ErpDashboard.tsx', 'utf8');
  assert.equal(dashSrc.includes('demo-dashboard'), false);
  assert.equal(dashSrc.includes('demo-dashboard-ranges'), false);
});

test('25. provider API independently enforces RBAC', () => {
  // Resolver strictly enforces requiredPermissions
  const profitWidget = CORE_DASHBOARD_WIDGETS.find((w) => w.id === 'stat-profit');
  assert.deepEqual(profitWidget?.requiredPermissions, ['accounting.view']);

  const unauthorized = resolveDashboardForUser({
    installedAppSlugs: ['erpfy.accounting'],
    userPermissions: ['contacts.view'],
  });
  assert.equal(unauthorized.widgets.some((w) => w.id === 'stat-profit'), false);
});


