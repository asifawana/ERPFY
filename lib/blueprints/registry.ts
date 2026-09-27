/**
 * ERPfy.net — Business Category ERP Blueprint Registry
 * Authority: ERPfy.net Complete Implementation Master Specification (§3, §4, §5, §8)
 *
 * Implements the architecture:
 * Business Category -> ERP Blueprint -> Modules + Permissions + Dashboard Widgets + Workflows + Reports
 */

import type {
  BlueprintModuleConfig,
  ERPBlueprint,
  CategoryTemplateSummary,
} from './types';

/* ------------------------------------------------------------------ *
 * Reusable Standard Modular Building Blocks
 * ------------------------------------------------------------------ */

const M_DASHBOARD: BlueprintModuleConfig = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'Home',
  href: '/c/:slug',
  group: '',
  description: 'Executive workspace overview, operational KPIs and activity stream.',
  required: true,
};

const M_PRODUCTS: BlueprintModuleConfig = {
  id: 'products',
  label: 'Products',
  icon: 'Package',
  href: '/c/:slug/products',
  group: 'Catalog',
  description: 'Product catalog management, pricing, SKU barcodes, and variants.',
};

const M_INVENTORY: BlueprintModuleConfig = {
  id: 'inventory',
  label: 'Inventory',
  icon: 'Layers',
  href: '/c/:slug/inventory',
  group: 'Operations',
  description: 'Multi-location stock levels, stock movement history, adjustments, and reorder levels.',
  dependencies: ['products'],
  soon: true,
};

const M_PURCHASES: BlueprintModuleConfig = {
  id: 'purchases',
  label: 'Purchases',
  icon: 'ClipboardList',
  href: '/c/:slug/purchases',
  group: 'Operations',
  description: 'Purchase orders, vendor bills, and goods receiving notes (GRN).',
  dependencies: ['suppliers'],
  soon: true,
};

const M_SUPPLIERS: BlueprintModuleConfig = {
  id: 'suppliers',
  label: 'Suppliers',
  icon: 'Briefcase',
  href: '/c/:slug/suppliers',
  group: 'Operations',
  description: 'Supplier directory, vendor terms, lead times, and performance.',
  soon: true,
};

const M_SALES: BlueprintModuleConfig = {
  id: 'sales',
  label: 'Sales Orders',
  icon: 'Receipt',
  href: '/c/:slug/sales',
  group: 'Sales',
  description: 'Quotations, sales orders, customer delivery notes, and invoices.',
  dependencies: ['products', 'customers'],
  soon: true,
};

const M_ORDERS: BlueprintModuleConfig = {
  id: 'orders',
  label: 'Orders',
  icon: 'ClipboardList',
  href: '/c/:slug/orders',
  group: 'Sales',
  description: 'Real-time order lifecycle, fulfillment stages, and tracking.',
};

const M_CUSTOMERS: BlueprintModuleConfig = {
  id: 'customers',
  label: 'Customers',
  icon: 'Users',
  href: '/c/:slug/customers',
  group: 'Sales',
  description: 'Customer directory, contact profiles, credit limits, and purchase histories.',
};

const M_POS: BlueprintModuleConfig = {
  id: 'pos',
  label: 'POS Terminal',
  icon: 'Store',
  href: '/c/:slug/pos',
  group: 'Sales',
  description: 'Rapid point-of-sale checkout, barcode scanning, cash drawer, and receipt printing.',
  dependencies: ['products'],
  soon: true,
};

const M_ECOMMERCE: BlueprintModuleConfig = {
  id: 'ecommerce',
  label: 'Online Store',
  icon: 'Globe',
  href: '/c/:slug/store',
  group: 'Sales',
  description: 'Public ecommerce storefront, web catalogs, cart, and digital checkout.',
  dependencies: ['products'],
  soon: true,
};

const M_ACCOUNTING: BlueprintModuleConfig = {
  id: 'accounting',
  label: 'Accounting',
  icon: 'Calculator',
  href: '/c/:slug/accounting',
  group: 'Finance',
  description: 'General ledger, charts of accounts, journals, AP/AR, and tax returns.',
  soon: true,
};

const M_HR: BlueprintModuleConfig = {
  id: 'hr',
  label: 'HR & Staff',
  icon: 'Users',
  href: '/c/:slug/hr',
  group: 'HR',
  description: 'Employee profiles, role allocations, attendance tracking, and payroll.',
  soon: true,
};

const M_CRM: BlueprintModuleConfig = {
  id: 'crm',
  label: 'CRM',
  icon: 'Users',
  href: '/c/:slug/crm',
  group: 'Sales',
  description: 'Lead pipeline, interaction timeline, customer segmentation, and deal tracking.',
  soon: true,
};

const M_ANALYTICS: BlueprintModuleConfig = {
  id: 'analytics',
  label: 'Analytics',
  icon: 'ChartColumn',
  href: '/c/:slug/analytics',
  group: 'Reports',
  description: 'Visual analytics, revenue breakdowns, top selling goods, and trends.',
};

const M_REPORTS: BlueprintModuleConfig = {
  id: 'reports',
  label: 'Reports',
  icon: 'PieChart',
  href: '/c/:slug/reports',
  group: 'Reports',
  description: 'Audit-ready financial statements, tax ledgers, and operational exports.',
  soon: true,
};

/* Specialty Category Modules */

const M_IMEI: BlueprintModuleConfig = {
  id: 'imei',
  label: 'IMEI & Serials',
  icon: 'Shield',
  href: '/c/:slug/imei',
  group: 'Operations',
  description: 'Individual device tracking by unique 15-digit IMEI or manufacturer serial number.',
  dependencies: ['products'],
  soon: true,
};

