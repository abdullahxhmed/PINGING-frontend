import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { AdminProduct, ProductType } from '../../types/admin';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
import {
  Search,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutGrid,
} from 'lucide-react';

// Map product type to readable sentence-case label
const getProductTypeLabel = (type?: string) => {
  switch (type) {
    case 'PHYSICAL_TAG_PACK': return 'Physical bundle';
    case 'COMBO_PACK': return 'Combo pack';
    case 'VEHICLE_STICKER': return 'Vehicle sticker';
    case 'KEYCHAIN': return 'Keychain tag';
    case 'MINI_STICKER': return 'Mini sticker';
    case 'SUBSCRIPTION_ONLY': return 'Subscription';
    case 'MERCHANDISE': return 'Merchandise';
    default: return type ? type.replace(/_/g, ' ').toLowerCase() : 'Standard';
  }
};

export const AdminCatalogPage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProductType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'HIDDEN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getCatalogProducts({
        page,
        limit,
        search: debouncedSearch || undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        activeOnly: statusFilter === 'LIVE' ? true : statusFilter === 'HIDDEN' ? false : undefined,
      });
      const payload = (res as any)?.data || res;
      setProducts(payload.products || []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.totalPages ?? 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog products');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCopy = (text?: string, id?: string) => {
    if (!text || !id) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleToggleActive = async (product: AdminProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextActive = !product.active;
    setUpdatingId(product.id);

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, active: nextActive } : p))
    );

    try {
      await adminApi.toggleProductActive(product.id, nextActive);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }
    } catch (err: any) {
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: product.active } : p))
      );
      setError(err.message || 'Failed to update visibility');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatPrice = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toFixed(0)}`;
  };

  // Summarize included components
  const summarizeComponents = (product: AdminProduct) => {
    const variants = product.variants || [];
    if (!variants.length) return '—';
    const components = variants[0]?.components || [];
    if (!components.length) return '—';

    return components
      .map((c) => {
        if (c.componentType === 'DIGITAL_ENTITLEMENT') {
          return `${c.plusDurationMonths || 12}M Plus`;
        }
        return `${c.quantity}× ${c.name}`;
      })
      .join(' · ');
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto pb-24 px-4 sm:px-6 space-y-6">
        {/* ── 1. Page Header & Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-ink font-sans">
                Products &amp; Catalog
              </h1>
              <span className="text-xs text-muted font-satoshi font-medium">
                ({total})
              </span>
            </div>
            <p className="text-xs text-muted font-sans mt-0.5">
              Manage items, pricing, kit contents, and storefront visibility.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchProducts}
              disabled={isLoading}
              className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-ink transition-colors cursor-pointer"
              title="Refresh catalog"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/catalog/storefront')}
              className="px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-bg text-ink text-xs font-sans font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-muted" />
              <span>Storefront</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/catalog/bundles/new')}
              className="px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-bg text-ink text-xs font-sans font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-muted" />
              <span>New bundle</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/catalog/products/new')}
              className="px-3.5 py-1.5 rounded-md bg-ink text-surface text-xs font-sans font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New product</span>
            </button>
          </div>
        </div>

        {/* ── 2. Search & Filter Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, SKU, or slug..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors font-sans"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter Tabs */}
            <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-sans">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  statusFilter === 'ALL' ? 'bg-ink text-surface font-medium' : 'text-muted hover:text-ink'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LIVE')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  statusFilter === 'LIVE' ? 'bg-ink text-surface font-medium' : 'text-muted hover:text-ink'
                }`}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('HIDDEN')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  statusFilter === 'HIDDEN' ? 'bg-ink text-surface font-medium' : 'text-muted hover:text-ink'
                }`}
              >
                Hidden
              </button>
            </div>

            {/* Product Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="h-8 px-2.5 bg-surface border border-border rounded-md text-xs text-ink focus:outline-none focus:border-ink cursor-pointer font-sans"
            >
              <option value="ALL">All types</option>
              <option value="PHYSICAL_TAG_PACK">Physical bundles</option>
              <option value="COMBO_PACK">Combo packs</option>
              <option value="VEHICLE_STICKER">Vehicle stickers</option>
              <option value="KEYCHAIN">Keychains</option>
              <option value="MINI_STICKER">Mini stickers</option>
              <option value="SUBSCRIPTION_ONLY">Subscriptions</option>
              <option value="MERCHANDISE">Merchandise</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-surface border border-red-500/20 text-xs text-ink rounded-md flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchProducts} className="underline font-medium cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── 3. Desktop Table (Clean Line Divider Table, No Bulky Outer Card) ── */}
        <div className="hidden md:block border-y border-border overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-muted font-sans text-xs">
                <th className="py-2.5 px-3 w-12 text-center font-normal">Image</th>
                <th className="py-2.5 px-3 min-w-[200px] font-normal">Product</th>
                <th className="py-2.5 px-3 w-36 font-normal">SKU</th>
                <th className="py-2.5 px-3 w-32 font-normal">Type</th>
                <th className="py-2.5 px-3 w-28 text-right font-normal">Price</th>
                <th className="py-2.5 px-3 min-w-[180px] font-normal">Inclusions</th>
                <th className="py-2.5 px-3 w-28 text-center font-normal">Status</th>
                <th className="py-2.5 px-3 w-28 text-right font-normal">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-ink" />
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const imgUrl = p.imageUrl || DEFAULT_PRODUCT_IMAGE;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/admin/catalog/products/${p.id}`)}
                      className="hover:bg-surface/50 transition-colors cursor-pointer group"
                    >
                      {/* Product Thumbnail */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="w-9 h-9 rounded border border-border overflow-hidden mx-auto bg-surface/50 flex items-center justify-center">
                          <img
                            src={imgUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        </div>
                      </td>

                      {/* Name & Slug */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-ink text-sm font-sans">{p.name}</span>
                            {p.isFeatured && (
                              <span className="text-[10px] text-muted font-sans">
                                · Featured
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted font-sans">
                            /{p.slug}
                          </div>
                        </div>
                      </td>

                      {/* SKU with quick copy */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(p.sku, p.id);
                          }}
                          className="font-satoshi font-medium text-xs text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
                          title="Copy SKU"
                        >
                          <span>{p.sku}</span>
                          {copiedId === p.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3 text-xs text-muted font-sans">
                        {getProductTypeLabel(p.type)}
                      </td>

                      {/* Base Price */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-satoshi font-medium text-sm text-ink">
                          {formatPrice(p.basePrice)}
                        </span>
                      </td>

                      {/* Included Components */}
                      <td className="py-2.5 px-3 text-xs text-muted font-sans">
                        <span className="truncate block max-w-xs">{summarizeComponents(p)}</span>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleActive(p, e)}
                          disabled={updatingId === p.id}
                          className="inline-flex items-center gap-1.5 text-xs font-sans text-ink hover:text-black cursor-pointer transition-colors"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              p.active ? 'bg-emerald-600' : 'bg-muted/40'
                            }`}
                          />
                          <span>{p.active ? 'Live' : 'Draft'}</span>
                        </button>
                      </td>

                      {/* Stock Status */}
                      <td className="py-2.5 px-3 text-right text-xs font-sans text-muted">
                        {p.inStock !== false ? (
                          <span>In stock</span>
                        ) : (
                          <span className="text-red-700">Out of stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 4. Mobile View: Flush Separator-Line List (No Boxed Cards) ── */}
        <div className="block md:hidden">
          {isLoading && products.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-ink" />
              <span>Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted border-y border-border">
              No products found.
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {products.map((p) => {
                const imgUrl = p.imageUrl || DEFAULT_PRODUCT_IMAGE;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/admin/catalog/products/${p.id}`)}
                    className="py-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded border border-border overflow-hidden bg-surface/50 shrink-0 flex items-center justify-center">
                        <img
                          src={imgUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                          }}
                        />
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium text-sm text-ink truncate font-sans">{p.name}</h3>
                          {p.isFeatured && (
                            <span className="text-[10px] text-muted font-sans shrink-0">· Featured</span>
                          )}
                        </div>
                        <p className="text-xs text-muted font-satoshi font-medium truncate">
                          {p.sku} · {getProductTypeLabel(p.type)}
                        </p>
                        <p className="text-xs text-muted/80 font-sans truncate">
                          {summarizeComponents(p)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-satoshi font-medium text-sm text-ink">
                        {formatPrice(p.basePrice)}
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted font-sans">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.active ? 'bg-emerald-600' : 'bg-muted/40'
                          }`}
                        />
                        <span>{p.active ? 'Live' : 'Draft'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 5. Pagination Controls ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-muted font-sans">
          <div className="font-satoshi font-medium">
            {products.length > 0 ? (page - 1) * limit + 1 : 0}–
            {Math.min(page * limit, total)} of {total} products
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-border bg-surface hover:bg-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 rounded-md bg-surface border border-border font-satoshi font-medium text-ink">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-border bg-surface hover:bg-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
