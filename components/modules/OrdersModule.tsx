'use client';

/**
 * Orders Module — Complete Orders Management & Tracking
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88. Design: DESIGN.md.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ShoppingBag,
  GripVertical,
} from 'lucide-react';

import { ErpfyStatus } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export type OrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Credit Card' | 'Cash' | 'Bank Transfer' | 'TPE';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  orderStatus: 'completed' | 'processing' | 'pending' | 'shipped' | 'cancelled';
  warehouse: string;
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_1',
    orderNumber: 'ORD-9061',
    date: '17 Sep 2026, 10:45 AM',
    customerName: 'Walk-in Customer',
    customerEmail: 'pos-cashier@erpfy.local',
    items: [
      { id: 'i1', name: '[DEMO] Cotton T-Shirt Crewneck', sku: 'APP-TSH-001', quantity: 2, unitPrice: 24.5 },
      { id: 'i2', name: '[DEMO] Stainless Steel Water Bottle', sku: 'ACC-BOT-006', quantity: 1, unitPrice: 22.0 },
    ],
    subtotal: 71.0,
    tax: 7.1,
    total: 78.1,
    paymentMethod: 'Cash',
    paymentStatus: 'paid',
    orderStatus: 'completed',
    warehouse: 'Default Warehouse',
  },
  {
    id: 'ord_2',
    orderNumber: 'ORD-9060',
    date: '16 Sep 2026, 04:30 PM',
    customerName: '[DEMO] Sarah Jenkins',
    customerEmail: 'sarah.jenkins@demo.invalid',
    items: [
      { id: 'i3', name: '[DEMO] Tennis Racket Pro Graphite', sku: 'SPO-TEN-003', quantity: 1, unitPrice: 185.0 },
      { id: 'i4', name: '[DEMO] Genuine Leather Belt Classic', sku: 'ACC-BLT-005', quantity: 2, unitPrice: 45.0 },
    ],
    subtotal: 275.0,
    tax: 27.5,
    total: 302.5,
    paymentMethod: 'Credit Card',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    warehouse: '[DEMO] Main Warehouse',
  },
  {
    id: 'ord_3',
    orderNumber: 'ORD-9059',
    date: '16 Sep 2026, 02:15 PM',
    customerName: '[DEMO] David Miller',
    customerEmail: 'd.miller@demo.invalid',
    items: [
      { id: 'i5', name: '[DEMO] Wireless Ergonomic Mouse', sku: 'ELE-MOU-007', quantity: 3, unitPrice: 58.0 },
    ],
    subtotal: 174.0,
    tax: 17.4,
    total: 191.4,
    paymentMethod: 'Credit Card',
    paymentStatus: 'paid',
    orderStatus: 'processing',
    warehouse: '[DEMO] Main Warehouse',
  },
  {
    id: 'ord_4',
    orderNumber: 'ORD-9058',
    date: '15 Sep 2026, 11:20 AM',
    customerName: '[DEMO] Marcus Aurelius',
    customerEmail: 'm.aurelius@demo.invalid',
    items: [
      { id: 'i6', name: '[DEMO] Camping Tent Waterproof 2P', sku: 'OUT-TNT-004', quantity: 1, unitPrice: 210.0 },
      { id: 'i7', name: '[DEMO] Organic Coffee Beans 1kg', sku: 'BEV-COF-002', quantity: 2, unitPrice: 38.0 },
    ],
    subtotal: 286.0,
    tax: 28.6,
    total: 314.6,
    paymentMethod: 'Bank Transfer',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    warehouse: '[DEMO] Main Warehouse',
  },
  {
    id: 'ord_5',
    orderNumber: 'ORD-9057',
    date: '15 Sep 2026, 09:05 AM',
    customerName: '[DEMO] Elena Rostova',
    customerEmail: 'elena.r@demo.invalid',
    items: [
      { id: 'i8', name: '[DEMO] Eco-Friendly Kraft Shipping Box', sku: 'PKG-BOX-008', quantity: 5, unitPrice: 34.0 },
    ],
    subtotal: 170.0,
    tax: 17.0,
    total: 187.0,
    paymentMethod: 'Credit Card',
    paymentStatus: 'paid',
    orderStatus: 'completed',
    warehouse: '[DEMO] Depot 2',
  },
  {
    id: 'ord_6',
    orderNumber: 'ORD-9056',
    date: '14 Sep 2026, 03:50 PM',
    customerName: '[DEMO] Chloe Patel',
    customerEmail: 'chloe.patel@demo.invalid',
    items: [
      { id: 'i9', name: '[DEMO] Genuine Leather Belt Classic', sku: 'ACC-BLT-005', quantity: 1, unitPrice: 45.0 },
    ],
    subtotal: 45.0,
    tax: 4.5,
    total: 49.5,
    paymentMethod: 'Credit Card',
    paymentStatus: 'refunded',
    orderStatus: 'cancelled',
    warehouse: 'Default Warehouse',
  },
];

const ORDER_STATUS_TABS = ['All', 'completed', 'processing', 'shipped', 'pending', 'cancelled'];

export type OrdersKpiKey = 'paidRevenue' | 'fulfillmentRate' | 'awaitingAction' | 'aov';

export function OrdersModule({
  initialOrders = [],
  currency = '$',
}: {
  initialOrders?: Order[];
  currency?: string;
}) {
  const [orders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Drag and drop state for KPI cards
  const [cardOrder, setCardOrder] = useState<OrdersKpiKey[]>([
    'paidRevenue',
    'fulfillmentRate',
    'awaitingAction',
    'aov',
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('erpfy_orders_kpi_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 4 &&
          parsed.every((k: string) => ['paidRevenue', 'fulfillmentRate', 'awaitingAction', 'aov'].includes(k))
        ) {
          setCardOrder(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const nextOrder = [...cardOrder];
    const [removed] = nextOrder.splice(draggedIndex, 1);
    nextOrder.splice(targetIndex, 0, removed);
    setCardOrder(nextOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
    try {
      localStorage.setItem('erpfy_orders_kpi_order', JSON.stringify(nextOrder));
    } catch {
      // Ignore storage errors
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = activeTab === 'All' || order.orderStatus === activeTab;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, activeTab]);

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((acc, o) => acc + o.total, 0);
    const pendingOrders = orders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'processing').length;
    const completedOrders = orders.filter((o) => o.orderStatus === 'completed' || o.orderStatus === 'shipped').length;

    return { totalOrders, totalRevenue, pendingOrders, completedOrders };
  }, [orders]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--erpfy-ink)]">Orders</h1>
            <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]">
              {metrics.totalOrders} total
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            Monitor sales orders, payment statuses, customer invoices, and shipping fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const csv = orders
                .map((o) => `"${o.orderNumber}","${o.date}","${o.customerName}",${o.total},"${o.orderStatus}"`)
                .join('\n');
              const blob = new Blob([`Order,Date,Customer,Total,Status\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'orders_export.csv';
              a.click();
            }}
            className="soft-button flex items-center gap-1.5"
          >
            <Download className="size-4" />
            <span>Export Orders</span>
          </button>
        </div>
      </div>

      {/* KPI Stats — Click & Drag Reorderable */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {cardOrder.map((key, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index && draggedIndex !== index;

          const cardCommonProps = {
            key,
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
            onDrop: (e: React.DragEvent) => handleDrop(e, index),
            onDragEnd: handleDragEnd,
            className: cn(
              'erpfy-card group relative p-4 cursor-grab active:cursor-grabbing select-none transition-all duration-150',
              isDragging && 'opacity-40 border-dashed border-[var(--erpfy-brand,#15803d)] bg-neutral-50 scale-[0.98]',
              isOver && 'ring-2 ring-[var(--erpfy-brand,#15803d)] ring-offset-1 bg-[var(--erpfy-brand,#15803d)]/[0.04]',
              !isDragging && !isOver && 'hover:shadow-xs'
            ),
            title: 'Click and drag to rearrange',
          };

          if (key === 'paidRevenue') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Total Paid Revenue</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {currency}{metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="mt-1 block text-xs text-emerald-600 font-medium">Settled transactions</span>
              </div>
            );
          }

          if (key === 'fulfillmentRate') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Fulfillment Rate</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {Math.round((metrics.completedOrders / (metrics.totalOrders || 1)) * 100)}%
                </p>
                <span className="mt-1 block text-xs text-emerald-600 font-medium">{metrics.completedOrders} orders fulfilled</span>
              </div>
            );
          }

          if (key === 'awaitingAction') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Awaiting Action</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <Clock className="size-4 text-amber-500" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-amber-700">{metrics.pendingOrders}</p>
                <span className="mt-1 block text-xs text-amber-600 font-medium">Needs packaging / ship</span>
              </div>
            );
          }

          if (key === 'aov') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Average Order Value</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <ShoppingBag className="size-4 text-[var(--erpfy-brand-soft-ink)]" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {currency}{(metrics.totalRevenue / (metrics.totalOrders || 1)).toFixed(2)}
                </p>
                <span className="mt-1 block text-xs text-[var(--erpfy-ink-muted)]">Per completed order</span>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Filter and Search */}
      <div className="erpfy-card p-4 space-y-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--erpfy-ink-muted)]" />
          <input
            type="text"
            placeholder="Search by order # (e.g. ORD-9061) or customer name / email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="erpfy-field pl-9 text-sm"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {ORDER_STATUS_TABS.map((tab) => {
            const count = tab === 'All' ? orders.length : orders.filter((o) => o.orderStatus === tab).length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap capitalize transition-all flex items-center gap-1.5',
                  activeTab === tab
                    ? 'bg-[var(--erpfy-brand)] text-white shadow-2xs'
                    : 'bg-[var(--erpfy-hover)] text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-line-soft)]',
                )}
              >
                <span>{tab}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px]',
                    activeTab === tab ? 'bg-white/20 text-white' : 'bg-[var(--erpfy-line-soft)] text-[var(--erpfy-ink-muted)]',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="erpfy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] text-xs font-semibold text-[var(--erpfy-ink-muted)]">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Order</th>
                <th className="px-3 py-3.5">Date</th>
                <th className="px-3 py-3.5">Customer</th>
                <th className="px-3 py-3.5 text-center">Items</th>
                <th className="px-3 py-3.5 text-right">Total Amount</th>
                <th className="px-3 py-3.5">Payment</th>
                <th className="px-3 py-3.5">Fulfillment</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--erpfy-line-soft)]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--erpfy-ink-muted)]">
                    <ClipboardList className="mx-auto size-8 text-[var(--erpfy-ink-faint)]" />
                    <p className="mt-2 font-medium">
                      {orders.length === 0
                        ? 'No orders placed yet.'
                        : 'No orders found matching this filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-[var(--erpfy-hover)]/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 pl-4 pr-3 font-semibold text-[var(--erpfy-ink)] font-mono text-xs">
                        <span className="text-[var(--erpfy-brand-soft-ink)] underline underline-offset-2">
                          #{order.orderNumber}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-xs text-[var(--erpfy-ink-muted)] whitespace-nowrap">
                        {order.date}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="font-semibold text-xs text-[var(--erpfy-ink)]">{order.customerName}</div>
                        <div className="text-[10px] text-[var(--erpfy-ink-muted)] truncate max-w-[140px]">{order.customerEmail}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center text-xs text-[var(--erpfy-ink-soft)]">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                      </td>

                      <td className="px-3 py-3.5 text-right font-bold text-xs text-[var(--erpfy-ink)]">
                        {currency}{order.total.toFixed(2)}
                      </td>

                      <td className="px-3 py-3.5">
                        {order.paymentStatus === 'paid' && <ErpfyStatus tone="success">Paid</ErpfyStatus>}
                        {order.paymentStatus === 'pending' && <ErpfyStatus tone="attention">Pending</ErpfyStatus>}
                        {order.paymentStatus === 'failed' && <ErpfyStatus tone="critical">Failed</ErpfyStatus>}
                        {order.paymentStatus === 'refunded' && <ErpfyStatus tone="neutral">Refunded</ErpfyStatus>}
                      </td>

                      <td className="px-3 py-3.5">
                        {order.orderStatus === 'completed' && <ErpfyStatus tone="success">Completed</ErpfyStatus>}
                        {order.orderStatus === 'shipped' && <ErpfyStatus tone="info">Shipped</ErpfyStatus>}
                        {order.orderStatus === 'processing' && <ErpfyStatus tone="info">Processing</ErpfyStatus>}
                        {order.orderStatus === 'pending' && <ErpfyStatus tone="attention">Pending</ErpfyStatus>}
                        {order.orderStatus === 'cancelled' && <ErpfyStatus tone="critical">Cancelled</ErpfyStatus>}
                      </td>

                      <td className="py-3.5 pl-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="soft-button py-1 px-2.5 text-xs inline-flex items-center gap-1"
                        >
                          <Eye className="size-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] px-4 py-3 text-xs text-[var(--erpfy-ink-muted)] flex items-center justify-between">
          <span>Showing {filteredOrders.length} orders</span>
          <span>All timestamps in company timezone</span>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Order #{selectedOrder.orderNumber}</span>
                <span className="text-xs font-normal text-[var(--erpfy-ink-muted)]">{selectedOrder.date}</span>
              </DialogTitle>
              <DialogDescription>
                Warehouse: {selectedOrder.warehouse} · Payment: {selectedOrder.paymentMethod}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {/* Customer Box */}
              <div className="rounded-xl border border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] p-3.5">
                <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Customer Information</span>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[var(--erpfy-brand-soft)] text-xs font-bold text-[var(--erpfy-brand-soft-ink)]">
                    {selectedOrder.customerName.replace(/\[DEMO\]\s*/, '').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--erpfy-ink)]">{selectedOrder.customerName}</p>
                    <p className="text-xs text-[var(--erpfy-ink-muted)]">{selectedOrder.customerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)] mb-2 block">Order Items</span>
                <div className="rounded-xl border border-[var(--erpfy-line-soft)] divide-y divide-[var(--erpfy-line-soft)] overflow-hidden">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-[var(--erpfy-ink)]">{item.name}</p>
                        <p className="text-[10px] text-[var(--erpfy-ink-muted)] font-mono">{item.sku} × {item.quantity}</p>
                      </div>
                      <p className="font-bold text-[var(--erpfy-ink)]">
                        {currency}{(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-1.5 rounded-xl bg-[var(--erpfy-hover)] p-3.5 text-xs">
                <div className="flex justify-between text-[var(--erpfy-ink-muted)]">
                  <span>Subtotal</span>
                  <span>{currency}{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[var(--erpfy-ink-muted)]">
                  <span>Sales Tax (10%)</span>
                  <span>{currency}{selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-[var(--erpfy-line-soft)] pt-2 flex justify-between font-bold text-sm text-[var(--erpfy-ink)]">
                  <span>Total Amount</span>
                  <span className="text-[var(--erpfy-brand-soft-ink)]">{currency}{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="primary-button"
              >
                Close Order Details
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
