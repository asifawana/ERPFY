import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

// Exercise the real shell, settings defaults and workspace view with one React
// runtime. Only framework routing and browser-only/closed overlay furniture are
// replaced; navigation construction and empty/error state rendering stay real.
const mocks = new Map([
  ['next/link', `
    import { createElement } from 'react';
    export default function Link({ children, ...props }) {
      return createElement('a', props, children);
    }
  `],
  ['next/navigation', `
    let pathname = '/c/north-trading';
    export function setTestPathname(value) { pathname = value; }
    export function usePathname() { return pathname; }
    export function useRouter() { return { push() {}, refresh() {} }; }
  `],
  ['@/components/ui/sheet', `
    export function Sheet({ open, children }) { return open ? children : null; }
    export function SheetContent({ children }) { return children; }
    export function SheetTitle({ children }) { return children; }
  `],
  ['@/components/ui/dialog', `
    export function Dialog({ open, children }) { return open ? children : null; }
    export function DialogContent({ children }) { return children; }
    export function DialogTitle({ children }) { return children; }
    export function DialogDescription({ children }) { return children; }
  `],
  ['@/components/ui/command', `
    function ClosedCommand() { return null; }
    export {
      ClosedCommand as Command, ClosedCommand as CommandInput,
      ClosedCommand as CommandList, ClosedCommand as CommandEmpty,
      ClosedCommand as CommandGroup, ClosedCommand as CommandItem
    };
  `],
  ['./HeaderAppearance', 'export function HeaderAppearance() { return null; }'],
  ['./FullscreenButton', 'export function FullscreenButton() { return null; }'],
  ['./HeaderLanguagePicker', 'export function HeaderLanguagePicker() { return null; }'],
  ['@/components/ui/PageTransition',
    'export function PageTransition({ children }) { return children; }'],
]);

