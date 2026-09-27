'use client';

/**
 * Customers Module — Complete Customer CRM & Directory
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88. Design: DESIGN.md.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Download,
  MapPin,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  GripVertical,
} from 'lucide-react';

import { ErpfyStatus, ErpfyAvatar } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { DemoCustomer } from '@/lib/content/demo-modules';

type CustomerFilterTab = 'all' | 'active' | 'new' | 'dormant';

export type CustomersKpiKey = 'totalSpent' | 'active' | 'newCust' | 'dormant';

export function CustomersModule({
  initialCustomers = [],
  currency = '$',
}: {
  initialCustomers?: DemoCustomer[];
  currency?: string;
}) {
  const [customers, setCustomers] = useState<DemoCustomer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CustomerFilterTab>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<DemoCustomer | null>(null);

  // Drag and drop state for KPI cards
  const [cardOrder, setCardOrder] = useState<CustomersKpiKey[]>([
    'totalSpent',
    'active',
    'newCust',
    'dormant',
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('erpfy_customers_kpi_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 4 &&
          parsed.every((k: string) => ['totalSpent', 'active', 'newCust', 'dormant'].includes(k))
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
      localStorage.setItem('erpfy_customers_kpi_order', JSON.stringify(nextOrder));
    } catch {
      // Ignore storage errors
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Add Customer Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLocation, setFormLocation] = useState('Pakistan');

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = activeTab === 'all' || c.status === activeTab;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, activeTab]);

  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    const newCust = customers.filter((c) => c.status === 'new').length;
    const dormant = customers.filter((c) => c.status === 'dormant').length;
    const totalSpent = customers.reduce((sum, c) => sum + c.spent, 0);

    return { total, active, newCust, dormant, totalSpent };
  }, [customers]);

  const handleAddCustomer = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const newCustomer: DemoCustomer = {
      name: formName.trim(),
      email: formEmail.trim(),
      location: formLocation.trim() || 'Global',
      orders: 0,
      spent: 0,
      lastOrder: 'Just registered',
      status: 'new',
    };

    setCustomers([newCustomer, ...customers]);
    setIsAddOpen(false);
    setFormName('');
    setFormEmail('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--erpfy-ink)]">Customers</h1>
            <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]">
              {metrics.total} accounts
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            Manage your client contacts, transaction histories, and lifetime value tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const csv = customers
                .map((c) => `"${c.name}","${c.email}","${c.location}",${c.orders},${c.spent},"${c.status}"`)
                .join('\n');
              const blob = new Blob([`Name,Email,Location,Orders,Spent,Status\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'customers_list.csv';
              a.click();
            }}
            className="soft-button flex items-center gap-1.5"
          >
            <Download className="size-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="primary-button flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards — Click & Drag Reorderable */}
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

          if (key === 'totalSpent') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Total Customer Spend</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {currency}{metrics.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="mt-1 block text-xs text-emerald-600 font-medium">Cumulative sales</span>
              </div>
            );
          }

          if (key === 'active') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Active Customers</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <UserCheck className="size-4 text-emerald-600" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">{metrics.active}</p>
                <span className="mt-1 block text-xs text-emerald-600 font-medium">Recent purchase history</span>
              </div>
            );
          }

          if (key === 'newCust') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">New This Month</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <CheckCircle2 className="size-4 text-blue-500" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-blue-600">{metrics.newCust}</p>
                <span className="mt-1 block text-xs text-blue-500 font-medium">First-time buyers</span>
              </div>
            );
          }

          if (key === 'dormant') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Dormant</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <Clock className="size-4 text-amber-500" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-amber-600">{metrics.dormant}</p>
                <span className="mt-1 block text-xs text-amber-500 font-medium">Re-engagement needed</span>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="erpfy-card p-4 space-y-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--erpfy-ink-muted)]" />
          <input
            type="text"
            placeholder="Search customers by name, email, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="erpfy-field pl-9 text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {([
            { id: 'all', label: 'All Customers', count: customers.length },
            { id: 'active', label: 'Active', count: customers.filter((c) => c.status === 'active').length },
            { id: 'new', label: 'New', count: customers.filter((c) => c.status === 'new').length },
            { id: 'dormant', label: 'Dormant', count: customers.filter((c) => c.status === 'dormant').length },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                activeTab === tab.id
                  ? 'bg-[var(--erpfy-brand)] text-white shadow-2xs'
                  : 'bg-[var(--erpfy-hover)] text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-line-soft)]',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px]',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--erpfy-line-soft)] text-[var(--erpfy-ink-muted)]',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="erpfy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] text-xs font-semibold text-[var(--erpfy-ink-muted)]">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Customer</th>
                <th className="px-3 py-3.5">Location</th>
                <th className="px-3 py-3.5 text-center">Orders</th>
                <th className="px-3 py-3.5 text-right">Total Spent</th>
                <th className="px-3 py-3.5">Last Active</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--erpfy-line-soft)]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--erpfy-ink-muted)]">
                    <Users className="mx-auto size-8 text-[var(--erpfy-ink-faint)]" />
                    <p className="mt-2 font-medium">
                      {customers.length === 0
                        ? 'No customers found.'
                        : 'No customers found matching this search.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, i) => (
                  <tr
                    key={c.email || i}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-[var(--erpfy-hover)]/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <ErpfyAvatar name={c.name} circle accent={c.status === 'active'} size={34} />
                        <div>
                          <p className="font-semibold text-xs text-[var(--erpfy-ink)]">{c.name}</p>
                          <p className="text-[11px] text-[var(--erpfy-ink-muted)]">{c.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-xs text-[var(--erpfy-ink-soft)]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3 text-[var(--erpfy-ink-muted)]" />
                        <span>{c.location}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-center font-semibold text-xs text-[var(--erpfy-ink)]">
                      {c.orders}
                    </td>

                    <td className="px-3 py-3.5 text-right font-bold text-xs text-[var(--erpfy-ink)]">
                      {currency}{c.spent.toFixed(2)}
                    </td>

                    <td className="px-3 py-3.5 text-xs text-[var(--erpfy-ink-muted)]">
                      {c.lastOrder}
                    </td>

                    <td className="px-3 py-3.5">
                      {c.status === 'active' && <ErpfyStatus tone="success">Active</ErpfyStatus>}
                      {c.status === 'new' && <ErpfyStatus tone="info">New</ErpfyStatus>}
                      {c.status === 'dormant' && <ErpfyStatus tone="neutral">Dormant</ErpfyStatus>}
                    </td>

                    <td className="py-3.5 pl-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="soft-button py-1 px-2.5 text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="size-3" />
                        <span>Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] px-4 py-3 text-xs text-[var(--erpfy-ink-muted)] flex items-center justify-between">
          <span>Showing {filteredCustomers.length} of {customers.length} contacts</span>
          <span>CRM contact management</span>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Customer Contact</DialogTitle>
            <DialogDescription>
              Register a new client record into your company CRM database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCustomer} className="space-y-4 py-2">
            <div>
              <label htmlFor="customer-name-input" className="erpfy-label">Full Name *</label>
              <input
                id="customer-name-input"
                required
                type="text"
                placeholder="e.g. Asif Khan"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="erpfy-field"
              />
            </div>

            <div>
              <label htmlFor="customer-email-input" className="erpfy-label">Email Address *</label>
              <input
                id="customer-email-input"
                required
                type="email"
                placeholder="asif.khan@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="erpfy-field"
              />
            </div>

            <div>
              <label htmlFor="customer-loc-input" className="erpfy-label">Country / Location</label>
              <input
                id="customer-loc-input"
                type="text"
                placeholder="Pakistan, UAE, UK, etc."
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="erpfy-field"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="soft-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
              >
                Create Contact
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Customer Details Modal */}
      {selectedCustomer && (
        <Dialog open={Boolean(selectedCustomer)} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <ErpfyAvatar name={selectedCustomer.name} circle accent size={36} />
                <div>
                  <span>{selectedCustomer.name}</span>
                  <span className="block text-xs font-normal text-[var(--erpfy-ink-muted)]">{selectedCustomer.email}</span>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--erpfy-hover)] p-3">
                <div>
                  <span className="text-xs text-[var(--erpfy-ink-muted)]">Lifetime Value</span>
                  <p className="text-lg font-bold text-[var(--erpfy-ink)]">{currency}{selectedCustomer.spent.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--erpfy-ink-muted)]">Total Orders</span>
                  <p className="text-lg font-bold text-[var(--erpfy-ink)]">{selectedCustomer.orders} orders</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Location</span>
                <span className="font-semibold text-[var(--erpfy-ink)]">{selectedCustomer.location}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Last Activity</span>
                <span className="font-semibold text-[var(--erpfy-ink)]">{selectedCustomer.lastOrder}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Account Status</span>
                {selectedCustomer.status === 'active' && <ErpfyStatus tone="success">Active</ErpfyStatus>}
                {selectedCustomer.status === 'new' && <ErpfyStatus tone="info">New</ErpfyStatus>}
                {selectedCustomer.status === 'dormant' && <ErpfyStatus tone="neutral">Dormant</ErpfyStatus>}
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="primary-button"
              >
                Done
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
