/**
 * ERPfy.net — Modular ERP Engine & Dependency Resolver
 * Authority: ERPfy.net Complete Implementation Master Specification (§5, §6)
 */

export type ERPModuleDefinition = {
  id: string;
  name: string;
  group: 'Core' | 'Catalog' | 'Operations' | 'Sales' | 'Finance' | 'HR' | 'After Sales' | 'Production' | 'Reports';
  icon: string;
  description: string;
  isCore?: boolean;
  requiredPlan: 'starter' | 'pro' | 'business' | 'enterprise';
  dependencies: string[]; // Module IDs required by this module
  recommendedFor?: string[]; // Industry slugs where this module is native
};

export const MASTER_MODULES: Record<string, ERPModuleDefinition> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    group: 'Core',
    icon: 'Home',
    description: 'Central operational cockpit, executive KPIs, and live event monitoring.',
    isCore: true,
    requiredPlan: 'starter',
    dependencies: [],
  },
  products: {
    id: 'products',
    name: 'Products & Catalog',
    group: 'Catalog',
    icon: 'Package',
    description: 'Multi-variant product catalog, SKUs, barcode generation, and base pricing.',
    requiredPlan: 'starter',
    dependencies: [],
  },
  inventory: {
    id: 'inventory',
    name: 'Inventory & Stock Control',
    group: 'Operations',
    icon: 'Layers',
    description: 'Multi-location inventory tracking, stock adjustments, and low stock reorder alerts.',
    requiredPlan: 'starter',
    dependencies: ['products'],
  },
  purchases: {
    id: 'purchases',
    name: 'Purchasing & Procurement',
    group: 'Operations',
    icon: 'ClipboardList',
    description: 'Purchase requisitions, vendor bills, and goods receiving notes (GRN).',
    requiredPlan: 'starter',
    dependencies: ['suppliers'],
  },
  suppliers: {
    id: 'suppliers',
    name: 'Suppliers Directory',
    group: 'Operations',
    icon: 'Briefcase',
    description: 'Vendor relationship management, payment terms, and vendor performance history.',
    requiredPlan: 'starter',
    dependencies: [],
  },
  sales: {
    id: 'sales',
    name: 'Sales Orders & Invoicing',
    group: 'Sales',
    icon: 'Receipt',
    description: 'Customer quotations, formal sales orders, proforma invoices, and dispatch delivery notes.',
    requiredPlan: 'starter',
    dependencies: ['products', 'customers'],
  },
  orders: {
    id: 'orders',
    name: 'Order Lifecycle Tracking',
    group: 'Sales',
    icon: 'ClipboardList',
    description: 'Live order statuses, packing slips, shipment milestones, and customer notifications.',
    requiredPlan: 'starter',
    dependencies: ['products'],
  },
  customers: {
    id: 'customers',
    name: 'Customer Directory & CRM',
    group: 'Sales',
    icon: 'Users',
    description: 'Customer profiles, contact records, credit limits, and purchase histories.',
    requiredPlan: 'starter',
    dependencies: [],
  },
  pos: {
    id: 'pos',
    name: 'Point of Sale (POS)',
    group: 'Sales',
    icon: 'Store',
    description: 'Rapid barcode-driven retail counter checkout, cash register drawer, and receipt printing.',
    requiredPlan: 'starter',
    dependencies: ['products', 'sales'],
  },
  accounting: {
    id: 'accounting',
    name: 'Financial Accounting & General Ledger',
    group: 'Finance',
    icon: 'Calculator',
    description: 'Double-entry bookkeeping, chart of accounts, journal entries, AP/AR, and tax filings.',
    requiredPlan: 'pro',
    dependencies: [],
  },
  hr: {
    id: 'hr',
    name: 'Human Resources & Payroll',
    group: 'HR',
    icon: 'Users',
    description: 'Staff directory, job designations, shifts, attendance capture, and payroll generation.',
    requiredPlan: 'pro',
    dependencies: [],
  },
  crm: {
    id: 'crm',
    name: 'CRM & Lead Pipeline',
    group: 'Sales',
    icon: 'Users',
    description: 'Lead generation stages, sales opportunities, deal forecasting, and activity tracking.',
    requiredPlan: 'pro',
    dependencies: ['customers'],
  },
  analytics: {
    id: 'analytics',
    name: 'Business Analytics & BI',
    group: 'Reports',
    icon: 'ChartColumn',
    description: 'Interactive visual charts, sales trends, inventory turnover, and profitability matrices.',
    requiredPlan: 'starter',
    dependencies: [],
  },
  reports: {
    id: 'reports',
    name: 'Financial & Operational Reports',
    group: 'Reports',
    icon: 'PieChart',
    description: 'Official tax returns, balance sheets, profit & loss, and audit trail exports.',
    requiredPlan: 'starter',
    dependencies: [],
  },

  /* Category-Specific Modular Engines */
  imei: {
    id: 'imei',
    name: 'IMEI & Device Serial Tracking',
    group: 'Operations',
    icon: 'Shield',
    description: 'Unique individual unit tracking by 15-digit IMEI, serial numbers, and warranty activation.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['mobile-shop', 'parts-workshop'],
  },
  warranty: {
    id: 'warranty',
    name: 'Warranty Management & Claims',
    group: 'After Sales',
    icon: 'Shield',
    description: 'Customer warranty policies, claim processing, manufacturer returns, and RMA status.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['mobile-shop'],
  },
  repairs: {
    id: 'repairs',
    name: 'Device & Hardware Repairs',
    group: 'After Sales',
    icon: 'Settings',
    description: 'Repair bay intake, defect diagnostics, technician job assignment, and repair costing.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['mobile-shop', 'parts-workshop'],
  },
  recipes: {
    id: 'recipes',
    name: 'Recipe Formulation & Food Costing',
    group: 'Catalog',
    icon: 'FileSpreadsheet',
    description: 'Culinary ingredient breakdown, portion weights, and live food recipe cost tracking.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['restaurant-operations', 'process-manufacturing'],
  },
  tables: {
    id: 'tables',
    name: 'Table & Floor Plan Management',
    group: 'Operations',
    icon: 'Landmark',
    description: 'Dining area graphic layout, table reservations, seating capacities, and table order transfer.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['restaurant-operations'],
  },
  kot: {
    id: 'kot',
    name: 'Kitchen Order Tickets (KOT / KDS)',
    group: 'Operations',
    icon: 'ClipboardList',
    description: 'Digital Kitchen Display System, station routing (grill, bar, pastry), and preparation times.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['restaurant-operations'],
  },
  batches: {
    id: 'batches',
    name: 'Batches & Lot Tracking',
    group: 'Operations',
    icon: 'Layers',
    description: 'Manufacture batch numbers, QC release certificates, and supply chain traceability.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['pharmacy', 'grocery-supermarket', 'process-manufacturing', 'crop-farming'],
  },
  expiry: {
    id: 'expiry',
    name: 'Expiry Date & FEFO Control',
    group: 'Operations',
    icon: 'Shield',
    description: 'Automated expiration warning windows, First-Expiry-First-Out rotation, and disposal audits.',
    requiredPlan: 'starter',
    dependencies: ['batches'],
    recommendedFor: ['pharmacy', 'grocery-supermarket'],
  },
  prescriptions: {
    id: 'prescriptions',
    name: 'Prescription Dispensing',
    group: 'Operations',
    icon: 'FileSpreadsheet',
    description: 'Doctor prescription capture, dosage verification, and controlled substance dispense logs.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['pharmacy', 'clinics'],
  },
  bom: {
    id: 'bom',
    name: 'Bill of Materials (BOM)',
    group: 'Production',
    icon: 'FileSpreadsheet',
    description: 'Multi-level assembly trees, sub-assembly components, labor units, and machine routing.',
    requiredPlan: 'pro',
    dependencies: ['products'],
    recommendedFor: ['discrete-manufacturing', 'process-manufacturing'],
  },
  production: {
    id: 'production',
    name: 'Manufacturing Work Orders',
    group: 'Production',
    icon: 'Layers',
    description: 'Shop floor manufacturing orders, routing step completion, and machine work scheduling.',
    requiredPlan: 'pro',
    dependencies: ['bom'],
    recommendedFor: ['discrete-manufacturing', 'process-manufacturing'],
  },
  quality: {
    id: 'quality',
    name: 'Quality Assurance & Inspection',
    group: 'Production',
    icon: 'Shield',
    description: 'Inspection criteria checkpoints, batch pass/fail criteria, defect quarantine, and COA exports.',
    requiredPlan: 'pro',
    dependencies: [],
    recommendedFor: ['discrete-manufacturing', 'process-manufacturing'],
  },
  projects: {
    id: 'projects',
    name: 'Projects & Task Management',
    group: 'Operations',
    icon: 'Briefcase',
    description: 'Gantt schedule milestones, project tasks, team assignments, and milestone progress.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['consulting', 'building-construction'],
  },
  'time-tracking': {
    id: 'time-tracking',
    name: 'Timesheets & Billable Hours',
    group: 'Operations',
    icon: 'ClipboardList',
    description: 'Staff daily timesheet logging, client billable hours, and labor charge calculations.',
    requiredPlan: 'starter',
    dependencies: ['projects'],
    recommendedFor: ['consulting'],
  },
  invoicing: {
    id: 'invoicing',
    name: 'Client Invoicing & Progress Billing',
    group: 'Finance',
    icon: 'Receipt',
    description: 'Commercial invoice generation, progress milestone certificates, and payment links.',
    requiredPlan: 'starter',
    dependencies: ['customers'],
    recommendedFor: ['consulting', 'building-construction', 'property-management', 'schools'],
  },
  patients: {
    id: 'patients',
    name: 'Patient Electronic Records',
    group: 'Operations',
    icon: 'Users',
    description: 'Patient medical histories, electronic charts, allergies, and diagnostic visit histories.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['clinics'],
  },
  appointments: {
    id: 'appointments',
    name: 'Appointment Calendar & Scheduling',
    group: 'Operations',
    icon: 'ClipboardList',
    description: 'Practitioner and stylist booking calendar, SMS reminders, and queue management.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['clinics', 'salon-spa'],
  },
  warehouses: {
    id: 'warehouses',
    name: 'Multi-Warehouse & Bin Management',
    group: 'Operations',
    icon: 'Layers',
    description: 'Multiple depot locations, aisle/rack/bin coordinates, and branch stock transfer manifests.',
    requiredPlan: 'pro',
    dependencies: ['inventory'],
    recommendedFor: ['wholesale-trading', 'distribution-networks'],
  },
  fleet: {
    id: 'fleet',
    name: 'Fleet & Vehicle Operations',
    group: 'Operations',
    icon: 'Briefcase',
    description: 'Fleet vehicle roster, driver license tracking, trip manifests, and vehicle service logs.',
    requiredPlan: 'pro',
    dependencies: [],
    recommendedFor: ['distribution-networks'],
  },
  shipments: {
    id: 'shipments',
    name: 'Shipments & Consignment Logistics',
    group: 'Operations',
    icon: 'Package',
    description: 'Shipping carrier booking, consignment waybills, parcel tracking, and proof of delivery.',
    requiredPlan: 'starter',
    dependencies: ['orders'],
    recommendedFor: ['distribution-networks', 'general-retail'],
  },
  variants: {
    id: 'variants',
    name: 'Product Variants Matrix',
    group: 'Catalog',
    icon: 'Package',
    description: 'Multi-dimensional matrix generation (Size, Color, Material) with independent barcodes.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['fashion-apparel'],
  },
  collections: {
    id: 'collections',
    name: 'Merchandise Collections',
    group: 'Catalog',
    icon: 'Layers',
    description: 'Category hierarchies, seasonal collections, featured storefront banners, and product tags.',
    requiredPlan: 'starter',
    dependencies: ['products'],
    recommendedFor: ['fashion-apparel', 'general-retail'],
  },
  'job-cards': {
    id: 'job-cards',
    name: 'Workshop Job Cards',
    group: 'Operations',
    icon: 'ClipboardList',
    description: 'Vehicle and equipment service job cards, technician labor allocations, and parts tickets.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['parts-workshop'],
  },
  listings: {
    id: 'listings',
    name: 'Property Units & Listings',
    group: 'Operations',
    icon: 'Landmark',
    description: 'Real estate residential and commercial unit profiles, square footage, and lease terms.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['property-management'],
  },
  tenants: {
    id: 'tenants',
    name: 'Tenants & Lease Agreements',
    group: 'Operations',
    icon: 'Users',
    description: 'Tenant lease contracts, automated monthly rent accrual, security deposits, and renewals.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['property-management'],
  },
  services: {
    id: 'services',
    name: 'Service Catalog & Packages',
    group: 'Catalog',
    icon: 'Package',
    description: 'Salon and clinic treatment menus, service packages, duration slots, and staff commissions.',
    requiredPlan: 'starter',
    dependencies: [],
    recommendedFor: ['salon-spa'],
  },
};

