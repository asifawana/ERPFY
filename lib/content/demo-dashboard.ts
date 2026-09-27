/**
 * Complete sample dashboard data.
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 40, 88, 90, 99. Design: DESIGN.md.
 *
 * Core figures preserve the approved Figma erpfy-dashboard screen exactly,
 * extended with the supplementary modules requested by the user.
 */

export type DemoPoint = { label: string; sales: number; purchases: number };
export type DemoSplinePoint = { label: string; sent: number; received: number };
export type DemoSlice = { name: string; value: number; color?: string };

export type DemoPaymentMethod = {
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

export type DemoStockValue = {
  label: string;
  value: number;
  color: string;
  barColor: string;
};

export type DemoRankedProduct = {
  rank: number;
  name: string;
  amount: number;
  soldCount: number;
  percentage: number;
};

export type DemoRecentSale = {
  reference: string;
  customer: string;
  warehouse: string;
  status: 'completed' | 'pending' | 'cancelled';
  total: number;
  paid: number;
  due: number;
  paymentStatus: 'paid' | 'partial' | 'due';
};

export const DEMO_CURRENCY = '$';

/** 8 KPI Metrics matching Figma erpfy-dashboard exactly */
export const DEMO_FIGURES: Record<string, number> = {
  Sales: 5371.85,
  Purchases: 15065.00,
  'Sales Return': 0.00,
  'Purchases Return': 0.00,
  'Sales Due': 1400.70,
  'Purchase Due': 6391.00,
  Invoices: 8,
  Profit: 643.50,
};

/** 4-point Sales & Purchases bar chart matching Figma erpfy-dashboard */
export const DEMO_SALES_PURCHASES: DemoPoint[] = [
  { label: '14 Sep', sales: 1450, purchases: 380 },
  { label: '15 Sep', sales: 2180, purchases: 420 },
  { label: '16 Sep', sales: 340, purchases: 4480 },
  { label: '17 Sep', sales: 1200, purchases: 1620 },
];

/** 2-product Top Selling Products Donut matching Figma erpfy-dashboard (452 total units) */
export const DEMO_TOP_PRODUCTS: DemoSlice[] = [
  { name: 'Cotton T-Shirt', value: 280, color: 'var(--erpfy-brand)' },
  { name: 'Organic Coffee Beans', value: 172, color: '#111827' },
];

/** Payment Sent & Received 7-day spline curve matching reference screenshot */
export const DEMO_PAYMENT_SENT_RECEIVED: DemoSplinePoint[] = [
  { label: '2026-09-07', sent: 3600, received: 150 },
  { label: '2026-09-08', sent: 1500, received: 2000 },
  { label: '2026-09-09', sent: 1100, received: 2050 },
  { label: '2026-09-10', sent: 200, received: 200 },
  { label: '2026-09-11', sent: 3750, received: 3200 },
  { label: '2026-09-12', sent: 200, received: 200 },
  { label: '2026-09-13', sent: 200, received: 1350 },
];

/** Top Customers pie chart */
export const DEMO_TOP_CUSTOMERS: DemoSlice[] = [
  { name: 'Omar Khalil', value: 28, color: 'var(--erpfy-brand)' },
  { name: 'Sarah Miller', value: 21, color: '#111827' },
  { name: 'Fatima Zahra', value: 21, color: 'var(--erpfy-brand-2)' },
  { name: 'Karim Haddad', value: 14, color: '#8a8a8a' },
  { name: 'David Choi', value: 14, color: '#c9c9c4' },
];

/** Sales by Payment Method */
export const DEMO_SALES_BY_PAYMENT: DemoPaymentMethod[] = [
  { name: 'Credit Card', amount: 6899.83, percentage: 84, color: 'var(--erpfy-brand)' },
  { name: 'Cash', amount: 1274.65, percentage: 16, color: '#111827' },
  { name: 'Check', amount: 0.00, percentage: 0, color: '#8a8a8a' },
  { name: 'TPE', amount: 0.00, percentage: 0, color: '#c9c9c4' },
  { name: 'Western Union', amount: 0.00, percentage: 0, color: 'var(--erpfy-brand-3)' },
  { name: 'Bank transfer', amount: 0.00, percentage: 0, color: '#111827' },
  { name: 'Other', amount: 0.00, percentage: 0, color: '#8a8a8a' },
  { name: 'Wallet', amount: 0.00, percentage: 0, color: '#c9c9c4' },
];

/** Stock Values */
export const DEMO_STOCK_VALUES: DemoStockValue[] = [
  { label: 'By cost', value: 6546546.10, color: 'text-[var(--erpfy-brand-soft-ink)]', barColor: 'var(--erpfy-brand)' },
  { label: 'By retail', value: 8632153.17, color: 'text-[#111827]', barColor: '#111827' },
  { label: 'By wholesale', value: 0.00, color: 'text-[#8a8a8a]', barColor: '#8a8a8a' },
];

/** Top Selling Products Ranked List */
export const DEMO_TOP_SELLING_LIST: DemoRankedProduct[] = [
  { rank: 1, name: 'Tennis Racket', amount: 2610.00, soldCount: 5, percentage: 85 },
  { rank: 2, name: 'Camping Tent 2P', amount: 2401.20, soldCount: 4, percentage: 75 },
  { rank: 3, name: 'Green Tea Box', amount: 680.05, soldCount: 3, percentage: 40 },
  { rank: 4, name: 'Cotton T-Shirt', amount: 626.40, soldCount: 3, percentage: 38 },
  { rank: 5, name: 'Leather Belt', amount: 1200.60, soldCount: 5, percentage: 55 },
];

/** Recent Sales Table Rows */
export const DEMO_RECENT_SALES: DemoRecentSale[] = [
  {
    reference: 'SL_9061',
    customer: 'Walk-in customer',
    warehouse: 'Main Warehouse',
    status: 'completed',
    total: 1274.65,
    paid: 1274.65,
    due: 0.00,
    paymentStatus: 'paid',
  },
  {
    reference: 'SL_9060',
    customer: 'Omar Khalil',
    warehouse: 'Main Warehouse',
    status: 'completed',
    total: 23.20,
    paid: 11.60,
    due: 11.60,
    paymentStatus: 'partial',
  },
  {
    reference: 'SL_9059',
    customer: 'Lina Berrada',
    warehouse: 'Main Warehouse',
    status: 'completed',
    total: 1586.30,
    paid: 1586.30,
    due: 0.00,
    paymentStatus: 'paid',
  },
  {
    reference: 'SL_9058',
    customer: 'Sarah Miller',
    warehouse: 'Main Warehouse',
    status: 'completed',
    total: 1016.45,
    paid: 1016.45,
    due: 0.00,
    paymentStatus: 'paid',
  },
  {
    reference: 'SL_9057',
    customer: 'David Osci',
    warehouse: 'Main Warehouse',
    status: 'completed',
    total: 581.45,
    paid: 581.45,
    due: 0.00,
    paymentStatus: 'paid',
  },
];

export const DONUT_COLORS = [
  'var(--erpfy-brand)',
  '#111827',
  'var(--erpfy-brand-2)',
  '#8a8a8a',
  '#c9c9c4',
] as const;
