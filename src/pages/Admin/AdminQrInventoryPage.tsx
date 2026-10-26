import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminStickerModal } from '../../components/admin/AdminStickerModal';
import { PrintProfilesSection } from '../../components/admin/PrintProfilesSection';
import { PrintBatchesSection } from '../../components/admin/PrintBatchesSection';
import { buildTagQrUrl } from '../../lib/qr';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminInventorySummary,
  AdminInventoryTagRecord,
  TagStockState,
  BulkStockItem,
} from '../../types/admin';
import {
  Search,
  RefreshCw,
  Copy,
  Check,
  X,
  Download,
  AlertTriangle,
  Plus,
  Box,
  Layers,
} from 'lucide-react';

const STOCK_STATES: Array<{ value: 'ALL' | TagStockState; label: string }> = [
  { value: 'ALL', label: 'All states' },
  { value: 'GENERATED', label: 'Digital unprinted (0 sellable)' },
  { value: 'SENT_TO_PRINT', label: 'Dispatched to print vendor' },
  { value: 'IN_STOCK', label: 'In stock (Sellable)' },
  { value: 'ALLOCATED_TO_ORDER', label: 'Assigned to order' },
  { value: 'DISPATCHED', label: 'Shipped via courier' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'DAMAGED', label: 'Damaged / Defective' },
  { value: 'RETURNED_TO_STOCK', label: 'Returned' },
  { value: 'RESERVED', label: 'Checkout hold' },
];

