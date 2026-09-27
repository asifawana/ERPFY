/**
 * Category Plugin Registry — authority: ERPFY-NET-MASTER-PLAN.md §6.2, §7.
 *
 * Maps industry slugs (from lib/content/industries.ts) to the ERP modules each
 * business type needs. This is pure data with no imports — adding a new category
 * is a data edit and nothing else.
 *
 * The registry resolves at two levels:
 * 1. **Industry slug** — the second level of the taxonomy (e.g. 'restaurant-operations')
 * 2. **Sector slug** — a fallback when no industry-level match exists
 *
 * A business whose industry/sector is not mapped here receives the DEFAULT_MODULES,
 * which provide a balanced starting-point ERP.
 *
 * Navigation `href` patterns use `:slug` as the company-slug placeholder. The consumer
 * replaces it at render time (e.g. `/c/my-shop/products`).
 */

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type CategoryModule = {
  /** Stable machine id, unique within a plugin (e.g. 'products', 'inventory'). */
  id: string;
  /** Human-readable sidebar label. */
  label: string;
  /** Lucide icon name resolved by `resolveNavIcon` in AccountShell. */
  icon: string;
  /** Route pattern — `:slug` is replaced with the company slug at runtime. */
  href: string;
  /** Sidebar group heading (e.g. 'Catalog', 'Operations', 'Finance'). */
  group: string;
  /** Short description for tooltips and settings screens. */
  description: string;
  /** When true the item renders disabled with a "Soon" badge. */
  soon?: boolean;
};

export type CategoryPlugin = {
  /** Human name shown in settings (e.g. "Restaurant ERP"). */
  name: string;
  /** Module list for this category. Order determines sidebar order. */
  modules: CategoryModule[];
  /**
   * Optional terminology overrides. Keys are default labels; values are the
   * business-specific alternatives (e.g. { 'Products': 'Menu Items' }).
   */
  terminology?: Record<string, string>;
};

/* ------------------------------------------------------------------ *
 * Shared module definitions — DRY building blocks
 * ------------------------------------------------------------------ */

const M_DASHBOARD: CategoryModule = {
  id: 'dashboard', label: 'Dashboard', icon: 'Home',
  href: '/c/:slug', group: '',
  description: 'Company workspace overview.',
};

const M_PRODUCTS: CategoryModule = {
  id: 'products', label: 'Products', icon: 'Package',
  href: '/c/:slug/products', group: 'Catalog',
  description: 'Product catalog management.',
};

const M_INVENTORY: CategoryModule = {
  id: 'inventory', label: 'Inventory', icon: 'Layers',
  href: '/c/:slug/inventory', group: 'Operations',
  description: 'Stock levels, movements and adjustments.',
  soon: true,
};

const M_PURCHASES: CategoryModule = {
  id: 'purchases', label: 'Purchases', icon: 'ClipboardList',
  href: '/c/:slug/purchases', group: 'Operations',
  description: 'Purchase orders and goods receipt.',
  soon: true,
};

const M_SUPPLIERS: CategoryModule = {
  id: 'suppliers', label: 'Suppliers', icon: 'Briefcase',
  href: '/c/:slug/suppliers', group: 'Operations',
  description: 'Supplier directory and performance.',
  soon: true,
};

const M_SALES: CategoryModule = {
  id: 'sales', label: 'Sales', icon: 'Receipt',
  href: '/c/:slug/sales', group: 'Sales',
  description: 'Sales orders, quotations and invoices.',
  soon: true,
};

const M_ORDERS: CategoryModule = {
  id: 'orders', label: 'Orders', icon: 'ClipboardList',
  href: '/c/:slug/orders', group: 'Sales',
  description: 'Order lifecycle management.',
};

const M_CUSTOMERS: CategoryModule = {
  id: 'customers', label: 'Customers', icon: 'Users',
  href: '/c/:slug/customers', group: 'Sales',
  description: 'Customer directory and insights.',
};

const M_POS: CategoryModule = {
  id: 'pos', label: 'POS', icon: 'Store',
  href: '/c/:slug/pos', group: 'Sales',
  description: 'Point of sale terminal.',
  soon: true,
};

