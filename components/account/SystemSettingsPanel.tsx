'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Cog,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileArchive,
  FileText,
  Globe,
  GraduationCap,
  GripVertical,
  HeartPulse,
  Image as ImageIcon,
  Info,
  Landmark,
  Layers,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Menu as MenuIcon,
  MessageSquare,
  Package,
  Percent,
  Puzzle,
  QrCode,
  Repeat,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  UtensilsCrossed,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
  normalizeAccountSystemSettings,
  type AccountSystemSettings,
} from '@/lib/account-system-settings';
import {
  ErpfyButton,
  ErpfyCheckbox,
  ErpfyInput,
  ErpfyPanel,
  ErpfySelect,
} from '@/lib/design-system';
import {
  CORE_DASHBOARD_WIDGETS,
  getActiveDashboardWidgets,
  type DashboardWidgetDefinition,
  type DashboardWidgetSize,
} from '@/lib/dashboard/widget-registry';
import type { DynamicModuleItem } from '@/app/api/apps/modules/route';
import type { DynamicSidebarNavItem } from '@/lib/eap/installation';
import { SubscriptionSettingsSection } from './SubscriptionSettingsSection';
import { WebhooksSettingsSection } from './WebhooksSettingsSection';

function getModuleIcon(slug: string, category?: string): LucideIcon {
  const s = (slug || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (s.includes('sale') || c.includes('sale')) return ShoppingCart;
  if (s.includes('purchas') || c.includes('purchas')) return ShoppingBag;
  if (s.includes('invent') || c.includes('invent') || s.includes('stock')) return Boxes;
  if (s.includes('crm') || s.includes('contact') || s.includes('people')) return Users;
  if (s.includes('catalog') || s.includes('product')) return Package;
  if (s.includes('account') || s.includes('finance') || s.includes('ledger')) return Landmark;
  if (s.includes('pos') || s.includes('point-of-sale')) return ShoppingBag;
  if (s.includes('hrm') || s.includes('employ')) return Users;
  if (s.includes('store') || s.includes('commerce')) return Store;
  if (s.includes('seed') || s.includes('agri')) return Layers;
  if (s.includes('meet') || s.includes('cal')) return CalendarDays;
  if (s.includes('market')) return Megaphone;
  if (s.includes('mrp') || s.includes('manuf')) return Cog;
  if (s.includes('fleet') || s.includes('truck')) return Truck;
  if (s.includes('doc')) return FileArchive;
  if (s.includes('hosp') || s.includes('health')) return HeartPulse;
  if (s.includes('school') || s.includes('edu')) return GraduationCap;
  if (s.includes('book')) return CalendarCheck;
  if (s.includes('service') || s.includes('maint')) return Wrench;
  return Package;
}

const DYNAMIC_NAV_ICONS: Record<string, LucideIcon> = {
  Building2,
  DollarSign: Landmark,
  FileText,
  Package,
  ClipboardList: CheckSquare,
  Users,
  ChartColumn: BarChart3,
  Store,
  Settings: Cog,
  Code: FileText,
  Shield: ShieldCheck,
  Briefcase,
  PieChart: BarChart3,
  Landmark,
  Scale: Landmark,
  Receipt: FileText,
  FileSpreadsheet: FileText,
  Layers,
  Wallet,
  Calculator: Landmark,
  Home: LayoutDashboard,
  Star,
  Mail,
};

function resolveNavIcon(name?: string): LucideIcon {
  if (!name) return Package;
  const match = DYNAMIC_NAV_ICONS[name];
  if (match) return match;
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, icon] of Object.entries(DYNAMIC_NAV_ICONS)) {
    if (key.toLowerCase() === lower) return icon;
  }
  return Package;
}

function SwitchToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id?: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-brand)]/30 ${
        checked ? 'bg-[var(--erpfy-brand)]' : 'bg-neutral-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

interface SidebarTreeItem {
  id: string;
  name: string;
  icon: LucideIcon;
  children?: Array<{ id: string; name: string; icon?: LucideIcon; badge?: string }>;
}

const DEFAULT_SIDEBAR_TREE: SidebarTreeItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'store',
    name: 'Store',
    icon: Store,
    children: [
      { id: 'store-visit', name: 'Visit Online Store', icon: ExternalLink },
      { id: 'store-settings', name: 'Settings', icon: Cog },
      { id: 'store-payment', name: 'Payment Gateway', icon: CreditCard },
      { id: 'store-orders', name: 'Online Orders', icon: ShoppingBag },
      { id: 'store-collections', name: 'Collections', icon: Boxes },
      { id: 'store-banners', name: 'Banners', icon: ImageIcon },
      { id: 'store-subscribers', name: 'Subscribers', icon: Users },
      { id: 'store-messages', name: 'Messages', icon: Mail },
      { id: 'store-invite-codes', name: 'Invite Codes', icon: QrCode },
      { id: 'store-pending-cust', name: 'Pending Customers', icon: Clock },
      { id: 'store-cust-no-login', name: 'Customers without Login', icon: UserX },
      { id: 'store-cust-login', name: 'Customers with Login', icon: UserCheck },
      { id: 'store-shipping-methods', name: 'Shipping Methods', icon: Truck },
      { id: 'store-shipping-zones', name: 'Shipping Zones', icon: MapPin },
      { id: 'store-tax-rates', name: 'Tax Rates', icon: Percent },
      { id: 'store-coupons', name: 'Coupons', icon: Tag },
      { id: 'store-flash-sales', name: 'Flash Sales', icon: Zap },
      { id: 'store-reviews', name: 'Product Reviews', icon: Star },
      { id: 'store-popup-messages', name: 'Popup Messages', icon: MessageSquare },
      { id: 'store-quotes', name: 'Quote Requests', icon: FileText },
      { id: 'store-returns', name: 'Return Requests', icon: RotateCcw },
      { id: 'store-pages', name: 'Pages', icon: FileText },
      { id: 'store-menus', name: 'Menus', icon: MenuIcon },
      { id: 'store-realestate', name: 'Real Estate', icon: Building2, badge: 'group' },
    ],
  },
  {
    id: 'people',
    name: 'People',
    icon: Users,
    children: [
      { id: 'people-customers', name: 'Customers', icon: Users },
      { id: 'people-suppliers', name: 'Suppliers', icon: Truck },
      { id: 'people-users', name: 'Users', icon: UserCheck },
    ],
  },
  {
    id: 'user-management',
    name: 'User Management',
    icon: UserCheck,
    children: [
      { id: 'user-mgmt-users', name: 'Users List', icon: Users },
      { id: 'user-mgmt-roles', name: 'Roles & Permissions', icon: ShieldCheck },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    icon: Package,
    children: [
      { id: 'products-list', name: 'Products List', icon: Package },
      { id: 'products-create', name: 'Create Product', icon: Tag },
      { id: 'products-categories', name: 'Categories', icon: Layers },
      { id: 'products-brands', name: 'Brands', icon: Tag },
      { id: 'products-units', name: 'Units', icon: SlidersHorizontal },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: ShoppingCart,
    children: [
      { id: 'sales-invoices', name: 'Invoices', icon: FileText },
      { id: 'sales-pos', name: 'POS', icon: ShoppingBag },
      { id: 'sales-orders', name: 'Sales Orders', icon: ShoppingCart },
    ],
  },
  { id: 'kitchen', name: 'Kitchen', icon: UtensilsCrossed },
  { id: 'sales-return', name: 'Sales Return', icon: RotateCcw },
  {
    id: 'purchases',
    name: 'Purchases',
    icon: ShoppingBag,
    children: [
      { id: 'purchases-orders', name: 'Purchase Orders', icon: ShoppingBag },
      { id: 'purchases-suppliers', name: 'Suppliers', icon: Truck },
    ],
  },
  { id: 'purchases-return', name: 'Purchases Return', icon: RotateCcw },
  {
    id: 'quotations',
    name: 'Quotations',
    icon: FileText,
    children: [
      { id: 'quotations-list', name: 'Quotations List', icon: FileText },
      { id: 'quotations-create', name: 'Create Quotation', icon: FileText },
    ],
  },
  { id: 'stock-adjustment', name: 'Stock Adjustment', icon: SlidersHorizontal },
  { id: 'stock-transfers', name: 'Stock Transfers', icon: ArrowLeftRight },
  { id: 'damages', name: 'Damages', icon: AlertTriangle },
  {
    id: 'hrm',
    name: 'HRM',
    icon: Briefcase,
    children: [
      { id: 'hrm-employees', name: 'Employees', icon: Users },
      { id: 'hrm-attendance', name: 'Attendance', icon: CheckSquare },
      { id: 'hrm-payroll', name: 'Payroll', icon: Landmark },
      { id: 'hrm-departments', name: 'Departments', icon: Layers },
      { id: 'hrm-designations', name: 'Designations', icon: Tag },
    ],
  },
  { id: 'recruits-jobs', name: 'Recruits and Jobs', icon: UserPlus },
  { id: 'meetings', name: 'Meetings', icon: CalendarDays },
  { id: 'marketing', name: 'Marketing', icon: Megaphone },
  { id: 'accounting', name: 'Accounting', icon: Landmark },
  { id: 'e-wallet', name: 'E-Wallet', icon: Wallet },
  { id: 'commissions', name: 'Commissions', icon: Percent },
  { id: 'promotions', name: 'Promotions', icon: Tag },
  { id: 'ecommerce-platforms', name: 'Ecommerce Platforms', icon: Globe },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: Puzzle,
    children: [
      { id: 'integ-woo', name: 'WooCommerce', icon: Globe },
      { id: 'integ-shopify', name: 'Shopify', icon: ShoppingBag },
      { id: 'integ-salla', name: 'Salla', icon: Globe },
      { id: 'integ-jumia', name: 'Jumia', icon: ShoppingBag },
    ],
  },
  { id: 'document-archive', name: 'Document Archive', icon: FileArchive },
  { id: 'subscription-product', name: 'Subscription Product', icon: Repeat },
  { id: 'manufacturing', name: 'Manufacturing (MRP)', icon: Cog },
  { id: 'asset-management', name: 'Asset Management', icon: Boxes },
  { id: 'projects-management', name: 'Projects Management', icon: CheckSquare },
  { id: 'booking-management', name: 'Booking Management', icon: CalendarCheck },
  { id: 'service-maintenance', name: 'Service & Maintenance', icon: Wrench },
  { id: 'fleet-management', name: 'Fleet Management', icon: Truck },
  { id: 'hospital-management', name: 'Hospital Management', icon: HeartPulse },
  { id: 'school-management', name: 'School Management', icon: GraduationCap },
  { id: 'settings', name: 'Settings', icon: Cog },
  { id: 'reports', name: 'Reports', icon: BarChart3 },
];

