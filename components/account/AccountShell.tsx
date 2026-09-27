'use client';

/**
 * ACC-000 — Personal Account shell.
 * Authority: ERPFY-MASTER-PLAN.md sections 28B, 31, 41. Design: DESIGN.md v1.6.
 *
 * Shared account and company shell. Business navigation comes only from the
 * server-authorized contributions of active installed apps.
 */

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  LogOut,
  Menu,
  Search,
  Settings,
  Home,
  Package,
  ClipboardList,
  Users,
  ChartColumn,
  Store,
  Code,
  User,
  Sun,
  Moon,
  CircleDot,
  Mail,
  Star,
  ArrowUpRight,
  Plus,
  DollarSign,
  FileText,
  Landmark,
  Scale,
  Receipt,
  FileSpreadsheet,
  Layers,
  Shield,
  Briefcase,
  PieChart,
  Wallet,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useAccountSystemSettings } from '@/lib/account-system-settings';
import type { DynamicSidebarNavItem } from '@/lib/eap/installation';
import type { CategoryModule } from '@/lib/content/category-plugins';
import type { CompanyContext } from '@/lib/core/page-data';
import type { CompanyAccess } from '@/lib/core/company';
import { ErpfyIconButton } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { HeaderAppearance } from './HeaderAppearance';
import { HeaderFullscreen } from './HeaderFullscreen';
import { HeaderLanguagePicker } from './HeaderLanguagePicker';
import { HeaderNotifications } from './HeaderNotifications';
import { PageTransition } from '@/components/ui/PageTransition';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Building2;
  id?: string;
  /**
   * An App that is not built yet. Section 39 forbids presenting an unreleased business App
   * as working, so these are shown — the design calls for them — and left disabled with a
   * `Soon` marker rather than pointed at a page that does not exist.
   */
  soon?: boolean;
  /** A count beside the label, from the sample data while there is no real one. */
  count?: number;
};

const EMPTY_PLUGIN_NAV: DynamicSidebarNavItem[] = [];

const DYNAMIC_NAV_ICONS: Record<string, typeof Building2> = {
  Building2,
  DollarSign,
  FileText,
  Package,
  ClipboardList,
  Users,
  ChartColumn,
  Store,
  Settings,
  Code,
  Shield,
  Briefcase,
  PieChart,
  Landmark,
  Scale,
  Receipt,
  FileSpreadsheet,
  Layers,
  Wallet,
  Calculator,
  Home,
  Star,
  Mail,
};

function resolveNavIcon(name?: string): typeof Building2 {
  if (!name) return Package;
  const match = DYNAMIC_NAV_ICONS[name];
  if (match) return match;
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, icon] of Object.entries(DYNAMIC_NAV_ICONS)) {
    if (key.toLowerCase() === lower) return icon;
  }
  return Package;
}

type NavGroup = { heading?: string; items: NavItem[] };

/** Core account tools remain available independently of installed business apps. */
const PERSONAL_NAV: NavGroup[] = [
  {
    items: [
      { href: '/account', label: 'Home', icon: Home },
      { href: '/account/invitations', label: 'Invitations', icon: Mail },
      { href: '/account/favorites', label: 'Favorites', icon: Star },
    ],
  },
];

const COMPANY_NAV = (companySlug: string): NavGroup[] => [
  {
    items: [
      { href: `/c/${companySlug}`, label: 'Dashboard', icon: Home },
    ],
  },
];

/**
 * Workspace management remains in the footer. Developer tools live in the profile menu.
 */
