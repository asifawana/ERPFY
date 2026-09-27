/**
 * ERPfy.net — Ecommerce Engine Types
 * Authority: ERPfy.net Complete Implementation Master Specification (§9, §10)
 *
 * Implements the architecture:
 * ERP Product -> Online Store Product -> Customer Order -> Ecommerce Order -> ERP Sales Order -> Inventory Update
 */

export type StorefrontAddress = {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
};

export type EcommerceStore = {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  customDomain?: string;
  currency: string;
  taxRatePercent: number;
  activeThemeId: string;
  status: 'active' | 'maintenance' | 'disabled';
  operatingMode?: 'unified' | 'store_only' | 'erp_only';
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;
  announcementText?: string;
  announcementEnabled?: boolean;
  logoUrl?: string;
  supportEmail: string;
  supportPhone?: string;
  shippingFlatRate: number;
  freeShippingThreshold?: number;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    twitter?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export type StoreProductVariant = {
  id: string;
  title: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  inventoryQuantity: number;
  attributes: Record<string, string>; // e.g. { Size: 'M', Color: 'Black' }
};

export type StoreProduct = {
  id: string;
  companyId: string;
  erpProductId: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  inventoryQuantity: number;
  trackInventory: boolean;
  isPublished: boolean;
  featuredImageUrl?: string;
  images: string[];
  variants: StoreProductVariant[];
  collectionIds: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: number;
  updatedAt: number;
};

export type StoreCollection = {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount: number;
  sortOrder: number;
  isPublished: boolean;
};

export type CartItem = {
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sku: string;
};

export type StoreCart = {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  total: number;
  discountCode?: string;
  discountAmount: number;
};

export type EcommerceOrder = {
  id: string;
  orderNumber: string;
  companyId: string;
  erpSalesOrderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: StorefrontAddress;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cod' | 'card' | 'bank_transfer' | 'mock_gateway';
  paymentStatus: 'pending' | 'paid' | 'failed';
  fulfillmentStatus: 'unfulfilled' | 'fulfilled' | 'shipped' | 'delivered';
  placedAt: number;
};
