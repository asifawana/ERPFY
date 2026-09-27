/**
 * Dynamic range and warehouse dataset generator for the ERPFY dashboard.
 * Powers 'Today', '7D', '30D', 'MTD', 'YTD', 'Custom', and Warehouse filters.
 */

import {
  type DemoPoint,
  type DemoSlice,
  type DemoSplinePoint,
  type DemoPaymentMethod,
  type DemoStockValue,
  type DemoRankedProduct,
  DEMO_FIGURES,
  DEMO_SALES_PURCHASES,
  DEMO_PAYMENT_SENT_RECEIVED,
  DEMO_TOP_PRODUCTS,
  DEMO_TOP_CUSTOMERS,
  DEMO_SALES_BY_PAYMENT,
  DEMO_STOCK_VALUES,
  DEMO_TOP_SELLING_LIST,
} from './demo-dashboard';

export type TimeRangeKey = 'today' | '7d' | '30d' | 'mtd' | 'ytd' | 'custom';

export type WarehouseInfo = {
  id: string;
  name: string;
};

export const WAREHOUSES: WarehouseInfo[] = [
  { id: 'all', name: 'All Warehouses' },
  { id: 'default', name: 'Main Warehouse' },
];

export type DashboardRangeData = {
  figures: Record<string, number>;
  salesPurchases: DemoPoint[];
  paymentSentReceived: DemoSplinePoint[];
  topProducts: DemoSlice[];
  topCustomers: DemoSlice[];
  salesByPayment: DemoPaymentMethod[];
  stockValues: DemoStockValue[];
  topSellingList: DemoRankedProduct[];
  totalUnits: number;
};

