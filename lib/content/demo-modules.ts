/**
 * Sample data for the module screens — design time only.
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88, 91, 99.
 *
 * Same contract as `demo-dashboard.ts`, and for the same reason: these screens describe
 * business Apps that do not exist yet, so nothing here is read from a real row. Names carry
 * `[DEMO]` where they stand for a person or a product, and every figure lives in this one
 * module — so connecting the database is a matter of replacing these exports with queries,
 * and deleting them makes the fabrication impossible to miss.
 */

/* ------------------------------------------------------------------ *
 * Customers
 * ------------------------------------------------------------------ */

export type DemoCustomer = {
  name: string;
  email: string;
  location: string;
  orders: number;
  spent: number;
  lastOrder: string;
  status: 'active' | 'new' | 'dormant';
};

/**
 * The same five people the Orders screen lists, so a name means the same customer on
 * either page. Invented, like everything else in this file.
 */
export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    name: '[DEMO] Sarah Jenkins',
    email: 'sarah.jenkins@demo.invalid',
    location: 'United States',
    orders: 14,
    spent: 1284.5,
    lastOrder: 'Today, 10:45 AM',
    status: 'active',
  },
  {
    name: '[DEMO] David Miller',
    email: 'd.miller@demo.invalid',
    location: 'United Kingdom',
    orders: 9,
    spent: 742.0,
    lastOrder: 'Today, 09:12 AM',
    status: 'active',
  },
  {
    name: '[DEMO] Elena Rostova',
    email: 'elena.r@demo.invalid',
    location: 'Germany',
    orders: 3,
    spent: 168.0,
    lastOrder: 'Yesterday',
    status: 'new',
  },
  {
    name: '[DEMO] Marcus Aurelius',
    email: 'm.aurelius@demo.invalid',
    location: 'Italy',
    orders: 21,
    spent: 2410.75,
    lastOrder: 'Oct 14, 2026',
    status: 'active',
  },
  {
    name: '[DEMO] Chloe Patel',
    email: 'chloe.patel@demo.invalid',
    location: 'Pakistan',
    orders: 1,
    spent: 24.0,
    lastOrder: 'Oct 12, 2026',
    status: 'dormant',
  },
];

export const DEMO_CUSTOMER_TOTAL = 482;

export const DEMO_CUSTOMER_TABS: { label: string; count: number }[] = [
  { label: 'All', count: 482 },
  { label: 'Active', count: 361 },
  { label: 'New', count: 47 },
  { label: 'Dormant', count: 74 },
];

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

/** The status breakdown. "All" is the sum of these, never a fourth number. */
const DEMO_ORDER_STATUSES: { label: string; count: number }[] = [
  { label: 'Pending', count: 23 },
  { label: 'Processing', count: 18 },
  { label: 'Shipped', count: 45 },
  { label: 'Delivered', count: 62 },
  { label: 'Cancelled', count: 8 },
];

export const DEMO_ORDER_TOTAL = DEMO_ORDER_STATUSES.reduce(
  (running, status) => running + status.count,
  0,
);

export const DEMO_ORDER_TABS: { label: string; count: number }[] = [
  { label: 'All', count: DEMO_ORDER_TOTAL },
  ...DEMO_ORDER_STATUSES,
];

/* ------------------------------------------------------------------ *
 * App Store
 * ------------------------------------------------------------------ */

export type DemoApp = {
  name: string;
  /** The publisher shown under the name. Invented, like the rest of this file. */
  vendor: string;
  summary: string;
  category: string;
  /** Out of five. Sample: nobody has reviewed anything. */
  rating: number;
  /** Sample state only. Nothing can actually be installed yet. */
  installed: boolean;
  /** Two letters for the monogram tile, and its fill. */
  monogram: string;
  tint: string;
};

export const DEMO_APP_CATEGORIES = [
  'All',
  'Sales',
  'Inventory',
  'Accounting',
  'HR',
  'Shipping',
  'Marketing',
  'CRM',
];

/**
 * The catalogue exactly as the reference frame lists it.
 *
 * Every field is invented: the publishers, the ratings and the installed states. Section 91
 * is the rule that matters here — a catalog card alone does not mean an App works or is
 * billable — so the page carries a `Sample data` marker and both buttons are disabled.
 */
export const DEMO_FEATURED_APPS: DemoApp[] = [
  {
    name: 'Advanced Inventory',
    vendor: 'ERPFY Lab',
    summary:
      'Multi-warehouse stock tracking, real-time stock notifications, and auto-purchase order generation.',
    category: 'Inventory',
    rating: 4.9,
    installed: true,
    monogram: 'AI',
    tint: '#0d9488',
  },
  {
    name: 'Smart Invoicing Pro',
    vendor: 'FinTech Integrations',
    summary:
      'Instantly generate localization-compliant beautiful PDF invoices and automate client follow-ups.',
    category: 'Accounting',
    rating: 4.8,
    installed: false,
    monogram: 'SI',
    tint: '#4f46e5',
  },
  {
    name: 'HR Manager Pro',
    vendor: 'PeopleOps Corp',
    summary:
      'Streamline payroll management, employee shifts, attendance monitoring, and holiday calendar syncing.',
    category: 'HR',
    rating: 4.7,
    installed: false,
    monogram: 'HR',
    tint: '#db2777',
  },
];

export const DEMO_POPULAR_APPS: DemoApp[] = [
  {
    name: 'Shipping Tracker',
    vendor: 'Logistics Central',
    summary:
      'Connect with UPS, FedEx, DHL to retrieve automated tracking links.',
    category: 'Shipping',
    rating: 4.6,
    installed: true,
    monogram: 'ST',
    tint: '#ea580c',
  },
  {
    name: 'Email Marketing Suite',
    vendor: 'Lumen Growth',
    summary: 'Design newsletters and automated triggered emails to customers.',
    category: 'Marketing',
    rating: 4.5,
    installed: false,
    monogram: 'EM',
    tint: '#2563eb',
  },
  {
    name: 'CRM Connect',
    vendor: 'ERPFY Lab',
    summary:
      'Synchronize pipelines, logs, calls, and email deals into ERP workflows.',
    category: 'CRM',
    rating: 4.9,
    installed: false,
    monogram: 'CC',
    tint: '#16a34a',
  },
  {
    name: 'Tax Calculator Global',
    vendor: 'Compliance Masters',
    summary: 'Real-time calculation of VAT, GST, Sales Tax based on locations.',
    category: 'Accounting',
    rating: 4.8,
    installed: true,
    monogram: 'TC',
    tint: '#7c3aed',
  },
  {
    name: 'Multi-Currency Flow',
    vendor: 'FX Globals',
    summary:
      'Auto-updated bank exchange rates with multicurrency ledger settlements.',
    category: 'Accounting',
    rating: 4.7,
    installed: false,
    monogram: 'MC',
    tint: '#1d4ed8',
  },
  {
    name: 'Storefront Sync Bridge',
    vendor: 'E-Comm Labs',
    summary: 'Sync orders, stock, and refund catalogs directly into ERP core.',
    category: 'Sales',
    rating: 4.6,
    installed: false,
    monogram: 'SS',
    tint: '#22c55e',
  },
];