export const AdminQrInventoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Active Tab: 'overview' | 'batches' | 'stock' | 'profiles' | 'packaging'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'batches' | 'stock' | 'profiles' | 'packaging'
  >('overview');
  const [batchModalDefaultSku, setBatchModalDefaultSku] = useState<string>('TAG-VEHICLE-STICKER');

  // Summary State
  const [summary, setSummary] = useState<AdminInventorySummary | null>(null);

  // Serialized Tags State
  const [tags, setTags] = useState<AdminInventoryTagRecord[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkEditItem, setBulkEditItem] = useState<BulkStockItem | null>(null);

  // State Change Modal
  const [stateChangeTag, setStateChangeTag] = useState<AdminInventoryTagRecord | null>(null);
  const [nextState, setNextState] = useState<TagStockState>('DAMAGED');
  const [stateReason, setStateReason] = useState('');
  const [isUpdatingState, setIsUpdatingState] = useState(false);

  // Sticker Modal
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
    const skuParam = searchParams.get('sku');
    if (skuParam) {
      setSkuFilter(skuParam);
      setActiveTab('stock');
    }
    const tabParam = searchParams.get('tab');
    if (
      tabParam === 'overview' ||
      tabParam === 'stock' ||
      tabParam === 'packaging' ||
      tabParam === 'batches' ||
      tabParam === 'profiles'
    ) {
      setActiveTab(tabParam as any);
    }
    if (searchParams.get('action') === 'batch') {
      setIsBatchModalOpen(true);
    }
  }, [searchParams]);

  // Debounce stock search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Inventory Summary
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

  // Fetch Serialized Tags
  const fetchTags = useCallback(async (manual = false) => {
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
  }, [page, limit, skuFilter, stateFilter, debouncedSearch]);

  // Fetch Bulk Stock
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
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchTags();
    } else if (activeTab === 'packaging') {
      fetchBulkStock();
    } else if (activeTab === 'overview') {
      fetchSummary();
      fetchBulkStock();
    }
  }, [activeTab, fetchTags, fetchBulkStock, fetchSummary]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // State update submission
  const handleStateUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateChangeTag) return;
    setIsUpdatingState(true);
    try {
      const targetId = stateChangeTag.qrTagId || stateChangeTag.id;
      await adminApi.updateTagStockState(targetId, {
        state: nextState,
        reason: stateReason.trim() || undefined,
      });

      showToast(`Tag ${stateChangeTag.tagNumber} updated`);
      setStateChangeTag(null);
      setStateReason('');
      fetchSummary();
      fetchTags();
    } catch (err: any) {
      alert(`Failed to update state: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingState(false);
    }
  };

  // Clean item name resolver
  const getItemName = (sku: string) => {
    if (sku.includes('STICKER') && !sku.includes('MINI')) return 'Vehicle Sticker';
    if (sku.includes('KEYCHAIN')) return 'Metal Keychain';
    if (sku.includes('MINI')) return 'Mini Sticker';
    return sku;
  };

  // Quiet status dot helper
  const renderStatusDot = (state: TagStockState | string) => {
    let dotClass = 'bg-neutral-400';
    let text = state.replace(/_/g, ' ');

    if (state === 'GENERATED') {
      dotClass = 'bg-purple-600';
      text = 'Digital Generated';
    } else if (state === 'SENT_TO_PRINT') {
      dotClass = 'bg-amber-500';
      text = 'At Vendor Print';
    } else if (state === 'IN_STOCK') {
      dotClass = 'bg-emerald-600';
      text = 'In Stock';
    } else if (state === 'ALLOCATED_TO_ORDER') {
      dotClass = 'bg-blue-600';
      text = 'Allocated';
    } else if (state === 'DISPATCHED') {
      dotClass = 'bg-indigo-600';
      text = 'Dispatched';
    } else if (state === 'DELIVERED') {
      dotClass = 'bg-teal-600';
      text = 'Delivered';
    } else if (state === 'DAMAGED') {
      dotClass = 'bg-red-500';
      text = 'Damaged';
    } else if (state === 'RETURNED_TO_STOCK') {
      dotClass = 'bg-amber-500';
      text = 'Returned';
    } else if (state === 'RESERVED') {
      dotClass = 'bg-purple-600';
      text = 'Reserved';
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink font-mono">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span>{text}</span>
      </span>
    );
  };

  const totals = summary?.totals || {
    totalPhysicalTags: 0,
    assignedToVehicles: 0,
    inCommerceStock: 0,
    reservedInCheckout: 0,
  };

  const totalGenerated =
    summary?.serializedBySku?.reduce((sum, item) => sum + (item.generated || 0), 0) || 0;
  const totalSentToPrint =
    summary?.serializedBySku?.reduce((sum, item) => sum + (item.sentToPrint || 0), 0) || 0;
  const totalDamaged =
    summary?.serializedBySku?.reduce((sum, item) => sum + (item.damaged || 0), 0) || 0;

  return (
    <AdminLayout>
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded border border-border bg-surface shadow-md text-xs font-medium text-ink flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            Inventory &amp; Production
          </h1>
          <p className="text-xs text-muted mt-0.5 font-satoshi font-medium">
            Digital tags, print runs, receiving, stock levels, individual tag records and print profiles
          </p>
        </div>

        {/* Tactile Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'stock') fetchTags(true);
              else if (activeTab === 'packaging') fetchBulkStock();
              fetchSummary();
            }}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full border border-border hover:border-ink bg-surface flex items-center justify-center text-muted hover:text-ink active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() =>
              setStickerModal({
                isOpen: true,
                tagNumber: tags[0]?.tagNumber || 'ZQ3TYEW',
                qrUrl: tags[0] ? buildTagQrUrl(tags[0].tagNumber) : undefined,
                initialFormat: 'standard',
              })
            }
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface hover:bg-ink border border-ink/20 hover:border-ink text-ink hover:text-surface text-xs font-medium tracking-tight shadow-2xs hover:shadow-xs active:scale-[0.96] transition-all duration-150 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink group-hover:bg-accent transition-colors" />
            <span>Sticker Studio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBatchModalDefaultSku('TAG-VEHICLE-STICKER');
              setIsBatchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink hover:opacity-90 active:scale-95 text-surface text-xs font-medium tracking-wide shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Digital Tags</span>
          </button>
        </div>
      </div>

      {/* ── 2. Warehouse Stock Metrics Bar (5 Warehouse Lifecycle States) ── */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 py-2 border-y border-border/60">
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted tracking-wider uppercase font-medium block">
            Digital Unprinted
          </span>
          <span className="font-satoshi font-semibold text-xl sm:text-2xl text-purple-700 tracking-tight block">
            {totalGenerated.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted font-satoshi font-medium block">
            0 sellable until printed
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-muted tracking-wider uppercase font-medium block">
            At Print Vendor
          </span>
          <span className="font-satoshi font-semibold text-xl sm:text-2xl text-amber-600 tracking-tight block">
            {totalSentToPrint.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted font-satoshi font-medium block">
            In vendor production
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-muted tracking-wider uppercase font-medium block">
            Available Stock
          </span>
          <span className="font-satoshi font-semibold text-xl sm:text-2xl text-emerald-700 tracking-tight block">
            {totals.inCommerceStock.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted font-satoshi font-medium block">
            Sellable &amp; ready to pack
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-muted tracking-wider uppercase font-medium block">
            Checkout Reserved
          </span>
          <span className="font-satoshi font-semibold text-xl sm:text-2xl text-amber-600 tracking-tight block">
            {totals.reservedInCheckout.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted font-satoshi font-medium block">
            Temporary cart holds
          </span>
        </div>

        <div className="space-y-0.5 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-muted tracking-wider uppercase font-medium block">
            Damaged / Quarantine
          </span>
          <span className="font-satoshi font-semibold text-xl sm:text-2xl text-red-600 tracking-tight block">
            {totalDamaged.toLocaleString()}
          </span>
          <span className="text-[10px] text-muted font-satoshi font-medium block">
            Defective or rejected tags
          </span>
        </div>
      </div>

      {/* Operational Fleet & Cumulative Context (Separated from Warehouse Inventory) */}
      <div className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-bg/70 border border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span className="font-medium text-ink">Operational Fleet Assets:</span>
          <span className="font-mono font-semibold text-blue-700">
            {totals.assignedToVehicles.toLocaleString()} active on vehicles
          </span>
          <span className="text-muted text-[11px]">
            (active customer assets · not warehouse inventory)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted text-[11px] font-mono">
          <span>Lifetime Output:</span>
          <span className="font-semibold text-ink">
            {totals.totalPhysicalTags.toLocaleString()} tags generated
          </span>
        </div>
      </div>

      {/* 3. Text Tabs Navigation */}
      <div className="mt-6 flex items-center gap-6 border-b border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'overview' ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <span>Overview</span>
          {activeTab === 'overview' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'batches' ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <span>Print Runs</span>
          {activeTab === 'batches' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'stock' ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <span>Stocked Tags ({total > 0 ? total.toLocaleString() : tags.length})</span>
          {activeTab === 'stock' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'profiles' ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <span>Print Profiles</span>
          {activeTab === 'profiles' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('packaging')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'packaging' ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <span>Packaging Supplies ({bulkItems.length})</span>
          {activeTab === 'packaging' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB: OVERVIEW (SUPPLY-SIDE SUMMARY & STOCK ALERTS)         */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="mt-6 space-y-6">
          {/* Low Stock Warnings Banner if any SKU has low sellable stock */}
          {summary?.serializedBySku?.some((s) => (s.inStock ?? 0) <= 5) && (
            <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Low stock alert:</strong> One or more SKUs have 5 or fewer available sellable tags in warehouse inventory.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('batches')}
                className="font-semibold underline hover:opacity-80 shrink-0 cursor-pointer"
              >
                Create Print Run →
              </button>
            </div>
          )}

          {/* SKU Stock Levels & Lifecycle Summary Table */}
          <div className="border border-border rounded-lg bg-surface overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-border bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-satoshi">
                  Sellable Stock &amp; Manufacturing Funnel by SKU
                </h3>
                <p className="text-[11px] text-muted font-satoshi">
                  Physical warehouse stock, vendor manufacturing batches, and temporary checkout holds
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Available
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Vendor Print
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Unprinted
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-satoshi">
                <thead>
                  <tr className="border-b border-border bg-bg/30 text-muted font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 font-medium">Product SKU</th>
                    <th className="py-2.5 px-3 font-medium text-emerald-700">Available Stock</th>
                    <th className="py-2.5 px-3 font-medium text-amber-700">At Vendor Print</th>
                    <th className="py-2.5 px-3 font-medium text-purple-700">Digital Unprinted</th>
                    <th className="py-2.5 px-3 font-medium text-amber-600">Checkout Hold</th>
                    <th className="py-2.5 px-3 font-medium text-blue-600">Packing Allocated</th>
                    <th className="py-2.5 px-3 font-medium text-red-600">Damaged</th>
                    <th className="py-2.5 px-3 font-medium text-muted">Field Delivered</th>
                    <th className="py-2.5 px-4 font-medium text-right text-ink">Total Lifecycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {(!summary?.serializedBySku || summary.serializedBySku.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted font-satoshi text-xs">
                        No SKU stock summaries available. Generate tags or import inventory.
                      </td>
                    </tr>
                  ) : (
                    summary.serializedBySku.map((item) => {
                      const isLowStock = (item.inStock ?? 0) <= 5;
                      return (
                        <tr key={item.sku} className="hover:bg-bg/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-ink font-satoshi">
                            <div className="flex items-center gap-1.5">
                              <span>{item.sku}</span>
                              {isLowStock && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Low
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-emerald-700 font-mono">
                            <span className="text-sm">{item.inStock}</span>
                            <span className="text-[10px] text-muted font-sans ml-1">sellable</span>
                          </td>
                          <td className="py-3 px-3 text-amber-700 font-mono">
                            {item.sentToPrint ?? 0}
                          </td>
                          <td className="py-3 px-3 text-purple-700 font-mono">
                            {item.generated ?? 0}
                          </td>
                          <td className="py-3 px-3 text-amber-600 font-mono">
                            {item.reserved}
                          </td>
                          <td className="py-3 px-3 text-blue-600 font-mono">
                            {item.allocated}
                          </td>
                          <td className="py-3 px-3 text-red-600 font-mono">
                            {item.damaged}
                          </td>
                          <td className="py-3 px-3 text-muted font-mono">
                            {item.delivered}
                          </td>
                          <td className="py-3 px-4 font-bold text-ink text-right font-mono">
                            {item.total}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Production Workflows Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 text-ink font-semibold text-xs">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>1. Generate Digital Tokens</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Mint unique, cryptographically secure serialized tag numbers before assigning them to vendor print sheets.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBatchModalDefaultSku('TAG-VEHICLE-STICKER');
                  setIsBatchModalOpen(true);
                }}
                className="mt-1 text-xs text-ink font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Generate digital tokens →</span>
              </button>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 text-ink font-semibold text-xs">
                <Box className="w-4 h-4 text-amber-600" />
                <span>2. Print Runs &amp; Vendors</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Dispatch print jobs to printing vendors, export CSV manifests with dimensions, and record inward warehouse receiving.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('batches')}
                className="mt-1 text-xs text-ink font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Manage print runs →</span>
              </button>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 text-ink font-semibold text-xs">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>3. Stocked Tags &amp; Packaging</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Search individual tag records, inspect physical condition, update damage states, and track packaging supplies.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className="mt-1 text-xs text-ink font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect serialized tags →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: PRODUCTION PRINT RUNS & VENDOR BATCHES               */}
      {/* ========================================================= */}
      {activeTab === 'batches' && (
        <PrintBatchesSection
          serializedSummaries={summary?.serializedBySku || []}
          onRefreshInventory={() => {
            fetchSummary();
            fetchTags();
          }}
          showToast={showToast}
          onOpenBatchGenerator={(sku) => {
            if (sku) setBatchModalDefaultSku(sku);
            setIsBatchModalOpen(true);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* TAB: PHYSICAL PRINT PROFILES & DIMENSIONS                 */}
      {/* ========================================================= */}
      {activeTab === 'profiles' && (
        <PrintProfilesSection
          onRefreshInventory={() => {
            fetchSummary();
            fetchTags();
          }}
          showToast={showToast}
        />
      )}

      {/* ========================================================= */}
      {/* TAB 2: PRINTED QR STOCK                                   */}
      {/* ========================================================= */}
      {activeTab === 'stock' && (
        <div className="mt-6 space-y-4">
          {/* SKU Breakdown Table */}
          {summary?.serializedBySku && summary.serializedBySku.length > 0 && (
            <div className="border border-border rounded-lg bg-surface overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-bg/50 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink font-satoshi">
                  Serialized Stock Summary By SKU
                </span>
                <span className="text-[10px] text-muted font-mono">
                  Full Manufacturing Funnel
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-satoshi">
                  <thead>
                    <tr className="border-b border-border bg-bg/30 text-muted font-mono uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-4 font-medium">SKU</th>
                      <th className="py-2 px-3 font-medium text-purple-700">Digital Unprinted</th>
                      <th className="py-2 px-3 font-medium text-amber-700">At Vendor Print</th>
                      <th className="py-2 px-3 font-medium text-emerald-700">Sellable In Stock</th>
                      <th className="py-2 px-3 font-medium text-amber-600">Checkout Hold</th>
                      <th className="py-2 px-3 font-medium text-blue-600">Allocated</th>
                      <th className="py-2 px-3 font-medium text-teal-600">Delivered</th>
                      <th className="py-2 px-3 font-medium text-red-600">Damaged</th>
                      <th className="py-2 px-4 font-medium text-right text-ink">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                    {summary.serializedBySku.map((item) => (
                      <tr key={item.sku} className="hover:bg-bg/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-ink">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3 text-purple-700">
                          {item.generated ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-amber-700">
                          {item.sentToPrint ?? 0}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">
                          {item.inStock}
                        </td>
                        <td className="py-2.5 px-3 text-amber-600">
                          {item.reserved}
                        </td>
                        <td className="py-2.5 px-3 text-blue-600">
                          {item.allocated}
                        </td>
                        <td className="py-2.5 px-3 text-teal-600">
                          {item.delivered}
                        </td>
                        <td className="py-2.5 px-3 text-red-600">
                          {item.damaged}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-ink text-right">
                          {item.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Filters Bar: Clean Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative max-w-sm w-full">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tag number (e.g. ZQ3TYEW)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-ink placeholder:text-muted/60 font-mono focus:outline-none focus:border-ink"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={skuFilter}
                onChange={(e) => {
                  setSkuFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs font-mono text-ink focus:outline-none focus:border-ink"
              >
                <option value="ALL">All Products</option>
                <option value="TAG-VEHICLE-STICKER">Vehicle Stickers</option>
                <option value="TAG-KEYCHAIN">Metal Keychains</option>
                <option value="TAG-MINI-STICKER">Mini Stickers</option>
              </select>

              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-surface border border-border rounded text-xs font-mono text-ink focus:outline-none focus:border-ink"
              >
                {STOCK_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Table */}
          <div className="border border-border rounded-lg bg-surface overflow-hidden">
            {isLoading && tags.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-muted" />
                <p className="text-xs text-muted font-mono uppercase tracking-wider">
                  Loading stock...
                </p>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-2 p-6">
                <p className="text-xs text-danger font-medium">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchTags()}
                  className="px-3 py-1 rounded bg-ink text-surface text-xs font-medium cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : tags.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted font-mono">
                No printed QR tags found. Click &quot;Print Batch&quot; to generate stock.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Tag Number</th>
                      <th className="py-2.5 px-4 font-medium">Physical Item</th>
                      <th className="py-2.5 px-4 font-medium">Stock State</th>
                      <th className="py-2.5 px-4 font-medium">Assigned Resource</th>
                      <th className="py-2.5 px-4 font-medium">Updated</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tags.map((t) => (
                      <tr key={t.id} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-ink">
                          <div className="flex items-center gap-1.5">
                            <span>{t.tagNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(t.tagNumber, `tag-${t.id}`)}
                              className="text-muted hover:text-ink p-0.5 rounded cursor-pointer"
                              title="Copy Tag Number"
                            >
                              {copiedId === `tag-${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-ink">
                          {getItemName(t.sku)}
                        </td>

                        <td className="py-3 px-4">{renderStatusDot(t.stockState)}</td>

                        <td className="py-3 px-4">
                          {t.assignedVehicle ? (
                            <span className="text-ink">
                              {t.assignedVehicle.name || 'Vehicle'}
                              {t.assignedVehicle.registrationNum && (
                                <span className="text-muted font-mono ml-1">
                                  ({t.assignedVehicle.registrationNum})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted font-mono">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-muted text-[11px]">
                          {new Date(t.updatedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setStateChangeTag(t);
                                setNextState(
                                  t.stockState === 'DAMAGED' ? 'IN_STOCK' : 'DAMAGED'
                                );
                                setStateReason('');
                              }}
                              className="px-2 py-1 rounded border border-border bg-surface hover:border-ink text-ink text-[11px] font-medium cursor-pointer"
                            >
                              Change State
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setStickerModal({
                                  isOpen: true,
                                  tagNumber: t.tagNumber,
                                  qrUrl: buildTagQrUrl(t.tagNumber),
                                  initialFormat: t.sku.includes('MINI') ? 'mini' : 'standard',
                                })
                              }
                              className="px-2 py-1 rounded border border-border bg-surface hover:border-ink text-muted hover:text-ink text-[11px] font-medium cursor-pointer"
                            >
                              Sticker
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted font-mono">
                Page {page} of {totalPages} ({total} tags)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-border text-ink disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded border border-border text-ink disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PACKAGING SUPPLIES                                 */}
      {/* ========================================================= */}
      {activeTab === 'packaging' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Packaging Materials</h2>
              <p className="text-xs text-muted">
                Boxes, padded envelopes, and security tape stock
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBulkEditItem(null);
                setIsBulkModalOpen(true);
              }}
              className="px-3 py-1.5 rounded bg-ink text-surface text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Supply</span>
            </button>
          </div>

          <div className="border border-border rounded-lg bg-surface overflow-hidden">
            {isBulkLoading ? (
              <div className="py-16 text-center text-xs text-muted font-mono">
                Loading supplies...
              </div>
            ) : bulkItems.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted font-mono">
                No packaging supply records tracked yet. Click &quot;Add Supply&quot; to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-4 font-medium">Supply Code</th>
                      <th className="py-2.5 px-4 font-medium">Name</th>
                      <th className="py-2.5 px-4 font-medium">On Hand</th>
                      <th className="py-2.5 px-4 font-medium">Reserved</th>
                      <th className="py-2.5 px-4 font-medium">Available</th>
                      <th className="py-2.5 px-4 font-medium">Alert Level</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {bulkItems.map((item) => (
                      <tr key={item.sku} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-ink">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-ink">
                          {item.quantityOnHand}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted">
                          {item.reservedCount}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-ink">
                          {item.availableCount}
                        </td>
                        <td className="py-3 px-4">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              <span>Low ({item.reorderLevel})</span>
                            </span>
                          ) : (
                            <span className="text-muted font-mono text-[11px]">
                              level: {item.reorderLevel}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkEditItem(item);
                              setIsBulkModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded border border-border bg-surface hover:border-ink text-ink text-xs font-medium cursor-pointer"
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

      {/* ========================================================= */}
      {/* MODAL: CHANGE TAG STOCK STATE                             */}
      {/* ========================================================= */}
      {stateChangeTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">Update Tag Status</h3>
                <p className="font-mono text-[11px] text-muted">
                  Tag #{stateChangeTag.tagNumber} ({getItemName(stateChangeTag.sku)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStateChangeTag(null)}
                className="text-muted hover:text-ink p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStateUpdateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">New Status *</label>
                <select
                  value={nextState}
                  onChange={(e) => setNextState(e.target.value as TagStockState)}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none"
                >
                  <option value="DAMAGED">DAMAGED (Defect, scratch, revoked)</option>
                  <option value="IN_STOCK">IN_STOCK (Ready to pack)</option>
                  <option value="ALLOCATED_TO_ORDER">ALLOCATED_TO_ORDER (Packing)</option>
                  <option value="DISPATCHED">DISPATCHED (Shipped)</option>
                  <option value="DELIVERED">DELIVERED (Customer received)</option>
                  <option value="RETURNED_TO_STOCK">RETURNED_TO_STOCK (Returned)</option>
                  <option value="RESERVED">RESERVED (Checkout hold)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={stateReason}
                  onChange={(e) => setStateReason(e.target.value)}
                  placeholder="e.g. Scratched during shipment"
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStateChangeTag(null)}
                  disabled={isUpdatingState}
                  className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingState}
                  className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingState ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BATCH GENERATE PHYSICAL QR TAGS (PRINT SHOP BATCH) */}
      {/* ========================================================= */}
      {isBatchModalOpen && (
        <BatchGenerateSkuModal
          defaultSku={batchModalDefaultSku || (skuFilter !== 'ALL' ? skuFilter : 'TAG-VEHICLE-STICKER')}
          onClose={() => setIsBatchModalOpen(false)}
          onSuccess={() => {
            setIsBatchModalOpen(false);
            showToast('Digital tags generated in state GENERATED (ready for print run)!');
            fetchSummary();
            fetchTags();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: BULK PACKAGING RESTOCK / CREATE                    */}
      {/* ========================================================= */}
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
            showToast('Packaging stock updated!');
            fetchBulkStock();
            fetchSummary();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: STICKER STUDIO / PRINT VIEWER                      */}
      {/* ========================================================= */}
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
// Batch Generate Modal (Clean, Minimalist)
// =========================================================================
interface BatchGenerateSkuModalProps {
  defaultSku?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchGenerateSkuModal: React.FC<BatchGenerateSkuModalProps> = ({
  defaultSku,
  onClose,
  onSuccess,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>(
    defaultSku || 'TAG-VEHICLE-STICKER'
  );
  const [quantity, setQuantity] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

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
      const res = await adminApi.batchGenerateInventoryTags(
        {
          sku: selectedProduct.trim().toUpperCase(),
          quantity: Number(quantity),
        },
        idempotencyKey
      );

      const payload = res?.data || res;
      setResult(payload);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Batch generation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCsv = () => {
    const items = result?.items || [];
    if (!items.length) return;
    const headers = ['Tag Number', 'Token', 'Public QR URL'];
    const rows = items.map((item: any) => [
      item.tagNumber,
      item.token,
      item.qrUrl || buildTagQrUrl(item.tagNumber),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any[]) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kauntact_print_batch_${selectedProduct}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink font-satoshi">Digital Tag Generation (Unprinted Stock)</h3>
            <p className="text-[11px] text-muted font-satoshi">Generates cryptographic QR tokens in state: GENERATED</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-satoshi">
          {error && (
            <div className="p-2.5 rounded border border-border bg-surface text-danger flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded border border-border bg-bg space-y-1">
                <p className="font-semibold text-ink">
                  {result.count || quantity} Tags Generated
                </p>
                <p className="text-muted text-[11px] leading-relaxed">
                  Stored as unprinted digital tokens (<span className="font-mono text-purple-700 font-semibold">state: GENERATED</span>). Storefront sellable inventory remains 0 until dispatched in a production print run and received at the warehouse.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-3.5 py-1.5 rounded bg-ink text-surface text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded border border-border hover:border-ink text-xs font-medium cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium text-ink mb-1">Physical Item *</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink text-xs font-mono focus:border-ink focus:outline-none"
                >
                  <option value="TAG-VEHICLE-STICKER">Vehicle QR Sticker</option>
                  <option value="TAG-KEYCHAIN">Metal QR Keychain</option>
                  <option value="TAG-MINI-STICKER">Mini QR Sticker</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">
                  Quantity * (1 - 5,000)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[50, 100, 250, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
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
                  className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Generate Batch'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// Bulk Stock Modal Component (Boxes, Supplies)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            {initialItem ? `Adjust Stock: ${initialItem.name}` : 'Add / Restock Packaging'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && <div className="p-2.5 rounded border border-border text-danger">{error}</div>}

          <div>
            <label className="block font-medium text-ink mb-1">Item Code (SKU) *</label>
            <input
              type="text"
              required
              disabled={!!initialItem}
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. BOX-PACK-BIKE"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-medium text-ink mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Packaging Box"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink mb-1">Quantity Adjustment</label>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+500"
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
              />
              <span className="text-[10px] text-muted mt-0.5 block">Use negative to deduct</span>
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">Reorder Level</label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