const M_WARRANTY: BlueprintModuleConfig = {
  id: 'warranty',
  label: 'Warranty Claims',
  icon: 'Shield',
  href: '/c/:slug/warranty',
  group: 'After Sales',
  description: 'Warranty registration, duration tracking, claim approvals, and manufacturer RMA.',
  dependencies: ['products'],
  soon: true,
};

const M_REPAIRS: BlueprintModuleConfig = {
  id: 'repairs',
  label: 'Device Repairs',
  icon: 'Settings',
  href: '/c/:slug/repairs',
  group: 'After Sales',
  description: 'Repair ticketing, hardware diagnostics, technician job cards, and repair estimates.',
  soon: true,
};

const M_RECIPES: BlueprintModuleConfig = {
  id: 'recipes',
  label: 'Recipes & BOM',
  icon: 'FileSpreadsheet',
  href: '/c/:slug/recipes',
  group: 'Catalog',
  description: 'Menu item recipe formulation, ingredient portioning, and live food costing.',
  dependencies: ['products'],
  soon: true,
};

const M_TABLES: BlueprintModuleConfig = {
  id: 'tables',
  label: 'Table Management',
  icon: 'Landmark',
  href: '/c/:slug/tables',
  group: 'Operations',
  description: 'Dine-in floor plan, active table status, seating capacity, and table transfers.',
  soon: true,
};

const M_KOT: BlueprintModuleConfig = {
  id: 'kot',
  label: 'Kitchen Orders (KOT)',
  icon: 'ClipboardList',
  href: '/c/:slug/kitchen',
  group: 'Operations',
  description: 'Kitchen Display System (KDS), digital kitchen order tickets, and preparation routing.',
  soon: true,
};

const M_BATCHES: BlueprintModuleConfig = {
  id: 'batches',
  label: 'Batches & Lots',
  icon: 'Layers',
  href: '/c/:slug/batches',
  group: 'Operations',
  description: 'Batch manufacture numbers, lot allocation, and end-to-end supply chain traceability.',
  dependencies: ['products'],
  soon: true,
};

const M_EXPIRY: BlueprintModuleConfig = {
  id: 'expiry',
  label: 'Expiry Alerts',
  icon: 'Shield',
  href: '/c/:slug/expiry',
  group: 'Operations',
  description: 'First-Expiry-First-Out (FEFO) picking, automated expiry countdowns, and disposal audits.',
  dependencies: ['batches'],
  soon: true,
};

const M_PRESCRIPTIONS: BlueprintModuleConfig = {
  id: 'prescriptions',
  label: 'Prescriptions',
  icon: 'FileSpreadsheet',
  href: '/c/:slug/prescriptions',
  group: 'Operations',
  description: 'Doctor prescription verification, regulated drug dispensing, and dosage logs.',
  soon: true,
};

const M_BOM: BlueprintModuleConfig = {
  id: 'bom',
  label: 'Bill of Materials',
  icon: 'FileSpreadsheet',
  href: '/c/:slug/bom',
  group: 'Production',
  description: 'Multi-level Bill of Materials (BOM), assembly trees, and production costing.',
  dependencies: ['products'],
  soon: true,
};

const M_PRODUCTION: BlueprintModuleConfig = {
  id: 'production',
  label: 'Work Orders',
  icon: 'Layers',
  href: '/c/:slug/production',
  group: 'Production',
  description: 'Manufacturing work orders, shop floor scheduling, scrap logs, and progress stages.',
  dependencies: ['bom'],
  soon: true,
};

const M_QUALITY: BlueprintModuleConfig = {
  id: 'quality',
  label: 'Quality Control',
  icon: 'Shield',
  href: '/c/:slug/quality',
  group: 'Production',
  description: 'Quality inspection checklists, batch pass/fail criteria, and defect logging.',
  soon: true,
};

const M_PROJECTS: BlueprintModuleConfig = {
  id: 'projects',
  label: 'Projects & Tasks',
  icon: 'Briefcase',
  href: '/c/:slug/projects',
  group: 'Operations',
  description: 'Client projects, milestone tracking, resource allocations, and Gantt schedules.',
  soon: true,
};

const M_TIME_TRACKING: BlueprintModuleConfig = {
  id: 'time-tracking',
  label: 'Time Tracking',
  icon: 'ClipboardList',
  href: '/c/:slug/timesheets',
  group: 'Operations',
  description: 'Employee timesheet logging, billable hour tracking, and rate calculators.',
  soon: true,
};

const M_INVOICING: BlueprintModuleConfig = {
  id: 'invoicing',
  label: 'Invoicing',
  icon: 'Receipt',
  href: '/c/:slug/invoices',
  group: 'Finance',
  description: 'Progress billing, recurring subscriptions, invoice PDFs, and online payments.',
  soon: true,
};

const M_PATIENTS: BlueprintModuleConfig = {
  id: 'patients',
  label: 'Patients',
  icon: 'Users',
  href: '/c/:slug/patients',
  group: 'Operations',
  description: 'Patient electronic health records (EHR), medical histories, and vitals.',
  soon: true,
};

const M_APPOINTMENTS: BlueprintModuleConfig = {
  id: 'appointments',
  label: 'Appointments',
  icon: 'ClipboardList',
  href: '/c/:slug/appointments',
  group: 'Operations',
  description: 'Booking calendar, provider schedules, appointment reminders, and queue management.',
  soon: true,
};

const M_WAREHOUSES: BlueprintModuleConfig = {
  id: 'warehouses',
  label: 'Warehouses',
  icon: 'Layers',
  href: '/c/:slug/warehouses',
  group: 'Operations',
  description: 'Multi-warehouse bin locations, inter-branch stock transfers, and zone audits.',
  dependencies: ['inventory'],
  soon: true,
};

