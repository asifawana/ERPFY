/**
 * ERPFY Admin Navigation Registry
 *
 * Equivalent to wp-admin/menu.php in WordPress.
 * Generates the sidebar navigation structure, merging core workspace links
 * with dynamic plugin navigation items.
 */

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  section?: 'main' | 'apps' | 'system' | 'settings';
  permission?: string;
}

export const CORE_ADMIN_NAVIGATION: AdminNavItem[] = [
  { id: 'dashboard', label: 'My ERPs', href: '/', section: 'main' },
  { id: 'app-store', label: 'App Store', href: '/account/app-store', section: 'apps' },
  { id: 'settings', label: 'Settings', href: '/account/settings', section: 'settings' },
];

export function getCoreAdminNavigation(): AdminNavItem[] {
  return CORE_ADMIN_NAVIGATION;
}
