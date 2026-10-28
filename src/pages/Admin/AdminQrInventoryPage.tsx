import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminStickerModal } from '../../components/admin/AdminStickerModal';
import { PrintProfilesSection } from '../../components/admin/PrintProfilesSection';
import { PrintBatchesSection } from '../../components/admin/PrintBatchesSection';
import { WarehouseInwardingSection } from '../../components/admin/WarehouseInwardingSection';
import { InventoryAttentionStrip } from '../../components/admin/inventory/InventoryAttentionStrip';
import { InventoryKpiStrip } from '../../components/admin/inventory/InventoryKpiStrip';
import { InventoryStockSection } from '../../components/admin/inventory/InventoryStockSection';
import { InventoryBundlesSection } from '../../components/admin/inventory/InventoryBundlesSection';
import { InventoryTagsSection } from '../../components/admin/inventory/InventoryTagsSection';
import { getReorderThreshold } from '../../components/admin/inventory/inventoryUtils';
import { buildTagQrUrl } from '../../lib/qr';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminInventorySummary,
  AdminInventoryTagRecord,
  TagStockState,
  BulkStockItem,
  AdminProduct,
} from '../../types/admin';
import {
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';

export type MainTabType = 'stock' | 'bundles' | 'tags' | 'production' | 'setup';

export const AdminQrInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Main Tab (5 max, text tabs with underline indicator)
  const [activeTab, setActiveTab] = useState<MainTabType>('stock');

  // Sub-navigation for Production & Setup
  const [productionSubTab, setProductionSubTab] = useState<'batches' | 'receiving'>('batches');
  const [setupSubTab, setSetupSubTab] = useState<'profiles' | 'packaging'>('profiles');

  // Batch modal SKU state
  const [batchModalDefaultSku, setBatchModalDefaultSku] = useState<string>('KT-VS-SGL-DRK');

  // Authoritative Inventory Data
  const [summary, setSummary] = useState<AdminInventorySummary | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<AdminProduct[]>([]);

  // Serialized Tags State
  const [tags, setTags] = useState<AdminInventoryTagRecord[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(typeof window !== 'undefined' && window.innerWidth < 1024 ? 25 : 50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [skuFilter, setSkuFilter] = useState<string>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Bulk Stock State
  const [bulkItems, setBulkItems] = useState<BulkStockItem[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Popovers
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkEditItem, setBulkEditItem] = useState<BulkStockItem | null>(null);

  // Sticker Studio Modal
  const [stickerModal, setStickerModal] = useState<{
    isOpen: boolean;
    tagNumber: string;
    qrUrl?: string;
    initialFormat?: 'standard' | 'mini';
  }>({
    isOpen: false,
    tagNumber: '',
    initialFormat: 'standard',
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync initial query params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'stock' || tabParam === 'bundles' || tabParam === 'tags' || tabParam === 'production' || tabParam === 'setup') {
      setActiveTab(tabParam as MainTabType);
    } else if (tabParam === 'overview') {
      setActiveTab('stock');
    } else if (tabParam === 'batches') {
      setActiveTab('production');
      setProductionSubTab('batches');
    } else if (tabParam === 'inwarding') {
      setActiveTab('production');
      setProductionSubTab('receiving');
    } else if (tabParam === 'profiles') {
      setActiveTab('setup');
      setSetupSubTab('profiles');
    } else if (tabParam === 'packaging') {
      setActiveTab('setup');
      setSetupSubTab('packaging');
    }

    const skuParam = searchParams.get('sku');
    if (skuParam) {
      setSkuFilter(skuParam);
      setActiveTab('tags');
    }

    if (searchParams.get('action') === 'batch') {
      setIsBatchModalOpen(true);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: MainTabType) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', newTab);
    setSearchParams(newParams);
  };

  useEffect(() => {
    const handleResize = () => {
      setLimit(window.innerWidth < 1024 ? 25 : 50);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchSummary = useCallback(async () => {
    try {
      const res: any = await adminApi.getInventorySummary();
      const payload = res?.data || res;
      setSummary(payload);
    } catch {
      try {
        const legacy: any = await adminApi.getQrSummary();
        const legPayload = legacy?.data || legacy;
        setSummary({
          serializedBySku: [
            {
              sku: 'TAG-VEHICLE-STICKER',
              inStock: legPayload.unassigned || 0,
              reserved: 0,
              allocated: 0,
              delivered: legPayload.assigned || 0,
              damaged: legPayload.revoked || 0,
              total: legPayload.total || 0,
            },
          ],
          bulkStock: [],
          totals: {
            totalPhysicalTags: legPayload.total || 0,
            assignedToVehicles: legPayload.assigned || 0,
            inCommerceStock: legPayload.unassigned || 0,
            reservedInCheckout: 0,
          },
        });
      } catch {
        // Silently ignore
      }
    }
  }, []);

  const fetchCatalogProducts = useCallback(async () => {
    try {
      const res: any = await adminApi.getCatalogProducts({ limit: 100 });
      const payload = res?.data || res;
      setCatalogProducts(payload?.products || []);
    } catch {
      // Silently ignore
    }
  }, []);

  const fetchTags = useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const res: any = await adminApi.getInventoryTags({
          page,
          limit,
          sku: skuFilter !== 'ALL' ? skuFilter : undefined,
          state: stateFilter !== 'ALL' ? stateFilter : undefined,
          search: debouncedSearch || undefined,
        });

        const payload = res?.data || res;
        const records = payload?.records || payload?.tags || [];
        setTags(
          records.map((r: any) => ({
            id: r.id,
            qrTagId: r.qrTagId || r.id,
            tagNumber: r.tagNumber,
            sku: r.sku || 'TAG-VEHICLE-STICKER',
            stockState:
              r.stockState ||
              (r.status === 'ASSIGNED'
                ? 'DELIVERED'
                : r.status === 'REVOKED'
                ? 'DAMAGED'
                : 'IN_STOCK'),
            operationalStatus: r.operationalStatus || r.status || 'UNASSIGNED',
            assignedVehicle: r.assignedVehicle || r.resource,
            activeHold: r.activeHold,
            updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
          }))
        );
        setTotal(payload?.total ?? records.length);
        setTotalPages(payload?.totalPages ?? 1);
      } catch (err: any) {
        try {
          const legacyRes: any = await adminApi.getQrTags({
            page,
            limit,
            status: stateFilter !== 'ALL' ? stateFilter : undefined,
          });
          const legPayload = legacyRes?.data || legacyRes;
          const legacyTags = legPayload?.tags || [];
          setTags(
            legacyTags.map((t: any) => ({
              id: t.id,
              qrTagId: t.id,
              tagNumber: t.tagNumber,
              sku: 'TAG-VEHICLE-STICKER',
              stockState:
                t.status === 'ASSIGNED'
                  ? 'DELIVERED'
                  : t.status === 'REVOKED'
                  ? 'DAMAGED'
                  : 'IN_STOCK',
              operationalStatus: t.status,
              assignedVehicle: t.resource,
              updatedAt: t.createdAt,
            }))
          );
          setTotal(legPayload?.total ?? legacyTags.length);
          setTotalPages(legPayload?.totalPages ?? 1);
        } catch (legacyErr: any) {
          setError(err.message || legacyErr.message || 'Failed to load stock');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, skuFilter, stateFilter, debouncedSearch]
  );

  const fetchBulkStock = useCallback(async () => {
    setIsBulkLoading(true);
    try {
      const res: any = await adminApi.getBulkStock();
      const payload = res?.data || res;
      setBulkItems(Array.isArray(payload) ? payload : []);
    } catch {
      // Ignore
    } finally {
      setIsBulkLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchCatalogProducts();
    fetchBulkStock();
  }, [fetchSummary, fetchCatalogProducts, fetchBulkStock]);

  useEffect(() => {
    if (activeTab === 'tags') {
      fetchTags();
    }
  }, [activeTab, fetchTags]);

  const handleUpdateTagState = async (
    tag: AdminInventoryTagRecord,
    nextState: TagStockState,
    reason?: string
  ) => {
    const targetId = tag.qrTagId || tag.id;
    await adminApi.updateTagStockState(targetId, {
      state: nextState,
      reason,
    });
    showToast(`Tag #${tag.tagNumber} updated`);
    fetchSummary();
    fetchTags();
  };

  const availableSkuOptions = useMemo(() => {
    const skuMap = new Map<string, { name?: string; inStock?: number; total?: number }>();

    if (summary?.serializedBySku && Array.isArray(summary.serializedBySku)) {
      summary.serializedBySku.forEach((s) => {
        if (!s.sku) return;
        skuMap.set(s.sku, {
          inStock: s.physicalStock ?? s.inStock ?? 0,
          total: s.total ?? 0,
        });
      });
    }

    if (catalogProducts && Array.isArray(catalogProducts)) {
      catalogProducts.forEach((product) => {
        product.variants?.forEach((variant) => {
          variant.components?.forEach((comp) => {
            if (comp.inventorySku) {
              const existing = skuMap.get(comp.inventorySku) || {};
              const title =
                comp.name ||
                `${product.name}${variant.name && variant.name !== 'Standard Pack' ? ` (${variant.name})` : ''}`;
              skuMap.set(comp.inventorySku, {
                ...existing,
                name: title,
              });
            }
          });

          if (
            product.type === 'VEHICLE_STICKER' ||
            product.type === 'KEYCHAIN' ||
            product.type === 'MINI_STICKER' ||
            product.type === 'PHYSICAL_TAG_PACK'
          ) {
            if (variant.sku) {
              const existing = skuMap.get(variant.sku) || {};
              const title = `${product.name}${variant.name && variant.name !== 'Standard Pack' ? ` (${variant.name})` : ''}`;
              skuMap.set(variant.sku, {
                ...existing,
                name: existing.name || title,
              });
            }
          }
        });
      });
    }

    const formatFallbackName = (sku: string): string => {
      if (sku.startsWith('KT-VS') || sku === 'TAG-VEHICLE-STICKER') {
        const edition = sku.includes('DRK') ? 'Dark' : sku.includes('LIT') ? 'Light' : '';
        return `Vehicle Sticker${edition ? ` (${edition})` : sku === 'TAG-VEHICLE-STICKER' ? ' (Legacy)' : ''}`;
      }
      if (sku.startsWith('KT-KC') || sku === 'TAG-KEYCHAIN') {
        const edition = sku.includes('DRK') ? 'Dark' : sku.includes('LIT') ? 'Light' : '';
        return `Keychain Tag${edition ? ` (${edition})` : ''}`;
      }
      if (sku.startsWith('KT-MS') || sku === 'TAG-MINI-STICKER') {
        const edition = sku.includes('DRK') ? 'Dark' : sku.includes('LIT') ? 'Light' : '';
        return `Mini Sticker${edition ? ` (${edition})` : ''}`;
      }
      return sku;
    };

    const options: Array<{ sku: string; name: string; label: string; inStock?: number; total?: number }> = [];
    skuMap.forEach((data, sku) => {
      const friendlyName = data.name || formatFallbackName(sku);
      const stockBadge = data.inStock !== undefined ? ` · ${data.inStock} in stock` : '';
      options.push({
        sku,
        name: friendlyName,
        label: `${friendlyName} (${sku})${stockBadge}`,
        inStock: data.inStock,
        total: data.total,
      });
    });

    return options.sort((a, b) => {
      const aStock = a.inStock ?? 0;
      const bStock = b.inStock ?? 0;
      if (aStock !== bStock) return bStock - aStock;
      return a.sku.localeCompare(b.sku);
    });
  }, [summary, catalogProducts]);

  // Tab counts ONLY for attention items (excluding legacy from low count)
  const stockAttentionCount = useMemo(() => {
    if (!summary?.serializedBySku) return 0;
    return summary.serializedBySku.filter((s) => {
      if (s.sku === 'TAG-VEHICLE-STICKER') return false;
      const sellable = s.sellableStock ?? Math.max(0, (s.physicalStock ?? s.inStock ?? 0) - (s.committedDemand ?? 0));
      const threshold = getReorderThreshold(s.sku);
      return sellable <= threshold;
    }).length;
  }, [summary]);

  const damagedTagsAttentionCount = useMemo(() => {
    return summary?.serializedBySku?.reduce((sum, s) => sum + (s.damaged || 0), 0) || 0;
  }, [summary]);

  // The primary action in the header follows the top item
  const primaryHeaderAction = useMemo(() => {
    const totalGenerated = summary?.serializedBySku?.reduce((sum, s) => sum + (s.generated || 0), 0) || 0;
    if (totalGenerated > 0) {
      return {
        label: 'Send to print',
        onClick: () => handleTabChange('production'),
      };
    }
    return {
      label: 'Generate tags',
      onClick: () => {
        setBatchModalDefaultSku('KT-VS-SGL-DRK');
        setIsBatchModalOpen(true);
      },
    };
  }, [summary]);

  return (
    <AdminLayout>
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-xs border border-border bg-surface shadow-md text-xs font-medium text-ink flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ink" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-4 w-full">
        {/* ── 1. HEADER (FLUSH, CLEAN, THEMED PILL BUTTONS ONLY) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink font-sans">
              Inventory &amp; Production
            </h1>
          </div>

          {/* Fully rounded pills ONLY for header buttons & round icon button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Round Icon Button for Refresh */}
            <button
              type="button"
              onClick={() => {
                fetchSummary();
                fetchCatalogProducts();
                fetchBulkStock();
                if (activeTab === 'tags') fetchTags(true);
              }}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full border border-border hover:border-ink bg-surface flex items-center justify-center text-muted hover:text-ink active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Refresh Inventory"
              aria-label="Refresh Inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Outlined Secondary Pill: Sticker Studio */}
            <button
              type="button"
              onClick={() =>
                setStickerModal({
                  isOpen: true,
                  tagNumber: tags[0]?.tagNumber || 'KT-SAMPLE-01',
                  qrUrl: tags[0] ? buildTagQrUrl(tags[0].tagNumber) : undefined,
                  initialFormat: 'standard',
                })
              }
              className="px-3.5 py-1.5 rounded-full bg-surface hover:bg-bg border border-border hover:border-ink text-ink text-xs font-medium tracking-tight shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <span>Sticker Studio</span>
            </button>

            {/* Black Primary Pill (At most 1 black primary per view) */}
            <button
              type="button"
              onClick={primaryHeaderAction.onClick}
              className="px-3.5 py-1.5 rounded-full bg-ink hover:opacity-90 active:scale-95 text-surface text-xs font-medium tracking-wide shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{primaryHeaderAction.label}</span>
            </button>
          </div>
        </div>

        {/* ── 2. "NEEDS ATTENTION" STRIP (~44PX ROWS, HAIRLINE DIVIDERS, NO FILLS, NO ICONS) ── */}
        <InventoryAttentionStrip
          summary={summary}
          bundlesOutCount={0}
          unfulfilledOrdersCount={summary?.totals?.paidUnfulfilledDemand || 0}
          onOpenBatchModal={(sku) => {
            if (sku) setBatchModalDefaultSku(sku);
            setIsBatchModalOpen(true);
          }}
          onNavigateTab={handleTabChange}
          onOpenFulfillment={() => navigate('/admin/fulfillment')}
        />

        {/* ── 3. KPI STRIP (ONE BORDERED CONTAINER, 4 DIVIDED CELLS, SECONDARY LINE INSIDE) ── */}
        <InventoryKpiStrip
          summary={summary}
          onNavigateTab={handleTabChange}
          onFilterTagsByState={(state) => {
            setStateFilter(state);
            handleTabChange('tags');
          }}
        />

        {/* ── 4. TABS NAVIGATION (TEXT TABS WITH BOTTOM UNDERLINE, NO PILLS) ── */}
        <div className="flex items-center gap-6 border-b border-border overflow-x-auto pt-1">
          {/* Stock Tab */}
          <button
            type="button"
            onClick={() => handleTabChange('stock')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
              activeTab === 'stock' ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span>Stock</span>
            {stockAttentionCount > 0 && (
              <span className="ml-1 text-[10px] text-muted font-normal">
                ({stockAttentionCount})
              </span>
            )}
            {activeTab === 'stock' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
            )}
          </button>

          {/* Bundles Tab */}
          <button
            type="button"
            onClick={() => handleTabChange('bundles')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
              activeTab === 'bundles' ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span>Bundles</span>
            {activeTab === 'bundles' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
            )}
          </button>

          {/* Tags Tab */}
          <button
            type="button"
            onClick={() => handleTabChange('tags')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
              activeTab === 'tags' ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span>Tags</span>
            {damagedTagsAttentionCount > 0 && (
              <span className="ml-1 text-[10px] text-muted font-normal">
                ({damagedTagsAttentionCount})
              </span>
            )}
            {activeTab === 'tags' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
            )}
          </button>

          {/* Production Tab */}
          <button
            type="button"
            onClick={() => handleTabChange('production')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
              activeTab === 'production' ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span>Production</span>
            {activeTab === 'production' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
            )}
          </button>

          {/* Setup Tab */}
          <button
            type="button"
            onClick={() => handleTabChange('setup')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
              activeTab === 'setup' ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span>Setup</span>
            {activeTab === 'setup' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
            )}
          </button>
        </div>

        {/* ── 5. TAB CONTENT PANELS ── */}

        {/* TAB 1: STOCK */}
        {activeTab === 'stock' && (
          <InventoryStockSection
            serializedSummaries={summary?.serializedBySku || []}
            onOpenBatchModal={(sku) => {
              setBatchModalDefaultSku(sku);
              setIsBatchModalOpen(true);
            }}
            onFilterTagsBySku={(sku) => {
              setSkuFilter(sku);
              handleTabChange('tags');
            }}
            onNavigateTab={handleTabChange}
          />
        )}

        {/* TAB 2: BUNDLES */}
        {activeTab === 'bundles' && (
          <InventoryBundlesSection
            summary={summary}
            onOpenBatchModal={(sku) => {
              setBatchModalDefaultSku(sku);
              setIsBatchModalOpen(true);
            }}
            onRefreshParentSummary={fetchSummary}
          />
        )}

        {/* TAB 3: TAGS */}
        {activeTab === 'tags' && (
          <InventoryTagsSection
            tags={tags}
            total={total}
            totalPages={totalPages}
            currentPage={page}
            isLoading={isLoading}
            error={error}
            skuFilter={skuFilter}
            stateFilter={stateFilter}
            searchTerm={searchTerm}
            availableSkuOptions={availableSkuOptions}
            summary={summary}
            onPageChange={(p) => setPage(p)}
            onSkuFilterChange={(s) => {
              setSkuFilter(s);
              setPage(1);
            }}
            onStateFilterChange={(st) => {
              setStateFilter(st);
              setPage(1);
            }}
            onSearchChange={(search) => setSearchTerm(search)}
            onRefresh={() => fetchTags(true)}
            onOpenStickerModal={(tagNumber, isMini) =>
              setStickerModal({
                isOpen: true,
                tagNumber,
                qrUrl: buildTagQrUrl(tagNumber),
                initialFormat: isMini ? 'mini' : 'standard',
              })
            }
            onUpdateTagState={handleUpdateTagState}
          />
        )}

        {/* TAB 4: PRODUCTION */}
        {activeTab === 'production' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-border pb-2 text-xs font-mono uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setProductionSubTab('batches')}
                className={`pb-1 cursor-pointer relative ${
                  productionSubTab === 'batches' ? 'text-ink font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                <span>Print Batches</span>
                {productionSubTab === 'batches' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setProductionSubTab('receiving')}
                className={`pb-1 cursor-pointer relative ${
                  productionSubTab === 'receiving' ? 'text-ink font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                <span>Receiving</span>
                {productionSubTab === 'receiving' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
                )}
              </button>
            </div>

            {productionSubTab === 'batches' ? (
              <PrintBatchesSection
                serializedSummaries={summary?.serializedBySku || []}
                onRefreshInventory={() => {
                  fetchSummary();
                  fetchTags();
                }}
                showToast={showToast}
                onOpenBatchGenerator={(sku) => {
                  setBatchModalDefaultSku(sku || 'KT-VS-SGL-DRK');
                  setIsBatchModalOpen(true);
                }}
                onSelectBatchForInward={(_batch) => {
                  setProductionSubTab('receiving');
                }}
              />
            ) : (
              <WarehouseInwardingSection
                preselectedBatch={null}
                onRefreshInventory={() => {
                  fetchSummary();
                  fetchTags();
                }}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* TAB 5: SETUP */}
        {activeTab === 'setup' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b border-border pb-2 text-xs font-mono uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setSetupSubTab('profiles')}
                className={`pb-1 cursor-pointer relative ${
                  setupSubTab === 'profiles' ? 'text-ink font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                <span>Print Profiles</span>
                {setupSubTab === 'profiles' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSetupSubTab('packaging')}
                className={`pb-1 cursor-pointer relative ${
                  setupSubTab === 'packaging' ? 'text-ink font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                <span>Packaging Supplies ({bulkItems.length})</span>
                {setupSubTab === 'packaging' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
                )}
              </button>
            </div>

            {setupSubTab === 'profiles' ? (
              <PrintProfilesSection showToast={showToast} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-medium">
                    Packaging Materials ({bulkItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkEditItem(null);
                      setIsBulkModalOpen(true);
                    }}
                    className="btn btn-secondary !min-h-[30px] !py-0 !px-3 text-xs"
                  >
                    + Add Supply
                  </button>
                </div>

                <div className="border border-border rounded-sm bg-surface overflow-hidden">
                  {isBulkLoading ? (
                    <div className="py-12 text-center text-xs text-muted font-mono">
                      Loading supplies...
                    </div>
                  ) : bulkItems.length === 0 ? (
                    <div className="py-10 text-center text-xs text-muted font-mono">
                      No packaging supply records.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase text-[10px]">
                            <th className="py-2.5 px-3">Supply Code</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3 text-right">On Hand</th>
                            <th className="py-2.5 px-3 text-right">Reserved</th>
                            <th className="py-2.5 px-3 text-right">Available</th>
                            <th className="py-2.5 px-3 text-right">Reorder Level</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {bulkItems.map((item) => (
                            <tr key={item.id} className="hover:bg-bg/40 h-11">
                              <td className="py-2 px-3 font-mono font-medium text-ink">{item.sku}</td>
                              <td className="py-2 px-3 text-ink">{item.name}</td>
                              <td className="py-2 px-3 text-right font-mono text-ink">
                                {item.quantityOnHand}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-muted">
                                {item.reservedCount ?? 0}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-ink">
                                {item.availableCount ?? item.quantityOnHand}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-muted">
                                {item.reorderLevel}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkEditItem(item);
                                    setIsBulkModalOpen(true);
                                  }}
                                  className="text-xs text-ink hover:underline cursor-pointer"
                                >
                                  Adjust
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* MODAL 1: BATCH GENERATE PHYSICAL QR TAGS */}
      {isBatchModalOpen && (
        <BatchGenerateSkuModal
          defaultSku={batchModalDefaultSku || availableSkuOptions[0]?.sku || 'KT-VS-SGL-DRK'}
          skuOptions={availableSkuOptions}
          onClose={() => setIsBatchModalOpen(false)}
          onSuccess={() => {
            setIsBatchModalOpen(false);
            showToast('Digital tags generated');
            fetchSummary();
            fetchTags();
          }}
        />
      )}

      {/* MODAL 2: BULK PACKAGING ADJUST / ADD */}
      {isBulkModalOpen && (
        <BulkStockModal
          initialItem={bulkEditItem}
          onClose={() => {
            setIsBulkModalOpen(false);
            setBulkEditItem(null);
          }}
          onSuccess={() => {
            setIsBulkModalOpen(false);
            setBulkEditItem(null);
            showToast('Packaging stock updated');
            fetchBulkStock();
            fetchSummary();
          }}
        />
      )}

      {/* MODAL 3: STICKER STUDIO VIEWER */}
      {stickerModal.isOpen && (
        <AdminStickerModal
          isOpen={stickerModal.isOpen}
          initialTagNumber={stickerModal.tagNumber}
          initialQrUrl={stickerModal.qrUrl}
          initialFormat={stickerModal.initialFormat}
          onClose={() => setStickerModal({ isOpen: false, tagNumber: '' })}
        />
      )}
    </AdminLayout>
  );
};

// =========================================================================
// Responsive Batch Generate Modal Component
// =========================================================================
interface BatchGenerateSkuModalProps {
  defaultSku?: string;
  skuOptions: Array<{ sku: string; name: string; label: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchGenerateSkuModal: React.FC<BatchGenerateSkuModalProps> = ({
  defaultSku,
  skuOptions,
  onClose,
  onSuccess,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>(
    defaultSku || skuOptions[0]?.sku || 'KT-VS-SGL-DRK'
  );
  const [quantity, setQuantity] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 1 || quantity > 5000) {
      setError('Please choose a quantity between 1 and 5,000 tags.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await adminApi.batchGenerateInventoryTags(
        {
          sku: selectedProduct.trim().toUpperCase(),
          quantity: Number(quantity),
        },
        idempotencyKey
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Batch tag generation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-sm border border-border bg-surface p-5 shadow-lg space-y-4 font-sans text-xs">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
            Generate Digital Tags
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-2 border border-danger/40 text-danger text-xs">{error}</div>}

          <div>
            <label className="block text-[11px] font-medium text-ink mb-1">Product SKU *</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-xs border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none"
            >
              {skuOptions.map((opt) => (
                <option key={opt.sku} value={opt.sku}>
                  {opt.name} ({opt.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink mb-1">Quantity * (1 – 5,000)</label>
            <input
              type="number"
              min="1"
              max="5000"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full py-1.5 px-2.5 rounded-xs border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {[50, 100, 250, 500, 1000].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-mono border cursor-pointer ${
                    quantity === qty
                      ? 'bg-ink text-surface border-ink'
                      : 'bg-surface text-muted border-border hover:border-ink hover:text-ink'
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary !min-h-[32px] !py-0 !px-4 text-xs"
            >
              {isSubmitting ? 'Generating...' : 'Generate Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// Responsive Bulk Packaging Modal Component
// =========================================================================
interface BulkStockModalProps {
  initialItem?: BulkStockItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkStockModal: React.FC<BulkStockModalProps> = ({
  initialItem,
  onClose,
  onSuccess,
}) => {
  const [sku, setSku] = useState(initialItem?.sku || 'BOX-PACK-BIKE');
  const [name, setName] = useState(initialItem?.name || 'Custom Bike Packaging Box');
  const [delta, setDelta] = useState<string>('500');
  const [reorderLevel, setReorderLevel] = useState<string>(
    initialItem ? String(initialItem.reorderLevel) : '50'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim()) {
      setError('Item code is required (e.g. BOX-PACK-BIKE)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await adminApi.createOrUpdateBulkStock({
        sku: sku.trim().toUpperCase(),
        name: name.trim() || undefined,
        quantityOnHandDelta: delta ? Number(delta) : undefined,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update packaging stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-sm border border-border bg-surface p-5 shadow-lg space-y-4 font-sans text-xs">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
            {initialItem ? `Adjust Stock: ${initialItem.name}` : 'Add / Restock Packaging'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-2 border border-danger/40 text-danger text-xs">{error}</div>}

          <div>
            <label className="block text-[11px] font-medium text-ink mb-1">Item Code (SKU) *</label>
            <input
              type="text"
              required
              disabled={!!initialItem}
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. BOX-PACK-BIKE"
              className="w-full py-1.5 px-2.5 rounded-xs border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Packaging Box"
              className="w-full py-1.5 px-2.5 rounded-xs border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-ink mb-1">Qty Delta</label>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+500"
                className="w-full py-1.5 px-2.5 rounded-xs border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink mb-1">Reorder Level</label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="50"
                className="w-full py-1.5 px-2.5 rounded-xs border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary !min-h-[32px] !py-0 !px-4 text-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