const M_FLEET: BlueprintModuleConfig = {
  id: 'fleet',
  label: 'Fleet Management',
  icon: 'Briefcase',
  href: '/c/:slug/fleet',
  group: 'Operations',
  description: 'Vehicle registry, driver assignments, route manifests, fuel logs, and maintenance.',
  soon: true,
};

const M_SHIPMENTS: BlueprintModuleConfig = {
  id: 'shipments',
  label: 'Shipments',
  icon: 'Package',
  href: '/c/:slug/shipments',
  group: 'Operations',
  description: 'Dispatch manifests, courier consignments, tracking numbers, and proof of delivery.',
  soon: true,
};

const M_VARIANTS: BlueprintModuleConfig = {
  id: 'variants',
  label: 'Variants Matrix',
  icon: 'Package',
  href: '/c/:slug/variants',
  group: 'Catalog',
  description: 'Multi-attribute matrix (Size, Color, Material, Fit) with independent barcode/SKUs.',
  dependencies: ['products'],
  soon: true,
};

const M_COLLECTIONS: BlueprintModuleConfig = {
  id: 'collections',
  label: 'Collections',
  icon: 'Layers',
  href: '/c/:slug/collections',
  group: 'Catalog',
  description: 'Merchandise collections, category hierarchies, and seasonal lookbooks.',
  soon: true,
};

const M_JOB_CARDS: BlueprintModuleConfig = {
  id: 'job-cards',
  label: 'Job Cards',
  icon: 'ClipboardList',
  href: '/c/:slug/jobs',
  group: 'Operations',
  description: 'Workshop job cards, mechanic labor allocation, parts usage, and sign-offs.',
  soon: true,
};

const M_LISTINGS: BlueprintModuleConfig = {
  id: 'listings',
  label: 'Property Listings',
  icon: 'Landmark',
  href: '/c/:slug/listings',
  group: 'Operations',
  description: 'Real estate portfolio, residential/commercial units, floor plans, and amenities.',
  soon: true,
};

const M_TENANTS: BlueprintModuleConfig = {
  id: 'tenants',
  label: 'Tenants & Leases',
  icon: 'Users',
  href: '/c/:slug/tenants',
  group: 'Operations',
  description: 'Tenant lease contracts, rent renewal schedules, security deposits, and evictions.',
  soon: true,
};

const M_SERVICES: BlueprintModuleConfig = {
  id: 'services',
  label: 'Services',
  icon: 'Package',
  href: '/c/:slug/services',
  group: 'Catalog',
  description: 'Service packages, hourly treatments, chair allocations, and staff commissions.',
  soon: true,
};

/* ------------------------------------------------------------------ *
 * Complete 25+ Production-Grade Blueprints
 * ------------------------------------------------------------------ */

