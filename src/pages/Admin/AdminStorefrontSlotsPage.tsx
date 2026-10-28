import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Plus,
  ArrowRightLeft,
  RotateCcw,
  ExternalLink,
  History,
  CheckCircle2,
  XCircle,
  Search,
  Package,
  ChevronRight,
  RefreshCw,
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

  // Active preview finish per pack slot
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

    if (!prefixes.includes('bundle_1')) prefixes.push('bundle_1');
    if (!prefixes.includes('bundle_2')) prefixes.push('bundle_2');

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

  // Resolve product image cleanly without mock frame
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

    const title = `Assign ${isDarkFinish ? 'Dark' : 'Light'} Finish (${group.label})`;
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

      const existingSlot = slots.find((s) => s.slotKey === activeSlotTargetKey);

      if (existingSlot) {
        await adminApi.updateStorefrontSlot(activeSlotTargetKey, {
          productId,
          variantId,
          reason: replaceReason.trim() || `Assigned product to ${activeSlotTargetKey}`,
        });
      } else {
        await adminApi.createStorefrontSlot({
          slotKey: activeSlotTargetKey,
          label: activeModalTitle.replace(/Assign\s+/i, '').trim(),
          slotType: activeModalCategory,
          productId,
          variantId,
        });
      }

      setSuccessMsg('Assignment saved successfully.');
      setActiveSlotTargetKey(null);
      await fetchSlots();
      await fetchHistory();
      notifyStorefrontUpdated();

      setTimeout(() => setSuccessMsg(null), 3000);
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

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create slot.');
    } finally {
      setIsCreatingSlot(false);
    }
  };

  // Clear slot
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
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear slot.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear entire pack group
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
      setTimeout(() => setSuccessMsg(null), 3000);
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
      setTimeout(() => setSuccessMsg(null), 3000);
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

      setTimeout(() => setSuccessMsg(null), 3000);
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
            <div className="flex items-center gap-1.5 mb-2 text-xs font-sans text-muted">
              <Link to="/admin/catalog" className="hover:text-ink transition-colors">
                Products & Catalog
              </Link>
              <ChevronRight className="w-3 h-3 text-muted/60" />
              <span className="text-ink font-medium">Storefront Configurator</span>
            </div>
            <div>
              <h1 className="text-2xl font-sans font-medium text-ink tracking-tight">
                Storefront Configurator
              </h1>
              <p className="text-xs text-muted font-sans mt-0.5">
                Configure products and finishes featured on the storefront. Live on <span className="font-satoshi text-ink">/shop</span> in real time.
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchSlots();
                fetchHistory();
              }}
              disabled={isLoading}
              className="p-2 border border-border rounded-md hover:bg-surface text-muted hover:text-ink transition-colors disabled:opacity-50"
              title="Refresh slots"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-xs font-sans transition-colors ${
                showHistory
                  ? 'border-ink bg-surface text-ink font-medium'
                  : 'border-border text-ink hover:bg-surface'
              }`}
            >
              <History className="w-3.5 h-3.5 text-muted" />
              <span>History</span>
            </button>

            <a
              href="/shop"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-xs font-sans text-ink hover:bg-surface transition-colors"
            >
              <span>View store</span>
              <ExternalLink className="w-3 h-3 text-muted" />
            </a>

            <button
              type="button"
              onClick={() => handleOpenAddSlot('BUNDLE')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-ink text-bg rounded-md text-xs font-sans font-medium hover:bg-ink/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add slot</span>
            </button>
          </div>
        </div>

        {/* Alerts & Messages */}
        {error && (
          <div className="p-3 bg-surface border border-red-500/20 text-xs text-ink rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-muted hover:text-ink transition-colors ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-surface border border-emerald-600/30 text-xs text-ink rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Audit History Drawer */}
        {showHistory && (
          <div className="border border-border rounded-lg bg-surface/30 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted" />
                <h3 className="text-xs font-sans font-medium text-ink">Recent Slot Activity</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs text-muted hover:text-ink font-sans"
              >
                Close
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="py-6 text-center text-xs text-muted font-sans">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted font-sans">No changes recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="border-b border-border text-muted font-normal">
                    <tr>
                      <th className="py-2 px-2.5 font-normal">Date</th>
                      <th className="py-2 px-2.5 font-normal">Slot</th>
                      <th className="py-2 px-2.5 font-normal">Action</th>
                      <th className="py-2 px-2.5 font-normal">Assigned Product</th>
                      <th className="py-2 px-2.5 font-normal">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/60 transition-colors">
                        <td className="py-2 px-2.5 font-satoshi text-muted whitespace-nowrap">
                          {new Date(item.assignedAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-2.5 font-medium text-ink">{item.slotLabel}</td>
                        <td className="py-2 px-2.5 text-muted lowercase">{item.action}</td>
                        <td className="py-2 px-2.5 text-ink">
                          {item.newProduct ? (
                            <span>{item.newProduct.name}</span>
                          ) : (
                            <span className="text-muted/60 italic">None</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-muted">{item.changedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* SECTION 1: HERO PACKS (BUNDLES WITH DUAL FINISH ASSIGNMENT)       */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h2 className="text-base font-sans font-medium text-ink tracking-tight">
                Select a pack (bundles)
              </h2>
              <p className="text-xs text-muted font-sans">
                Configure both Dark and Light finish products for each storefront pack card.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddSlot('BUNDLE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs font-sans text-ink hover:bg-surface transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-muted" />
              <span>Add pack slot</span>
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 rounded-lg bg-surface/50 border border-border animate-pulse" />
              ))}
            </div>
          ) : packGroups.length === 0 ? (
            <div className="p-8 rounded-lg border border-border text-center space-y-2">
              <Package className="w-6 h-6 text-muted mx-auto" />
              <div className="text-xs text-muted font-sans">No pack slots configured yet.</div>
              <button
                type="button"
                onClick={() => handleOpenAddSlot('BUNDLE')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-bg rounded-md text-xs font-sans font-medium hover:bg-ink/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create first pack slot</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
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
                  ? { label: 'Live on Store', dot: 'bg-emerald-600' }
                  : hasAnyFinish
                  ? { label: 'Partially Slotted', dot: 'bg-amber-500' }
                  : { label: 'Empty Slot', dot: 'bg-muted/40' };

                const cleanDisplayName =
                  activeProduct?.name.replace(/\s+(light|dark)(\s+kit|\s+pack)?/i, '').trim() ||
                  group.label;

                return (
                  <div
                    key={group.id}
                    className="rounded-lg border border-border bg-surface/30 overflow-hidden divide-y divide-border"
                  >
                    {/* Slot Header Control Bar */}
                    <div className="px-4 py-2.5 bg-surface/50 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-satoshi font-medium text-xs text-muted">
                          #{group.index}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-sans font-medium text-ink">{group.label}</span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted font-sans">
                            <span className={`w-1.5 h-1.5 rounded-full ${packStatus.dot}`} />
                            <span>{packStatus.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2">
                        {group.baseSlot && DEFAULT_SLOT_ASSIGNMENTS[group.baseSlot.slotKey] && (
                          <button
                            type="button"
                            onClick={() => handleOpenReset(group.baseSlot!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans text-muted hover:text-ink hover:bg-surface transition-colors"
                            title="Reset to default product"
                          >
                            <RotateCcw className="w-3 h-3 text-muted" />
                            <span>Reset</span>
                          </button>
                        )}

                        {hasAnyFinish && (
                          <button
                            type="button"
                            onClick={() => handleClearPackGroup(group)}
                            className="px-2.5 py-1 rounded text-xs font-sans text-muted hover:text-ink hover:bg-surface transition-colors"
                            title="Clear all finishes for this pack"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pack Card Body */}
                    <div className="p-4 flex flex-col md:flex-row items-start gap-5">
                      {/* Left: Artwork Preview & Live Finish Toggle */}
                      <div className="w-full md:w-48 shrink-0 flex flex-col items-center gap-2">
                        <div className="w-full aspect-square rounded-md border border-border overflow-hidden bg-bg relative">
                          <img
                            src={activeArtworkUrl}
                            alt={cleanDisplayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        </div>

                        {/* Tone Switcher Tabs */}
                        <div className="inline-flex items-center p-0.5 rounded-md border border-border bg-surface text-xs font-sans">
                          <button
                            type="button"
                            onClick={() =>
                              setPackPreviewTones((prev) => ({ ...prev, [group.id]: 'dark' }))
                            }
                            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                              activeTone === 'dark'
                                ? 'bg-bg text-ink font-medium shadow-2xs'
                                : 'text-muted hover:text-ink'
                            }`}
                          >
                            <Moon className="w-3 h-3" />
                            <span>Dark finish</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPackPreviewTones((prev) => ({ ...prev, [group.id]: 'light' }))
                            }
                            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                              activeTone === 'light'
                                ? 'bg-bg text-ink font-medium shadow-2xs'
                                : 'text-muted hover:text-ink'
                            }`}
                          >
                            <Sun className="w-3 h-3" />
                            <span>Light finish</span>
                          </button>
                        </div>
                      </div>

                      {/* Right: Dual Finish Configuration Panels */}
                      <div className="flex-1 w-full space-y-3">
                        <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                          <div>
                            <h3 className="text-base font-sans font-medium text-ink tracking-tight">
                              {cleanDisplayName}
                            </h3>
                            <p className="text-xs text-muted font-sans mt-0.5">
                              Dual-finish pack. Assign distinct product or bundle variants for dark and light.
                            </p>
                          </div>
                          {activeProduct && (
                            <span className="font-satoshi font-medium text-xl text-ink">
                              ₹{Math.round((activeVariant?.price ?? activeProduct.basePrice) / 100)}
                            </span>
                          )}
                        </div>

                        {/* Finish Assignment Panels (2 Columns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Dark Finish Panel */}
                          <div
                            className={`p-3 rounded-md border transition-all flex flex-col justify-between ${
                              activeTone === 'dark'
                                ? 'border-ink/40 bg-bg'
                                : 'border-border bg-surface/50'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-ink">
                                  <Moon className="w-3.5 h-3.5 text-muted" />
                                  <span>Dark finish product</span>
                                </div>
                                {darkProduct && (
                                  <span className="font-satoshi font-medium text-xs text-ink">
                                    ₹{Math.round((darkVariant?.price ?? darkProduct.basePrice) / 100)}
                                  </span>
                                )}
                              </div>

                              {darkProduct ? (
                                <div className="flex items-center gap-2.5 pt-1">
                                  <div className="w-10 h-10 rounded border border-border overflow-hidden shrink-0 bg-bg">
                                    <img
                                      src={resolveArtwork(darkProduct, darkVariant)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-sans font-medium text-ink truncate">
                                      {darkProduct.name} {darkVariant ? `(${darkVariant.name})` : ''}
                                    </div>
                                    <div className="text-[11px] font-satoshi text-muted truncate">
                                      {darkVariant?.sku || darkProduct.sku}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2 text-center text-xs text-muted font-sans">
                                  No product assigned.
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-border mt-2.5 flex items-center justify-between">
                              <span className="text-[11px] font-satoshi text-muted/60 truncate max-w-[100px]">
                                {group.darkSlotKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenFinishAssign(group, 'dark')}
                                className="px-2.5 py-1 border border-border rounded text-xs font-sans text-ink hover:bg-surface transition-colors"
                              >
                                {darkProduct ? 'Change' : 'Assign'}
                              </button>
                            </div>
                          </div>

                          {/* Light Finish Panel */}
                          <div
                            className={`p-3 rounded-md border transition-all flex flex-col justify-between ${
                              activeTone === 'light'
                                ? 'border-ink/40 bg-bg'
                                : 'border-border bg-surface/50'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-ink">
                                  <Sun className="w-3.5 h-3.5 text-muted" />
                                  <span>Light finish product</span>
                                </div>
                                {lightProduct && (
                                  <span className="font-satoshi font-medium text-xs text-ink">
                                    ₹{Math.round((lightVariant?.price ?? lightProduct.basePrice) / 100)}
                                  </span>
                                )}
                              </div>

                              {lightProduct ? (
                                <div className="flex items-center gap-2.5 pt-1">
                                  <div className="w-10 h-10 rounded border border-border overflow-hidden shrink-0 bg-bg">
                                    <img
                                      src={resolveArtwork(lightProduct, lightVariant)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-sans font-medium text-ink truncate">
                                      {lightProduct.name} {lightVariant ? `(${lightVariant.name})` : ''}
                                    </div>
                                    <div className="text-[11px] font-satoshi text-muted truncate">
                                      {lightVariant?.sku || lightProduct.sku}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2 text-center text-xs text-muted font-sans">
                                  No product assigned.
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-border mt-2.5 flex items-center justify-between">
                              <span className="text-[11px] font-satoshi text-muted/60 truncate max-w-[100px]">
                                {group.lightSlotKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenFinishAssign(group, 'light')}
                                className="px-2.5 py-1 border border-border rounded text-xs font-sans text-ink hover:bg-surface transition-colors"
                              >
                                {lightProduct ? 'Change' : 'Assign'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => handleOpenAddSlot('BUNDLE')}
                className="w-full py-3 rounded-lg border border-dashed border-border hover:border-ink/40 text-muted hover:text-ink transition-colors flex items-center justify-center gap-1.5 text-xs font-sans"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add another pack slot</span>
              </button>
            </div>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* SECTION 2: À LA CARTE (UNBOXED LINE TABLE / FLUSH MOBILE LIST)    */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h2 className="text-base font-sans font-medium text-ink tracking-tight">
                Buy individually or add on
              </h2>
              <p className="text-xs text-muted font-sans">
                Individual QR items configured in the storefront grid.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddSlot('INDIVIDUAL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs font-sans text-ink hover:bg-surface transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-muted" />
              <span>Add item slot</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-lg bg-surface/50 border border-border animate-pulse" />
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
                    className="rounded-lg border border-border bg-surface/30 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header bar */}
                    <div className="px-3.5 py-2.5 bg-surface/50 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-satoshi font-medium text-xs text-muted">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-sans font-medium text-ink truncate max-w-[140px]">
                          {slot.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isVariantBound && (
                          <span className="text-[11px] font-sans text-muted">
                            {slot.variant?.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted font-sans">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAssigned ? 'bg-emerald-600' : 'bg-muted/40'
                            }`}
                          />
                          <span>{isAssigned ? 'Live' : 'Empty'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Item Body with Photo Representation */}
                    {isAssigned ? (
                      <div className="p-3.5 space-y-3">
                        <div className="w-full aspect-[4/3] rounded-md border border-border overflow-hidden bg-bg relative">
                          <img
                            src={artworkUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                          />
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-sm font-sans font-medium text-ink truncate">
                              {displayName}
                            </h4>
                            <span className="font-satoshi font-medium text-base text-ink">
                              ₹{price}
                            </span>
                          </div>
                          <p className="text-xs font-satoshi text-muted truncate mt-0.5">
                            {displaySku}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                        <Package className="w-6 h-6 text-muted" />
                        <p className="text-xs font-sans text-muted">Empty item slot</p>
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-ink text-bg rounded-md text-xs font-sans font-medium hover:bg-ink/90 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign product</span>
                        </button>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="px-3.5 py-2.5 bg-surface/50 border-t border-border flex items-center justify-between gap-2">
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
                          className="px-2.5 py-1 border border-border rounded text-xs font-sans text-ink hover:bg-surface transition-colors"
                        >
                          {isAssigned ? 'Change' : 'Assign'}
                        </button>

                        {DEFAULT_SLOT_ASSIGNMENTS[slot.slotKey] && !isDefault && (
                          <button
                            type="button"
                            onClick={() => handleOpenReset(slot)}
                            className="px-2 py-1 text-xs font-sans text-muted hover:text-ink transition-colors"
                            title="Reset to default"
                          >
                            Reset
                          </button>
                        )}

                        {isAssigned && (
                          <button
                            type="button"
                            onClick={() => handleClearSlot(slot.slotKey, slot.label)}
                            className="px-2 py-1 text-xs font-sans text-muted hover:text-ink transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {isCustomSlot && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.slotKey, slot.label)}
                          className="p-1 text-muted hover:text-red-700 transition-colors"
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
                className="min-h-[220px] rounded-lg border border-dashed border-border hover:border-ink/40 text-muted hover:text-ink transition-colors flex flex-col items-center justify-center gap-1.5 p-6"
              >
                <Plus className="w-5 h-5 text-muted" />
                <span className="text-xs font-sans font-medium text-ink">Add item slot</span>
                <span className="text-xs font-sans text-muted">
                  Add another item to the storefront 2-column grid
                </span>
              </button>
            </div>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* ASSIGN / REPLACE PRODUCT & VARIANT MODAL                          */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {activeSlotTargetKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-xl rounded-lg bg-bg border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
                <div>
                  <h3 className="text-sm font-sans font-medium text-ink flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-muted" />
                    <span>{activeModalTitle || 'Select Product or Bundle'}</span>
                  </h3>
                  <p className="text-xs text-muted font-sans mt-0.5">
                    Assign a whole product or select a specific variant for this position.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSlotTargetKey(null)}
                  className="p-1 rounded text-muted hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-border bg-surface/20 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by product name, SKU, or UUID..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-md bg-surface border border-border text-xs font-sans text-ink placeholder:text-muted focus:outline-none focus:border-ink"
                  />
                </div>

                {/* Direct ID Quick Entry */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs font-sans text-muted shrink-0">
                    Direct ID:
                  </span>
                  <input
                    type="text"
                    placeholder="Paste UUID directly..."
                    value={directIdInput}
                    onChange={(e) => setDirectIdInput(e.target.value.trim())}
                    className="flex-1 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-satoshi text-ink placeholder:text-muted focus:outline-none focus:border-ink"
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
                    className="px-2.5 py-1 border border-border rounded-md text-xs font-sans text-ink hover:bg-surface disabled:opacity-40 shrink-0 transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>

              {/* Product & Variant Candidates */}
              <div className="p-3 overflow-y-auto space-y-2 flex-1">
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
                      <div className="py-12 text-center text-xs text-muted font-sans">
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
                        className="rounded-md border border-border bg-surface/30 overflow-hidden divide-y divide-border"
                      >
                        {/* Whole Product Option */}
                        <div
                          onClick={() => {
                            setSelectedTarget(`product:${prod.id}`);
                            setDirectIdInput(prod.id);
                          }}
                          className={`p-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isProductSelected
                              ? 'bg-surface border-l-2 border-l-ink'
                              : 'hover:bg-surface/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded border border-border shrink-0 overflow-hidden bg-bg">
                              <img
                                src={artwork}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-sans font-medium text-ink truncate">
                                  {prod.name}
                                </span>
                                <span className="font-satoshi text-xs text-muted">
                                  {prod.sku}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs">
                                <span className="text-ink font-satoshi font-medium">
                                  ₹{Math.round(prod.basePrice / 100)}
                                </span>
                                <span className="text-muted font-sans">
                                  · {hasVariants ? `${prod.variants!.length} variants` : 'Standard'}
                                </span>
                              </div>
                              {isProdInAnotherSlot && (
                                <div className="mt-0.5 text-[11px] text-muted font-sans">
                                  Currently in {currentSlotOfProd.label} (will swap)
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isProductSelected
                                ? 'border-ink bg-ink text-bg'
                                : 'border-border bg-bg'
                            }`}
                          >
                            {isProductSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                        </div>

                        {/* Variants Breakdown */}
                        {hasVariants && (
                          <div className="p-2 space-y-1 bg-surface/20">
                            <div className="text-[11px] font-sans text-muted px-1 pb-0.5">
                              Or select variant:
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
                                  className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                    isVariantSelected
                                      ? 'border-ink bg-surface'
                                      : 'border-border/60 bg-bg hover:border-border'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded border border-border shrink-0 overflow-hidden bg-bg">
                                      <img
                                        src={variantImg}
                                        alt={variant.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                        }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-sans font-medium text-ink truncate">
                                          {variant.name}
                                        </span>
                                        <span className="font-satoshi text-xs text-muted">
                                          {variant.sku}
                                        </span>
                                      </div>
                                      <div className="text-xs font-satoshi font-medium text-ink">
                                        ₹{Math.round(variant.price / 100)}
                                      </div>
                                      {isVariantInAnotherSlot && (
                                        <div className="text-[11px] text-muted font-sans">
                                          In {currentSlotOfVariant.label} (will swap)
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                      isVariantSelected
                                        ? 'border-ink bg-ink text-bg'
                                        : 'border-border bg-bg'
                                    }`}
                                  >
                                    {isVariantSelected && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
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
              <div className="p-3 border-t border-border bg-surface/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted font-sans">Selected:</span>
                  <span className="text-xs font-satoshi font-medium text-ink truncate max-w-[200px]">
                    {selectedTarget ? selectedTarget.replace(/^(product|variant):/, '') : 'None'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSlotTargetKey(null)}
                    className="px-3 py-1.5 rounded-md text-xs font-sans text-muted hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmReplace}
                    disabled={isSubmitting || !selectedTarget}
                    className="px-3.5 py-1.5 rounded-md text-xs font-sans font-medium bg-ink text-bg hover:bg-ink/90 transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save assignment</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-md rounded-lg bg-bg border border-border shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-sans font-medium text-ink">Add Storefront Slot</h3>
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="text-muted hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs font-sans">
                {/* Slot Type Picker */}
                <div>
                  <label className="block text-muted font-sans mb-1.5">
                    Storefront Section
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSlotType('BUNDLE')}
                      className={`p-3 rounded-md border text-left transition-colors ${
                        newSlotType === 'BUNDLE'
                          ? 'border-ink bg-surface text-ink font-medium'
                          : 'border-border bg-bg text-muted hover:border-border'
                      }`}
                    >
                      <div className="font-sans text-xs">Hero pack</div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Full-width pack in section 1
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewSlotType('INDIVIDUAL')}
                      className={`p-3 rounded-md border text-left transition-colors ${
                        newSlotType === 'INDIVIDUAL'
                          ? 'border-ink bg-surface text-ink font-medium'
                          : 'border-border bg-bg text-muted hover:border-border'
                      }`}
                    >
                      <div className="font-sans text-xs">À la carte item</div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Grid item in section 2
                      </div>
                    </button>
                  </div>
                </div>

                {/* Slot Label Input */}
                <div>
                  <label className="block text-muted font-sans mb-1">Slot Label</label>
                  <input
                    type="text"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    placeholder="e.g. Starter Pack or Mini Stickers"
                    className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-xs font-sans text-ink placeholder:text-muted focus:outline-none focus:border-ink"
                  />
                </div>

                {/* Product / Variant Assignment Dropdown */}
                <div>
                  <label className="block text-muted font-sans mb-1">
                    Assign Product (Optional)
                  </label>
                  <select
                    value={newSlotTarget}
                    onChange={(e) => setNewSlotTarget(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-xs font-sans text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">Leave empty (assign later)</option>
                    {(newSlotType === 'BUNDLE' ? availableBundles : availableIndividuals).map(
                      (p) => (
                        <optgroup key={p.id} label={`${p.name} (${p.sku})`}>
                          <option value={`product:${p.id}`}>
                            {p.name}
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
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-sans text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCreateSlot}
                  disabled={isCreatingSlot || !newSlotLabel.trim()}
                  className="px-3.5 py-1.5 rounded-md text-xs font-sans font-medium bg-ink text-bg hover:bg-ink/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isCreatingSlot && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create slot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* RESET CONFIRMATION MODAL                                          */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {activeSlotForReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-lg bg-bg border border-border shadow-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-muted" />
                <h3 className="text-sm font-sans font-medium text-ink">Reset to default</h3>
              </div>

              <p className="text-xs text-muted font-sans leading-relaxed">
                Restore slot <strong className="text-ink font-medium">{activeSlotForReset.label}</strong> to default product:{' '}
                <strong className="text-ink font-medium">
                  {DEFAULT_SLOT_ASSIGNMENTS[activeSlotForReset.slotKey]?.fallbackName}
                </strong>
                ?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSlotForReset(null)}
                  className="px-3 py-1.5 rounded-md text-xs font-sans text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="px-3.5 py-1.5 rounded-md text-xs font-sans font-medium bg-ink text-bg hover:bg-ink/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isResetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm reset</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