const M_ACCOUNTING: CategoryModule = {
  id: 'accounting', label: 'Accounting', icon: 'Calculator',
  href: '/c/:slug/accounting', group: 'Finance',
  description: 'Ledger, journals, invoices, AR/AP.',
  soon: true,
};

const M_HR: CategoryModule = {
  id: 'hr', label: 'HR & Staff', icon: 'Users',
  href: '/c/:slug/hr', group: 'HR',
  description: 'Employee records, attendance and payroll.',
  soon: true,
};

const M_CRM: CategoryModule = {
  id: 'crm', label: 'CRM', icon: 'Users',
  href: '/c/:slug/crm', group: 'Sales',
  description: 'Contacts, leads and interactions.',
  soon: true,
};

const M_ANALYTICS: CategoryModule = {
  id: 'analytics', label: 'Analytics', icon: 'ChartColumn',
  href: '/c/:slug/analytics', group: 'Reports',
  description: 'Visual analytics and insights.',
};

const M_REPORTS: CategoryModule = {
  id: 'reports', label: 'Reports', icon: 'PieChart',
  href: '/c/:slug/reports', group: 'Reports',
  description: 'Detailed business reports.',
  soon: true,
};

/* ---- Specialty modules ---- */

const M_RECIPES: CategoryModule = {
  id: 'recipes', label: 'Recipes', icon: 'FileSpreadsheet',
  href: '/c/:slug/recipes', group: 'Catalog',
  description: 'Recipe management with ingredient costing.',
  soon: true,
};

const M_TABLES: CategoryModule = {
  id: 'tables', label: 'Tables', icon: 'Landmark',
  href: '/c/:slug/tables', group: 'Operations',
  description: 'Table layout and floor plan.',
  soon: true,
};

const M_KOT: CategoryModule = {
  id: 'kot', label: 'KOT / Kitchen', icon: 'ClipboardList',
  href: '/c/:slug/kitchen', group: 'Operations',
  description: 'Kitchen order tickets and preparation workflow.',
  soon: true,
};

const M_IMEI: CategoryModule = {
  id: 'imei', label: 'IMEI / Serial', icon: 'Shield',
  href: '/c/:slug/serial-tracking', group: 'Operations',
  description: 'IMEI and serial number tracking.',
  soon: true,
};

const M_WARRANTY: CategoryModule = {
  id: 'warranty', label: 'Warranty', icon: 'Shield',
  href: '/c/:slug/warranty', group: 'After Sales',
  description: 'Warranty claims and tracking.',
  soon: true,
};

const M_REPAIRS: CategoryModule = {
  id: 'repairs', label: 'Repairs', icon: 'Settings',
  href: '/c/:slug/repairs', group: 'After Sales',
  description: 'Repair jobs and service tickets.',
  soon: true,
};

const M_BATCHES: CategoryModule = {
  id: 'batches', label: 'Batches', icon: 'Layers',
  href: '/c/:slug/batches', group: 'Operations',
  description: 'Batch and lot tracking with traceability.',
  soon: true,
};

const M_EXPIRY: CategoryModule = {
  id: 'expiry', label: 'Expiry Tracking', icon: 'Shield',
  href: '/c/:slug/expiry', group: 'Operations',
  description: 'Expiry date alerts and FEFO management.',
  soon: true,
};

const M_BOM: CategoryModule = {
  id: 'bom', label: 'Bill of Materials', icon: 'FileSpreadsheet',
  href: '/c/:slug/bom', group: 'Production',
  description: 'Multi-level bill of materials.',
  soon: true,
};

const M_PRODUCTION: CategoryModule = {
  id: 'production', label: 'Production Orders', icon: 'Layers',
  href: '/c/:slug/production', group: 'Production',
  description: 'Work orders and production scheduling.',
  soon: true,
};

const M_QUALITY: CategoryModule = {
  id: 'quality', label: 'Quality Control', icon: 'Shield',
  href: '/c/:slug/quality', group: 'Production',
  description: 'Inspection and quality check management.',
  soon: true,
};

const M_PROJECTS: CategoryModule = {
  id: 'projects', label: 'Projects', icon: 'Briefcase',
  href: '/c/:slug/projects', group: 'Operations',
  description: 'Project tracking with tasks and timelines.',
  soon: true,
};

