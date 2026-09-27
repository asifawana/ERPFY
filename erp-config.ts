/**
 * ERPFY Master Platform Configuration
 *
 * Equivalent to wp-config.php, but written for modern TypeScript & Cloudflare D1/R2.
 * Defines environment defaults, tenant boundaries, and platform capabilities.
 */

export interface ErpfyConfig {
  name: string;
  version: string;
  branding: {
    title: string;
    description: string;
    copyright: string;
  };
  auth: {
    cookieName: string;
    sessionAbsoluteExpiryMs: number;
    sessionIdleExpiryMs: number;
    passwordMinLength: number;
  };
  themes: {
    defaultTheme: string;
    storageKey: string;
  };
  features: {
    totpMfa: boolean;
    appStore: boolean;
    auditLog: boolean;
    multiCompany: boolean;
  };
}

export const ERPFY_CONFIG: ErpfyConfig = {
  name: 'ERPFY',
  version: '1.0.0',
  branding: {
    title: 'ERPFY — Enterprise Resource Planning',
    description: 'Enterprise ERP for modern businesses',
    copyright: '© 2026 ERPFY Inc. All rights reserved.',
  },
  auth: {
    cookieName: 'erpfy_session',
    sessionAbsoluteExpiryMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    sessionIdleExpiryMs: 7 * 24 * 60 * 60 * 1000,      // 7 days
    passwordMinLength: 8,
  },
  themes: {
    defaultTheme: 'portal-default',
    storageKey: 'erpfy_portal_theme',
  },
  features: {
    totpMfa: true,
    appStore: true,
    auditLog: true,
    multiCompany: true,
  },
};

export default ERPFY_CONFIG;
