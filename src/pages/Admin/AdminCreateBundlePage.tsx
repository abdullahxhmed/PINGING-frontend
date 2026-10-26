import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { CreateProductPayload, ProductComponentType, AdminProduct } from '../../types/admin';
import { CatalogImagePickerModal } from '../../components/admin/CatalogImagePickerModal';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
import {
  ArrowLeft,
  Layers,
  Package,
  Upload,
  Info,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Boxes,
} from 'lucide-react';

interface BundleVariantFormState {
  sku: string;
  name: string;
  priceRupees: string;
  components: Array<{
    componentType: ProductComponentType;
    name: string;
    quantity: number;
    inventorySku?: string;
    plusDurationMonths?: number;
    sourceKey?: string;
  }>;
}

const COMMON_INVENTORY_SKUS = [
  { sku: 'TAG-VEHICLE-STICKER', label: 'TAG-VEHICLE-STICKER (Car & Vehicle Sticker)' },
  { sku: 'TAG-KEYCHAIN', label: 'TAG-KEYCHAIN (Metal/Resin Keychain Tag)' },
  { sku: 'TAG-MINI-STICKER', label: 'TAG-MINI-STICKER (Compact Tag)' },
  { sku: 'TAG-BIKE-WATERPROOF', label: 'TAG-BIKE-WATERPROOF (Weatherproof Bike Tag)' },
  { sku: 'TAG-PREPRINTED-STD', label: 'TAG-PREPRINTED-STD (Standard Preprinted Tag)' },
  { sku: 'BOX-PACK-BIKE', label: 'BOX-PACK-BIKE (Custom Bike Box Packaging)' },
];

