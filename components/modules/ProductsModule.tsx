'use client';

/**
 * Products Module — Complete Product Catalog & Inventory
 * Authority: ERPFY-MASTER-PLAN.md sections 39, 88. Design: DESIGN.md.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Eye,
  GripVertical,
} from 'lucide-react';

import { ErpfyStatus } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  barcode: string;
  brand: string;
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: '[DEMO] Cotton T-Shirt Crewneck',
    sku: 'APP-TSH-001',
    category: 'Apparel',
    price: 24.5,
    cost: 8.2,
    stock: 280,
    lowStockThreshold: 30,
    status: 'in_stock',
    barcode: '8901234567890',
    brand: 'ERPFY Basics',
  },
  {
    id: 'prod_2',
    name: '[DEMO] Organic Coffee Beans 1kg',
    sku: 'BEV-COF-002',
    category: 'Beverages',
    price: 38.0,
    cost: 16.5,
    stock: 172,
    lowStockThreshold: 25,
    status: 'in_stock',
    barcode: '8901234567891',
    brand: 'Highland Roast',
  },
  {
    id: 'prod_3',
    name: '[DEMO] Tennis Racket Pro Graphite',
    sku: 'SPO-TEN-003',
    category: 'Sports',
    price: 185.0,
    cost: 72.0,
    stock: 18,
    lowStockThreshold: 20,
    status: 'low_stock',
    barcode: '8901234567892',
    brand: 'AeroSport',
  },
  {
    id: 'prod_4',
    name: '[DEMO] Camping Tent Waterproof 2P',
    sku: 'OUT-TNT-004',
    category: 'Outdoors',
    price: 210.0,
    cost: 89.0,
    stock: 7,
    lowStockThreshold: 10,
    status: 'low_stock',
    barcode: '8901234567893',
    brand: 'WildPeak',
  },
  {
    id: 'prod_5',
    name: '[DEMO] Genuine Leather Belt Classic',
    sku: 'ACC-BLT-005',
    category: 'Accessories',
    price: 45.0,
    cost: 14.0,
    stock: 64,
    lowStockThreshold: 15,
    status: 'in_stock',
    barcode: '8901234567894',
    brand: 'ERPFY Basics',
  },
  {
    id: 'prod_6',
    name: '[DEMO] Stainless Steel Water Bottle 750ml',
    sku: 'ACC-BOT-006',
    category: 'Accessories',
    price: 22.0,
    cost: 6.5,
    stock: 0,
    lowStockThreshold: 20,
    status: 'out_of_stock',
    barcode: '8901234567895',
    brand: 'HydroLife',
  },
  {
    id: 'prod_7',
    name: '[DEMO] Wireless Ergonomic Mouse',
    sku: 'ELE-MOU-007',
    category: 'Electronics',
    price: 58.0,
    cost: 21.0,
    stock: 92,
    lowStockThreshold: 15,
    status: 'in_stock',
    barcode: '8901234567896',
    brand: 'NovaTech',
  },
  {
    id: 'prod_8',
    name: '[DEMO] Eco-Friendly Kraft Shipping Box (Pack of 50)',
    sku: 'PKG-BOX-008',
    category: 'Packaging',
    price: 34.0,
    cost: 12.0,
    stock: 310,
    lowStockThreshold: 50,
    status: 'in_stock',
    barcode: '8901234567897',
    brand: 'PackSafe',
  },
];

const CATEGORIES = ['All', 'Apparel', 'Beverages', 'Sports', 'Outdoors', 'Accessories', 'Electronics', 'Packaging'];

export type KpiCardKey = 'totalValue' | 'inStock' | 'lowStock' | 'outStock';

export function ProductsModule({
  initialProducts = [],
  currency = '$',
}: {
  initialProducts?: Product[];
  currency?: string;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Drag and drop state for KPI cards
  const [cardOrder, setCardOrder] = useState<KpiCardKey[]>([
    'totalValue',
    'inStock',
    'lowStock',
    'outStock',
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('erpfy_products_kpi_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length === 4 &&
          parsed.every((k: string) => ['totalValue', 'inStock', 'lowStock', 'outStock'].includes(k))
        ) {
          setCardOrder(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const nextOrder = [...cardOrder];
    const [removed] = nextOrder.splice(draggedIndex, 1);
    nextOrder.splice(targetIndex, 0, removed);
    setCardOrder(nextOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
    try {
      localStorage.setItem('erpfy_products_kpi_order', JSON.stringify(nextOrder));
    } catch {
      // Ignore storage errors
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Form State for Add Product
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Apparel',
    price: '',
    cost: '',
    stock: '',
    lowStockThreshold: '10',
    brand: '',
  });

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery);

      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesStock = stockFilter === 'all' || item.status === stockFilter;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const metrics = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.status === 'in_stock').length;
    const lowStock = products.filter((p) => p.status === 'low_stock').length;
    const outStock = products.filter((p) => p.status === 'out_of_stock').length;
    const totalValue = products.reduce((acc, p) => acc + p.stock * p.price, 0);

    return { total, inStock, lowStock, outStock, totalValue };
  }, [products]);

  const handleAddProduct = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) return;

    const priceNum = parseFloat(formData.price) || 0;
    const costNum = parseFloat(formData.cost) || 0;
    const stockNum = parseInt(formData.stock) || 0;
    const thresholdNum = parseInt(formData.lowStockThreshold) || 10;

    let status: Product['status'] = 'in_stock';
    if (stockNum === 0) status = 'out_of_stock';
    else if (stockNum <= thresholdNum) status = 'low_stock';

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category,
      price: priceNum,
      cost: costNum,
      stock: stockNum,
      lowStockThreshold: thresholdNum,
      status,
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      brand: formData.brand.trim() || 'General',
    };

    setProducts((prev) => [newProd, ...prev]);
    setIsAddOpen(false);
    setFormData({
      name: '',
      sku: '',
      category: 'Apparel',
      price: '',
      cost: '',
      stock: '',
      lowStockThreshold: '10',
      brand: '',
    });
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDuplicateProduct = useCallback((prod: Product) => {
    const duplicate: Product = {
      ...prod,
      id: `prod_${Date.now()}`,
      name: `${prod.name} (Copy)`,
      sku: `${prod.sku}-COPY`,
    };
    setProducts((prev) => [duplicate, ...prev]);
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--erpfy-ink)]">Products</h1>
            <span className="rounded-full bg-[var(--erpfy-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--erpfy-brand-soft-ink)]">
              {metrics.total} items
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--erpfy-ink-muted)]">
            Manage your product inventory, SKU tracking, pricing, and stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const csv = products
                .map((p) => `"${p.name}","${p.sku}","${p.category}",${p.price},${p.stock}`)
                .join('\n');
              const blob = new Blob([`Name,SKU,Category,Price,Stock\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'products_inventory.csv';
              a.click();
            }}
            className="soft-button flex items-center gap-1.5"
          >
            <Download className="size-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="primary-button flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards — Click & Drag Reorderable */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {cardOrder.map((key, index) => {
          const isDragging = draggedIndex === index;
          const isOver = dragOverIndex === index && draggedIndex !== index;

          const cardCommonProps = {
            key,
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
            onDrop: (e: React.DragEvent) => handleDrop(e, index),
            onDragEnd: handleDragEnd,
            className: cn(
              'erpfy-card group relative p-4 cursor-grab active:cursor-grabbing select-none transition-all duration-150',
              isDragging && 'opacity-40 border-dashed border-[var(--erpfy-brand,#15803d)] bg-neutral-50 scale-[0.98]',
              isOver && 'ring-2 ring-[var(--erpfy-brand,#15803d)] ring-offset-1 bg-[var(--erpfy-brand,#15803d)]/[0.04]',
              !isDragging && !isOver && 'hover:shadow-xs'
            ),
            title: 'Click and drag to rearrange',
          };

          if (key === 'totalValue') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Total Inventory Value</span>
                  <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">
                  {currency}{metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="mt-1 block text-xs text-[var(--erpfy-ink-muted)]">Across all active categories</span>
              </div>
            );
          }

          if (key === 'inStock') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">In Stock</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-[var(--erpfy-ink)]">{metrics.inStock}</p>
                <span className="mt-1 block text-xs text-emerald-600 font-medium">Available for order</span>
              </div>
            );
          }

          if (key === 'lowStock') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Low Stock Alert</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <AlertTriangle className="size-4 text-amber-500" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-amber-700">{metrics.lowStock}</p>
                <span className="mt-1 block text-xs text-amber-600 font-medium">Reorder suggested</span>
              </div>
            );
          }

          if (key === 'outStock') {
            return (
              <div {...cardCommonProps}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--erpfy-ink-muted)]">Out of Stock</span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-[var(--erpfy-ink-muted)] opacity-0 group-hover:opacity-70 transition-opacity" />
                    <XCircle className="size-4 text-red-500" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight text-red-600">{metrics.outStock}</p>
                <span className="mt-1 block text-xs text-red-500 font-medium">Restock needed</span>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="erpfy-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--erpfy-ink-muted)]" />
            <input
              type="text"
              placeholder="Search by product name, SKU or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="erpfy-field pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
              className="erpfy-field text-sm"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock Alert</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all',
                selectedCategory === cat
                  ? 'bg-[var(--erpfy-brand)] text-white shadow-2xs'
                  : 'bg-[var(--erpfy-hover)] text-[var(--erpfy-ink)] hover:bg-[var(--erpfy-line-soft)]',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="erpfy-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] text-xs font-semibold text-[var(--erpfy-ink-muted)]">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Product</th>
                <th className="px-3 py-3.5">SKU / Barcode</th>
                <th className="px-3 py-3.5">Category</th>
                <th className="px-3 py-3.5 text-right">Price</th>
                <th className="px-3 py-3.5 text-right">Cost</th>
                <th className="px-3 py-3.5 text-center">Stock</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--erpfy-line-soft)]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--erpfy-ink-muted)]">
                    <Package className="mx-auto size-8 text-[var(--erpfy-ink-faint)]" />
                    <p className="mt-2 font-medium">
                      {products.length === 0
                        ? 'No products in catalog.'
                        : 'No products match your search or filters.'}
                    </p>
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                          setStockFilter('all');
                        }}
                        className="mt-2 text-xs font-semibold text-[var(--erpfy-brand)] hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const margin = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-[var(--erpfy-hover)]/70 transition-colors">
                      <td aria-label={p.name} className="py-3 pl-4 pr-3 font-medium text-[var(--erpfy-ink)]">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--erpfy-brand-soft)] text-xs font-bold text-[var(--erpfy-brand-soft-ink)]">
                            {p.name.replace(/\[DEMO\]\s*/, '').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-semibold">{p.name}</span>
                            <span className="block text-xs text-[var(--erpfy-ink-muted)]">{p.brand}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-xs text-[var(--erpfy-ink-soft)] font-mono">
                        <div>{p.sku}</div>
                        <div className="text-[10px] text-[var(--erpfy-ink-muted)]">{p.barcode}</div>
                      </td>

                      <td className="px-3 py-3 text-xs text-[var(--erpfy-ink-soft)]">
                        <span className="rounded-md bg-[var(--erpfy-hover)] px-2 py-0.5 border border-[var(--erpfy-line-soft)]">
                          {p.category}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right font-semibold text-[var(--erpfy-ink)]">
                        {currency}{p.price.toFixed(2)}
                      </td>

                      <td className="px-3 py-3 text-right text-xs text-[var(--erpfy-ink-muted)]">
                        {currency}{p.cost.toFixed(2)}
                        <span className="block text-[10px] text-emerald-600">+{margin}%</span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-[var(--erpfy-ink)]">{p.stock}</span>
                        <div className="mx-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[var(--erpfy-line-soft)]">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              p.status === 'out_of_stock'
                                ? 'bg-red-500'
                                : p.status === 'low_stock'
                                  ? 'bg-amber-500'
                                  : 'bg-[var(--erpfy-brand)]',
                            )}
                            style={{ width: `${Math.min(100, Math.max(8, (p.stock / (p.lowStockThreshold * 3)) * 100))}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {p.status === 'in_stock' && <ErpfyStatus tone="success">In Stock</ErpfyStatus>}
                        {p.status === 'low_stock' && <ErpfyStatus tone="attention">Low Stock</ErpfyStatus>}
                        {p.status === 'out_of_stock' && <ErpfyStatus tone="critical">Out of Stock</ErpfyStatus>}
                      </td>

                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            title="Quick View"
                            aria-label="Quick View"
                            className="size-7 inline-flex items-center justify-center rounded-lg text-[var(--erpfy-ink-muted)] hover:bg-[var(--erpfy-line-soft)] hover:text-[var(--erpfy-ink)] transition"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateProduct(p)}
                            title="Duplicate"
                            aria-label="Duplicate"
                            className="size-7 inline-flex items-center justify-center rounded-lg text-[var(--erpfy-ink-muted)] hover:bg-[var(--erpfy-line-soft)] hover:text-[var(--erpfy-ink)] transition"
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Delete"
                            aria-label="Delete"
                            className="size-7 inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="border-t border-[var(--erpfy-line-soft)] bg-[var(--erpfy-hover)] px-4 py-3 text-xs text-[var(--erpfy-ink-muted)] flex items-center justify-between">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
          <span>Inventory data updated live</span>
        </div>
      </div>

      {/* Add Product Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new item in your company inventory catalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddProduct} className="space-y-4 py-2">
            <div>
              <label htmlFor="prod-add-name" className="erpfy-label">Product Name *</label>
              <input
                id="prod-add-name"
                required
                type="text"
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="erpfy-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-add-sku" className="erpfy-label">SKU *</label>
                <input
                  id="prod-add-sku"
                  required
                  type="text"
                  placeholder="e.g. ELE-HDP-009"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="erpfy-field uppercase font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor="prod-add-cat" className="erpfy-label">Category</label>
                <select
                  id="prod-add-cat"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="erpfy-field text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-add-price" className="erpfy-label">Selling Price ({currency}) *</label>
                <input
                  id="prod-add-price"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="erpfy-field"
                />
              </div>

              <div>
                <label htmlFor="prod-add-cost" className="erpfy-label">Unit Cost ({currency})</label>
                <input
                  id="prod-add-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="erpfy-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-add-stock" className="erpfy-label">Initial Stock Units *</label>
                <input
                  id="prod-add-stock"
                  required
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="erpfy-field"
                />
              </div>

              <div>
                <label htmlFor="prod-add-threshold" className="erpfy-label">Low Stock Threshold</label>
                <input
                  id="prod-add-threshold"
                  type="number"
                  min="1"
                  placeholder="10"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  className="erpfy-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prod-add-brand" className="erpfy-label">Brand / Manufacturer</label>
              <input
                id="prod-add-brand"
                type="text"
                placeholder="e.g. ERPFY Originals"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="erpfy-field"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="soft-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
              >
                Save Product
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick View Product Modal */}
      {selectedProduct && (
        <Dialog open={Boolean(selectedProduct)} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
              <DialogDescription>SKU: {selectedProduct.sku} · Barcode: {selectedProduct.barcode}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--erpfy-hover)] p-3">
                <div>
                  <span className="text-xs text-[var(--erpfy-ink-muted)]">Selling Price</span>
                  <p className="text-lg font-bold text-[var(--erpfy-ink)]">{currency}{selectedProduct.price.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--erpfy-ink-muted)]">Unit Cost</span>
                  <p className="text-lg font-bold text-[var(--erpfy-ink-muted)]">{currency}{selectedProduct.cost.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Category</span>
                <span className="font-semibold text-[var(--erpfy-ink)]">{selectedProduct.category}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Current Stock</span>
                <span className="font-semibold text-[var(--erpfy-ink)]">{selectedProduct.stock} units</span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--erpfy-line-soft)] py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Status</span>
                {selectedProduct.status === 'in_stock' && <ErpfyStatus tone="success">In Stock</ErpfyStatus>}
                {selectedProduct.status === 'low_stock' && <ErpfyStatus tone="attention">Low Stock</ErpfyStatus>}
                {selectedProduct.status === 'out_of_stock' && <ErpfyStatus tone="critical">Out of Stock</ErpfyStatus>}
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-[var(--erpfy-ink-muted)]">Brand</span>
                <span className="font-semibold text-[var(--erpfy-ink)]">{selectedProduct.brand}</span>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="soft-button"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
