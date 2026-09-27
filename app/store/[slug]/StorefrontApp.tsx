'use client';

import { useState } from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowRight,
  Store as StoreIcon,
  Tag,
} from 'lucide-react';
import type { EcommerceStore, CartItem, StorefrontAddress } from '@/lib/ecommerce/types';
import type { StoreThemeSettings } from '@/lib/theme-engine/types';

export function StorefrontApp({
  store,
  company,
  theme,
  initialProducts,
}: {
  store: EcommerceStore;
  company: { id: string; name: string; slug: string };
  theme: StoreThemeSettings;
  initialProducts: Array<{
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    imageUrl: string;
    description: string;
    sku: string;
    category: string;
  }>;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    total: number;
  } | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    countryCode: 'US',
    paymentMethod: 'cod' as 'cod' | 'card' | 'bank_transfer',
  });

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let discountAmount = 0;
  if (appliedDiscount === 'WELCOME10') discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
  if (appliedDiscount === 'SAVE20') discountAmount = Math.round(subtotal * 0.2 * 100) / 100;

  let shippingFee = store.shippingFlatRate;
  if (store.freeShippingThreshold && subtotal >= store.freeShippingThreshold) {
    shippingFee = 0;
  }
  if (cart.length === 0) shippingFee = 0;

  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount + shippingFee) * 100) / 100);

  const addToCart = (product: (typeof initialProducts)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
          sku: product.sku,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const applyDiscount = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = discountCode.trim().toUpperCase();
    if (clean === 'WELCOME10' || clean === 'SAVE20') {
      setAppliedDiscount(clean);
      setDiscountCode('');
    } else {
      setCheckoutError('Invalid promo code. Try WELCOME10 or SAVE20');
    }
  };

  const handleCheckoutSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCheckoutError(null);
    setIsPlacingOrder(true);


    try {
      const addressPayload: StorefrontAddress = {
        firstName: formData.name.split(' ')[0] || formData.name,
        lastName: formData.name.split(' ').slice(1).join(' ') || 'Customer',
        address1: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        countryCode: formData.countryCode,
        phone: formData.phone || undefined,
      };

      const res = await fetch('/api/ecommerce/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug: store.slug,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          shippingAddress: addressPayload,
          items: cart,
          discountCode: appliedDiscount || undefined,
          paymentMethod: formData.paymentMethod,
        }),
      });

      const data = (await res.json()) as { error?: string; order?: { orderNumber: string; total: number } };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to place order.');
      }

      setOrderSuccess({
        orderNumber: data.order?.orderNumber || 'ORD-SUCCESS',
        total: data.order?.total || grandTotal,
      });
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const heroSection = theme.sections.find((s) => s.type === 'hero' && s.enabled);
  const primaryColor = theme.colors.brandPrimary || '#1e5631';

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 flex flex-col">
      {/* 1. Announcement Bar */}
      {theme.header.showAnnouncement && store.announcementEnabled && store.announcementText && (
        <div
          style={{ backgroundColor: primaryColor }}
          className="px-4 py-2 text-center text-xs font-semibold text-white tracking-wide shadow-2xs"
        >
          {store.announcementText}
        </div>
      )}

      {/* 2. Store Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="size-10 grid place-items-center rounded-xl font-bold"
            >
              <StoreIcon className="size-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-neutral-900 tracking-tight leading-none block">
                {store.name}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                Official Merchant on ERPfy.net
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            <a href="#products" className="hover:text-neutral-950 transition-colors">
              Products
            </a>
            <a href="#about" className="hover:text-neutral-950 transition-colors">
              About
            </a>
            <a href="#features" className="hover:text-neutral-950 transition-colors">
              Why Us
            </a>
          </nav>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <ShoppingBag className="size-4" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span
                style={{ backgroundColor: primaryColor }}
                className="grid size-5 place-items-center rounded-full text-[11px] font-bold text-white"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 3. Hero Section */}
      {heroSection && (
        <section className="relative overflow-hidden bg-gradient-to-b from-neutral-50 to-white py-20 px-4 sm:px-6 lg:px-8 border-b border-neutral-100">
          <div className="mx-auto max-w-4xl text-center">
            <span
              style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
            >
              <CheckCircle2 className="size-3.5" />
              Verified Direct Merchant
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 leading-tight">
              {heroSection.title || store.name}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              {heroSection.subtitle || 'Discover premium goods with guaranteed authenticity and fast delivery.'}
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <a
                href={heroSection.buttonHref || '#products'}
                style={{ backgroundColor: primaryColor }}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md hover:opacity-95 transition-all"
              >
                <span>{heroSection.buttonText || 'Shop All Products'}</span>
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 4. Products Section */}
      <section id="products" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 w-full">
        <div className="flex items-end justify-between mb-8 border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Featured Catalog</h2>
            <p className="text-xs text-neutral-500 mt-1">Live inventory managed in real-time by ERPfy</p>
          </div>
          <span className="text-xs font-medium text-neutral-500">
            {initialProducts.length} Products Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {initialProducts.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all"
            >
              <div className="relative aspect-square overflow-hidden bg-neutral-100">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-neutral-700 shadow-xs">
                  {product.category}
                </span>
              </div>

              <div className="flex flex-col flex-1 p-4">
                <h3 className="font-semibold text-sm text-neutral-900 line-clamp-1">{product.title}</h3>
                <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed flex-1">
                  {product.description}
                </p>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-neutral-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-base text-neutral-950">
                      {product.price.toFixed(2)} {store.currency}
                    </span>
                    {product.compareAtPrice && (
                      <span className="text-xs text-neutral-400 line-through">
                        {product.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    style={{ backgroundColor: primaryColor }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:opacity-90 transition-opacity"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Features / Trust Section */}
      <section id="features" className="bg-neutral-50 border-t border-neutral-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
            <Truck className="size-6 mx-auto mb-2 text-neutral-700" />
            <h4 className="font-bold text-sm text-neutral-900">Tracked Shipping</h4>
            <p className="text-xs text-neutral-500 mt-0.5">Reliable delivery straight to your door</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
            <ShieldCheck className="size-6 mx-auto mb-2 text-neutral-700" />
            <h4 className="font-bold text-sm text-neutral-900">Direct from ERP</h4>
            <p className="text-xs text-neutral-500 mt-0.5">Verified inventory with no middlemen</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
            <RotateCcw className="size-6 mx-auto mb-2 text-neutral-700" />
            <h4 className="font-bold text-sm text-neutral-900">Hassle-Free Returns</h4>
            <p className="text-xs text-neutral-500 mt-0.5">30-day exchange and refund policy</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
            <Clock className="size-6 mx-auto mb-2 text-neutral-700" />
            <h4 className="font-bold text-sm text-neutral-900">Dedicated Support</h4>
            <p className="text-xs text-neutral-500 mt-0.5">{store.supportEmail}</p>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer id="about" className="border-t border-neutral-200 bg-neutral-900 text-neutral-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-bold text-lg text-white block">{store.name}</span>
            <p className="text-xs text-neutral-400 mt-1">
              Operated on <strong>ERPfy.net</strong> — Global Multi-Tenant ERP & SaaS Commerce Platform.
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            {theme.footer.copyrightText || `© 2026 ${store.name}. All rights reserved.`}
          </div>
        </div>
      </footer>

      {/* 7. Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-neutral-700" />
                <h3 className="font-bold text-base text-neutral-900">Your Cart</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                  {cartCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 divide-y divide-neutral-100">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-neutral-500">
                  <ShoppingBag className="size-10 mx-auto text-neutral-300 mb-3" />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className="text-xs text-neutral-400 mt-1">Explore our catalog and add items</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="size-14 rounded-lg object-cover border border-neutral-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{item.title}</p>
                        <p className="text-xs text-neutral-500">
                          {item.price.toFixed(2)} {store.currency}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-neutral-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 hover:bg-neutral-100 rounded-l text-neutral-600"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-neutral-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 hover:bg-neutral-100 rounded-r text-neutral-600"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-neutral-200 p-5 bg-neutral-50/70 space-y-3">
                <form onSubmit={applyDiscount} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Discount code (try WELCOME10)"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 uppercase placeholder:normal-case focus:border-neutral-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                  >
                    Apply
                  </button>
                </form>

                <div className="space-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-200">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      {subtotal.toFixed(2)} {store.currency}
                    </span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount ({appliedDiscount})</span>
                      <span>
                        -{discountAmount.toFixed(2)} {store.currency}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {shippingFee === 0 ? 'FREE' : `${shippingFee.toFixed(2)} ${store.currency}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-neutral-900 pt-2 border-t border-neutral-200">
                    <span>Total</span>
                    <span>
                      {grandTotal.toFixed(2)} {store.currency}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full rounded-xl py-3 text-center text-sm font-semibold text-white shadow-md hover:opacity-95 transition-opacity"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 p-1"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-xl font-bold text-neutral-900 mb-1">Storefront Checkout</h2>
            <p className="text-xs text-neutral-500 mb-6">
              Complete your shipping details to place your order with {store.name}.
            </p>

            {checkoutError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                {checkoutError}
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  placeholder="+1 555-0199"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Street Address *</label>
                <input
                  required
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                  placeholder="123 Commerce Boulevard, Suite 400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">City *</label>
                  <input
                    required
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                    placeholder="10001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'cod' })}
                    className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                      formData.paymentMethod === 'cod'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Cash on Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                    className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                      formData.paymentMethod === 'card'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Card Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'bank_transfer' })}
                    className={`rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                      formData.paymentMethod === 'bank_transfer'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
                <span className="font-bold text-sm text-neutral-900">
                  Total Due: {grandTotal.toFixed(2)} {store.currency}
                </span>
                <button
                  type="submit"
                  disabled={isPlacingOrder}
                  style={{ backgroundColor: primaryColor }}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {isPlacingOrder ? 'Processing Order...' : 'Confirm & Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Order Success Dialog */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="size-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 grid place-items-center mb-4">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Order Placed Successfully!</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Your order has been transmitted directly into {company.name}&apos;s ERP operations.
            </p>

            <div className="my-6 rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs space-y-1.5 text-left">
              <div className="flex justify-between font-semibold text-neutral-900">
                <span>Order Reference:</span>
                <span className="font-mono">{orderSuccess.orderNumber}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Amount:</span>
                <span className="font-bold">
                  {orderSuccess.total.toFixed(2)} {store.currency}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Fulfillment Status:</span>
                <span className="text-amber-700 font-semibold">Processing in ERP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOrderSuccess(null)}
              className="w-full rounded-xl bg-neutral-900 py-3 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