const M_TIME_TRACKING: CategoryModule = {
  id: 'time-tracking', label: 'Time Tracking', icon: 'ClipboardList',
  href: '/c/:slug/timesheet', group: 'Operations',
  description: 'Timesheets and billable hours.',
  soon: true,
};

const M_INVOICING: CategoryModule = {
  id: 'invoicing', label: 'Invoicing', icon: 'Receipt',
  href: '/c/:slug/invoicing', group: 'Finance',
  description: 'Invoice creation and payment tracking.',
  soon: true,
};

const M_APPOINTMENTS: CategoryModule = {
  id: 'appointments', label: 'Appointments', icon: 'ClipboardList',
  href: '/c/:slug/appointments', group: 'Operations',
  description: 'Appointment booking and calendar.',
  soon: true,
};

const M_SERVICES: CategoryModule = {
  id: 'services', label: 'Services', icon: 'Package',
  href: '/c/:slug/services', group: 'Catalog',
  description: 'Service catalog and pricing.',
  soon: true,
};

const M_PATIENTS: CategoryModule = {
  id: 'patients', label: 'Patients', icon: 'Users',
  href: '/c/:slug/patients', group: 'Operations',
  description: 'Patient records and history.',
  soon: true,
};

const M_PRESCRIPTIONS: CategoryModule = {
  id: 'prescriptions', label: 'Prescriptions', icon: 'FileSpreadsheet',
  href: '/c/:slug/prescriptions', group: 'Operations',
  description: 'Prescription processing and dispensing.',
  soon: true,
};

const M_WAREHOUSES: CategoryModule = {
  id: 'warehouses', label: 'Warehouses', icon: 'Layers',
  href: '/c/:slug/warehouses', group: 'Operations',
  description: 'Multi-warehouse management and transfers.',
  soon: true,
};

const M_PRICING_TIERS: CategoryModule = {
  id: 'pricing-tiers', label: 'Pricing Tiers', icon: 'Receipt',
  href: '/c/:slug/pricing', group: 'Sales',
  description: 'Customer-specific and tiered pricing.',
  soon: true,
};

const M_DISCOUNTS: CategoryModule = {
  id: 'discounts', label: 'Discounts', icon: 'Receipt',
  href: '/c/:slug/discounts', group: 'Sales',
  description: 'Discount rules and coupon management.',
  soon: true,
};

const M_COLLECTIONS: CategoryModule = {
  id: 'collections', label: 'Collections', icon: 'Layers',
  href: '/c/:slug/collections', group: 'Catalog',
  description: 'Product collections and categories.',
  soon: true,
};

const M_VARIANTS: CategoryModule = {
  id: 'variants', label: 'Variants', icon: 'Package',
  href: '/c/:slug/variants', group: 'Catalog',
  description: 'Size, color and attribute variant management.',
  soon: true,
};

const M_FLEET: CategoryModule = {
  id: 'fleet', label: 'Fleet', icon: 'Briefcase',
  href: '/c/:slug/fleet', group: 'Operations',
  description: 'Vehicle and fleet management.',
  soon: true,
};

const M_SHIPMENTS: CategoryModule = {
  id: 'shipments', label: 'Shipments', icon: 'Package',
  href: '/c/:slug/shipments', group: 'Operations',
  description: 'Shipment tracking and documentation.',
  soon: true,
};

const M_MEMBERS: CategoryModule = {
  id: 'members', label: 'Members', icon: 'Users',
  href: '/c/:slug/members', group: 'Operations',
  description: 'Membership directory and subscriptions.',
  soon: true,
};

const M_DONATIONS: CategoryModule = {
  id: 'donations', label: 'Donations', icon: 'Wallet',
  href: '/c/:slug/donations', group: 'Finance',
  description: 'Donor management and contribution tracking.',
  soon: true,
};

const M_PROGRAMMES: CategoryModule = {
  id: 'programmes', label: 'Programmes', icon: 'Briefcase',
  href: '/c/:slug/programmes', group: 'Operations',
  description: 'Programme and project fund tracking.',
  soon: true,
};

const M_ENROLMENT: CategoryModule = {
  id: 'enrolment', label: 'Enrolment', icon: 'Users',
  href: '/c/:slug/enrolment', group: 'Operations',
  description: 'Student enrolment and admissions.',
  soon: true,
};

