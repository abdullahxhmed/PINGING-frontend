import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminOrder,
  PackingStatusData,
} from '../../types/admin';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  QrCode,
  ArrowLeft,
  Camera,
} from 'lucide-react';
import { getLiveAddons, getLiveProducts, getProductThumbnail, DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
import { useStoreCatalog } from '../../features/store/useStoreCatalog';
import { WarehouseQrScanner, extractCleanTagId } from '../../components/admin/WarehouseQrScanner';

// ==========================================
// Authentic Retail / Warehouse Scanner Audio Synthesizer
// ==========================================
function playAudioFeedback(
  type: 'success' | 'scan' | 'error' | 'duplicate' | 'complete',
  muted: boolean = false
) {
  if (muted) return;
  // Only play sound on scan detection / allocation. No sound on error, duplicate, or completion for now.
  if (type !== 'success' && type !== 'scan') {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 860 Hz square wave 50ms scanner beep
    osc.type = 'square';
    osc.frequency.setValueAtTime(860, t);

    // Snappy 50ms envelope: 3ms attack, 42ms sustain, 5ms release to avoid clicks
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.003);
    gain.gain.setValueAtTime(0.2, t + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  } catch {
    // AudioContext may require prior user interaction
  }
}

type QueueTab = 'TO_PACK' | 'PACKING' | 'READY_TO_SHIP' | 'SHIPPED' | 'EXCEPTIONS' | 'ALL';

export const AdminFulfillmentPage: React.FC = () => {
  useStoreCatalog();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQueueTab, setActiveQueueTab] = useState<QueueTab>('TO_PACK');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Active packing session order ID
  const [activePackingOrderId, setActivePackingOrderId] = useState<string | null>(null);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOrders({ limit: 100 });
      const payload = (res as any)?.data || res;
      setOrders(payload.orders || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warehouse fulfillment orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Time elapsed helper
  const getTimeElapsed = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  // Summary counts
  const waitingToPackCount = orders.filter((o) => o.status === 'PAID').length;
  const packingCount = orders.filter((o) => o.status === 'PACKING').length;
  const readyToShipCount = orders.filter((o) => o.status === 'PACKED').length;
  const exceptionsCount = orders.filter((o) =>
    o.status === 'PAYMENT_PENDING' ||
    o.status === 'RECONCILIATION_REQUIRED' ||
    o.status === 'CANCELLED' ||
    o.status === 'REFUNDED'
  ).length;

  // Filtered orders according to Tab & Sorting
  const getFilteredOrders = () => {
    let list = [...orders];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((o) => {
        const orderNum = o.orderNumber?.toLowerCase() || '';
        const name = o.shippingAddress?.fullName?.toLowerCase() || o.user?.name?.toLowerCase() || '';
        const phone = o.customerPhone || o.shippingAddress?.phoneNumber || '';
        const city = o.shippingAddress?.city?.toLowerCase() || '';
        return orderNum.includes(term) || name.includes(term) || phone.includes(term) || city.includes(term);
      });
    }

    if (activeQueueTab === 'TO_PACK') {
      // FIFO: Paid orders only, ordered oldest first
      list = list.filter((o) => o.status === 'PAID');
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (activeQueueTab === 'PACKING') {
      // Packing currently active
      list = list.filter((o) => o.status === 'PACKING');
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (activeQueueTab === 'READY_TO_SHIP') {
      list = list.filter((o) => o.status === 'PACKED');
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    } else if (activeQueueTab === 'SHIPPED') {
      list = list.filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED');
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    } else if (activeQueueTab === 'EXCEPTIONS') {
      list = list.filter((o) =>
        o.status === 'PAYMENT_PENDING' ||
        o.status === 'RECONCILIATION_REQUIRED' ||
        o.status === 'CANCELLED' ||
        o.status === 'REFUNDED'
      );
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // ALL
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  };

  const filteredOrders = getFilteredOrders();
  const activeOrder = orders.find((o) => o.id === activePackingOrderId) || null;

  // Dedicated Mobile-First Full-Screen Packing Workspace (Replaces nested modal)
  if (activeOrder) {
    return (
      <PackingWorkspace
        order={activeOrder}
        onClose={() => {
          setActivePackingOrderId(null);
          loadOrders();
        }}
        audioMuted={audioMuted}
        onToggleMute={() => setAudioMuted((m) => !m)}
        onCompleted={() => {
          loadOrders();
        }}
      />
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 w-full">
        {/* ── 1. Flush Header (System-Wide Admin Theme) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Fulfillment
            </h1>
            <p className="text-xs text-muted mt-0.5 font-satoshi font-medium">
              Pick-to-scan packing queue and serialized tag allocation
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle: System-wide secondary button */}
            <button
              type="button"
              onClick={() => setAudioMuted(!audioMuted)}
              className="btn btn-secondary !min-h-[34px] !py-0 !px-2.5 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title={audioMuted ? 'Unmute scan audio' : 'Mute scan audio'}
              aria-label={audioMuted ? 'Unmute scan audio' : 'Mute scan audio'}
            >
              {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-muted" /> : <Volume2 className="w-3.5 h-3.5 text-ink" />}
              <span className="hidden sm:inline font-satoshi">{audioMuted ? 'Muted' : 'Audio'}</span>
            </button>

            {/* Refresh Queue: System-wide secondary button */}
            <button
              type="button"
              onClick={() => loadOrders()}
              disabled={isLoading}
              className="btn btn-secondary !min-h-[34px] !py-0 !px-3 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline font-satoshi">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 2. Compact Summary: Deliberate 2-col on narrow, 1-row on desktop ── */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 gap-y-1.5 py-1.5 text-xs text-muted font-satoshi border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-muted">Waiting to pack</span>
            <span className="font-mono text-ink font-semibold">{waitingToPackCount}</span>
          </div>
          <span className="text-border select-none hidden sm:inline">·</span>
          <div className="flex items-center gap-2">
            <span className={packingCount > 0 ? 'text-blue-700 font-medium' : 'text-muted'}>Packing</span>
            <span className="font-mono text-ink font-semibold">{packingCount}</span>
          </div>
          <span className="text-border select-none hidden sm:inline">·</span>
          <div className="flex items-center gap-2">
            <span className="text-muted">Ready to ship</span>
            <span className="font-mono text-ink font-semibold">{readyToShipCount}</span>
          </div>
          <span className="text-border select-none hidden sm:inline">·</span>
          <button
            type="button"
            onClick={() => setActiveQueueTab('EXCEPTIONS')}
            className={`flex items-center gap-2 text-left cursor-pointer transition-colors ${
              exceptionsCount > 0
                ? activeQueueTab === 'EXCEPTIONS'
                  ? 'text-amber-900 font-bold'
                  : 'text-amber-800 hover:text-amber-900 font-medium'
                : 'text-muted hover:text-ink'
            }`}
          >
            <span>Exceptions</span>
            <span className="font-mono font-semibold">{exceptionsCount}</span>
          </button>
        </div>

        {/* ── 3. Compact Toolbar: Horizontally Scrollable Tabs + Search ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
          {/* Horizontally scrollable Queue Tab Buttons with no clipped labels */}
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-surface text-xs font-mono overflow-x-auto shrink-0 max-w-full">
            <button
              type="button"
              onClick={() => setActiveQueueTab('TO_PACK')}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeQueueTab === 'TO_PACK'
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:text-ink'
              }`}
            >
              To pack ({waitingToPackCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('PACKING')}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeQueueTab === 'PACKING'
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Packing {packingCount > 0 ? `(${packingCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('READY_TO_SHIP')}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeQueueTab === 'READY_TO_SHIP'
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Ready to ship ({readyToShipCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveQueueTab('SHIPPED')}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeQueueTab === 'SHIPPED'
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Shipped
            </button>
            {exceptionsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveQueueTab('EXCEPTIONS')}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  activeQueueTab === 'EXCEPTIONS'
                    ? 'bg-amber-800 text-white'
                    : 'text-amber-800 hover:text-amber-900'
                }`}
              >
                Exceptions ({exceptionsCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveQueueTab('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeQueueTab === 'ALL'
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:text-ink'
              }`}
            >
              All
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1 text-xs rounded bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:border-ink font-mono"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Muted FIFO Rule Note */}
        {activeQueueTab === 'TO_PACK' && (
          <p className="text-[11px] text-muted font-mono">
            Orders sorted oldest first (FIFO). Pick and pack from the top down.
          </p>
        )}

        {/* ── 4. Error Display (System Theme) ── */}
        {error && (
          <div className="my-2 p-3 border-y border-red-500/30 text-xs text-danger font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadOrders()}
              className="underline font-bold uppercase tracking-wider text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 5. Simplified Order Queue: 3 Compact Sections ── */}
        {isLoading && orders.length === 0 ? (
          <div className="py-20 text-center text-muted font-satoshi space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-ink" />
            <p className="text-xs">Loading fulfillment queue...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center border border-border rounded bg-surface p-6 space-y-1 font-satoshi">
            <p className="text-sm font-semibold text-ink">No orders in this queue</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {activeQueueTab === 'TO_PACK'
                ? 'All paid orders have been packed.'
                : activeQueueTab === 'EXCEPTIONS'
                ? 'No fulfillment exceptions currently logged.'
                : 'No matching orders found for this filter.'}
            </p>
          </div>
        ) : (
          <div className="border-y border-border divide-y divide-border bg-surface">
            {filteredOrders.map((order) => {
              const isPacking = order.status === 'PACKING';
              const isPacked = order.status === 'PACKED';
              const isPaid = order.status === 'PAID';
              const itemsCount = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1;
              const primaryVariant = order.items?.[0]?.variantName || 'Tag Pack';
              const elapsed = getTimeElapsed(order.createdAt);
              const addr = order.shippingAddress;
              const customerName = addr?.fullName || order.user?.name || 'Customer';
              const phone = order.customerPhone || addr?.phoneNumber;
              const location = [addr?.city, addr?.state].filter(Boolean).join(', ');

              return (
                <div
                  key={order.id}
                  className="p-3 sm:py-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 hover:bg-neutral-50/60 transition-colors"
                >
                  {/* Left Block: 3 Structured Sections */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Section 1: Order ID on left, subtle Payment Status on right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 font-mono text-xs font-semibold text-ink">
                        <span>{order.orderNumber}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(order.orderNumber, order.id, e)}
                          className="p-0.5 text-muted hover:text-ink cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedId === order.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted/40 hover:text-ink" />
                          )}
                        </button>
                      </div>

                      {/* Subtle Secondary Payment/Order State Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                          isPaid
                            ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                            : isPacking
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isPacked
                            ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                            : order.status === 'SHIPPED'
                            ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {order.status === 'PAID' ? 'Paid' : order.status === 'PACKING' ? 'Packing' : order.status === 'PACKED' ? 'Packed' : order.status}
                      </span>
                    </div>

                    {/* Section 2: Customer Name · Phone, followed by City, State wrapping cleanly */}
                    <div className="text-xs text-ink leading-normal">
                      <div>
                        <span className="font-medium">{customerName}</span>
                        {phone && <span className="text-muted font-mono ml-2 font-normal">{phone}</span>}
                        {location && <span className="text-muted ml-2 hidden sm:inline">· {location}</span>}
                      </div>
                      {location && (
                        <div className="text-muted text-[11px] sm:hidden mt-0.5">
                          {location}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Product Name, Amount, Time Elapsed */}
                    <div className="text-[11px] text-muted flex flex-wrap items-center gap-x-2 pt-0.5">
                      <span className="text-ink font-medium">
                        {primaryVariant} {itemsCount > 1 ? `× ${itemsCount}` : ''}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-ink">
                        ₹{Math.round(order.totalAmount / 100)}
                      </span>
                      {elapsed && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{elapsed}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Action: Single Contextual Action Button with reduced height on mobile */}
                  <div className="mt-1 sm:mt-0 sm:self-center shrink-0 w-full sm:w-auto">
                    {isPacking ? (
                      <button
                        type="button"
                        onClick={() => setActivePackingOrderId(order.id)}
                        className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors text-center"
                      >
                        Resume packing →
                      </button>
                    ) : isPaid ? (
                      <button
                        type="button"
                        onClick={() => setActivePackingOrderId(order.id)}
                        className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded bg-ink hover:opacity-90 text-surface text-xs font-medium cursor-pointer transition-opacity text-center"
                      >
                        Start packing →
                      </button>
                    ) : isPacked ? (
                      <button
                        type="button"
                        onClick={() => setActivePackingOrderId(order.id)}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded border border-border bg-surface hover:bg-neutral-100 text-ink text-xs font-medium cursor-pointer transition-colors text-center"
                      >
                        Create shipment →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActivePackingOrderId(order.id)}
                        className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded border border-border bg-surface hover:bg-neutral-100 text-muted hover:text-ink text-xs font-medium cursor-pointer transition-colors text-center"
                      >
                        View manifest →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

// =========================================================================
// Physical Fulfillment Models & Requirement Builder
// =========================================================================

export interface PhysicalFulfillmentRequirement {
  id: string;
  sku: string;
  componentName: string;
  productName: string;
  variantName: string;
  image: string;
  requiredQty: number;
  confirmedQty: number;
  remainingQty: number;
  isComplete: boolean;
  isBundleComponent: boolean;
  bundleName?: string;
  bundleQuantity?: number;
}

export interface FulfillmentBundleGroup {
  id: string;
  bundleName: string;
  bundleVariant: string;
  bundleImage: string;
  bundleQuantity: number;
  requirements: PhysicalFulfillmentRequirement[];
}

export interface PhysicalFulfillmentPlan {
  bundles: FulfillmentBundleGroup[];
  standaloneRequirements: PhysicalFulfillmentRequirement[];
  allRequirements: PhysicalFulfillmentRequirement[];
  totalRequired: number;
  totalConfirmed: number;
  remainingCount: number;
  isComplete: boolean;
}

/**
 * Resolves individual product artwork for components and standalone items.
 * Prioritizes live dynamic catalog by variant SKU and component name so individual
 * components display their own real photos rather than the parent bundle image.
 */
function resolveRequirementImage(
  name: string,
  sku?: string,
  variantFinish?: string,
  fallbackImage?: string | null,
  isBundleComponent: boolean = false
): string {
  const upperSku = (sku || '').toUpperCase().trim();
  const cleanName = (name || '').toLowerCase().trim();
  const finish = (variantFinish || '').toLowerCase().trim();

  const isDark =
    upperSku.includes('DRK') ||
    upperSku.includes('DARK') ||
    cleanName.includes('dark') ||
    finish.includes('dark');
  const targetTone = isDark ? 'dark' : 'light';

  // 1. Authoritative: Match against backend live products and variants by exact SKU
  const products = getLiveProducts();
  if (upperSku && products && products.length > 0) {
    for (const prod of products) {
      if (prod.variants && prod.variants.length > 0) {
        for (const v of prod.variants) {
          if (v.sku && v.sku.toUpperCase().trim() === upperSku) {
            if (v.imageUrl && (v.imageUrl.startsWith('http') || v.imageUrl.startsWith('data:'))) {
              return v.imageUrl;
            }
          }
        }
      }
      if (prod.sku && prod.sku.toUpperCase().trim() === upperSku) {
        if (prod.imageUrl && (prod.imageUrl.startsWith('http') || prod.imageUrl.startsWith('data:'))) {
          return prod.imageUrl;
        }
      }
    }
  }

  // 2. Match against live dynamic add-ons by exact SKU
  const addons = getLiveAddons();
  if (upperSku && addons) {
    for (const addon of Object.values(addons)) {
      if (addon.sku && addon.sku.toUpperCase().trim() === upperSku) {
        if (addon.image && (addon.image.startsWith('http') || addon.image.startsWith('data:'))) {
          return addon.image;
        }
      }
    }
  }

  // 3. Match against backend live products by component product type / keyword + tone
  if (products && products.length > 0) {
    for (const prod of products) {
      const pName = prod.name.toLowerCase();
      const pType = (prod.type || '').toUpperCase();
      const matches =
        (cleanName.includes('keychain') && (pName.includes('keychain') || pType === 'KEYCHAIN')) ||
        (cleanName.includes('vehicle') && (pName.includes('vehicle') || pType === 'VEHICLE_STICKER')) ||
        (cleanName.includes('mini') && (pName.includes('mini') || pType === 'MINI_STICKER'));

      if (matches) {
        if (prod.variants && prod.variants.length > 0) {
          const matchedVariant =
            prod.variants.find((v) =>
              targetTone === 'dark'
                ? v.name?.toLowerCase().includes('dark') || v.sku?.toLowerCase().includes('drk')
                : v.name?.toLowerCase().includes('light') || v.sku?.toLowerCase().includes('lit')
            ) || prod.variants[0];

          if (
            matchedVariant?.imageUrl &&
            (matchedVariant.imageUrl.startsWith('http') || matchedVariant.imageUrl.startsWith('data:'))
          ) {
            return matchedVariant.imageUrl;
          }
        }
        if (prod.imageUrl && (prod.imageUrl.startsWith('http') || prod.imageUrl.startsWith('data:'))) {
          return prod.imageUrl;
        }
      }
    }
  }

  // 4. Tone / keyword matching from live dynamic add-ons
  if (addons) {
    for (const addon of Object.values(addons)) {
      const aName = addon.name.toLowerCase();
      const matchesType =
        (cleanName.includes('keychain') && aName.includes('keychain')) ||
        (cleanName.includes('vehicle') && aName.includes('vehicle')) ||
        (cleanName.includes('mini') && aName.includes('mini'));
      if (matchesType && addon.tone === targetTone && addon.image) {
        return addon.image;
      }
    }
  }

  // 5. Try getProductThumbnail directly by component name (WITHOUT parent bundle fallbackImage)
  const thumb = getProductThumbnail(name);
  if (thumb && thumb !== DEFAULT_PRODUCT_IMAGE) {
    return thumb;
  }

  // 6. If it is NOT a bundle component (e.g. standalone item), fallback to item image
  if (
    !isBundleComponent &&
    fallbackImage &&
    (fallbackImage.startsWith('http://') ||
      fallbackImage.startsWith('https://') ||
      fallbackImage.startsWith('data:'))
  ) {
    return fallbackImage;
  }

  // 7. Last resort fallback
  return fallbackImage && !isBundleComponent ? fallbackImage : DEFAULT_PRODUCT_IMAGE;
}

/**
 * Expands bundles into actual physical fulfillment components.
 * Renders ONLY components requiring serialized QR-tag allocation (componentType === 'SERIALIZED_QR_TAG').
 * Reconciles quantities with bundle multipliers without hardcoding.
 * Matches confirmed quantities authoritatively from backend skuProgress.
 */
function computePhysicalFulfillmentPlan(
  order: AdminOrder,
  packingData: PackingStatusData | null
): PhysicalFulfillmentPlan {
  const bundles: FulfillmentBundleGroup[] = [];
  const standaloneRequirements: PhysicalFulfillmentRequirement[] = [];

  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      const itemQty = item.quantity || 1;
      const snapshot = item.productSnapshot;

      const productName = item.productName || snapshot?.product?.name || item.name || 'Product';
      const variantName = item.variantName || snapshot?.variant?.name || 'Standard';
      const parentImg = item.imageUrl || snapshot?.variant?.imageUrl || snapshot?.product?.imageUrl || null;

      // Filter strictly: ONLY SERIALIZED_QR_TAG components with an inventorySku!
      // Packaging, memberships, or non-serialized accessories are NOT treated as QR requirements.
      const serializedComponents = (snapshot?.components || []).filter(
        (c: any) => c.componentType === 'SERIALIZED_QR_TAG' && Boolean(c.inventorySku)
      );

      if (serializedComponents.length > 0) {
        const isBundle = serializedComponents.length > 1 || snapshot?.product?.type === 'PHYSICAL_TAG_PACK';
        const bundleReqs: PhysicalFulfillmentRequirement[] = [];

        for (const comp of serializedComponents) {
          const compSku = comp.inventorySku!.trim();
          const reqQty = (comp.quantity || 1) * itemQty;
          const compImg = resolveRequirementImage(comp.name, compSku, variantName, parentImg, isBundle);

          const req: PhysicalFulfillmentRequirement = {
            id: `${item.id}-${compSku}`,
            sku: compSku,
            componentName: comp.name, // Authoritative name from snapshot
            productName,
            variantName,
            image: compImg,
            requiredQty: reqQty,
            confirmedQty: 0,
            remainingQty: reqQty,
            isComplete: false,
            isBundleComponent: isBundle,
            bundleName: isBundle ? productName : undefined,
            bundleQuantity: isBundle ? itemQty : undefined,
          };

          if (isBundle) {
            bundleReqs.push(req);
          } else {
            standaloneRequirements.push(req);
          }
        }

        if (isBundle && bundleReqs.length > 0) {
          bundles.push({
            id: item.id,
            bundleName: productName,
            bundleVariant: variantName,
            bundleImage: parentImg || DEFAULT_PRODUCT_IMAGE,
            bundleQuantity: itemQty,
            requirements: bundleReqs,
          });
        }
      } else {
        // Standalone physical item without snapshot components
        const itemSku = (snapshot?.variant?.sku || item.variant?.sku || 'TAG-STD').trim();
        const reqQty = itemQty;
        const itemImg = resolveRequirementImage(productName, itemSku, variantName, parentImg, false);

        standaloneRequirements.push({
          id: item.id,
          sku: itemSku,
          componentName: productName,
          productName,
          variantName,
          image: itemImg,
          requiredQty: reqQty,
          confirmedQty: 0,
          remainingQty: reqQty,
          isComplete: false,
          isBundleComponent: false,
        });
      }
    }
  }

  // Fallback if no order items resulted in physical products
  if (bundles.length === 0 && standaloneRequirements.length === 0) {
    standaloneRequirements.push({
      id: 'fallback-req',
      sku: 'TAG-STD',
      componentName: order.items?.[0]?.productName || 'Physical QR Tag',
      productName: order.items?.[0]?.productName || 'Physical QR Tag',
      variantName: order.items?.[0]?.variantName || 'Standard',
      image: DEFAULT_PRODUCT_IMAGE,
      requiredQty: 1,
      confirmedQty: 0,
      remainingQty: 1,
      isComplete: false,
      isBundleComponent: false,
    });
  }

  const allRequirements = [
    ...bundles.flatMap((b) => b.requirements),
    ...standaloneRequirements,
  ];

  // Distribute authoritative backend progress strictly from packingData.skuProgress
  const backendSkuMap = new Map<string, number>();
  if (packingData?.skuProgress && packingData.skuProgress.length > 0) {
    for (const sp of packingData.skuProgress) {
      backendSkuMap.set(sp.sku.toUpperCase(), sp.scanned);
    }
  }

  const assignedPerSku = new Map<string, number>();

  for (const req of allRequirements) {
    const upperSku = req.sku.toUpperCase();
    const totalBackendScannedForSku = backendSkuMap.get(upperSku) || 0;
    const alreadyAssigned = assignedPerSku.get(upperSku) || 0;
    const availableToAssign = Math.max(0, totalBackendScannedForSku - alreadyAssigned);

    const confirmed = Math.min(req.requiredQty, availableToAssign);
    req.confirmedQty = confirmed;
    req.remainingQty = Math.max(0, req.requiredQty - confirmed);
    req.isComplete = req.confirmedQty >= req.requiredQty;

    assignedPerSku.set(upperSku, alreadyAssigned + confirmed);
  }

  const calculatedReq = allRequirements.reduce((sum, r) => sum + r.requiredQty, 0);
  const totalRequired = packingData?.totalRequired ?? calculatedReq;
  const totalConfirmed = packingData?.totalScanned ?? allRequirements.reduce((sum, r) => sum + r.confirmedQty, 0);
  const remainingCount = Math.max(0, totalRequired - totalConfirmed);
  const isComplete = (packingData?.isComplete ?? (totalConfirmed >= totalRequired)) && totalRequired > 0;

  return {
    bundles,
    standaloneRequirements,
    allRequirements,
    totalRequired,
    totalConfirmed,
    remainingCount,
    isComplete,
  };
}

// =========================================================================
// Dedicated Full-Screen Packing Workspace (Clean System Theme)
// =========================================================================

interface PackingWorkspaceProps {
  order: AdminOrder;
  onClose: () => void;
  audioMuted: boolean;
  onToggleMute: () => void;
  onCompleted: () => void;
}

const PackingWorkspace: React.FC<PackingWorkspaceProps> = ({
  order,
  onClose,
  audioMuted,
  onToggleMute,
  onCompleted,
}) => {
  useStoreCatalog();
  const [packingData, setPackingData] = useState<PackingStatusData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pendingScanTag, setPendingScanTag] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Damaged exterior packaging');
  const [isManifestFinalized, setIsManifestFinalized] = useState(order.status === 'PACKED');
  const [copied, setCopied] = useState(false);

  // Authoritative physical tags allocated to this session
  const [currentSessionTags, setCurrentSessionTags] = useState<
    Array<{ tagNumber: string; sku?: string; scannedAt: string }>
  >([]);

  // Auto-dismiss contextual error after 5s
  useEffect(() => {
    if (!errorFeedback) return;
    const timer = setTimeout(() => setErrorFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [errorFeedback]);

  // Fetch status authoritatively from backend
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPackingStatus(order.id);
      const data = res.data;
      setPackingData(data);
      if (data.activeSessionId) {
        setSessionId(data.activeSessionId);
      }
      if (data.scannedTags && data.scannedTags.length > 0) {
        setCurrentSessionTags(
          data.scannedTags.map((t) => ({
            tagNumber: t.tagNumber,
            sku: t.sku,
            scannedAt: t.scannedAt,
          }))
        );
      } else {
        setCurrentSessionTags([]);
      }
      if (data.orderStatus === 'PACKED' || order.status === 'PACKED') {
        setIsManifestFinalized(true);
      }
    } catch {
      // Order has no active packing session yet - strictly 0 scans
      setPackingData({
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        activeSessionId: null,
        sessionStatus: null,
        sessionNumber: 1,
        packedBy: null,
        totalRequired: order.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1,
        totalScanned: 0,
        isComplete: false,
        skuProgress: [],
        scannedTags: [],
      });
      setCurrentSessionTags([]);
    } finally {
      setIsLoading(false);
    }
  }, [order.id, order.orderNumber, order.status, order.items]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Start packing session
  const handleStartSession = async () => {
    setIsLoading(true);
    setErrorFeedback(null);
    try {
      const res = await adminApi.startPackingSession(order.id, 'warehouse_operator');
      const newSessionId = res?.data?.id || (res as any)?.id;
      if (newSessionId) {
        setSessionId(newSessionId);
      }
      playAudioFeedback('success', audioMuted);
      await fetchStatus();
      setIsScannerOpen(true);
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to start packing session');
      playAudioFeedback('error', audioMuted);
    } finally {
      setIsLoading(false);
    }
  };

  // Triggered on detection (camera or manual) to prompt confirmation
  const handlePromptScan = useCallback(
    (rawCode: string) => {
      const code = extractCleanTagId(rawCode);
      if (!code) return;

      if (!sessionId) {
        setErrorFeedback('Please start a packing session first.');
        return;
      }

      // Check if already in current session to prevent duplicate calls
      if (currentSessionTags.some((t) => t.tagNumber === code)) {
        setErrorFeedback(`Tag ${code} was already scanned for this order.`);
        playAudioFeedback('duplicate', audioMuted);
        return;
      }

      playAudioFeedback('scan', audioMuted);
      setPendingScanTag(code);
    },
    [sessionId, currentSessionTags, audioMuted]
  );

  // Confirms adding the tag to the order and updates inventory/allocations immediately
  const handleConfirmScan = useCallback(
    async (codeToConfirm: string) => {
      if (!sessionId || !codeToConfirm || isAllocating) return;

      setIsAllocating(true);
      setErrorFeedback(null);

      try {
        const res = await adminApi.scanPackingTag(order.id, {
          sessionId,
          scannedCode: codeToConfirm,
        });

        if (res.data.alreadyScanned) {
          setErrorFeedback(`Tag ${codeToConfirm} was already scanned for this order.`);
          setPendingScanTag(null);
          await fetchStatus();
          return;
        }

        // Play authentic Honeywell scanner beep
        playAudioFeedback('success', audioMuted);

        let isAllDone = false;

        // Authoritative immediate update directly from server response
        if (res.data.progress) {
          setPackingData(res.data.progress);
          setCurrentSessionTags(
            res.data.progress.scannedTags.map((t) => ({
              tagNumber: t.tagNumber,
              sku: t.sku,
              scannedAt: t.scannedAt,
            }))
          );
          isAllDone = Boolean(
            res.data.progress.isComplete ||
            (res.data.progress.totalScanned && res.data.progress.totalScanned >= res.data.progress.totalRequired)
          );
        } else {
          await fetchStatus();
        }

        setPendingScanTag(null);

        // If all items are completed, close the camera automatically!
        // Otherwise, stay in the scanner and cycle seamlessly to the next item.
        if (isAllDone) {
          setIsScannerOpen(false);
        }
      } catch (err: any) {
        setErrorFeedback(err.message || 'Failed to allocate tag');
        playAudioFeedback('error', audioMuted);
        setPendingScanTag(null);
        await fetchStatus(); // Reconcile session state
      } finally {
        setIsAllocating(false);
      }
    },
    [sessionId, order.id, audioMuted, fetchStatus, isAllocating]
  );

  // Keyboard shortcut listener for Enter (Confirm) and Escape (Cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingScanTag) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmScan(pendingScanTag);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setPendingScanTag(null);
        }
      } else if (isScannerOpen && e.key === 'Escape') {
        e.preventDefault();
        setIsScannerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingScanTag, isScannerOpen, handleConfirmScan]);

  // Finalize Manifest
  const handleFinalize = async () => {
    if (!sessionId) return;
    setIsFinalizing(true);
    setErrorFeedback(null);
    try {
      await adminApi.finalizePackingSession(order.id, sessionId);
      playAudioFeedback('complete', audioMuted);
      setIsManifestFinalized(true);
      onCompleted();
    } catch (err: any) {
      setErrorFeedback(err.message || 'Failed to finalize packing');
      playAudioFeedback('error', audioMuted);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Cancel Session (Kept separate from Back navigation, requires operator confirmation)
  const handleCancelSession = async () => {
    if (!sessionId) return;
    setIsCancelling(true);
    try {
      await adminApi.cancelPackingSession(order.id, {
        sessionId,
        reason: cancelReason,
      });
      playAudioFeedback('duplicate', audioMuted);
      setCancelModalOpen(false);
      setSessionId(null);
      setCurrentSessionTags([]);
      await fetchStatus();
    } catch (err: any) {
      alert(`Failed to cancel session: ${err.message || 'Error'}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Compute fulfillment requirements and authoritative progress
  const {
    bundles,
    standaloneRequirements,
    allRequirements,
    totalRequired,
    totalConfirmed,
    remainingCount,
    isComplete,
  } = computePhysicalFulfillmentPlan(order, packingData);

  const percentComplete =
    totalRequired > 0
      ? isComplete || isManifestFinalized
        ? 100
        : Math.min(99, Math.floor((totalConfirmed / totalRequired) * 100))
      : 0;

  // Next target requirement needing allocation
  const nextTargetReq = allRequirements.find((r) => r.confirmedQty < r.requiredQty) || allRequirements[0];

  const addr = order.shippingAddress;
  const customerName = addr?.fullName || order.user?.name || 'Customer';
  const location = [addr?.city, addr?.state].filter(Boolean).join(', ');

  // Clean, Cardless Requirement Row Component with Large Full-Bleed Image & Enlarged Quantities
  const renderRequirementRow = (req: PhysicalFulfillmentRequirement) => (
    <div
      key={req.id}
      className={`px-3.5 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 transition-colors ${
        req.isComplete ? 'bg-emerald-50/40' : 'hover:bg-bg/40'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Large, Full-Bleed Image Box utilizing 100% width & height */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-border bg-surface shrink-0 overflow-hidden relative shadow-2xs">
          <img
            src={req.image}
            alt={req.componentName}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).src = DEFAULT_PRODUCT_IMAGE;
            }}
          />
        </div>

        {/* Titles & SKU */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm sm:text-base text-ink leading-tight truncate">
              {req.componentName}
            </span>
            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 shrink-0">
              {req.sku}
            </span>
          </div>

          <div className="text-xs text-muted flex items-center gap-2 font-satoshi">
            <span>{req.variantName}</span>
            {req.isBundleComponent && req.bundleName && (
              <>
                <span>·</span>
                <span className="truncate">Part of {req.bundleName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Quantity & Number of Items to Scan */}
      <div className="shrink-0 text-right font-mono flex flex-col items-end gap-1.5 pl-2">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xs sm:text-sm font-semibold text-muted select-none">
            ×
          </span>
          <span
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              req.isComplete ? 'text-emerald-700' : 'text-ink'
            }`}
          >
            {req.requiredQty}
          </span>
          <span className="text-[10px] uppercase font-bold text-muted ml-0.5 select-none">
            Req
          </span>
        </div>

        {/* Prominent No. of Items to Scan Badge */}
        {req.isComplete ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{req.confirmedQty}/{req.requiredQty} Verified</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded font-mono shadow-2xs">
            <span>Scan {req.remainingQty} more</span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-bg text-ink flex flex-col w-full h-full overflow-hidden font-sans select-none">
      {/* ── Contextual Dismissible Error Toast ── */}
      {errorFeedback && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-80 bg-red-950/95 border border-red-500/50 text-red-200 p-3 rounded-md shadow-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="flex-1 leading-relaxed break-words">{errorFeedback}</span>
          <button
            type="button"
            onClick={() => setErrorFeedback(null)}
            className="p-1 text-red-400 hover:text-white rounded cursor-pointer shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 1. Flush Header (System Theme) ── */}
      <header className="h-14 px-3 sm:px-5 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border border-border text-muted hover:text-ink hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            title="Back to queue (Session remains active)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-ink">{order.orderNumber}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(order.orderNumber);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="p-0.5 text-muted hover:text-ink cursor-pointer"
                title="Copy Order ID"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-muted/50" />}
              </button>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                  isManifestFinalized || order.status === 'PACKED'
                    ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                    : sessionId
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                }`}
              >
                {isManifestFinalized || order.status === 'PACKED'
                  ? 'Packed'
                  : sessionId
                  ? 'Packing'
                  : order.status === 'PAID'
                  ? 'Paid'
                  : order.status}
              </span>
            </div>
            <p className="text-[11px] text-muted truncate mt-0.5 font-satoshi">
              {customerName} {location ? `· ${location}` : ''}
            </p>
          </div>
        </div>

        {/* Right Header Utilities: Audio Mute & Distinct Session Cancellation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-100 cursor-pointer transition-colors"
            title={audioMuted ? 'Unmute scanner sound' : 'Mute scanner sound'}
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-muted/60" /> : <Volume2 className="w-4 h-4 text-ink" />}
          </button>

          {sessionId && !isManifestFinalized && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="text-red-600 hover:text-red-700 hover:underline text-xs font-medium cursor-pointer inline-flex items-center gap-1 font-satoshi"
              title="Cancel packing session"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Cancel session</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. Flush Progress Bar (Integrated, Cardless) ── */}
      <div className="border-b border-border bg-surface px-4 py-2.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs font-satoshi">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">
              {totalConfirmed} of {totalRequired} tags confirmed
            </span>
            {remainingCount > 0 ? (
              <span className="text-[11px] text-muted font-mono">({remainingCount} to scan)</span>
            ) : (
              <span className="text-[11px] text-emerald-700 font-semibold font-mono">All verified</span>
            )}
          </div>
          <span className="font-mono text-xs font-bold text-ink">{percentComplete}%</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200/90 rounded-full overflow-hidden relative">
          <div
            style={{ width: `${percentComplete}%` }}
            className={`h-full transition-all duration-300 ${
              isComplete ? 'bg-emerald-600' : 'bg-ink'
            }`}
          />
          {isAllocating && (
            <div className="absolute inset-0 bg-blue-500/30 animate-pulse" />
          )}
        </div>
      </div>

      {/* ── 3. Scrollable Clean Checklist (Flush Separator-Line Layout) ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 font-satoshi max-w-4xl w-full mx-auto">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-[11px] uppercase font-mono font-bold tracking-wider text-muted">
              Fulfillment Checklist ({allRequirements.length} serialized items)
            </h3>
          </div>

          {/* Unified Flush Checklist Table / List */}
          <div className="divide-y divide-border border-y sm:border border-border sm:rounded-md bg-surface overflow-hidden shadow-2xs">
            {/* 1. Bundles Expanded with Clean Category Header */}
            {bundles.map((bundle) => (
              <div key={bundle.id} className="divide-y divide-border">
                {/* Bundle Header Bar */}
                <div className="bg-bg/60 px-3.5 sm:px-4 py-2 flex items-center justify-between text-xs border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono font-bold bg-ink text-surface">
                      Bundle
                    </span>
                    <span className="font-semibold text-ink truncate text-xs">
                      {bundle.bundleName}
                    </span>
                    <span className="text-muted text-[11px]">· {bundle.bundleVariant}</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-ink shrink-0 ml-2">
                    ×{bundle.bundleQuantity} {bundle.bundleQuantity > 1 ? 'packs' : 'pack'}
                  </span>
                </div>

                {/* Bundle Components */}
                {bundle.requirements.map((req) => renderRequirementRow(req))}
              </div>
            ))}

            {/* 2. Standalone Requirements */}
            {standaloneRequirements.length > 0 && (
              <div className="divide-y divide-border">
                {bundles.length > 0 && (
                  <div className="bg-bg/60 px-3.5 sm:px-4 py-2 text-xs font-semibold text-muted font-satoshi border-b border-border">
                    Individual Items
                  </div>
                )}
                {standaloneRequirements.map((req) => renderRequirementRow(req))}
              </div>
            )}
          </div>
        </div>

        {/* Confirmed Serialized Tags List (Clean Flush Section) */}
        <div className="border-y sm:border border-border sm:rounded-md bg-surface overflow-hidden shadow-2xs">
          <div className="bg-bg/50 px-3.5 sm:px-4 py-2 border-b border-border flex items-center justify-between text-xs">
            <span className="text-[11px] uppercase font-mono font-semibold tracking-wider text-muted">
              Confirmed Physical Tags ({currentSessionTags.length} of {totalRequired})
            </span>
          </div>

          {currentSessionTags.length === 0 ? (
            <div className="p-3.5 text-xs text-muted font-satoshi italic">
              No physical tags scanned yet. Tap "Open Scanner" below to begin.
            </div>
          ) : (
            <div className="divide-y divide-border max-h-44 overflow-y-auto font-mono">
              {currentSessionTags.map((tag, idx) => (
                <div
                  key={`tag-${idx}`}
                  className="px-3.5 sm:px-4 py-1.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-ink truncate select-all">{tag.tagNumber}</span>
                    <span className="text-[10px] text-muted">({tag.sku || 'TAG-STD'})</span>
                  </div>
                  <span className="text-[10px] text-muted shrink-0 ml-2">
                    {new Date(tag.scannedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Fixed Bottom Action Area (System Theme Buttons) ── */}
      <footer className="sticky bottom-0 bg-surface border-t border-border p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shrink-0">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-3">
          {!sessionId ? (
            <button
              type="button"
              onClick={handleStartSession}
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 px-4 rounded bg-ink hover:opacity-90 active:scale-[0.99] text-surface font-semibold text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting session...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Start Packing Session</span>
                </>
              )}
            </button>
          ) : isManifestFinalized || order.status === 'PACKED' ? (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Manifest sealed. All physical tags verified.</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded bg-ink hover:opacity-90 text-surface text-xs font-semibold cursor-pointer text-center"
              >
                Done (Back to Queue)
              </button>
            </div>
          ) : isComplete ? (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="w-full py-2.5 sm:py-3 px-4 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sealing manifest...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Finalize &amp; Seal Package</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="w-full py-2.5 sm:py-3 px-4 rounded bg-ink hover:opacity-90 active:scale-[0.99] text-surface font-semibold text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>
                Scan {nextTargetReq ? nextTargetReq.componentName : 'Tag'} ({remainingCount} left)
              </span>
            </button>
          )}
        </div>
      </footer>

      {/* ── 5. DEDICATED FULL-SCREEN SCANNER SHEET (Clean System Theme) ── */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-60 bg-bg text-ink flex flex-col w-full h-full animate-in fade-in duration-200 select-none font-sans">
          {/* Top Bar with compact controls and flush progress line */}
          <header className="border-b border-border bg-surface shrink-0">
            <div className="px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border text-muted hover:text-ink hover:bg-neutral-100 text-xs font-medium cursor-pointer transition-colors font-satoshi"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Checklist</span>
              </button>

              {/* Total Confirmed & Remaining Progress Pill */}
              <div className="font-mono text-xs px-3 py-1 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 font-bold text-center truncate">
                {totalConfirmed} of {totalRequired} confirmed ({remainingCount} left)
              </div>

              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Real-time progress line */}
            <div className="w-full h-1 bg-neutral-200 overflow-hidden">
              <div
                style={{ width: `${percentComplete}%` }}
                className={`h-full transition-all duration-300 ${
                  isComplete ? 'bg-emerald-600' : 'bg-ink'
                }`}
              />
            </div>
          </header>

          {/* Centered Scrollable Workspace: Large Item Display + Compact Camera + Queue */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center justify-center gap-3.5 max-w-xl w-full mx-auto">
            {/* Target Item Display: Generous spacing, large artwork, prominent scanned count */}
            {nextTargetReq ? (
              <div className="w-full p-3.5 sm:p-4 rounded-lg bg-surface border border-border shadow-2xs flex items-center gap-3.5 sm:gap-4 transition-all">
                {/* Large Product Artwork */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-border bg-surface shrink-0 overflow-hidden relative shadow-2xs">
                  <img
                    src={nextTargetReq.image}
                    alt={nextTargetReq.componentName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).src = DEFAULT_PRODUCT_IMAGE;
                    }}
                  />
                </div>

                {/* Target Metadata & SKU */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase font-bold text-muted tracking-wider">
                      Current Item to Scan
                    </span>
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 shrink-0">
                      {nextTargetReq.sku}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-ink truncate leading-tight font-sans">
                    {nextTargetReq.componentName}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted font-satoshi truncate">
                    <span>{nextTargetReq.variantName}</span>
                    {nextTargetReq.isBundleComponent && nextTargetReq.bundleName && (
                      <span> · Part of {nextTargetReq.bundleName}</span>
                    )}
                  </p>
                </div>

                {/* Increased Scanned Item Number */}
                <div className="shrink-0 text-right font-mono flex flex-col items-end pl-2">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                      {nextTargetReq.confirmedQty}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-muted">
                      /{nextTargetReq.requiredQty}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted">
                    Scanned
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded mt-1">
                    {nextTargetReq.remainingQty} to scan
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full p-4 rounded-lg bg-surface border border-border text-center text-xs font-mono text-ink">
                All physical items scanned! Closing scanner...
              </div>
            )}

            {/* Reduced Compact Camera Viewport */}
            <div className="w-full max-w-[240px] sm:max-w-[260px] mx-auto">
              <WarehouseQrScanner
                enabled={Boolean(sessionId && isScannerOpen && !pendingScanTag)}
                onScan={handlePromptScan}
                isProcessing={isAllocating}
                feedbackMessage={null}
                onManualSubmit={handlePromptScan}
                isComplete={isComplete}
              />
            </div>

            {/* Queue of All Order Items (System Theme with Clean Tick Marks) */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between px-0.5 text-xs">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted">
                  Queue ({allRequirements.length} items)
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {totalConfirmed} of {totalRequired} total
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {allRequirements.map((req) => {
                  const isCurrent = nextTargetReq?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-mono shrink-0 transition-all ${
                        req.isComplete
                          ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                          : isCurrent
                          ? 'bg-surface border-ink text-ink ring-1 ring-ink/30 shadow-2xs'
                          : 'bg-surface border-border text-muted'
                      }`}
                    >
                      <div className="w-7 h-7 rounded border border-border overflow-hidden shrink-0 bg-surface">
                        <img
                          src={req.image}
                          alt={req.componentName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).src = DEFAULT_PRODUCT_IMAGE;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs truncate max-w-[100px] text-ink">
                            {req.componentName}
                          </span>
                          {req.isComplete && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted">
                          {req.confirmedQty}/{req.requiredQty} {req.isComplete ? 'verified' : 'scanned'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. INTERACTIVE TAG CONFIRMATION BOTTOM SHEET (System Theme) ── */}
      {pendingScanTag && (
        <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-surface border-t-2 sm:border-2 border-ink rounded-t-xl sm:rounded-lg p-4 sm:p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Mobile drag handle */}
            <div className="sm:hidden w-10 h-1 bg-neutral-300 rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-sans font-bold text-ink text-sm sm:text-base leading-tight truncate">
                    Confirm Scanned Tag
                  </h3>
                  <p className="text-[11px] text-muted font-mono truncate">
                    Order #{order.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingScanTag(null)}
                className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-100 cursor-pointer shrink-0"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanned Tag Identifier */}
            <div className="p-3 rounded bg-bg/80 border border-border text-center space-y-1">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-muted block">
                Scanned Tag Identifier
              </span>
              <p className="font-mono text-xl sm:text-2xl font-bold text-ink tracking-wider select-all break-all leading-tight">
                {pendingScanTag}
              </p>
            </div>

            {/* Target Item Allocation Preview */}
            {nextTargetReq && (
              <div className="p-2.5 rounded border border-border bg-neutral-50/80 flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border border-border bg-surface shrink-0 overflow-hidden relative shadow-2xs">
                  <img
                    src={nextTargetReq.image}
                    alt={nextTargetReq.componentName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).src = DEFAULT_PRODUCT_IMAGE;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-muted block">
                    Binding to:
                  </span>
                  <span className="font-semibold text-xs sm:text-sm text-ink truncate leading-tight block">
                    {nextTargetReq.componentName}
                  </span>
                  <p className="text-[11px] text-muted font-medium mt-0.5">
                    {nextTargetReq.variantName} · {nextTargetReq.sku} · Item {nextTargetReq.confirmedQty + 1} of {nextTargetReq.requiredQty}
                  </p>
                </div>
              </div>
            )}

            {/* Touch-optimized action buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingScanTag(null)}
                className="w-full sm:flex-1 py-2.5 rounded border border-border text-xs font-semibold text-muted hover:text-ink hover:bg-neutral-100 cursor-pointer transition-colors text-center"
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmScan(pendingScanTag)}
                disabled={isAllocating}
                className="w-full sm:flex-1 py-2.5 rounded bg-ink hover:opacity-90 text-surface text-xs font-bold cursor-pointer transition-opacity flex items-center justify-center gap-2 shadow-xs"
              >
                {isAllocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Allocating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Confirm &amp; Allocate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. SESSION CANCELLATION MODAL (Distinct from back navigation) ── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-2xs">
          <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <RotateCcw className="w-4 h-4" />
              <span>Cancel packing session?</span>
            </div>
            <p className="text-xs text-muted leading-relaxed font-satoshi">
              Allocated tags in this session will be released back to available inventory and the order reverted to Paid status.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink block font-satoshi">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-border text-xs bg-bg text-ink focus:outline-none"
              >
                <option value="Damaged exterior packaging">Damaged exterior packaging</option>
                <option value="Physical sticker scratched/defective">Physical sticker scratched/defective</option>
                <option value="Wrong SKU picked from bin">Wrong SKU picked from bin</option>
                <option value="Operator mistake / barcode mismatch">Operator mistake / barcode mismatch</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 rounded border border-border text-xs text-ink cursor-pointer hover:bg-neutral-100 font-medium"
              >
                Keep packing
              </button>
              <button
                type="button"
                onClick={handleCancelSession}
                disabled={isCancelling}
                className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
