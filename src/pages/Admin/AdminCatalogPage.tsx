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
  ExternalLink,
  Layers,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Map product type to readable label and styling
const getProductTypeInfo = (type?: string) => {
  switch (type) {
    case 'PHYSICAL_TAG_PACK':
      return { label: 'Physical Bundle', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'COMBO_PACK':
      return { label: 'Combo Pack', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'VEHICLE_STICKER':
      return { label: 'Vehicle Sticker', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'KEYCHAIN':
      return { label: 'Keychain Tag', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'MINI_STICKER':
      return { label: 'Mini Sticker', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'SUBSCRIPTION_ONLY':
      return { label: 'Subscription', bg: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    case 'MERCHANDISE':
      return { label: 'Merchandise', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
    default:
      return { label: type || 'Standard', bg: 'bg-zinc-50 text-zinc-600 border-border' };
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
      setError(err.message || 'Failed to update product visibility');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatPrice = (paise?: number, formatted?: string) => {
    if (formatted) return formatted;
    if (paise === undefined || paise === null) return '₹0.00';
    return `₹${(paise / 100).toFixed(2)}`;
  };

  // Summarize included bundle components
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
      .join(', ');
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* ── 1. Page Header & Primary Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
                Products &amp; Catalog
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface border border-border text-muted font-mono font-medium">
                {total} items
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 font-satoshi font-medium">
              Manage backend catalog items, inventory packaging Bill of Materials, and product status.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchProducts}
              disabled={isLoading}
              className="h-8 px-2.5 rounded-md border border-border hover:border-ink bg-surface text-ink text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Reload catalog products"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/catalog/storefront')}
              className="h-8 px-3 rounded-md border border-emerald-600/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>Storefront Placement</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/catalog/bundles/new')}
              className="h-8 px-3 rounded-md border border-border hover:border-ink bg-surface text-ink text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-muted" />
              <span>New Bundle</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/catalog/products/new')}
              className="h-8 px-3 rounded-md bg-ink text-surface text-xs font-medium inline-flex items-center gap-1.5 hover:bg-black transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Product</span>
            </button>
          </div>
        </div>

        {/* ── 2. Search, Status, and Type Filter Bar ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU, product name, or slug..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-ink text-surface font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LIVE')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  statusFilter === 'LIVE' ? 'bg-ink text-surface font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                ● Live
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('HIDDEN')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  statusFilter === 'HIDDEN' ? 'bg-ink text-surface font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                ○ Hidden
              </button>
            </div>

            {/* Product Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setPage(1);
              }}
              className="h-8 px-2.5 bg-surface border border-border rounded-md text-xs text-ink font-satoshi font-medium focus:outline-none focus:border-ink cursor-pointer"
            >
              <option value="ALL">All Product Types</option>
              <option value="PHYSICAL_TAG_PACK">Physical Bundles / Packs</option>
              <option value="COMBO_PACK">Combo Packs</option>
              <option value="VEHICLE_STICKER">Vehicle Stickers</option>
              <option value="KEYCHAIN">Keychains</option>
              <option value="MINI_STICKER">Mini Stickers</option>
              <option value="SUBSCRIPTION_ONLY">Subscriptions</option>
              <option value="MERCHANDISE">Merchandise</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 border border-red-200 bg-red-50 text-xs text-red-800 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchProducts} className="underline font-bold cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ── 3. Desktop Products Data Table ── */}
        <div className="hidden md:block border border-border rounded-xl bg-surface overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-bg/60 text-muted font-mono uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-14 text-center">Artwork</th>
                  <th className="py-2.5 px-4 w-36">SKU</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Product Name &amp; Slug</th>
                  <th className="py-2.5 px-4 w-32">Type</th>
                  <th className="py-2.5 px-4 w-28 text-right">Base Price</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Bundle Components</th>
                  <th className="py-2.5 px-3 w-20 text-center">Order</th>
                  <th className="py-2.5 px-3 w-28 text-center">Visibility</th>
                  <th className="py-2.5 px-3 w-28 text-center">Inventory</th>
                  <th className="py-2.5 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading && products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-xs text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted" />
                        <span>Loading catalog products from backend...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-xs text-muted">
                      No products found matching the current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const typeInfo = getProductTypeInfo(p.type);
                    const imgUrl = p.imageUrl || p.darkImageUrl || p.lightImageUrl || DEFAULT_PRODUCT_IMAGE;
                    const hasAnyImage = Boolean(p.imageUrl || p.darkImageUrl || p.lightImageUrl);
                    const isMissingLight = Boolean(p.darkImageUrl && !p.lightImageUrl);
                    const isMissingDark = Boolean(p.lightImageUrl && !p.darkImageUrl);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/admin/catalog/products/${p.id}`)}
                        className="hover:bg-bg/40 transition-colors cursor-pointer group"
                      >
                        {/* Artwork Preview */}
                        <td className="py-2.5 px-3 text-center">
                          <img
                            src={imgUrl}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded border border-border bg-surface mx-auto"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                        </td>

                        {/* SKU */}
                        <td className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(p.sku, p.id);
                            }}
                            className="font-mono font-semibold text-[11px] text-ink hover:underline inline-flex items-center gap-1"
                            title="Click to copy SKU"
                          >
                            <span>{p.sku}</span>
                            {copiedId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted/40 group-hover:text-ink transition-colors" />
                            )}
                          </button>
                        </td>

                        {/* Name & Slug */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-ink">{p.name}</span>
                            {p.isFeatured && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300">
                                ★ Featured
                              </span>
                            )}
                            {!hasAnyImage && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                                ⚠ No Artwork
                              </span>
                            )}
                            {isMissingLight && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                                Missing Light
                              </span>
                            )}
                            {isMissingDark && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                                Missing Dark
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-muted truncate max-w-xs">
                            /{p.slug}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded border text-[10px] ${typeInfo.bg}`}>
                            {typeInfo.label}
                          </span>
                        </td>

                        {/* Base Price */}
                        <td className="py-2.5 px-4 text-right font-mono">
                          <span className="font-semibold text-ink">
                            {formatPrice(p.basePrice, p.basePriceFormatted)}
                          </span>
                        </td>

                        {/* Bundle Components Summary */}
                        <td className="py-2.5 px-4 text-[11px] text-muted">
                          <span className="truncate block max-w-xs">{summarizeComponents(p)}</span>
                        </td>

                        {/* Display Order */}
                        <td className="py-2.5 px-3 text-center font-mono text-muted text-[11px]">
                          #{p.displayOrder ?? 0}
                        </td>

                        {/* Catalog Visibility (Live / Hidden) */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleActive(p, e)}
                            disabled={updatingId === p.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border cursor-pointer transition-colors ${
                              p.active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.active ? 'bg-emerald-600' : 'bg-muted/40'
                              }`}
                            />
                            <span>{p.active ? 'Live' : 'Hidden'}</span>
                          </button>
                        </td>

                        {/* Inventory Availability */}
                        <td className="py-2.5 px-3 text-center font-mono text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              p.inStock !== false
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {p.inStock !== false ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>

                        {/* Open Details Action */}
                        <td className="py-2.5 px-4 text-right">
                          <span className="text-[11px] font-satoshi font-medium text-muted group-hover:text-ink inline-flex items-center gap-1">
                            <span>Details</span>
                            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. Mobile Card View ── */}
        <div className="block md:hidden space-y-3">
          {isLoading && products.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-muted" />
              <span>Loading catalog products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted border border-border rounded-lg bg-surface">
              No products found matching criteria.
            </div>
          ) : (
            products.map((p) => {
              const typeInfo = getProductTypeInfo(p.type);
              const imgUrl = p.imageUrl || p.darkImageUrl || p.lightImageUrl || DEFAULT_PRODUCT_IMAGE;
              const hasAnyImage = Boolean(p.imageUrl || p.darkImageUrl || p.lightImageUrl);

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/admin/catalog/products/${p.id}`)}
                  className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="w-11 h-11 object-cover rounded-lg border border-border bg-bg shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-ink">{p.sku}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(p.sku, p.id);
                            }}
                            className="p-1 text-muted hover:text-ink cursor-pointer"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${typeInfo.bg}`}>
                            {typeInfo.label}
                          </span>
                          {!hasAnyImage && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                              ⚠ No Artwork
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(p, e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border cursor-pointer ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.active ? 'bg-emerald-600' : 'bg-muted/40'
                        }`}
                      />
                      <span>{p.active ? 'Live' : 'Hidden'}</span>
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-ink text-xs">{p.name}</h3>
                      <p className="font-mono text-[11px] text-muted">/{p.slug}</p>
                    </div>
                    <span className="font-mono font-bold text-ink text-xs">
                      {formatPrice(p.basePrice, p.basePriceFormatted)}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted flex items-center justify-between pt-1 border-t border-border/60">
                    <span className="truncate max-w-[200px]">{summarizeComponents(p)}</span>
                    <span className="font-mono text-[10px] text-ink font-semibold flex items-center gap-1">
                      <span>View Detail</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── 5. Pagination Controls ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-mono text-muted">
          <div>
            Showing {products.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total} products
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-border bg-surface hover:bg-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-1 rounded bg-bg border border-border font-medium text-ink">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-border bg-surface hover:bg-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