const M_FEES: CategoryModule = {
  id: 'fees', label: 'Fees', icon: 'Wallet',
  href: '/c/:slug/fees', group: 'Finance',
  description: 'Fee structure and collection.',
  soon: true,
};

const M_ROOMS: CategoryModule = {
  id: 'rooms', label: 'Rooms', icon: 'Landmark',
  href: '/c/:slug/rooms', group: 'Operations',
  description: 'Room inventory and reservations.',
  soon: true,
};

const M_RESERVATIONS: CategoryModule = {
  id: 'reservations', label: 'Reservations', icon: 'ClipboardList',
  href: '/c/:slug/reservations', group: 'Operations',
  description: 'Guest booking and check-in/out.',
  soon: true,
};

const M_LISTINGS: CategoryModule = {
  id: 'listings', label: 'Listings', icon: 'Landmark',
  href: '/c/:slug/listings', group: 'Operations',
  description: 'Property listings and viewings.',
  soon: true,
};

const M_TENANTS_MGMT: CategoryModule = {
  id: 'tenant-mgmt', label: 'Tenants', icon: 'Users',
  href: '/c/:slug/tenants', group: 'Operations',
  description: 'Tenant and lease management.',
  soon: true,
};

const M_ASSETS: CategoryModule = {
  id: 'assets', label: 'Assets', icon: 'Briefcase',
  href: '/c/:slug/assets', group: 'Operations',
  description: 'Asset tracking and rental management.',
  soon: true,
};

const M_JOB_CARDS: CategoryModule = {
  id: 'job-cards', label: 'Job Cards', icon: 'ClipboardList',
  href: '/c/:slug/jobs', group: 'Operations',
  description: 'Job card based service workflow.',
  soon: true,
};

/* ------------------------------------------------------------------ *
 * Default modules — every unmatched category starts here
 * ------------------------------------------------------------------ */

export const DEFAULT_MODULES: CategoryModule[] = [
  M_DASHBOARD,
  M_PRODUCTS,
  M_ORDERS,
  M_CUSTOMERS,
  M_INVENTORY,
  M_PURCHASES,
  M_SUPPLIERS,
  M_SALES,
  M_POS,
  M_ACCOUNTING,
  M_HR,
  M_CRM,
  M_ANALYTICS,
  M_REPORTS,
];

/* ------------------------------------------------------------------ *
 * Industry-level plugins
 * ------------------------------------------------------------------ */

