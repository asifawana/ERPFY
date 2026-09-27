import type { Metadata } from 'next';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';

import { AccountGate } from '@/components/account/AccountGate';
import { SampleDataBadge } from '@/components/modules/ModuleShell';

export const metadata: Metadata = { title: 'Products' };

const PRODUCTS = [
  {
    name: 'Premium Cotton Crewneck',
    sku: 'SKU-TSH-281',
    category: 'Apparel',
    stock: '142 in stock',
    price: '$32.00',
    status: {
      label: 'Active',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
  },
  {
    name: 'Stainless Steel Flask 1L',
    sku: 'SKU-FLK-092',
    category: 'Homeware',
    stock: '45 in stock',
    price: '$24.50',
    status: {
      label: 'Active',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
  },
  {
    name: 'Classic Roast Coffee Blend',
    sku: 'SKU-CFE-442',
    category: 'Groceries',
    stock: '12 in stock',
    price: '$18.00',
    status: { label: 'Draft', bg: 'bg-[#F3F4F6] text-[#4B5563]' },
  },
  {
    name: 'Genuine Leather Laptop Sleeve',
    sku: 'SKU-SLV-120',
    category: 'Accessories',
    stock: '280 in stock',
    price: '$55.00',
    status: {
      label: 'Active',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
  },
  {
    name: 'Bamboo Wireless Charger',
    sku: 'SKU-WCH-880',
    category: 'Electronics',
    stock: '0 out of stock',
    price: '$42.00',
    status: {
      label: 'Active',
      bg: 'bg-[var(--erpfy-ok-bg)] text-[var(--erpfy-ok-ink)]',
    },
  },
];

export default function ProductsPage() {
  return (
    <AccountGate wide>
      {() => (
        <div className="space-y-6">
          {/* Header Action Bar from Figma */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">
                  All Products
                </h1>
                <SampleDataBadge />
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">
                Manage your worldwide catalog inventory and prices
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--erpfy-brand)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
            >
              <Plus className="size-4" aria-hidden />
              <span>Add Product</span>
            </button>
          </div>

          {/* Filtering Row from Figma */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-xs">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg bg-[#F9FAFB] px-3 py-2 text-xs">
              <Search className="size-4 text-[#9CA3AF]" aria-hidden />
              <input
                type="text"
                placeholder="Filter products..."
                className="w-full bg-transparent text-[#111827] placeholder-[#9CA3AF] outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] shadow-xs hover:bg-[#F9FAFB]"
              >
                <span>Category</span>
                <ChevronDown className="size-3.5 text-[#9CA3AF]" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] shadow-xs hover:bg-[#F9FAFB]"
              >
                <span>Status</span>
                <ChevronDown className="size-3.5 text-[#9CA3AF]" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] shadow-xs hover:bg-[#F9FAFB]"
              >
                <span>Price Range</span>
                <ChevronDown className="size-3.5 text-[#9CA3AF]" aria-hidden />
              </button>
            </div>
          </div>

          {/* Table Container from Figma */}
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F3F4F6] text-[#6B7280]">
                    <th className="w-12 px-5 py-4">
                      <input
                        type="checkbox"
                        aria-label="Select all products"
                        className="size-4 rounded-sm border-[#D1D5DB] accent-[var(--erpfy-brand)]"
                      />
                    </th>
                    <th className="px-4 py-4 font-semibold">Product</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Stock</th>
                    <th className="px-4 py-4 font-semibold">Price</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {PRODUCTS.map((product) => (
                    <tr
                      key={product.sku}
                      className="transition-colors hover:bg-[#F9FAFB]/60"
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${product.name}`}
                          className="size-4 rounded-sm border-[#D1D5DB] accent-[var(--erpfy-brand)]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {/* A drawn tile, not a photograph of a product nobody sells. */}
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--erpfy-brand-line)] bg-[var(--erpfy-brand-soft)] text-xs font-bold text-[var(--erpfy-brand-soft-ink)]"
                            aria-hidden
                          >
                            {product.category.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-[#111827]">
                              {product.name}
                            </span>
                            <span className="block truncate text-xs text-[#9CA3AF]">
                              {product.sku}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#4B5563]">
                        {product.category}
                      </td>
                      <td className="px-4 py-4 text-[#374151]">
                        {product.stock}
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#111827]">
                        {product.price}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${product.status.bg}`}
                        >
                          {product.status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-md p-1 text-[#9CA3AF] transition-colors hover:text-[#4B5563]"
                          aria-label={`Actions for ${product.name}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer from Figma */}
            <div className="flex flex-wrap items-center justify-between border-t border-[#F3F4F6] px-5 py-3.5 text-xs text-[#6B7280]">
              <span>Showing 5 of 142 products</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 font-medium text-[#4B5563] shadow-xs hover:bg-[#F9FAFB]"
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Previous
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 font-medium text-[#4B5563] shadow-xs hover:bg-[#F9FAFB]"
                >
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AccountGate>
  );
}
