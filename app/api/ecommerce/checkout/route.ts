import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { resolveStoreBySlugOrDomain, createEcommerceOrder } from '@/lib/ecommerce/store';
import { dispatchWebhook } from '@/lib/webhooks/dispatcher';
import type { CartItem, StorefrontAddress } from '@/lib/ecommerce/types';

/**
 * POST /api/ecommerce/checkout
 * Submits a customer order through the public storefront.
 * Bridges into ERP Sales Orders with complete tenant scoping.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const payload = await body(request);

    const storeSlug = typeof payload.storeSlug === 'string' ? payload.storeSlug.trim() : '';
    if (!storeSlug) {
      throw new ApiError(400, 'Store slug or domain is required.');
    }

    const { store } = await resolveStoreBySlugOrDomain(db, storeSlug);
    if (store.status !== 'active') {
      throw new ApiError(403, 'This store is currently not accepting new orders.');
    }

    const customerName = typeof payload.customerName === 'string' ? payload.customerName.trim() : '';
    const customerEmail = typeof payload.customerEmail === 'string' ? payload.customerEmail.trim() : '';
    if (!customerName || !customerEmail) {
      throw new ApiError(400, 'Customer name and valid email are required.');
    }

    const rawAddr = (payload.shippingAddress || {}) as Record<string, string | undefined>;
    const shippingAddress: StorefrontAddress = {
      firstName: rawAddr.firstName || customerName.split(' ')[0] || '',
      lastName: rawAddr.lastName || customerName.split(' ').slice(1).join(' ') || '',
      address1: rawAddr.address1 || '',
      address2: rawAddr.address2 || undefined,
      city: rawAddr.city || '',
      province: rawAddr.province || undefined,
      postalCode: rawAddr.postalCode || '',
      countryCode: rawAddr.countryCode || 'US',
      phone: rawAddr.phone || undefined,
    };


    if (!shippingAddress.address1 || !shippingAddress.city) {
      throw new ApiError(400, 'Complete shipping street address and city are required.');
    }

    const rawItems = Array.isArray(payload.items) ? (payload.items as unknown[]) : [];
    if (rawItems.length === 0) {
      throw new ApiError(400, 'Your shopping cart is empty.');
    }

    const items: CartItem[] = rawItems.map((item: any) => ({
      productId: String(item.productId || ''),
      variantId: item.variantId ? String(item.variantId) : undefined,
      title: String(item.title || 'Item'),
      variantTitle: item.variantTitle ? String(item.variantTitle) : undefined,
      price: typeof item.price === 'number' && item.price >= 0 ? item.price : 0,
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? Math.floor(item.quantity) : 1,
      imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      sku: String(item.sku || ''),
    }));

    const validPaymentMethods = ['cod', 'card', 'bank_transfer', 'mock_gateway'] as const;
    const paymentMethod = (typeof payload.paymentMethod === 'string' &&
      validPaymentMethods.includes(payload.paymentMethod as any)
      ? payload.paymentMethod
      : 'cod') as 'cod' | 'card' | 'bank_transfer' | 'mock_gateway';

    const order = await createEcommerceOrder(db, store, {
      customerName,
      customerEmail,
      customerPhone: typeof payload.customerPhone === 'string' ? payload.customerPhone.trim() : undefined,
      shippingAddress,
      items,
      discountCode: typeof payload.discountCode === 'string' ? payload.discountCode.trim() : undefined,
      paymentMethod,
    });

    // Dispatch webhook event
    dispatchWebhook(db, store.companyId, 'order.created', order).catch(() => {});

    return json({ ok: true, order, currency: store.currency }, 201);
  } catch (error) {
    return failure(error);
  }
}
