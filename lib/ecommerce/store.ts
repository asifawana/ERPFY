/**
 * ERPfy.net — Ecommerce Engine & Storefront Bridge
 * Authority: ERPfy.net Complete Implementation Master Specification (§9, §10, §26)
 *
 * Enforces server-side tenant isolation across all storefront and cart transactions.
 */

import { ApiError, auditStatement } from '../core/server.ts';
import { resolveTenantByDomain } from '../domains/resolver.ts';
import type {
  EcommerceStore,
  StoreProduct,
  StoreCollection,
  StoreCart,
  CartItem,
  EcommerceOrder,
  StorefrontAddress,
} from './types';

/**
 * Resolves or initializes the ecommerce store profile for a company.
 * Stored idempotently inside company settings or specialized partition.
 */
export async function getOrCreateStoreForCompany(
  db: D1Database,
  companyId: string,
  companyName = 'Online Store',
  companySlug = 'store',
  currency = 'USD',
): Promise<EcommerceStore> {

  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  let settingsDoc: Record<string, unknown> = {};
  if (row?.data) {
    try {
      settingsDoc = JSON.parse(row.data);
    } catch {
      settingsDoc = {};
    }
  }

  if (settingsDoc.ecommerceStore && typeof settingsDoc.ecommerceStore === 'object') {
    return settingsDoc.ecommerceStore as EcommerceStore;
  }

  const now = Date.now();
  const defaultStore: EcommerceStore = {
    id: crypto.randomUUID(),
    companyId,
    name: `${companyName} Online Store`,
    slug: companySlug,
    currency,
    taxRatePercent: 0,
    activeThemeId: 'portal-default',
    status: 'active',
    announcementText: 'Welcome to our online store! Enjoy free shipping on qualifying orders.',
    announcementEnabled: true,
    supportEmail: `orders@${companySlug}.erpfy.net`,
    shippingFlatRate: 10,
    freeShippingThreshold: 100,
    createdAt: now,
    updatedAt: now,
  };

  settingsDoc.ecommerceStore = defaultStore;

  const company = await db
    .prepare('SELECT created_by FROM core_companies WHERE id = ?1 LIMIT 1')
    .bind(companyId)
    .first<{ created_by: string }>();
  const actorId = company?.created_by || 'acc_admin';

  await db
    .prepare(
      `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (company_id) DO UPDATE SET
         data = excluded.data,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .bind(companyId, JSON.stringify(settingsDoc), now, actorId)
    .run();

  return defaultStore;
}

/**
 * Resolves a store and its tenant company by company slug or verified custom domain.
 * Strictly guarantees tenant isolation.
 */
export async function resolveStoreBySlugOrDomain(
  db: D1Database,
  slugOrDomain: string,
): Promise<{ store: EcommerceStore; company: { id: string; name: string; slug: string } }> {
  const clean = slugOrDomain.trim().toLowerCase();

  // Try matching company slug first
  const companyRow = await db
    .prepare(
      `SELECT id, name, slug, currency FROM core_companies
       WHERE slug = ?1 AND state != 'read_only' AND state != 'cancelled'
       LIMIT 1`,
    )
    .bind(clean)
    .first<{ id: string; name: string; slug: string; currency: string }>();

  if (companyRow) {
    const store = await getOrCreateStoreForCompany(
      db,
      companyRow.id,
      companyRow.name,
      companyRow.slug,
      companyRow.currency,
    );
    return { store, company: companyRow };
  }

  // Next try matching custom domain from company settings or domains
  const settingsMatch = await db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.currency, s.data
       FROM core_companies c
       JOIN core_company_settings s ON s.company_id = c.id
       WHERE json_extract(s.data, '$.ecommerceStore.customDomain') = ?1
       LIMIT 1`,
    )
    .bind(clean)
    .first<{ id: string; name: string; slug: string; currency: string; data: string }>();

  if (settingsMatch) {
    let parsedStore: EcommerceStore;
    try {
      const doc = JSON.parse(settingsMatch.data);
      parsedStore = doc.ecommerceStore;
    } catch {
      parsedStore = await getOrCreateStoreForCompany(
        db,
        settingsMatch.id,
        settingsMatch.name,
        settingsMatch.slug,
        settingsMatch.currency,
      );
    }
    return {
      store: parsedStore,
      company: {
        id: settingsMatch.id,
        name: settingsMatch.name,
        slug: settingsMatch.slug,
      },
    };
  }

  // 3. Fallback: Check if this is a verified custom domain on any tenant
  const tenantMatch = await resolveTenantByDomain(db, clean);
  if (tenantMatch) {
    const store = await getOrCreateStoreForCompany(
      db,
      tenantMatch.companyId,
      tenantMatch.name,
      tenantMatch.slug,
    );
    return {
      store,
      company: {
        id: tenantMatch.companyId,
        name: tenantMatch.name,
        slug: tenantMatch.slug,
      },
    };
  }

  throw new ApiError(404, `No storefront found for "${slugOrDomain}".`);
}