export function getDashboardData(
  period: TimeRangeKey,
  warehouseId: string = 'all',
  customDates?: { from: string; to: string },
): DashboardRangeData {
  // Multipliers based on warehouse
  const wFactor =
    warehouseId === 'default'
      ? 0.45
      : 1.0;

  switch (period) {
    case 'today':
      return {
        figures: {
          Sales: 1240.50 * wFactor,
          Purchases: 620.00 * wFactor,
          'Sales Return': 0.00,
          'Purchases Return': 0.00,
          'Sales Due': 180.20 * wFactor,
          'Purchase Due': 120.00 * wFactor,
          Invoices: Math.max(1, Math.round(2 * wFactor)),
          Profit: 340.50 * wFactor,
        },
        salesPurchases: [
          { label: '09:00', sales: Math.round(180 * wFactor), purchases: Math.round(50 * wFactor) },
          { label: '12:00', sales: Math.round(420 * wFactor), purchases: Math.round(180 * wFactor) },
          { label: '15:00', sales: Math.round(390 * wFactor), purchases: Math.round(240 * wFactor) },
          { label: '18:00', sales: Math.round(250 * wFactor), purchases: Math.round(150 * wFactor) },
        ],
        paymentSentReceived: [
          { label: '08:00', sent: Math.round(200 * wFactor), received: Math.round(150 * wFactor) },
          { label: '11:00', sent: Math.round(450 * wFactor), received: Math.round(600 * wFactor) },
          { label: '14:00', sent: Math.round(300 * wFactor), received: Math.round(520 * wFactor) },
          { label: '17:00', sent: Math.round(180 * wFactor), received: Math.round(380 * wFactor) },
        ],
        topProducts: [
          { name: 'Cotton T-Shirt', value: Math.round(45 * wFactor), color: 'var(--erpfy-brand)' },
          { name: 'Organic Coffee Beans', value: Math.round(32 * wFactor), color: '#111827' },
        ],
        topCustomers: [
          { name: 'Omar Khalil', value: 40, color: 'var(--erpfy-brand)' },
          { name: 'Sarah Miller', value: 35, color: '#111827' },
          { name: 'Fatima Zahra', value: 25, color: 'var(--erpfy-brand-2)' },
        ],
        salesByPayment: DEMO_SALES_BY_PAYMENT.map((p) => ({
          ...p,
          amount: p.amount * 0.22 * wFactor,
        })),
        stockValues: DEMO_STOCK_VALUES.map((s) => ({
          ...s,
          value: s.value * wFactor,
        })),
        topSellingList: DEMO_TOP_SELLING_LIST.map((prod) => ({
          ...prod,
          amount: prod.amount * 0.2 * wFactor,
          soldCount: Math.max(1, Math.round(prod.soldCount * 0.25)),
        })),
        totalUnits: Math.round(77 * wFactor),
      };

    case '30d':
      return {
        figures: {
          Sales: 24890.40 * wFactor,
          Purchases: 48200.00 * wFactor,
          'Sales Return': 340.00 * wFactor,
          'Purchases Return': 120.00 * wFactor,
          'Sales Due': 3820.00 * wFactor,
          'Purchase Due': 14500.00 * wFactor,
          Invoices: Math.round(38 * wFactor),
          Profit: 3950.00 * wFactor,
        },
        salesPurchases: [
          { label: 'Week 1', sales: Math.round(5200 * wFactor), purchases: Math.round(9800 * wFactor) },
          { label: 'Week 2', sales: Math.round(6800 * wFactor), purchases: Math.round(12400 * wFactor) },
          { label: 'Week 3', sales: Math.round(5900 * wFactor), purchases: Math.round(14200 * wFactor) },
          { label: 'Week 4', sales: Math.round(6990 * wFactor), purchases: Math.round(11800 * wFactor) },
        ],
        paymentSentReceived: [
          { label: 'Aug 20', sent: Math.round(4800 * wFactor), received: Math.round(3500 * wFactor) },
          { label: 'Aug 26', sent: Math.round(3200 * wFactor), received: Math.round(4900 * wFactor) },
          { label: 'Sep 01', sent: Math.round(5100 * wFactor), received: Math.round(5800 * wFactor) },
          { label: 'Sep 06', sent: Math.round(2900 * wFactor), received: Math.round(3200 * wFactor) },
          { label: 'Sep 10', sent: Math.round(4100 * wFactor), received: Math.round(4400 * wFactor) },
          { label: 'Sep 13', sent: Math.round(3500 * wFactor), received: Math.round(4100 * wFactor) },
        ],
        topProducts: [
          { name: 'Cotton T-Shirt', value: Math.round(890 * wFactor), color: 'var(--erpfy-brand)' },
          { name: 'Organic Coffee Beans', value: Math.round(640 * wFactor), color: '#111827' },
        ],
        topCustomers: DEMO_TOP_CUSTOMERS,
        salesByPayment: DEMO_SALES_BY_PAYMENT.map((p) => ({
          ...p,
          amount: p.amount * 3.8 * wFactor,
        })),
        stockValues: DEMO_STOCK_VALUES.map((s) => ({
          ...s,
          value: s.value * wFactor,
        })),
        topSellingList: DEMO_TOP_SELLING_LIST.map((prod) => ({
          ...prod,
          amount: prod.amount * 3.5 * wFactor,
          soldCount: Math.round(prod.soldCount * 3.6),
        })),
        totalUnits: Math.round(1530 * wFactor),
      };

    case 'mtd':
      return {
        figures: {
          Sales: 11420.00 * wFactor,
          Purchases: 22150.00 * wFactor,
          'Sales Return': 120.00 * wFactor,
          'Purchases Return': 0.00,
          'Sales Due': 2100.00 * wFactor,
          'Purchase Due': 8400.00 * wFactor,
          Invoices: Math.round(19 * wFactor),
          Profit: 1820.00 * wFactor,
        },
        salesPurchases: [
          { label: '01-04 Sep', sales: Math.round(2800 * wFactor), purchases: Math.round(5400 * wFactor) },
          { label: '05-08 Sep', sales: Math.round(3900 * wFactor), purchases: Math.round(7200 * wFactor) },
          { label: '09-11 Sep', sales: Math.round(2700 * wFactor), purchases: Math.round(5100 * wFactor) },
          { label: '12-13 Sep', sales: Math.round(2020 * wFactor), purchases: Math.round(4450 * wFactor) },
        ],
        paymentSentReceived: [
          { label: '09-01', sent: Math.round(1800 * wFactor), received: Math.round(1200 * wFactor) },
          { label: '09-04', sent: Math.round(2400 * wFactor), received: Math.round(2800 * wFactor) },
          { label: '09-07', sent: Math.round(3600 * wFactor), received: Math.round(3100 * wFactor) },
          { label: '09-10', sent: Math.round(1900 * wFactor), received: Math.round(2400 * wFactor) },
          { label: '09-13', sent: Math.round(2100 * wFactor), received: Math.round(2600 * wFactor) },
        ],
        topProducts: [
          { name: 'Cotton T-Shirt', value: Math.round(520 * wFactor), color: 'var(--erpfy-brand)' },
          { name: 'Organic Coffee Beans', value: Math.round(390 * wFactor), color: '#111827' },
        ],
        topCustomers: DEMO_TOP_CUSTOMERS,
        salesByPayment: DEMO_SALES_BY_PAYMENT.map((p) => ({
          ...p,
          amount: p.amount * 1.8 * wFactor,
        })),
        stockValues: DEMO_STOCK_VALUES.map((s) => ({
          ...s,
          value: s.value * wFactor,
        })),
        topSellingList: DEMO_TOP_SELLING_LIST.map((prod) => ({
          ...prod,
          amount: prod.amount * 1.8 * wFactor,
          soldCount: Math.round(prod.soldCount * 1.9),
        })),
        totalUnits: Math.round(910 * wFactor),
      };

    case 'ytd':
      return {
        figures: {
          Sales: 168450.00 * wFactor,
          Purchases: 284100.00 * wFactor,
          'Sales Return': 2400.00 * wFactor,
          'Purchases Return': 950.00 * wFactor,
          'Sales Due': 18400.00 * wFactor,
          'Purchase Due': 62100.00 * wFactor,
          Invoices: Math.round(264 * wFactor),
          Profit: 29800.00 * wFactor,
        },
        salesPurchases: [
          { label: 'Q1', sales: Math.round(38000 * wFactor), purchases: Math.round(62000 * wFactor) },
          { label: 'Q2', sales: Math.round(49000 * wFactor), purchases: Math.round(81000 * wFactor) },
          { label: 'Q3', sales: Math.round(44000 * wFactor), purchases: Math.round(74000 * wFactor) },
          { label: 'Q4 (Est)', sales: Math.round(37450 * wFactor), purchases: Math.round(67100 * wFactor) },
        ],
        paymentSentReceived: [
          { label: 'Jan', sent: Math.round(14000 * wFactor), received: Math.round(12000 * wFactor) },
          { label: 'Mar', sent: Math.round(18000 * wFactor), received: Math.round(19500 * wFactor) },
          { label: 'May', sent: Math.round(22000 * wFactor), received: Math.round(24000 * wFactor) },
          { label: 'Jul', sent: Math.round(21000 * wFactor), received: Math.round(23000 * wFactor) },
          { label: 'Sep', sent: Math.round(19500 * wFactor), received: Math.round(20800 * wFactor) },
        ],
        topProducts: [
          { name: 'Cotton T-Shirt', value: Math.round(4200 * wFactor), color: 'var(--erpfy-brand)' },
          { name: 'Organic Coffee Beans', value: Math.round(3100 * wFactor), color: '#111827' },
        ],
        topCustomers: DEMO_TOP_CUSTOMERS,
        salesByPayment: DEMO_SALES_BY_PAYMENT.map((p) => ({
          ...p,
          amount: p.amount * 24 * wFactor,
        })),
        stockValues: DEMO_STOCK_VALUES.map((s) => ({
          ...s,
          value: s.value * wFactor,
        })),
        topSellingList: DEMO_TOP_SELLING_LIST.map((prod) => ({
          ...prod,
          amount: prod.amount * 22 * wFactor,
          soldCount: Math.round(prod.soldCount * 23),
        })),
        totalUnits: Math.round(7300 * wFactor),
      };

    case 'custom': {
      const from = customDates?.from || '2026-09-01';
      const to = customDates?.to || '2026-09-13';
      const diffDays = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const ratio = Math.min(6, Math.max(0.2, diffDays / 7));

      return {
        figures: {
          Sales: DEMO_FIGURES.Sales * ratio * wFactor,
          Purchases: DEMO_FIGURES.Purchases * ratio * wFactor,
          'Sales Return': DEMO_FIGURES['Sales Return'] * ratio * wFactor,
          'Purchases Return': DEMO_FIGURES['Purchases Return'] * ratio * wFactor,
          'Sales Due': DEMO_FIGURES['Sales Due'] * ratio * wFactor,
          'Purchase Due': DEMO_FIGURES['Purchase Due'] * ratio * wFactor,
          Invoices: Math.max(1, Math.round(DEMO_FIGURES.Invoices * ratio * wFactor)),
          Profit: DEMO_FIGURES.Profit * ratio * wFactor,
        },
        salesPurchases: DEMO_SALES_PURCHASES.map((p) => ({
          ...p,
          sales: Math.round(p.sales * ratio * wFactor),
          purchases: Math.round(p.purchases * ratio * wFactor),
        })),
        paymentSentReceived: DEMO_PAYMENT_SENT_RECEIVED.map((p) => ({
          ...p,
          sent: Math.round(p.sent * ratio * wFactor),
          received: Math.round(p.received * ratio * wFactor),
        })),
        topProducts: DEMO_TOP_PRODUCTS.map((p) => ({
          ...p,
          value: Math.round(p.value * ratio * wFactor),
        })),
        topCustomers: DEMO_TOP_CUSTOMERS,
        salesByPayment: DEMO_SALES_BY_PAYMENT.map((p) => ({
          ...p,
          amount: p.amount * ratio * wFactor,
        })),
        stockValues: DEMO_STOCK_VALUES.map((s) => ({
          ...s,
          value: s.value * wFactor,
        })),
        topSellingList: DEMO_TOP_SELLING_LIST.map((prod) => ({
          ...prod,
          amount: prod.amount * ratio * wFactor,
          soldCount: Math.max(1, Math.round(prod.soldCount * ratio)),
        })),
        totalUnits: Math.round(452 * ratio * wFactor),
      };
    }

    case '7d':
    default:
      return {
        figures: Object.fromEntries(
          Object.entries(DEMO_FIGURES).map(([k, v]) => [k, k === 'Invoices' ? Math.round(v * wFactor) : v * wFactor]),
        ),
        salesPurchases: DEMO_SALES_PURCHASES.map((p) => ({
          ...p,
          sales: Math.round(p.sales * wFactor),
          purchases: Math.round(p.purchases * wFactor),
        })),
        paymentSentReceived: DEMO_PAYMENT_SENT_RECEIVED.map((p) => ({
          ...p,
          sent: Math.round(p.sent * wFactor),
          received: Math.round(p.received * wFactor),
        })),
        topProducts: DEMO_TOP_PRODUCTS.map((p) => ({
          ...p,
          value: Math.round(p.value * wFactor),
        })),
        topCustomers: DEMO_TOP_CUSTOMERS,
        salesByPayment: DEMO_SALES_BY_PAYMENT.map((p) => ({
          ...p,
          amount: p.amount * wFactor,
        })),
        stockValues: DEMO_STOCK_VALUES.map((s) => ({
          ...s,
          value: s.value * wFactor,
        })),
        topSellingList: DEMO_TOP_SELLING_LIST.map((prod) => ({
          ...prod,
          amount: prod.amount * wFactor,
          soldCount: Math.round(prod.soldCount * wFactor),
        })),
        totalUnits: Math.round(452 * wFactor),
      };
  }
}
