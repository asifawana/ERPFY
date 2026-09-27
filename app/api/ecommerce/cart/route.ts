import { database, failure, json, body, ApiError } from '@/lib/core/server';
import { resolveStoreBySlugOrDomain, calculateCart } from '@/lib/ecommerce/store';
import type { CartItem } from '@/lib/ecommerce/types';

/**
 * POST /api/ecommerce/cart
 * Calculates cart totals, discounts, taxes, and shipping fees for a storefront cart.
 * Open to public storefront shoppers (tenant isolated by store slug/domain).
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

    const rawItems = Array.isArray(payload.items) ? (payload.items as unknown[]) : [];
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

    const discountCode = typeof payload.discountCode === 'string' ? payload.discountCode.trim() : undefined;
    const cart = calculateCart(store, items, discountCode);

    return json({ ok: true, cart, currency: store.currency });
  } catch (error) {
    return failure(error);
  }
}