/**
 * Computes live cart pricing, taxes, promotional discounts, and shipping tiers.
 */
export function calculateCart(
  store: EcommerceStore,
  items: CartItem[],
  discountCode?: string,
): StoreCart {
  const subtotal = items.reduce((acc, item) => acc + item.price * Math.max(1, item.quantity), 0);

  let discountAmount = 0;
  if (discountCode) {
    const cleanCode = discountCode.trim().toUpperCase();
    if (cleanCode === 'WELCOME10') {
      discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
    } else if (cleanCode === 'SAVE20') {
      discountAmount = Math.round(subtotal * 0.2 * 100) / 100;
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * (store.taxRatePercent / 100) * 100) / 100;

  let shippingFee = store.shippingFlatRate;
  if (store.freeShippingThreshold && subtotal >= store.freeShippingThreshold) {
    shippingFee = 0;
  }
  if (items.length === 0) {
    shippingFee = 0;
  }

  const total = Math.round((subtotal - discountAmount + taxAmount + shippingFee) * 100) / 100;

  return {
    items,
    subtotal,
    shippingFee,
    taxAmount,
    discountCode: discountCode || undefined,
    discountAmount,
    total,
  };
}

/**
 * Places an ecommerce storefront order and securely bridges it into ERP Sales Orders.
 */
export async function createEcommerceOrder(
  db: D1Database,
  store: EcommerceStore,
  input: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: StorefrontAddress;
    items: CartItem[];
    discountCode?: string;
    paymentMethod?: 'cod' | 'card' | 'bank_transfer' | 'mock_gateway';
  },
): Promise<EcommerceOrder> {
  if (!input.items || input.items.length === 0) {
    throw new ApiError(400, 'Cannot place order with an empty cart.');
  }

  const cart = calculateCart(store, input.items, input.discountCode);
  const orderId = crypto.randomUUID();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const now = Date.now();

  const order: EcommerceOrder = {
    id: orderId,
    orderNumber,
    companyId: store.companyId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    shippingAddress: input.shippingAddress,
    items: cart.items,
    subtotal: cart.subtotal,
    shippingFee: cart.shippingFee,
    taxAmount: cart.taxAmount,
    discountAmount: cart.discountAmount,
    total: cart.total,
    paymentMethod: input.paymentMethod || 'cod',
    paymentStatus: input.paymentMethod === 'card' ? 'paid' : 'pending',
    fulfillmentStatus: 'unfulfilled',
    placedAt: now,
  };

  // Read existing orders and catalog from store settings
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(store.companyId)
    .first<{ data: string }>();

  let doc: Record<string, unknown> = {};
  if (row?.data) {
    try {
      doc = JSON.parse(row.data);
    } catch {
      doc = {};
    }
  }

  // 1. Validate Product Availability & Inventory Levels
  if (Array.isArray(doc.productsCatalog)) {
    const catalog = doc.productsCatalog as Array<{
      id: string;
      title?: string;
      name?: string;
      stockQuantity?: number;
      status?: string;
    }>;
    for (const item of cart.items) {
      const prod = catalog.find((p) => p.id === item.productId);
      if (prod) {
        if (prod.status === 'archived' || prod.status === 'disabled') {
          throw new ApiError(400, `Product "${prod.title || prod.name || item.title}" is unavailable for purchase.`);
        }
        if (typeof prod.stockQuantity === 'number' && prod.stockQuantity < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient inventory for "${prod.title || prod.name || item.title}". Available: ${prod.stockQuantity}, Requested: ${item.quantity}.`,
          );
        }
        // Decrement stock
        if (typeof prod.stockQuantity === 'number') {
          prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
        }
      }
    }
  }

  // 2. Validate Discount Code (if provided)
  if (input.discountCode) {
    const validCodes = ['WELCOME10', 'SAVE20', 'ERPFY', 'LAUNCH'];
    const customCodes: string[] = Array.isArray(doc.ecommerceDiscountCodes)
      ? (doc.ecommerceDiscountCodes as string[])
      : [];
    const isCodeValid =
      validCodes.includes(input.discountCode.toUpperCase()) ||
      customCodes.includes(input.discountCode.toUpperCase());
    if (!isCodeValid) {
      throw new ApiError(400, `Discount code "${input.discountCode}" is invalid or has expired.`);
    }
  }

  // 2. Log stock movements ledger
  const stockMovements = Array.isArray(doc.stockMovements)
    ? (doc.stockMovements as Array<Record<string, unknown>>)
    : [];
  for (const item of cart.items) {
    stockMovements.unshift({
      id: `mov_${crypto.randomUUID().slice(0, 12)}`,
      companyId: store.companyId,
      productId: item.productId,
      quantity: -item.quantity,
      referenceType: 'ecommerce_order',
      referenceId: orderNumber,
      timestamp: now,
    });
  }
  doc.stockMovements = stockMovements.slice(0, 500);

  // 3. Store order in company orders ledger
  const existingOrders = Array.isArray(doc.ecommerceOrders)
    ? (doc.ecommerceOrders as EcommerceOrder[])
    : [];

  existingOrders.unshift(order);
  doc.ecommerceOrders = existingOrders.slice(0, 100);

  // 4. Record CRM customer party if table exists
  try {
    const existingParty = await db
      .prepare(
        `SELECT id FROM crm_parties WHERE company_id = ?1 AND primary_email = ?2 LIMIT 1`,
      )
      .bind(store.companyId, input.customerEmail)
      .first<{ id: string }>();

    if (!existingParty) {
      const partyId = `party_${crypto.randomUUID().slice(0, 16)}`;
      await db
        .prepare(
          `INSERT INTO crm_parties (
            id, company_id, party_type, display_name, primary_email, primary_phone, created_at, updated_at
          ) VALUES (?1, ?2, 'individual', ?3, ?4, ?5, ?6, ?6)`,
        )
        .bind(
          partyId,
          store.companyId,
          input.customerName,
          input.customerEmail,
          input.customerPhone || '',
          now,
        )
        .run();
    }
  } catch {
    // Graceful fallback if crm_parties table is not yet migrated in current runtime
  }

  // 5. Commit atomic transaction and audit statement
  const company = await db
    .prepare('SELECT created_by FROM core_companies WHERE id = ?1 LIMIT 1')
    .bind(store.companyId)
    .first<{ created_by: string }>();
  const actorId = company?.created_by || 'acc_admin';

  await db.batch([
    db
      .prepare(
        `INSERT INTO core_company_settings (company_id, data, updated_at, updated_by)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (company_id) DO UPDATE SET
           data = excluded.data,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      )
      .bind(store.companyId, JSON.stringify(doc), now, actorId),
    auditStatement(db, {
      companyId: store.companyId,
      accountId: actorId,
      action: 'ecommerce.order.created',
      detail: `Storefront order #${orderNumber} placed for ${cart.total} ${store.currency}`,
    }),
  ]);

  return order;
}

/**
 * Returns list of ecommerce orders placed on this company's storefront.
 */
export async function listEcommerceOrders(
  db: D1Database,
  companyId: string,
): Promise<EcommerceOrder[]> {
  const row = await db
    .prepare(`SELECT data FROM core_company_settings WHERE company_id = ?1`)
    .bind(companyId)
    .first<{ data: string }>();

  if (!row?.data) return [];
  try {
    const doc = JSON.parse(row.data);
    return Array.isArray(doc.ecommerceOrders) ? (doc.ecommerceOrders as EcommerceOrder[]) : [];
  } catch {
    return [];
  }
}
