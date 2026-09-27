/**
 * ERPfy.net — Theme Engine Types
 * Authority: ERPfy.net Complete Implementation Master Specification (§11, §12)
 */

export type ThemeColors = {
  brandPrimary: string;
  brandSecondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary?: string;
};

export type ThemeTypography = {
  headingFont: string;
  bodyFont: string;
  baseFontSizePx: number;
  fontFamily?: string;
};

export type ThemeSection = {
  id: string;
  type: 'hero' | 'product_grid' | 'features_list' | 'banner' | 'rich_text';
  enabled: boolean;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
  imageUrl?: string;
  columns?: number;
  features?: Array<{ icon: string; title: string; desc: string }>;
};

export type StoreThemeSettings = {
  themeId: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  header: {
    showAnnouncement: boolean;
    announcementText: string;
    stickyHeader: boolean;
    showSearchBar: boolean;
    logoUrl?: string;
  };
  sections: ThemeSection[];
  footer: {
    copyrightText: string;
    showSocialLinks: boolean;
    aboutText?: string;
  };
};

export const DEFAULT_THEME_SETTINGS: StoreThemeSettings = {
  themeId: 'portal-default',
  colors: {
    brandPrimary: '#1e5631',
    brandSecondary: '#064e3b',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    primary: '#1e5631',
  },
  typography: {
    headingFont: 'Inter, sans-serif',
    bodyFont: 'Inter, sans-serif',
    baseFontSizePx: 16,
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    showAnnouncement: true,
    announcementText: 'Welcome to our store! Free shipping on orders over $100.',
    stickyHeader: true,
    showSearchBar: true,
  },
  sections: [
    {
      id: 'hero_banner',
      type: 'hero',
      enabled: true,
      title: 'Crafted with Excellence',
      subtitle: 'Discover verified quality products with prompt worldwide delivery.',
      buttonText: 'Shop All Products',
      buttonHref: '#products',
    },
    {
      id: 'featured_collection',
      type: 'product_grid',
      enabled: true,
      title: 'Trending Essentials',
      subtitle: 'Browse our customer favorites and latest additions.',
      columns: 4,
    },
    {
      id: 'trust_badges',
      type: 'features_list',
      enabled: true,
      features: [
        { icon: 'Truck', title: 'Fast Delivery', desc: 'Secure trackable shipping' },
        { icon: 'ShieldCheck', title: 'Quality Assurance', desc: '100% verified authentic goods' },
        { icon: 'RotateCcw', title: 'Hassle-Free Returns', desc: '30-day exchange guarantee' },
        { icon: 'Clock', title: 'Customer Support', desc: 'Direct assistance on WhatsApp' },
      ],
    },
  ],
  footer: {
    copyrightText: '© 2026 ERPfy.net. All rights reserved.',
    showSocialLinks: true,
    aboutText: 'Powered by ERPfy.net — Global Multi-Tenant ERP & Commerce SaaS.',
  },
};
