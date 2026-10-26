import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  LayoutGrid,
  Plus,
  ArrowRightLeft,
  RotateCcw,
  Eye,
  ExternalLink,
  History,
  CheckCircle2,
  XCircle,
  Search,
  Package,
  Layers,
  ChevronRight,
  RefreshCw,
  Zap,
  Trash2,
  X,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import type {
  StorefrontSlot,
  StorefrontSlotProduct,
  StorefrontSlotHistoryItem,
  AdminProduct,
  StorefrontSlotVariant,
} from '../../types/admin';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';

// Default catalog assignments for reset capability
const DEFAULT_SLOT_ASSIGNMENTS: Record<string, { sku: string; fallbackName: string }> = {
  bundle_1: { sku: 'PACK-499', fallbackName: 'Curated Kit' },
  bundle_2: { sku: 'PK-PACK-179', fallbackName: 'Essential (1-Tag Starter)' },
  individual_1: { sku: 'PK-VEHICLE-STICKER', fallbackName: 'Vehicle QR Sticker' },
  individual_2: { sku: 'PK-KEYCHAIN', fallbackName: 'Smart QR Keychain' },
  individual_3: { sku: 'PK-MINI-STICKER', fallbackName: 'Mini QR Sticker' },
  individual_4: { sku: 'PK-PLUS-RENEWAL', fallbackName: '12-Month Plus Plan Renewal' },
};

export interface PackSlotGroup {
  id: string; // "bundle_1", "bundle_2", etc.
  index: number;
  label: string;
  baseKey: string;
  darkSlotKey: string;
  lightSlotKey: string;
  darkSlot?: StorefrontSlot | null;
  lightSlot?: StorefrontSlot | null;
  baseSlot?: StorefrontSlot | null;
  darkProduct?: StorefrontSlotProduct | null;
  lightProduct?: StorefrontSlotProduct | null;
  darkVariant?: StorefrontSlotVariant | null;
  lightVariant?: StorefrontSlotVariant | null;
}

