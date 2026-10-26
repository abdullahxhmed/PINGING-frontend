import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { AdminProduct, ProductVariant, ProductVariantComponent, ProductComponentType, UpdateProductPayload } from '../../types/admin';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
import {
  ArrowLeft,
  Layers,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Truck,
  Eye,
  EyeOff,
  Edit3,
  X,
  Save,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Package,
  Calendar,
  Lock,
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
  const [activeTone, setActiveTone] = useState<'dark' | 'light'>('dark');

  // Image Asset Picker Modal state
  const [imagePickerTarget, setImagePickerTarget] = useState<'default' | 'dark' | 'light' | 'variant' | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{ default?: string; dark?: string; light?: string }>({});

  // Product Edit Mode State (Product-level fields only)
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFormData, setProductFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    basePriceRupees: string;
    imageUrl: string;
    darkImageUrl: string;
    lightImageUrl: string;
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
    darkImageUrl: '',
    lightImageUrl: '',
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
  const [variantPreviewUrl, setVariantPreviewUrl] = useState<string | null>(null);

  // Initialize form state from loaded product
  const initProductFormData = (p: AdminProduct) => {
    setProductFormData({
      name: p.name || '',
      slug: p.slug || '',
      description: p.description || '',
      basePriceRupees: p.basePrice !== undefined ? (p.basePrice / 100).toString() : '0',
      imageUrl: p.imageUrl || '',
      darkImageUrl: p.darkImageUrl || '',
      lightImageUrl: p.lightImageUrl || '',
      isFeatured: Boolean(p.isFeatured),
      displayOrder: p.displayOrder ?? 0,
      weightGrams: p.weightGrams ?? 50,
      lengthCm: p.lengthCm ?? 10,
      breadthCm: p.breadthCm ?? 10,
      heightCm: p.heightCm ?? 1,
    });
  };

  // Fetch product directly using dedicated admin detail endpoint
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

  // Toggle Catalog Visibility (Product-level active toggle)
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
      setSuccessMessage(`Product visibility set to ${nextActive ? 'Live in Store' : 'Hidden from Store'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchProduct();
    } catch (err: any) {
      setProduct({ ...product, active: product.active });
      setError(err.message || 'Failed to update product visibility status');
    }
  };

  // Save Product-level changes to PATCH /api/admin/catalog/products/:id
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
      setError('Please enter a valid base price');
      return;
    }

    setIsSavingProduct(true);
    setError(null);
    try {
      const payload: UpdateProductPayload = {
        name: productFormData.name.trim(),
        slug: productFormData.slug.trim().toLowerCase(),
        description: productFormData.description.trim(),
        // Note: product type is excluded from edits to prevent backend schema corruption
        basePrice: basePricePaise,
        imageUrl: productFormData.imageUrl.trim() || null,
        darkImageUrl: productFormData.darkImageUrl.trim() || null,
        lightImageUrl: productFormData.lightImageUrl.trim() || null,
        isFeatured: productFormData.isFeatured,
        displayOrder: Number(productFormData.displayOrder) || 0,
        weightGrams: Number(productFormData.weightGrams) || 0,
        lengthCm: Number(productFormData.lengthCm) || 0,
        breadthCm: Number(productFormData.breadthCm) || 0,
        heightCm: Number(productFormData.heightCm) || 0,
      };

      await adminApi.updateCatalogProduct(product.id, payload);
      setIsEditingProduct(false);
      setSuccessMessage('Product overview & specifications updated successfully');
      setTimeout(() => setSuccessMessage(null), 3500);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }
      // Re-fetch product from backend to verify actual persisted state
      await fetchProduct();
    } catch (err: any) {
      setError(err.message || 'Failed to update product specifications');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Start Variant & Component editing
  const handleOpenVariantEditor = (v: ProductVariant) => {
    setIsAddingVariant(false);
    setEditingVariant(v);
    setVariantPreviewUrl(v.imageUrl || null);
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

  // Open Add New Variant Modal
  const handleOpenAddVariant = () => {
    setEditingVariant(null);
    setIsAddingVariant(true);
    setVariantPreviewUrl(null);
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
    setVariantPreviewUrl(null);
  };

  // Save Variant-level changes & Bill of Materials components
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
      setError('Please enter a valid price for the variant');
      return;
    }

    // Validate components
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
        setSuccessMessage(`New variant "${variantFormData.name}" added successfully`);
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
        setSuccessMessage(`Variant "${variantFormData.name}" & components updated successfully`);
      }

      setTimeout(() => setSuccessMessage(null), 3500);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }
      // Re-fetch product from backend to verify actual persisted state
      await fetchProduct();
    } catch (err: any) {
      setError(err.message || 'Failed to save variant and components');
    } finally {
      setIsSavingVariant(false);
    }
  };

  const formatPrice = (paise?: number, formatted?: string) => {
    if (formatted) return formatted;
    if (paise === undefined || paise === null) return '₹0.00';
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const getInitialFolderForType = (type?: string) => {
    if (!type) return 'general';
    if (type.includes('VEHICLE')) return 'vehicle_stickers';
    if (type.includes('KEYCHAIN')) return 'keychain';
    if (type.includes('MINI')) return 'mini_stickers';
    if (type.includes('COMBO') || type.includes('PACK') || type.includes('BUNDLE')) return 'bundles';
    return 'general';
  };

  const handleSelectArtworkAsset = (objectPath: string, previewUrl?: string) => {
    if (imagePickerTarget === 'variant') {
      setVariantFormData((prev) => ({ ...prev, imageUrl: objectPath }));
      setVariantPreviewUrl(previewUrl || objectPath);
    } else if (imagePickerTarget === 'default') {
      setProductFormData((prev) => ({ ...prev, imageUrl: objectPath }));
      if (previewUrl) setPreviewUrls((prev) => ({ ...prev, default: previewUrl }));
    } else if (imagePickerTarget === 'dark') {
      setProductFormData((prev) => ({ ...prev, darkImageUrl: objectPath }));
      if (previewUrl) setPreviewUrls((prev) => ({ ...prev, dark: previewUrl }));
    } else if (imagePickerTarget === 'light') {
      setProductFormData((prev) => ({ ...prev, lightImageUrl: objectPath }));
      if (previewUrl) setPreviewUrls((prev) => ({ ...prev, light: previewUrl }));
    }
    setImagePickerTarget(null);
  };

  // Preview artwork tones
  const previewDarkImg = (isEditingProduct ? (previewUrls.dark || productFormData.darkImageUrl) : product?.darkImageUrl) ||
    (isEditingProduct ? (previewUrls.default || productFormData.imageUrl) : product?.imageUrl) ||
    DEFAULT_PRODUCT_IMAGE;
  const previewLightImg = (isEditingProduct ? (previewUrls.light || productFormData.lightImageUrl) : product?.lightImageUrl) ||
    (isEditingProduct ? (previewUrls.default || productFormData.imageUrl) : product?.imageUrl) ||
    DEFAULT_PRODUCT_IMAGE;
  const currentArtworkUrl = activeTone === 'dark' ? previewDarkImg : previewLightImg;
  const isArtworkPlaceholder = currentArtworkUrl === DEFAULT_PRODUCT_IMAGE;

  // Calculate total historical orders across variants
  const totalSalesCount = product?.variants?.reduce(
    (acc, v) => acc + (v._count?.orderItems || 0),
    0
  ) ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/catalog')}
              className="p-1.5 rounded-md border border-border bg-surface hover:bg-bg hover:border-ink transition-colors cursor-pointer text-muted hover:text-ink shrink-0"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted uppercase">Catalog / Product Detail</span>
                <span className="text-muted">·</span>
                <span className="font-mono text-xs font-bold text-ink">{product?.sku || id}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink mt-0.5">
                {product?.name || (isLoading ? 'Loading Product...' : 'Product Details')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchProduct}
              disabled={isLoading || isSavingProduct}
              className="p-2 rounded-md border border-border bg-surface hover:border-ink text-muted hover:text-ink transition-colors cursor-pointer"
              title="Refresh product from backend"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {product && !isEditingProduct && (
              <button
                type="button"
                onClick={handleToggleActive}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border cursor-pointer transition-colors ${
                  product.active
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-700'
                }`}
                title="Toggle Storefront Visibility"
              >
                {product.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{product.active ? 'Live in Store' : 'Hidden'}</span>
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
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium border cursor-pointer transition-colors ${
                  isEditingProduct
                    ? 'border-zinc-400 bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
                    : 'border-ink bg-ink text-surface hover:opacity-90 shadow-2xs'
                }`}
              >
                {isEditingProduct ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Edit</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Specifications</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {error && (
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 text-red-600 hover:text-red-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isLoading && !product ? (
          <div className="py-24 text-center text-xs text-muted flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-muted" />
            <span>Loading verified product data from backend...</span>
          </div>
        ) : !product ? (
          <div className="py-20 text-center text-xs text-muted border border-border rounded-xl">
            Product not found.
          </div>
        ) : (
          <div className="space-y-8">
            {/* ============================================================== */}
            {/* SECTION 1: OVERVIEW                                             */}
            {/* ============================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-ink" />
                  <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                    1. Product Overview &amp; Specifications
                  </h2>
                </div>
                <span className="text-xs font-mono text-muted">ID: {product.id}</span>
              </div>

              {isEditingProduct ? (
                /* EDIT PRODUCT SPECIFICATIONS FORM */
                <form onSubmit={handleSaveProduct} className="p-5 rounded-xl border border-border bg-surface shadow-2xs space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Artwork Configuration Column */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-muted uppercase">Artwork Preview</span>
                        <div className="flex items-center rounded border border-border bg-bg p-0.5 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => setActiveTone('dark')}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              activeTone === 'dark' ? 'bg-ink text-surface font-semibold' : 'text-muted'
                            }`}
                          >
                            Dark
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTone('light')}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              activeTone === 'light' ? 'bg-ink text-surface font-semibold' : 'text-muted'
                            }`}
                          >
                            Light
                          </button>
                        </div>
                      </div>

                      <div className="aspect-[16/9] w-full rounded-lg border border-border overflow-hidden bg-bg/80 flex items-center justify-center relative">
                        <img
                          src={currentArtworkUrl}
                          alt="Artwork Preview"
                          className="w-full h-full object-contain p-2"
                        />
                        {isArtworkPlaceholder && (
                          <div className="absolute inset-x-2 bottom-2 bg-amber-500/90 text-white text-[10px] font-mono font-medium py-1 px-2 rounded text-center backdrop-blur-xs">
                            No {activeTone} artwork configured (Placeholder shown)
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-mono text-muted">Default Image Asset</label>
                            <button
                              type="button"
                              onClick={() => setImagePickerTarget('default')}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-ink underline cursor-pointer hover:text-muted"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Pick / Upload</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={productFormData.imageUrl}
                            onChange={(e) => setProductFormData({ ...productFormData, imageUrl: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                            placeholder="product_images/... or URL"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-mono text-muted">Dark Finish Asset</label>
                            <button
                              type="button"
                              onClick={() => setImagePickerTarget('dark')}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-ink underline cursor-pointer hover:text-muted"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Pick / Upload</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={productFormData.darkImageUrl}
                            onChange={(e) => setProductFormData({ ...productFormData, darkImageUrl: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                            placeholder="product_images/... or URL"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-mono text-muted">Light Finish Asset</label>
                            <button
                              type="button"
                              onClick={() => setImagePickerTarget('light')}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-ink underline cursor-pointer hover:text-muted"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Pick / Upload</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={productFormData.lightImageUrl}
                            onChange={(e) => setProductFormData({ ...productFormData, lightImageUrl: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                            placeholder="product_images/... or URL"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Fields Column */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-ink mb-1 font-mono">Product Name *</label>
                          <input
                            type="text"
                            required
                            value={productFormData.name}
                            onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm focus:border-ink focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink mb-1 font-mono">Slug (URL Path) *</label>
                          <input
                            type="text"
                            required
                            value={productFormData.slug}
                            onChange={(e) => setProductFormData({ ...productFormData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm font-mono focus:border-ink focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink mb-1 font-mono">Product Type (Locked)</label>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-bg/80 text-xs font-mono text-muted">
                            <Lock className="w-3.5 h-3.5 text-muted shrink-0" />
                            <span className="font-bold text-ink">{product.type}</span>
                            <span className="text-[10px] text-muted truncate">(Locked to preserve SKU integrity)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink mb-1 font-mono">Base Price (₹) *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-sm text-muted font-mono">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={productFormData.basePriceRupees}
                              onChange={(e) => setProductFormData({ ...productFormData, basePriceRupees: e.target.value })}
                              className="w-full pl-7 pr-3 py-2 rounded-md border border-border bg-bg text-ink text-sm font-mono focus:border-ink focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1 font-mono">Description</label>
                        <textarea
                          rows={3}
                          value={productFormData.description}
                          onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm focus:border-ink focus:outline-hidden leading-relaxed"
                          placeholder="Comprehensive details describing the product features and contents..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/80">
                        <div>
                          <label className="block text-xs font-medium text-ink mb-1 font-mono">
                            Display Order (Sort weight on storefront)
                          </label>
                          <input
                            type="number"
                            value={productFormData.displayOrder}
                            onChange={(e) => setProductFormData({ ...productFormData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm font-mono focus:border-ink focus:outline-hidden"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-ink">
                            <input
                              type="checkbox"
                              checked={productFormData.isFeatured}
                              onChange={(e) => setProductFormData({ ...productFormData, isFeatured: e.target.checked })}
                              className="rounded border-border text-ink focus:ring-ink w-4 h-4 cursor-pointer"
                            />
                            <span>Featured on Storefront</span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (product) initProductFormData(product);
                            setIsEditingProduct(false);
                          }}
                          disabled={isSavingProduct}
                          className="px-4 py-2 rounded-md border border-border bg-surface text-ink text-xs font-mono hover:bg-bg cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSavingProduct}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-ink text-surface text-xs font-mono font-medium hover:opacity-90 shadow-2xs cursor-pointer transition-opacity"
                        >
                          {isSavingProduct ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>{isSavingProduct ? 'Saving...' : 'Save Product Specifications'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                /* VIEW PRODUCT OVERVIEW CARD */
                <div className="p-5 rounded-xl border border-border bg-surface shadow-2xs space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Artwork Display Box */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-muted uppercase">Artwork</span>
                        <div className="flex items-center rounded border border-border bg-bg p-0.5 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => setActiveTone('dark')}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              activeTone === 'dark' ? 'bg-ink text-surface font-semibold' : 'text-muted'
                            }`}
                          >
                            Dark
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTone('light')}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              activeTone === 'light' ? 'bg-ink text-surface font-semibold' : 'text-muted'
                            }`}
                          >
                            Light
                          </button>
                        </div>
                      </div>

                      <div className="aspect-[16/9] w-full rounded-lg border border-border overflow-hidden bg-bg/80 flex items-center justify-center relative">
                        <img
                          src={currentArtworkUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-2"
                        />
                        {isArtworkPlaceholder && (
                          <div className="absolute inset-x-2 bottom-2 bg-amber-500/90 text-white text-[10px] font-mono font-medium py-1 px-2 rounded text-center backdrop-blur-xs">
                            No {activeTone} artwork configured (Placeholder shown)
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 text-[10px] font-mono">
                        {product.imageUrl ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Default Image
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                            No Default Image
                          </span>
                        )}
                        {product.darkImageUrl ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Dark Image
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Missing Dark Image
                          </span>
                        )}
                        {product.lightImageUrl ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Light Image
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Missing Light Image
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Overview Column */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-ink text-surface">
                              {product.type || 'PRODUCT'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] ${
                                product.active
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-zinc-100 text-zinc-600 border border-zinc-300'
                              }`}
                            >
                              {product.active ? 'LIVE IN STORE' : 'HIDDEN'}
                            </span>
                            {product.isFeatured && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold">
                                ★ FEATURED
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl font-semibold text-ink mt-2">{product.name}</h2>
                          <p className="font-mono text-xs text-muted mt-0.5">Slug: /{product.slug}</p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="font-mono text-xl font-bold text-ink">
                            {formatPrice(product.basePrice, product.basePriceFormatted)}
                          </span>
                          <p className="text-[11px] text-muted font-mono">{product.currency || 'INR'}</p>
                          <span className="text-[11px] text-muted font-mono block mt-1">
                            Store Position: #{product.displayOrder ?? 0}
                          </span>
                        </div>
                      </div>

                      {product.description && (
                        <div className="p-3.5 rounded-lg bg-bg/50 border border-border/80 text-xs text-ink leading-relaxed">
                          <span className="font-mono text-[10px] text-muted uppercase block font-semibold mb-1">
                            Description:
                          </span>
                          {product.description}
                        </div>
                      )}

                      {/* Keys */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs font-mono">
                        <div className="p-2.5 rounded bg-bg/40 border border-border flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-muted uppercase block">Product SKU</span>
                            <span className="font-bold text-ink">{product.sku}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(product.sku, 'sku')}
                            className="p-1 text-muted hover:text-ink cursor-pointer"
                            title="Copy SKU"
                          >
                            {copiedKey === 'sku' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="p-2.5 rounded bg-bg/40 border border-border flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-muted uppercase block">Internal Product ID</span>
                            <span className="font-bold text-ink truncate max-w-[150px] inline-block align-bottom">
                              {product.id}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(product.id, 'id')}
                            className="p-1 text-muted hover:text-ink cursor-pointer"
                            title="Copy ID"
                          >
                            {copiedKey === 'id' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ============================================================== */}
            {/* SECTION 2: VARIANTS                                             */}
            {/* ============================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-ink" />
                  <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                    2. Product Variants ({product.variants?.length || 0})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddVariant}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ink text-surface hover:opacity-90 text-xs font-mono font-medium cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Variant</span>
                </button>
              </div>

              {(!product.variants || product.variants.length === 0) ? (
                <div className="p-8 text-center text-xs text-muted border border-dashed border-border rounded-xl bg-surface">
                  No variants found on this product.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {product.variants.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className="p-5 rounded-xl border border-border bg-surface shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-black/10 shrink-0 flex items-center justify-center">
                            <img
                              src={v.imageUrl || product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                              alt={v.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                              }}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-ink">{v.name}</h3>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg border border-border font-bold text-muted">
                                SKU: {v.sku}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                                  v.active !== false
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                }`}
                              >
                                {v.active !== false ? 'Active' : 'Inactive'}
                              </span>
                              {v.imageUrl ? (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  Variant Artwork
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
                                  Inherits Product Art
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-muted">Variant UUID: {v.id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="font-mono font-bold text-base text-ink">
                              {formatPrice(v.price)}
                            </span>
                            <p className="text-[10px] font-mono text-muted">Checkout Price</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenVariantEditor(v)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:border-ink text-xs font-mono text-ink cursor-pointer transition-colors shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Variant &amp; BOM</span>
                          </button>
                        </div>
                      </div>

                      {/* Component Overview inside Variant Card */}
                      <div className="space-y-2">
                        <span className="font-mono text-[11px] font-semibold text-muted uppercase tracking-wider block">
                          Included BOM Components ({v.components?.length || 0}):
                        </span>

                        {(!v.components || v.components.length === 0) ? (
                          <p className="text-xs text-muted italic">
                            No physical or digital components configured for this variant.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {v.components.map((c, cIdx) => (
                              <div
                                key={c.id || cIdx}
                                className="p-3 rounded-lg bg-bg/50 border border-border flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink truncate">{c.name}</p>
                                  <p className="font-mono text-[10px] text-muted mt-0.5">
                                    {c.componentType === 'DIGITAL_ENTITLEMENT'
                                      ? `Digital: ${c.plusDurationMonths || 12}M Entitlement`
                                      : c.inventorySku
                                      ? `Inventory SKU: ${c.inventorySku}`
                                      : c.componentType}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-ink px-2 py-0.5 rounded bg-surface border border-border text-xs shrink-0">
                                  ×{c.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ============================================================== */}
            {/* SECTION 3: SHIPPING AND PACKAGING SPECIFICATIONS               */}
            {/* ============================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-ink" />
                  <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                    3. Shipping and Packaging
                  </h2>
                </div>
                <span className="text-xs text-muted">Used for fulfillment weight &amp; courier calculations</span>
              </div>

              <div className="p-5 rounded-xl border border-border bg-surface shadow-2xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-bg/40 border border-border">
                    <span className="text-muted block text-[10px] uppercase">Shipping Weight</span>
                    <span className="text-sm font-bold text-ink mt-0.5 block">{product.weightGrams ?? 0} g</span>
                  </div>

                  <div className="p-3 rounded-lg bg-bg/40 border border-border">
                    <span className="text-muted block text-[10px] uppercase">Package Length</span>
                    <span className="text-sm font-bold text-ink mt-0.5 block">{product.lengthCm ?? 0} cm</span>
                  </div>

                  <div className="p-3 rounded-lg bg-bg/40 border border-border">
                    <span className="text-muted block text-[10px] uppercase">Package Breadth</span>
                    <span className="text-sm font-bold text-ink mt-0.5 block">{product.breadthCm ?? 0} cm</span>
                  </div>

                  <div className="p-3 rounded-lg bg-bg/40 border border-border">
                    <span className="text-muted block text-[10px] uppercase">Package Height</span>
                    <span className="text-sm font-bold text-ink mt-0.5 block">{product.heightCm ?? 0} cm</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* SECTION 4: ACTIVITY AND SALES                                   */}
            {/* ============================================================== */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-ink" />
                  <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                    4. Activity and Sales
                  </h2>
                </div>
                <span className="text-xs text-muted">Historical sales &amp; audit records</span>
              </div>

              <div className="p-5 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-lg bg-bg/40 border border-border flex items-center justify-between">
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Total Orders Fulfilled</span>
                      <span className="text-base font-bold text-ink mt-0.5 block">{totalSalesCount} units</span>
                    </div>
                    <Package className="w-5 h-5 text-muted" />
                  </div>

                  <div className="p-3.5 rounded-lg bg-bg/40 border border-border flex items-center justify-between">
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Created At</span>
                      <span className="font-bold text-ink mt-0.5 block">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <Calendar className="w-5 h-5 text-muted" />
                  </div>

                  <div className="p-3.5 rounded-lg bg-bg/40 border border-border flex items-center justify-between">
                    <div>
                      <span className="text-muted block text-[10px] uppercase">Last Updated</span>
                      <span className="font-bold text-ink mt-0.5 block">
                        {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <RefreshCw className="w-5 h-5 text-muted" />
                  </div>
                </div>

                {/* Per-variant sales breakdown if available */}
                {product.variants && product.variants.some((v) => v._count?.orderItems !== undefined) && (
                  <div className="pt-3 border-t border-border/60">
                    <span className="font-mono text-[10px] uppercase font-semibold text-muted block mb-2">
                      Sales Breakdown by Variant:
                    </span>
                    <div className="divide-y divide-border/60 text-xs font-mono">
                      {product.variants.map((v, i) => (
                        <div key={v.id || i} className="py-2 flex items-center justify-between">
                          <span className="text-ink">{v.name} ({v.sku}):</span>
                          <span className="font-bold text-ink">{v._count?.orderItems ?? 0} orders</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ============================================================== */}
        {/* VARIANT & BOM COMPONENT EDIT / ADD MODAL                       */}
        {/* ============================================================== */}
        {(editingVariant || isAddingVariant) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl p-6 space-y-6 my-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-ink" />
                  <div>
                    <h3 className="font-semibold text-base text-ink">
                      {isAddingVariant ? 'Add New Variant & Components' : 'Edit Variant & Components'}
                    </h3>
                    <p className="font-mono text-xs text-muted">
                      {isAddingVariant
                        ? `Adding variant to ${product?.name || 'Product'}`
                        : `SKU: ${editingVariant?.sku} · ID: ${editingVariant?.id}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseVariantEditor}
                  className="p-1 rounded-md text-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveVariant} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {isAddingVariant ? (
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1 font-mono">
                        Variant SKU *
                      </label>
                      <input
                        type="text"
                        required
                        value={variantFormData.sku || ''}
                        onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                        placeholder="e.g. KT-VS-SGL-DRK"
                      />
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1 font-mono">
                      Variant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={variantFormData.name}
                      onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-hidden"
                      placeholder="e.g. Dark"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1 font-mono">
                      Variant Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-muted font-mono">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={variantFormData.priceRupees}
                        onChange={(e) => setVariantFormData({ ...variantFormData, priceRupees: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-ink">
                      <input
                        type="checkbox"
                        checked={variantFormData.active}
                        onChange={(e) => setVariantFormData({ ...variantFormData, active: e.target.checked })}
                        className="rounded border-border text-ink focus:ring-ink w-4 h-4 cursor-pointer"
                      />
                      <span>Active for Purchase</span>
                    </label>
                  </div>
                </div>

                {/* Variant Image Configuration (Replace / Remove) */}
                <div className="space-y-2.5 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                        Variant Specific Image
                      </h4>
                      <p className="text-[11px] text-muted">
                        Shown when this specific variant (e.g. Light or Dark finish) is selected.
                      </p>
                    </div>
                  </div>

                  {variantFormData.imageUrl ? (
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-bg/50">
                      <div className="w-16 h-16 rounded-md overflow-hidden border border-border bg-black/10 shrink-0 relative flex items-center justify-center">
                        <img
                          src={variantPreviewUrl || variantFormData.imageUrl}
                          alt={variantFormData.name || 'Variant artwork'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <span
                          className="font-mono text-xs font-semibold text-ink block truncate"
                          title={variantFormData.imageUrl}
                        >
                          {variantFormData.imageUrl}
                        </span>
                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
                          Active Variant Artwork
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setImagePickerTarget('variant')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-surface hover:border-ink text-xs font-mono text-ink cursor-pointer transition-colors shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVariantFormData((prev) => ({ ...prev, imageUrl: null }));
                            setVariantPreviewUrl(null);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-mono text-red-600 cursor-pointer transition-colors"
                          title="Remove variant image (reverts to parent product image)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-dashed border-border bg-bg/30 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-medium text-ink">No variant-specific image set</p>
                        <p className="text-muted text-[11px]">
                          This variant will automatically inherit the parent product's default image.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImagePickerTarget('variant')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface hover:border-ink text-xs font-mono text-ink cursor-pointer shadow-2xs shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select / Upload Variant Image</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* BOM Components Editor */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                        Bill of Materials (BOM) Components
                      </h4>
                      <p className="text-[11px] text-muted">
                        Physical QR tags, package contents, or digital subscriptions included in this variant.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setVariantFormData({
                          ...variantFormData,
                          components: [
                            ...variantFormData.components,
                            {
                              componentType: 'SERIALIZED_QR_TAG',
                              name: 'Physical QR Tag',
                              quantity: 1,
                              inventorySku: 'TAG-CAR-01',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bg hover:bg-border/60 border border-border text-xs font-mono font-medium text-ink cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Component</span>
                    </button>
                  </div>

                  {variantFormData.components.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted">
                      No components defined. Click "Add Component" above to specify items.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {variantFormData.components.map((c, cIdx) => (
                        <div key={cIdx} className="p-3 rounded-lg border border-border bg-bg/50 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted font-bold">#{cIdx + 1}</span>
                              <select
                                value={c.componentType}
                                onChange={(e) => {
                                  const updated = [...variantFormData.components];
                                  updated[cIdx].componentType = e.target.value as ProductComponentType;
                                  setVariantFormData({ ...variantFormData, components: updated });
                                }}
                                className="px-2 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                              >
                                <option value="SERIALIZED_QR_TAG">SERIALIZED_QR_TAG (Physical Tag)</option>
                                <option value="PHYSICAL_ITEM">PHYSICAL_ITEM (Kit Item)</option>
                                <option value="DIGITAL_ENTITLEMENT">DIGITAL_ENTITLEMENT (Plus Months)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = variantFormData.components.filter((_, i) => i !== cIdx);
                                setVariantFormData({ ...variantFormData, components: updated });
                              }}
                              className="p-1 text-muted hover:text-red-600 cursor-pointer"
                              title="Remove component"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-mono text-muted mb-0.5">Component Name *</label>
                              <input
                                type="text"
                                required
                                value={c.name}
                                onChange={(e) => {
                                  const updated = [...variantFormData.components];
                                  updated[cIdx].name = e.target.value;
                                  setVariantFormData({ ...variantFormData, components: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs"
                                placeholder="e.g. Vehicle Sticker QR Tag"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-muted mb-0.5">Quantity (Units) *</label>
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
                                className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                              />
                            </div>
                          </div>

                          {c.componentType !== 'DIGITAL_ENTITLEMENT' ? (
                            <div>
                              <label className="block text-[10px] font-mono text-muted mb-0.5">
                                Inventory SKU (Bound to serialized warehouse tags)
                              </label>
                              <input
                                type="text"
                                value={c.inventorySku || ''}
                                onChange={(e) => {
                                  const updated = [...variantFormData.components];
                                  updated[cIdx].inventorySku = e.target.value;
                                  setVariantFormData({ ...variantFormData, components: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                                placeholder="e.g. TAG-CAR-01"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] font-mono text-muted mb-0.5">
                                Digital Entitlement Duration (Months)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={c.plusDurationMonths || 12}
                                onChange={(e) => {
                                  const updated = [...variantFormData.components];
                                  updated[cIdx].plusDurationMonths = parseInt(e.target.value, 10) || 12;
                                  setVariantFormData({ ...variantFormData, components: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseVariantEditor}
                    disabled={isSavingVariant}
                    className="px-4 py-2 rounded-md border border-border text-xs font-mono text-muted hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingVariant}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-ink text-surface text-xs font-mono font-medium hover:opacity-90 shadow-2xs cursor-pointer"
                  >
                    {isSavingVariant ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSavingVariant
                        ? 'Saving Variant...'
                        : isAddingVariant
                        ? 'Create & Add Variant'
                        : 'Save Variant & Components'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Catalog Image Library & Direct GCS Uploader Modal */}
        {imagePickerTarget && (
          <CatalogImagePickerModal
            isOpen={Boolean(imagePickerTarget)}
            onClose={() => setImagePickerTarget(null)}
            onSelectImage={handleSelectArtworkAsset}
            title={
              imagePickerTarget === 'variant'
                ? `Select Artwork for Variant: ${variantFormData.name || 'Variant'}`
                : imagePickerTarget === 'dark'
                ? 'Select Dark Finish Artwork'
                : imagePickerTarget === 'light'
                ? 'Select Light Finish Artwork'
                : 'Select Default Product Artwork'
            }
            initialFolder={getInitialFolderForType(product?.type)}
          />
        )}
      </div>
    </AdminLayout>
  );
};