/**
 * Validates whether a module can safely be toggled without breaking active dependencies.
 */
export function validateModuleToggle(
  targetModuleId: string,
  willEnable: boolean,
  activeModuleIds: string[],
): { allowed: boolean; reason?: string; blockingDependents?: string[] } {
  const mod = MASTER_MODULES[targetModuleId];
  if (!mod) {
    return { allowed: false, reason: `Module "${targetModuleId}" does not exist in registry.` };
  }

  // Core modules can never be disabled
  if (!willEnable && mod.isCore) {
    return { allowed: false, reason: `Module "${mod.name}" is a protected core module and cannot be disabled.` };
  }

  // When enabling: verify all dependencies of target module are currently active
  if (willEnable) {
    const missing = mod.dependencies.filter((depId) => !activeModuleIds.includes(depId));
    if (missing.length > 0) {
      const missingNames = missing.map((id) => MASTER_MODULES[id]?.name || id).join(', ');
      return {
        allowed: false,
        reason: `Cannot enable "${mod.name}". It requires the following prerequisite module(s): ${missingNames}.`,
      };
    }
  }

  // When disabling: verify no currently active modules depend on this module
  if (!willEnable) {
    const blocking = activeModuleIds.filter((activeId) => {
      const activeMod = MASTER_MODULES[activeId];
      return activeMod && activeMod.dependencies.includes(targetModuleId);
    });

    if (blocking.length > 0) {
      const blockingNames = blocking.map((id) => MASTER_MODULES[id]?.name || id).join(', ');
      return {
        allowed: false,
        reason: `Cannot disable "${mod.name}" while the following active module(s) depend on it: ${blockingNames}. Please disable them first.`,
        blockingDependents: blocking,
      };
    }
  }

  return { allowed: true };
}

/**
 * Checks if a module is natively recommended for an industry category.
 */
export function isModuleRecommendedForIndustry(moduleId: string, industrySlug: string): boolean {
  const mod = MASTER_MODULES[moduleId];
  if (!mod || !mod.recommendedFor) return false;
  return mod.recommendedFor.includes(industrySlug);
}