const RAIL_FOOTER_NAV: NavGroup[] = [
  {
    items: [
      { href: '/account/app-store', label: 'App Store', icon: Store },
      { href: '/account/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function AccountNav({
  groups,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const activePendingHref = pendingHref !== pathname ? pendingHref : null;

  return (
    <nav aria-label="Workspace navigation" className={cn(collapsed && 'flex flex-col items-center')}>
      {groups.map((group, index) => (
        <div key={group.heading ?? index} className={cn('w-full', collapsed && 'flex flex-col items-center')}>
          {group.heading && (
            collapsed ? (
              <div
                className="my-2.5 h-px w-7 bg-[var(--erpfy-line-soft)]"
                title={group.heading}
                aria-hidden
              />
            ) : (
              <p className="nav-section-label">{group.heading}</p>
            )
          )}
          <div className={cn('space-y-0.5', collapsed && 'w-full flex flex-col items-center space-y-1.5')}>
            {group.items.map((item) => {
              const active = !item.soon && pathname === item.href.split('?')[0];
              const pending = activePendingHref === item.href;
              const count = item.count ?? 0;

              const inner = (
                <>
                  <item.icon
                    className={cn(
                      'size-[18px] shrink-0 transition-transform duration-200 group-hover/item:scale-110',
                      (active || pending) &&
                        'text-[var(--erpfy-brand-soft-ink)]',
                    )}
                    aria-hidden
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && count > 0 && <span className="nav-count">{count}</span>}
                  {collapsed && count > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--erpfy-brand)] ring-1 ring-white"
                      title={`${count} items`}
                    />
                  )}
                  {pending && (
                    <span
                      className={cn(
                        'size-2 rounded-full bg-[var(--erpfy-brand)] animate-ping',
                        collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto',
                      )}
                    />
                  )}
                  {!collapsed && item.soon && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--erpfy-ink-faint)]">
                      Soon
                    </span>
                  )}
                </>
              );

              // A disabled button rather than a link: there is no page behind it, and a
              // link that goes nowhere is worse than one that plainly cannot be followed.
              return item.soon ? (
                <button
                  key={item.id || item.href || item.label}
                  type="button"
                  disabled
                  title={`${item.label} arrives with its App`}
                  className={cn(
                    'nav-item cursor-not-allowed text-left opacity-55',
                    collapsed ? 'nav-item-collapsed' : 'w-full',
                  )}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={item.id || item.href || item.label}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    if (item.href !== pathname) {
                      setPendingHref(item.href);
                    }
                    onNavigate?.();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'nav-item group/item relative',
                    collapsed ? 'nav-item-collapsed' : '',
                    active && 'active',
                    pending && 'bg-white/80 text-[var(--erpfy-brand-soft-ink)]',
                  )}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AccountShell({
  displayName,
  email,
  company,
  companies = [],
  wide = false,
  initialPluginNavigation = EMPTY_PLUGIN_NAV,
  children,
}: {
  displayName: string;
  email: string;
  company: CompanyContext | null;
  companies?: CompanyAccess[];
  /** Dashboards need the room; reading screens are easier at a narrower measure. */
  wide?: boolean;
  initialPluginNavigation?: DynamicSidebarNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isOverlayRoute =
    pathname === '/account/settings' ||
    pathname === '/account/app-store' ||
    pathname === '/account/developer';
  const navigationPathname = isOverlayRoute ? '/account' : pathname;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('erpfy_sidebar_collapsed') === 'true';
      } catch {}
    }
    return false;
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('erpfy_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('erpfy_theme_mode') as
          | 'light'
          | 'dark'
          | 'auto'
          | null;
        if (saved && ['light', 'dark', 'auto'].includes(saved)) return saved;
      } catch {}
    }
    return 'light';
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('erpfy_user_avatar') || null; } catch { return null; }
    }
    return null;
  });
  const systemSettings = useAccountSystemSettings(company?.id ?? null);
  const companyName =
    systemSettings.companyName.trim() || company?.name || 'ERPFY';
  const companyInitials =
    company?.initials ||
    companyName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Sync avatar from localStorage and react to profile-page uploads in real-time
  useEffect(() => {
    const sync = () => {
      try {
        setHeaderAvatarUrl(localStorage.getItem('erpfy_user_avatar') || null);
      } catch { /* ignore */ }
    };
    const onAvatarEvent = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      setHeaderAvatarUrl(url || null);
    };
    sync();
    window.addEventListener('erpfy:avatar-updated', onAvatarEvent);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('erpfy:avatar-updated', onAvatarEvent);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function handleThemeModeChange(mode: 'light' | 'dark' | 'auto') {
    setThemeMode(mode);
    try {
      localStorage.setItem('erpfy_theme_mode', mode);
    } catch {}

    if (mode === 'dark') {
      document.documentElement.setAttribute('data-erpfy-dark', 'on');
    } else if (mode === 'light') {
      document.documentElement.removeAttribute('data-erpfy-dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-erpfy-dark', 'on');
      } else {
        document.documentElement.removeAttribute('data-erpfy-dark');
      }
    }
  }

  useEffect(() => {
    if (themeMode !== 'auto') return;

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (event: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.toggleAttribute(
        'data-erpfy-dark',
        event.matches,
      );
      if (event.matches) {
        document.documentElement.setAttribute('data-erpfy-dark', 'on');
      }
    };

    applySystemTheme(systemTheme);
    systemTheme.addEventListener('change', applySystemTheme);
    return () => systemTheme.removeEventListener('change', applySystemTheme);
  }, [themeMode]);

  const isCompanyWorkspace = Boolean(company && company.slug);

  const companyKey = company ? `${company.id}:${company.slug}` : '';
  const companyQuery = company ? `?company=${encodeURIComponent(company.slug)}` : '';
  const [navigationSnapshot, setNavigationSnapshot] = useState({
    companyKey,
    seed: initialPluginNavigation,
    items: initialPluginNavigation,
  });
  // Never carry another company's menu into the first render after switching.
  const pluginNavItems = !isCompanyWorkspace
    ? EMPTY_PLUGIN_NAV
    : navigationSnapshot.companyKey === companyKey &&
        navigationSnapshot.seed === initialPluginNavigation
      ? navigationSnapshot.items
      : initialPluginNavigation;

  /* ---- Category modules: industry-driven navigation items ---- */
  const [categoryModules, setCategoryModules] = useState<CategoryModule[]>([]);
  const [_categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!isCompanyWorkspace || !company?.id) {
      setCategoryModules([]);
      setCategoryName('');
      return;
    }

    let cancelled = false;
    const companyId = company.id;

    async function loadCategoryModules() {
      try {
        const res = await fetch(
          `/api/apps/category-modules?companyId=${encodeURIComponent(companyId)}`,
          { headers: { accept: 'application/json' }, cache: 'no-store' },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          modules?: CategoryModule[];
          categoryName?: string;
        };
        if (cancelled) return;
        setCategoryModules(Array.isArray(data.modules) ? data.modules : []);
        setCategoryName(data.categoryName ?? '');
      } catch {
        if (!cancelled) {
          setCategoryModules([]);
          setCategoryName('');
        }
      }
    }

    void loadCategoryModules();

    // Reload when apps change (module toggle may have changed)
    const onModulesChanged = (event: Event) => {
      if ((event as CustomEvent<{ companyId?: string }>).detail?.companyId !== companyId) return;
      void loadCategoryModules();
    };
    window.addEventListener('erpfy:apps-changed', onModulesChanged);
    window.addEventListener('erpfy:modules-changed', onModulesChanged);

    return () => {
      cancelled = true;
      window.removeEventListener('erpfy:apps-changed', onModulesChanged);
      window.removeEventListener('erpfy:modules-changed', onModulesChanged);
    };
  }, [isCompanyWorkspace, company?.id]);

  useEffect(() => {
    if (!isCompanyWorkspace || !company?.id) {
      return;
    }

    let cancelled = false;
    const companyId = company.id;
    let requestNumber = 0;

    async function loadDynamicNav() {
      const thisRequest = ++requestNumber;
      const update = (items: DynamicSidebarNavItem[]) => {
        if (!cancelled && thisRequest === requestNumber) {
          setNavigationSnapshot({ companyKey, seed: initialPluginNavigation, items });
        }
      };
      try {
        const res = await fetch(
          `/api/apps/navigation?companyId=${encodeURIComponent(companyId)}`,
          { headers: { accept: 'application/json' }, cache: 'no-store' },
        );
        if (!res.ok) {
          update([]);
          return;
        }
        const data = (await res.json()) as { navigation?: DynamicSidebarNavItem[] };
        update(Array.isArray(data.navigation) ? data.navigation : []);
      } catch {
        update([]);
      }
    }

    const refreshNavigation = () => { void loadDynamicNav(); };
    const onAppsChanged = (event: Event) => {
      if ((event as CustomEvent<{ companyId?: string }>).detail?.companyId !== companyId) return;
      setNavigationSnapshot({ companyKey, seed: initialPluginNavigation, items: [] });
      refreshNavigation();
    };
    // If initialPluginNavigation was already provided from the server for this company, use it without re-fetching immediately.
    if (!initialPluginNavigation || initialPluginNavigation.length === 0) {
      void loadDynamicNav();
    }
    window.addEventListener('erpfy:apps-changed', onAppsChanged);

    return () => {
      cancelled = true;
      window.removeEventListener('erpfy:apps-changed', onAppsChanged);
    };
  }, [isCompanyWorkspace, company?.id, companyKey, initialPluginNavigation]);

  const activeRailNav = (() => {
    if (isCompanyWorkspace && company?.slug) {
      const base = COMPANY_NAV(company.slug);

      /* ---- Category modules (industry-driven) ---- */
      const categoryGroups: NavGroup[] = [];
      if (categoryModules.length > 0) {
        // Group category modules by their group heading
        const catGrouped = new Map<string, NavItem[]>();
        // Preserve insertion order to maintain the module sequence from the plugin
        for (const mod of categoryModules) {
          // Skip dashboard — it is already in COMPANY_NAV base
          if (mod.id === 'dashboard') continue;
          const groupName = mod.group?.trim() || 'Modules';
          if (!catGrouped.has(groupName)) {
            catGrouped.set(groupName, []);
          }
          catGrouped.get(groupName)!.push({
            href: mod.href,
            label: mod.label,
            icon: resolveNavIcon(mod.icon),
            id: `cat:${mod.id}`,
            soon: mod.soon,
          });
        }
        // Ordered group output: preserve plugin-defined order
        for (const [groupName, items] of catGrouped.entries()) {
          categoryGroups.push({
            heading: groupName,
            items,
          });
        }
      }

      /* ---- EAP plugin items ---- */
      const mainItems = pluginNavItems.filter((i) => i.position !== 'footer');
      const pluginGroups: NavGroup[] = [];
      if (mainItems.length > 0) {
        const grouped = new Map<string, NavItem[]>();
        for (const item of mainItems) {
          const groupName = item.group?.trim() || 'Apps';
          if (!grouped.has(groupName)) {
            grouped.set(groupName, []);
          }
          grouped.get(groupName)!.push({
            href: item.href,
            label: item.label,
            icon: resolveNavIcon(item.icon),
            id: item.id,
          });
        }

        // If Finance group exists, place it first for logical structure
        if (grouped.has('Finance')) {
          pluginGroups.push({
            heading: 'Finance',
            items: grouped.get('Finance')!,
          });
        }
        for (const [groupName, items] of grouped.entries()) {
          if (groupName === 'Finance') continue;
          pluginGroups.push({
            heading: groupName,
            items,
          });
        }
      }

      return [...base, ...categoryGroups, ...pluginGroups];
    }
    return PERSONAL_NAV;
  })();

  const visibleRailNav = useMemo(
    () => {
      const orderList = systemSettings.sidebarMenuOrder;
      const orderMap =
        Array.isArray(orderList) && orderList.length > 0
          ? new Map(
              orderList.map((name, idx) => [name.toLowerCase().trim(), idx]),
            )
          : null;

      const processedGroups = activeRailNav
        .map((group) => {
          const filtered = group.items.filter((item) => {
            if (item.label === 'Dashboard')
              return systemSettings.sidebarDashboard;
            if (item.label === 'Products') return systemSettings.sidebarProducts;
            if (item.label === 'Orders') return systemSettings.sidebarOrders;
            if (item.label === 'Customers')
              return systemSettings.sidebarCustomers;
            if (item.label === 'Analytics')
              return systemSettings.sidebarAnalytics;
            return true;
          });

          if (!orderMap) return { ...group, items: filtered };

          const sorted = [...filtered].sort((a, b) => {
            const idA = a.id ? a.id.toLowerCase().trim() : '';
            const idB = b.id ? b.id.toLowerCase().trim() : '';
            const labelA = a.label.toLowerCase().trim();
            const labelB = b.label.toLowerCase().trim();

            const idxA = (idA && orderMap.get(idA) !== undefined)
              ? orderMap.get(idA)!
              : (orderMap.get(labelA) ?? 9999);
            const idxB = (idB && orderMap.get(idB) !== undefined)
              ? orderMap.get(idB)!
              : (orderMap.get(labelB) ?? 9999);

            return idxA - idxB;
          });

          return { ...group, items: sorted };
        })
        .filter((group) => group.items.length > 0);

      if (!orderMap) return processedGroups;

      return [...processedGroups].sort((gA, gB) => {
        const keyA = (gA.heading || 'dashboard').toLowerCase().trim();
        const keyB = (gB.heading || 'dashboard').toLowerCase().trim();
        const idxA = orderMap.get(keyA) ?? (gA.heading ? 500 : 0);
        const idxB = orderMap.get(keyB) ?? (gB.heading ? 500 : 0);
        return idxA - idxB;
      });
    },
    [activeRailNav, systemSettings],
  );

  const activeFooterNav = useMemo(() => {
    const coreFooter = RAIL_FOOTER_NAV.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, href: `${item.href}${companyQuery}` })),
    }));
    const footerPluginItems = pluginNavItems.filter((i) => i.position === 'footer');
    if (footerPluginItems.length === 0) return coreFooter;
    const additionalItems: NavItem[] = footerPluginItems.map((item) => ({
      href: item.href,
      label: item.label,
      icon: resolveNavIcon(item.icon),
      id: item.id,
    }));
    return [
      ...coreFooter,
      {
        heading: 'Extensions',
        items: additionalItems,
      },
    ];
  }, [pluginNavItems, companyQuery]);

  const visibleFooterNav = useMemo(
    () =>
      activeFooterNav.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label !== 'App Store' || systemSettings.sidebarAppStore,
        ),
      })).filter((group) => group.items.length > 0),
    [activeFooterNav, systemSettings.sidebarAppStore],
  );

  const searchItems = [
    ...visibleRailNav.flatMap((group) => group.items),
    ...visibleFooterNav.flatMap((group) => group.items),
    ...PERSONAL_NAV.flatMap((group) => group.items),
    { href: '/account/profile', label: 'Profile', icon: User },
    { href: '/account/developer', label: 'Developer', icon: Code },
  ].filter((item, index, items) => items.findIndex((other) => other.href === item.href) === index);
  const searchCategories = isCompanyWorkspace
    ? ['Apps', 'Workspaces', 'Invitations', 'Account']
    : ['Workspaces', 'Invitations', 'Account'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setDrawerOpen(false);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let animId: number;
    if (drawerOpen) {
      animId = requestAnimationFrame(() => {
        setDrawerOpen(false);
      });
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [pathname, drawerOpen]);

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  useEffect(() => {
    const minutes = systemSettings.securityAutoLockMinutes;
    if (!minutes) return;
    let timeout = 0;
    const signOut = () => {
      void fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }).finally(() => {
        router.push('/login');
        router.refresh();
      });
    };
    const restart = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(signOut, minutes * 60_000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((event) =>
      window.addEventListener(event, restart, { passive: true }),
    );
    restart();
    return () => {
      window.clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, restart));
    };
  }, [router, systemSettings.securityAutoLockMinutes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="admin-surface flex h-screen flex-col overflow-hidden bg-[var(--erpfy-canvas)] text-[var(--erpfy-ink)]">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:p-2 focus:text-black"
      >
        Skip to content
      </a>
      <header className="z-[48] flex h-[56px] shrink-0 items-center bg-[var(--erpfy-topbar)] px-4 text-white md:px-5">
        <div className="flex shrink-0 items-center gap-2.5 md:w-[240px]">
          <ErpfyIconButton
            label="Open navigation"
            onDark
            className="text-white md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </ErpfyIconButton>
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="hidden size-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white md:flex"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar (show icons only)'}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </button>
          <Link
            href="/account"
            className="hidden sm:flex items-center gap-2"
            aria-label="ERPFY personal account"
          >
            <span
              className="grid size-7 place-items-center rounded-lg bg-[var(--erpfy-accent)] text-[13px] font-extrabold text-[var(--erpfy-accent-ink)]"
              aria-hidden
            >
              E
            </span>
            <span className="hidden sm:inline text-[17px] font-bold tracking-[-0.04em]">
              ERPFY
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search admin"
          className="mx-3 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/20 bg-black/20 px-3 text-left text-sm text-white/70 transition hover:bg-black/30 md:absolute md:left-1/2 md:mx-0 md:w-[calc(100%-580px)] md:max-w-[520px] md:-translate-x-1/2"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Search</span>
          <kbd className="ml-auto hidden rounded border border-white/15 px-1 text-xs text-white/60 sm:block">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:justify-end">
          {/* Fullscreen Toggle Button */}
          <HeaderFullscreen />

          {/* Notifications Button & Popover */}
          <HeaderNotifications companyName={companyName} />

          <HeaderAppearance />

          {systemSettings.showLanguages && (
            <HeaderLanguagePicker
              defaultLang={systemSettings.defaultLanguage}
            />
          )}

          {/* User Icon with Circular Avatar & Popover Menu */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-label="Account menu"
              title={displayName || email}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white/90 shadow-xs transition-all hover:bg-black/35 hover:scale-105 hover:text-white active:scale-95 focus:outline-hidden',
                menuOpen && 'ring-2 ring-white/40 bg-black/35',
              )}
            >
              {headerAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headerAvatarUrl}
                  alt={displayName || email}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-white">
                  {(displayName || email || 'A')[0]?.toUpperCase()}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] p-2 text-left text-[var(--erpfy-ink)] shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-100"
                role="menu"
                aria-orientation="vertical"
              >
                {/* User Info Header */}
                <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
                  {headerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={headerAvatarUrl}
                      alt={displayName || email}
                      className="size-8 shrink-0 rounded-full object-cover ring-2 ring-[var(--erpfy-brand-line)]"
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--erpfy-brand)] text-xs font-bold text-[var(--erpfy-brand-on)]">
                      {(displayName || email || '?')[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--erpfy-ink-strong)]">
                      {displayName || email}
                    </p>
                    <p className="truncate text-[11px] text-[var(--erpfy-ink-muted)]">
                      {email}
                    </p>
                  </div>
                </div>

                <div className="my-1 border-t border-[var(--erpfy-line-soft)]" />

                {/* My ERP Workspaces — Switch and Open ERP */}
                <div className="py-1">
                  <div className="flex items-center justify-between px-2.5 py-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                      Your ERP Workspaces ({companies.length})
                    </p>
                    <Link
                      href="/account/create"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-[var(--erpfy-brand)] hover:underline"
                    >
                      <Plus className="size-3" />
                      <span>New ERP</span>
                    </Link>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 px-1 py-0.5">
                    {companies.length > 0 ? (
                      companies.map((comp) => {
                        const isCurrent =
                          company?.id === comp.id ||
                          (company?.slug && company.slug === comp.slug);

                        let compLogo: string | null = null;
                        if (isCurrent) {
                          compLogo = systemSettings.companyLogoDataUrl || headerAvatarUrl;
                        }
                        if (!compLogo && typeof window !== 'undefined') {
                          try {
                            compLogo =
                              localStorage.getItem(`erpfy_logo_${comp.id}`) ||
                              localStorage.getItem(`erpfy_logo_${comp.slug}`) ||
                              null;
                          } catch {}
                        }

                        return (
                          <Link
                            key={comp.id}
                            href={`/c/${comp.slug}`}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              'group flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 transition-all',
                              isCurrent
                                ? 'active-workspace-card bg-[var(--erpfy-brand-soft)] border border-[var(--erpfy-brand-line)] dark:bg-[var(--erpfy-brand)]/20 dark:border-[var(--erpfy-brand)]/40 hover:bg-[var(--erpfy-brand-soft)]/90 dark:hover:bg-[var(--erpfy-brand)]/30'
                                : 'hover:bg-[var(--erpfy-hover)] border border-transparent',
                            )}
                            title={`Switch to and run ${comp.name}`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              {/* Circular Icon Shape or Logo */}
                              {compLogo && compLogo.length > 10 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={compLogo}
                                  alt={comp.name}
                                  className="size-8 shrink-0 rounded-full object-cover shadow-2xs ring-1 ring-black/10 dark:ring-white/20 transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--erpfy-brand)] text-xs font-bold text-[var(--erpfy-brand-on)] shadow-2xs transition-transform group-hover:scale-105">
                                  {comp.name[0]?.toUpperCase()}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-xs font-semibold text-[var(--erpfy-ink-strong)] group-hover:text-[var(--erpfy-brand)] dark:group-hover:text-[var(--erpfy-brand-soft-ink)]">
                                    {comp.name}
                                  </p>
                                </div>
                                <p className="truncate text-[10px] text-[var(--erpfy-ink-muted)]">
                                  {comp.role} · {comp.state === 'trial' ? `${comp.trialDaysLeft}d left` : comp.state}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              {isCurrent ? (
                                <span className="rounded-full bg-[var(--erpfy-brand)]/15 px-2 py-0.5 text-[9px] font-bold text-[var(--erpfy-brand-soft-ink)] dark:bg-[var(--erpfy-brand)]/30 dark:text-[var(--erpfy-brand-soft-ink)]">
                                  Active
                                </span>
                              ) : (
                                <ArrowUpRight
                                  className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[var(--erpfy-brand)]"
                                  aria-hidden
                                />
                              )}
                            </div>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="py-3 text-center text-xs text-[var(--erpfy-ink-muted)]">
                        No ERP workspaces found.
                      </div>
                    )}
                  </div>
                </div>

                <div className="my-1 border-t border-[var(--erpfy-line-soft)]" />

                {/* Profile Option */}
                <Link
                  href="/account/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--erpfy-ink)] transition-colors hover:bg-[var(--erpfy-hover)]"
                >
                  <User className="size-4 text-[var(--erpfy-ink-muted)]" aria-hidden />
                  <span>Profile</span>
                </Link>

                {/* Settings Option */}
                <Link
                  href={`/account/settings${companyQuery}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--erpfy-ink)] transition-colors hover:bg-[var(--erpfy-hover)]"
                >
                  <Settings className="size-4 text-[var(--erpfy-ink-muted)]" aria-hidden />
                  <span>Settings</span>
                </Link>

                <Link
                  href="/account/developer"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--erpfy-ink)] transition-colors hover:bg-[var(--erpfy-hover)]"
                >
                  <Code
                    className="size-4 text-[var(--erpfy-ink-muted)]"
                    aria-hidden
                  />
                  <span>Developer</span>
                </Link>

                <div className="my-1 border-t border-[var(--erpfy-line-soft)]" />

                {/* Appearance Section */}
                <div className="px-2.5 py-1.5">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--erpfy-ink-muted)]">
                    Appearance
                  </p>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--erpfy-hover)] p-1">
                    <button
                      type="button"
                      onClick={() => handleThemeModeChange('light')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition',
                        themeMode === 'light'
                          ? 'bg-[var(--erpfy-surface)] text-[var(--erpfy-ink-strong)] shadow-xs'
                          : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink-strong)]',
                      )}
                    >
                      <Sun className="size-3.5" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThemeModeChange('dark')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition',
                        themeMode === 'dark'
                          ? 'bg-[var(--erpfy-surface)] text-[var(--erpfy-ink-strong)] shadow-xs'
                          : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink-strong)]',
                      )}
                    >
                      <Moon className="size-3.5" />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleThemeModeChange('auto')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition',
                        themeMode === 'auto'
                          ? 'bg-[var(--erpfy-surface)] text-[var(--erpfy-ink-strong)] shadow-xs'
                          : 'text-[var(--erpfy-ink-muted)] hover:text-[var(--erpfy-ink-strong)]',
                      )}
                    >
                      <CircleDot className="size-3.5" />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                <div className="my-1 border-t border-[var(--erpfy-line-soft)]" />

                {/* Log out */}
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() => void handleSignOut()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#DC2626] transition-colors hover:bg-[#FEE2E2]"
                >
                  <LogOut className="size-4 text-[#DC2626]" aria-hidden />
                  <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body area under topbar */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Persistent top-left canvas/sidebar rounded corner */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-30 size-[14px]"
        >
          <svg
            viewBox="0 0 14 14"
            className="size-[14px] block"
            aria-hidden="true"
          >
            <path
              d="M 0 14 L 0 0 L 14 0 A 14 14 0 0 0 0 14 Z"
              fill="var(--erpfy-topbar)"
            />
          </svg>
        </div>

        {/* Persistent top-right canvas rounded corner so it stays round during scroll */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 z-30 size-[14px]"
        >
          <svg
            viewBox="0 0 14 14"
            className="size-[14px] block"
            aria-hidden="true"
          >
            <path
              d="M 0 0 L 14 0 L 14 14 A 14 14 0 0 0 0 0 Z"
              fill="var(--erpfy-topbar)"
            />
          </svg>
        </div>

        {/* Desktop Sidebar with Collapsible Rail and Blue Divider Handle */}
        <aside
          aria-label="Sidebar navigation"
          className={cn(
            'relative z-20 hidden shrink-0 flex-col rounded-tl-[14px] bg-[var(--erpfy-rail)] transition-[width,padding] duration-200 ease-in-out md:flex',
            sidebarCollapsed
              ? 'w-[64px] items-center px-1.5 pb-3 pt-3'
              : 'w-[240px] px-3 pb-3 pt-3',
          )}
        >
          {/* Inner scrollable navigation area */}
          <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col no-scrollbar">
            <CompanySidebarIdentity
              name={companyName}
              initials={companyInitials}
              logoDataUrl={systemSettings.companyLogoDataUrl || (headerAvatarUrl ?? '')}
              logoWidth={systemSettings.sidebarLogoWidth}
              logoHeight={systemSettings.sidebarLogoHeight}
              showLogo={systemSettings.showSidebarLogo}
              showName={systemSettings.showSidebarCompanyName}
              collapsed={sidebarCollapsed}
            />
            <AccountNav
              groups={visibleRailNav}
              pathname={navigationPathname}
              collapsed={sidebarCollapsed}
            />
            <div className="mt-auto pt-8">
              <AccountNav
                groups={visibleFooterNav}
                pathname={navigationPathname}
                collapsed={sidebarCollapsed}
              />
            </div>
          </div>

          {/* Interactive Splitter Divider & Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={handleToggleSidebar}
            title={sidebarCollapsed ? 'Click to expand sidebar' : 'Click to collapse sidebar (show icons only)'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="group/resizer absolute -right-[6px] top-0 bottom-0 z-30 flex w-[12px] cursor-pointer items-center justify-center p-0 border-0 bg-transparent select-none focus:outline-none"
          >
            {/* Splitter Toggle Button Handle (Neutral, no blue line) */}
            <div
              className={cn(
                'absolute top-14 z-40 flex size-5 items-center justify-center rounded-full border border-[var(--erpfy-line)] bg-[var(--erpfy-surface)] text-[var(--erpfy-ink-muted)] shadow-xs transition-all duration-150',
                'hover:scale-110 hover:text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-hover)] opacity-70 group-hover/resizer:opacity-100',
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="size-3 stroke-[2.5]" aria-hidden />
              ) : (
                <ChevronLeft className="size-3 stroke-[2.5]" aria-hidden />
              )}
            </div>
          </button>
        </aside>

        <main
          id="admin-content"
          className="relative flex flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--erpfy-canvas)] rounded-t-[14px] md:rounded-tl-none md:rounded-tr-[14px]"
        >
          {systemSettings.maintenanceBanner && (
            <div className="border-b border-[var(--erpfy-warn-ink)] bg-[var(--erpfy-warn-bg)] px-4 py-2 text-center text-sm font-semibold text-[var(--erpfy-warn-ink)]">
              {systemSettings.maintenanceMessage}
            </div>
          )}
          <div
            className={cn(
              'mx-auto w-full flex-1 px-4 py-6 md:px-8 md:py-7',
              wide ? 'max-w-[1680px]' : 'max-w-[1100px]',
            )}
          >
            <PageTransition>{children}</PageTransition>
          </div>
          <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[var(--erpfy-line-soft)] px-4 py-3 text-center text-xs text-[var(--erpfy-ink-muted)]">
            <span>
              {systemSettings.companyFooter.trim() ||
                `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}
            </span>
            {systemSettings.companyDevelopedBy.trim() && (
              <span>
                Developed by {systemSettings.companyDevelopedBy.trim()}
              </span>
            )}
          </footer>
        </main>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side={systemSettings.rtl ? 'right' : 'left'}
          className="admin-surface flex h-full flex-col overflow-y-auto bg-[var(--erpfy-rail)] p-3 md:hidden no-scrollbar"
          overlayClassName="md:hidden"
        >
          <SheetTitle className="sr-only">{companyName} navigation</SheetTitle>
          <CompanySidebarIdentity
            name={companyName}
            initials={companyInitials}
            logoDataUrl={systemSettings.companyLogoDataUrl || (headerAvatarUrl ?? '')}
            logoWidth={systemSettings.sidebarLogoWidth}
            logoHeight={systemSettings.sidebarLogoHeight}
            showLogo={systemSettings.showSidebarLogo}
            showName={systemSettings.showSidebarCompanyName}
          />
          <AccountNav
            groups={visibleRailNav}
            pathname={navigationPathname}
            onNavigate={() => setDrawerOpen(false)}
          />
          <div className="mt-auto pt-8">
            <AccountNav
              groups={visibleFooterNav}
              pathname={navigationPathname}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent
          className="admin-surface admin-search-dialog top-2 w-[648px] max-w-[calc(100%-1rem)] translate-y-0 gap-0 overflow-hidden p-2 shadow-2xl sm:max-w-[648px]"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Search admin</DialogTitle>
          <DialogDescription className="sr-only">
            Find account pages and actions.
          </DialogDescription>
          <Command className="bg-[var(--erpfy-surface)] text-[var(--erpfy-ink)]">
            <CommandInput
              placeholder="Search"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <div
              className="flex flex-wrap gap-2 px-1 pb-1 pt-3"
              aria-label="Search categories"
            >
              {searchCategories.map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={searchCategory === category}
                    onClick={() =>
                      setSearchCategory(
                        searchCategory === category ? null : category,
                      )
                    }
                    className="rounded-full bg-[var(--erpfy-hover)] px-3 py-1 text-xs font-medium leading-5 text-[var(--erpfy-ink-muted)] transition hover:bg-[var(--erpfy-line)] hover:text-[var(--erpfy-ink)] aria-pressed:bg-[var(--erpfy-brand)] aria-pressed:text-[var(--erpfy-brand-on)]"
                  >
                    {category}
                  </button>
                ),
              )}
            </div>
            <CommandList className="max-h-[min(400px,60vh)]">
              {!searchQuery.trim() && !searchCategory ? (
                <div className="flex min-h-[164px] flex-col items-center justify-center gap-4 pb-3 text-[var(--erpfy-ink)]">
                  <Search
                    className="size-10 text-[var(--erpfy-ink-muted)]"
                    strokeWidth={1.7}
                    aria-hidden
                  />
                  <p className="text-sm text-[var(--erpfy-ink-muted)]">Find pages and actions in ERPFY</p>
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-12">
                    No matching pages. Try another search or category.
                  </CommandEmpty>
                  <CommandGroup heading={searchCategory || 'Pages and actions'}>
                    {searchItems
                      .filter((item) => {
                        if (!searchCategory) return true;
                        const href = item.href.split('?')[0];
                        if (searchCategory === 'Apps') {
                          return pluginNavItems.some((nav) => nav.href === item.href);
                        }
                        if (searchCategory === 'Workspaces') {
                          return href === '/account' || href === '/account/favorites' || href === `/c/${company?.slug}`;
                        }
                        if (searchCategory === 'Invitations') return href === '/account/invitations';
                        return href === '/account/profile' || href === '/account/settings' || href === '/account/app-store' || href === '/account/developer';
                      })
                      .map((item) => (
                        <CommandItem
                          key={item.href}
                          value={`${item.label} ${item.href}`}
                          onSelect={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                            setSearchCategory(null);
                            router.push(item.href);
                          }}
                        >
                          <item.icon className="size-4" />
                          {item.label}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanySidebarIdentity({
  name,
  initials,
  logoDataUrl,
  logoWidth,
  logoHeight,
  showLogo,
  showName,
  collapsed = false,
}: {
  name: string;
  initials: string;
  logoDataUrl: string;
  logoWidth: number;
  logoHeight: number;
  showLogo: boolean;
  showName: boolean;
  collapsed?: boolean;
}) {
  if (!showLogo && !showName) return null;

  const rawSize = Math.min(96, Math.max(28, logoWidth, logoHeight));
  const size = collapsed ? 36 : rawSize;

  return (
    <div
      title={collapsed ? name : undefined}
      className={cn(
        'mb-3 flex items-center border-b border-[var(--erpfy-line-soft)] pb-3',
        collapsed ? 'justify-center px-0 min-h-10' : 'gap-3 min-h-12 px-2',
      )}
    >
      {showLogo &&
        (logoDataUrl ? (
          // Company logos are user-selected data URLs and cannot use Next's image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoDataUrl}
            alt={showName && !collapsed ? '' : `${name} logo`}
            className="shrink-0 rounded-full object-cover aspect-square shadow-2xs ring-1 ring-black/10 dark:ring-white/20"
            style={{
              width: size,
              height: size,
            }}
          />
        ) : (
          <span
            className="grid shrink-0 place-items-center rounded-full bg-[var(--erpfy-brand)] text-xs font-bold text-[var(--erpfy-brand-on)] shadow-2xs"
            style={{
              width: size,
              height: size,
            }}
            aria-hidden={showName && !collapsed}
          >
            {initials || 'E'}
          </span>
        ))}
      {!collapsed && showName && <p className="min-w-0 truncate text-sm font-bold">{name}</p>}
    </div>
  );
}