export const AdminStorefrontSlotsPage: React.FC = () => {
  const [slots, setSlots] = useState<StorefrontSlot[]>([]);
  const [availableBundles, setAvailableBundles] = useState<StorefrontSlotProduct[]>([]);
  const [availableIndividuals, setAvailableIndividuals] = useState<StorefrontSlotProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Audit history state
  const [history, setHistory] = useState<StorefrontSlotHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Replace / Assign modal state
  const [activeSlotTargetKey, setActiveSlotTargetKey] = useState<string | null>(null);
  const [activeModalTitle, setActiveModalTitle] = useState<string>('');
  const [activeModalCategory, setActiveModalCategory] = useState<'BUNDLE' | 'INDIVIDUAL'>('BUNDLE');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null); // "product:<id>" or "variant:<id>"
  const [replaceReason, setReplaceReason] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [directIdInput, setDirectIdInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Add slot modal state
  const [showAddSlotModal, setShowAddSlotModal] = useState<boolean>(false);
  const [newSlotType, setNewSlotType] = useState<'BUNDLE' | 'INDIVIDUAL'>('BUNDLE');
  const [newSlotLabel, setNewSlotLabel] = useState<string>('');
  const [newSlotTarget, setNewSlotTarget] = useState<string>(''); // "product:<id>" or "variant:<id>"
  const [isCreatingSlot, setIsCreatingSlot] = useState<boolean>(false);

  // Reset modal state
  const [activeSlotForReset, setActiveSlotForReset] = useState<StorefrontSlot | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Tone preview per pack slot group (dark / light)
  const [packPreviewTones, setPackPreviewTones] = useState<Record<string, 'dark' | 'light'>>({});

  const fetchSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adminApi.getStorefrontSlots();
      if (res && res.data) {
        setSlots(res.data.slots || []);
        setAvailableBundles((res.data.availableBundles as StorefrontSlotProduct[]) || []);
        setAvailableIndividuals((res.data.availableIndividuals as StorefrontSlotProduct[]) || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load storefront slots from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const res = await adminApi.getStorefrontSlotHistory({ limit: 15 });
      if (res && Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch (err: any) {
      console.warn('Could not fetch slot history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
    fetchHistory();
  }, [fetchSlots, fetchHistory]);

  // Helper to determine if a product or variant is Dark finish
  const checkIsDark = (
    prod: StorefrontSlotProduct | AdminProduct | null | undefined,
    variant?: StorefrontSlotVariant | null
  ): boolean => {
    if (variant?.name?.toLowerCase().includes('dark') || variant?.sku?.toLowerCase().includes('drk')) {
      return true;
    }
    if (variant?.name?.toLowerCase().includes('light') || variant?.sku?.toLowerCase().includes('lit')) {
      return false;
    }
    if (prod?.name?.toLowerCase().includes('dark') || prod?.sku?.toLowerCase().includes('drk')) {
      return true;
    }
    if (prod?.name?.toLowerCase().includes('light') || prod?.sku?.toLowerCase().includes('lit')) {
      return false;
    }
    return false;
  };

  // Group pack slots into unified pack groups (supporting both Dark and Light finish products)
  const packGroups = useMemo<PackSlotGroup[]>(() => {
    const bundleSlots = slots.filter(
      (s) => s.slotType === 'BUNDLE' || s.slotKey.startsWith('bundle')
    );

    // Collect base prefixes (e.g. "bundle_1", "bundle_2")
    const prefixes = Array.from(
      new Set(
        bundleSlots.map((s) => s.slotKey.replace(/(_dark|_light|_drk|_lit)$/i, ''))
      )
    );

    // If no bundle slots exist, default to bundle_1 and bundle_2
    if (!prefixes.includes('bundle_1')) prefixes.push('bundle_1');
    if (!prefixes.includes('bundle_2')) prefixes.push('bundle_2');

    // Sort numerically by bundle number
    prefixes.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    return prefixes.map((baseKey, idx) => {
      const darkKey = `${baseKey}_dark`;
      const lightKey = `${baseKey}_light`;

      const directDarkSlot = bundleSlots.find((s) => s.slotKey === darkKey);
      const directLightSlot = bundleSlots.find((s) => s.slotKey === lightKey);
      const baseSlot = bundleSlots.find((s) => s.slotKey === baseKey);

      let darkProduct: StorefrontSlotProduct | null = null;
      let lightProduct: StorefrontSlotProduct | null = null;
      let darkVariant: StorefrontSlotVariant | null = null;
      let lightVariant: StorefrontSlotVariant | null = null;

      if (directDarkSlot?.product) {
        darkProduct = directDarkSlot.product;
        darkVariant = directDarkSlot.variant || directDarkSlot.product.variants?.find((v) => checkIsDark(null, v)) || null;
      }

      if (directLightSlot?.product) {
        lightProduct = directLightSlot.product;
        lightVariant = directLightSlot.variant || directLightSlot.product.variants?.find((v) => !checkIsDark(null, v)) || null;
      }

      if (baseSlot?.product) {
        const isBaseDark = checkIsDark(baseSlot.product, baseSlot.variant);
        if (isBaseDark && !darkProduct) {
          darkProduct = baseSlot.product;
          darkVariant = baseSlot.variant || null;
        } else if (!isBaseDark && !lightProduct) {
          lightProduct = baseSlot.product;
          lightVariant = baseSlot.variant || null;
        }

        // If product has multiple variants (e.g. Dark and Light on same product)
        const variants = baseSlot.product.variants || [];
        const vDark = variants.find((v) => checkIsDark(null, v));
        const vLight = variants.find((v) => !checkIsDark(null, v));

        if (vDark && !darkProduct) {
          darkProduct = baseSlot.product;
          darkVariant = vDark;
        }
        if (vLight && !lightProduct) {
          lightProduct = baseSlot.product;
          lightVariant = vLight;
        }
      }

      const defaultLabel =
        idx === 0 ? 'Hero Bundle Slot #1' : idx === 1 ? 'Featured Bundle Slot #2' : `Pack Slot #${idx + 1}`;

      const label = baseSlot?.label || directDarkSlot?.label || directLightSlot?.label || defaultLabel;

      return {
        id: baseKey,
        index: idx + 1,
        label,
        baseKey,
        darkSlotKey: darkKey,
        lightSlotKey: lightKey,
        darkSlot: directDarkSlot,
        lightSlot: directLightSlot,
        baseSlot,
        darkProduct,
        lightProduct,
        darkVariant,
        lightVariant,
      };
    });
  }, [slots]);

  // Add-on slots (Section 2)
  const addonSlots = useMemo(() => {
    return slots
      .filter((s) => s.slotType !== 'BUNDLE' && !s.slotKey.startsWith('bundle'))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [slots]);

  // Resolve actual product image without any mock artwork
  const resolveArtwork = (
    prod: StorefrontSlotProduct | AdminProduct | null | undefined,
    variant?: StorefrontSlotVariant | null
  ): string => {
    if (variant?.imageUrl) return variant.imageUrl;
    if (prod?.imageUrl) return prod.imageUrl;
    return DEFAULT_PRODUCT_IMAGE;
  };

  // Helper to find which slot a product or variant currently occupies
  const findAssignedSlot = (productId: string, variantId?: string): StorefrontSlot | undefined => {
    if (variantId) {
      const match = slots.find((s) => s.variantId === variantId);
      if (match) return match;
    }
    return slots.find((s) => s.productId === productId && !s.variantId);
  };

  // Open replace / assign modal for an explicit slot or finish
  const handleOpenAssignModal = (
    slotKey: string,
    title: string,
    category: 'BUNDLE' | 'INDIVIDUAL',
    currentProductId?: string | null,
    currentVariantId?: string | null
  ) => {
    setActiveSlotTargetKey(slotKey);
    setActiveModalTitle(title);
    setActiveModalCategory(category);
    if (currentVariantId) {
      setSelectedTarget(`variant:${currentVariantId}`);
      setDirectIdInput(currentVariantId);
    } else if (currentProductId) {
      setSelectedTarget(`product:${currentProductId}`);
      setDirectIdInput(currentProductId);
    } else {
      setSelectedTarget(null);
      setDirectIdInput('');
    }
    setReplaceReason('');
    setProductSearch('');
  };

  // Open finish assignment for a Pack Slot Group
  const handleOpenFinishAssign = (group: PackSlotGroup, finishTone: 'dark' | 'light') => {
    const isDarkFinish = finishTone === 'dark';
    const targetKey = isDarkFinish
      ? group.darkSlot?.slotKey || group.darkSlotKey
      : group.lightSlot?.slotKey || (group.baseSlot?.product && !checkIsDark(group.baseSlot.product) ? group.baseKey : group.lightSlotKey);

    const title = `Assign ${isDarkFinish ? '🌙 Dark' : '☀️ Light'} Finish Product (${group.label})`;
    const currentProd = isDarkFinish ? group.darkProduct : group.lightProduct;
    const currentVar = isDarkFinish ? group.darkVariant : group.lightVariant;

    handleOpenAssignModal(
      targetKey,
      title,
      'BUNDLE',
      currentProd?.id,
      currentVar?.id
    );
  };

  const notifyStorefrontUpdated = () => {
    try {
      window.dispatchEvent(new CustomEvent('catalog:updated'));
      localStorage.setItem('pingin_catalog_updated_at', String(Date.now()));
    } catch {}
  };

  // Confirm slot replacement or assignment
  const handleConfirmReplace = async () => {
    if (!activeSlotTargetKey) return;
    try {
      setIsSubmitting(true);
      setError(null);

      let productId: string | null = null;
      let variantId: string | null = null;

      if (selectedTarget) {
        if (selectedTarget.startsWith('variant:')) {
          variantId = selectedTarget.replace('variant:', '');
        } else if (selectedTarget.startsWith('product:')) {
          productId = selectedTarget.replace('product:', '');
        }
      }

      // Check if slot exists in database
      const existingSlot = slots.find((s) => s.slotKey === activeSlotTargetKey);

      if (existingSlot) {
        await adminApi.updateStorefrontSlot(activeSlotTargetKey, {
          productId,
          variantId,
          reason: replaceReason.trim() || `Assigned product to ${activeSlotTargetKey}`,
        });
      } else {
        // Create slot if it doesn't exist yet (e.g. bundle_1_dark or bundle_1_light)
        await adminApi.createStorefrontSlot({
          slotKey: activeSlotTargetKey,
          label: activeModalTitle.replace(/Assign\s+/i, '').trim(),
          slotType: activeModalCategory,
          productId,
          variantId,
        });
      }

      setSuccessMsg(`Assignment saved successfully.`);
      setActiveSlotTargetKey(null);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update slot assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open add slot modal
  const handleOpenAddSlot = (type: 'BUNDLE' | 'INDIVIDUAL') => {
    setNewSlotType(type);
    const count = type === 'BUNDLE' ? packGroups.length + 1 : addonSlots.length + 1;
    setNewSlotLabel(type === 'BUNDLE' ? `Pack Slot ${count}` : `Item Slot ${count}`);
    setNewSlotTarget('');
    setShowAddSlotModal(true);
  };

  // Submit create slot
  const handleCreateSlot = async () => {
    if (!newSlotLabel.trim()) {
      setError('Please provide a name for this slot.');
      return;
    }
    try {
      setIsCreatingSlot(true);
      setError(null);

      const uniqueKey =
        newSlotType === 'BUNDLE'
          ? `bundle_${Date.now()}`
          : `individual_${Date.now()}`;

      let productId: string | null = null;
      let variantId: string | null = null;

      if (newSlotTarget.startsWith('variant:')) {
        variantId = newSlotTarget.replace('variant:', '');
      } else if (newSlotTarget.startsWith('product:')) {
        productId = newSlotTarget.replace('product:', '');
      }

      await adminApi.createStorefrontSlot({
        slotKey: uniqueKey,
        label: newSlotLabel.trim(),
        slotType: newSlotType,
        productId,
        variantId,
        displayOrder:
          newSlotType === 'BUNDLE'
            ? packGroups.length + 1
            : addonSlots.length + 1,
      });

      setSuccessMsg(`Slot "${newSlotLabel}" created.`);
      setShowAddSlotModal(false);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create slot.');
    } finally {
      setIsCreatingSlot(false);
    }
  };

  // Clear slot (set product & variant to null)
  const handleClearSlot = async (slotKey: string, label: string) => {
    if (!window.confirm(`Clear product from "${label}"? It will be taken offline.`)) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.updateStorefrontSlot(slotKey, {
        productId: null,
        variantId: null,
        reason: `Cleared product from ${label}`,
      });
      setSuccessMsg(`Slot "${label}" cleared.`);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear slot.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear entire pack group (both dark and light)
  const handleClearPackGroup = async (group: PackSlotGroup) => {
    if (!window.confirm(`Clear all assignments for "${group.label}"?`)) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const updates = [];
      if (group.baseSlot) {
        updates.push(adminApi.updateStorefrontSlot(group.baseSlot.slotKey, { productId: null, variantId: null }));
      }
      if (group.darkSlot) {
        updates.push(adminApi.updateStorefrontSlot(group.darkSlot.slotKey, { productId: null, variantId: null }));
      }
      if (group.lightSlot) {
        updates.push(adminApi.updateStorefrontSlot(group.lightSlot.slotKey, { productId: null, variantId: null }));
      }
      await Promise.all(updates);
      setSuccessMsg(`"${group.label}" cleared.`);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear pack group.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete custom slot
  const handleDeleteSlot = async (slotKey: string, label: string) => {
    if (!window.confirm(`Delete slot "${label}" from storefront?`)) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await adminApi.deleteStorefrontSlot(slotKey);
      setSuccessMsg(`Slot "${label}" removed.`);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete slot.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle open reset modal
  const handleOpenReset = (slot: StorefrontSlot) => {
    setActiveSlotForReset(slot);
  };

  // Handle confirm reset to default
  const handleConfirmReset = async () => {
    if (!activeSlotForReset) return;
    try {
      setIsResetting(true);
      setError(null);

      const defaultSpec = DEFAULT_SLOT_ASSIGNMENTS[activeSlotForReset.slotKey];
      if (!defaultSpec) {
        throw new Error(`No default assignment registered for slot ${activeSlotForReset.slotKey}`);
      }

      const candidates =
        activeSlotForReset.slotType === 'BUNDLE' ? availableBundles : availableIndividuals;

      const targetProduct = candidates.find(
        (p) => p.sku === defaultSpec.sku || p.slug === defaultSpec.sku.toLowerCase()
      );

      if (!targetProduct) {
        throw new Error(
          `Default product "${defaultSpec.fallbackName}" (${defaultSpec.sku}) could not be found in active catalog.`
        );
      }

      await adminApi.updateStorefrontSlot(activeSlotForReset.slotKey, {
        productId: targetProduct.id,
        variantId: null,
        reason: `Reset to default: ${defaultSpec.fallbackName}`,
      });

      setSuccessMsg(`Slot "${activeSlotForReset.label}" restored to default.`);
      setActiveSlotForReset(null);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset slot to default.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-24 max-w-5xl mx-auto">
        {/* Header & Breadcrumb */}
        <div className="pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                to="/admin/catalog"
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Products & Catalog
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-xs font-mono text-emerald-400 font-medium">
                Storefront Configurator
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Storefront Configurator
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure products and finishes featured on the storefront. Live on{' '}
                  <code className="text-zinc-300">/shop</code> in real time.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddSlot('BUNDLE')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Slot</span>
            </button>

            <a
              href="/shop"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-850 hover:bg-zinc-800 text-zinc-200 transition-colors border border-zinc-750"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span>View Store</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 ml-0.5" />
            </a>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
                showHistory
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-750'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchSlots();
                fetchHistory();
              }}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 transition-colors disabled:opacity-50"
              title="Refresh Slots"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Alerts & Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-rose-400 hover:text-rose-200 font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Audit Trail Drawer (Collapsible) */}
        {showHistory && (
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Recent Storefront Slot Changes</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200 font-mono"
              >
                Close
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="py-6 text-center text-xs text-zinc-500">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">No changes recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-400 font-mono">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Slot</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Assigned Product / Variant</th>
                      <th className="py-2 px-3">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                          {new Date(item.assignedAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">{item.slotLabel}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold bg-zinc-800 text-zinc-300">
                            {item.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.newProduct ? (
                            <span className="text-emerald-300 font-medium">
                              {item.newProduct.name}
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic">None</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">{item.changedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* SECTION 1: PACKS (HERO PACK CARDS WITH DUAL FINISH ASSIGNMENT)    */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                SECTION 1 • HERO PACKS
              </p>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Select A Pack (Bundles)
              </h2>
              <p className="text-xs text-zinc-400">
                Configure both Dark and Light finish products for each storefront pack card.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddSlot('BUNDLE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Pack Slot</span>
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : packGroups.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-center space-y-3">
              <Package className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-xs text-zinc-400">No pack slots configured yet.</div>
              <button
                type="button"
                onClick={() => handleOpenAddSlot('BUNDLE')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Pack Slot</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {packGroups.map((group) => {
                const activeTone = packPreviewTones[group.id] || 'light';
                const darkProduct = group.darkProduct;
                const lightProduct = group.lightProduct;
                const darkVariant = group.darkVariant;
                const lightVariant = group.lightVariant;

                const activeProduct = activeTone === 'dark' ? darkProduct || lightProduct : lightProduct || darkProduct;
                const activeVariant = activeTone === 'dark' ? darkVariant || lightVariant : lightVariant || darkVariant;
                const activeArtworkUrl = resolveArtwork(activeProduct, activeVariant);

                const hasBothFinishes = Boolean(darkProduct && lightProduct);
                const hasAnyFinish = Boolean(darkProduct || lightProduct);

                const packStatus = hasBothFinishes
                  ? { label: 'Live on Store', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80', dot: 'bg-emerald-400' }
                  : hasAnyFinish
                  ? { label: 'Partially Slotted', color: 'bg-amber-950/60 text-amber-300 border-amber-800/80', dot: 'bg-amber-400' }
                  : { label: 'Empty Slot', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', dot: 'bg-zinc-500' };

                const cleanDisplayName =
                  activeProduct?.name.replace(/\s+(light|dark)(\s+kit|\s+pack)?/i, '').trim() ||
                  group.label;

                return (
                  <div
                    key={group.id}
                    className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-750 transition-colors shadow-sm overflow-hidden flex flex-col"
                  >
                    {/* Slot Header Control Bar */}
                    <div className="px-5 py-3 bg-zinc-925 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-xs font-bold text-zinc-300">
                          #{group.index}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{group.label}</span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${packStatus.color}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${packStatus.dot}`} />
                              <span>{packStatus.label}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2">
                        {group.baseSlot && DEFAULT_SLOT_ASSIGNMENTS[group.baseSlot.slotKey] && (
                          <button
                            type="button"
                            onClick={() => handleOpenReset(group.baseSlot!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors border border-zinc-700"
                            title="Reset to default product"
                          >
                            <RotateCcw className="w-3 h-3 text-zinc-400" />
                            <span>Reset</span>
                          </button>
                        )}

                        {hasAnyFinish && (
                          <button
                            type="button"
                            onClick={() => handleClearPackGroup(group)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Clear all finishes for this pack"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pack Card Body: Left Preview + Right Finish Selectors */}
                    <div className="p-5 flex flex-col md:flex-row items-start gap-6">
                      {/* Left: Artwork Preview & Live Finish Toggle */}
                      <div className="w-full md:w-60 shrink-0 flex flex-col items-center gap-2.5">
                        <div className="w-full aspect-[4/3] rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center p-3 relative group">
                          <img
                            src={activeArtworkUrl}
                            alt={cleanDisplayName}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        </div>

                        {/* Tone Switcher Pills */}
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() =>
                              setPackPreviewTones((prev) => ({ ...prev, [group.id]: 'dark' }))
                            }
                            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                              activeTone === 'dark'
                                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <Moon className="w-3 h-3" />
                            <span>Dark Finish</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPackPreviewTones((prev) => ({ ...prev, [group.id]: 'light' }))
                            }
                            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                              activeTone === 'light'
                                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <Sun className="w-3 h-3 text-amber-400" />
                            <span>Light Finish</span>
                          </button>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Previewing {activeTone === 'dark' ? 'Dark' : 'Light'} finish
                        </span>
                      </div>

                      {/* Right: Dual Finish Configuration Panels */}
                      <div className="flex-1 w-full space-y-4">
                        <div>
                          <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
                            <h3 className="text-xl font-bold text-white tracking-tight">
                              {cleanDisplayName}
                            </h3>
                            {activeProduct && (
                              <span className="font-mono text-2xl font-bold text-emerald-400">
                                ₹{Math.round((activeVariant?.price ?? activeProduct.basePrice) / 100)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            A storefront pack card allows customers to flip between Dark and Light finishes. Assign the product or bundle ID for each finish below.
                          </p>
                        </div>

                        {/* Finish Assignment Panels (2 Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* 🌙 Dark Finish Panel */}
                          <div
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                              activeTone === 'dark'
                                ? 'border-zinc-700 bg-zinc-950/80 ring-1 ring-zinc-700/80'
                                : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-800'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                                  <Moon className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Dark Finish Product</span>
                                </div>
                                {darkProduct && (
                                  <span className="font-mono text-xs font-bold text-emerald-400">
                                    ₹{Math.round((darkVariant?.price ?? darkProduct.basePrice) / 100)}
                                  </span>
                                )}
                              </div>

                              {darkProduct ? (
                                <div className="flex items-center gap-3 pt-1">
                                  <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 p-0.5 shrink-0 flex items-center justify-center">
                                    <img
                                      src={resolveArtwork(darkProduct, darkVariant)}
                                      alt=""
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-white truncate">
                                      {darkProduct.name} {darkVariant ? `(${darkVariant.name})` : ''}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                                      SKU: {darkVariant?.sku || darkProduct.sku}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                      <span className="shrink-0">Bundle ID:</span>
                                      <code className="text-zinc-300 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px] select-all truncate">
                                        {darkProduct.id}
                                      </code>
                                    </div>
                                    {darkVariant && (
                                      <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                        <span className="shrink-0">Variant ID:</span>
                                        <code className="text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px] select-all truncate">
                                          {darkVariant.id}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2.5 text-center text-xs text-zinc-500">
                                  No product assigned for Dark finish.
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-zinc-850 mt-3 flex items-center justify-between">
                              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[110px]">
                                {group.darkSlotKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenFinishAssign(group, 'dark')}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                              >
                                {darkProduct ? 'Change Dark Product' : '+ Assign Dark Product'}
                              </button>
                            </div>
                          </div>

                          {/* ☀️ Light Finish Panel */}
                          <div
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                              activeTone === 'light'
                                ? 'border-zinc-700 bg-zinc-950/80 ring-1 ring-zinc-700/80'
                                : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-800'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Light Finish Product</span>
                                </div>
                                {lightProduct && (
                                  <span className="font-mono text-xs font-bold text-emerald-400">
                                    ₹{Math.round((lightVariant?.price ?? lightProduct.basePrice) / 100)}
                                  </span>
                                )}
                              </div>

                              {lightProduct ? (
                                <div className="flex items-center gap-3 pt-1">
                                  <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 p-0.5 shrink-0 flex items-center justify-center">
                                    <img
                                      src={resolveArtwork(lightProduct, lightVariant)}
                                      alt=""
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-white truncate">
                                      {lightProduct.name} {lightVariant ? `(${lightVariant.name})` : ''}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                                      SKU: {lightVariant?.sku || lightProduct.sku}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                      <span className="shrink-0">Bundle ID:</span>
                                      <code className="text-zinc-300 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px] select-all truncate">
                                        {lightProduct.id}
                                      </code>
                                    </div>
                                    {lightVariant && (
                                      <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                        <span className="shrink-0">Variant ID:</span>
                                        <code className="text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px] select-all truncate">
                                          {lightVariant.id}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2.5 text-center text-xs text-zinc-500">
                                  No product assigned for Light finish.
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-zinc-850 mt-3 flex items-center justify-between">
                              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[110px]">
                                {group.lightSlotKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenFinishAssign(group, 'light')}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                              >
                                {lightProduct ? 'Change Light Product' : '+ Assign Light Product'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add New Pack Slot Button */}
              <button
                type="button"
                onClick={() => handleOpenAddSlot('BUNDLE')}
                className="w-full py-4 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Another Pack Slot</span>
              </button>
            </div>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* SECTION 2: À LA CARTE (2-COLUMN STOREFRONT GRID)                  */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                SECTION 2 • À LA CARTE
              </p>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Buy Individually Or Add On
              </h2>
              <p className="text-xs text-zinc-400">
                Individual QR items configured in the 2-column grid. Assign either a whole product or an exact variant.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddSlot('INDIVIDUAL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Item Slot</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addonSlots.map((slot, index) => {
                const isAssigned = Boolean(slot.productId || slot.variantId);
                const isVariantBound = Boolean(slot.variantId && slot.variant);
                const artworkUrl = resolveArtwork(slot.product, slot.variant);

                const displayName = isVariantBound
                  ? `${slot.product?.name || ''} (${slot.variant?.name || 'Variant'})`
                  : slot.product?.name || 'Unassigned';

                const displaySku = isVariantBound
                  ? slot.variant?.sku
                  : slot.product?.sku || '—';

                const price = isVariantBound
                  ? Math.round((slot.variant?.price ?? 0) / 100)
                  : Math.round(
                      (slot.product?.variants?.[0]?.price ?? slot.product?.basePrice ?? 0) / 100
                    );

                const isCustomSlot = !DEFAULT_SLOT_ASSIGNMENTS[slot.slotKey];
                const isDefault =
                  DEFAULT_SLOT_ASSIGNMENTS[slot.slotKey]?.sku === slot.product?.sku;

                return (
                  <div
                    key={slot.id}
                    className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-750 transition-colors shadow-sm overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header bar */}
                    <div className="px-4 py-2.5 bg-zinc-925 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-400">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">
                          {slot.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isVariantBound && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium truncate max-w-[90px]">
                            {slot.variant?.name}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isAssigned
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAssigned ? 'bg-emerald-400' : 'bg-zinc-500'
                            }`}
                          />
                          <span>{isAssigned ? 'Live on Store' : 'Empty Slot'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Item Body with Photo Representation */}
                    {isAssigned ? (
                      <div className="p-4 space-y-3">
                        <div className="aspect-[4/3] rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center p-3 relative group">
                          <img
                            src={artworkUrl}
                            alt={displayName}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-sm font-bold text-white truncate">
                              {displayName}
                            </h4>
                            <span className="font-mono text-base font-bold text-emerald-400">
                              ₹{price}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                            SKU: {displaySku}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                        <Layers className="w-8 h-8 text-zinc-600" />
                        <p className="text-xs font-medium text-zinc-400">Empty Item Slot</p>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenAssignModal(
                              slot.slotKey,
                              `Assign Product for ${slot.label}`,
                              'INDIVIDUAL',
                              slot.productId,
                              slot.variantId
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign Product</span>
                        </button>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="px-4 py-2.5 bg-zinc-925/80 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenAssignModal(
                              slot.slotKey,
                              `Change Product for ${slot.label}`,
                              'INDIVIDUAL',
                              slot.productId,
                              slot.variantId
                            )
                          }
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-200 transition-colors cursor-pointer"
                        >
                          {isAssigned ? 'Change' : 'Assign'}
                        </button>

                        {DEFAULT_SLOT_ASSIGNMENTS[slot.slotKey] && !isDefault && (
                          <button
                            type="button"
                            onClick={() => handleOpenReset(slot)}
                            className="px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                            title="Reset to default"
                          >
                            Reset
                          </button>
                        )}

                        {isAssigned && (
                          <button
                            type="button"
                            onClick={() => handleClearSlot(slot.slotKey, slot.label)}
                            className="px-2 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {isCustomSlot && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.slotKey, slot.label)}
                          className="p-1 rounded-md text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add New Item Slot Card (Inline in the 2-column grid) */}
              <button
                type="button"
                onClick={() => handleOpenAddSlot('INDIVIDUAL')}
                className="h-full min-h-[220px] rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all flex flex-col items-center justify-center gap-2 text-xs font-semibold p-6 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <span>Add Item Slot</span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  Add another item or variant to the 2-column grid
                </span>
              </button>
            </div>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* ASSIGN / REPLACE PRODUCT & VARIANT MODAL                          */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {activeSlotTargetKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-925">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <span>{activeModalTitle || 'Select Product or Bundle'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Assign a whole product or select a specific variant for this position.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSlotTargetKey(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3.5 border-b border-zinc-800 bg-zinc-900 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by product name, SKU, or Product/Bundle ID (UUID)..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Direct ID Quick Entry */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0 uppercase tracking-wider">
                    Or Direct UUID:
                  </span>
                  <input
                    type="text"
                    placeholder="Paste Product or Variant UUID directly..."
                    value={directIdInput}
                    onChange={(e) => setDirectIdInput(e.target.value.trim())}
                    className="flex-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={!directIdInput}
                    onClick={() => {
                      if (!directIdInput) return;
                      const isKnownVariant = [...availableBundles, ...availableIndividuals].some((p) =>
                        p.variants?.some((v) => v.id.toLowerCase() === directIdInput.toLowerCase())
                      );
                      if (isKnownVariant) {
                        setSelectedTarget(`variant:${directIdInput}`);
                      } else {
                        setSelectedTarget(`product:${directIdInput}`);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    Select ID
                  </button>
                </div>
              </div>

              {/* Product & Variant Candidates */}
              <div className="p-3.5 overflow-y-auto space-y-3 flex-1">
                {(() => {
                  const candidates =
                    activeModalCategory === 'BUNDLE'
                      ? availableBundles
                      : availableIndividuals;

                  const filtered = candidates.filter((c) => {
                    const q = productSearch.toLowerCase().trim();
                    if (!q) return true;
                    const matchesName = c.name.toLowerCase().includes(q);
                    const matchesSku = c.sku.toLowerCase().includes(q);
                    const matchesId = c.id.toLowerCase().includes(q);
                    const matchesVariant = c.variants?.some(
                      (v) =>
                        v.name.toLowerCase().includes(q) ||
                        v.sku.toLowerCase().includes(q) ||
                        v.id.toLowerCase().includes(q)
                    );
                    return matchesName || matchesSku || matchesId || matchesVariant;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-zinc-500">
                        No eligible products found matching &quot;{productSearch}&quot;.
                      </div>
                    );
                  }

                  return filtered.map((prod) => {
                    const isProductSelected = selectedTarget === `product:${prod.id}`;
                    const currentSlotOfProd = findAssignedSlot(prod.id);
                    const isProdInAnotherSlot =
                      currentSlotOfProd && currentSlotOfProd.slotKey !== activeSlotTargetKey;
                    const artwork = resolveArtwork(prod, null);
                    const hasVariants = prod.variants && prod.variants.length > 0;

                    return (
                      <div
                        key={prod.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 overflow-hidden divide-y divide-zinc-850"
                      >
                        {/* Option 1: Whole Product Item */}
                        <div
                          onClick={() => {
                            setSelectedTarget(`product:${prod.id}`);
                            setDirectIdInput(prod.id);
                          }}
                          className={`p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isProductSelected
                              ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500'
                              : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 p-1 flex items-center justify-center">
                              <img
                                src={artwork}
                                alt={prod.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white truncate">
                                  {prod.name}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800">
                                  {prod.sku}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs">
                                <span className="text-emerald-400 font-mono font-semibold">
                                  ₹{Math.round(prod.basePrice / 100)}
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  📦 Whole Product ({hasVariants ? `${prod.variants!.length} variants` : 'Standard'})
                                </span>
                              </div>
                              <div className="mt-1 text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                                <span className="shrink-0">Product/Bundle ID:</span>
                                <code className="text-zinc-300 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px] select-all">
                                  {prod.id}
                                </code>
                              </div>
                              {isProdInAnotherSlot && (
                                <div className="mt-1 text-[10px] text-amber-400 font-medium flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-amber-400" />
                                  <span>
                                    Currently in <strong>{currentSlotOfProd.label}</strong> (will swap)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isProductSelected
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-zinc-700 bg-zinc-900'
                            }`}
                          >
                            {isProductSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Option 2: Specific Variants Breakdown */}
                        {hasVariants && (
                          <div className="bg-zinc-900/40 p-2 space-y-1.5">
                            <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 px-2 pt-1">
                              ↳ Or Select Specific Variant:
                            </div>
                            {prod.variants!.map((variant) => {
                              const isVariantSelected = selectedTarget === `variant:${variant.id}`;
                              const currentSlotOfVariant = findAssignedSlot(prod.id, variant.id);
                              const isVariantInAnotherSlot =
                                currentSlotOfVariant &&
                                currentSlotOfVariant.slotKey !== activeSlotTargetKey;
                              const variantImg = variant.imageUrl || artwork;

                              return (
                                <div
                                  key={variant.id}
                                  onClick={() => {
                                    setSelectedTarget(`variant:${variant.id}`);
                                    setDirectIdInput(variant.id);
                                  }}
                                  className={`p-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3 ml-2 border ${
                                    isVariantSelected
                                      ? 'bg-indigo-500/15 border-indigo-500/60 text-white'
                                      : 'bg-zinc-950/50 border-zinc-850 hover:border-zinc-750 hover:bg-zinc-950'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 shrink-0 p-0.5 flex items-center justify-center">
                                      <img
                                        src={variantImg}
                                        alt={variant.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                        }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-zinc-100 truncate">
                                          {variant.name}
                                        </span>
                                        <span className="font-mono text-[9px] text-zinc-400 px-1 rounded bg-zinc-800">
                                          {variant.sku}
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-mono text-emerald-400 font-medium">
                                        ₹{Math.round(variant.price / 100)}
                                      </div>
                                      <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
                                        <span className="shrink-0">Variant ID:</span>
                                        <code className="text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800 text-[9px] select-all">
                                          {variant.id}
                                        </code>
                                      </div>
                                      {isVariantInAnotherSlot && (
                                        <div className="text-[9px] text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                                          <span>
                                            In {currentSlotOfVariant.label} (will swap)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isVariantSelected
                                        ? 'border-indigo-400 bg-indigo-500 text-white'
                                        : 'border-zinc-700 bg-zinc-900'
                                    }`}
                                  >
                                    {isVariantSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-zinc-800 bg-zinc-925 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-zinc-400 font-mono">Selected:</span>
                  <code className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded truncate max-w-[200px]">
                    {selectedTarget ? selectedTarget.replace(/^(product|variant):/, '') : 'None'}
                  </code>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSlotTargetKey(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmReplace}
                    disabled={isSubmitting || !selectedTarget}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Assignment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* ADD NEW SLOT MODAL                                                */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {showAddSlotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Add Storefront Slot</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Slot Type Picker */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1.5">
                    Storefront Section
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSlotType('BUNDLE')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newSlotType === 'BUNDLE'
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">Hero Pack</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Full-width pack card in Section 1
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewSlotType('INDIVIDUAL')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newSlotType === 'INDIVIDUAL'
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">À La Carte Item</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        2-column item grid in Section 2
                      </div>
                    </button>
                  </div>
                </div>

                {/* Slot Label Input */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Slot Label</label>
                  <input
                    type="text"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    placeholder="e.g. Starter Pack #2 or Mini Stickers"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Product / Variant Assignment Dropdown */}
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Assign Product or Variant (Optional)
                  </label>
                  <select
                    value={newSlotTarget}
                    onChange={(e) => setNewSlotTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Leave empty (assign later)</option>
                    {(newSlotType === 'BUNDLE' ? availableBundles : availableIndividuals).map(
                      (p) => (
                        <optgroup key={p.id} label={`${p.name} (${p.sku})`}>
                          <option value={`product:${p.id}`}>
                            📦 Whole Product: {p.name}
                          </option>
                          {p.variants?.map((v) => (
                            <option key={v.id} value={`variant:${v.id}`}>
                              ↳ Variant: {v.name} (₹{Math.round(v.price / 100)})
                            </option>
                          ))}
                        </optgroup>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateSlot}
                  disabled={isCreatingSlot || !newSlotLabel.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isCreatingSlot && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Slot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* RESET CONFIRMATION MODAL                                          */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {activeSlotForReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Reset to Default</h3>
              </div>

              <p className="text-xs text-zinc-300">
                Restore slot <strong>{activeSlotForReset.label}</strong> to its default product:{' '}
                <strong className="text-emerald-400">
                  {DEFAULT_SLOT_ASSIGNMENTS[activeSlotForReset.slotKey]?.fallbackName}
                </strong>
                ?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSlotForReset(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isResetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reset</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