const INDUSTRY_PLUGINS: Record<string, CategoryPlugin> = {
  /* ---- Retail ---- */
  'general-retail': {
    name: 'Retail Store ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS, M_POS, M_DISCOUNTS,
      M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
  },
  'online-retail': {
    name: 'Online Retail ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_COLLECTIONS, M_ORDERS, M_CUSTOMERS,
      M_INVENTORY, M_DISCOUNTS, M_SHIPMENTS,
      M_ANALYTICS, M_REPORTS,
    ],
  },
  'specialty-retail': {
    name: 'Specialty Retail ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_VARIANTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_POS, M_WARRANTY, M_REPAIRS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Restaurants ---- */
  'restaurant-operations': {
    name: 'Restaurant ERP',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Menu Items', description: 'Menu item catalog with pricing.' },
      M_RECIPES, M_INVENTORY, M_TABLES, M_ORDERS, M_KOT, M_POS,
      M_CUSTOMERS, M_PURCHASES, M_SUPPLIERS,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Menu Items', 'HR & Staff': 'Staff' },
  },
  'catering': {
    name: 'Catering ERP',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Menu Items' },
      M_RECIPES, M_INVENTORY, M_ORDERS, M_CUSTOMERS,
      M_PURCHASES, M_SUPPLIERS, M_INVOICING,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Menu Items' },
  },

  /* ---- Wholesale & Distribution ---- */
  'wholesale-trading': {
    name: 'Wholesale Trading ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_WAREHOUSES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_PRICING_TIERS, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'distribution-networks': {
    name: 'Distribution ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_WAREHOUSES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_PRICING_TIERS, M_FLEET, M_SHIPMENTS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Manufacturing ---- */
  'discrete-manufacturing': {
    name: 'Discrete Manufacturing ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BOM, M_PRODUCTION, M_QUALITY,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
  },
  'process-manufacturing': {
    name: 'Process Manufacturing ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_RECIPES, M_BOM, M_PRODUCTION,
      M_BATCHES, M_QUALITY, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Professional Services ---- */
  'consulting': {
    name: 'Consulting ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients', description: 'Client directory and engagements.' },
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Clients' },
  },
  'agencies': {
    name: 'Agency ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      { ...M_HR, label: 'Team' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Clients', 'HR & Staff': 'Team' },
  },
  'accounting-legal': {
    name: 'Practice ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Clients' },
  },

  /* ---- Technology ---- */
  'software-saas': {
    name: 'Software / SaaS ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      M_PRODUCTS, M_ORDERS,
      { ...M_HR, label: 'Team' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'it-services': {
    name: 'IT Services ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PRODUCTS, M_INVENTORY, M_REPAIRS,
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      { ...M_HR, label: 'Team' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Agriculture ---- */
  'crop-farming': {
    name: 'Farm ERP',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Crops', description: 'Crop catalog and varieties.' },
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS, M_SALES, M_CUSTOMERS,
      M_BATCHES, M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Crops' },
  },
  'seeds-agri-inputs': {
    name: 'Seed & Agri Input ERP',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Seeds / Inputs' },
      M_BATCHES, M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS, M_PRICING_TIERS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Seeds / Inputs' },
  },
  'food-processing': {
    name: 'Food Processing ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_RECIPES, M_BOM, M_PRODUCTION,
      M_BATCHES, M_QUALITY, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Healthcare / Pharmacy ---- */
  'clinics': {
    name: 'Clinic ERP',
    modules: [
      M_DASHBOARD, M_PATIENTS, M_APPOINTMENTS,
      { ...M_PRODUCTS, label: 'Supplies' },
      M_INVENTORY, M_INVOICING,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Supplies' },
  },
  'pharmacy': {
    name: 'Pharmacy ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BATCHES, M_EXPIRY,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_PRESCRIPTIONS, M_SALES, M_CUSTOMERS, M_POS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Hospitality ---- */
  'accommodation': {
    name: 'Hotel / Accommodation ERP',
    modules: [
      M_DASHBOARD, M_ROOMS, M_RESERVATIONS,
      M_CUSTOMERS, M_INVOICING,
      { ...M_PRODUCTS, label: 'Services' },
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Services' },
  },

  /* ---- Construction ---- */
  'building-construction': {
    name: 'Construction ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS,
      { ...M_PRODUCTS, label: 'Materials' },
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Materials', 'Customers': 'Clients' },
  },
  'specialist-trades': {
    name: 'Trade Services ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS, M_JOB_CARDS,
      { ...M_PRODUCTS, label: 'Materials' },
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_CUSTOMERS, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Materials' },
  },

  /* ---- Printing & Packaging ---- */
  'commercial-printing': {
    name: 'Printing ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BOM, M_PRODUCTION, M_QUALITY,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'packaging': {
    name: 'Packaging ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BOM, M_PRODUCTION, M_QUALITY,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Automotive ---- */
  'vehicle-dealership': {
    name: 'Vehicle Dealership ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_IMEI, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_WARRANTY, M_INVOICING,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'parts-workshop': {
    name: 'Auto Parts & Workshop ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_CUSTOMERS,
      M_JOB_CARDS, M_REPAIRS, M_POS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Transport & Logistics ---- */
  'freight-transport': {
    name: 'Transport ERP',
    modules: [
      M_DASHBOARD, M_FLEET, M_SHIPMENTS,
      M_CUSTOMERS, M_ORDERS, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'warehousing': {
    name: 'Warehousing ERP',
    modules: [
      M_DASHBOARD, M_WAREHOUSES, M_INVENTORY,
      M_CUSTOMERS, M_ORDERS, M_SHIPMENTS,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Food & Beverage ---- */
  'bakery-confectionery': {
    name: 'Bakery ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_RECIPES, M_PRODUCTION, M_BATCHES,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS, M_POS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'beverage': {
    name: 'Beverage ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_RECIPES, M_PRODUCTION, M_BATCHES,
      M_QUALITY, M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Beauty / Fitness ---- */
  'salon-spa': {
    name: 'Salon & Spa ERP',
    modules: [
      M_DASHBOARD, M_SERVICES, M_APPOINTMENTS,
      M_CUSTOMERS,
      { ...M_PRODUCTS, label: 'Retail Products' },
      M_INVENTORY, M_POS,
      { ...M_HR, label: 'Staff' }, M_INVOICING,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'fitness': {
    name: 'Fitness / Gym ERP',
    modules: [
      M_DASHBOARD, M_MEMBERS, M_SERVICES, M_APPOINTMENTS,
      { ...M_PRODUCTS, label: 'Shop Items' },
      M_INVENTORY, M_POS,
      { ...M_HR, label: 'Staff' }, M_INVOICING,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Education ---- */
  'schools': {
    name: 'School ERP',
    modules: [
      M_DASHBOARD, M_ENROLMENT,
      { ...M_CUSTOMERS, label: 'Students' },
      M_FEES,
      { ...M_HR, label: 'Staff' },
      M_INVENTORY, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Students' },
  },
  'training-providers': {
    name: 'Training ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Participants' },
      M_SERVICES, M_INVOICING,
      { ...M_HR, label: 'Trainers' },
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Participants', 'HR & Staff': 'Trainers' },
  },

  /* ---- Textile ---- */
  'textile-mills': {
    name: 'Textile Mill ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BOM, M_PRODUCTION,
      M_BATCHES, M_QUALITY, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'garment-manufacturing': {
    name: 'Garment Manufacturing ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_VARIANTS, M_BOM, M_PRODUCTION,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Property ---- */
  'property-management': {
    name: 'Property Management ERP',
    modules: [
      M_DASHBOARD, M_LISTINGS, M_TENANTS_MGMT,
      M_INVOICING,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'real-estate-agency': {
    name: 'Real Estate Agency ERP',
    modules: [
      M_DASHBOARD, M_LISTINGS,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_INVOICING,
      { ...M_HR, label: 'Agents' },
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Clients', 'HR & Staff': 'Agents' },
  },

  /* ---- Travel ---- */
  'travel-agency': {
    name: 'Travel Agency ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Travellers' },
      M_ORDERS, M_INVOICING, M_SUPPLIERS,
      { ...M_HR, label: 'Staff' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Travellers' },
  },

  /* ---- Events ---- */
  'event-management': {
    name: 'Event Management ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_SUPPLIERS, M_INVOICING, M_INVENTORY,
      { ...M_HR, label: 'Crew' }, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Clients', 'HR & Staff': 'Crew' },
  },

  /* ---- Rental ---- */
  'equipment-rental': {
    name: 'Rental ERP',
    modules: [
      M_DASHBOARD, M_ASSETS, M_CUSTOMERS, M_ORDERS,
      M_INVOICING, M_INVENTORY,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Energy ---- */
  'renewables': {
    name: 'Renewables ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PRODUCTS, M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'fuel-distribution': {
    name: 'Fuel Distribution ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_WAREHOUSES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_FLEET, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Mining ---- */
  'extraction': {
    name: 'Mining / Extraction ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_CUSTOMERS,
      M_PROJECTS, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Import / Export ---- */
  'trading-house': {
    name: 'Import / Export Trading ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_WAREHOUSES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_SHIPMENTS, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Repair / Field Service ---- */
  'field-service': {
    name: 'Field Service ERP',
    modules: [
      M_DASHBOARD, M_JOB_CARDS, M_CUSTOMERS,
      M_PRODUCTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Non-profit ---- */
  'charities': {
    name: 'Charity / NGO ERP',
    modules: [
      M_DASHBOARD, M_PROGRAMMES, M_DONATIONS,
      { ...M_CUSTOMERS, label: 'Beneficiaries' },
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Beneficiaries' },
  },
  'associations': {
    name: 'Association ERP',
    modules: [
      M_DASHBOARD, M_MEMBERS,
      M_FEES, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- Public sector ---- */
  'public-administration': {
    name: 'Public Administration ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS,
      M_PURCHASES, M_SUPPLIERS, M_INVENTORY,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },

  /* ---- General ---- */
  'general-business': {
    name: 'General Business ERP',
    modules: DEFAULT_MODULES,
  },
  'custom': {
    name: 'Custom ERP',
    modules: DEFAULT_MODULES,
  },
};

/* ------------------------------------------------------------------ *
 * Sector-level fallbacks — used when no industry-level match exists
 * ------------------------------------------------------------------ */

const SECTOR_PLUGINS: Record<string, CategoryPlugin> = {
  'agriculture-food-supply': {
    name: 'Agriculture ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_BATCHES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_CUSTOMERS,
      M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
  },
  'retail-ecommerce': {
    name: 'Retail ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS, M_POS, M_DISCOUNTS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'wholesale-distribution': {
    name: 'Wholesale / Distribution ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_WAREHOUSES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_PRICING_TIERS, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'manufacturing': {
    name: 'Manufacturing ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BOM, M_PRODUCTION, M_QUALITY,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_ACCOUNTING, M_HR, M_ANALYTICS, M_REPORTS,
    ],
  },
  'professional-services': {
    name: 'Professional Services ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Clients' },
  },
  'technology': {
    name: 'Tech / Software ERP',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PROJECTS, M_TIME_TRACKING, M_INVOICING,
      M_PRODUCTS, M_ORDERS,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'construction-contractors': {
    name: 'Construction ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS,
      { ...M_PRODUCTS, label: 'Materials' },
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_CUSTOMERS, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'restaurants': {
    name: 'Restaurant ERP',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Menu Items' },
      M_RECIPES, M_INVENTORY, M_TABLES, M_ORDERS, M_KOT, M_POS,
      M_CUSTOMERS, M_PURCHASES, M_SUPPLIERS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Products': 'Menu Items' },
  },
  'hospitality': {
    name: 'Hospitality ERP',
    modules: [
      M_DASHBOARD, M_ROOMS, M_RESERVATIONS,
      M_CUSTOMERS, M_INVOICING,
      M_INVENTORY, M_PURCHASES,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'healthcare-pharmacy': {
    name: 'Healthcare ERP',
    modules: [
      M_DASHBOARD, M_PATIENTS, M_APPOINTMENTS,
      M_PRODUCTS, M_INVENTORY,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'food-beverage': {
    name: 'Food & Beverage ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_RECIPES, M_PRODUCTION, M_BATCHES,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'beauty-fitness-wellness': {
    name: 'Beauty / Fitness ERP',
    modules: [
      M_DASHBOARD, M_SERVICES, M_APPOINTMENTS,
      M_CUSTOMERS, M_PRODUCTS, M_INVENTORY, M_POS,
      M_HR, M_INVOICING, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'education-training': {
    name: 'Education ERP',
    modules: [
      M_DASHBOARD, M_ENROLMENT,
      { ...M_CUSTOMERS, label: 'Students' },
      M_FEES, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
    terminology: { 'Customers': 'Students' },
  },
  'automotive': {
    name: 'Automotive ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_WARRANTY, M_REPAIRS, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'transportation-logistics': {
    name: 'Transport & Logistics ERP',
    modules: [
      M_DASHBOARD, M_FLEET, M_SHIPMENTS,
      M_CUSTOMERS, M_ORDERS, M_INVOICING,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'printing-packaging': {
    name: 'Print / Packaging ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_BOM, M_PRODUCTION, M_QUALITY,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'property-real-estate': {
    name: 'Property ERP',
    modules: [
      M_DASHBOARD, M_LISTINGS, M_TENANTS_MGMT,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'textile-garments': {
    name: 'Textile ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_VARIANTS, M_BOM, M_PRODUCTION,
      M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_SALES, M_ORDERS, M_CUSTOMERS,
      M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'travel-tourism': {
    name: 'Travel ERP',
    modules: [
      M_DASHBOARD, M_CUSTOMERS, M_ORDERS, M_INVOICING,
      M_SUPPLIERS, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'events': {
    name: 'Events ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS, M_CUSTOMERS, M_SUPPLIERS,
      M_INVOICING, M_INVENTORY, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'rental': {
    name: 'Rental ERP',
    modules: [
      M_DASHBOARD, M_ASSETS, M_CUSTOMERS, M_ORDERS,
      M_INVOICING, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'energy': {
    name: 'Energy ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS, M_PRODUCTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_CUSTOMERS,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'mining-heavy-industry': {
    name: 'Mining ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_CUSTOMERS,
      M_PROJECTS, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'import-export': {
    name: 'Import / Export ERP',
    modules: [
      M_DASHBOARD, M_PRODUCTS, M_INVENTORY, M_WAREHOUSES,
      M_PURCHASES, M_SUPPLIERS, M_SALES, M_ORDERS, M_CUSTOMERS,
      M_SHIPMENTS, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'repair-field-service': {
    name: 'Field Service ERP',
    modules: [
      M_DASHBOARD, M_JOB_CARDS, M_CUSTOMERS,
      M_PRODUCTS, M_INVENTORY, M_PURCHASES, M_SUPPLIERS,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'non-profit': {
    name: 'Non-Profit ERP',
    modules: [
      M_DASHBOARD, M_PROGRAMMES, M_DONATIONS, M_MEMBERS,
      M_INVOICING, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'public-sector': {
    name: 'Public Sector ERP',
    modules: [
      M_DASHBOARD, M_PROJECTS, M_PURCHASES, M_SUPPLIERS,
      M_INVENTORY, M_HR, M_ACCOUNTING, M_ANALYTICS, M_REPORTS,
    ],
  },
  'general-mixed': {
    name: 'General ERP',
    modules: DEFAULT_MODULES,
  },
  'other-custom': {
    name: 'Custom ERP',
    modules: DEFAULT_MODULES,
  },
};

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Resolves the category plugin for a company's industry/sector.
 * Priority: industry slug → sector slug → default.
 */
export function resolvePlugin(
  industrySlug: string,
  sectorSlug: string,
): CategoryPlugin {
  if (industrySlug && INDUSTRY_PLUGINS[industrySlug]) {
    return INDUSTRY_PLUGINS[industrySlug];
  }
  if (sectorSlug && SECTOR_PLUGINS[sectorSlug]) {
    return SECTOR_PLUGINS[sectorSlug];
  }
  return { name: 'ERP', modules: DEFAULT_MODULES };
}

/**
 * Returns the modules for a company, optionally filtering by disabled module IDs.
 * The returned list has `:slug` placeholders resolved to the actual company slug.
 */
export function resolveModules(
  industrySlug: string,
  sectorSlug: string,
  companySlug: string,
  disabledModuleIds?: string[],
): CategoryModule[] {
  const plugin = resolvePlugin(industrySlug, sectorSlug);
  const disabled = new Set(disabledModuleIds ?? []);

  return plugin.modules
    .filter((m) => !disabled.has(m.id))
    .map((m) => ({
      ...m,
      href: m.href.replace(/:slug/g, companySlug),
    }));
}

/**
 * Returns the full plugin for a company (name + all modules with resolved hrefs).
 */
export function resolveCategoryPlugin(
  industrySlug: string,
  sectorSlug: string,
  companySlug: string,
  disabledModuleIds?: string[],
): { name: string; modules: CategoryModule[]; terminology?: Record<string, string> } {
  const plugin = resolvePlugin(industrySlug, sectorSlug);
  const disabled = new Set(disabledModuleIds ?? []);

  return {
    name: plugin.name,
    terminology: plugin.terminology,
    modules: plugin.modules
      .filter((m) => !disabled.has(m.id))
      .map((m) => ({
        ...m,
        href: m.href.replace(/:slug/g, companySlug),
      })),
  };
}

/** All available industry plugin keys (for admin/debug tooling). */
export function allIndustryPluginKeys(): string[] {
  return Object.keys(INDUSTRY_PLUGINS);
}

/** All available sector plugin keys (for admin/debug tooling). */
export function allSectorPluginKeys(): string[] {
  return Object.keys(SECTOR_PLUGINS);
}

export type CategoryTemplateInfo = {
  slug: string;
  name: string;
  moduleCount: number;
};

/**
 * Returns a list of all available business category ERP templates with their
 * display names and module counts.
 */
export function listAvailableCategoryTemplates(): CategoryTemplateInfo[] {
  return Object.entries(INDUSTRY_PLUGINS).map(([slug, plugin]) => ({
    slug,
    name: plugin.name,
    moduleCount: plugin.modules.length,
  }));
}
