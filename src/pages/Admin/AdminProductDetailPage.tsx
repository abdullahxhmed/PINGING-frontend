import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminProduct,
  ProductVariant,
  ProductVariantComponent,
  ProductComponentType,
  UpdateProductPayload,
} from '../../types/admin';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Edit3,
  X,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { CatalogImagePickerModal } from '../../components/admin/CatalogImagePickerModal';

export const AdminProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core product data state
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Image Asset Picker Modal state
  const [imagePickerTarget, setImagePickerTarget] = useState<'product' | 'variant' | null>(null);

  // Product Edit Mode State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFormData, setProductFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    basePriceRupees: string;
    imageUrl: string;
    isFeatured: boolean;
    displayOrder: number;
    weightGrams: number;
    lengthCm: number;
    breadthCm: number;
    heightCm: number;
  }>({
    name: '',
    slug: '',
    description: '',
    basePriceRupees: '0',
    imageUrl: '',
    isFeatured: false,
    displayOrder: 0,
    weightGrams: 50,
    lengthCm: 10,
    breadthCm: 10,
    heightCm: 1,
  });

  // Variant Edit / Add Modal State
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [variantFormData, setVariantFormData] = useState<{
    sku?: string;
    name: string;
    priceRupees: string;
    active: boolean;
    imageUrl?: string | null;
    components: ProductVariantComponent[];
  }>({
    sku: '',
    name: '',
    priceRupees: '0',
    active: true,
    imageUrl: null,
    components: [],
  });
  const [isSavingVariant, setIsSavingVariant] = useState(false);

  // Initialize form state from loaded product
  const initProductFormData = (p: AdminProduct) => {
    setProductFormData({
      name: p.name || '',
      slug: p.slug || '',
      description: p.description || '',
      basePriceRupees: p.basePrice !== undefined ? (p.basePrice / 100).toString() : '0',
      imageUrl: p.imageUrl || '',
      isFeatured: Boolean(p.isFeatured),
      displayOrder: p.displayOrder ?? 0,
      weightGrams: p.weightGrams ?? 50,
      lengthCm: p.lengthCm ?? 10,
      breadthCm: p.breadthCm ?? 10,
      heightCm: p.heightCm ?? 1,
    });
  };

  // Fetch product from backend
  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getCatalogProductById(id);
      const data = (res as any)?.data || res;
      setProduct(data);
      initProductFormData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleCopy = (text?: string, key?: string) => {
    if (!text || !key) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Toggle Catalog Visibility
  const handleToggleActive = async () => {
    if (!product) return;
    const nextActive = !product.active;
    setProduct({ ...product, active: nextActive });
    try {
      await adminApi.toggleProductActive(product.id, nextActive);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }
      setSuccessMessage(`Product visibility set to ${nextActive ? 'Live' : 'Hidden'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchProduct();
    } catch (err: any) {
      setProduct({ ...product, active: product.active });
      setError(err.message || 'Failed to update visibility');
    }
  };

  // Save Product-level changes
  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!product) return;

    if (!productFormData.name.trim()) {
      setError('Product name cannot be empty');
      return;
    }
    if (!productFormData.slug.trim()) {
      setError('Slug cannot be empty');
      return;
    }
    const basePricePaise = Math.round(parseFloat(productFormData.basePriceRupees || '0') * 100);
    if (isNaN(basePricePaise) || basePricePaise < 0) {
      setError('Please enter a valid price');
      return;
    }

    setIsSavingProduct(true);
    setError(null);
    try {
      const payload: UpdateProductPayload = {
        name: productFormData.name.trim(),
        slug: productFormData.slug.trim().toLowerCase(),
        description: productFormData.description.trim(),
        basePrice: basePricePaise,
        imageUrl: productFormData.imageUrl.trim() || null,
        isFeatured: productFormData.isFeatured,
        displayOrder: Number(productFormData.displayOrder) || 0,
        weightGrams: Number(productFormData.weightGrams) || 0,
        lengthCm: Number(productFormData.lengthCm) || 0,
        breadthCm: Number(productFormData.breadthCm) || 0,
        heightCm: Number(productFormData.heightCm) || 0,
      };

      await adminApi.updateCatalogProduct(product.id, payload);
      setIsEditingProduct(false);
      setSuccessMessage('Product updated successfully');
      setTimeout(() => setSuccessMessage(null), 3500);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }
      await fetchProduct();
    } catch (err: any) {
      setError(err.message || 'Failed to update specifications');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Open Variant Editor
  const handleOpenVariantEditor = (v: ProductVariant) => {
    setIsAddingVariant(false);
    setEditingVariant(v);
    setVariantFormData({
      sku: v.sku,
      name: v.name,
      priceRupees: (v.price / 100).toString(),
      active: v.active !== false,
      imageUrl: v.imageUrl || null,
      components: (v.components || []).map((c) => ({
        componentType: c.componentType,
        name: c.name,
        quantity: c.quantity,
        inventorySku: c.inventorySku || '',
        plusDurationMonths: c.plusDurationMonths,
      })),
    });
  };

  // Open Add Variant
  const handleOpenAddVariant = () => {
    setEditingVariant(null);
    setIsAddingVariant(true);
    const existingVariantsCount = product?.variants?.length || 0;
    const defaultSku = `${product?.sku || 'SKU'}-V${existingVariantsCount + 1}`;
    setVariantFormData({
      sku: defaultSku,
      name: existingVariantsCount === 1 ? 'Dark' : `Variant ${existingVariantsCount + 1}`,
      priceRupees: product?.basePrice ? (product.basePrice / 100).toString() : '99',
      active: true,
      imageUrl: null,
      components: [
        {
          componentType: 'SERIALIZED_QR_TAG',
          name: 'Vehicle QR Tag',
          quantity: 1,
          inventorySku: defaultSku,
        },
      ],
    });
  };

  const handleCloseVariantEditor = () => {
    setEditingVariant(null);
    setIsAddingVariant(false);
  };

  // Save Variant
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingVariant && (!editingVariant || !editingVariant.id)) return;

    if (!variantFormData.name.trim()) {
      setError('Variant name cannot be empty');
      return;
    }
    if (isAddingVariant && !variantFormData.sku?.trim()) {
      setError('Variant SKU cannot be empty');
      return;
    }
    const pricePaise = Math.round(parseFloat(variantFormData.priceRupees || '0') * 100);
    if (isNaN(pricePaise) || pricePaise < 0) {
      setError('Please enter a valid variant price');
      return;
    }

    for (let i = 0; i < variantFormData.components.length; i++) {
      const comp = variantFormData.components[i];
      if (!comp.name.trim()) {
        setError(`Component #${i + 1} must have a name`);
        return;
      }
      if (!comp.quantity || comp.quantity < 1) {
        setError(`Component #${i + 1} must have a quantity of at least 1`);
        return;
      }
    }

    setIsSavingVariant(true);
    setError(null);
    try {
      if (isAddingVariant) {
        if (!product?.id) throw new Error('Product ID not found');
        const payload = {
          sku: variantFormData.sku?.trim() || `${product.sku}-V${(product.variants?.length || 1) + 1}`,
          name: variantFormData.name.trim(),
          price: pricePaise,
          imageUrl: variantFormData.imageUrl ? variantFormData.imageUrl.trim() : null,
          components: variantFormData.components.map((c) => ({
            componentType: c.componentType,
            name: c.name.trim(),
            quantity: Number(c.quantity) || 1,
            inventorySku: c.inventorySku?.trim() || undefined,
            plusDurationMonths:
              c.componentType === 'DIGITAL_ENTITLEMENT' ? Number(c.plusDurationMonths) || 12 : undefined,
          })),
        };

        await adminApi.addProductVariant(product.id, payload);
        setIsAddingVariant(false);
        setSuccessMessage(`Variant "${variantFormData.name}" added`);
      } else if (editingVariant && editingVariant.id) {
        const payload = {
          name: variantFormData.name.trim(),
          price: pricePaise,
          active: variantFormData.active,
          imageUrl: variantFormData.imageUrl ? variantFormData.imageUrl.trim() : null,
          components: variantFormData.components.map((c) => ({
            componentType: c.componentType,
            name: c.name.trim(),
            quantity: Number(c.quantity) || 1,
            inventorySku: c.inventorySku?.trim() || undefined,
            plusDurationMonths:
              c.componentType === 'DIGITAL_ENTITLEMENT' ? Number(c.plusDurationMonths) || 12 : undefined,
          })),
        };

        await adminApi.updateCatalogVariant(editingVariant.id, payload);
        setEditingVariant(null);
        setSuccessMessage(`Variant "${variantFormData.name}" updated`);
      }

      setTimeout(() => setSuccessMessage(null), 3500);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }
      await fetchProduct();
    } catch (err: any) {
      setError(err.message || 'Failed to save variant');
    } finally {
      setIsSavingVariant(false);
    }
  };

  const formatPrice = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toFixed(0)}`;
  };

  const getInitialFolderForType = (type?: string) => {
    if (!type) return 'general';
    if (type.includes('VEHICLE')) return 'vehicle_stickers';
    if (type.includes('KEYCHAIN')) return 'keychain';
    if (type.includes('MINI')) return 'mini_stickers';
    if (type.includes('COMBO') || type.includes('PACK') || type.includes('BUNDLE')) return 'bundles';
    return 'general';
  };

  const handleSelectArtworkAsset = (objectPath: string) => {
    if (imagePickerTarget === 'variant') {
      setVariantFormData((prev) => ({ ...prev, imageUrl: objectPath }));
    } else {
      setProductFormData((prev) => ({ ...prev, imageUrl: objectPath }));
    }
    setImagePickerTarget(null);
  };

  // Single default image (no dark/light distinction)
  const displayImageUrl =
    (isEditingProduct ? productFormData.imageUrl : product?.imageUrl) || DEFAULT_PRODUCT_IMAGE;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto pb-24 px-4 sm:px-6">
        {/* ── Top Bar: Clean Breadcrumbs & Primary Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/catalog')}
              className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-ink transition-colors cursor-pointer"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted font-sans">
                <span className="hover:text-ink cursor-pointer" onClick={() => navigate('/admin/catalog')}>
                  Catalog
                </span>
                <span>/</span>
                <span className="text-ink">{product?.name || 'Product'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchProduct}
              disabled={isLoading || isSavingProduct}
              className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-ink transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {product && !isEditingProduct && (
              <button
                type="button"
                onClick={handleToggleActive}
                className="px-2.5 py-1 rounded-md text-xs font-sans text-ink hover:bg-surface border border-border inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-emerald-600' : 'bg-muted/50'}`} />
                <span>{product.active ? 'Live in store' : 'Draft (hidden)'}</span>
              </button>
            )}

            {product && (
              <button
                type="button"
                onClick={() => {
                  if (isEditingProduct) {
                    if (product) initProductFormData(product);
                    setIsEditingProduct(false);
                  } else {
                    if (product) initProductFormData(product);
                    setIsEditingProduct(true);
                  }
                }}
                className={`px-3 py-1 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  isEditingProduct
                    ? 'border border-border text-ink hover:bg-surface'
                    : 'bg-ink text-surface hover:opacity-90'
                }`}
              >
                {isEditingProduct ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel edit</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit product</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Status Notifications ── */}
        {error && (
          <div className="mt-4 p-3 rounded-md bg-surface border border-red-500/20 text-xs text-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 text-muted hover:text-ink cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-md bg-surface border border-emerald-500/20 text-xs text-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="p-1 text-muted hover:text-ink cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isLoading && !product ? (
          <div className="py-24 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-ink" />
            <span>Loading product...</span>
          </div>
        ) : !product ? (
          <div className="py-20 text-center text-xs text-muted">
            Product not found or has been removed.
          </div>
        ) : (
          /* ── Main Viewport Split Layout ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-6">
            {/* ── Image Column: Full Viewport Prominence ── */}
            <div className="lg:col-span-6">
              <div className="lg:sticky lg:top-20 space-y-3">
                <div className="w-full aspect-square rounded-lg border border-border overflow-hidden relative">
                  <img
                    src={displayImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {isEditingProduct && (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex justify-center">
                      <button
                        type="button"
                        onClick={() => setImagePickerTarget('product')}
                        className="px-3 py-1.5 rounded-md bg-surface text-ink text-xs font-sans font-medium inline-flex items-center gap-1.5 shadow-sm hover:bg-bg cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change product image</span>
                      </button>
                    </div>
                  )}
                </div>

                {isEditingProduct && (
                  <div className="text-[11px] text-muted flex items-center justify-between px-1">
                    <span className="truncate max-w-[320px]">
                      {productFormData.imageUrl || 'No custom image set'}
                    </span>
                    {productFormData.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setProductFormData({ ...productFormData, imageUrl: '' })}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Reset image
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Details & Controls Column ── */}
            <div className="lg:col-span-6 space-y-8">
              {isEditingProduct ? (
                /* EDIT MODE FORM */
                <form onSubmit={handleSaveProduct} className="space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-sm font-medium text-ink">Edit product details</h2>

                    <div>
                      <label className="block text-xs text-muted mb-1 font-sans">Product name</label>
                      <input
                        type="text"
                        required
                        value={productFormData.name}
                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink text-sm font-sans focus:outline-none focus:border-ink transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted mb-1 font-sans">Base price (₹)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          required
                          value={productFormData.basePriceRupees}
                          onChange={(e) => setProductFormData({ ...productFormData, basePriceRupees: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink text-sm font-satoshi font-medium focus:outline-none focus:border-ink transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted mb-1 font-sans">Slug (URL path)</label>
                        <input
                          type="text"
                          required
                          value={productFormData.slug}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                            })
                          }
                          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink text-sm font-satoshi font-medium focus:outline-none focus:border-ink transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted mb-1 font-sans">Description</label>
                      <textarea
                        rows={3}
                        value={productFormData.description}
                        onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink text-sm font-sans focus:outline-none focus:border-ink transition-colors leading-relaxed"
                        placeholder="Product features, contents and usage..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs text-muted mb-1 font-sans">Storefront display order</label>
                        <input
                          type="number"
                          value={productFormData.displayOrder}
                          onChange={(e) => setProductFormData({ ...productFormData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink text-sm font-satoshi font-medium focus:outline-none focus:border-ink transition-colors"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-ink font-sans">
                          <input
                            type="checkbox"
                            checked={productFormData.isFeatured}
                            onChange={(e) => setProductFormData({ ...productFormData, isFeatured: e.target.checked })}
                            className="rounded border-border text-ink focus:ring-0 cursor-pointer"
                          />
                          <span>Feature on storefront</span>
                        </label>
                      </div>
                    </div>

                    {/* Shipping Dimensions Form */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <h3 className="text-xs font-medium text-ink font-sans">Shipping & packaging dimensions</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-muted mb-1 font-sans">Weight (g)</label>
                          <input
                            type="number"
                            min="0"
                            value={productFormData.weightGrams}
                            onChange={(e) => setProductFormData({ ...productFormData, weightGrams: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-satoshi font-medium focus:outline-none focus:border-ink"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted mb-1 font-sans">Length (cm)</label>
                          <input
                            type="number"
                            min="0"
                            value={productFormData.lengthCm}
                            onChange={(e) => setProductFormData({ ...productFormData, lengthCm: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-satoshi font-medium focus:outline-none focus:border-ink"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-muted mb-1 font-sans">Breadth (cm)</label>
                          <input
                            type="number"
                            min="0"
                            value={productFormData.breadthCm}
                            onChange={(e) => setProductFormData({ ...productFormData, breadthCm: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-satoshi font-medium focus:outline-none focus:border-ink"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-sans text-muted mb-1">Height (cm)</label>
                          <input
                            type="number"
                            min="0"
                            value={productFormData.heightCm}
                            onChange={(e) => setProductFormData({ ...productFormData, heightCm: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-satoshi font-medium focus:outline-none focus:border-ink"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (product) initProductFormData(product);
                        setIsEditingProduct(false);
                      }}
                      disabled={isSavingProduct}
                      className="px-3.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-sans hover:bg-bg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingProduct}
                      className="px-4 py-1.5 rounded-md bg-ink text-surface text-xs font-sans font-medium hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer transition-opacity"
                    >
                      {isSavingProduct ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{isSavingProduct ? 'Saving...' : 'Save changes'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEW MODE INFORMATION */
                <div className="space-y-8">
                  {/* Title & Primary Pricing */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
                          {product.name}
                        </h1>
                        <p className="text-xs text-muted font-sans">
                          /{product.slug} · {product.active ? 'Live on store' : 'Draft'}
                          {product.isFeatured && ' · Featured'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-satoshi font-medium text-2xl sm:text-3xl text-ink">
                          {formatPrice(product.basePrice)}
                        </span>
                        <p className="text-[11px] text-muted font-sans">Base price</p>
                      </div>
                    </div>

                    {product.description && (
                      <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-sans pt-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Variants & Kit Contents List */}
                  <div className="pt-6 border-t border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-medium uppercase tracking-wider text-muted font-sans">
                          Variants & kit contents
                        </h2>
                        <p className="text-xs text-muted font-sans">
                          {product.variants?.length || 0} variant{(product.variants?.length || 0) === 1 ? '' : 's'} available
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenAddVariant}
                        className="px-2.5 py-1 rounded-md text-xs font-sans font-medium text-ink hover:bg-surface border border-border inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add variant</span>
                      </button>
                    </div>

                    {(!product.variants || product.variants.length === 0) ? (
                      <p className="text-xs text-muted py-4">No variants configured for this product.</p>
                    ) : (
                      <div className="divide-y divide-border border-y border-border">
                        {product.variants.map((v) => (
                          <div key={v.id} className="py-3.5 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded border border-border bg-surface/50 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                <img
                                  src={v.imageUrl || product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                                  alt={v.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                  }}
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-ink">{v.name}</span>
                                  <span className="text-xs font-satoshi font-medium text-muted">
                                    {v.sku}
                                  </span>
                                  {v.active === false && (
                                    <span className="text-[10px] text-muted font-sans">
                                      (Inactive)
                                    </span>
                                  )}
                                </div>

                                {/* Components summary */}
                                {v.components && v.components.length > 0 && (
                                  <div className="text-xs text-muted font-sans flex flex-wrap gap-x-2">
                                    {v.components.map((c, i) => (
                                      <span key={i}>
                                        <span className="font-satoshi font-medium">{c.quantity}</span>× {c.name}
                                        {i < v.components.length - 1 ? ' · ' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-satoshi font-medium text-sm sm:text-base text-ink">
                                {formatPrice(v.price)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleOpenVariantEditor(v)}
                                className="px-2.5 py-1 rounded-md text-xs font-sans text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logistics & Packaging Specifications */}
                  <div className="pt-6 border-t border-border space-y-3">
                    <h2 className="text-xs font-medium uppercase tracking-wider text-muted font-sans">
                      Shipping & packaging
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs font-sans">
                      <div>
                        <span className="text-muted block text-[11px]">Weight</span>
                        <span className="font-satoshi font-medium text-sm text-ink mt-0.5 block">
                          {product.weightGrams ?? 0} g
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Length</span>
                        <span className="font-satoshi font-medium text-sm text-ink mt-0.5 block">
                          {product.lengthCm ?? 0} cm
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Breadth</span>
                        <span className="font-satoshi font-medium text-sm text-ink mt-0.5 block">
                          {product.breadthCm ?? 0} cm
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">Height</span>
                        <span className="font-satoshi font-medium text-sm text-ink mt-0.5 block">
                          {product.heightCm ?? 0} cm
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quiet Technical Metadata */}
                  <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-y-2 text-[11px] text-muted font-satoshi font-medium">
                    <div className="flex items-center gap-2">
                      <span>SKU: {product.sku}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(product.sku, 'sku')}
                        className="p-1 hover:text-ink cursor-pointer"
                        title="Copy SKU"
                      >
                        {copiedKey === 'sku' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <span>·</span>
                      <span className="font-sans">Rank: #{product.displayOrder ?? 0}</span>
                    </div>

                    <div className="text-muted/70">
                      ID: <span className="font-satoshi">{product.id.slice(0, 8)}...</span>
                      {product.updatedAt && (
                        <span> · Updated {new Date(product.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Variant & Components Edit Modal ── */}
        {(editingVariant || isAddingVariant) && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-lg border border-border bg-surface shadow-lg p-6 space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-medium text-sm text-ink font-sans">
                  {isAddingVariant ? 'Add variant' : `Edit variant: ${editingVariant?.name}`}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseVariantEditor}
                  className="p-1 text-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveVariant} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {isAddingVariant && (
                    <div>
                      <label className="block text-xs text-muted mb-1 font-sans">SKU *</label>
                      <input
                        type="text"
                        required
                        value={variantFormData.sku || ''}
                        onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-ink text-xs font-satoshi font-medium focus:outline-none focus:border-ink"
                        placeholder="KT-VS-SGL-DRK"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted mb-1 font-sans">Variant name *</label>
                    <input
                      type="text"
                      required
                      value={variantFormData.name}
                      onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-ink text-xs font-sans focus:outline-none focus:border-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-muted mb-1 font-sans">Price (₹) *</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={variantFormData.priceRupees}
                      onChange={(e) => setVariantFormData({ ...variantFormData, priceRupees: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-border bg-bg text-ink text-xs font-satoshi font-medium focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-ink font-sans">
                    <input
                      type="checkbox"
                      checked={variantFormData.active}
                      onChange={(e) => setVariantFormData({ ...variantFormData, active: e.target.checked })}
                      className="rounded border-border text-ink focus:ring-0 cursor-pointer"
                    />
                    <span>Active for purchase</span>
                  </label>
                </div>

                {/* Variant-specific image override */}
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted font-sans">Variant artwork</label>
                    <button
                      type="button"
                      onClick={() => setImagePickerTarget('variant')}
                      className="text-xs text-ink underline hover:opacity-80 cursor-pointer"
                    >
                      {variantFormData.imageUrl ? 'Change image' : 'Select custom image'}
                    </button>
                  </div>

                  {variantFormData.imageUrl ? (
                    <div className="flex items-center justify-between p-2 rounded-md border border-border bg-bg text-xs">
                      <span className="truncate max-w-[280px] font-satoshi text-[11px] text-ink">
                        {variantFormData.imageUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVariantFormData({ ...variantFormData, imageUrl: null })}
                        className="text-muted hover:text-red-600 text-xs cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted font-sans">
                      Inherits default product image.
                    </p>
                  )}
                </div>

                {/* Included Components */}
                <div className="pt-3 border-t border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs text-muted font-sans">Included components</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setVariantFormData({
                          ...variantFormData,
                          components: [
                            ...variantFormData.components,
                            {
                              componentType: 'SERIALIZED_QR_TAG',
                              name: 'Vehicle QR Tag',
                              quantity: 1,
                              inventorySku: 'TAG-CAR-01',
                            },
                          ],
                        })
                      }
                      className="text-xs text-ink hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add component</span>
                    </button>
                  </div>

                  {variantFormData.components.length === 0 ? (
                    <p className="text-xs text-muted py-2">No components defined.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {variantFormData.components.map((c, cIdx) => (
                        <div key={cIdx} className="p-2.5 rounded-md border border-border bg-bg space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={c.componentType}
                              onChange={(e) => {
                                const updated = [...variantFormData.components];
                                updated[cIdx].componentType = e.target.value as ProductComponentType;
                                setVariantFormData({ ...variantFormData, components: updated });
                              }}
                              className="px-2 py-1 rounded border border-border bg-surface text-ink text-xs font-sans"
                            >
                              <option value="SERIALIZED_QR_TAG">Physical QR Tag</option>
                              <option value="PHYSICAL_ITEM">Kit Item</option>
                              <option value="DIGITAL_ENTITLEMENT">Digital Entitlement</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = variantFormData.components.filter((_, i) => i !== cIdx);
                                setVariantFormData({ ...variantFormData, components: updated });
                              }}
                              className="p-1 text-muted hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              value={c.name}
                              onChange={(e) => {
                                const updated = [...variantFormData.components];
                                updated[cIdx].name = e.target.value;
                                setVariantFormData({ ...variantFormData, components: updated });
                              }}
                              className="px-2 py-1 rounded border border-border bg-surface text-ink text-xs font-sans"
                              placeholder="Name"
                            />

                            <input
                              type="number"
                              min="1"
                              required
                              value={c.quantity}
                              onChange={(e) => {
                                const updated = [...variantFormData.components];
                                updated[cIdx].quantity = parseInt(e.target.value, 10) || 1;
                                setVariantFormData({ ...variantFormData, components: updated });
                              }}
                              className="px-2 py-1 rounded border border-border bg-surface text-ink text-xs font-satoshi font-medium"
                              placeholder="Qty"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseVariantEditor}
                    disabled={isSavingVariant}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-sans text-muted hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingVariant}
                    className="px-4 py-1.5 rounded-md bg-ink text-surface text-xs font-sans font-medium hover:opacity-90 cursor-pointer"
                  >
                    {isSavingVariant ? 'Saving...' : 'Save variant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Catalog Image Library Modal ── */}
        {imagePickerTarget && (
          <CatalogImagePickerModal
            isOpen={Boolean(imagePickerTarget)}
            onClose={() => setImagePickerTarget(null)}
            onSelectImage={handleSelectArtworkAsset}
            title={
              imagePickerTarget === 'variant'
                ? `Select Artwork for ${variantFormData.name || 'Variant'}`
                : 'Select Product Artwork'
            }
            initialFolder={getInitialFolderForType(product?.type)}
          />
        )}
      </div>
    </AdminLayout>
  );
};