export const AdminCreateBundlePage: React.FC = () => {
  const navigate = useNavigate();

  // Existing catalog products for bundle composition
  const [existingProducts, setExistingProducts] = useState<AdminProduct[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const res = await adminApi.getCatalogProducts({ limit: 100 });
      const payload = (res as any)?.data || res;
      const list: AdminProduct[] = Array.isArray(payload)
        ? payload
        : payload?.products || (res as any)?.products || [];
      // Keep standalone items that can be bundled
      const standalone = list.filter((p) => p.type !== 'COMBO_PACK');
      setExistingProducts(standalone);
    } catch (e: any) {
      console.error('Failed to load products for bundle configurator', e);
      setCatalogError(e.message || 'Failed to load catalog products');
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    const handleCatalogUpdate = () => {
      loadCatalog();
    };
    window.addEventListener('catalog:updated', handleCatalogUpdate);
    return () => {
      window.removeEventListener('catalog:updated', handleCatalogUpdate);
    };
  }, [loadCatalog]);

  // Helper to determine the selected value for a BOM component dropdown
  const getComponentSelectValue = (comp: BundleVariantFormState['components'][0]): string => {
    if (comp.componentType === 'DIGITAL_ENTITLEMENT') {
      return `digital:${comp.plusDurationMonths || 12}`;
    }
    if (comp.inventorySku === 'BOX-PACK-BIKE') {
      return 'BOX-PACK-BIKE';
    }
    if (comp.sourceKey) {
      return comp.sourceKey;
    }
    // Match against existingProducts and their variants
    if (comp.inventorySku && existingProducts.length > 0) {
      for (const prod of existingProducts) {
        if (prod.variants && prod.variants.length > 0) {
          for (const v of prod.variants) {
            if (
              v.sku === comp.inventorySku ||
              v.components?.some((c) => c.inventorySku === comp.inventorySku)
            ) {
              return `variant:${prod.id}:${v.id}`;
            }
          }
        }
        if (prod.sku === comp.inventorySku) {
          return `product:${prod.id}`;
        }
      }
    }
    if (comp.inventorySku && COMMON_INVENTORY_SKUS.some((i) => i.sku === comp.inventorySku)) {
      return `sku:${comp.inventorySku}`;
    }
    return comp.inventorySku || '';
  };

  // Section 1: Bundle Identity
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [sku, setSku] = useState('');
  const [basePriceRupees, setBasePriceRupees] = useState('499.00');

  // Section 2: Artwork & Images
  const [imageUrl, setImageUrl] = useState('');
  const [darkImageUrl, setDarkImageUrl] = useState('');
  const [lightImageUrl, setLightImageUrl] = useState('');
  const [activeTone, setActiveTone] = useState<'dark' | 'light'>('dark');
  const [imagePickerTarget, setImagePickerTarget] = useState<'default' | 'dark' | 'light' | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{ default?: string; dark?: string; light?: string }>({});

  // Section 3: Sellable Variants & Bill of Materials
  const [variants, setVariants] = useState<BundleVariantFormState[]>([
    {
      sku: '',
      name: 'Standard Pack',
      priceRupees: '499.00',
      components: [
        {
          componentType: 'SERIALIZED_QR_TAG',
          name: 'Vehicle Sticker QR Tag',
          quantity: 2,
          inventorySku: 'TAG-VEHICLE-STICKER',
        },
        {
          componentType: 'DIGITAL_ENTITLEMENT',
          name: '12-Month Plus Protection Plan',
          quantity: 1,
          plusDurationMonths: 12,
        },
      ],
    },
  ]);

  // Section 4: Shipping, Dimensions & Storefront Settings
  const [weightGrams, setWeightGrams] = useState(120);
  const [lengthCm, setLengthCm] = useState(18);
  const [breadthCm, setBreadthCm] = useState(12);
  const [heightCm, setHeightCm] = useState(2.5);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);

  // Validation & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    sku?: string;
    slug?: string;
    basePrice?: string;
    variants?: string;
  }>({});

  // Auto-generate slug when name changes
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

  // Auto-generate bundle SKU and variant SKUs
  const handleSkuChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/\s+/g, '-');
    setSku(formatted);

    // Update variant SKUs that match old prefix
    setVariants((prev) =>
      prev.map((v, i) => {
        if (!v.sku || v.sku.startsWith('BNDL-') || v.sku.includes('-V')) {
          return { ...v, sku: `${formatted}-V${i + 1}` };
        }
        return v;
      })
    );
  };

  // Preset Configurations
  const handleApplyPreset = (presetKey: string) => {
    if (presetKey === 'duo_pack') {
      setName('Kauntact Duo Vehicle Pack');
      handleNameChange('Kauntact Duo Vehicle Pack');
      setBasePriceRupees('499.00');
      setWeightGrams(90);
      setVariants([
        {
          sku: sku ? `${sku}-V1` : 'BNDL-DUO-V1',
          name: '2-Sticker Duo Pack',
          priceRupees: '499.00',
          components: [
            {
              componentType: 'SERIALIZED_QR_TAG',
              name: 'Vehicle Sticker QR Tag',
              quantity: 2,
              inventorySku: 'TAG-VEHICLE-STICKER',
            },
            {
              componentType: 'DIGITAL_ENTITLEMENT',
              name: '12-Month Plus Protection Plan',
              quantity: 1,
              plusDurationMonths: 12,
            },
          ],
        },
      ]);
    } else if (presetKey === 'family_pack') {
      setName('Kauntact Family Multi-Vehicle Pack');
      handleNameChange('Kauntact Family Multi-Vehicle Pack');
      setBasePriceRupees('899.00');
      setWeightGrams(180);
      setVariants([
        {
          sku: sku ? `${sku}-V1` : 'BNDL-FAM-V1',
          name: '4-Piece Family Pack',
          priceRupees: '899.00',
          components: [
            {
              componentType: 'SERIALIZED_QR_TAG',
              name: 'Vehicle Sticker QR Tag',
              quantity: 2,
              inventorySku: 'TAG-VEHICLE-STICKER',
            },
            {
              componentType: 'SERIALIZED_QR_TAG',
              name: 'Keychain QR Tag',
              quantity: 2,
              inventorySku: 'TAG-KEYCHAIN',
            },
            {
              componentType: 'DIGITAL_ENTITLEMENT',
              name: '12-Month Plus Family Protection',
              quantity: 1,
              plusDurationMonths: 12,
            },
          ],
        },
      ]);
    } else if (presetKey === 'all_in_one') {
      setName('Kauntact Ultimate All-in-One Kit');
      handleNameChange('Kauntact Ultimate All-in-One Kit');
      setBasePriceRupees('1199.00');
      setWeightGrams(240);
      setVariants([
        {
          sku: sku ? `${sku}-V1` : 'BNDL-ULT-V1',
          name: 'Ultimate Commuter Kit',
          priceRupees: '1199.00',
          components: [
            {
              componentType: 'SERIALIZED_QR_TAG',
              name: 'Vehicle Sticker QR Tag',
              quantity: 2,
              inventorySku: 'TAG-VEHICLE-STICKER',
            },
            {
              componentType: 'SERIALIZED_QR_TAG',
              name: 'Weatherproof Bike QR Tag',
              quantity: 1,
              inventorySku: 'TAG-BIKE-WATERPROOF',
            },
            {
              componentType: 'SERIALIZED_QR_TAG',
              name: 'Keychain QR Tag',
              quantity: 1,
              inventorySku: 'TAG-KEYCHAIN',
            },
            {
              componentType: 'DIGITAL_ENTITLEMENT',
              name: '24-Month Plus Extended Plan',
              quantity: 1,
              plusDurationMonths: 24,
            },
          ],
        },
      ]);
    }
  };

  // Image Selection
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

  // Live Artwork Preview
  const previewDarkImg = previewUrls.dark || darkImageUrl || previewUrls.default || imageUrl || DEFAULT_PRODUCT_IMAGE;
  const previewLightImg = previewUrls.light || lightImageUrl || previewUrls.default || imageUrl || DEFAULT_PRODUCT_IMAGE;
  const currentArtworkUrl = activeTone === 'dark' ? previewDarkImg : previewLightImg;
  const isArtworkPlaceholder = currentArtworkUrl === DEFAULT_PRODUCT_IMAGE;

  // Validation
  const validateBundle = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) errors.name = 'Bundle name is required';
    if (!sku.trim()) errors.sku = 'Bundle SKU is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      errors.slug = 'Slug must only contain lowercase alphanumeric characters and single hyphens';
    }

    const basePaise = Math.round(parseFloat(basePriceRupees || '0') * 100);
    if (isNaN(basePaise) || basePaise < 0) {
      errors.basePrice = 'Valid base price is required';
    }

    if (variants.length === 0) {
      errors.variants = 'At least one variant must be configured for the bundle';
    } else {
      for (let vIdx = 0; vIdx < variants.length; vIdx++) {
        const v = variants[vIdx];
        if (!v.sku.trim()) {
          errors.variants = `Variant #${vIdx + 1} requires a SKU`;
          break;
        }
        if (!v.name.trim()) {
          errors.variants = `Variant #${vIdx + 1} requires a name`;
          break;
        }
        const vPaise = Math.round(parseFloat(v.priceRupees || '0') * 100);
        if (isNaN(vPaise) || vPaise < 0) {
          errors.variants = `Variant #${vIdx + 1} requires a valid checkout price`;
          break;
        }
        if (!v.components || v.components.length === 0) {
          errors.variants = `Variant #${vIdx + 1} ("${v.name}") must define at least one component in its BOM`;
          break;
        }
        for (let cIdx = 0; cIdx < v.components.length; cIdx++) {
          const c = v.components[cIdx];
          if (!c.name.trim()) {
            errors.variants = `Component #${cIdx + 1} in Variant #${vIdx + 1} must have a name`;
            break;
          }
          if (c.quantity < 1) {
            errors.variants = `Component #${cIdx + 1} in Variant #${vIdx + 1} must have a quantity of at least 1`;
            break;
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Bundle to POST /api/admin/catalog/products
  const handleCreateBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateBundle()) {
      setGlobalError('Please resolve the highlighted field errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const basePricePaise = Math.round(parseFloat(basePriceRupees) * 100);

      const payload: CreateProductPayload = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || undefined,
        type: 'COMBO_PACK',
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
        variants: variants.map((v) => ({
          sku: v.sku.trim().toUpperCase(),
          name: v.name.trim(),
          price: Math.round(parseFloat(v.priceRupees) * 100),
          components: v.components.map((c) => ({
            componentType: c.componentType,
            name: c.name.trim(),
            quantity: Number(c.quantity) || 1,
            inventorySku: c.inventorySku?.trim() || undefined,
            plusDurationMonths: c.componentType === 'DIGITAL_ENTITLEMENT' ? Number(c.plusDurationMonths) || 12 : undefined,
          })),
        })),
      };

      const res = await adminApi.createCatalogProduct(payload);
      const created = (res as any)?.data || res;

      // Invalidate store catalog cache so new bundle immediately appears
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
      const msg = err.message || 'Failed to create bundle in backend';
      setGlobalError(msg);

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
                <span className="font-mono text-xs font-bold text-ink">Bundle &amp; Pack Configurator</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink mt-0.5">
                Create Bundle / Pack
              </h1>
            </div>
          </div>

          {/* Preset Helper */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink text-xs font-mono focus:border-ink focus:outline-hidden cursor-pointer"
              title="Select a bundle template to prefill BOM configuration"
            >
              <option value="">Bundle Presets: (Select to Prefill)</option>
              <option value="duo_pack">Duo Vehicle Pack (2 Stickers + 12M Plus)</option>
              <option value="family_pack">Family Pack (2 Stickers + 2 Keychains + 12M Plus)</option>
              <option value="all_in_one">All-in-One Kit (2 Stickers + 1 Bike + 1 Keychain + 24M Plus)</option>
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

        <form onSubmit={handleCreateBundle} className="space-y-8">
          {/* ============================================================== */}
          {/* SECTION 1: BUNDLE IDENTITY & PRICING                            */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Boxes className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                1. Bundle Identity &amp; Base Price
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Bundle Pack Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border bg-bg text-ink text-sm focus:outline-hidden ${
                    fieldErrors.name ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                  }`}
                  placeholder="e.g. Kauntact Multi-Vehicle Pack"
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
                  placeholder="e.g. kauntact-multi-vehicle-pack"
                />
                {fieldErrors.slug ? (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.slug}</p>
                ) : (
                  <p className="text-[10px] text-muted font-mono mt-1">
                    Storefront Path: /product/{slug || 'bundle-slug'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1 font-mono">
                  Bundle SKU (Product-level SKU) *
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                    fieldErrors.sku ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                  }`}
                  placeholder="e.g. BNDL-FAM-01"
                />
                {fieldErrors.sku ? (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.sku}</p>
                ) : (
                  <p className="text-[10px] text-muted font-mono mt-1">
                    Master identifier across warehouse orders.
                  </p>
                )}
              </div>

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
                    onChange={(e) => setBasePriceRupees(e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 rounded-md border bg-bg text-ink text-sm font-mono focus:outline-hidden ${
                      fieldErrors.basePrice ? 'border-red-500 focus:border-red-600' : 'border-border focus:border-ink'
                    }`}
                    placeholder="499.00"
                  />
                </div>
                {fieldErrors.basePrice && (
                  <p className="text-[11px] text-red-600 font-mono mt-1">{fieldErrors.basePrice}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1 font-mono">
                Bundle Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink text-sm focus:border-ink focus:outline-hidden leading-relaxed"
                placeholder="Comprehensive summary of what this pack includes, who it is designed for, and key benefits..."
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: ARTWORK & ASSET CONFIGURATION                        */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Upload className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                2. Bundle Artwork &amp; Asset Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview Container */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted uppercase">Preview Artwork</span>
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

              {/* Artwork Inputs */}
              <div className="lg:col-span-2 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-ink font-mono">
                      Default Bundle Artwork
                    </label>
                    <button
                      type="button"
                      onClick={() => setImagePickerTarget('default')}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-ink underline cursor-pointer hover:text-muted"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Library / Upload</span>
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
                        Dark Finish Artwork
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
                      placeholder="e.g. product_images/bundles/darkSet.PNG"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-ink font-mono">
                        Light Finish Artwork
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
                      placeholder="e.g. product_images/bundles/lightSet.PNG"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: VARIANTS & BILL OF MATERIALS (BOM) CONFIGURATOR       */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-ink" />
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                  3. Variants &amp; Bill of Materials (BOM) Configurator
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setVariants([
                    ...variants,
                    {
                      sku: sku ? `${sku}-V${variants.length + 1}` : `BNDL-V${variants.length + 1}`,
                      name: `Variant ${variants.length + 1}`,
                      priceRupees: basePriceRupees,
                      components: [
                        {
                          componentType: 'SERIALIZED_QR_TAG',
                          name: 'Vehicle Sticker QR Tag',
                          quantity: 1,
                          inventorySku: 'TAG-VEHICLE-STICKER',
                        },
                      ],
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg hover:bg-border/60 border border-border text-xs font-mono font-medium text-ink cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Sellable Variant</span>
              </button>
            </div>

            {/* Architecture Explanation Banner */}
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold font-mono">Explicit Bill of Materials Architecture</p>
                <p className="text-[11px] leading-relaxed">
                  The physical and digital contents of a bundle are determined <strong>only</strong> by its variant component list.
                  The backend never guesses bundle items from names, prices, or tag counts.
                </p>
              </div>
            </div>

            {fieldErrors.variants && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                {fieldErrors.variants}
              </div>
            )}

            {/* Variant Cards */}
            <div className="space-y-6">
              {variants.map((v, vIdx) => (
                <div
                  key={vIdx}
                  className="p-5 rounded-xl border border-border bg-bg/30 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink bg-surface px-2 py-0.5 rounded border border-border">
                        Variant #{vIdx + 1}
                      </span>
                      <span className="font-semibold text-xs text-ink">{v.name || 'Untitled Variant'}</span>
                    </div>

                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setVariants(variants.filter((_, i) => i !== vIdx))}
                        className="inline-flex items-center gap-1 text-xs font-mono text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Variant</span>
                      </button>
                    )}
                  </div>

                  {/* Variant Setup Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1">Variant Name *</label>
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].name = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-ink text-xs focus:border-ink focus:outline-hidden"
                        placeholder="e.g. Standard 2-Pack"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1">Variant SKU *</label>
                      <input
                        type="text"
                        required
                        value={v.sku}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].sku = e.target.value.toUpperCase().replace(/\s+/g, '-');
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                        placeholder="e.g. BNDL-FAM-01-V1"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-muted mb-1">Checkout Price (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-muted font-mono">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={v.priceRupees}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[vIdx].priceRupees = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-full pl-6 pr-2.5 py-1.5 rounded border border-border bg-surface text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                          placeholder="499.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Component Builder within this Variant */}
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                          BOM Components in this Variant ({v.components.length})
                        </span>
                        {existingProducts.length > 0 && (
                          <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                            {existingProducts.length} product(s) linked
                          </span>
                        )}
                        {catalogError && (
                          <span className="text-[10px] font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            Sync error: {catalogError}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => loadCatalog()}
                          disabled={isLoadingCatalog}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-muted hover:text-ink cursor-pointer disabled:opacity-50"
                          title="Reload catalog products from server"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                          <span>{isLoadingCatalog ? 'Loading...' : 'Refresh Catalog'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...variants];
                            const defaultProd = existingProducts[0];
                            const defaultVar = defaultProd?.variants?.[0];
                            const defaultComp = defaultVar?.components?.[0];
                            const sourceKey = defaultProd && defaultVar ? `variant:${defaultProd.id}:${defaultVar.id}` : undefined;
                            updated[vIdx].components.push({
                              componentType: defaultComp?.componentType || 'SERIALIZED_QR_TAG',
                              name: defaultProd
                                ? defaultVar && defaultVar.name && defaultVar.name.toLowerCase() !== 'default'
                                  ? `${defaultProd.name} (${defaultVar.name})`
                                  : defaultProd.name
                                : 'Vehicle Sticker QR Tag',
                              quantity: 1,
                              inventorySku: defaultComp?.inventorySku || defaultVar?.sku || 'TAG-VEHICLE-STICKER',
                              sourceKey,
                            });
                            setVariants(updated);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-ink underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Product to Bundle</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {v.components.map((c, cIdx) => (
                        <div key={cIdx} className="p-3.5 rounded-lg border border-border bg-surface space-y-3 text-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted font-bold">Item #{cIdx + 1}</span>
                              <span className="font-semibold text-xs text-ink">{c.name}</span>
                            </div>

                            {v.components.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...variants];
                                  updated[vIdx].components = updated[vIdx].components.filter((_, i) => i !== cIdx);
                                  setVariants(updated);
                                }}
                                className="p-1 text-muted hover:text-red-600 cursor-pointer"
                                title="Remove item from bundle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-mono text-muted mb-1">
                                Select Existing Product / Item *
                              </label>
                              <select
                                value={getComponentSelectValue(c)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...variants];
                                  if (val.startsWith('digital:')) {
                                    const months = parseInt(val.split(':')[1], 10) || 12;
                                    updated[vIdx].components[cIdx] = {
                                      componentType: 'DIGITAL_ENTITLEMENT',
                                      name: `${months}-Month Plus Protection Plan`,
                                      quantity: c.quantity || 1,
                                      plusDurationMonths: months,
                                      sourceKey: val,
                                    };
                                  } else if (val === 'BOX-PACK-BIKE') {
                                    updated[vIdx].components[cIdx] = {
                                      componentType: 'PHYSICAL_ITEM',
                                      name: 'Custom Bike Packaging Box',
                                      quantity: c.quantity || 1,
                                      inventorySku: 'BOX-PACK-BIKE',
                                      sourceKey: val,
                                    };
                                  } else if (val.startsWith('variant:')) {
                                    const [, prodId, varId] = val.split(':');
                                    const matchedProd = existingProducts.find((p) => p.id === prodId);
                                    const matchedVar = matchedProd?.variants?.find((varnt) => varnt.id === varId);
                                    const matchedComp = matchedVar?.components?.[0];

                                    const displayName = matchedProd
                                      ? matchedVar && matchedVar.name && matchedVar.name.toLowerCase() !== 'default'
                                        ? `${matchedProd.name} (${matchedVar.name})`
                                        : matchedProd.name
                                      : c.name;

                                    updated[vIdx].components[cIdx] = {
                                      componentType: matchedComp?.componentType || 'SERIALIZED_QR_TAG',
                                      name: displayName,
                                      quantity: c.quantity || 1,
                                      inventorySku: matchedComp?.inventorySku || matchedVar?.sku || matchedProd?.sku || '',
                                      sourceKey: val,
                                    };
                                  } else if (val.startsWith('product:')) {
                                    const [, prodId] = val.split(':');
                                    const matchedProd = existingProducts.find((p) => p.id === prodId);
                                    updated[vIdx].components[cIdx] = {
                                      componentType: 'SERIALIZED_QR_TAG',
                                      name: matchedProd?.name || c.name,
                                      quantity: c.quantity || 1,
                                      inventorySku: matchedProd?.sku || '',
                                      sourceKey: val,
                                    };
                                  } else if (val.startsWith('sku:')) {
                                    const rawSku = val.replace('sku:', '');
                                    const foundCommon = COMMON_INVENTORY_SKUS.find((item) => item.sku === rawSku);
                                    updated[vIdx].components[cIdx] = {
                                      componentType: 'SERIALIZED_QR_TAG',
                                      name: foundCommon ? foundCommon.label.split('(')[1]?.replace(')', '') || foundCommon.label : rawSku,
                                      quantity: c.quantity || 1,
                                      inventorySku: rawSku,
                                      sourceKey: val,
                                    };
                                  } else {
                                    // Direct SKU fallback
                                    updated[vIdx].components[cIdx] = {
                                      componentType: 'SERIALIZED_QR_TAG',
                                      name: c.name,
                                      quantity: c.quantity || 1,
                                      inventorySku: val,
                                      sourceKey: val,
                                    };
                                  }
                                  setVariants(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-hidden"
                              >
                                {existingProducts.length > 0 &&
                                  existingProducts.map((p) => {
                                    const pVariants = p.variants && p.variants.length > 0 ? p.variants : [];
                                    if (pVariants.length === 0) {
                                      return (
                                        <optgroup key={p.id} label={`${p.name} (${p.sku})`}>
                                          <option value={`product:${p.id}`}>
                                            {p.name} — Base SKU: {p.sku}
                                          </option>
                                        </optgroup>
                                      );
                                    }
                                    return (
                                      <optgroup key={p.id} label={`${p.name} (${p.sku})`}>
                                        {pVariants.map((v) => {
                                          const comp = v.components?.[0];
                                          const stockSku = comp?.inventorySku || v.sku;
                                          return (
                                            <option key={v.id} value={`variant:${p.id}:${v.id}`}>
                                              {v.name} ({v.sku}) — Stock SKU: {stockSku}
                                            </option>
                                          );
                                        })}
                                      </optgroup>
                                    );
                                  })}
                                <optgroup label="Standard Component Hardware SKUs">
                                  {COMMON_INVENTORY_SKUS.map((item) => (
                                    <option key={item.sku} value={`sku:${item.sku}`}>
                                      {item.label}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Digital Protection Entitlements">
                                  <option value="digital:12">12-Month Plus Protection Plan</option>
                                  <option value="digital:24">24-Month Plus Protection Plan</option>
                                </optgroup>
                                <optgroup label="Packaging &amp; Physical Accessories">
                                  <option value="BOX-PACK-BIKE">BOX-PACK-BIKE (Custom Bike Box Packaging)</option>
                                </optgroup>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-mono text-muted mb-1">
                                Quantity (Units) *
                              </label>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (c.quantity > 1) {
                                      const updated = [...variants];
                                      updated[vIdx].components[cIdx].quantity -= 1;
                                      setVariants(updated);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 border border-border bg-bg text-ink rounded-l text-xs font-mono hover:bg-border/40 cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={c.quantity}
                                  onChange={(e) => {
                                    const updated = [...variants];
                                    updated[vIdx].components[cIdx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    setVariants(updated);
                                  }}
                                  className="w-full text-center py-1.5 border-y border-border bg-bg text-ink text-xs font-mono focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...variants];
                                    updated[vIdx].components[cIdx].quantity += 1;
                                    setVariants(updated);
                                  }}
                                  className="px-2.5 py-1.5 border border-border bg-bg text-ink rounded-r text-xs font-mono hover:bg-border/40 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Stock Mapping Badge */}
                          <div className="p-2 rounded bg-bg/50 border border-border/60 flex items-center justify-between text-[11px] font-mono text-muted">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-ink font-medium">Mapped to Stock:</span>
                              <span className="font-bold text-ink">
                                {c.componentType === 'DIGITAL_ENTITLEMENT'
                                  ? `Digital Plan (${c.plusDurationMonths || 12}M)`
                                  : c.inventorySku}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-muted">
                              {c.componentType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 4: SHIPPING & STOREFRONT SETTINGS                        */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Package className="w-4 h-4 text-ink" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                4. Shipping Specifications &amp; Storefront Settings
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] text-muted mb-1">Bundle Weight (g)</label>
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
                  Display Order Weight (Storefront sort position)
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
                  <span>Feature on Storefront (Highlight Tag)</span>
                </label>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 5: REVIEW & CREATE SUMMARY                              */}
          {/* ============================================================== */}
          <div className="p-6 rounded-xl border border-border bg-surface shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider font-mono">
                  5. Review &amp; Create Bundle
                </h2>
              </div>
              <span className="text-xs font-mono text-muted">Ready to submit to catalog</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono p-3.5 rounded-lg bg-bg/50 border border-border/80">
              <div>
                <span className="text-muted block text-[10px] uppercase">Bundle SKU</span>
                <span className="font-bold text-ink">{sku || '—'}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Base Price</span>
                <span className="font-bold text-ink">₹{basePriceRupees || '0.00'}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Variants</span>
                <span className="font-bold text-ink">{variants.length} configurations</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">Total BOM Items</span>
                <span className="font-bold text-ink">
                  {variants.reduce((acc, v) => acc + v.components.length, 0)} components
                </span>
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
                  <Boxes className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Creating Bundle...' : 'Create Bundle & Persist BOM'}</span>
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
                ? 'Select Dark Finish Bundle Artwork'
                : imagePickerTarget === 'light'
                ? 'Select Light Finish Bundle Artwork'
                : 'Select Default Bundle Artwork'
            }
            initialFolder="bundles"
          />
        )}
      </div>
    </AdminLayout>
  );
};
