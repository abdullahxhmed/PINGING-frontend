import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { CreateProductPayload, ProductType, ProductComponentType } from '../../types/admin';
import { CatalogImagePickerModal } from '../../components/admin/CatalogImagePickerModal';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
import {
  ArrowLeft,
  Package,
  Layers,
  Upload,
  Info,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sliders,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ComponentFormState {
  componentType: ProductComponentType;
  name: string;
  quantity: number;
  inventorySku?: string;
  plusDurationMonths?: number;
}

export const AdminCreateProductPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1: Basic Information
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);

  // Step 2: Product Type & Identity
  const [sku, setSku] = useState('');
  const [type, setType] = useState<ProductType>('PHYSICAL_TAG_PACK');
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  // Step 3: Images & Artwork
  const [imageUrl, setImageUrl] = useState('');
  const [darkImageUrl, setDarkImageUrl] = useState('');
  const [lightImageUrl, setLightImageUrl] = useState('');
  const [activeTone, setActiveTone] = useState<'dark' | 'light'>('dark');
  const [imagePickerTarget, setImagePickerTarget] = useState<'default' | 'dark' | 'light' | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{ default?: string; dark?: string; light?: string }>({});

  // Step 4: Pricing & Initial Variant
  const [basePriceRupees, setBasePriceRupees] = useState('249.00');
  const [variantSku, setVariantSku] = useState('');
  const [isVariantSkuManual, setIsVariantSkuManual] = useState(false);
  const [variantName, setVariantName] = useState('Standard');
  const [variantPriceRupees, setVariantPriceRupees] = useState('249.00');
  const [components, setComponents] = useState<ComponentFormState[]>([
    {
      componentType: 'SERIALIZED_QR_TAG',
      name: 'Physical QR Tag',
      quantity: 1,
      inventorySku: 'TAG-CAR-01',
    },
  ]);

  // Step 5: Optional Shipping & Logistics
  const [weightGrams, setWeightGrams] = useState(50);
  const [lengthCm, setLengthCm] = useState(10);
  const [breadthCm, setBreadthCm] = useState(10);
  const [heightCm, setHeightCm] = useState(1);

  // Storefront placement
  const [isFeatured, setIsFeatured] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  // Submission & Validation feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    sku?: string;
    slug?: string;
    basePrice?: string;
    variantSku?: string;
    variantPrice?: string;
    components?: string;
  }>({});

  // Auto-generate slug when name changes (unless user edited slug manually)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManual) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  // Auto-generate variant SKU when product SKU changes (unless user edited variant SKU manually)
  const handleSkuChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/\s+/g, '-');
    setSku(formatted);
    if (!isVariantSkuManual && formatted) {
      setVariantSku(`${formatted}-V1`);
    }
  };

  // Apply optional presets to speed up form entry without locking behavior
  const handleApplyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'vehicle_tag') {
      setType('VEHICLE_STICKER');
      setWeightGrams(40);
      setLengthCm(12);
      setBreadthCm(8);
      setHeightCm(1);
      setComponents([
        {
          componentType: 'SERIALIZED_QR_TAG',
          name: 'Vehicle Sticker Tag',
          quantity: 1,
          inventorySku: 'TAG-CAR-01',
        },
      ]);
    } else if (presetKey === 'keychain') {
      setType('KEYCHAIN');
      setWeightGrams(60);
      setLengthCm(8);
      setBreadthCm(6);
      setHeightCm(2);
      setComponents([
        {
          componentType: 'SERIALIZED_QR_TAG',
          name: 'Keychain QR Tag',
          quantity: 1,
          inventorySku: 'TAG-KEY-01',
        },
      ]);
    } else if (presetKey === 'mini_sticker') {
      setType('MINI_STICKER');
      setWeightGrams(25);
      setLengthCm(8);
      setBreadthCm(8);
      setHeightCm(1);
      setComponents([
        {
          componentType: 'SERIALIZED_QR_TAG',
          name: 'Mini Sticker Tag',
          quantity: 1,
          inventorySku: 'TAG-MINI-01',
        },
      ]);
    } else if (presetKey === 'subscription') {
      setType('SUBSCRIPTION_ONLY');
      setWeightGrams(0);
      setLengthCm(0);
      setBreadthCm(0);
      setHeightCm(0);
      setComponents([
        {
          componentType: 'DIGITAL_ENTITLEMENT',
          name: '12-Month Plus Protection Plan',
          quantity: 1,
          plusDurationMonths: 12,
        },
      ]);
    }
  };

  // Handle image selected from library or direct GCS upload
  const handleSelectArtworkAsset = (objectPath: string, previewUrl?: string) => {
    if (imagePickerTarget === 'default') {
      setImageUrl(objectPath);
      if (previewUrl) setPreviewUrls((prev) => ({ ...prev, default: previewUrl }));
    } else if (imagePickerTarget === 'dark') {
      setDarkImageUrl(objectPath);
      if (previewUrl) setPreviewUrls((prev) => ({ ...prev, dark: previewUrl }));
    } else if (imagePickerTarget === 'light') {
      setLightImageUrl(objectPath);
      if (previewUrl) setPreviewUrls((prev) => ({ ...prev, light: previewUrl }));
    }
    setImagePickerTarget(null);
  };

  // Determine initial folder based on type
  const getInitialFolderForType = (prodType: string) => {
    if (prodType.includes('VEHICLE')) return 'vehicle_stickers';
    if (prodType.includes('KEYCHAIN')) return 'keychain';
    if (prodType.includes('MINI')) return 'mini_stickers';
    if (prodType.includes('COMBO') || prodType.includes('PACK') || prodType.includes('BUNDLE')) return 'bundles';
    return 'general';
  };

  // Compute live preview image
  const previewDarkImg = previewUrls.dark || darkImageUrl || previewUrls.default || imageUrl || DEFAULT_PRODUCT_IMAGE;
  const previewLightImg = previewUrls.light || lightImageUrl || previewUrls.default || imageUrl || DEFAULT_PRODUCT_IMAGE;
  const currentArtworkUrl = activeTone === 'dark' ? previewDarkImg : previewLightImg;
  const isArtworkPlaceholder = currentArtworkUrl === DEFAULT_PRODUCT_IMAGE;

  // Client validation
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) errors.name = 'Product name is required';
    if (!sku.trim()) errors.sku = 'Product SKU is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      errors.slug = 'Slug must only contain lowercase alphanumeric characters and single hyphens';
    }

    const basePaise = Math.round(parseFloat(basePriceRupees || '0') * 100);
    if (isNaN(basePaise) || basePaise < 0) {
      errors.basePrice = 'Valid base price is required';
    }

    if (!variantSku.trim()) errors.variantSku = 'Initial variant SKU is required';
    const variantPaise = Math.round(parseFloat(variantPriceRupees || '0') * 100);
    if (isNaN(variantPaise) || variantPaise < 0) {
      errors.variantPrice = 'Valid variant price is required';
    }

    if (components.length === 0) {
      errors.components = 'At least one component is required in the initial variant BOM';
    } else {
      for (let i = 0; i < components.length; i++) {
        const c = components[i];
        if (!c.name.trim()) {
          errors.components = `Component #${i + 1} requires a name`;
          break;
        }
        if (c.quantity < 1) {
          errors.components = `Component #${i + 1} must have a quantity of at least 1`;
          break;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit product creation to POST /api/admin/catalog/products
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      setGlobalError('Please resolve the highlighted field errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const basePricePaise = Math.round(parseFloat(basePriceRupees) * 100);
      const variantPricePaise = Math.round(parseFloat(variantPriceRupees) * 100);

      const payload: CreateProductPayload = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || undefined,
        type,
        basePrice: basePricePaise,
        imageUrl: imageUrl.trim() || null,
        darkImageUrl: darkImageUrl.trim() || null,
        lightImageUrl: lightImageUrl.trim() || null,
        isFeatured,
        displayOrder: Number(displayOrder) || 0,
        weightGrams: Number(weightGrams) || 0,
        lengthCm: Number(lengthCm) || 0,
        breadthCm: Number(breadthCm) || 0,
        heightCm: Number(heightCm) || 0,
        variants: [
          {
            sku: variantSku.trim().toUpperCase(),
            name: variantName.trim() || 'Standard',
            price: variantPricePaise,
            imageUrl: imageUrl.trim() || null,
            components: components.map((c) => ({
              componentType: c.componentType,
              name: c.name.trim(),
              quantity: Number(c.quantity) || 1,
              inventorySku: c.inventorySku?.trim() || undefined,
              plusDurationMonths: c.componentType === 'DIGITAL_ENTITLEMENT' ? Number(c.plusDurationMonths) || 12 : undefined,
            })),
          },
        ],
      };

      const res = await adminApi.createCatalogProduct(payload);
      const created = (res as any)?.data || res;

      // Invalidate store catalog cache so new product immediately appears
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kauntact_backend_catalog_cache');
        window.dispatchEvent(new CustomEvent('catalog:updated'));
      }

      // Navigate directly to the newly persisted record detail page
      if (created?.id) {
        navigate(`/admin/catalog/products/${created.id}`);
      } else {
        navigate('/admin/catalog');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to create product in backend';
      setGlobalError(msg);

      // Check if backend returned specific SKU or slug conflict
      if (msg.toLowerCase().includes('sku')) {
        setFieldErrors((prev) => ({ ...prev, sku: msg }));
      } else if (msg.toLowerCase().includes('slug')) {
        setFieldErrors((prev) => ({ ...prev, slug: msg }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/catalog')}
              className="p-1.5 rounded-md border border-border bg-surface hover:bg-bg hover:border-ink transition-colors cursor-pointer text-muted hover:text-ink shrink-0"
              title="Return to Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted uppercase">Catalog / New Record</span>
                <span className="text-muted">·</span>
                <span className="font-mono text-xs font-bold text-ink">Standalone Product</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink mt-0.5">
                Create Catalog Product
              </h1>
            </div>
          </div>

          {/* Quick Presets Dropdown */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              value={selectedPreset}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
              title="Optional Presets prefill common physical defaults"
            >
              <option value="custom">Optional Presets: (Select to Prefill)</option>
              <option value="vehicle_tag">Vehicle Tag (1 Sticker, 40g, TAG-CAR-01)</option>
              <option value="keychain">Keychain Tag (1 Keychain, 60g, TAG-KEY-01)</option>
              <option value="mini_sticker">Mini Sticker Tag (1 Mini, 25g, TAG-MINI-01)</option>
              <option value="subscription">Digital Plus Plan (No Physical Item)</option>
            </select>
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Backend Submission Error</p>
              <p>{globalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-8">
          {/* ============================================================== */}
          {/* SECTION 1: BASIC INFORMATION                                    */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Package className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                1. Basic Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border bg-bg text-ink text-sm focus:outline-hidden ${
                    fieldErrors.name ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                  }`}
                  placeholder="e.g. Kauntact Helmet Tag"
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-ink font-mono">
                    Slug (URL Path) *
                  </label>
                  {isSlugManual && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSlugManual(false);
                        handleNameChange(name);
                      }}
                      className="text-[10px] font-mono text-muted underline hover:text-ink cursor-pointer"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManual(true);
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }}
                  className={`w-full px-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                    fieldErrors.slug ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                  }`}
                  placeholder="e.g. kauntact-helmet-tag"
                />
                {fieldErrors.slug ? (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.slug}</p>
                ) : (
                  <p className="text-[10px] text-muted font-mono mt-1">
                    Storefront URL: /product/{slug || 'your-slug'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1 font-mono">
                Product Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm focus:border-ink focus:outline-hidden leading-relaxed"
                placeholder="Comprehensive details describing the product features, finish quality, and vehicle placement recommendations..."
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: PRODUCT TYPE & IDENTITY                              */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Sliders className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                2. Product Type &amp; Inventory Identity
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Product SKU (Unique Stock Keeping Unit) *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                    fieldErrors.sku ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                  }`}
                  placeholder="e.g. TAG-HLMT-01"
                />
                {fieldErrors.sku ? (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.sku}</p>
                ) : (
                  <p className="text-[10px] text-muted font-mono mt-1">
                    Must be unique across all catalog products.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Product Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ProductType)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm font-mono focus:border-ink focus:outline-hidden"
                >
                  <option value="PHYSICAL_TAG_PACK">PHYSICAL_TAG_PACK (Physical QR Tag Pack)</option>
                  <option value="VEHICLE_STICKER">VEHICLE_STICKER (Vehicle Sticker Tag)</option>
                  <option value="KEYCHAIN">KEYCHAIN (Physical Keychain QR Tag)</option>
                  <option value="MINI_STICKER">MINI_STICKER (Mini Sticker Tag)</option>
                  <option value="MERCHANDISE">MERCHANDISE (Accessories &amp; Merchandise)</option>
                  <option value="SUBSCRIPTION_ONLY">SUBSCRIPTION_ONLY (Digital Entitlement Only)</option>
                </select>
                <p className="text-[10px] text-muted font-mono mt-1">
                  Product Type is immutable once created to ensure inventory integrity.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: IMAGES & ARTWORK                                     */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Upload className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                3. Artwork &amp; Asset Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview Container */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted uppercase">Live Preview</span>
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
                    alt="Preview"
                    className="w-full h-full object-contain p-2"
                  />
                  {isArtworkPlaceholder && (
                    <div className="absolute inset-x-2 bottom-2 bg-amber-500/90 text-white text-[10px] font-mono font-medium py-1 px-2 rounded text-center backdrop-blur-xs">
                      No artwork assigned (Default placeholder shown)
                    </div>
                  )}
                </div>
              </div>

              {/* Artwork Inputs Column */}
              <div className="lg:col-span-2 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-ink font-mono">
                      Default Image Asset
                    </label>
                    <button
                      type="button"
                      onClick={() => setImagePickerTarget('default')}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-ink underline cursor-pointer hover:text-muted"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Library / Direct Upload</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                    placeholder="e.g. product_images/bundles/darkSet.PNG or URL"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-ink font-mono">
                        Dark Finish Asset
                      </label>
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
                      value={darkImageUrl}
                      onChange={(e) => setDarkImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                      placeholder="e.g. product_images/vehicle_stickers/darkDuo.PNG"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-ink font-mono">
                        Light Finish Asset
                      </label>
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
                      value={lightImageUrl}
                      onChange={(e) => setLightImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                      placeholder="e.g. product_images/vehicle_stickers/lightDuo.PNG"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 4: PRICING & INITIAL VARIANT                            */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-ink" />
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                  4. Pricing &amp; Initial Variant Configuration
                </h2>
              </div>
              <span className="text-xs font-mono text-muted">Initial Variant + Bill of Materials</span>
            </div>

            {/* Architecture Explanation Banner */}
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold font-mono">Distinction: Base Price vs. Variant Price</p>
                <p className="text-[11px] leading-relaxed">
                  <strong>Base Price (₹)</strong> is the default reference price shown on the storefront cards and product preview.
                  <strong> Variant Price (₹)</strong> is the transactional price billed at checkout when the customer selects this specific configuration.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Catalog Base Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={basePriceRupees}
                    onChange={(e) => {
                      setBasePriceRupees(e.target.value);
                      if (variantPriceRupees === basePriceRupees) {
                        setVariantPriceRupees(e.target.value);
                      }
                    }}
                    className={`w-full pl-7 pr-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                      fieldErrors.basePrice ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                    }`}
                    placeholder="249.00"
                  />
                </div>
                {fieldErrors.basePrice && (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.basePrice}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Initial Variant Checkout Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={variantPriceRupees}
                    onChange={(e) => setVariantPriceRupees(e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                      fieldErrors.variantPrice ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                    }`}
                    placeholder="249.00"
                  />
                </div>
                {fieldErrors.variantPrice && (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.variantPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Initial Variant SKU *
                </label>
                <input
                  type="text"
                  required
                  value={variantSku}
                  onChange={(e) => {
                    setIsVariantSkuManual(true);
                    setVariantSku(e.target.value.toUpperCase().replace(/\s+/g, '-'));
                  }}
                  className={`w-full px-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                    fieldErrors.variantSku ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                  }`}
                  placeholder="e.g. TAG-HLMT-01-V1"
                />
                {fieldErrors.variantSku && (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.variantSku}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Initial Variant Name *
                </label>
                <input
                  type="text"
                  required
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm focus:border-ink focus:outline-hidden"
                  placeholder="e.g. Standard Pack"
                />
              </div>
            </div>

            {/* Bill of Materials (BOM) Component Builder */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                    Included Components in Initial Variant ({components.length})
                  </h4>
                  <p className="text-[11px] text-muted">
                    Must define at least one component to fulfill physical barcode tags or digital subscriptions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setComponents([
                      ...components,
                      {
                        componentType: 'SERIALIZED_QR_TAG',
                        name: 'Additional QR Tag',
                        quantity: 1,
                        inventorySku: 'TAG-CAR-01',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bg hover:bg-border/60 border border-border text-xs font-mono font-medium text-ink cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Component</span>
                </button>
              </div>

              {fieldErrors.components && (
                <div className="p-2.5 rounded border border-red-200 bg-red-50 text-xs text-red-800">
                  {fieldErrors.components}
                </div>
              )}

              <div className="space-y-2.5">
                {components.map((c, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-border bg-bg/40 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted font-bold">#{idx + 1}</span>
                        <select
                          value={c.componentType}
                          onChange={(e) => {
                            const updated = [...components];
                            updated[idx].componentType = e.target.value as ProductComponentType;
                            setComponents(updated);
                          }}
                          className="px-2 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                        >
                          <option value="SERIALIZED_QR_TAG">SERIALIZED_QR_TAG (Serialized Tag)</option>
                          <option value="PHYSICAL_ITEM">PHYSICAL_ITEM (Physical Item)</option>
                          <option value="DIGITAL_ENTITLEMENT">DIGITAL_ENTITLEMENT (Plus Months)</option>
                        </select>
                      </div>

                      {components.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setComponents(components.filter((_, i) => i !== idx))}
                          className="p-1 text-muted hover:text-red-600 cursor-pointer"
                          title="Remove component"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-muted mb-0.5">Component Name *</label>
                        <input
                          type="text"
                          required
                          value={c.name}
                          onChange={(e) => {
                            const updated = [...components];
                            updated[idx].name = e.target.value;
                            setComponents(updated);
                          }}
                          className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs"
                          placeholder="e.g. Serialized QR Tag"
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
                            const updated = [...components];
                            updated[idx].quantity = parseInt(e.target.value, 10) || 1;
                            setComponents(updated);
                          }}
                          className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                        />
                      </div>
                    </div>

                    {c.componentType !== 'DIGITAL_ENTITLEMENT' ? (
                      <div>
                        <label className="block text-[10px] font-mono text-muted mb-0.5">
                          Inventory SKU (Linked to serialized physical stock)
                        </label>
                        <input
                          type="text"
                          value={c.inventorySku || ''}
                          onChange={(e) => {
                            const updated = [...components];
                            updated[idx].inventorySku = e.target.value;
                            setComponents(updated);
                          }}
                          className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                          placeholder="e.g. TAG-CAR-01"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-mono text-muted mb-0.5">
                          Plus Subscription Duration (Months)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={c.plusDurationMonths || 12}
                          onChange={(e) => {
                            const updated = [...components];
                            updated[idx].plusDurationMonths = parseInt(e.target.value, 10) || 12;
                            setComponents(updated);
                          }}
                          className="w-full px-2.5 py-1 rounded border border-border bg-surface text-ink text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 5: SHIPPING, PACKAGING & STORE PLACEMENT                 */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Package className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                5. Shipping Specs &amp; Storefront Placement
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] text-muted mb-1">Weight (g)</label>
                <input
                  type="number"
                  min="0"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">Length (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">Breadth (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={breadthCm}
                  onChange={(e) => setBreadthCm(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/70">
              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Display Order Weight
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-ink">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-border text-ink focus:ring-ink w-4 h-4 cursor-pointer"
                  />
                  <span>Feature on Storefront</span>
                </label>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 6: REVIEW AND CREATE                                    */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                  6. Review &amp; Submit
                </h2>
              </div>
              <span className="text-xs font-mono text-muted">Ready to persist to backend</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono p-3.5 rounded-lg bg-bg/50 border border-border/80">
              <div>
                <span className="text-muted block text-[10px] uppercase">Product SKU</span>
                <span className="font-bold text-ink">{sku || '—'}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Base Price</span>
                <span className="font-bold text-ink">₹{basePriceRupees || '0.00'}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Initial Variant</span>
                <span className="font-bold text-ink">{variantSku || '—'}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">BOM Items</span>
                <span className="font-bold text-ink">{components.length} components</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/catalog')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md border border-border text-xs font-mono text-muted hover:text-ink cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-ink text-surface text-xs font-mono font-medium hover:opacity-90 shadow-2xs cursor-pointer transition-opacity disabled:opacity-40"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Creating Product...' : 'Create Standalone Product'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Catalog Image Library & Direct GCS Uploader Modal */}
        {imagePickerTarget && (
          <CatalogImagePickerModal
            isOpen={Boolean(imagePickerTarget)}
            onClose={() => setImagePickerTarget(null)}
            onSelectImage={handleSelectArtworkAsset}
            title={
              imagePickerTarget === 'dark'
                ? 'Select Dark Finish Artwork'
                : imagePickerTarget === 'light'
                ? 'Select Light Finish Artwork'
                : 'Select Default Product Artwork'
            }
            initialFolder={getInitialFolderForType(type)}
          />
        )}
      </div>
    </AdminLayout>
  );
};