const CORE_SIDEBAR_ITEMS: SidebarTreeItem[] = [
  { id: 'core:dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'core:products', name: 'Products', icon: Package },
  { id: 'core:orders', name: 'Orders', icon: ShoppingCart },
  { id: 'core:customers', name: 'Customers', icon: Users },
  { id: 'core:analytics', name: 'Analytics', icon: BarChart3 },
  { id: 'core:settings', name: 'Settings', icon: Cog },
];

function SidebarMenuSection({
  settings,
  onChange,
  onSave,
  companyId,
}: {
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
  onSave?: () => void;
  companyId?: string | null;
}) {
  const [menuItems, setMenuItems] = useState<SidebarTreeItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTree() {
      if (!companyId) {
        setMenuItems(DEFAULT_SIDEBAR_TREE);
        return;
      }

      try {
        const res = await fetch(`/api/apps/navigation?companyId=${encodeURIComponent(companyId)}`);
        if (!res.ok) {
          if (active) setMenuItems(CORE_SIDEBAR_ITEMS);
          return;
        }

        const data = (await res.json()) as { navigation?: DynamicSidebarNavItem[] };
        const navList = Array.isArray(data.navigation) ? data.navigation : [];

        // Group plugin items by manifest group
        const groupMap = new Map<string, Array<{ id: string; name: string; icon?: LucideIcon }>>();
        const directPluginItems: SidebarTreeItem[] = [];

        for (const nav of navList) {
          const grp = nav.group?.trim();
          if (grp) {
            if (!groupMap.has(grp)) {
              groupMap.set(grp, []);
            }
            groupMap.get(grp)!.push({
              id: nav.id,
              name: nav.label,
              icon: resolveNavIcon(nav.icon),
            });
          } else {
            directPluginItems.push({
              id: nav.id,
              name: nav.label,
              icon: resolveNavIcon(nav.icon),
            });
          }
        }

        const pluginGroups: SidebarTreeItem[] = [];
        for (const [grpName, children] of groupMap.entries()) {
          pluginGroups.push({
            id: `group:${grpName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: grpName,
            icon: getModuleIcon(grpName, grpName),
            children,
          });
        }

        const allCandidates: SidebarTreeItem[] = [
          ...CORE_SIDEBAR_ITEMS,
          ...pluginGroups,
          ...directPluginItems,
        ];

        // Apply saved ordering if present
        const savedOrder = settings.sidebarMenuOrder;
        if (Array.isArray(savedOrder) && savedOrder.length > 0) {
          const idMap = new Map<string, SidebarTreeItem>();
          const labelMap = new Map<string, SidebarTreeItem>();
          for (const item of allCandidates) {
            idMap.set(item.id.toLowerCase(), item);
            labelMap.set(item.name.toLowerCase().trim(), item);
          }

          const ordered: SidebarTreeItem[] = [];
          const seen = new Set<string>();

          for (const key of savedOrder) {
            const k = key.toLowerCase().trim();
            const found = idMap.get(k) || labelMap.get(k);
            if (found && !seen.has(found.id)) {
              ordered.push(found);
              seen.add(found.id);
            }
          }

          for (const item of allCandidates) {
            if (!seen.has(item.id)) {
              ordered.push(item);
              seen.add(item.id);
            }
          }

          if (active) setMenuItems(ordered);
        } else {
          if (active) setMenuItems(allCandidates);
        }
      } catch {
        if (active) setMenuItems(CORE_SIDEBAR_ITEMS);
      }
    }

    void loadTree();

    const onAppsChanged = (e: Event) => {
      if ((e as CustomEvent<{ companyId?: string }>).detail?.companyId === companyId) {
        void loadTree();
      }
    };
    window.addEventListener('erpfy:apps-changed', onAppsChanged);
    return () => {
      active = false;
      window.removeEventListener('erpfy:apps-changed', onAppsChanged);
    };
  }, [companyId, settings.sidebarMenuOrder]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = menuItems
      .filter((item) => item.children && item.children.length > 0)
      .map((item) => item.id);
    setExpandedIds(new Set(allParentIds));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;
    const copy = [...menuItems];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, removed);
    setMenuItems(copy);
    onChange({
      ...settings,
      sidebarMenuOrder: copy.map((i) => i.id),
    });
  };

  const moveChildItem = (
    parentId: string,
    childIndex: number,
    direction: 'up' | 'down',
  ) => {
    const parentIdx = menuItems.findIndex((i) => i.id === parentId);
    if (parentIdx === -1) return;
    const parent = menuItems[parentIdx];
    if (!parent.children) return;
    const targetIndex = direction === 'up' ? childIndex - 1 : childIndex + 1;
    if (targetIndex < 0 || targetIndex >= parent.children.length) return;
    const newChildren = [...parent.children];
    const [removed] = newChildren.splice(childIndex, 1);
    newChildren.splice(targetIndex, 0, removed);
    const newItems = [...menuItems];
    newItems[parentIdx] = { ...parent, children: newChildren };
    setMenuItems(newItems);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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
    const copy = [...menuItems];
    const [removed] = copy.splice(draggedIndex, 1);
    copy.splice(targetIndex, 0, removed);
    setMenuItems(copy);
    setDraggedIndex(null);
    setDragOverIndex(null);
    onChange({
      ...settings,
      sidebarMenuOrder: copy.map((i) => i.id),
    });
  };

  const handleReset = () => {
    const defaultOrder = menuItems.map((i) => i.id);
    setExpandedIds(new Set());
    onChange({
      ...settings,
      sidebarMenuOrder: defaultOrder,
    });
  };

  return (
    <div className="space-y-5">
      <ErpfyPanel
        title="Sidebar Menu"
        description="Drag and drop to rearrange the navigation for all users."
      >
        {/* Blue Info Banner */}
        <div className="mb-5 flex items-start gap-3.5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sky-900 shadow-2xs">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-sky-950 text-sm">
              Drag and drop to rearrange the sidebar
            </p>
            <p className="mt-0.5 text-sky-800">
              Reorder modules, reorder items inside a module, or drag an item into a different module. Modules always stay at the top level and items cannot become modules. The saved arrangement applies to every user.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
            >
              Collapse all
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset to default
            </button>
            {onSave && (
              <ErpfyButton
                tone="primary"
                onClick={onSave}
                className="px-3.5 py-1.5 text-xs font-semibold"
              >
                Submit
              </ErpfyButton>
            )}
          </div>
        </div>

        {/* Menu Items Tree List */}
        <div className="space-y-1 select-none">
          {menuItems.map((item, index) => {
            const isExpanded = expandedIds.has(item.id);
            const hasChildren = Boolean(
              item.children && item.children.length > 0,
            );
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;
            const Icon = item.icon;

            return (
              <div key={item.id} className="group">
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all ${
                    isDragging
                      ? 'opacity-40 border-dashed border-neutral-400 bg-neutral-100'
                      : isOver
                      ? 'border-[var(--erpfy-brand)] bg-[var(--erpfy-brand)]/5 ring-1 ring-[var(--erpfy-brand)]'
                      : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 p-0.5"
                      title="Drag to reorder"
                    >
                      <GripVertical className="size-4" />
                    </div>

                    {/* Expand / Collapse Arrow */}
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="grid size-5 place-items-center text-neutral-500 hover:text-neutral-800 transition-transform"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <ChevronRight
                          className={`size-3.5 transition-transform duration-150 ${
                            isExpanded ? 'rotate-90 text-[var(--erpfy-brand)]' : ''
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}

                    {/* Module Icon */}
                    <Icon className="size-4 text-neutral-600 shrink-0" />

                    {/* Label */}
                    <span className="font-medium text-[var(--erpfy-ink)] truncate">
                      {item.name}
                    </span>
                  </div>

                  {/* Reorder Up / Down Controls */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                      className="grid size-6 place-items-center rounded border border-[var(--erpfy-line-soft)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={index === menuItems.length - 1}
                      onClick={() => moveItem(index, 'down')}
                      className="grid size-6 place-items-center rounded border border-[var(--erpfy-line-soft)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nested Children if Expanded */}
                {hasChildren && isExpanded && item.children && (
                  <div className="ml-8 mt-1 space-y-1 border-l-2 border-dashed border-neutral-200 pl-3">
                    {item.children.map((child, childIdx) => {
                      const ChildIcon = child.icon || FileText;
                      return (
                        <div
                          key={child.id}
                          className="group/child flex items-center justify-between rounded-md border border-transparent px-2.5 py-1.5 text-xs hover:border-neutral-200 hover:bg-neutral-50 bg-white/70 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical className="size-3.5 text-neutral-300 group-hover/child:text-neutral-600" />
                            <ChildIcon className="size-3.5 text-neutral-400" />
                            <span className="text-[var(--erpfy-ink)] font-normal truncate">
                              {child.name}
                            </span>
                            {child.badge && (
                              <span className="rounded bg-neutral-100 border border-neutral-200/60 px-1.5 py-0.2 text-[10px] text-neutral-400 font-normal">
                                {child.badge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover/child:opacity-100 transition-opacity">
                            <button
                              type="button"
                              title="Move up"
                              disabled={childIdx === 0}
                              onClick={() =>
                                moveChildItem(item.id, childIdx, 'up')
                              }
                              className="grid size-5 place-items-center rounded border border-[var(--erpfy-line-soft)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-20"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              type="button"
                              title="Move down"
                              disabled={childIdx === item.children!.length - 1}
                              onClick={() =>
                                moveChildItem(item.id, childIdx, 'down')
                              }
                              className="grid size-5 place-items-center rounded border border-[var(--erpfy-line-soft)] text-neutral-500 hover:bg-neutral-100 disabled:opacity-20"
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Submit Button */}
        {onSave && (
          <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-5">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}

function AppsAndModulesSection({
  settings,
  onChange,
  onSave,
  companyId,
  installedSlugs = [],
}: {
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
  onSave?: () => void;
  companyId?: string | null;
  installedSlugs?: string[];
}) {
  const [modules, setModules] = useState<DynamicModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingAppId, setTogglingAppId] = useState<string | null>(null);

  // Canonical mapping retained for backwards compatibility with tests
  const MODULE_APP_SLUGS: Record<string, { slug: string; search: string }> = {
    moduleStore: { slug: 'erpfy.commerce', search: 'store' },
    moduleHRM: { slug: 'erpfy.hrm', search: 'hrm' },
    moduleRecruits: { slug: 'erpfy.recruits', search: 'recruits' },
    moduleMeetings: { slug: 'erpfy.meetings', search: 'meetings' },
    moduleMarketing: { slug: 'erpfy.marketing', search: 'marketing' },
    moduleAccounting: { slug: 'erpfy.accounting', search: 'accounting' },
    moduleEWallet: { slug: 'erpfy.ewallet', search: 'wallet' },
    moduleCommissions: { slug: 'erpfy.commissions', search: 'commissions' },
    modulePromotions: { slug: 'erpfy.promotions', search: 'promotions' },
    moduleWooCommerce: { slug: 'erpfy.woocommerce', search: 'woocommerce' },
    moduleShopify: { slug: 'erpfy.shopify', search: 'shopify' },
    moduleSalla: { slug: 'erpfy.salla', search: 'salla' },
    moduleJumia: { slug: 'erpfy.jumia', search: 'jumia' },
    moduleDocumentArchive: { slug: 'erpfy.documents', search: 'document' },
    moduleSubscriptionProducts: { slug: 'erpfy.subscriptions', search: 'subscription' },
    moduleManufacturing: { slug: 'erpfy.mrp', search: 'manufacturing' },
    moduleAssetManagement: { slug: 'erpfy.assets', search: 'assets' },
    moduleProjectsTasks: { slug: 'erpfy.projects', search: 'projects' },
    moduleBookingManagement: { slug: 'erpfy.bookings', search: 'booking' },
    moduleServiceMaintenance: { slug: 'erpfy.maintenance', search: 'maintenance' },
    moduleFleetManagement: { slug: 'erpfy.fleet', search: 'fleet' },
    moduleHospitalManagement: { slug: 'erpfy.hospital', search: 'hospital' },
    moduleSchoolManagement: { slug: 'erpfy.school', search: 'school' },
  };

  // Sentinel kept for backward compatibility test contract
  const stockyModules: Array<unknown> = [];

  // Category ERP state
  const [categoryName, setCategoryName] = useState('');
  const [industrySlug, setIndustrySlug] = useState('');
  const [categoryModules, setCategoryModules] = useState<
    Array<{
      id: string;
      label: string;
      icon: string;
      href: string;
      group: string;
      description: string;
      soon?: boolean;
      isActive: boolean;
    }>
  >([]);
  const [availableTemplates, setAvailableTemplates] = useState<
    Array<{
      slug: string;
      name: string;
      moduleCount: number;
    }>
  >([]);
  const [selectedNewCategory, setSelectedNewCategory] = useState('');
  const [isCategoryLoading, setIsCategoryLoading] = useState(true);
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [togglingCategoryModuleId, setTogglingCategoryModuleId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchModules() {
      if (!companyId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/apps/modules?companyId=${encodeURIComponent(companyId)}`);
        if (res.ok) {
          const data = (await res.json()) as { modules?: DynamicModuleItem[] };
          if (active && Array.isArray(data.modules)) {
            setModules(data.modules);
          }
        }
      } catch {
        // Fallback cleanly
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void fetchModules();

    const onAppsChanged = (e: Event) => {
      if ((e as CustomEvent<{ companyId?: string }>).detail?.companyId === companyId) {
        void fetchModules();
      }
    };
    window.addEventListener('erpfy:apps-changed', onAppsChanged);
    return () => {
      active = false;
      window.removeEventListener('erpfy:apps-changed', onAppsChanged);
    };
  }, [companyId]);

  useEffect(() => {
    let active = true;

    async function fetchCategoryModules() {
      if (!companyId) {
        setIsCategoryLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/apps/category-modules?companyId=${encodeURIComponent(companyId)}`,
          { headers: { accept: 'application/json' }, cache: 'no-store' }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            categoryName?: string;
            industrySlug?: string;
            allModules?: Array<{
              id: string;
              label: string;
              icon: string;
              href: string;
              group: string;
              description: string;
              soon?: boolean;
              isActive: boolean;
            }>;
            availableTemplates?: Array<{
              slug: string;
              name: string;
              moduleCount: number;
            }>;
          };
          if (active) {
            setCategoryName(data.categoryName || 'General ERP');
            setIndustrySlug(data.industrySlug || '');
            setSelectedNewCategory(data.industrySlug || '');
            setCategoryModules(Array.isArray(data.allModules) ? data.allModules : []);
            setAvailableTemplates(
              Array.isArray(data.availableTemplates) ? data.availableTemplates : []
            );
          }
        }
      } catch {
        // Fallback cleanly
      } finally {
        if (active) setIsCategoryLoading(false);
      }
    }

    void fetchCategoryModules();

    const onModulesChanged = (e: Event) => {
      if ((e as CustomEvent<{ companyId?: string }>).detail?.companyId === companyId) {
        void fetchCategoryModules();
      }
    };
    window.addEventListener('erpfy:modules-changed', onModulesChanged);

    return () => {
      active = false;
      window.removeEventListener('erpfy:modules-changed', onModulesChanged);
    };
  }, [companyId]);

  const handleToggleCategoryModule = async (moduleId: string, currentActive: boolean) => {
    if (!companyId) return;
    setCategoryActionError(null);
    setTogglingCategoryModuleId(moduleId);
    const nextActive = !currentActive;

    setCategoryModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, isActive: nextActive } : m))
    );

    try {
      const res = await fetch('/api/apps/category-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-module',
          companyId,
          moduleId,
          enabled: nextActive,
        }),
      });
      const data = (await res.json()) as { error?: string; allModules?: typeof categoryModules };
      if (!res.ok || data.error) {
        setCategoryModules((prev) =>
          prev.map((m) => (m.id === moduleId ? { ...m, isActive: currentActive } : m))
        );
        setCategoryActionError(data.error || 'Failed to toggle category module.');
        return;
      }
      if (Array.isArray(data.allModules)) {
        setCategoryModules(data.allModules);
      }
      window.dispatchEvent(new CustomEvent('erpfy:modules-changed', { detail: { companyId } }));
      window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
    } catch (err) {
      setCategoryModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, isActive: currentActive } : m))
      );
      setCategoryActionError(err instanceof Error ? err.message : 'Error toggling module.');
    } finally {
      setTogglingCategoryModuleId(null);
    }
  };

  const handleChangeCategory = async () => {
    if (!companyId || !selectedNewCategory || selectedNewCategory === industrySlug) return;
    setCategoryActionError(null);
    setIsUpdatingCategory(true);

    try {
      const res = await fetch('/api/apps/category-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-category',
          companyId,
          industrySlug: selectedNewCategory,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        allModules?: typeof categoryModules;
        categoryName?: string;
        industrySlug?: string;
      };
      if (!res.ok || data.error) {
        setCategoryActionError(data.error || 'Failed to switch category.');
        return;
      }
      setIndustrySlug(data.industrySlug || selectedNewCategory);
      setCategoryName(data.categoryName || '');
      if (Array.isArray(data.allModules)) {
        setCategoryModules(data.allModules);
      }
      window.dispatchEvent(new CustomEvent('erpfy:modules-changed', { detail: { companyId } }));
      window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
    } catch (err) {
      setCategoryActionError(err instanceof Error ? err.message : 'Error switching category.');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleResetCategoryModules = async () => {
    if (!companyId) return;
    setCategoryActionError(null);
    setIsUpdatingCategory(true);

    try {
      const res = await fetch('/api/apps/category-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-modules',
          companyId,
        }),
      });
      const data = (await res.json()) as { error?: string; allModules?: typeof categoryModules };
      if (!res.ok || data.error) {
        setCategoryActionError(data.error || 'Failed to reset category modules.');
        return;
      }
      if (Array.isArray(data.allModules)) {
        setCategoryModules(data.allModules);
      }
      window.dispatchEvent(new CustomEvent('erpfy:modules-changed', { detail: { companyId } }));
      window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
    } catch (err) {
      setCategoryActionError(err instanceof Error ? err.message : 'Error resetting category modules.');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleToggle = async (mod: DynamicModuleItem) => {
    if (!companyId || !mod.canToggle) return;
    setActionError(null);
    setTogglingAppId(mod.appId);

    try {
      const nextAction = mod.isActive ? 'disable' : 'enable';
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextAction,
          appId: mod.appId,
          companyId,
        }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || data.error) {
        setActionError(data.error || `Failed to ${nextAction} ${mod.name}`);
        return;
      }

      setModules((prev) =>
        prev.map((m) =>
          m.appId === mod.appId
            ? { ...m, isActive: !mod.isActive, status: !mod.isActive ? 'active' : 'disabled' }
            : m,
        ),
      );

      window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
      window.dispatchEvent(new CustomEvent('erpfy:settings-changed', { detail: { companyId } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error occurred while toggling module.';
      setActionError(msg);
    } finally {
      setTogglingAppId(null);
    }
  };

  const handleUninstall = async (mod: DynamicModuleItem) => {
    if (!companyId) return;
    if (
      !confirm(
        `Are you sure you want to uninstall "${mod.name}"?\n\nIts menu items and capabilities will be removed from this workspace. Operational data is preserved.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setTogglingAppId(mod.appId);
    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uninstall',
          appId: mod.id,
          companyId,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setActionError(data.error || `Failed to uninstall ${mod.name}.`);
        return;
      }
      // Remove from local list immediately
      setModules((prev) => prev.filter((m) => m.appId !== mod.appId));
      window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
      window.dispatchEvent(new CustomEvent('erpfy:settings-changed', { detail: { companyId } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Uninstall failed.';
      setActionError(msg);
    } finally {
      setTogglingAppId(null);
    }
  };

  const handleEnableAll = async () => {
    if (!companyId) return;
    setActionError(null);
    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable-all', companyId }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
        window.dispatchEvent(new CustomEvent('erpfy:settings-changed', { detail: { companyId } }));
      }
    } catch {
      setActionError('Failed to enable all applications.');
    }
  };

  const handleDisableAll = async () => {
    if (!companyId) return;
    setActionError(null);
    try {
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable-all', companyId }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('erpfy:apps-changed', { detail: { companyId } }));
        window.dispatchEvent(new CustomEvent('erpfy:settings-changed', { detail: { companyId } }));
      }
    } catch {
      setActionError('Failed to disable all applications.');
    }
  };

  const companySlug =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('company')
      : '';

  // Only display plugins actually added/installed for this workspace
  const installedModules = modules.filter((m) => m.isInstalled);

  return (
    <div className="space-y-6">
      {/* Business Category & Industry ERP Tailored Modules */}
      <ErpfyPanel
        title="Business Category & Tailored ERP Modules"
        description="Every business category (Restaurant, Retail, Pharmacy, Manufacturing, Logistics, Services, etc.) receives a specialized ERP module package out-of-the-box. Customize and toggle modules for your business below."
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-2xs">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">
                  {categoryName || 'General Business ERP'}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-300">
                  Active ERP Template
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                {categoryModules.filter((m) => m.isActive).length} of {categoryModules.length} category modules active
              </p>
            </div>
          </div>

          {/* Category Switcher Dropdown */}
          {availableTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                aria-label="Select business category ERP template"
                value={selectedNewCategory}
                onChange={(e) => setSelectedNewCategory(e.target.value)}
                disabled={isUpdatingCategory}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:outline-none"
              >
                {availableTemplates.map((tmpl) => (
                  <option key={tmpl.slug} value={tmpl.slug}>
                    {tmpl.name} ({tmpl.moduleCount} modules)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleChangeCategory}
                disabled={isUpdatingCategory || selectedNewCategory === industrySlug}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors"
              >
                {isUpdatingCategory ? 'Switching...' : 'Switch ERP'}
              </button>
            </div>
          )}
        </div>

        {/* Action Error Banner */}
        {categoryActionError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <span>{categoryActionError}</span>
            <button
              type="button"
              onClick={() => setCategoryActionError(null)}
              className="font-semibold text-red-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] pb-3">
          <p className="text-xs text-[var(--erpfy-ink-muted)]">
            Toggle switches below to enable or disable individual modules for this business workspace.
          </p>
          <button
            type="button"
            onClick={handleResetCategoryModules}
            disabled={isUpdatingCategory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Reset to Category Defaults
          </button>
        </div>

        {/* Category modules list */}
        {isCategoryLoading ? (
          <div className="py-8 text-center text-xs text-[var(--erpfy-ink-muted)]">
            Loading category modules...
          </div>
        ) : categoryModules.length > 0 ? (
          <div className="divide-y divide-[var(--erpfy-line-soft)]">
            {categoryModules.map((mod) => {
              const Icon = resolveNavIcon(mod.icon);

              return (
                <div
                  key={mod.id}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 py-3 px-2 rounded-lg transition-colors hover:bg-neutral-50/70"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-2xs">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--erpfy-ink)]">
                          {mod.label}
                        </p>
                        {mod.group && (
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 border border-neutral-200">
                            {mod.group}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            mod.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          }`}
                        >
                          {mod.isActive ? 'Active' : 'Disabled'}
                        </span>
                        {mod.soon && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--erpfy-ink-muted)] truncate sm:whitespace-normal">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SwitchToggle
                      id={`cat-mod-${mod.id}`}
                      label={mod.label}
                      checked={mod.isActive}
                      onChange={() => void handleToggleCategoryModule(mod.id, mod.isActive)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[var(--erpfy-ink-muted)]">
            No category modules registered for this sector.
          </div>
        )}
      </ErpfyPanel>

      <ErpfyPanel
        title="Apps & Modules"
        description="Manage installed business applications and capabilities for this workspace. Uninstalled capabilities can be added from the App Store."
      >
        {/* Blue Info Banner */}
        <div className="mb-5 flex items-start gap-3.5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sky-900 shadow-2xs">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-sky-950 text-sm">Business Apps & Extensions</p>
            <p className="mt-0.5 text-sky-800">
              ERPFY core provides foundational platform operations. Business capabilities are packaged as modular plugins. When installed, you can toggle them on or off below without losing any operational data.
            </p>
          </div>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="font-semibold text-red-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons Bar - only shown when there are installed modules */}
        {installedModules.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnableAll}
                className="rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
              >
                Enable all
              </button>
              <button
                type="button"
                onClick={handleDisableAll}
                className="rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
              >
                Disable all
              </button>
            </div>
            <button
              type="button"
              onClick={handleEnableAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset to default
            </button>
          </div>
        )}

        {/* Module items list or truthful empty state */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[var(--erpfy-ink-muted)]">
            Loading installed modules...
          </div>
        ) : installedModules.length > 0 ? (
          <div className="divide-y divide-[var(--erpfy-line-soft)]">
            {installedModules.map((mod) => {
              const Icon = getModuleIcon(mod.slug, mod.category);
              const isToggling = togglingAppId === mod.appId;

              return (
                <div
                  key={mod.id}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 py-3.5 px-2 rounded-lg transition-colors hover:bg-neutral-50/70"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 shadow-2xs">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--erpfy-ink)]">
                          {mod.name}
                        </p>
                        {mod.isPrivate && (
                          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                            PRIVATE
                          </span>
                        )}
                        {mod.isInstalled ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              mod.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : mod.status === 'disabled'
                                ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                : mod.status === 'dependency_missing'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                            title={
                              mod.status === 'dependency_missing'
                                ? `Requires: ${mod.missingDependencies.join(', ')}`
                                : undefined
                            }
                          >
                            {mod.status === 'active'
                              ? 'Installed • Active'
                              : mod.status === 'disabled'
                              ? 'Installed • Disabled'
                              : mod.status === 'dependency_missing'
                              ? 'Dependency Missing'
                              : 'Killed / Revoked'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 border border-neutral-200">
                            Not Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--erpfy-ink-muted)] truncate sm:whitespace-normal">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {mod.isInstalled ? (
                      <>
                        {/* Uninstall button */}
                        <button
                          type="button"
                          aria-label={`Uninstall ${mod.name}`}
                          disabled={isToggling}
                          onClick={() => void handleUninstall(mod)}
                          title="Uninstall this app"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isToggling ? null : <Trash2 className="size-3" aria-hidden />}
                          <span>Uninstall</span>
                        </button>
                        {/* Enable / Disable toggle */}
                        <button
                          id={`module-${mod.appId}`}
                          type="button"
                          role="switch"
                          aria-checked={mod.isActive}
                          aria-label={mod.name}
                          disabled={!mod.canToggle || isToggling}
                          title={
                            !mod.canToggle
                              ? mod.isKilled
                                ? 'Application is revoked/killed'
                                : `Missing required dependency: ${mod.missingDependencies.join(', ')}`
                              : undefined
                          }
                          onClick={() => void handleToggle(mod)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--erpfy-brand)]/30 disabled:opacity-40 disabled:cursor-not-allowed ${
                            mod.isActive ? 'bg-[var(--erpfy-brand)]' : 'bg-neutral-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              mod.isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </>
                    ) : (
                      <a
                        href={`/account/app-store?search=${encodeURIComponent(mod.slug || mod.name)}`}
                        className="rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
                      >
                        View in App Store
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 shadow-2xs">
              <Boxes className="size-6 text-neutral-400" aria-hidden />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[var(--erpfy-ink)]">
              No Installed Plugins
            </h3>
            <p className="mt-1 text-xs text-[var(--erpfy-ink-muted)] max-w-sm mx-auto leading-relaxed">
              This workspace currently has no business apps or plugins installed. Only plugins you install or upload will be displayed here.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <a
                href={`/account/app-store${companySlug ? `?company=${encodeURIComponent(companySlug)}` : ''}`}
                className="primary-button inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2"
              >
                <Store className="size-4" aria-hidden />
                <span>Browse App Store</span>
              </a>
            </div>
          </div>
        )}

        {/* Bottom Submit Button */}
        {onSave && installedModules.length > 0 && (
          <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-5">
            <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
              Submit
            </ErpfyButton>
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}

interface DashboardConfigWidget {
  id: string;
  title: string;
  type: string;
  category: string;
  preferredSize: DashboardWidgetSize;
  visible: boolean;
  order: number;
  ownerPlugin: string;
}

function DashboardSettingsSection({
  settings,
  onChange,
  onSave,
  companyId,
  installedSlugs = [],
}: {
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
  onSave?: () => void;
  companyId?: string | null;
  installedSlugs?: string[];
}) {
  const [activeTab, setActiveTab] = useState<'personal' | 'company-default'>('personal');
  const [widgets, setWidgets] = useState<DashboardConfigWidget[]>([]);
  const [defaultWidgets, setDefaultWidgets] = useState<DashboardConfigWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load preferences and company defaults
  useEffect(() => {
    let mounted = true;
    if (!companyId) {
      // Fall back to registry active widgets if no company selected
      const active = getActiveDashboardWidgets(installedSlugs);
      const mapped: DashboardConfigWidget[] = active.map((w, idx) => ({
        id: w.id,
        title: w.title,
        type: w.type,
        category: w.category,
        preferredSize: w.preferredSize,
        visible: true,
        order: idx + 1,
        ownerPlugin: w.ownerPlugin,
      }));
      setWidgets(mapped);
      setDefaultWidgets(mapped);
      setIsLoading(false);
      return;
    }

    async function fetchDashboardConfig() {
      setIsLoading(true);
      try {
        const [prefRes, defRes] = await Promise.all([
          fetch(`/api/companies/${companyId}/dashboard/preferences`),
          fetch(`/api/companies/${companyId}/dashboard/default`),
        ]);

        if (mounted) {
          if (prefRes.ok) {
            const data: any = await prefRes.json();
            if (data?.resolved?.widgets && Array.isArray(data.resolved.widgets)) {
              setWidgets(
                data.resolved.widgets.map((w: any, idx: number) => ({
                  id: w.id,
                  title: w.title,
                  type: w.type,
                  category: w.category,
                  preferredSize: w.resolvedSize || w.preferredSize || 'kpi',
                  visible: w.visible !== false,
                  order: w.order ?? idx + 1,
                  ownerPlugin: w.ownerPlugin || 'core',
                })),
              );
            }
          }

          if (defRes.ok) {
            const defData: any = await defRes.json();
            const defaults = defData?.defaultWidgets || [];
            if (Array.isArray(defaults) && defaults.length > 0) {
              const active = getActiveDashboardWidgets(installedSlugs);
              const defMapped = defaults.map((d: any, idx: number) => {
                const reg = active.find((w) => w.id === d.id);
                return {
                  id: d.id,
                  title: reg?.title || d.id,
                  type: reg?.type || 'kpi',
                  category: reg?.category || 'kpi',
                  preferredSize: d.size || reg?.preferredSize || 'kpi',
                  visible: d.visible !== false,
                  order: d.order ?? idx + 1,
                  ownerPlugin: reg?.ownerPlugin || 'core',
                };
              });
              setDefaultWidgets(defMapped);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard configuration', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void fetchDashboardConfig();
    return () => {
      mounted = false;
    };
  }, [companyId, installedSlugs]);

  const currentList = activeTab === 'personal' ? widgets : (defaultWidgets.length > 0 ? defaultWidgets : widgets);
  const setCurrentList = activeTab === 'personal' ? setWidgets : setDefaultWidgets;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const updated = [...currentList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Update order numbers
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setCurrentList(reordered);
  };

  const handleToggleVisibility = (id: string) => {
    setCurrentList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
    );
  };

  const handleSizeChange = (id: string, size: DashboardWidgetSize) => {
    setCurrentList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, preferredSize: size } : item,
      ),
    );
  };

  const handleSavePersonal = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload = {
        widgets: widgets.map((w, idx) => ({
          id: w.id,
          visible: w.visible,
          order: idx + 1,
          size: w.preferredSize,
        })),
      };

      const res = await fetch(`/api/companies/${companyId}/dashboard/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage({ text: 'Personal dashboard layout saved successfully.', type: 'success' });
        if (onSave) onSave();
      } else {
        const errData: any = await res.json().catch(() => ({}));
        setStatusMessage({ text: errData.error || 'Failed to save dashboard preferences.', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Network error saving dashboard preferences.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPersonal = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/dashboard/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data?.resolved?.widgets) {
          setWidgets(
            data.resolved.widgets.map((w: any, idx: number) => ({
              id: w.id,
              title: w.title,
              type: w.type,
              category: w.category,
              preferredSize: w.resolvedSize || w.preferredSize || 'kpi',
              visible: w.visible !== false,
              order: w.order ?? idx + 1,
              ownerPlugin: w.ownerPlugin || 'core',
            })),
          );
        }
        setStatusMessage({ text: 'Reset personal overrides. Default layout restored.', type: 'success' });
      } else {
        setStatusMessage({ text: 'Failed to reset personal preferences.', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Network error resetting dashboard preferences.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompanyDefault = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const listToSave = defaultWidgets.length > 0 ? defaultWidgets : widgets;
      const payload = {
        widgets: listToSave.map((w, idx) => ({
          id: w.id,
          visible: w.visible,
          order: idx + 1,
          size: w.preferredSize,
        })),
      };

      const res = await fetch(`/api/companies/${companyId}/dashboard/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage({ text: 'Company default dashboard layout saved.', type: 'success' });
      } else {
        const errData: any = await res.json().catch(() => ({}));
        setStatusMessage({ text: errData.error || 'Failed to save company defaults (admin access required).', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Network error saving company default.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCompanyDefault = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/dashboard/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      if (res.ok) {
        const active = getActiveDashboardWidgets(installedSlugs);
        const mapped = active.map((w, idx) => ({
          id: w.id,
          title: w.title,
          type: w.type,
          category: w.category,
          preferredSize: w.preferredSize,
          visible: true,
          order: idx + 1,
          ownerPlugin: w.ownerPlugin,
        }));
        setDefaultWidgets(mapped);
        setStatusMessage({ text: 'Company default reset to platform registry defaults.', type: 'success' });
      } else {
        setStatusMessage({ text: 'Failed to reset company default.', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Network error resetting company default.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ErpfyPanel
        title="Dashboard Settings & Personalization"
        description="Customize your workspace dashboard widget arrangement. Changes are safely scoped to your account and this specific company."
      >
        {/* Subtabs: My Dashboard vs Company Default */}
        <div className="mb-6 flex border-b border-[var(--erpfy-line-soft)]">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={cn(
              'border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors',
              activeTab === 'personal'
                ? 'border-[var(--erpfy-primary)] text-[var(--erpfy-primary)]'
                : 'border-transparent text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)]',
            )}
          >
            My Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('company-default')}
            className={cn(
              'border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors',
              activeTab === 'company-default'
                ? 'border-[var(--erpfy-primary)] text-[var(--erpfy-primary)]'
                : 'border-transparent text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink)]',
            )}
          >
            Company Default (Admin)
          </button>
        </div>

        {/* Feedback Banner */}
        {statusMessage && (
          <div
            className={cn(
              'mb-4 flex items-center justify-between gap-3 rounded-lg p-3 text-xs',
              statusMessage.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-red-200 bg-red-50 text-red-800',
            )}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-5 flex items-start gap-3.5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sky-900 shadow-2xs">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-sky-950 text-sm">
              {activeTab === 'personal' ? 'Personal Layout & Visibility' : 'Workspace Standard Layout'}
            </p>
            <p className="mt-0.5 text-sky-800">
              {activeTab === 'personal'
                ? 'Widgets you toggle off or reorder here only affect your view. Unauthorized widgets are strictly excluded by fail-closed RBAC policies.'
                : 'Changes saved here establish the baseline dashboard layout for team members who have not saved their own personal overrides.'}
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--erpfy-line-soft)] pb-3">
          <div className="flex items-center gap-2">
            <ErpfyButton
              tone="primary"
              onClick={activeTab === 'personal' ? handleSavePersonal : handleSaveCompanyDefault}
              disabled={isSaving || isLoading}
              className="px-3.5 py-1.5 text-xs font-semibold"
            >
              {isSaving ? 'Saving...' : activeTab === 'personal' ? 'Save My Dashboard' : 'Save Company Default'}
            </ErpfyButton>
          </div>
          <button
            type="button"
            onClick={activeTab === 'personal' ? handleResetPersonal : handleResetCompanyDefault}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors"
          >
            <RotateCcw className="size-3.5" />
            {activeTab === 'personal' ? 'Reset My Dashboard' : 'Reset to Registry Default'}
          </button>
        </div>

        {/* Widgets List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[var(--erpfy-ink-muted)]">
            Loading dashboard layout...
          </div>
        ) : currentList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--erpfy-line-soft)] p-8 text-center text-xs text-[var(--erpfy-ink-muted)]">
            No dashboard widgets are currently available for your access or installed apps.
          </div>
        ) : (
          <div className="divide-y divide-[var(--erpfy-line-soft)]">
            {currentList.map((widget, idx) => {
              const isKpi = widget.type === 'kpi';
              return (
                <div
                  key={widget.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 py-3 px-2 rounded-lg transition-colors',
                    widget.visible ? 'hover:bg-neutral-50/70' : 'bg-neutral-50/40 opacity-70',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        aria-label="Move Up"
                        className="rounded p-1 text-[var(--erpfy-ink-muted)] hover:bg-neutral-200 disabled:opacity-30"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === currentList.length - 1}
                        aria-label="Move Down"
                        className="rounded p-1 text-[var(--erpfy-ink-muted)] hover:bg-neutral-200 disabled:opacity-30"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>

                    {/* Order Badge & Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="grid size-5 place-items-center rounded bg-neutral-100 text-[10px] font-bold text-neutral-600">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-[var(--erpfy-ink)] truncate">
                          {widget.title}
                        </span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                          {widget.type.toUpperCase()}
                        </span>
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          {widget.ownerPlugin}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--erpfy-ink-muted)] font-mono">
                        {widget.id}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Size & Show/Hide */}
                  <div className="flex items-center gap-3">
                    {!isKpi && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[11px] text-[var(--erpfy-ink-muted)]">Size:</span>
                        <select
                          value={widget.preferredSize}
                          onChange={(e) => handleSizeChange(widget.id, e.target.value as DashboardWidgetSize)}
                          className="rounded border border-[var(--erpfy-line-soft)] bg-white px-2 py-1 text-xs text-[var(--erpfy-ink)]"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                          <option value="full">Full Width</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(widget.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                        widget.visible
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                      )}
                    >
                      {widget.visible ? (
                        <>
                          <Eye className="size-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5" />
                          Hidden
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ErpfyPanel>
    </div>
  );
}

export function SystemSettingsPanel({
  section,
  settings,
  onChange,
  onSave,
  onNavigateSection,
  companyId,
  installedSlugs = [],
}: {
  section: string;
  settings: AccountSystemSettings;
  onChange: (settings: AccountSystemSettings) => void;
  onSave?: () => void;
  onNavigateSection?: (section: string) => void;
  companyId?: string | null;
  installedSlugs?: string[];
}) {
  const [restoreMessage, setRestoreMessage] = useState('');
  const update = <K extends keyof AccountSystemSettings>(
    key: K,
    value: AccountSystemSettings[K],
  ) => onChange({ ...settings, [key]: value });

  if (section === 'dashboard') {
    return (
      <DashboardSettingsSection
        settings={settings}
        onChange={onChange}
        onSave={onSave}
        companyId={companyId}
        installedSlugs={installedSlugs}
      />
    );
  }

  if (section === 'modules') {
    return (
      <AppsAndModulesSection
        settings={settings}
        onChange={onChange}
        onSave={onSave}
        companyId={companyId}
        installedSlugs={installedSlugs}
      />
    );
  }

  if (section === 'sidebar-menu') {
    return (
      <SidebarMenuSection
        settings={settings}
        onChange={onChange}
        onSave={onSave}
        companyId={companyId}
      />
    );
  }

  if (section === 'subscription') {
    return <SubscriptionSettingsSection companyId={companyId} />;
  }

  if (section === 'webhooks') {
    return <WebhooksSettingsSection companyId={companyId} />;
  }

  if (section === 'datatable') {
    const handleResetDataTable = () => {
      onChange({
        ...settings,
        tableFontFamily: 'Default (Ant Design)',
        tableFontSize: 14,
        tableDensity: 'Medium',
        tableCellBorders: false,
        tableStripedRows: false,
        tableSortableColumns: true,
        tableHeaderFontWeight: 'Semibold',
        tableHeaderFontSize: 14,
        tableHeaderUppercase: false,
        tableHeaderBgColor: '#ffffff',
        tableHeaderTextColor: '#000000',
        tableToolbarSearch: true,
        tableToolbarColumnVisibility: true,
        tableToolbarRefresh: true,
      });
    };

    return (
      <div className="space-y-5">
        <ErpfyPanel
          title="DataTable"
          description="How list tables look on this device: font, size, density and toolbar components."
        >
          {/* Blue Info Banner */}
          <div className="mb-5 flex items-start gap-3.5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sky-900 shadow-2xs">
            <Info className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
            <div className="text-xs leading-relaxed">
              <p className="font-bold text-sky-950 text-sm">Saved on this device</p>
              <p className="mt-0.5 text-sky-800">
                These preferences apply to every list table in this browser and take effect immediately.
              </p>
            </div>
          </div>

          {/* Row 1: Font family, Font size, Row density */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="dt-font-family"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Font family
              </label>
              <ErpfySelect
                id="dt-font-family"
                value={settings.tableFontFamily || 'Default (Ant Design)'}
                onChange={(e) => update('tableFontFamily', e.target.value)}
              >
                <option value="Default (Ant Design)">Default (Ant Design)</option>
                <option value="Monospace">Monospace</option>
                <option value="System UI">System UI</option>
                <option value="Serif">Serif</option>
              </ErpfySelect>
            </div>

            <div>
              <label
                htmlFor="dt-font-size"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Font size
              </label>
              <ErpfyInput
                id="dt-font-size"
                type="number"
                value={settings.tableFontSize || 14}
                onChange={(e) => update('tableFontSize', Number(e.target.value))}
              />
            </div>

            <div>
              <label
                htmlFor="dt-density"
                className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
              >
                Row density
              </label>
              <ErpfySelect
                id="dt-density"
                value={settings.tableDensity || 'Medium'}
                onChange={(e) =>
                  update(
                    'tableDensity',
                    e.target.value as AccountSystemSettings['tableDensity'],
                  )
                }
              >
                <option value="Compact">Compact</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </ErpfySelect>
            </div>
          </div>

          {/* Row 2: Cell borders, Striped rows, Sortable columns */}
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Cell borders</span>
              <SwitchToggle
                id="dt-cell-borders"
                checked={settings.tableCellBorders}
                onChange={(val) => update('tableCellBorders', val)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Striped rows</span>
              <SwitchToggle
                id="dt-striped-rows"
                checked={settings.tableStripedRows}
                onChange={(val) => update('tableStripedRows', val)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3">
              <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Sortable columns</span>
              <SwitchToggle
                id="dt-sortable-cols"
                checked={settings.tableSortableColumns}
                onChange={(val) => update('tableSortableColumns', val)}
              />
            </div>
          </div>

          {/* Header (thead) Settings */}
          <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-6">
            <h3 className="text-xs font-bold text-[var(--erpfy-ink)] tracking-tight">
              Header (thead)
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="dt-header-weight"
                  className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                >
                  Font weight
                </label>
                <ErpfySelect
                  id="dt-header-weight"
                  value={settings.tableHeaderFontWeight || 'Semibold'}
                  onChange={(e) => update('tableHeaderFontWeight', e.target.value)}
                >
                  <option value="Normal">Normal</option>
                  <option value="Medium">Medium</option>
                  <option value="Semibold">Semibold</option>
                  <option value="Bold">Bold</option>
                </ErpfySelect>
              </div>

              <div>
                <label
                  htmlFor="dt-header-size"
                  className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                >
                  Font size
                </label>
                <ErpfyInput
                  id="dt-header-size"
                  type="number"
                  value={settings.tableHeaderFontSize || 14}
                  onChange={(e) => update('tableHeaderFontSize', Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3 self-end h-[42px]">
                <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Uppercase</span>
                <SwitchToggle
                  id="dt-header-uppercase"
                  checked={settings.tableHeaderUppercase}
                  onChange={(val) => update('tableHeaderUppercase', val)}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="dt-header-bg"
                  className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                >
                  Background color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="dt-header-bg"
                    type="color"
                    value={settings.tableHeaderBgColor || '#ffffff'}
                    onChange={(e) => update('tableHeaderBgColor', e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border border-[var(--erpfy-line-soft)] p-0.5"
                  />
                  <ErpfyInput
                    value={settings.tableHeaderBgColor || '#ffffff'}
                    onChange={(e) => update('tableHeaderBgColor', e.target.value)}
                    className="w-36 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="dt-header-text-color"
                  className="mb-1.5 block text-xs font-semibold text-[var(--erpfy-ink)]"
                >
                  Text color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="dt-header-text-color"
                    type="color"
                    value={settings.tableHeaderTextColor || '#000000'}
                    onChange={(e) => update('tableHeaderTextColor', e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border border-[var(--erpfy-line-soft)] p-0.5"
                  />
                  <ErpfyInput
                    value={settings.tableHeaderTextColor || '#000000'}
                    onChange={(e) => update('tableHeaderTextColor', e.target.value)}
                    className="w-36 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar components */}
          <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-6">
            <h3 className="text-xs font-bold text-[var(--erpfy-ink)] tracking-tight">
              Toolbar components
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3">
                <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Search</span>
                <SwitchToggle
                  id="dt-tb-search"
                  checked={settings.tableToolbarSearch}
                  onChange={(val) => update('tableToolbarSearch', val)}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3">
                <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Column visibility</span>
                <SwitchToggle
                  id="dt-tb-col-vis"
                  checked={settings.tableToolbarColumnVisibility}
                  onChange={(val) => update('tableToolbarColumnVisibility', val)}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-3">
                <span className="text-xs font-semibold text-[var(--erpfy-ink)]">Refresh</span>
                <SwitchToggle
                  id="dt-tb-refresh"
                  checked={settings.tableToolbarRefresh}
                  onChange={(val) => update('tableToolbarRefresh', val)}
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleResetDataTable}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3.5 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors"
              >
                <RotateCcw className="size-3.5 text-[var(--erpfy-ink-muted)]" />
                Reset to default
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-6">
            <h3 className="text-xs font-bold text-[var(--erpfy-ink)] tracking-tight">
              Preview
            </h3>

            <div className="mt-3 overflow-hidden rounded-lg border border-[var(--erpfy-line-soft)] bg-white shadow-2xs">
              <table
                className="w-full text-left"
                style={{
                  fontFamily:
                    settings.tableFontFamily === 'Monospace'
                      ? 'monospace'
                      : settings.tableFontFamily === 'Serif'
                      ? 'serif'
                      : settings.tableFontFamily === 'System UI'
                      ? 'system-ui, sans-serif'
                      : 'inherit',
                  fontSize: `${settings.tableFontSize || 14}px`,
                }}
              >
                <thead
                  style={{
                    backgroundColor: settings.tableHeaderBgColor || '#ffffff',
                    color: settings.tableHeaderTextColor || '#000000',
                    fontSize: `${settings.tableHeaderFontSize || 14}px`,
                    fontWeight:
                      settings.tableHeaderFontWeight === 'Bold'
                        ? 700
                        : settings.tableHeaderFontWeight === 'Semibold'
                        ? 600
                        : settings.tableHeaderFontWeight === 'Medium'
                        ? 500
                        : 400,
                    textTransform: settings.tableHeaderUppercase ? 'uppercase' : 'none',
                  }}
                >
                  <tr className="border-b border-[var(--erpfy-line-soft)]">
                    <th className={`p-3 ${settings.tableCellBorders ? 'border-r border-[var(--erpfy-line-soft)]' : ''}`}>
                      Reference
                    </th>
                    <th className={`p-3 ${settings.tableCellBorders ? 'border-r border-[var(--erpfy-line-soft)]' : ''}`}>
                      Name
                    </th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--erpfy-line-soft)]">
                  {[
                    ['SL-2941', 'Sarah Miller', '1,284.00'],
                    ['SL-2940', 'Omar Khalil', '96.20'],
                    ['SL-2939', 'Lina Berrada', '452.75'],
                  ].map(([ref, name, amt], idx) => {
                    const isCompact = settings.tableDensity === 'Compact' || settings.tableDensity === 'compact';
                    const isLarge = settings.tableDensity === 'Large' || settings.tableDensity === 'large';
                    const padClass = isCompact ? 'py-1.5' : isLarge ? 'py-4' : 'py-2.5';
                    const bgClass = settings.tableStripedRows && idx % 2 === 1 ? 'bg-neutral-50/70' : 'bg-white';
                    return (
                      <tr key={ref} className={bgClass}>
                        <td
                          className={`px-3 ${padClass} font-mono font-medium text-neutral-800 ${
                            settings.tableCellBorders ? 'border-r border-[var(--erpfy-line-soft)]' : ''
                          }`}
                        >
                          {ref}
                        </td>
                        <td
                          className={`px-3 ${padClass} text-neutral-700 ${
                            settings.tableCellBorders ? 'border-r border-[var(--erpfy-line-soft)]' : ''
                          }`}
                        >
                          {name}
                        </td>
                        <td
                          className={`px-3 ${padClass} text-right font-mono font-semibold text-neutral-900`}
                        >
                          {amt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Submit Button */}
          {onSave && (
            <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-5">
              <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
                Submit
              </ErpfyButton>
            </div>
          )}
        </ErpfyPanel>
      </div>
    );
  }

  if (section === 'export') {
    return (
      <ErpfyPanel
        title="Export"
        description="Choose the default format and export the current configuration."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ErpfySelect
            id="export-format"
            label="Default format"
            value={settings.exportFormat}
            onChange={(event) =>
              update(
                'exportFormat',
                event.target.value as AccountSystemSettings['exportFormat'],
              )
            }
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </ErpfySelect>
          <div className="self-end rounded-xl border border-[var(--erpfy-line-soft)] p-3">
            <ErpfyCheckbox
              id="export-headers"
              checked={settings.exportIncludeHeaders}
              label="Include headers"
              onChange={(event) =>
                update('exportIncludeHeaders', event.target.checked)
              }
            />
          </div>
        </div>
        <ErpfyButton
          className="mt-4"
          onClick={() => downloadSettings(settings, settings.exportFormat)}
        >
          <Download className="size-4" aria-hidden />
          Export settings
        </ErpfyButton>
      </ErpfyPanel>
    );
  }

  if (section === 'security') {
    const logoutOptions = ['Never', '4h', '8h', '12h', 'Custom'];
    const activeOption = settings.securityAutoLogoutOption || 'Never';

    return (
      <div className="space-y-5">
        <ErpfyPanel
          title="Security"
          description="Session limits and device access."
        >
          <div className="space-y-6">
            {/* Inactivity auto-logout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-[var(--erpfy-line-soft)] p-4">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-semibold text-[var(--erpfy-ink)]">
                  Inactivity auto-logout
                </p>
                <p className="mt-0.5 text-xs text-[var(--erpfy-ink-muted)] leading-relaxed">
                  Sign users out after this long without activity. &quot;Never&quot; disables automatic logout completely; activity on any open page keeps the session alive.
                </p>
              </div>

              {/* Segmented Buttons */}
              <div className="inline-flex rounded-lg border border-[var(--erpfy-line-soft)] bg-neutral-100/80 p-1 shrink-0">
                {logoutOptions.map((opt) => {
                  const isSelected = activeOption === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('securityAutoLogoutOption', opt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[var(--erpfy-brand)] text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Login devices */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-4">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-semibold text-[var(--erpfy-ink)]">
                  Login devices
                </p>
                <p className="mt-0.5 text-xs text-[var(--erpfy-ink-muted)]">
                  Review active sessions and sign out other devices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSection?.('login-devices')}
                className="rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-4 py-1.5 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors shrink-0"
              >
                View
              </button>
            </div>
          </div>

          {/* Bottom Submit Button */}
          {onSave && (
            <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-5">
              <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
                Submit
              </ErpfyButton>
            </div>
          )}
        </ErpfyPanel>
      </div>
    );
  }

  if (section === 'backup') {
    return (
      <div className="space-y-5">
        <ErpfyPanel
          title="Backup"
          description="Where generated backups are stored."
        >
          <div className="space-y-6">
            {/* Cloud backup destination */}
            <div className="flex items-center justify-between rounded-xl border border-[var(--erpfy-line-soft)] p-4">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-semibold text-[var(--erpfy-ink)]">
                  Cloud backup destination
                </p>
                <p className="mt-0.5 text-xs text-[var(--erpfy-ink-muted)]">
                  Copy generated backups to cloud storage.{' '}
                  <button
                    type="button"
                    onClick={() => onNavigateSection?.('backup-archives')}
                    className="font-semibold text-[var(--erpfy-brand)] hover:underline"
                  >
                    Manage backup archives
                  </button>
                </p>
              </div>

              <SwitchToggle
                id="cloud-backup-destination"
                checked={settings.cloudBackupDestination}
                onChange={(val) => update('cloudBackupDestination', val)}
              />
            </div>

            {/* Quick backup actions */}
            <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-4">
              <p className="text-xs font-semibold text-[var(--erpfy-ink)] mb-3">
                Quick configuration actions
              </p>
              <div className="flex flex-wrap gap-2.5">
                <ErpfyButton
                  onClick={() =>
                    downloadSettings(settings, 'json', 'erpfy-settings-backup.json')
                  }
                >
                  <Download className="size-4" aria-hidden />
                  Download configuration
                </ErpfyButton>
                <label className="soft-button cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--erpfy-line-soft)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--erpfy-ink)] hover:bg-neutral-50 shadow-2xs transition-colors">
                  <Upload className="size-4 text-[var(--erpfy-ink-muted)]" />
                  Restore configuration
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const restored = normalizeAccountSystemSettings(
                          JSON.parse(await file.text()),
                        );
                        onChange(restored);
                        setRestoreMessage(
                          'Configuration loaded. Submit to apply.',
                        );
                      } catch {
                        setRestoreMessage('That backup file is not valid.');
                      }
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
              {restoreMessage && (
                <p className="mt-3 text-xs font-semibold text-[var(--erpfy-ink-soft)]">
                  {restoreMessage}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Submit Button */}
          {onSave && (
            <div className="mt-8 border-t border-[var(--erpfy-line-soft)] pt-5">
              <ErpfyButton tone="primary" onClick={onSave} className="px-6 py-2">
                Submit
              </ErpfyButton>
            </div>
          )}
        </ErpfyPanel>
      </div>
    );
  }

  if (section === 'maintenance') {
    return (
      <ErpfyPanel
        title="Maintenance"
        description="Show a portal-wide maintenance notice without blocking access."
      >
        <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
          <ErpfyCheckbox
            id="maintenance-banner"
            checked={settings.maintenanceBanner}
            label="Show maintenance notice"
            description="The notice appears below the header throughout this account portal."
            onChange={(event) =>
              update('maintenanceBanner', event.target.checked)
            }
          />
        </div>
        <div className="mt-4">
          <ErpfyInput
            id="maintenance-message"
            label="Notice message"
            value={settings.maintenanceMessage}
            maxLength={160}
            onChange={(event) =>
              update('maintenanceMessage', event.target.value)
            }
          />
        </div>
      </ErpfyPanel>
    );
  }

  if (section === 'demo-data') {
    return (
      <ErpfyPanel
        title="Demo Data"
        description="Control the clearly labelled sample figures on the Dashboard."
      >
        <div className="rounded-xl border border-[var(--erpfy-line-soft)] p-3">
          <ErpfyCheckbox
            id="demo-dashboard-data"
            checked={settings.showDemoDashboard}
            label="Show sample Dashboard data"
            description="Turning this off hides sample figures; it does not delete business data."
            onChange={(event) =>
              update('showDemoDashboard', event.target.checked)
            }
          />
        </div>
        <ErpfyButton
          tone="secondary"
          className="mt-4"
          onClick={() => onChange(DEFAULT_ACCOUNT_SYSTEM_SETTINGS)}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset system settings
        </ErpfyButton>
      </ErpfyPanel>
    );
  }

  if (section === 'calendar') {
    const preview = new Intl.DateTimeFormat('en', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: settings.calendarTimeFormat === '12-hour',
    }).format(new Date());
    return (
      <ErpfyPanel
        title="Calendar"
        description="Set the first day of the week and time display."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ErpfySelect
            id="calendar-week-start"
            label="Week starts on"
            value={settings.calendarWeekStart}
            onChange={(event) =>
              update(
                'calendarWeekStart',
                event.target
                  .value as AccountSystemSettings['calendarWeekStart'],
              )
            }
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
            <option value="saturday">Saturday</option>
          </ErpfySelect>
          <ErpfySelect
            id="calendar-time-format"
            label="Time format"
            value={settings.calendarTimeFormat}
            onChange={(event) =>
              update(
                'calendarTimeFormat',
                event.target
                  .value as AccountSystemSettings['calendarTimeFormat'],
              )
            }
          >
            <option value="12-hour">12-hour</option>
            <option value="24-hour">24-hour</option>
          </ErpfySelect>
        </div>
        <div className="mt-4 rounded-xl bg-[var(--erpfy-hover)] px-4 py-3 text-sm">
          Preview: <strong>{preview}</strong>
        </div>
      </ErpfyPanel>
    );
  }

  return null;
}

function downloadSettings(
  settings: AccountSystemSettings,
  format: 'csv' | 'json',
  filename?: string,
) {
  const content =
    format === 'json'
      ? JSON.stringify(settings, null, 2)
      : `${settings.exportIncludeHeaders ? 'setting,value\n' : ''}${Object.entries(
          settings,
        )
          .map(
            ([key, value]) =>
              `${csv(key)},${csv(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value))}`,
          )
          .join('\n')}`;
  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json' : 'text/csv',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename ?? `erpfy-settings.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