const output = await build({
  stdin: {
    contents: `
      export { AccountShell } from './components/account/AccountShell';
      export { CompanyWorkspaceHome } from './components/dashboard/CompanyWorkspaceHome';
      export { setTestPathname } from 'next/navigation';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  logLevel: 'silent',
  plugins: [{
    name: 'workspace-ssr-adapters',
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) =>
        mocks.has(path) ? { path, namespace: 'workspace-test' } : undefined,
      );
      builder.onLoad({ filter: /.*/, namespace: 'workspace-test' }, ({ path }) => ({
        contents: mocks.get(path),
        loader: 'js',
        resolveDir: process.cwd(),
      }));
    },
  }],
});
const bundle = { exports: {} };
// oxlint-disable-next-line typescript/no-implied-eval
new Function('require', 'module', 'exports', output.outputFiles[0].text)(
  createRequire(import.meta.url), bundle, bundle.exports,
);
const { AccountShell, CompanyWorkspaceHome, setTestPathname } = bundle.exports;

const company = {
  id: 'company-north',
  slug: 'north-trading',
  name: 'North Trading',
  role: 'owner',
  initials: 'NT',
};
const authorizedNavigation = [
  {
    id: 'plugin:ledger:invoices',
    rawId: 'invoices',
    pluginSlug: 'ledger',
    label: 'Invoices',
    href: '/c/north-trading/apps/ledger/invoices',
    icon: 'FileText',
    group: 'Finance',
    position: 'main',
  },
  {
    id: 'plugin:ledger:compliance',
    rawId: 'compliance',
    pluginSlug: 'ledger',
    label: 'Compliance',
    href: '/c/north-trading/apps/ledger/compliance',
    icon: 'Shield',
    position: 'footer',
  },
];

function plainText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function links(html) {
  return Array.from(html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g),
    ([, href, contents]) => ({ href: href.replaceAll('&amp;', '&'), label: plainText(contents) }),
  );
}

function sidebar(html) {
  const match = html.match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/);
  assert.ok(match, 'the persistent workspace sidebar is rendered');
  return match[1];
}

function renderShell(overrides = {}) {
  const { children, ...restOverrides } = overrides;
  setTestPathname(restOverrides.company === null ? '/account' : '/c/north-trading');
  return renderToStaticMarkup(createElement(AccountShell, {
    displayName: 'Workspace Owner',
    email: 'owner@example.test',
    company,
    ...restOverrides,
  }, children ?? createElement('p', null, 'Workspace content')));
}

function renderHome(appState, companySlug = company.slug) {
  return renderToStaticMarkup(createElement(CompanyWorkspaceHome, {
    greeting: 'Welcome, Workspace Owner',
    companyName: company.name,
    companySlug,
    appState,
  }));
}

test('a company without apps retains core navigation without demo business menus or POS', () => {
  const html = renderShell({ initialPluginNavigation: [] });
  assert.deepEqual(links(sidebar(html)), [
    { href: '/c/north-trading', label: 'Dashboard' },
    { href: '/account/app-store?company=north-trading', label: 'App Store' },
    { href: '/account/settings?company=north-trading', label: 'Settings' },
  ]);
  assert.doesNotMatch(plainText(html), /\b(?:Products|Orders|Customers|Analytics|156|POS)\b/);
  assert.doesNotMatch(sidebar(html), /\/account\/developer/);
});

test('authorized main and footer app contributions are visible in the first server render', () => {
  const html = renderShell({ initialPluginNavigation: authorizedNavigation });
  const destinations = links(sidebar(html));
  for (const item of authorizedNavigation) {
    assert.ok(destinations.some(({ href, label }) => href === item.href && label === item.label));
  }
  assert.match(plainText(sidebar(html)), /Finance/);
  assert.ok(destinations.some(({ href }) => href === '/account/app-store?company=north-trading'));
  assert.ok(destinations.some(({ href }) => href === '/account/settings?company=north-trading'));
  assert.doesNotMatch(plainText(sidebar(html)), /\b(?:Products|Orders|Customers|Analytics|156|Developer)\b/);
});

test('personal account navigation never renders seeded company app contributions', () => {
  const html = renderShell({ company: null, initialPluginNavigation: authorizedNavigation });
  assert.deepEqual(links(sidebar(html)), [
    { href: '/account', label: 'Home' },
    { href: '/account/invitations', label: 'Invitations' },
    { href: '/account/favorites', label: 'Favorites' },
    { href: '/account/app-store', label: 'App Store' },
    { href: '/account/settings', label: 'Settings' },
  ]);
  assert.doesNotMatch(html, /\/c\/north-trading\/apps\//);
  assert.doesNotMatch(plainText(sidebar(html)), /Invoices|Compliance|Developer/);
});

test('an empty workspace prompts installation without invented financial figures', () => {
  const html = renderHome({ status: 'ready', hasInstalledApps: false, apps: [] });
  assert.match(plainText(html), /Add apps to your workspace/);
  assert.match(plainText(html), /North Trading/);
  assert.doesNotMatch(plainText(html), /Sample data|Sales|Purchases|Profit|Invoices|\$|No app pages available/);
  assert.ok(links(html).some(({ href, label }) =>
    href === '/account/app-store?company=north-trading' && label === 'Browse App Store',
  ));
  assert.ok(links(html).some(({ href }) => href === '/account/settings?company=north-trading'));
});

test('installed apps without accessible pages are distinguished from an unconfigured workspace', () => {
  const html = renderHome({ status: 'ready', hasInstalledApps: true, apps: [] });
  assert.match(plainText(html), /No app pages available/);
  assert.match(plainText(html), /workspace administrator/);
  assert.doesNotMatch(plainText(html), /Add apps to your workspace|could not be loaded/);
});

test('app loading failure renders a retry and never claims that no apps are installed', () => {
  const html = renderHome({ status: 'unavailable' });
  assert.match(plainText(html), /Your apps could not be loaded/);
  assert.deepEqual(links(html).find(({ label }) => label === 'Try again'), {
    href: '/c/north-trading', label: 'Try again',
  });
  assert.doesNotMatch(plainText(html), /Add apps to your workspace|No app pages available|Sample data/);
});

test('workspace home links to supplied authorized app pages and preserves the company context', () => {
  const html = renderHome({
    status: 'ready',
    hasInstalledApps: true,
    apps: [{
      id: 'ledger',
      name: 'Ledger',
      pages: [{ id: 'invoices', label: 'Invoices', href: authorizedNavigation[0].href }],
    }],
  });
  assert.match(plainText(html), /Your apps.*Ledger/);
  assert.ok(links(html).some(({ href, label }) =>
    href === authorizedNavigation[0].href && label === 'Invoices',
  ));
  assert.ok(links(html).some(({ href, label }) => href === '/account' && label === 'My ERPs'));
  assert.doesNotMatch(plainText(html), /Sample data|Add apps to your workspace|No app pages available|\$/);
});