export const BLUEPRINTS: Record<string, ERPBlueprint> = {
  /* 1. Mobile Shop & Electronics */
  'mobile-shop': {
    slug: 'mobile-shop',
    name: 'Mobile Shop & Device ERP',
    sectorSlug: 'retail-ecommerce',
    summary: 'Tailored for smartphone retailers, gadget stores, and warranty service centers.',
    description: 'Comprehensive mobile device management featuring 15-digit IMEI tracking, manufacturer warranty verification, technician job cards, fast POS checkout, and accessory inventory.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Devices & Accessories' },
      M_IMEI,
      M_INVENTORY,
      M_WARRANTY,
      M_REPAIRS,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_POS,
      M_ECOMMERCE,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Devices & Goods' },
    defaultWidgets: ['kpi-revenue', 'kpi-orders', 'kpi-stock', 'imei-devices', 'open-repairs', 'recent-orders'],
    recommendedApps: ['erpfy.whatsapp', 'erpfy.pos-receipt', 'erpfy.sms-gateway'],
    recommendedTheme: 'portal-electronics',
    workflows: ['IMEI scanning upon receipt', 'Customer device intake with job card', 'Warranty verification on return'],
    reports: ['IMEI Movement Audit', 'Technician Repair Efficiency', 'Accessory Margin Analysis'],
  },

  /* 2. Restaurant & Food Service */
  'restaurant-operations': {
    slug: 'restaurant-operations',
    name: 'Restaurant & Dining ERP',
    sectorSlug: 'hospitality-food',
    summary: 'Purpose-built for dine-in restaurants, cafes, fast food, and food outlets.',
    description: 'Complete culinary operations management with food recipes and ingredient portioning, table layouts, live Kitchen Order Tickets (KOT/KDS), waiter ordering, and fast POS.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Menu Items', description: 'Menu item catalog with course categories, modifiers, and dish pricing.' },
      M_RECIPES,
      M_TABLES,
      M_KOT,
      M_INVENTORY,
      M_ORDERS,
      M_POS,
      M_CUSTOMERS,
      M_PURCHASES,
      M_SUPPLIERS,
      { ...M_HR, label: 'Waiters & Kitchen Staff' },
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Menu Items', 'HR & Staff': 'Staff' },
    defaultWidgets: ['kpi-revenue', 'active-tables', 'live-kot', 'kpi-orders', 'recent-orders'],
    recommendedApps: ['erpfy.kot-printer', 'erpfy.table-qr-menu', 'erpfy.food-delivery-api'],
    recommendedTheme: 'portal-restaurant',
    workflows: ['Table reservation & seating', 'Waiter KOT creation to kitchen display', 'Split bill POS payment'],
    reports: ['Dish Popularity & Velocity', 'Food Ingredient Variance Report', 'Hourly Table Turnover'],
  },

  /* 3. Pharmacy & Healthcare Retail */
  'pharmacy': {
    slug: 'pharmacy',
    name: 'Pharmacy & Drugstore ERP',
    sectorSlug: 'healthcare-pharmaceuticals',
    summary: 'Engineered for pharmacies, dispensaries, and medical distribution.',
    description: 'Compliant pharmaceutical management featuring batch and lot tracking, automated drug expiration alerts, FEFO dispatch, doctor prescription dispensing, and medicine catalogs.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Medicines & Supplies' },
      M_BATCHES,
      M_EXPIRY,
      M_PRESCRIPTIONS,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_CUSTOMERS,
      M_POS,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Medicines' },
    defaultWidgets: ['kpi-revenue', 'expiring-batches', 'low-stock-medicines', 'kpi-orders', 'recent-orders'],
    recommendedApps: ['erpfy.prescription-ocr', 'erpfy.drug-interaction-checker'],
    recommendedTheme: 'portal-pharmacy',
    workflows: ['Batch allocation on goods receipt', 'Prescription validation before POS sale', 'FEFO automated batch rotation'],
    reports: ['Expiring Stock in 30/60/90 Days', 'Controlled Substances Ledger', 'Vendor Batch Recall Audit'],
  },

  /* 4. General Retail Store */
  'general-retail': {
    slug: 'general-retail',
    name: 'Retail Store & POS ERP',
    sectorSlug: 'retail-ecommerce',
    summary: 'The universal retail standard for convenience, supermarket, and department stores.',
    description: 'Comprehensive store retail management with barcode scanning, cashier POS shifts, inventory stock takes, customer loyalty programs, multi-channel ecommerce, and profit tracking.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_POS,
      M_ECOMMERCE,
      M_ACCOUNTING,
      M_HR,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: {},
    defaultWidgets: ['kpi-revenue', 'kpi-orders', 'kpi-stock', 'recent-orders', 'top-products'],
    recommendedApps: ['erpfy.barcode-generator', 'erpfy.customer-loyalty', 'erpfy.whatsapp'],
    recommendedTheme: 'portal-default',
    workflows: ['Goods receiving to shelves', 'Cashier shift open & close reconciliation', 'End of day Z-Report'],
    reports: ['Daily POS Sales Summary', 'Fast vs Slow Moving Products', 'Gross Profit by Category'],
  },

  /* 5. Fashion & Apparel */
  'fashion-apparel': {
    slug: 'fashion-apparel',
    name: 'Fashion & Apparel ERP',
    sectorSlug: 'retail-ecommerce',
    summary: 'Designed for clothing brands, footwear outlets, and boutique retail.',
    description: 'Matrix variant management across sizes, colors, and materials with seasonal collections, boutique POS, online store synchronization, and returned stock inspection.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Apparel & Footwear' },
      M_VARIANTS,
      M_COLLECTIONS,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_POS,
      M_ECOMMERCE,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Apparel' },
    defaultWidgets: ['kpi-revenue', 'kpi-orders', 'top-products', 'kpi-stock', 'recent-orders'],
    recommendedApps: ['erpfy.size-charts', 'erpfy.instagram-feed', 'erpfy.whatsapp'],
    recommendedTheme: 'portal-fashion',
    workflows: ['Matrix product generation (S/M/L x Black/White)', 'Seasonal collection release', 'Storefront order fulfillment'],
    reports: ['Size/Color Variant Velocity', 'Markdown Discount Performance', 'Sell-Through Rate by Season'],
  },

  /* 6. Grocery & Supermarket */
  'grocery-supermarket': {
    slug: 'grocery-supermarket',
    name: 'Grocery & Supermarket ERP',
    sectorSlug: 'retail-ecommerce',
    summary: 'High-speed operations for supermarkets, grocery stores, and food markets.',
    description: 'High-volume barcode scanning, weighing scale integration, perishable goods expiry tracking, bulk vendor receiving, multi-cashier POS lane control, and customer rewards.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_INVENTORY,
      M_BATCHES,
      M_EXPIRY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_POS,
      M_ECOMMERCE,
      M_ACCOUNTING,
      M_HR,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: {},
    defaultWidgets: ['kpi-revenue', 'kpi-orders', 'kpi-stock', 'expiring-batches', 'recent-orders'],
    recommendedApps: ['erpfy.weighing-scale-connector', 'erpfy.shelf-label-printer'],
    recommendedTheme: 'portal-grocery',
    workflows: ['Daily perishables price check', 'Cashier lane multi-terminal POS', 'Supplier bulk goods GRN'],
    reports: ['Perishable Waste & Shrinkage', 'Cashier Lane Throughput', 'Weekly Grocery Basket Size'],
  },

  /* 7. Manufacturing & Assembly */
  'discrete-manufacturing': {
    slug: 'discrete-manufacturing',
    name: 'Manufacturing & Assembly ERP',
    sectorSlug: 'manufacturing-industrial',
    summary: 'Factory floor operations for equipment, machinery, and finished goods producers.',
    description: 'Multi-level Bill of Materials (BOM), production work orders, raw material stage tracking, quality inspection checklists, machine scrap accounting, and supply chain purchasing.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_BOM,
      M_PRODUCTION,
      M_QUALITY,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_ACCOUNTING,
      M_HR,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Products & Finished Goods' },
    defaultWidgets: ['kpi-revenue', 'active-work-orders', 'raw-material-levels', 'kpi-stock', 'recent-orders'],
    recommendedApps: ['erpfy.mrp-planner', 'erpfy.iot-machine-feed'],
    recommendedTheme: 'portal-industrial',
    workflows: ['Work order generation from Sales Order', 'Raw material requisition from stock', 'Quality inspection sign-off'],
    reports: ['Production Cost Variance', 'Machine & Labor Efficiency', 'BOM Scrap & Waste Percentage'],
  },

  /* 8. Process Manufacturing (Food, Chemical, Pharma) */
  'process-manufacturing': {
    slug: 'process-manufacturing',
    name: 'Process Manufacturing ERP',
    sectorSlug: 'manufacturing-industrial',
    summary: 'Batch formula management for food, chemicals, cosmetics, and paints.',
    description: 'Recipe formulas, batch yield calculations, quality lab testing parameters, lot-based traceability, raw material quarantine, and production order execution.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_RECIPES,
      M_BOM,
      M_PRODUCTION,
      M_BATCHES,
      M_QUALITY,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Batches & Formulations' },
    defaultWidgets: ['kpi-revenue', 'active-work-orders', 'batch-yields', 'kpi-stock', 'recent-orders'],
    recommendedApps: ['erpfy.lab-qc-integration', 'erpfy.formula-costing'],
    recommendedTheme: 'portal-industrial',
    workflows: ['Formula blending calculation', 'Batch quarantine and lab release', 'Yield variance logging'],
    reports: ['Batch Traceability Tree', 'Formula Actual vs Expected Yield', 'COA (Certificate of Analysis) Audit'],
  },

  /* 9. Wholesale Trading & Import/Export */
  'wholesale-trading': {
    slug: 'wholesale-trading',
    name: 'Wholesale & B2B Trading ERP',
    sectorSlug: 'wholesale-distribution',
    summary: 'Engineered for B2B merchants, distributors, and bulk importers.',
    description: 'Multi-tier customer pricing, credit term limits, bulk purchase orders, container consignment tracking, multi-warehouse storage, and commercial tax invoicing.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_INVENTORY,
      M_WAREHOUSES,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_ACCOUNTING,
      M_HR,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'B2B Buyers' },
    defaultWidgets: ['kpi-revenue', 'kpi-orders', 'kpi-stock', 'top-products', 'recent-orders'],
    recommendedApps: ['erpfy.b2b-portal', 'erpfy.customs-clearance'],
    recommendedTheme: 'portal-wholesale',
    workflows: ['Volume discount price tier check', 'Credit limit check on sales quotation', 'Warehouse dispatch note'],
    reports: ['Customer Aging Ledger (30/60/90 Days)', 'Warehouse Pallet Utilization', 'Gross Margin by Sales Rep'],
  },

  /* 10. Distribution & Fleet Logistics */
  'distribution-networks': {
    slug: 'distribution-networks',
    name: 'Distribution & Logistics ERP',
    sectorSlug: 'wholesale-distribution',
    summary: 'Multi-branch logistics, delivery routes, and fleet dispatch.',
    description: 'Fleet vehicle management, route manifests, driver assignments, inter-warehouse transfers, delivery confirmation, and transport cost accounting.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_INVENTORY,
      M_WAREHOUSES,
      M_FLEET,
      M_SHIPMENTS,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_ACCOUNTING,
      M_HR,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Retail Outlets & Dealers' },
    defaultWidgets: ['kpi-revenue', 'active-deliveries', 'fleet-status', 'kpi-stock', 'recent-orders'],
    recommendedApps: ['erpfy.gps-tracker', 'erpfy.proof-of-delivery-mobile'],
    recommendedTheme: 'portal-logistics',
    workflows: ['Order consolidation into route manifest', 'Vehicle loading and dispatch', 'Driver POD digital signature'],
    reports: ['Fleet Cost per Kilometer', 'On-Time Delivery Rate', 'Route Fuel Efficiency'],
  },

  /* 11. Automotive Parts & Workshop */
  'parts-workshop': {
    slug: 'parts-workshop',
    name: 'Auto Parts & Workshop ERP',
    sectorSlug: 'automotive-transport',
    summary: 'Automotive spare parts inventory and vehicle maintenance repair bays.',
    description: 'Automotive parts cross-referencing by OEM numbers, mechanic job cards, vehicle service records, labor times, over-the-counter POS, and warranty replacement.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Auto Parts' },
      M_JOB_CARDS,
      M_REPAIRS,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_CUSTOMERS,
      M_POS,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Spare Parts' },
    defaultWidgets: ['kpi-revenue', 'open-job-cards', 'kpi-orders', 'kpi-stock', 'recent-orders'],
    recommendedApps: ['erpfy.vin-decoder', 'erpfy.sms-service-reminder'],
    recommendedTheme: 'portal-automotive',
    workflows: ['Vehicle arrival & inspection checklist', 'Mechanic parts issuance against Job Card', 'Job card sign-off & invoice'],
    reports: ['Mechanic Billable Hours', 'Top Replaced Parts', 'Customer Next-Service Due List'],
  },

  /* 12. Clinics & Medical Practices */
  'clinics': {
    slug: 'clinics',
    name: 'Clinic & Medical Practice ERP',
    sectorSlug: 'healthcare-pharmaceuticals',
    summary: 'Clinical scheduling, patient records, and outpatient consultation billing.',
    description: 'Patient electronic records, doctor appointment scheduling, procedure billing, clinical supplies inventory, and staff doctor commission calculations.',
    modules: [
      M_DASHBOARD,
      M_PATIENTS,
      M_APPOINTMENTS,
      { ...M_PRODUCTS, label: 'Medical Supplies' },
      M_INVENTORY,
      M_INVOICING,
      { ...M_HR, label: 'Doctors & Nurses' },
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Patients', Products: 'Supplies' },
    defaultWidgets: ['kpi-revenue', 'today-appointments', 'patient-queue', 'recent-orders'],
    recommendedApps: ['erpfy.telehealth-video', 'erpfy.whatsapp-appointment-bot'],
    recommendedTheme: 'portal-healthcare',
    workflows: ['Patient appointment check-in', 'Doctor electronic note & prescription', 'Consultation fee billing'],
    reports: ['Daily Patient Inflow', 'Doctor Consultation Earnings', 'No-Show Rate'],
  },

  /* 13. Professional Services & Consulting */
  'consulting': {
    slug: 'consulting',
    name: 'Consulting & Professional Services ERP',
    sectorSlug: 'professional-technical-services',
    summary: 'Client engagements, billable hour tracking, and project progress milestones.',
    description: 'Client relationship management, project task delegation, timesheet capture, milestone-based invoicing, expense management, and consultant profitability.',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Clients' },
      M_PROJECTS,
      M_TIME_TRACKING,
      M_INVOICING,
      { ...M_HR, label: 'Consultants & Staff' },
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Clients', 'HR & Staff': 'Team' },
    defaultWidgets: ['kpi-revenue', 'active-projects', 'billable-hours', 'recent-orders'],
    recommendedApps: ['erpfy.jira-bridge', 'erpfy.esignature-contracts'],
    recommendedTheme: 'portal-services',
    workflows: ['Project scope & milestone agreement', 'Weekly employee timesheet approval', 'Milestone invoice generation'],
    reports: ['Project Margin & Burn Rate', 'Consultant Utilization Rate', 'Unbilled WIP (Work in Progress)'],
  },

  /* 14. Real Estate & Property Management */
  'property-management': {
    slug: 'property-management',
    name: 'Real Estate & Property ERP',
    sectorSlug: 'real-estate-property',
    summary: 'Residential and commercial rental properties, leases, and tenant rent roll.',
    description: 'Property unit directory, tenant lease contracts, automated rent generation, maintenance tickets, owner statement settlements, and security deposit management.',
    modules: [
      M_DASHBOARD,
      M_LISTINGS,
      M_TENANTS,
      M_INVOICING,
      M_PROJECTS,
      { ...M_HR, label: 'Agents & Property Managers' },
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Tenants', Products: 'Units' },
    defaultWidgets: ['kpi-revenue', 'occupancy-rate', 'pending-rent-collection', 'recent-orders'],
    recommendedApps: ['erpfy.tenant-portal', 'erpfy.digital-lease-signature'],
    recommendedTheme: 'portal-realestate',
    workflows: ['Unit inspection & lease signing', 'Automated first of month rent invoice', 'Maintenance request assignment'],
    reports: ['Property Occupancy Rate', 'Rent Arrears Aging', 'Property Net Operating Income (NOI)'],
  },

  /* 15. Construction & Building Contractors */
  'building-construction': {
    slug: 'building-construction',
    name: 'Construction & Contracting ERP',
    sectorSlug: 'construction-trades',
    summary: 'Job costing, sub-contractors, equipment inventory, and progress certificates.',
    description: 'Contractor project tracking, Bill of Quantities (BOQ), site raw material requisitions, subcontractor billing, architect progress certificates, and equipment rentals.',
    modules: [
      M_DASHBOARD,
      M_PROJECTS,
      { ...M_PRODUCTS, label: 'Building Materials' },
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      { ...M_CUSTOMERS, label: 'Project Owners & Clients' },
      M_INVOICING,
      { ...M_HR, label: 'Engineers & Laborers' },
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Materials', Customers: 'Project Owners' },
    defaultWidgets: ['kpi-revenue', 'active-construction-sites', 'material-requisitions', 'recent-orders'],
    recommendedApps: ['erpfy.site-attendance-biometric', 'erpfy.cad-drawing-viewer'],
    recommendedTheme: 'portal-construction',
    workflows: ['Site material requisition & delivery', 'Labor attendance logging', 'Progress certificate billing'],
    reports: ['Project Actual vs Budget Variance', 'Subcontractor Retention Monies', 'Site Material Consumption'],
  },

  /* 16. Salon, Spa & Wellness */
  'salon-spa': {
    slug: 'salon-spa',
    name: 'Salon & Wellness Spa ERP',
    sectorSlug: 'personal-care-services',
    summary: 'Treatment appointments, stylist commissions, and retail product sales.',
    description: 'Service appointment book, stylist chair scheduling, retail beauty products inventory, package memberships, fast checkout POS, and stylist commission calculations.',
    modules: [
      M_DASHBOARD,
      M_SERVICES,
      M_APPOINTMENTS,
      { ...M_PRODUCTS, label: 'Retail Products' },
      M_INVENTORY,
      M_POS,
      M_CUSTOMERS,
      { ...M_HR, label: 'Stylists & Therapists' },
      M_INVOICING,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Clients' },
    defaultWidgets: ['kpi-revenue', 'today-appointments', 'stylist-occupancy', 'recent-orders'],
    recommendedApps: ['erpfy.whatsapp-booking', 'erpfy.gift-cards'],
    recommendedTheme: 'portal-beauty',
    workflows: ['Client appointment booking', 'Service completion & retail product add-on', 'Checkout with stylist commission'],
    reports: ['Stylist Revenue & Commission', 'Client Rebooking Rate', 'Retail vs Service Revenue Share'],
  },

  /* 17. Agriculture, Farms & Seed Production */
  'crop-farming': {
    slug: 'crop-farming',
    name: 'Agriculture & Farm Operations ERP',
    sectorSlug: 'agriculture-food-supply',
    summary: 'Crop seasonal planning, field parcel yields, seed/fertilizer inputs, and harvest sales.',
    description: 'Field land parcel allocation, seasonal crop budgets, seed and fertilizer input consumption, harvest yield tracking, commodity buyer sales, and farm machinery management.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Crops & Produce' },
      M_BATCHES,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_CUSTOMERS,
      M_ACCOUNTING,
      { ...M_HR, label: 'Farm Labor' },
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Products: 'Produce', Customers: 'Commodity Buyers' },
    defaultWidgets: ['kpi-revenue', 'harvest-yields', 'fertilizer-stock', 'recent-orders'],
    recommendedApps: ['erpfy.weather-forecast', 'erpfy.soil-sensor-integration'],
    recommendedTheme: 'portal-agriculture',
    workflows: ['Field planting & input recording', 'Harvest lot weighing & grading', 'Bulk buyer delivery & payment'],
    reports: ['Crop Yield per Acre', 'Seasonal Input Cost Analysis', 'Field Parcel Profitability'],
  },

  /* 18. Education & Academy */
  'schools': {
    slug: 'schools',
    name: 'School & Academy ERP',
    sectorSlug: 'education-training',
    summary: 'Student admissions, term fee schedules, academic schedules, and staff payroll.',
    description: 'Student registration records, tuition fee invoicing, attendance tracking, classroom book and stationery inventory, teacher payroll, and parent communication.',
    modules: [
      M_DASHBOARD,
      { ...M_CUSTOMERS, label: 'Students & Parents' },
      M_INVOICING,
      { ...M_HR, label: 'Teachers & Staff' },
      { ...M_PRODUCTS, label: 'Books & Uniforms' },
      M_INVENTORY,
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Students', Products: 'Books & Supplies' },
    defaultWidgets: ['kpi-revenue', 'pending-fees', 'student-enrolment', 'recent-orders'],
    recommendedApps: ['erpfy.parent-portal', 'erpfy.sms-attendance-alert'],
    recommendedTheme: 'portal-education',
    workflows: ['Student admission & fee schedule assignment', 'Monthly fee generation', 'Parent fee collection'],
    reports: ['Fee Defaulter Aging List', 'Term Revenue vs Operating Costs', 'Teacher Attendance Ledger'],
  },

  /* 19. Hotel & Accommodation */
  'accommodation': {
    slug: 'accommodation',
    name: 'Hotel & Hospitality ERP',
    sectorSlug: 'hospitality-food',
    summary: 'Room reservation calendar, guest check-in, minibar billing, and housekeeping.',
    description: 'Room inventory, reservation booking engine, guest folio accounts, housekeeping status, restaurant POS charges to room, and night audit reporting.',
    modules: [
      M_DASHBOARD,
      { ...M_PRODUCTS, label: 'Rooms & Packages' },
      M_CUSTOMERS,
      M_ORDERS,
      M_INVOICING,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      { ...M_HR, label: 'Hotel Staff' },
      M_ACCOUNTING,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: { Customers: 'Guests', Products: 'Rooms' },
    defaultWidgets: ['kpi-revenue', 'room-occupancy', 'today-checkins', 'recent-orders'],
    recommendedApps: ['erpfy.channel-manager', 'erpfy.keycard-encoder'],
    recommendedTheme: 'portal-hospitality',
    workflows: ['Guest booking & advance deposit', 'Check-in & room key issuance', 'Folio checkout & final bill'],
    reports: ['Average Daily Rate (ADR)', 'Revenue Per Available Room (RevPAR)', 'Occupancy Percentage'],
  },

  /* 20. Default Standard ERP (Fallback) */
  'default-standard': {
    slug: 'default-standard',
    name: 'Standard Business ERP',
    sectorSlug: 'general-business',
    summary: 'Balanced operational configuration suitable for multi-activity commercial businesses.',
    description: 'Foundational ERP suite equipped with products, inventory, sales orders, purchase management, suppliers, CRM, customer accounts, and financial accounting.',
    modules: [
      M_DASHBOARD,
      M_PRODUCTS,
      M_INVENTORY,
      M_PURCHASES,
      M_SUPPLIERS,
      M_SALES,
      M_ORDERS,
      M_CUSTOMERS,
      M_POS,
      M_ACCOUNTING,
      M_HR,
      M_CRM,
      M_ANALYTICS,
      M_REPORTS,
    ],
    terminology: {},
    defaultWidgets: ['kpi-revenue', 'kpi-orders', 'kpi-stock', 'top-products', 'recent-orders'],
    recommendedApps: ['erpfy.whatsapp', 'erpfy.pdf-invoicer'],
    recommendedTheme: 'portal-default',
    workflows: ['Catalog setup', 'Purchase to stock', 'Order to invoice'],
    reports: ['Sales Summary', 'Inventory Valuation', 'Customer Balances'],
  },

  /* 21. Gym, Fitness & Sports Centers */
  'gym-fitness': {
    slug: 'gym-fitness',
    name: 'Gym & Sports Club ERP',
    sectorSlug: 'services-hospitality',
    summary: 'Turnstile access, recurring memberships, trainer bookings, and locker allocation.',
    description: 'Designed for gyms, fitness clubs, and sports complexes with automated subscription renewal and trainer scheduling.',
    modules: [
      M_DASHBOARD,
      M_SERVICES,
      M_APPOINTMENTS,
      M_CUSTOMERS,
      M_INVOICING,
      M_POS,
      M_HR,
      M_ACCOUNTING,
      M_ANALYTICS,
    ],
    terminology: {
      customer: 'Member',
      product: 'Membership Plan',
      order: 'Membership Invoice',
    },
    defaultWidgets: ['kpi-active-members', 'kpi-daily-checkins', 'kpi-trainer-sessions', 'recent-orders'],
    recommendedApps: ['erpfy.whatsapp', 'erpfy.sms-gateway'],
    recommendedTheme: 'portal-default',
    workflows: ['Member onboarding', 'Turnstile access check', 'Recurring billing renewal'],
    reports: ['Member Retention Report', 'Check-In Frequency', 'Trainer Utilization'],
  },

  /* 22. Logistics, Freight & Cargo */
  'logistics-freight': {
    slug: 'logistics-freight',
    name: 'Logistics & Cargo ERP',
    sectorSlug: 'transport-logistics',
    summary: 'Consignment tracking, waybills, fleet dispatch, driver allocations, and freight manifests.',
    description: 'Specialized cargo and courier ERP with multi-stop route dispatch, proof of delivery (POD), and fuel logs.',
    modules: [
      M_DASHBOARD,
      M_FLEET,
      M_WAREHOUSES,
      M_CUSTOMERS,
      M_ORDERS,
      M_INVOICING,
      M_ACCOUNTING,
      M_HR,
      M_REPORTS,
    ],
    terminology: {
      product: 'Consignment',
      customer: 'Shipper / Consignee',
      order: 'Waybill',
    },
    defaultWidgets: ['kpi-active-trips', 'kpi-delayed-shipments', 'kpi-fleet-fuel', 'recent-orders'],
    recommendedApps: ['erpfy.whatsapp', 'erpfy.fleet-telematics'],
    recommendedTheme: 'portal-default',
    workflows: ['Waybill generation', 'Fleet dispatch & manifest', 'Proof of delivery sign-off'],
    reports: ['Fleet Cost Per Kilometer', 'On-Time Delivery Rate', 'Consignment Margin'],
  },
};

/* ------------------------------------------------------------------ *
 * Blueprint Resolver & Helper Functions
 * ------------------------------------------------------------------ */

/**
 * Resolves the exact ERP blueprint for an industry slug with graceful fallbacks.
 */
export function getBlueprint(industrySlug: string, sectorSlug?: string): ERPBlueprint {
  if (industrySlug && BLUEPRINTS[industrySlug]) {
    return BLUEPRINTS[industrySlug];
  }

  // Check alias mappings
  if (industrySlug.includes('mobile') || industrySlug.includes('phone') || industrySlug.includes('device')) {
    return BLUEPRINTS['mobile-shop'];
  }
  if (industrySlug.includes('restaurant') || industrySlug.includes('cafe') || industrySlug.includes('food')) {
    return BLUEPRINTS['restaurant-operations'];
  }
  if (industrySlug.includes('pharma') || industrySlug.includes('drug') || industrySlug.includes('medicine')) {
    return BLUEPRINTS['pharmacy'];
  }
  if (industrySlug.includes('apparel') || industrySlug.includes('fashion') || industrySlug.includes('cloth')) {
    return BLUEPRINTS['fashion-apparel'];
  }
  if (industrySlug.includes('grocery') || industrySlug.includes('supermarket')) {
    return BLUEPRINTS['grocery-supermarket'];
  }
  if (industrySlug.includes('manufactur') || industrySlug.includes('assembly')) {
    return BLUEPRINTS['discrete-manufacturing'];
  }
  if (industrySlug.includes('wholesale') || industrySlug.includes('trading')) {
    return BLUEPRINTS['wholesale-trading'];
  }
  if (industrySlug.includes('logistics') || industrySlug.includes('freight') || industrySlug.includes('distribution')) {
    return BLUEPRINTS['distribution-networks'];
  }
  if (industrySlug.includes('auto') || industrySlug.includes('repair') || industrySlug.includes('workshop')) {
    return BLUEPRINTS['parts-workshop'];
  }
  if (industrySlug.includes('clinic') || industrySlug.includes('health') || industrySlug.includes('hospital')) {
    return BLUEPRINTS['clinics'];
  }
  if (industrySlug.includes('consult') || industrySlug.includes('service')) {
    return BLUEPRINTS['consulting'];
  }
  if (industrySlug.includes('real-estate') || industrySlug.includes('property')) {
    return BLUEPRINTS['property-management'];
  }
  if (industrySlug.includes('construct') || industrySlug.includes('builder')) {
    return BLUEPRINTS['building-construction'];
  }
  if (industrySlug.includes('salon') || industrySlug.includes('spa') || industrySlug.includes('beauty')) {
    return BLUEPRINTS['salon-spa'];
  }
  if (industrySlug.includes('farm') || industrySlug.includes('agri') || industrySlug.includes('crop')) {
    return BLUEPRINTS['crop-farming'];
  }
  if (industrySlug.includes('school') || industrySlug.includes('educat') || industrySlug.includes('academy')) {
    return BLUEPRINTS['schools'];
  }
  if (industrySlug.includes('hotel') || industrySlug.includes('accommodat')) {
    return BLUEPRINTS['accommodation'];
  }

  // Fallback to standard
  return BLUEPRINTS['default-standard'];
}

/**
 * Returns all registered blueprints.
 */
export function listAllBlueprints(): ERPBlueprint[] {
  return Object.values(BLUEPRINTS);
}

export const getAllBlueprints = listAllBlueprints;

/**
 * Returns summary objects suitable for UI selectors and dropdowns.
 */
export function listBlueprintSummaries(): CategoryTemplateSummary[] {
  return Object.values(BLUEPRINTS).map((bp) => ({
    slug: bp.slug,
    name: bp.name,
    sectorSlug: bp.sectorSlug,
    moduleCount: bp.modules.length,
    summary: bp.summary,
  }));
}

/**
 * Resolves active modules for a company, replacing `:slug` and filtering disabled modules.
 */
export function resolveBlueprintModules(
  industrySlug: string,
  sectorSlug: string,
  companySlug: string,
  disabledModuleIds: string[] = [],
): BlueprintModuleConfig[] {
  const blueprint = getBlueprint(industrySlug, sectorSlug);
  const disabledSet = new Set(disabledModuleIds);

  return blueprint.modules
    .filter((m) => !disabledSet.has(m.id))
    .map((m) => ({
      ...m,
      href: m.href.replace(/:slug/g, companySlug),
    }));
}

export { getBlueprint as getBlueprintByCategory };
export type { ERPBlueprint, BlueprintModuleConfig, CategoryTemplateSummary };

