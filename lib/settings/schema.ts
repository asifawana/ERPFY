/**
 * ERPFY settings schema — isomorphic.
 *
 * This module is imported by both the server (lib/core/settings.ts) and the client
 * (lib/account-system-settings.ts), so it must stay free of browser and Worker APIs.
 *
 * Three things live here: the field types and their defaults, a normaliser that turns
 * untrusted input into a valid settings object, and the scope map that decides where each
 * field is stored — on the person, on the company, or in the encrypted secret store.
 */

export type DashboardRange =
  | 'today'
  | '7d'
  | '30d'
  | 'mtd'
  | 'ytd'
  | 'Today'
  | 'This Week'
  | 'This Month';
export type TableDensity =
  | 'compact'
  | 'comfortable'
  | 'medium'
  | 'large'
  | 'Compact'
  | 'Medium'
  | 'Large';
export type ExportFormat = 'csv' | 'json';
export type WeekStart = 'monday' | 'sunday' | 'saturday';
export type TimeFormat = '12-hour' | '24-hour';
export type CompanyDateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type CompanyPriceFormat = '1,234.56' | '1.234,56' | '1 234,56';

export type CustomFieldModule =
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'orders';
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox';

export type CustomFieldItem = {
  id: string;
  module: CustomFieldModule;
  fieldName: string;
  fieldType: CustomFieldType;
  options?: string;
  sortOrder: number;
  defaultValue?: string;
  required: boolean;
};

export type BackupArchiveItem = {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  type: 'database' | 'full';
};

export type LoginDeviceItem = {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
};

export type AccountSystemSettings = {
  // Company identity (General)
  companyName: string;
  companyLegalName: string;
  companyWebsite: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyFooter: string;
  companyDevelopedBy: string;
  companyLogoDataUrl: string;
  sidebarLogoWidth: number;
  sidebarLogoHeight: number;
  showSidebarLogo: boolean;
  showSidebarCompanyName: boolean;

  // Company localization
  defaultLanguage: string;
  defaultCurrency: string;
  companyTimezone: string;
  dateFormat: CompanyDateFormat;
  priceFormat: CompanyPriceFormat;
  showLanguages: boolean;
  darkMode: boolean;
  rtl: boolean;

  // Existing System Settings
  dashboardRange: DashboardRange;
  dashboardFontSize: string;
  dashboardFontFamily: string;
  dashboardWidgetOrder: string[];
  showDemoDashboard: boolean;
  sidebarDashboard: boolean;
  sidebarProducts: boolean;
  sidebarOrders: boolean;
  sidebarCustomers: boolean;
  sidebarAnalytics: boolean;
  sidebarAppStore: boolean;
  sidebarMenuOrder: string[];
  tableRowsPerPage: 10 | 25 | 50 | 100;
  tableDensity: TableDensity;
  tableStripedRows: boolean;
  tableFontFamily: string;
  tableFontSize: number;
  tableCellBorders: boolean;
  tableSortableColumns: boolean;
  tableHeaderFontWeight: string;
  tableHeaderFontSize: number;
  tableHeaderUppercase: boolean;
  tableHeaderBgColor: string;
  tableHeaderTextColor: string;
  tableToolbarSearch: boolean;
  tableToolbarColumnVisibility: boolean;
  tableToolbarRefresh: boolean;
  exportFormat: ExportFormat;
  exportIncludeHeaders: boolean;
  securityAutoLockMinutes: 0 | 15 | 30 | 60;
  securityAutoLogoutOption: string;
  cloudBackupDestination: boolean;
  maintenanceBanner: boolean;
  maintenanceMessage: string;
  calendarWeekStart: WeekStart;
  calendarTimeFormat: TimeFormat;

    // Sales Defaults
  salesDefaultCustomer: string;
  salesDefaultWarehouse: string;
  salesDefaultAccount: string;
  salesDefaultPaymentMethod: string;
  salesDefaultTaxRate: number;
  salesPointToAmountRate: number;
  salesDefaultSmsGateway: string;
  salesPosItemsCount: number;
  createQuotationWithStock: boolean;
  showTotalItemsTax: boolean;

  // Sales Features
  enable3DecimalPricing: boolean;
  enableKitchenDisplay: boolean;
  preparationTargetMinutes: number;
  autoSendKitchenOrders: boolean;
  showBarcodeFields: boolean;
  resizeProductImages: boolean;
  productImageMaxSize: number;
  trackSerialNumberImei: boolean;
  enableMultiPackSelling: boolean;
  wholesalePricingByQuantity: boolean;
  enableMultiCurrency: boolean;
  changeSalespersonCheckout: boolean;
  automaticJournalEntries: boolean;
  allowOverselling: boolean;

  // Prefixes
  prefixSales: string;
  prefixPurchases: string;
  prefixQuotations: string;
  prefixAdjustment: string;
  prefixTransfer: string;
  prefixSalesReturn: string;
  prefixPurchasesReturn: string;

  // Invoice PDF
  invoiceTemplate: 'standard' | 'modern' | 'compact';
  invoicePaperSize: 'a4' | 'letter' | 'thermal80';
  pdfPrimaryColor: string;
  pdfSecondaryColor: string;
  pdfTextColor: string;
  pdfBackgroundColor: string;
  pdfFontFamily: string;
  pdfFontSize: number;
  pdfTopBottomMargin: number;
  pdfLeftRightMargin: number;
  activePdfTab: 'sales-invoice' | 'quotation' | 'purchase';
  invoiceShowLogo: boolean;
  invoiceShowQrCode: boolean;
  invoiceShowTermsConditions: boolean;
  invoiceShowSignatureLine: boolean;
  invoiceTitle: string;
  invoiceThankYouNote: string;
  invoiceTerms: string;

  // System Modules
  moduleRetail: boolean;
  moduleSales: boolean;
  modulePurchases: boolean;
  moduleQuotations: boolean;
  moduleStockAdjustments: boolean;
  moduleStockTransfers: boolean;
  moduleDamages: boolean;
  moduleKitchen: boolean;
  modulePOS: boolean;
  moduleHRM: boolean;
  moduleAccounting: boolean;
  moduleMarketing: boolean;
  moduleStore: boolean;
  moduleRecruits: boolean;
  moduleMeetings: boolean;
  moduleEWallet: boolean;
  moduleCommissions: boolean;
  modulePromotions: boolean;
  moduleWooCommerce: boolean;
  moduleShopify: boolean;
  moduleSalla: boolean;
  moduleJumia: boolean;
  moduleDocumentArchive: boolean;
  moduleSubscriptionProducts: boolean;
  moduleManufacturing: boolean;
  moduleAssetManagement: boolean;
  moduleProjectsTasks: boolean;
  moduleBookingManagement: boolean;
  moduleServiceMaintenance: boolean;
  moduleFleetManagement: boolean;
  moduleHospitalManagement: boolean;
  moduleSchoolManagement: boolean;

  // Pharmacy
  pharmacyBatchTracking: boolean;
  pharmacyExpiryTracking: boolean;
  pharmacyExpiryAlertDays: number;
  pharmacyRequirePrescription: boolean;
  pharmacyDoctorInfoRequired: boolean;

  // POS Settings
  posSoundBeep: boolean;
  posAutoPrintReceipt: boolean;
  posBarcodeScannerMode: 'automatic' | 'manual';
  posDefaultCustomer: string;
  posCashDrawerCommand: string;
  posOfflineSync: boolean;

  // POS Receipt
  receiptPaperWidth: '58mm' | '80mm';
  receiptStoreName: string;
  receiptPhone: string;
  receiptAddress: string;
  receiptVatNumber: string;
  receiptShowTaxBreakdown: boolean;
  receiptShowBarcode: boolean;
  receiptFooterText: string;

  // Direct Network Printing
  networkPrinterEnabled: boolean;
  networkPrinterIp: string;
  networkPrinterPort: number;
  networkPrintProtocol: 'raw-tcp' | 'http' | 'websocket';
  networkPrinterTimeoutSeconds: number;

  // Integrations: PWA
  pwaEnabled: boolean;
  pwaAppName: string;
  pwaShortName: string;
  pwaThemeColor: string;
  pwaBgColor: string;
  pwaDisplayMode: 'standalone' | 'fullscreen' | 'minimal-ui';

  // Integrations: Mobile App
  mobileAppApiUrl: string;
  mobilePushEnabled: boolean;
  mobilePushProvider: 'fcm' | 'apns' | 'onesignal';
  mobileMinVersion: string;
  mobileBiometricLogin: boolean;

  // Integrations: Mail
  mailDriver: 'smtp' | 'mailgun' | 'ses' | 'sendgrid' | 'mailpit';
  mailHost: string;
  mailPort: number;
  mailUsername: string;
  mailPassword: string;
  mailEncryption: 'none' | 'tls' | 'ssl';
  mailFromAddress: string;
  mailFromName: string;

  // Integrations: SMS
  smsProvider: 'twilio' | 'infobip' | 'vonage' | 'generic-http';
  smsApiKey: string;
  smsApiSecret: string;
  smsSenderId: string;
  smsCustomerNotifications: boolean;

  // Integrations: Payment Gateways (Matching Stocky)
  stripeEnabled: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  paypalEnabled: boolean;
  paypalClientId: string;
  paypalSecret: string;
  paypalMode: 'sandbox' | 'live';
  paystackEnabled: boolean;
  paystackPublicKey: string;
  paystackSecretKey: string;
  flutterwaveEnabled: boolean;
  flutterwavePublicKey: string;
  flutterwaveSecretKey: string;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  bkashEnabled: boolean;
  bkashAppKey: string;
  bkashAppSecret: string;
  sslcommerzEnabled: boolean;
  sslcommerzStoreId: string;
  sslcommerzStorePassword: string;
  easypaisaEnabled: boolean;
  easypaisaStoreId: string;
  easypaisaHashKey: string;
  jazzcashEnabled: boolean;
  jazzcashMerchantId: string;
  jazzcashPassword: string;
  jazzcashIntegritySalt: string;
  jazzcashMode: 'sandbox' | 'live';
  offlineCashEnabled: boolean;
  offlineBankTransferEnabled: boolean;
  offlineBankDetails: string;
  codEnabled: boolean;

  // Integrations: ZATCA
  zatcaPhase: 'phase-1' | 'phase-2';
  zatcaEnvironment: 'sandbox' | 'simulation' | 'production';
  zatcaVatNumber: string;
  zatcaCsidStatus: string;
  zatcaAutoReport: boolean;

  // Integrations: Dynamic lists
  customFields: CustomFieldItem[];
  backupArchives: BackupArchiveItem[];
  loginDevices: LoginDeviceItem[];

  // Appearance & Branding
  pageTitleSuffix: string;
  companyFaviconDataUrl: string;
  showCustomizeButton: boolean;
  hideSiteName: boolean;
  loginHeroTitle: string;
  loginHeroSubtitle: string;
  loginPanelTitle: string;
  loginPanelSubtitle: string;
  loginHeroBadge: string;
  loginHeroFeature1: string;
  loginHeroFeature2: string;
  loginHeroFeature3: string;
  loginButtonText: string;
  loginFooterText: string;
  loginBackgroundColor: string;
};

