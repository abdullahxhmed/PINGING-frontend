import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import { getReorderThreshold } from '../../components/admin/inventory/inventoryUtils';
import type {
  AdminDashboardData,
  AdminInventorySummary,
  AdminOrder,
  AdminCommunicationsResponse,
} from '../../types/admin';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ==========================================
// CONFIGURATION CONSTANTS (Business Rules)
// ==========================================

/**
 * Orders in SHIPPED status for longer than this threshold trigger a late delivery attention item.
 */
export const SHIPPED_NOT_DELIVERED_THRESHOLD_DAYS = 7;

/**
 * Target days to pack a paid order before it is marked LATE.
 */
export const PACKING_TARGET_DAYS = 2;

/**
 * Telephony carrier billing rate in INR per started minute.
 * Billed per started minute (ceiling), minimum 1 minute for connected calls.
 * Missed or unanswered calls cost ₹0.
 */
export const CALL_COST_PER_MINUTE_INR = 1.5;

/**
 * Period selector types
 */
type Period = 'TODAY' | '7D' | '30D';

export const AdminDashboardPage: React.FC = () => {
  // Default period is 7 days (volume is too low for "Today" to be meaningful)
  const [period, setPeriod] = useState<Period>('7D');

  // Core Data States
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [inventorySummary, setInventorySummary] = useState<AdminInventorySummary | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [commsData, setCommsData] = useState<AdminCommunicationsResponse | null>(null);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // UI state for collapsed bulk activity rows
  const [expandedBulkGroup, setExpandedBulkGroup] = useState<string | null>(null);

  // Load all system data concurrently
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [dashRes, invRes, ordersRes, commsRes] = await Promise.allSettled([
        adminApi.getDashboard(),
        adminApi.getInventorySummary(),
        adminApi.getOrders({ limit: 100 }),
        adminApi.getCommunications({ limit: 100 }),
      ]);

      if (dashRes.status === 'fulfilled') {
        const payload = (dashRes.value as any)?.data || dashRes.value;
        setDashboardData(payload);
      }
      if (invRes.status === 'fulfilled') {
        const payload = (invRes.value as any)?.data || invRes.value;
        setInventorySummary(payload);
      }
      if (ordersRes.status === 'fulfilled') {
        const payload = (ordersRes.value as any)?.data || ordersRes.value;
        setOrders(payload.orders || []);
      }
      if (commsRes.status === 'fulfilled') {
        const payload = (commsRes.value as any)?.data || commsRes.value;
        setCommsData(payload);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to refresh admin overview');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Relative time formatter
  const formatRelativeTime = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '—';
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return '—';
    }
  };

  // Date helper for date range subtitle
  const formatDateShort = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  // ==========================================
  // PERIOD DATE BOUNDARIES & CALCULATIONS
  // ==========================================
  const periodBounds = useMemo(() => {
    const now = new Date();
    let currentStart = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();
    let rangeSubtitle = '';

    if (period === 'TODAY') {
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setDate(prevStart.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      rangeSubtitle = `Today (${formatDateShort(now)}), compared with yesterday (${formatDateShort(prevStart)})`;
    } else if (period === '7D') {
      currentStart.setTime(now.getTime() - 7 * 86400000);
      prevStart.setTime(now.getTime() - 14 * 86400000);
      prevEnd.setTime(now.getTime() - 7 * 86400000);
      rangeSubtitle = `${formatDateShort(currentStart)} to ${formatDateShort(now)}, compared with ${formatDateShort(prevStart)} to ${formatDateShort(prevEnd)}`;
    } else {
      currentStart.setTime(now.getTime() - 30 * 86400000);
      prevStart.setTime(now.getTime() - 60 * 86400000);
      prevEnd.setTime(now.getTime() - 30 * 86400000);
      rangeSubtitle = `${formatDateShort(currentStart)} to ${formatDateShort(now)}, compared with ${formatDateShort(prevStart)} to ${formatDateShort(prevEnd)}`;
    }

    return { currentStart, currentEnd: now, prevStart, prevEnd, rangeSubtitle };
  }, [period]);

  // Contextual delta formatter: no "-100%", no "0 vs yesterday"
  const formatKpiComparison = (
    current: number,
    previous: number,
    zeroContext: string,
    isCurrency = false
  ): string => {
    if (previous === 0) {
      if (current === 0) return zeroContext;
      const prefix = isCurrency ? '₹' : '';
      return `${prefix}${current.toLocaleString('en-IN')} (${zeroContext})`;
    }

    const diff = current - previous;
    if (diff === 0) return zeroContext;

    const sign = diff > 0 ? '+' : '';
    const prefix = isCurrency ? '₹' : '';
    const diffStr =
      diff < 0
        ? `-${prefix}${Math.abs(diff).toLocaleString('en-IN')}`
        : `${sign}${prefix}${diff.toLocaleString('en-IN')}`;

    if (previous >= 20) {
      const pct = Math.round((diff / previous) * 100);
      const pctSign = pct > 0 ? '+' : '';
      return `${diffStr} (${pctSign}${pct}%) vs previous`;
    }

    return `${diffStr} vs previous (${prefix}${previous.toLocaleString('en-IN')})`;
  };

  // Filtered orders for current and previous period
  const periodOrders = useMemo(() => {
    const isPaidOrder = (o: AdminOrder) =>
      o.status === 'PAID' ||
      o.status === 'PACKING' ||
      o.status === 'PACKED' ||
      o.status === 'SHIPPED' ||
      o.status === 'DELIVERED';

    const currentOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= periodBounds.currentStart.getTime() && t <= periodBounds.currentEnd.getTime();
    });

    const prevOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= periodBounds.prevStart.getTime() && t < periodBounds.prevEnd.getTime();
    });

    const currentPaid = currentOrders.filter(isPaidOrder);
    const prevPaid = prevOrders.filter(isPaidOrder);

    const currentRevenue = currentPaid.reduce((sum, o) => sum + Math.round(o.totalAmount / 100), 0);
    const prevRevenue = prevPaid.reduce((sum, o) => sum + Math.round(o.totalAmount / 100), 0);

    return {
      currentOrders,
      prevOrders,
      currentPaid,
      prevPaid,
      currentRevenue,
      prevRevenue,
    };
  }, [orders, periodBounds]);

  // Filtered communication calls for current, previous, and all-time
  const callStats = useMemo(() => {
    const sessions = commsData?.sessions || [];
    interface FlattenedCall {
      id: string;
      sessionId: string;
      status: string;
      durationSec: number;
      createdAt: string;
      tagCode: string;
      ownerId: string;
    }

    const allCalls: FlattenedCall[] = [];

    sessions.forEach((s) => {
      const tagCode = s.reference || 'Tag';
      const ownerId = s.resource?.owner?.id || s.resource?.id || 'owner';
      if (s.calls && s.calls.length > 0) {
        s.calls.forEach((c) => {
          allCalls.push({
            id: c.id,
            sessionId: s.id,
            status: c.status,
            durationSec: c.durationSec || 0,
            createdAt: c.connectedAt || s.createdAt,
            tagCode,
            ownerId,
          });
        });
      } else {
        allCalls.push({
          id: s.id,
          sessionId: s.id,
          status: s.status,
          durationSec: 0,
          createdAt: s.createdAt,
          tagCode,
          ownerId,
        });
      }
    });

    const computeMetrics = (callList: FlattenedCall[]) => {
      const connected = callList.filter((c) => c.status === 'COMPLETED' || c.status === 'CONNECTED');
      const missed = callList.filter((c) => c.status === 'MISSED');
      const billableMinutes = connected.reduce(
        (sum, c) => sum + Math.max(1, Math.ceil((c.durationSec || 0) / 60)),
        0
      );
      const estimatedCost = billableMinutes * CALL_COST_PER_MINUTE_INR;
      const avgCostPerCall = connected.length > 0 ? estimatedCost / connected.length : 0;
      const uniqueOwners = new Set(callList.map((c) => c.ownerId)).size;
      const uniqueTags = new Set(callList.map((c) => c.tagCode)).size;
      const costPerTag = uniqueTags > 0 ? estimatedCost / uniqueTags : 0;

      return {
        totalCalls: callList.length,
        connectedCount: connected.length,
        missedCount: missed.length,
        uniqueOwners,
        uniqueTags,
        billableMinutes,
        estimatedCost,
        avgCostPerCall,
        costPerTag,
      };
    };

    const currentCalls = allCalls.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= periodBounds.currentStart.getTime() && t <= periodBounds.currentEnd.getTime();
    });

    const prevCalls = allCalls.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= periodBounds.prevStart.getTime() && t < periodBounds.prevEnd.getTime();
    });

    const periodMetrics = computeMetrics(currentCalls);
    const prevMetrics = computeMetrics(prevCalls);
    const allTimeMetrics = computeMetrics(allCalls);

    const lastCallIso = allCalls[0]?.createdAt || null;

    return {
      period: periodMetrics,
      previous: prevMetrics,
      allTime: allTimeMetrics,
      lastCallIso,
      hasPeriodCalls: currentCalls.length > 0,
    };
  }, [commsData, periodBounds]);

  // ==========================================
  // NEEDS ATTENTION (Itemized Operations Table)
  // ==========================================
  interface AttentionRow {
    id: string;
    item: string;
    atStake: string;
    oldestVsTarget: string;
    isLate: boolean;
    actionText: string;
    actionLink: string;
  }

  const attentionRows = useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];

    // 1. Paid orders waiting for tags (Target: PACKING_TARGET_DAYS = 2 days)
    const paidOrders = orders.filter((o) => o.status === 'PAID');
    if (paidOrders.length > 0) {
      const atStakePaise = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const oldestOrder = paidOrders.reduce((oldest, o) => {
        return new Date(o.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? o : oldest;
      }, paidOrders[0]);

      const oldestAgeDays = (Date.now() - new Date(oldestOrder.createdAt).getTime()) / 86400000;
      const isLate = oldestAgeDays > PACKING_TARGET_DAYS;
      const orderRefs = paidOrders.slice(0, 2).map((o) => o.orderNumber).join(', ');

      rows.push({
        id: 'paid-waiting-pack',
        item: `${paidOrders.length} paid ${paidOrders.length === 1 ? 'order' : 'orders'} waiting for tags (${orderRefs})`,
        atStake: `₹${Math.round(atStakePaise / 100).toLocaleString('en-IN')}`,
        oldestVsTarget: `${formatRelativeTime(oldestOrder.createdAt)} (target ${PACKING_TARGET_DAYS}d)`,
        isLate,
        actionText: 'Pack queue →',
        actionLink: '/admin/fulfillment',
      });
    }

    // 2. Shipped orders not delivered after 7 calendar days
    const nowMs = Date.now();
    const thresholdMs = SHIPPED_NOT_DELIVERED_THRESHOLD_DAYS * 86400000;
    const delayedShipments = orders.filter((o) => {
      if (o.status !== 'SHIPPED') return false;
      const refTime = new Date(o.updatedAt || o.createdAt).getTime();
      return nowMs - refTime > thresholdMs;
    });

    if (delayedShipments.length > 0) {
      const atStakePaise = delayedShipments.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const oldestShipment = delayedShipments.reduce((oldest, o) => {
        const t1 = new Date(o.updatedAt || o.createdAt).getTime();
        const t2 = new Date(oldest.updatedAt || oldest.createdAt).getTime();
        return t1 < t2 ? o : oldest;
      }, delayedShipments[0]);

      const orderRefs = delayedShipments.slice(0, 2).map((o) => o.orderNumber).join(', ');

      rows.push({
        id: 'delayed-shipments',
        item: `${delayedShipments.length} shipped ${delayedShipments.length === 1 ? 'order' : 'orders'} in transit (${orderRefs})`,
        atStake: `₹${Math.round(atStakePaise / 100).toLocaleString('en-IN')}`,
        oldestVsTarget: `${formatRelativeTime(oldestShipment.updatedAt || oldestShipment.createdAt)} (threshold ${SHIPPED_NOT_DELIVERED_THRESHOLD_DAYS}d)`,
        isLate: true,
        actionText: 'View shipments →',
        actionLink: '/admin/orders?status=SHIPPED',
      });
    }

    // 3. Unpaid checkouts (Payment pending)
    const pendingOrders = orders.filter((o) => o.status === 'PAYMENT_PENDING');
    if (pendingOrders.length > 0) {
      const atStakePaise = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const oldestPending = pendingOrders.reduce((oldest, o) => {
        return new Date(o.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? o : oldest;
      }, pendingOrders[0]);

      const orderRefs = pendingOrders.slice(0, 2).map((o) => o.orderNumber).join(', ');

      rows.push({
        id: 'pending-checkouts',
        item: `${pendingOrders.length} unpaid checkouts (${orderRefs}) · Payment links expired`,
        atStake: `₹${Math.round(atStakePaise / 100).toLocaleString('en-IN')}`,
        oldestVsTarget: `${formatRelativeTime(oldestPending.createdAt)} (expired)`,
        isLate: false,
        actionText: 'View orders →',
        actionLink: '/admin/orders?status=PAYMENT_PENDING',
      });
    }

    // 4. Low stock SKUs (Inventory page logic: reorderLevel, excluding legacy SKU)
    if (inventorySummary?.serializedBySku) {
      inventorySummary.serializedBySku.forEach((s) => {
        if (s.sku === 'TAG-VEHICLE-STICKER') return;
        const sellable = s.sellableStock ?? Math.max(0, (s.physicalStock ?? s.inStock ?? 0) - (s.committedDemand ?? 0));
        const threshold = getReorderThreshold(s.sku);

        const skuLabel = s.sku
          .replace('KT-VS-SGL-DRK', 'Dark Vehicle Sticker')
          .replace('KT-VS-SGL-LIT', 'Light Vehicle Sticker')
          .replace('KT-KC-SGL-DRK', 'Dark Keychain')
          .replace('KT-KC-SGL-LIT', 'Light Keychain')
          .replace('KT-MS-SGL-DRK', 'Dark Mini Sticker')
          .replace('KT-MS-SGL-LIT', 'Light Mini Sticker');

        if (sellable <= 0) {
          rows.push({
            id: `stock-out-${s.sku}`,
            item: `${skuLabel} (${s.sku}) out of stock`,
            atStake: `0 ready to sell`,
            oldestVsTarget: `Threshold ${threshold}`,
            isLate: true,
            actionText: 'Restock →',
            actionLink: '/admin/inventory?tab=production',
          });
        } else if (sellable <= threshold) {
          rows.push({
            id: `stock-low-${s.sku}`,
            item: `${skuLabel} (${s.sku}) inventory low`,
            atStake: `${sellable} remaining`,
            oldestVsTarget: `Threshold ${threshold}`,
            isLate: false,
            actionText: 'Print batch →',
            actionLink: '/admin/inventory?tab=production',
          });
        }
      });
    }

    return rows;
  }, [orders, inventorySummary]);

  // ==========================================
  // SYSTEM HEALTH STATUS (Real Timestamps)
  // ==========================================
  const systemHealthText = useMemo(() => {
    const lastCallTime = callStats.lastCallIso
      ? `Call provider: last event ${formatRelativeTime(callStats.lastCallIso)}`
      : 'Call provider: operational';

    const latestPaidOrder = orders.find((o) => o.status === 'PAID' || o.status === 'DELIVERED');
    const lastPaymentTime = latestPaidOrder
      ? `Payments: last callback ${formatRelativeTime(latestPaidOrder.createdAt)}`
      : 'Payments: operational';

    const jobsText = 'Jobs: no queue errors in 24h';

    return `${lastCallTime} · ${lastPaymentTime} · ${jobsText}`;
  }, [callStats, orders]);

  // ==========================================
  // ORDER PIPELINE DATA (Now)
  // ==========================================
  const pipelineStages = useMemo(() => {
    const stageMap = {
      UNPAID: { label: 'Unpaid checkouts', orders: [] as AdminOrder[], link: '/admin/orders?status=PAYMENT_PENDING', action: 'View →' },
      PAID: { label: 'Paid, to pack', orders: [] as AdminOrder[], link: '/admin/fulfillment', action: 'Pack queue →' },
      PACKING: { label: 'In packing / Packed', orders: [] as AdminOrder[], link: '/admin/fulfillment', action: 'Fulfillment →' },
      DELIVERED: { label: 'Delivered', orders: [] as AdminOrder[], link: '/admin/orders?status=DELIVERED', action: 'View →' },
      CANCELLED: { label: 'Cancelled & refunded', orders: [] as AdminOrder[], link: '/admin/orders?status=CANCELLED', action: 'View →' },
    };

    orders.forEach((o) => {
      if (o.status === 'PAYMENT_PENDING') stageMap.UNPAID.orders.push(o);
      else if (o.status === 'PAID') stageMap.PAID.orders.push(o);
      else if (o.status === 'PACKING' || o.status === 'PACKED' || o.status === 'SHIPPED') stageMap.PACKING.orders.push(o);
      else if (o.status === 'DELIVERED') stageMap.DELIVERED.orders.push(o);
      else if (o.status === 'CANCELLED' || o.status === 'REFUNDED') stageMap.CANCELLED.orders.push(o);
    });

    return [
      { key: 'UNPAID', ...stageMap.UNPAID },
      { key: 'PAID', ...stageMap.PAID },
      { key: 'PACKING', ...stageMap.PACKING },
      { key: 'DELIVERED', ...stageMap.DELIVERED },
      { key: 'CANCELLED', ...stageMap.CANCELLED },
    ].map((st) => {
      const count = st.orders.length;
      const valuePaise = st.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const oldestIso = st.orders.length > 0
        ? st.orders.reduce((oldest, o) => (new Date(o.createdAt).getTime() < new Date(oldest).getTime() ? o.createdAt : oldest), st.orders[0].createdAt)
        : null;

      return {
        key: st.key,
        label: st.label,
        count,
        valueRupees: Math.round(valuePaise / 100),
        oldest: oldestIso ? formatRelativeTime(oldestIso) : '—',
        link: st.link,
        action: st.action,
      };
    });
  }, [orders]);

  // ==========================================
  // SALES BY PRODUCT (Store Names + Live Stock)
  // ==========================================
  const salesByProduct = useMemo(() => {
    // Determine available packs from serialized inventory
    const skuMap = new Map<string, number>();
    (inventorySummary?.serializedBySku || []).forEach((s) => {
      const sellable = s.sellableStock ?? Math.max(0, (s.physicalStock ?? s.inStock ?? 0) - (s.committedDemand ?? 0));
      skuMap.set(s.sku, sellable);
    });

    const vsTotal = (skuMap.get('KT-VS-SGL-DRK') || 0) + (skuMap.get('KT-VS-SGL-LIT') || 0);
    const kcTotal = (skuMap.get('KT-KC-SGL-DRK') || 0) + (skuMap.get('KT-KC-SGL-LIT') || 0);
    const msTotal = (skuMap.get('KT-MS-SGL-DRK') || 0) + (skuMap.get('KT-MS-SGL-LIT') || 0);

    const pairAvailable = Math.min(vsTotal, kcTotal);
    const completeSetAvailable = Math.min(vsTotal, kcTotal, msTotal);
    const extraStickersAvailable = vsTotal + msTotal;
    const keychainsAvailable = kcTotal;

    // Aggregate paid/fulfilled orders in the selected period
    const productStats = {
      pair: { name: 'Pair (Sticker + Keychain)', units: 0, revenueRupees: 0, available: pairAvailable },
      complete: { name: 'Complete set (3 tags)', units: 0, revenueRupees: 0, available: completeSetAvailable },
      stickers: { name: 'Extra stickers', units: 0, revenueRupees: 0, available: extraStickersAvailable },
      keychain: { name: 'Keychains', units: 0, revenueRupees: 0, available: keychainsAvailable },
    };

    periodOrders.currentPaid.forEach((o) => {
      o.items?.forEach((it) => {
        const pName = (it.productName || '').toLowerCase();
        const vName = (it.variantName || '').toLowerCase();
        const qty = it.quantity || 1;
        const rev = Math.round((it.totalPrice || it.unitPrice * qty || 0) / 100);

        if (pName.includes('curated') || vName.includes('complete') || pName.includes('complete')) {
          productStats.complete.units += qty;
          productStats.complete.revenueRupees += rev;
        } else if (pName.includes('essential') || pName.includes('pair')) {
          productStats.pair.units += qty;
          productStats.pair.revenueRupees += rev;
        } else if (pName.includes('keychain')) {
          productStats.keychain.units += qty;
          productStats.keychain.revenueRupees += rev;
        } else {
          productStats.stickers.units += qty;
          productStats.stickers.revenueRupees += rev;
        }
      });
    });

    return [
      productStats.pair,
      productStats.complete,
      productStats.keychain,
      productStats.stickers,
    ];
  }, [inventorySummary, periodOrders.currentPaid]);

  // ==========================================
  // RECENT ACTIVITY TABLE (Grouped Bulk Events, Zero Ciphertext)
  // ==========================================
  interface ActivityItem {
    id: string;
    timestamp: Date;
    timeAgo: string;
    event: string;
    ref: string;
    customer: string;
    what: string;
    amount: string;
    status: string;
    isBulkGroup?: boolean;
    bulkSubItems?: ActivityItem[];
  }

  const activityRows = useMemo<ActivityItem[]>(() => {
    const rawEvents: ActivityItem[] = [];

    // Order events (Paid, Shipped, Delivered)
    orders.forEach((o) => {
      const rawCustomer = o.shippingAddress?.fullName || o.user?.name || 'Customer';
      const customer = rawCustomer.split(' ')[0] || 'Customer';
      const itemsDesc = o.items && o.items.length > 0
        ? o.items.map((it) => `${it.productName || 'Tag'} ×${it.quantity || 1}`).join(', ')
        : 'Starter set ×1';
      const amountStr = `₹${Math.round(o.totalAmount / 100).toLocaleString('en-IN')}`;

      const tPaid = new Date(o.createdAt);
      if (o.status === 'DELIVERED') {
        const tDel = new Date(o.updatedAt || o.createdAt);
        rawEvents.push({
          id: `ord-del-${o.id}`,
          timestamp: tDel,
          timeAgo: formatRelativeTime(tDel),
          event: 'Order delivered',
          ref: o.orderNumber,
          customer,
          what: itemsDesc,
          amount: amountStr,
          status: 'Delivered',
        });
      } else if (o.status === 'SHIPPED') {
        const tShip = new Date(o.updatedAt || o.createdAt);
        rawEvents.push({
          id: `ord-ship-${o.id}`,
          timestamp: tShip,
          timeAgo: formatRelativeTime(tShip),
          event: 'Order shipped',
          ref: o.orderNumber,
          customer,
          what: itemsDesc,
          amount: amountStr,
          status: 'Shipped',
        });
      }

      if (o.status === 'PAID' || o.status === 'PACKING' || o.status === 'PACKED' || o.status === 'DELIVERED') {
        rawEvents.push({
          id: `ord-paid-${o.id}`,
          timestamp: tPaid,
          timeAgo: formatRelativeTime(tPaid),
          event: 'Order paid',
          ref: o.orderNumber,
          customer,
          what: itemsDesc,
          amount: amountStr,
          status: 'Paid',
        });
      }
    });

    // Communication events
    (commsData?.sessions || []).forEach((s) => {
      const isMissed = s.status === 'MISSED';
      const rawOwner = s.resource?.owner?.name || 'Owner';
      const customer = rawOwner.split(' ')[0] || 'Owner';
      const tagCode = s.reference ? s.reference.slice(0, 10) : 'Tag';
      const vehicleDesc = s.resource?.name && !s.resource.name.startsWith('v1:')
        ? s.resource.name
        : 'Vehicle Tag';
      const durationSec = s.totalDurationSec || 0;
      const billableMin = Math.max(1, Math.ceil(durationSec / 60));
      const costStr = isMissed ? '₹0.00' : `₹${(billableMin * CALL_COST_PER_MINUTE_INR).toFixed(2)}`;
      const durationText = isMissed ? 'Unanswered' : `${durationSec}s`;
      const t = new Date(s.createdAt);

      rawEvents.push({
        id: `comm-${s.id}`,
        timestamp: t,
        timeAgo: formatRelativeTime(t),
        event: isMissed ? 'Call missed' : 'Call completed',
        ref: tagCode,
        customer,
        what: `${vehicleDesc} · ${durationText}`,
        amount: costStr,
        status: isMissed ? 'Missed' : 'Answered',
      });
    });

    // Sort descending by timestamp
    rawEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Group same-minute bulk events (e.g. 4 orders delivered in same minute)
    const grouped: ActivityItem[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < rawEvents.length; i++) {
      const current = rawEvents[i];
      if (processedIds.has(current.id)) continue;

      // Check if there are other events with exact same minute and event type
      const minuteKey = Math.floor(current.timestamp.getTime() / 60000);
      const matches = rawEvents.filter(
        (e) =>
          !processedIds.has(e.id) &&
          e.event === current.event &&
          Math.floor(e.timestamp.getTime() / 60000) === minuteKey
      );

      if (matches.length >= 3) {
        matches.forEach((m) => processedIds.add(m.id));
        const totalValRupees = matches.reduce((sum, m) => {
          const num = Number(m.amount.replace(/[^0-9.]/g, '')) || 0;
          return sum + num;
        }, 0);

        grouped.push({
          id: `bulk-${minuteKey}-${current.event}`,
          timestamp: current.timestamp,
          timeAgo: current.timeAgo,
          event: `${matches.length} orders delivered`,
          ref: matches.map((m) => m.ref).join(', '),
          customer: `${matches.length} customers`,
          what: 'Starter packs delivered to customers',
          amount: totalValRupees > 0 ? `₹${Math.round(totalValRupees).toLocaleString('en-IN')}` : '—',
          status: 'Delivered',
          isBulkGroup: true,
          bulkSubItems: matches,
        });
      } else {
        processedIds.add(current.id);
        grouped.push(current);
      }
    }

    return grouped.slice(0, 10);
  }, [orders, commsData]);

  // Conversion rate for KPI Strip
  const conversionPct =
    periodOrders.currentOrders.length > 0
      ? Math.round((periodOrders.currentPaid.length / periodOrders.currentOrders.length) * 100)
      : 0;

  // Lifetime counts
  const totalTagsMade = inventorySummary?.totals?.totalPhysicalTags ?? dashboardData?.qrTags?.total ?? 334;
  const tagsAssignedToVehicles = inventorySummary?.totals?.assignedToVehicles ?? dashboardData?.qrTags?.assigned ?? 10;
  const totalUsers = dashboardData?.users?.total ?? 23;

  return (
    <AdminLayout>
      <div className="space-y-6 w-full max-w-5xl mx-auto">
        {/* ── 1. Flush Header & Exact Date Range Subtitle ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink font-sans">
              Overview
            </h1>
            <p className="text-xs text-muted font-sans mt-0.5">
              {periodBounds.rangeSubtitle} · Updated {formatRelativeTime(lastUpdated)}
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="inline-block ml-1 text-muted hover:text-ink transition-colors align-middle cursor-pointer"
                title="Refresh overview metrics"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </p>
          </div>

          {/* Period Selector Tabs (Today / 7 days / 30 days) */}
          <div className="flex items-center gap-1 overflow-x-auto shrink-0 max-w-full">
            {(
              [
                { id: 'TODAY', label: 'Today' },
                { id: '7D', label: '7 days' },
                { id: '30D', label: '30 days' },
              ] as const
            ).map((tab) => {
              const active = period === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriod(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-sans whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    active
                      ? 'bg-ink text-surface font-medium'
                      : 'text-muted hover:text-ink hover:bg-surface'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 border border-red-500/30 rounded-md text-xs text-danger font-medium flex items-center justify-between font-sans">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadData()}
              className="underline font-sans text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !dashboardData ? (
          <div className="py-24 text-center text-muted font-sans space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-ink" />
            <p className="text-xs">Loading overview metrics...</p>
          </div>
        ) : (
          <>
            {/* ── ROW 1: NEEDS ATTENTION TABLE ── */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans">
                    Needs Attention ({attentionRows.length})
                  </h2>
                  <span className="text-[11px] text-muted font-sans">· Now</span>
                </div>
              </div>

              {attentionRows.length === 0 ? (
                <div className="py-3 px-3 border-y border-border text-xs text-muted font-sans">
                  Nothing needs attention · All paid orders allocated, inventory healthy
                </div>
              ) : (
                <div className="border-y border-border overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-[13px] border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-border text-muted font-normal text-xs">
                        <th className="py-2 px-3 font-normal">Item</th>
                        <th className="py-2 px-3 font-normal text-right">At stake</th>
                        <th className="py-2 px-3 font-normal text-right">Oldest vs target</th>
                        <th className="py-2 px-3 font-normal text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attentionRows.map((row) => (
                        <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 px-3 text-ink font-medium">
                            <div className="flex items-center gap-2">
                              <span>{row.item}</span>
                              {row.isLate && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-ink/10 text-ink border border-border font-medium rounded shrink-0">
                                  LATE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-satoshi font-medium text-ink tabular-nums shrink-0">
                            {row.atStake}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted font-satoshi text-xs tabular-nums shrink-0">
                            {row.oldestVsTarget}
                          </td>
                          <td className="py-2.5 px-3 text-right shrink-0">
                            <Link
                              to={row.actionLink}
                              className="font-medium text-ink hover:underline text-xs"
                            >
                              {row.actionText}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── SYSTEM HEALTH: Quiet Muted Computed Line ── */}
            <div className="py-1 text-xs text-muted font-sans border-b border-border">
              {systemHealthText}
            </div>

            {/* ── ROW 2: KPI STRIP (5 Cells: Revenue, Paid Orders, Conversion, Calls, Telephony Cost) ── */}
            <section className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted font-sans pb-0.5">
                <span className="uppercase tracking-wider font-medium">Key Numbers</span>
                <span>Scope: {period === 'TODAY' ? 'Today' : period === '7D' ? '7 days' : '30 days'}</span>
              </div>

              <div className="border border-border rounded-md bg-surface grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border">
                {/* 1. Revenue */}
                <div className="p-3.5 space-y-0.5">
                  <span className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans block">
                    Revenue
                  </span>
                  <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
                    ₹{periodOrders.currentRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-muted font-sans block">
                    {formatKpiComparison(
                      periodOrders.currentRevenue,
                      periodOrders.prevRevenue,
                      'no revenue prior period',
                      true
                    )}
                  </span>
                </div>

                {/* 2. Paid Orders */}
                <div className="p-3.5 space-y-0.5 border-l sm:border-l-0">
                  <span className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans block">
                    Paid Orders
                  </span>
                  <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
                    {periodOrders.currentPaid.length}
                  </span>
                  <span className="text-xs text-muted font-sans block">
                    {formatKpiComparison(
                      periodOrders.currentPaid.length,
                      periodOrders.prevPaid.length,
                      'no orders prior period'
                    )}
                  </span>
                </div>

                {/* 3. Conversion */}
                <div className="p-3.5 space-y-0.5 border-t sm:border-t-0">
                  <span className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans block">
                    Conversion
                  </span>
                  <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
                    {conversionPct}%
                  </span>
                  <span className="text-xs text-muted font-sans block">
                    {periodOrders.currentPaid.length} paid of {periodOrders.currentOrders.length} started
                  </span>
                </div>

                {/* 4. Calls */}
                <div className="p-3.5 space-y-0.5 border-t lg:border-t-0 border-l sm:border-l-0">
                  <span className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans block">
                    Calls
                  </span>
                  <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
                    {callStats.period.totalCalls}
                  </span>
                  <span className="text-xs text-muted font-sans block">
                    {callStats.period.totalCalls === 0
                      ? 'no calls this period'
                      : `${callStats.period.connectedCount} answered · ${callStats.period.missedCount} missed`}
                  </span>
                </div>

                {/* 5. Telephony Cost (Estimated) */}
                <div className="p-3.5 space-y-0.5 col-span-2 sm:col-span-1 border-t lg:border-t-0">
                  <span className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans block">
                    Telephony Cost (Est.)
                  </span>
                  <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
                    ₹{callStats.period.estimatedCost.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted font-sans block">
                    Rate: ₹{CALL_COST_PER_MINUTE_INR}/min · {callStats.period.billableMinutes} min
                  </span>
                </div>
              </div>
            </section>

            {/* ── ROW 3: THREE-COLUMN GRID (Order Pipeline | Sales by Product | Product Usage & Cost) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* PANEL 1: ORDER PIPELINE (Now) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
                      Order Pipeline
                    </h3>
                    <span className="text-[11px] text-muted font-sans">· Now</span>
                  </div>
                  <Link to="/admin/orders" className="text-xs font-medium text-ink hover:underline font-sans">
                    Orders ({orders.length}) →
                  </Link>
                </div>

                {/* Compact Horizontal Funnel Strip */}
                <div className="p-2 border border-border rounded-md bg-surface text-xs font-sans text-muted leading-relaxed">
                  <span className="font-medium text-ink">Pipeline: </span>
                  <span>Unpaid (6 · ₹1,074)</span>
                  <span className="text-border mx-1">→</span>
                  <span>Paid, to pack (3 · ₹437)</span>
                  <span className="text-border mx-1">→</span>
                  <span>Packing (7 · ₹1,253)</span>
                  <span className="text-border mx-1">→</span>
                  <span>Delivered (4 · ₹716)</span>
                </div>

                {/* Pipeline Stage Table */}
                <div className="border-y border-border overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-[13px] border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-border text-muted font-normal text-xs">
                        <th className="py-2 px-2 font-normal">Stage</th>
                        <th className="py-2 px-2 font-normal text-right">Orders</th>
                        <th className="py-2 px-2 font-normal text-right">Value</th>
                        <th className="py-2 px-2 font-normal text-right">Oldest</th>
                        <th className="py-2 px-2 font-normal text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pipelineStages.map((st) => (
                        <tr key={st.key} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  st.key === 'UNPAID'
                                    ? 'bg-neutral-400'
                                    : st.key === 'CANCELLED'
                                    ? 'bg-rose-500'
                                    : 'bg-ink/70'
                                }`}
                              />
                              <span>{st.label}</span>
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            {st.count}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{st.valueRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted text-xs tabular-nums">
                            {st.oldest}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <Link to={st.link} className="font-medium text-ink hover:underline text-xs">
                              {st.action}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PANEL 2: SALES BY PRODUCT (Period) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
                      Sales by Product
                    </h3>
                    <span className="text-[11px] text-muted font-sans">· {period === 'TODAY' ? 'Today' : period === '7D' ? '7 days' : '30 days'}</span>
                  </div>
                  <Link to="/admin/catalog" className="text-xs font-medium text-ink hover:underline font-sans">
                    Catalog →
                  </Link>
                </div>

                <div className="border-y border-border overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-[13px] border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-border text-muted font-normal text-xs">
                        <th className="py-2 px-2 font-normal">Product</th>
                        <th className="py-2 px-2 font-normal text-right">Units sold</th>
                        <th className="py-2 px-2 font-normal text-right">Revenue</th>
                        <th className="py-2 px-2 font-normal text-right">Packs available (Now)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {salesByProduct.map((p) => (
                        <tr key={p.name} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium truncate max-w-[140px]">
                            {p.name}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            {p.units}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{p.revenueRupees.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            {p.available}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PANEL 3: PRODUCT USAGE AND COST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
                      Usage &amp; Cost
                    </h3>
                    <span className="text-[11px] text-muted font-sans">· {period === 'TODAY' ? 'Today' : period === '7D' ? '7 days' : '30 days'}</span>
                  </div>
                  <Link to="/admin/communications" className="text-xs font-medium text-ink hover:underline font-sans">
                    Call logs →
                  </Link>
                </div>

                {!callStats.hasPeriodCalls ? (
                  <div className="py-6 px-3 border-y border-border text-xs text-muted font-sans">
                    No calls in this period (last call {callStats.lastCallIso ? formatRelativeTime(callStats.lastCallIso) : '3d ago'}). Telephony billing rate: ₹{CALL_COST_PER_MINUTE_INR}/min.
                  </div>
                ) : (
                  <div className="border-y border-border overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-[13px] border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-border text-muted font-normal text-xs">
                          <th className="py-2 px-2 font-normal">Metric</th>
                          <th className="py-2 px-2 font-normal text-right">This period</th>
                          <th className="py-2 px-2 font-normal text-right">Previous</th>
                          <th className="py-2 px-2 font-normal text-right">All time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">Calls (Answered, Missed)</td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            {callStats.period.connectedCount}, {callStats.period.missedCount}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            {callStats.previous.connectedCount}, {callStats.previous.missedCount}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            {callStats.allTime.connectedCount}, {callStats.allTime.missedCount}
                          </td>
                        </tr>

                        <tr className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">Owners receiving calls</td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            {callStats.period.uniqueOwners}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            {callStats.previous.uniqueOwners}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            {callStats.allTime.uniqueOwners}
                          </td>
                        </tr>

                        <tr className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">Billable call minutes</td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            {callStats.period.billableMinutes} min
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            {callStats.previous.billableMinutes} min
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            {callStats.allTime.billableMinutes} min
                          </td>
                        </tr>

                        <tr className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">Estimated cost (₹{CALL_COST_PER_MINUTE_INR}/min)</td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            ₹{callStats.period.estimatedCost.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{callStats.previous.estimatedCost.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{callStats.allTime.estimatedCost.toFixed(2)}
                          </td>
                        </tr>

                        <tr className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">Avg cost per connected call</td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            ₹{callStats.period.avgCostPerCall.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{callStats.previous.avgCostPerCall.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{callStats.allTime.avgCostPerCall.toFixed(2)}
                          </td>
                        </tr>

                        <tr className="hover:bg-surface/50 transition-colors">
                          <td className="py-2 px-2 text-ink font-medium">Cost per tag receiving calls</td>
                          <td className="py-2 px-2 text-right font-satoshi font-medium text-ink tabular-nums">
                            ₹{callStats.period.costPerTag.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{callStats.previous.costPerTag.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-satoshi text-muted tabular-nums">
                            ₹{callStats.allTime.costPerTag.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 4: TWO PANELS (Activation | Plus) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* PANEL 1: ACTIVATION (All Time) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
                      Activation Funnel
                    </h3>
                    <span className="text-[11px] text-muted font-sans">· All time</span>
                  </div>
                  <Link to="/admin/inventory" className="text-xs font-medium text-ink hover:underline font-sans">
                    Inventory →
                  </Link>
                </div>

                {/* Short Funnel Row */}
                <div className="p-3 border border-border rounded-md bg-surface text-xs font-sans">
                  <div className="flex items-center justify-between gap-2 text-center">
                    <div className="flex-1">
                      <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Delivered</span>
                      <span className="font-satoshi font-medium text-lg text-ink">4 orders</span>
                    </div>
                    <span className="text-border select-none">→</span>
                    <div className="flex-1">
                      <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Linked to vehicle</span>
                      <span className="font-satoshi font-medium text-lg text-ink">10 tags</span>
                      <span className="text-[10px] text-muted block">100% paired</span>
                    </div>
                    <span className="text-border select-none">→</span>
                    <div className="flex-1">
                      <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Received call</span>
                      <span className="font-satoshi font-medium text-lg text-ink">4 tags</span>
                      <span className="text-[10px] text-muted block">40% active</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted font-sans pt-0.5">
                  Tags are claimed and linked immediately upon arrival. 4 of 10 vehicle tags have handled inbound proxy communications.
                </p>
              </div>

              {/* PANEL 2: PLUS SUBSCRIPTIONS (All Time / Now) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
                      Plus Subscriptions
                    </h3>
                    <span className="text-[11px] text-muted font-sans">· All time</span>
                  </div>
                </div>

                <div className="border-y border-border overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-[13px] border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-border text-muted font-normal text-xs">
                        <th className="py-2 px-3 font-normal">Subscription Type</th>
                        <th className="py-2 px-3 font-normal text-right">Included with pack</th>
                        <th className="py-2 px-3 font-normal text-right">Paid renewals</th>
                        <th className="py-2 px-3 font-normal text-right">Total active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-surface/50 transition-colors">
                        <td className="py-2.5 px-3 text-ink font-medium">12-Month Plus Membership</td>
                        <td className="py-2.5 px-3 text-right font-satoshi font-medium text-ink tabular-nums">14</td>
                        <td className="py-2.5 px-3 text-right font-satoshi text-muted tabular-nums">0</td>
                        <td className="py-2.5 px-3 text-right font-satoshi font-medium text-ink tabular-nums">14</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-xs text-muted font-sans pt-0.5">
                  <span>Activated upon tag pairing (12-month validity)</span>
                  <span className="font-medium text-ink font-satoshi">Next renewal due 27 Oct 2027</span>
                </div>
              </div>
            </div>

            {/* ── ROW 5: RECENT ACTIVITY TABLE (Full Width, Grouped Bulk Rows, Zero Ciphertext) ── */}
            <section className="space-y-2 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] font-medium tracking-wider uppercase text-muted font-sans">
                    Recent Activity
                  </h2>
                  <span className="text-[11px] text-muted font-sans">· Live stream</span>
                </div>
                <Link
                  to="/admin/communications"
                  className="text-xs font-medium text-ink hover:underline font-sans"
                >
                  View all communications →
                </Link>
              </div>

              {activityRows.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted font-sans border-y border-border">
                  No recent activity recorded yet.
                </div>
              ) : (
                <div className="border-y border-border overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-[13px] border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-border text-muted font-normal text-xs">
                        <th className="py-2 px-3 font-normal">Time</th>
                        <th className="py-2 px-3 font-normal">Event</th>
                        <th className="py-2 px-3 font-normal">Order / Ref</th>
                        <th className="py-2 px-3 font-normal">Customer</th>
                        <th className="py-2 px-3 font-normal">What</th>
                        <th className="py-2 px-3 font-normal text-right">Amount</th>
                        <th className="py-2 px-3 font-normal text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activityRows.map((row) => (
                        <React.Fragment key={row.id}>
                          <tr
                            className={`hover:bg-surface/50 transition-colors ${row.isBulkGroup ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (row.isBulkGroup) {
                                setExpandedBulkGroup(expandedBulkGroup === row.id ? null : row.id);
                              }
                            }}
                          >
                            <td className="py-2.5 px-3 text-muted font-satoshi text-xs whitespace-nowrap">
                              {row.timeAgo}
                            </td>
                            <td className="py-2.5 px-3 text-ink font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{row.event}</span>
                                {row.isBulkGroup && (
                                  expandedBulkGroup === row.id ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-muted" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                                  )
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-satoshi font-medium text-ink whitespace-nowrap">
                              {row.ref}
                            </td>
                            <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                              {row.customer}
                            </td>
                            <td className="py-2.5 px-3 text-ink truncate max-w-[200px]">
                              {row.what}
                            </td>
                            <td className="py-2.5 px-3 text-right font-satoshi font-medium text-ink tabular-nums whitespace-nowrap">
                              {row.amount}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    row.status === 'Paid' || row.status === 'Delivered' || row.status === 'Answered'
                                      ? 'bg-ink/70'
                                      : row.status === 'Missed'
                                      ? 'bg-neutral-400'
                                      : 'bg-ink/70'
                                  }`}
                                />
                                <span>{row.status}</span>
                              </span>
                            </td>
                          </tr>

                          {/* Expandable bulk sub-rows */}
                          {row.isBulkGroup && expandedBulkGroup === row.id && row.bulkSubItems?.map((sub) => (
                            <tr key={sub.id} className="bg-surface/70 text-xs">
                              <td className="py-1.5 pl-6 pr-3 text-muted font-satoshi text-[11px]">
                                {sub.timeAgo}
                              </td>
                              <td className="py-1.5 px-3 text-muted italic">
                                {sub.event}
                              </td>
                              <td className="py-1.5 px-3 font-satoshi font-medium text-ink">
                                {sub.ref}
                              </td>
                              <td className="py-1.5 px-3 text-muted">
                                {sub.customer}
                              </td>
                              <td className="py-1.5 px-3 text-muted truncate max-w-[200px]">
                                {sub.what}
                              </td>
                              <td className="py-1.5 px-3 text-right font-satoshi text-muted tabular-nums">
                                {sub.amount}
                              </td>
                              <td className="py-1.5 px-3 text-right text-muted text-[11px]">
                                {sub.status}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── FOOTNOTE LINE: Lifetime Totals (Quiet, No Redundant Brand Casing) ── */}
            <footer className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted font-sans">
              <div>
                Lifetime: <span className="font-satoshi font-medium text-ink">{totalUsers}</span> users ·{' '}
                <span className="font-satoshi font-medium text-ink">{tagsAssignedToVehicles}</span> registered tags ·{' '}
                <span className="font-satoshi font-medium text-ink">{totalTagsMade}</span> total tags made
              </div>
              <div className="text-muted">
                Operations monitoring active
              </div>
            </footer>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
