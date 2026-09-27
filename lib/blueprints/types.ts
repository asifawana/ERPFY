/**
 * ERPfy.net — Business Category ERP Blueprint Types
 * Authority: ERPfy.net Complete Implementation Master Specification (§4, §5)
 */

export type BlueprintModuleConfig = {
  /** Stable unique identifier within the blueprint (e.g. 'products', 'imei', 'kot') */
  id: string;
  /** Human-readable sidebar label */
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Route pattern — `:slug` is replaced with the company slug at runtime */
  href: string;
  /** Sidebar group heading (e.g. 'Catalog', 'Operations', 'Sales', 'Finance') */
  group: string;
  /** Descriptive summary for settings and tooltips */
  description: string;
  /** When true, renders disabled with a 'Soon' badge */
  soon?: boolean;
  /** When true, module cannot be disabled (e.g. 'dashboard') */
  required?: boolean;
  /** IDs of other modules that must be active for this module to function */
  dependencies?: string[];
  /** Recommended plan tier: 'starter' | 'pro' | 'business' | 'enterprise' */
  requiredPlan?: 'starter' | 'pro' | 'business' | 'enterprise';
};

export type ERPBlueprint = {
  /** Machine-readable industry/category slug matching lib/content/industries.ts */
  slug: string;
  /** Display title (e.g. "Mobile Shop & Device Repair ERP") */
  name: string;
  /** Parent sector slug from the global taxonomy */
  sectorSlug: string;
  /** One-line summary */
  summary: string;
  /** In-depth description of operational capabilities */
  description: string;
  /** Ordered list of modular capabilities for this business */
  modules: BlueprintModuleConfig[];
  /** Industry-specific terminology overrides (e.g. { Products: 'Menu Items', Customers: 'Guests' }) */
  terminology: Record<string, string>;
  /** Default dashboard widget IDs configured for this business category */
  defaultWidgets: string[];
  /** Recommended EAP app marketplace slugs */
  recommendedApps: string[];
  /** Recommended storefront theme preset */
  recommendedTheme: string;
  /** Core operational workflows supported */
  workflows: string[];
  /** Built-in analytical reports */
  reports: string[];
};

export type CategoryTemplateSummary = {
  slug: string;
  name: string;
  sectorSlug: string;
  moduleCount: number;
  summary: string;
};