export const DEFAULT_ACCOUNT_SYSTEM_SETTINGS: AccountSystemSettings = {
  companyName: '',
  companyLegalName: '',
  companyWebsite: '',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  companyFooter: '',
  companyDevelopedBy: '',
  companyLogoDataUrl: '',
  sidebarLogoWidth: 32,
  sidebarLogoHeight: 32,
  showSidebarLogo: true,
  showSidebarCompanyName: true,
  defaultLanguage: 'en',
  defaultCurrency: 'USD',
  companyTimezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  priceFormat: '1,234.56',
  showLanguages: true,
  darkMode: false,
  rtl: false,

  dashboardRange: 'This Week',
  dashboardFontSize: 'Default',
  dashboardFontFamily: 'System default',
  dashboardWidgetOrder: [
    'Header & filters',
    'Stat cards (Sales, Purchases, Returns)',
    'Stat cards (Due, Invoice, Profit)',
    'Sales & Purchases chart',
    'Top Selling Products chart',
    'Sales by Payment & Stock value',
    'Payment Sent/Received chart',
    'Top Customers chart',
    'Stock Alert',
    'Top Selling Products',
    'Recent Sales',
  ],
  showDemoDashboard: false,
  sidebarDashboard: true,
  sidebarProducts: true,
  sidebarOrders: true,
  sidebarCustomers: true,
  sidebarAnalytics: true,
  sidebarAppStore: true,
  sidebarMenuOrder: [
    'Dashboard',
    'Store',
    'People',
    'User Management',
    'Products',
    'Sales',
    'Kitchen',
    'Sales Return',
    'Purchases',
    'Purchases Return',
    'Quotations',
    'Stock Adjustment',
    'Stock Transfers',
    'Damages',
    'HRM',
    'Recruits and Jobs',
    'Meetings',
    'Marketing',
    'Accounting',
    'E-Wallet',
    'Commissions',
    'Promotions',
    'Ecommerce Platforms',
    'Integrations',
    'Document Archive',
    'Subscription Product',
    'Manufacturing (MRP)',
    'Asset Management',
    'Projects Management',
    'Booking Management',
    'Service & Maintenance',
    'Fleet Management',
    'Hospital Management',
    'School Management',
    'Settings',
    'Reports',
  ],
  tableRowsPerPage: 25,
  tableDensity: 'Medium',
  tableStripedRows: false,
  tableFontFamily: 'Default (Ant Design)',
  tableFontSize: 14,
  tableCellBorders: false,
  tableSortableColumns: true,
  tableHeaderFontWeight: 'Semibold',
  tableHeaderFontSize: 14,
  tableHeaderUppercase: false,
  tableHeaderBgColor: '#ffffff',
  tableHeaderTextColor: '#000000',
  tableToolbarSearch: true,
  tableToolbarColumnVisibility: true,
  tableToolbarRefresh: true,
  exportFormat: 'json',
  exportIncludeHeaders: true,
  securityAutoLockMinutes: 0,
  securityAutoLogoutOption: 'Never',
  cloudBackupDestination: false,
  maintenanceBanner: false,
  maintenanceMessage: 'Scheduled maintenance is in progress.',
  calendarWeekStart: 'monday',
  calendarTimeFormat: '12-hour',

  salesDefaultCustomer: 'walk-in-customer',
  salesDefaultWarehouse: 'Main Warehouse',
  salesDefaultAccount: '',
  salesDefaultPaymentMethod: '',
  salesDefaultTaxRate: 0,
  salesPointToAmountRate: 1.0,
  salesDefaultSmsGateway: 'twilio',
  salesPosItemsCount: 12,
  createQuotationWithStock: true,
  showTotalItemsTax: false,

  enable3DecimalPricing: false,
  enableKitchenDisplay: false,
  preparationTargetMinutes: 15,
  autoSendKitchenOrders: false,
  showBarcodeFields: true,
  resizeProductImages: true,
  productImageMaxSize: 512,
  trackSerialNumberImei: false,
  enableMultiPackSelling: false,
  wholesalePricingByQuantity: false,
  enableMultiCurrency: false,
  changeSalespersonCheckout: true,
  automaticJournalEntries: true,
  allowOverselling: false,

  prefixSales: 'SL',
  prefixPurchases: 'PR',
  prefixQuotations: 'QT',
  prefixAdjustment: 'AD',
  prefixTransfer: 'TR',
  prefixSalesReturn: 'RT',
  prefixPurchasesReturn: 'PRT',

  invoiceTemplate: 'standard',
  invoicePaperSize: 'a4',
  pdfPrimaryColor: '#1e5631',
  pdfSecondaryColor: '#f3f4f6',
  pdfTextColor: '#111827',
  pdfBackgroundColor: '#ffffff',
  pdfFontFamily: 'Inter',
  pdfFontSize: 10,
  pdfTopBottomMargin: 15,
  pdfLeftRightMargin: 15,
  activePdfTab: 'sales-invoice',
  invoiceShowLogo: true,
  invoiceShowQrCode: true,
  invoiceShowTermsConditions: true,
  invoiceShowSignatureLine: true,
  invoiceTitle: '',
  invoiceThankYouNote: 'Thank you for your business!',
  invoiceTerms:
    '1. Payment due within 15 days of invoice date.\n2. Warranty covers manufacturing defects for 1 year.',

  moduleRetail: true,
  moduleSales: true,
  modulePurchases: true,
  moduleQuotations: true,
  moduleStockAdjustments: true,
  moduleStockTransfers: true,
  moduleDamages: true,
  moduleKitchen: true,
  modulePOS: true,
  moduleHRM: true,
  moduleAccounting: true,
  moduleMarketing: true,
  moduleStore: true,
  moduleRecruits: true,
  moduleMeetings: true,
  moduleEWallet: true,
  moduleCommissions: true,
  modulePromotions: true,
  moduleWooCommerce: true,
  moduleShopify: true,
  moduleSalla: true,
  moduleJumia: true,
  moduleDocumentArchive: true,
  moduleSubscriptionProducts: true,
  moduleManufacturing: true,
  moduleAssetManagement: true,
  moduleProjectsTasks: true,
  moduleBookingManagement: true,
  moduleServiceMaintenance: true,
  moduleFleetManagement: true,
  moduleHospitalManagement: true,
  moduleSchoolManagement: true,

  pharmacyBatchTracking: false,
  pharmacyExpiryTracking: true,
  pharmacyExpiryAlertDays: 30,
  pharmacyRequirePrescription: false,
  pharmacyDoctorInfoRequired: false,

  posSoundBeep: true,
  posAutoPrintReceipt: true,
  posBarcodeScannerMode: 'automatic',
  posDefaultCustomer: 'Walk-in Customer',
  posCashDrawerCommand: 'ESC p 0 25 250',
  posOfflineSync: true,

  receiptPaperWidth: '80mm',
  receiptStoreName: 'ERPFY Retail & Distribution',
  receiptPhone: '+44 20 7946 0991',
  receiptAddress: '124 Commerce Park, Oxford Road, London',
  receiptVatNumber: 'GB999999973',
  receiptShowTaxBreakdown: true,
  receiptShowBarcode: true,
  receiptFooterText: 'Have a wonderful day! Visit us online at erpfy.test',

  networkPrinterEnabled: false,
  networkPrinterIp: '192.168.1.200',
  networkPrinterPort: 9100,
  networkPrintProtocol: 'raw-tcp',
  networkPrinterTimeoutSeconds: 5,

  pwaEnabled: true,
  pwaAppName: 'ERPFY Commerce & POS',
  pwaShortName: 'ERPFY',
  pwaThemeColor: '#1e5631',
  pwaBgColor: '#f6f6f4',
  pwaDisplayMode: 'standalone',

  mobileAppApiUrl: 'http://localhost:3000/api/mobile/v1',
  mobilePushEnabled: true,
  mobilePushProvider: 'fcm',
  mobileMinVersion: '2.1.0',
  mobileBiometricLogin: true,

  mailDriver: 'smtp',
  mailHost: '127.0.0.1',
  mailPort: 1025,
  mailUsername: 'erpfy-system',
  mailPassword: '••••••••',
  mailEncryption: 'none',
  mailFromAddress: 'no-reply@erpfy.test',
  mailFromName: 'ERPFY Notifications',

  smsProvider: 'twilio',
  smsApiKey: 'AC_live_twilio_token_99182',
  smsApiSecret: '••••••••',
  smsSenderId: 'ERPFY',
  smsCustomerNotifications: true,

  stripeEnabled: false,
  stripePublishableKey: '',
  stripeSecretKey: '',
  paypalEnabled: false,
  paypalClientId: '',
  paypalSecret: '',
  paypalMode: 'sandbox',
  paystackEnabled: false,
  paystackPublicKey: '',
  paystackSecretKey: '',
  flutterwaveEnabled: false,
  flutterwavePublicKey: '',
  flutterwaveSecretKey: '',
  razorpayEnabled: false,
  razorpayKeyId: '',
  razorpayKeySecret: '',
  bkashEnabled: false,
  bkashAppKey: '',
  bkashAppSecret: '',
  sslcommerzEnabled: false,
  sslcommerzStoreId: '',
  sslcommerzStorePassword: '',
  easypaisaEnabled: false,
  easypaisaStoreId: '',
  easypaisaHashKey: '',
  jazzcashEnabled: false,
  jazzcashMerchantId: '',
  jazzcashPassword: '',
  jazzcashIntegritySalt: '',
  jazzcashMode: 'sandbox',
  offlineCashEnabled: true,
  offlineBankTransferEnabled: true,
  offlineBankDetails:
    'Bank: Meezan Bank Ltd\nAccount Name: ERPFY Operating\nIBAN: PK36MEZN0001234567890123',
  codEnabled: true,

  zatcaPhase: 'phase-2',
  zatcaEnvironment: 'sandbox',
  zatcaVatNumber: '300000000000003',
  zatcaCsidStatus: 'Active & Compliant (ZATCA Portal)',
  zatcaAutoReport: true,

  customFields: [
    {
      id: 'cf-1',
      module: 'customers',
      fieldName: 'National Tax ID',
      fieldType: 'text',
      sortOrder: 1,
      defaultValue: '',
      required: true,
    },
    {
      id: 'cf-2',
      module: 'customers',
      fieldName: 'Customer Priority Tier',
      fieldType: 'select',
      options: 'Standard\nVIP Gold\nCorporate Wholesale',
      sortOrder: 2,
      defaultValue: 'Standard',
      required: false,
    },
    {
      id: 'cf-3',
      module: 'suppliers',
      fieldName: 'Vendor Commercial License No',
      fieldType: 'text',
      sortOrder: 1,
      defaultValue: '',
      required: true,
    },
    {
      id: 'cf-4',
      module: 'products',
      fieldName: 'Manufacturer Part No (MPN)',
      fieldType: 'text',
      sortOrder: 1,
      defaultValue: '',
      required: false,
    },
  ],

  backupArchives: [],

  loginDevices: [
    {
      id: 'dev-1',
      device: 'Windows 11 Workstation',
      browser: 'Chrome 128.0',
      ip: '127.0.0.1 (Localhost)',
      location: 'Current Session',
      lastActive: 'Active now',
      current: true,
    },
    {
      id: 'dev-2',
      device: 'iPad Pro 12.9" (POS Terminal)',
      browser: 'Safari 18.0',
      ip: '192.168.1.104',
      location: 'Retail Store Branch A',
      lastActive: '2 hours ago',
      current: false,
    },
    {
      id: 'dev-3',
      device: 'MacBook Air M2',
      browser: 'Chrome 127.0',
      ip: '82.165.197.1',
      location: 'London, UK',
      lastActive: 'Yesterday at 18:42',
      current: false,
    },
  ],

  // Appearance & Branding
  pageTitleSuffix: 'Ultimate Inventory With POS',
  companyFaviconDataUrl: '',
  showCustomizeButton: true,
  hideSiteName: false,
  loginHeroTitle: '',
  loginHeroSubtitle: '',
  loginPanelTitle: '',
  loginPanelSubtitle: '',
  loginHeroBadge: '',
  loginHeroFeature1: '',
  loginHeroFeature2: '',
  loginHeroFeature3: '',
  loginButtonText: 'Sign In',
  loginFooterText: '',
  loginBackgroundColor: '#1e5631',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAccountSystemSettings(
  value: unknown,
): AccountSystemSettings {
  if (!isRecord(value)) return DEFAULT_ACCOUNT_SYSTEM_SETTINGS;
  const defaults = DEFAULT_ACCOUNT_SYSTEM_SETTINGS;

  const str = (key: keyof AccountSystemSettings, fallback = '') =>
    typeof value[key] === 'string'
      ? (value[key] as string)
      : ((defaults[key] as string) ?? fallback);

  const num = (key: keyof AccountSystemSettings, fallback = 0) =>
    typeof value[key] === 'number' && !Number.isNaN(value[key])
      ? (value[key] as number)
      : ((defaults[key] as number) ?? fallback);

  const bool = (key: keyof AccountSystemSettings) =>
    typeof value[key] === 'boolean'
      ? (value[key] as boolean)
      : (defaults[key] as boolean);

  const list = <T>(key: keyof AccountSystemSettings, fallback: T[]): T[] =>
    Array.isArray(value[key]) ? (value[key] as T[]) : fallback;

  return {
    ...defaults,
    ...value,
    companyName: str('companyName'),
    companyLegalName: str('companyLegalName'),
    companyWebsite: str('companyWebsite'),
    companyPhone: str('companyPhone'),
    companyEmail: str('companyEmail'),
    companyAddress: str('companyAddress'),
    companyFooter: str('companyFooter'),
    companyDevelopedBy: str('companyDevelopedBy'),
    companyLogoDataUrl: str('companyLogoDataUrl'),
    sidebarLogoWidth: Math.min(96, Math.max(20, num('sidebarLogoWidth', 32))),
    sidebarLogoHeight: Math.min(96, Math.max(20, num('sidebarLogoHeight', 32))),
    showSidebarLogo: bool('showSidebarLogo'),
    showSidebarCompanyName: bool('showSidebarCompanyName'),
    defaultLanguage: str('defaultLanguage', 'en'),
    defaultCurrency: str('defaultCurrency', 'USD'),
    companyTimezone: str('companyTimezone', 'UTC'),
    dateFormat: (['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(
      String(value.dateFormat),
    )
      ? value.dateFormat
      : defaults.dateFormat) as CompanyDateFormat,
    priceFormat: (['1,234.56', '1.234,56', '1 234,56'].includes(
      String(value.priceFormat),
    )
      ? value.priceFormat
      : defaults.priceFormat) as CompanyPriceFormat,
    showLanguages: bool('showLanguages'),
    darkMode: bool('darkMode'),
    rtl: bool('rtl'),
    // Preserve core system primitives cleanly
    dashboardRange: ([
      'today',
      '7d',
      '30d',
      'mtd',
      'ytd',
      'Today',
      'This Week',
      'This Month',
    ].includes(String(value.dashboardRange))
      ? value.dashboardRange
      : defaults.dashboardRange) as DashboardRange,
    dashboardFontSize: str('dashboardFontSize', defaults.dashboardFontSize),
    dashboardFontFamily: str('dashboardFontFamily', defaults.dashboardFontFamily),
    dashboardWidgetOrder: list<string>(
      'dashboardWidgetOrder',
      defaults.dashboardWidgetOrder,
    ),
    showDemoDashboard: bool('showDemoDashboard'),
    sidebarDashboard: bool('sidebarDashboard'),
    sidebarProducts: bool('sidebarProducts'),
    sidebarOrders: bool('sidebarOrders'),
    sidebarCustomers: bool('sidebarCustomers'),
    sidebarAnalytics: bool('sidebarAnalytics'),
    sidebarAppStore: bool('sidebarAppStore'),
    sidebarMenuOrder: list<string>(
      'sidebarMenuOrder',
      defaults.sidebarMenuOrder,
    ),
    tableRowsPerPage: ([10, 25, 50, 100].includes(
      Number(value.tableRowsPerPage),
    )
      ? Number(value.tableRowsPerPage)
      : defaults.tableRowsPerPage) as AccountSystemSettings['tableRowsPerPage'],
    tableDensity: ([
      'compact',
      'comfortable',
      'medium',
      'large',
      'Compact',
      'Medium',
      'Large',
    ].includes(String(value.tableDensity))
      ? value.tableDensity
      : defaults.tableDensity) as TableDensity,
    tableStripedRows: bool('tableStripedRows'),
    tableFontFamily: str('tableFontFamily', defaults.tableFontFamily),
    tableFontSize: num('tableFontSize', defaults.tableFontSize),
    tableCellBorders: bool('tableCellBorders'),
    tableSortableColumns: bool('tableSortableColumns'),
    tableHeaderFontWeight: str(
      'tableHeaderFontWeight',
      defaults.tableHeaderFontWeight,
    ),
    tableHeaderFontSize: num(
      'tableHeaderFontSize',
      defaults.tableHeaderFontSize,
    ),
    tableHeaderUppercase: bool('tableHeaderUppercase'),
    tableHeaderBgColor: str('tableHeaderBgColor', defaults.tableHeaderBgColor),
    tableHeaderTextColor: str(
      'tableHeaderTextColor',
      defaults.tableHeaderTextColor,
    ),
    tableToolbarSearch: bool('tableToolbarSearch'),
    tableToolbarColumnVisibility: bool('tableToolbarColumnVisibility'),
    tableToolbarRefresh: bool('tableToolbarRefresh'),
    securityAutoLogoutOption: str(
      'securityAutoLogoutOption',
      defaults.securityAutoLogoutOption,
    ),
    cloudBackupDestination: bool('cloudBackupDestination'),
    exportFormat: (['csv', 'json'].includes(String(value.exportFormat))
      ? value.exportFormat
      : defaults.exportFormat) as ExportFormat,
    exportIncludeHeaders: bool('exportIncludeHeaders'),
    securityAutoLockMinutes: ([0, 15, 30, 60].includes(
      Number(value.securityAutoLockMinutes),
    )
      ? Number(value.securityAutoLockMinutes)
      : defaults.securityAutoLockMinutes) as AccountSystemSettings['securityAutoLockMinutes'],
    maintenanceBanner: bool('maintenanceBanner'),
    maintenanceMessage: str('maintenanceMessage', defaults.maintenanceMessage),
    calendarWeekStart: (['monday', 'sunday', 'saturday'].includes(
      String(value.calendarWeekStart),
    )
      ? value.calendarWeekStart
      : defaults.calendarWeekStart) as WeekStart,
    calendarTimeFormat: (['12-hour', '24-hour'].includes(
      String(value.calendarTimeFormat),
    )
      ? value.calendarTimeFormat
      : defaults.calendarTimeFormat) as TimeFormat,

    // Sales Defaults
    salesDefaultCustomer: str('salesDefaultCustomer', defaults.salesDefaultCustomer),
    salesDefaultWarehouse: str('salesDefaultWarehouse', defaults.salesDefaultWarehouse),
    salesDefaultAccount: str('salesDefaultAccount', defaults.salesDefaultAccount),
    salesDefaultPaymentMethod: str('salesDefaultPaymentMethod', defaults.salesDefaultPaymentMethod),
    salesDefaultTaxRate: num('salesDefaultTaxRate', defaults.salesDefaultTaxRate),
    salesPointToAmountRate: num('salesPointToAmountRate', defaults.salesPointToAmountRate),
    salesDefaultSmsGateway: str('salesDefaultSmsGateway', defaults.salesDefaultSmsGateway),
    salesPosItemsCount: num('salesPosItemsCount', defaults.salesPosItemsCount),
    createQuotationWithStock: bool('createQuotationWithStock'),
    showTotalItemsTax: bool('showTotalItemsTax'),

    // Sales Features
    enable3DecimalPricing: bool('enable3DecimalPricing'),
    enableKitchenDisplay: bool('enableKitchenDisplay'),
    preparationTargetMinutes: num('preparationTargetMinutes', defaults.preparationTargetMinutes),
    autoSendKitchenOrders: bool('autoSendKitchenOrders'),
    showBarcodeFields: bool('showBarcodeFields'),
    resizeProductImages: bool('resizeProductImages'),
    productImageMaxSize: num('productImageMaxSize', defaults.productImageMaxSize),
    trackSerialNumberImei: bool('trackSerialNumberImei'),
    enableMultiPackSelling: bool('enableMultiPackSelling'),
    wholesalePricingByQuantity: bool('wholesalePricingByQuantity'),
    enableMultiCurrency: bool('enableMultiCurrency'),
    changeSalespersonCheckout: bool('changeSalespersonCheckout'),
    automaticJournalEntries: bool('automaticJournalEntries'),
    allowOverselling: bool('allowOverselling'),

    // Prefixes
    prefixSales: str('prefixSales', defaults.prefixSales),
    prefixPurchases: str('prefixPurchases', defaults.prefixPurchases),
    prefixQuotations: str('prefixQuotations', defaults.prefixQuotations),
    prefixAdjustment: str('prefixAdjustment', defaults.prefixAdjustment),
    prefixTransfer: str('prefixTransfer', defaults.prefixTransfer),
    prefixSalesReturn: str('prefixSalesReturn', defaults.prefixSalesReturn),
    prefixPurchasesReturn: str('prefixPurchasesReturn', defaults.prefixPurchasesReturn),

    // Invoice PDF
    invoiceTemplate: (['standard', 'modern', 'compact'].includes(
      String(value.invoiceTemplate),
    )
      ? value.invoiceTemplate
      : defaults.invoiceTemplate) as 'standard' | 'modern' | 'compact',
    invoicePaperSize: (['a4', 'letter', 'thermal80'].includes(
      String(value.invoicePaperSize),
    )
      ? value.invoicePaperSize
      : defaults.invoicePaperSize) as 'a4' | 'letter' | 'thermal80',
    pdfPrimaryColor: str('pdfPrimaryColor', defaults.pdfPrimaryColor),
    pdfSecondaryColor: str('pdfSecondaryColor', defaults.pdfSecondaryColor),
    pdfTextColor: str('pdfTextColor', defaults.pdfTextColor),
    pdfBackgroundColor: str('pdfBackgroundColor', defaults.pdfBackgroundColor),
    pdfFontFamily: str('pdfFontFamily', defaults.pdfFontFamily),
    pdfFontSize: num('pdfFontSize', defaults.pdfFontSize),
    pdfTopBottomMargin: num('pdfTopBottomMargin', defaults.pdfTopBottomMargin),
    pdfLeftRightMargin: num('pdfLeftRightMargin', defaults.pdfLeftRightMargin),
    activePdfTab: (['sales-invoice', 'quotation', 'purchase'].includes(
      String(value.activePdfTab),
    )
      ? value.activePdfTab
      : defaults.activePdfTab) as 'sales-invoice' | 'quotation' | 'purchase',
    invoiceShowLogo: bool('invoiceShowLogo'),
    invoiceShowQrCode: bool('invoiceShowQrCode'),
    invoiceShowTermsConditions: bool('invoiceShowTermsConditions'),
    invoiceShowSignatureLine: bool('invoiceShowSignatureLine'),
    invoiceTitle: str('invoiceTitle'),
    invoiceThankYouNote: str('invoiceThankYouNote'),
    invoiceTerms: str('invoiceTerms'),

    // System Modules
    moduleRetail: bool('moduleRetail'),
    moduleSales: bool('moduleSales'),
    modulePurchases: bool('modulePurchases'),
    moduleQuotations: bool('moduleQuotations'),
    moduleStockAdjustments: bool('moduleStockAdjustments'),
    moduleStockTransfers: bool('moduleStockTransfers'),
    moduleDamages: bool('moduleDamages'),
    moduleKitchen: bool('moduleKitchen'),
    modulePOS: bool('modulePOS'),
    moduleHRM: bool('moduleHRM'),
    moduleAccounting: bool('moduleAccounting'),
    moduleMarketing: bool('moduleMarketing'),
    moduleStore: bool('moduleStore'),
    moduleRecruits: bool('moduleRecruits'),
    moduleMeetings: bool('moduleMeetings'),
    moduleEWallet: bool('moduleEWallet'),
    moduleCommissions: bool('moduleCommissions'),
    modulePromotions: bool('modulePromotions'),
    moduleWooCommerce: bool('moduleWooCommerce'),
    moduleShopify: bool('moduleShopify'),
    moduleSalla: bool('moduleSalla'),
    moduleJumia: bool('moduleJumia'),
    moduleDocumentArchive: bool('moduleDocumentArchive'),
    moduleSubscriptionProducts: bool('moduleSubscriptionProducts'),
    moduleManufacturing: bool('moduleManufacturing'),
    moduleAssetManagement: bool('moduleAssetManagement'),
    moduleProjectsTasks: bool('moduleProjectsTasks'),
    moduleBookingManagement: bool('moduleBookingManagement'),
    moduleServiceMaintenance: bool('moduleServiceMaintenance'),
    moduleFleetManagement: bool('moduleFleetManagement'),
    moduleHospitalManagement: bool('moduleHospitalManagement'),
    moduleSchoolManagement: bool('moduleSchoolManagement'),

    // Pharmacy
    pharmacyBatchTracking: bool('pharmacyBatchTracking'),
    pharmacyExpiryTracking: bool('pharmacyExpiryTracking'),
    pharmacyExpiryAlertDays: num('pharmacyExpiryAlertDays', 60),
    pharmacyRequirePrescription: bool('pharmacyRequirePrescription'),
    pharmacyDoctorInfoRequired: bool('pharmacyDoctorInfoRequired'),

    // POS
    posSoundBeep: bool('posSoundBeep'),
    posAutoPrintReceipt: bool('posAutoPrintReceipt'),
    posBarcodeScannerMode: (['automatic', 'manual'].includes(
      String(value.posBarcodeScannerMode),
    )
      ? value.posBarcodeScannerMode
      : defaults.posBarcodeScannerMode) as 'automatic' | 'manual',
    posDefaultCustomer: str('posDefaultCustomer'),
    posCashDrawerCommand: str('posCashDrawerCommand'),
    posOfflineSync: bool('posOfflineSync'),

    receiptPaperWidth: (['58mm', '80mm'].includes(
      String(value.receiptPaperWidth),
    )
      ? value.receiptPaperWidth
      : defaults.receiptPaperWidth) as '58mm' | '80mm',
    receiptStoreName: str('receiptStoreName'),
    receiptPhone: str('receiptPhone'),
    receiptAddress: str('receiptAddress'),
    receiptVatNumber: str('receiptVatNumber'),
    receiptShowTaxBreakdown: bool('receiptShowTaxBreakdown'),
    receiptShowBarcode: bool('receiptShowBarcode'),
    receiptFooterText: str('receiptFooterText'),

    networkPrinterEnabled: bool('networkPrinterEnabled'),
    networkPrinterIp: str('networkPrinterIp'),
    networkPrinterPort: num('networkPrinterPort', 9100),
    networkPrintProtocol: (['raw-tcp', 'http', 'websocket'].includes(
      String(value.networkPrintProtocol),
    )
      ? value.networkPrintProtocol
      : defaults.networkPrintProtocol) as 'raw-tcp' | 'http' | 'websocket',
    networkPrinterTimeoutSeconds: num('networkPrinterTimeoutSeconds', 5),

    pwaEnabled: bool('pwaEnabled'),
    pwaAppName: str('pwaAppName'),
    pwaShortName: str('pwaShortName'),
    pwaThemeColor: str('pwaThemeColor'),
    pwaBgColor: str('pwaBgColor'),
    pwaDisplayMode: (['standalone', 'fullscreen', 'minimal-ui'].includes(
      String(value.pwaDisplayMode),
    )
      ? value.pwaDisplayMode
      : defaults.pwaDisplayMode) as 'standalone' | 'fullscreen' | 'minimal-ui',

    mobileAppApiUrl: str('mobileAppApiUrl'),
    mobilePushEnabled: bool('mobilePushEnabled'),
    mobilePushProvider: (['fcm', 'apns', 'onesignal'].includes(
      String(value.mobilePushProvider),
    )
      ? value.mobilePushProvider
      : defaults.mobilePushProvider) as 'fcm' | 'apns' | 'onesignal',
    mobileMinVersion: str('mobileMinVersion'),
    mobileBiometricLogin: bool('mobileBiometricLogin'),

    mailDriver: (['smtp', 'mailgun', 'ses', 'sendgrid', 'mailpit'].includes(
      String(value.mailDriver),
    )
      ? value.mailDriver
      : defaults.mailDriver) as AccountSystemSettings['mailDriver'],
    mailHost: str('mailHost'),
    mailPort: num('mailPort', 1025),
    mailUsername: str('mailUsername'),
    mailPassword: str('mailPassword'),
    mailEncryption: (['none', 'tls', 'ssl'].includes(
      String(value.mailEncryption),
    )
      ? value.mailEncryption
      : defaults.mailEncryption) as AccountSystemSettings['mailEncryption'],
    mailFromAddress: str('mailFromAddress'),
    mailFromName: str('mailFromName'),

    smsProvider: (['twilio', 'infobip', 'vonage', 'generic-http'].includes(
      String(value.smsProvider),
    )
      ? value.smsProvider
      : defaults.smsProvider) as AccountSystemSettings['smsProvider'],
    smsApiKey: str('smsApiKey'),
    smsApiSecret: str('smsApiSecret'),
    smsSenderId: str('smsSenderId'),
    smsCustomerNotifications: bool('smsCustomerNotifications'),

    stripeEnabled: bool('stripeEnabled'),
    stripePublishableKey: str('stripePublishableKey'),
    stripeSecretKey: str('stripeSecretKey'),
    paypalEnabled: bool('paypalEnabled'),
    paypalClientId: str('paypalClientId'),
    paypalSecret: str('paypalSecret'),
    paypalMode: (['sandbox', 'live'].includes(String(value.paypalMode))
      ? value.paypalMode
      : defaults.paypalMode) as 'sandbox' | 'live',
    paystackEnabled: bool('paystackEnabled'),
    paystackPublicKey: str('paystackPublicKey'),
    paystackSecretKey: str('paystackSecretKey'),
    flutterwaveEnabled: bool('flutterwaveEnabled'),
    flutterwavePublicKey: str('flutterwavePublicKey'),
    flutterwaveSecretKey: str('flutterwaveSecretKey'),
    razorpayEnabled: bool('razorpayEnabled'),
    razorpayKeyId: str('razorpayKeyId'),
    razorpayKeySecret: str('razorpayKeySecret'),
    bkashEnabled: bool('bkashAppKey') || bool('bkashEnabled'),
    bkashAppKey: str('bkashAppKey'),
    bkashAppSecret: str('bkashAppSecret'),
    sslcommerzEnabled: bool('sslcommerzEnabled'),
    sslcommerzStoreId: str('sslcommerzStoreId'),
    sslcommerzStorePassword: str('sslcommerzStorePassword'),
    easypaisaEnabled: bool('easypaisaEnabled'),
    easypaisaStoreId: str('easypaisaStoreId'),
    easypaisaHashKey: str('easypaisaHashKey'),
    jazzcashEnabled: bool('jazzcashEnabled'),
    jazzcashMerchantId: str('jazzcashMerchantId'),
    jazzcashPassword: str('jazzcashPassword'),
    jazzcashIntegritySalt: str('jazzcashIntegritySalt'),
    jazzcashMode: (['sandbox', 'live'].includes(String(value.jazzcashMode))
      ? value.jazzcashMode
      : defaults.jazzcashMode) as 'sandbox' | 'live',
    offlineCashEnabled: bool('offlineCashEnabled'),
    offlineBankTransferEnabled: bool('offlineBankTransferEnabled'),
    offlineBankDetails: str('offlineBankDetails', defaults.offlineBankDetails),
    codEnabled: bool('codEnabled'),

    zatcaPhase: (['phase-1', 'phase-2'].includes(String(value.zatcaPhase))
      ? value.zatcaPhase
      : defaults.zatcaPhase) as 'phase-1' | 'phase-2',
    zatcaEnvironment: (['sandbox', 'simulation', 'production'].includes(
      String(value.zatcaEnvironment),
    )
      ? value.zatcaEnvironment
      : defaults.zatcaEnvironment) as 'sandbox' | 'simulation' | 'production',
    zatcaVatNumber: str('zatcaVatNumber'),
    zatcaCsidStatus: str('zatcaCsidStatus'),
    zatcaAutoReport: bool('zatcaAutoReport'),

    customFields: list<unknown>('customFields', defaults.customFields).map(
      (item, idx) => {
        const rec = isRecord(item) ? item : {};
        return {
          id: typeof rec.id === 'string' ? rec.id : `cf-${idx}`,
          module: (['customers', 'suppliers', 'products', 'orders'].includes(
            String(rec.module),
          )
            ? rec.module
            : 'customers') as CustomFieldModule,
          fieldName:
            typeof rec.fieldName === 'string' && rec.fieldName
              ? rec.fieldName
              : typeof rec.label === 'string'
                ? rec.label
                : 'Field',
          fieldType: ([
            'text',
            'textarea',
            'number',
            'date',
            'select',
            'checkbox',
          ].includes(String(rec.fieldType))
            ? rec.fieldType
            : 'text') as CustomFieldType,
          options: typeof rec.options === 'string' ? rec.options : '',
          sortOrder: typeof rec.sortOrder === 'number' ? rec.sortOrder : 0,
          defaultValue:
            typeof rec.defaultValue === 'string' ? rec.defaultValue : '',
          required: Boolean(rec.required),
        };
      },
    ),
    backupArchives: list<BackupArchiveItem>(
      'backupArchives',
      defaults.backupArchives,
    ),
    loginDevices: list<LoginDeviceItem>('loginDevices', defaults.loginDevices),

    // Appearance & Branding
    pageTitleSuffix: str('pageTitleSuffix', defaults.pageTitleSuffix),
    companyFaviconDataUrl: str('companyFaviconDataUrl', defaults.companyFaviconDataUrl),
    showCustomizeButton: bool('showCustomizeButton'),
    hideSiteName: bool('hideSiteName'),
    loginHeroTitle: str('loginHeroTitle', defaults.loginHeroTitle),
    loginHeroSubtitle: str('loginHeroSubtitle', defaults.loginHeroSubtitle),
    loginPanelTitle: str('loginPanelTitle', defaults.loginPanelTitle),
    loginPanelSubtitle: str('loginPanelSubtitle', defaults.loginPanelSubtitle),
    loginHeroBadge: str('loginHeroBadge', defaults.loginHeroBadge),
    loginHeroFeature1: str('loginHeroFeature1', defaults.loginHeroFeature1),
    loginHeroFeature2: str('loginHeroFeature2', defaults.loginHeroFeature2),
    loginHeroFeature3: str('loginHeroFeature3', defaults.loginHeroFeature3),
    loginButtonText: str('loginButtonText', defaults.loginButtonText),
    loginFooterText: str('loginFooterText', defaults.loginFooterText),
    loginBackgroundColor: str('loginBackgroundColor', defaults.loginBackgroundColor),
  };
}

/* ------------------------------------------------------------------ *
 * Scope map
 *
 * A setting belongs to the person only when it describes how they personally want to look
 * at the portal. Anything that describes the business, or that another member of the same
 * company would expect to see too, belongs to the company.
 * ------------------------------------------------------------------ */

export const ACCOUNT_SCOPED_KEYS = [
  'dashboardRange',
  'showDemoDashboard',
  'sidebarDashboard',
  'sidebarProducts',
  'sidebarOrders',
  'sidebarCustomers',
  'sidebarAnalytics',
  'sidebarAppStore',
  'tableRowsPerPage',
  'tableDensity',
  'tableStripedRows',
] as const satisfies readonly (keyof AccountSystemSettings)[];

/**
 * Credentials. These are encrypted at rest with ERPFY_SECRET_KEY and are never sent back
 * to a browser: a saved secret is reported only as configured or not configured, which is
 * all a settings screen needs in order to be honest.
 *
 * Publishable keys, client ids and store ids are deliberately absent — a gateway publishes
 * those itself, so hiding them would be theatre rather than security.
 */
export const SECRET_KEYS = [
  'mailPassword',
  'smsApiKey',
  'smsApiSecret',
  'stripeSecretKey',
  'paypalSecret',
  'paystackSecretKey',
  'flutterwaveSecretKey',
  'razorpayKeySecret',
  'bkashAppSecret',
  'sslcommerzStorePassword',
  'easypaisaHashKey',
  'jazzcashPassword',
  'jazzcashIntegritySalt',
] as const satisfies readonly (keyof AccountSystemSettings)[];

/**
 * Read-only projections. These are not settings at all — they are live server state that
 * the settings screens display, so a saved copy of them would only ever be stale.
 *
 * `loginDevices` comes from core_sessions and `backupArchives` from the backup service
 * once it exists.
 */
export const DERIVED_KEYS = [
  'loginDevices',
  'backupArchives',
] as const satisfies readonly (keyof AccountSystemSettings)[];

export type AccountScopedKey = (typeof ACCOUNT_SCOPED_KEYS)[number];
export type SecretKey = (typeof SECRET_KEYS)[number];
export type DerivedKey = (typeof DERIVED_KEYS)[number];

const ACCOUNT_SCOPED = new Set<string>(ACCOUNT_SCOPED_KEYS);
const SECRET = new Set<string>(SECRET_KEYS);
const DERIVED = new Set<string>(DERIVED_KEYS);

export function isAccountScoped(key: string): boolean {
  return ACCOUNT_SCOPED.has(key);
}

export function isSecret(key: string): boolean {
  return SECRET.has(key);
}

export function isDerived(key: string): boolean {
  return DERIVED.has(key);
}

/** Every key the schema knows. Anything else is discarded rather than persisted. */
export const SETTINGS_KEYS = Object.keys(
  DEFAULT_ACCOUNT_SYSTEM_SETTINGS,
) as (keyof AccountSystemSettings)[];

/**
 * Company-scoped, storable settings: everything that is neither a personal preference, nor
 * a secret, nor live server state.
 */
export const COMPANY_SCOPED_KEYS = SETTINGS_KEYS.filter(
  (key) => !isAccountScoped(key) && !isSecret(key) && !isDerived(key),
);

/**
 * Drops unknown keys.
 *
 * `normalizeAccountSystemSettings` spreads its input so that a field added in a newer
 * release survives an older stored payload. That is right for reading, and wrong for
 * writing: without this filter an arbitrary POST body would be persisted verbatim.
 */
export function pickKnown(value: unknown): Partial<AccountSystemSettings> {
  if (!isRecord(value)) return {};
  const out: Record<string, unknown> = {};
  for (const key of SETTINGS_KEYS) {
    if (key in value) out[key] = (value as Record<string, unknown>)[key];
  }
  return out as Partial<AccountSystemSettings>;
}

/** Splits a normalised settings object into the three places it is stored. */
export function splitByScope(settings: AccountSystemSettings): {
  account: Record<string, unknown>;
  company: Record<string, unknown>;
  secrets: Record<string, string>;
} {
  const account: Record<string, unknown> = {};
  const company: Record<string, unknown> = {};
  const secrets: Record<string, string> = {};

  for (const key of SETTINGS_KEYS) {
    if (isDerived(key)) continue;
    const value = settings[key];
    if (isSecret(key)) {
      // An empty string means "leave the stored secret alone", not "erase it". Clearing a
      // secret is an explicit action, so it cannot happen by re-saving a masked form.
      if (typeof value === 'string' && value.length > 0) secrets[key] = value;
    } else if (isAccountScoped(key)) {
      account[key] = value;
    } else {
      company[key] = value;
    }
  }

  return { account, company, secrets };
}
