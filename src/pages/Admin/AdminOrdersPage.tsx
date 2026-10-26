import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminOrder,
  AdminOrderMetrics,
  AdminOrderStatus,
} from '../../types/admin';
import {
  Search,
  RefreshCw,
  Copy,
  Check,
  X,
  ShieldAlert,
  Tag,
  Filter,
  ChevronRight,
  QrCode,
} from 'lucide-react';

const STATUS_OPTIONS: Array<{ label: string; value: 'ALL' | AdminOrderStatus }> = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Packing', value: 'PACKING' },
  { label: 'Packed', value: 'PACKED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Pending Payment', value: 'PAYMENT_PENDING' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
  { label: 'Reconciliation Required', value: 'RECONCILIATION_REQUIRED' },
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [metrics, setMetrics] = useState<AdminOrderMetrics | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminOrderStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ordersRes, metricsRes] = await Promise.allSettled([
        adminApi.getOrders({
          page,
          limit,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: debouncedSearch || undefined,
        }),
        adminApi.getOrderMetrics(),
      ]);

      if (ordersRes.status === 'fulfilled') {
        const payload = ordersRes.value?.data || ordersRes.value;
        setOrders(payload.orders || []);
        setTotal(payload.total ?? 0);
        setTotalPages(payload.totalPages ?? 1);
      } else {
        throw new Error(ordersRes.reason?.message || 'Failed to fetch orders');
      }

      if (metricsRes.status === 'fulfilled') {
        const mPayload = metricsRes.value?.data || metricsRes.value;
        setMetrics(mPayload);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders from server');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleStatusChange = async (orderId: string, nextStatus: AdminOrderStatus) => {
    setIsUpdatingStatus(orderId);
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }

    try {
      await adminApi.updateOrderStatus(orderId, nextStatus);
      // Refresh metrics silently
      adminApi.getOrderMetrics().then((res) => {
        const m = (res as any)?.data || res;
        if (m) setMetrics(m);
      }).catch(() => {});
    } catch (err: any) {
      alert(`Failed to update status: ${err.message || 'Server error'}`);
      loadData();
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const formatPrice = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toFixed(0)}`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: AdminOrderStatus | string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30';
      case 'PACKING':
        return 'bg-blue-500/10 text-blue-800 border-blue-500/30';
      case 'PACKED':
        return 'bg-purple-500/10 text-purple-800 border-purple-500/30';
      case 'SHIPPED':
        return 'bg-indigo-500/10 text-indigo-800 border-indigo-500/30';
      case 'DELIVERED':
        return 'bg-emerald-600/15 text-emerald-900 border-emerald-600/40 font-semibold';
      case 'PAYMENT_PENDING':
        return 'bg-amber-500/10 text-amber-800 border-amber-500/30';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-500/10 text-red-800 border-red-500/30';
      case 'RECONCILIATION_REQUIRED':
        return 'bg-amber-600/10 text-amber-900 border-amber-600/30 font-semibold';
      default:
        return 'bg-bg text-muted border-border';
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case 'PAYMENT_PENDING':
        return 'Pending';
      case 'PAID':
        return 'Paid';
      case 'PACKING':
        return 'Packing';
      case 'PACKED':
        return 'Packed';
      case 'SHIPPED':
        return 'Shipped';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      case 'REFUNDED':
        return 'Refunded';
      case 'RECONCILIATION_REQUIRED':
        return 'Reconciliation';
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 w-full">
        {/* ── 1. Flush Header & Refresh Action ── */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Orders
            </h1>
            <p className="text-[11px] sm:text-xs text-muted">
              Live orders and fulfillment status
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/fulfillment"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold font-satoshi inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Fulfillment →</span>
            </Link>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={isLoading}
              className="btn btn-secondary !min-h-[34px] !py-0 !px-3 text-xs flex items-center gap-1.5 shrink-0"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 2. Metric Columns (Clean Alignment, Metric-First Focus) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 py-2">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
              Total Orders
            </span>
            <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight block">
              {metrics ? metrics.totalOrders : total}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
              Paid
            </span>
            <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-emerald-600 tracking-tight block">
              {metrics ? metrics.paidOrders : '—'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
              Gross Revenue
            </span>
            <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-ink tracking-tight block">
              {metrics ? `₹${metrics.totalRevenueRupees.toLocaleString('en-IN')}` : '—'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted tracking-wider uppercase font-medium block">
              Payment Pending
            </span>
            <span className="font-satoshi font-semibold text-2xl sm:text-3xl text-amber-600 tracking-tight block">
              {metrics ? metrics.pendingOrders : '—'}
            </span>
          </div>
        </div>

        {/* ── 3. Filters: Search & Dropdown (Clean, Minimal, Edge-to-Edge) ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order ID, customer, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-sm bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="relative w-full sm:w-48">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full appearance-none pl-8 pr-8 py-2 text-xs rounded-sm bg-surface border border-border text-ink font-medium focus:outline-none focus:border-ink transition-colors cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-[10px]">
              ▼
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 border-y border-red-500/30 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData()}
              className="underline font-semibold hover:opacity-80 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 4. Mobile View: Flush Separator-Line List (No Cards, Max Width) ── */}
        <div className="block md:hidden">
          {isLoading && orders.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <RefreshCw className="w-4 h-4 animate-spin text-ink mx-auto mb-2" />
              <p className="text-xs">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-muted border-y border-border space-y-1">
              <p className="font-medium text-ink text-xs">No orders found</p>
              <p className="text-[11px] text-muted">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or status filter'
                  : 'Orders placed on the storefront will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {orders.map((o) => {
                const addr = o.shippingAddress;
                const customerName = addr?.fullName || o.user?.name || 'Customer';
                const phone = o.customerPhone || addr?.phoneNumber;
                const city = addr?.city;
                const itemsCount = o.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
                const primaryVariant = o.items?.[0]?.variantName || 'Tag Pack';
                const customerSub = [phone, city].filter(Boolean).join(' · ');
                const productSummary = primaryVariant ? `${primaryVariant}${itemsCount > 1 ? ` ×${itemsCount}` : ''}` : null;
                const metaLine = [productSummary, formatDate(o.createdAt)].filter(Boolean).join(' · ');

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedOrder(o);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Order ${o.orderNumber}, ${customerName}, ${formatPrice(o.totalAmount)}, ${o.status}`}
                    className="group py-3 px-0.5 sm:px-1 flex items-stretch justify-between gap-3 hover:bg-surface/60 active:bg-surface transition-colors cursor-pointer select-none focus:outline-none focus-visible:bg-surface/80"
                  >
                    {/* Left Column: Order ID & Customer Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {/* Order Number + Independent Copy Button */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-satoshi font-medium text-xs sm:text-sm text-ink tracking-tight">
                          {o.orderNumber}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(o.orderNumber, o.id);
                          }}
                          className="p-1 text-muted hover:text-ink transition-colors cursor-pointer rounded"
                          title="Copy order number"
                          aria-label="Copy order number"
                        >
                          {copiedId === o.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted/50 hover:text-ink" />
                          )}
                        </button>
                      </div>

                      {/* Customer Name */}
                      <p className="font-medium text-xs sm:text-sm text-ink truncate pt-0.5">
                        {customerName}
                      </p>

                      {/* Phone · City */}
                      {customerSub && (
                        <p className="text-[11px] sm:text-xs text-muted font-satoshi truncate">
                          {customerSub}
                        </p>
                      )}

                      {/* Product Bundle · Timestamp */}
                      {metaLine && (
                        <p className="text-[11px] sm:text-xs text-muted/80 font-satoshi truncate">
                          {metaLine}
                        </p>
                      )}
                    </div>

                    {/* Right Column: Status & Price (Aligned to the same fixed edge) */}
                    <div className="shrink-0 flex flex-col justify-between items-end text-right pl-3">
                      {/* Top: Status Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-satoshi font-medium border ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {formatStatusLabel(o.status)}
                      </span>

                      {/* Bottom: Price + Subtle Hover Chevron */}
                      <div className="flex items-center gap-1.5 pt-2">
                        <span className="font-satoshi font-medium text-sm sm:text-base text-ink">
                          {formatPrice(o.totalAmount)}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 5. Desktop View: Clean Line Table (No Bulky Card Wrap) ── */}
        <div className="hidden md:block border-y border-border overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted font-satoshi uppercase text-[10px] tracking-wider">
                <th className="py-2.5 pr-4 font-medium">Order Number</th>
                <th className="py-2.5 px-4 font-medium">Customer &amp; Location</th>
                <th className="py-2.5 px-4 font-medium">Items</th>
                <th className="py-2.5 px-4 font-medium">Total</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 pl-4 font-medium text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-ink" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    <p className="font-medium text-ink">No customer orders found</p>
                    <p className="text-[11px] text-muted">
                      {searchTerm || statusFilter !== 'ALL'
                        ? 'Try adjusting your search query or filter selection.'
                        : 'Orders placed on the storefront will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const addr = o.shippingAddress;
                  const customerName = addr?.fullName || o.user?.name || 'Customer';
                  const phone = o.customerPhone || addr?.phoneNumber;
                  const city = addr?.city;

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-surface/50 transition-colors cursor-pointer group"
                    >
                      {/* Order Number in Satoshi Medium + Timestamp */}
                      <td className="py-3 pr-4">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(o.orderNumber, o.id);
                            }}
                            className="font-satoshi font-medium text-xs text-ink hover:underline inline-flex items-center gap-1.5"
                            title="Click to copy order number"
                          >
                            <span>{o.orderNumber}</span>
                            {copiedId === o.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted/40 hover:text-ink" />
                            )}
                          </button>
                          <p className="text-[10px] text-muted font-satoshi font-medium">
                            {formatDate(o.createdAt)}
                          </p>
                        </div>
                      </td>

                      {/* Customer & Location */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-[200px]">
                          <p className="font-medium text-ink truncate">{customerName}</p>
                          <p className="text-[11px] text-muted font-satoshi font-medium truncate">
                            {phone || '—'}
                          </p>
                          {city && (
                            <p className="text-[10px] text-muted/80 truncate">
                              {city}{addr?.state ? `, ${addr.state}` : ''}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5 max-w-[220px]">
                          {o.items?.map((it, idx) => {
                            const snap = it.productSnapshot;
                            const prodName = it.productName || snap?.product?.name || it.variant?.product?.name || it.variantName;
                            const varName = it.variantName || snap?.variant?.name || it.variant?.name;
                            const imgSrc =
                              it.imageUrl ||
                              snap?.variant?.imageUrl ||
                              snap?.product?.imageUrl ||
                              it.variant?.imageUrl ||
                              it.variant?.product?.imageUrl;

                            return (
                              <div key={idx} className="flex items-center gap-2 text-[11px]">
                                <div className="w-6 h-6 rounded border border-border bg-bg overflow-hidden shrink-0 flex items-center justify-center">
                                  {imgSrc ? (
                                    <img
                                      src={imgSrc}
                                      alt={varName || prodName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <Tag className="w-3 h-3 text-muted/40" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 flex items-baseline justify-between gap-1">
                                  <span className="font-medium text-ink truncate" title={`${prodName} (${varName})`}>
                                    {prodName !== varName ? `${prodName} (${varName})` : prodName}
                                  </span>
                                  <span className="text-muted font-satoshi font-medium shrink-0 text-[10px]">
                                    ×{it.quantity}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Total Amount in Satoshi Medium */}
                      <td className="py-3 px-4">
                        <span className="font-satoshi font-medium text-xs text-ink">
                          {formatPrice(o.totalAmount)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-[11px] font-satoshi font-medium border ${getStatusBadge(
                            o.status
                          )}`}
                        >
                          {formatStatusLabel(o.status)}
                        </span>
                      </td>

                      {/* Right Edge Action: Subtle Chevron */}
                      <td className="py-3 pl-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted/30 group-hover:text-ink group-hover:translate-x-0.5 transition-all ml-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. Pagination (Clean Flat Bar) ── */}
        {totalPages > 1 && (
          <div className="pt-2 flex items-center justify-between text-xs text-muted">
            <span className="text-[11px] font-satoshi font-medium">
              Page {page} of {totalPages} ({total} orders)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary !min-h-[30px] !py-0 !px-2.5 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary !min-h-[30px] !py-0 !px-2.5 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── 7. Detailed Order Inspection & Editing Modal (Clean Lines, Zero Nested Cards) ── */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onStatusChange={handleStatusChange}
            formatPrice={formatPrice}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            isUpdating={isUpdatingStatus === selectedOrder.id}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// =========================================================================
// Detailed Order Inspection & Edit Modal (Clean Line Separation)
// =========================================================================
interface OrderDetailModalProps {
  order: AdminOrder;
  onClose: () => void;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => Promise<void>;
  formatPrice: (paise?: number) => string;
  formatDate: (iso: string) => string;
  getStatusBadge: (status: AdminOrderStatus | string) => string;
  isUpdating?: boolean;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onStatusChange,
  formatPrice,
  formatDate,
  getStatusBadge,
  isUpdating = false,
}) => {
  const addr = order.shippingAddress;
  const [targetStatus, setTargetStatus] = useState<AdminOrderStatus>(order.status);
  const [localUpdating, setLocalUpdating] = useState(false);

  useEffect(() => {
    setTargetStatus(order.status);
  }, [order.status]);

  const handleUpdate = async () => {
    if (targetStatus === order.status) return;
    setLocalUpdating(true);
    await onStatusChange(order.id, targetStatus);
    setLocalUpdating(false);
  };

  const busy = isUpdating || localUpdating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-satoshi font-medium text-sm text-ink">
              {order.orderNumber}
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-satoshi font-medium border ${getStatusBadge(
                order.status
              )}`}
            >
              {order.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Clean Line Dividers, No Nested Cards) */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs divide-y divide-border">
          {/* Status Editing Section */}
          <div className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-satoshi uppercase text-[10px] font-medium text-muted">
                Fulfillment Status
              </span>
              <span className="text-[11px] text-muted">
                Current: <strong className="text-ink font-satoshi font-medium">{order.status}</strong>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as AdminOrderStatus)}
                disabled={busy}
                className="flex-1 py-1.5 px-2.5 rounded-sm bg-bg border border-border text-xs text-ink font-medium focus:outline-none focus:border-ink cursor-pointer"
              >
                <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                <option value="PAID">PAID</option>
                <option value="PACKING">PACKING</option>
                <option value="PACKED">PACKED</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
                <option value="RECONCILIATION_REQUIRED">RECONCILIATION_REQUIRED</option>
              </select>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={busy || targetStatus === order.status}
                className="btn btn-primary !min-h-[34px] !py-0 !px-4 text-xs shrink-0"
              >
                {busy ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>

          {/* Customer & Shipping Summary (Divided by Line) */}
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="font-satoshi uppercase text-[10px] font-medium text-muted block">
                Customer Info
              </span>
              <p className="font-medium text-ink">
                {addr?.fullName || order.user?.name || 'Guest User'}
              </p>
              <p className="text-muted">
                Phone:{' '}
                <span className="text-ink font-satoshi font-medium">
                  {order.customerPhone || addr?.phoneNumber || '—'}
                </span>
              </p>
              {order.customerEmail && (
                <p className="text-muted truncate">
                  Email: <span className="text-ink">{order.customerEmail}</span>
                </p>
              )}
              <p className="text-[10px] text-muted font-satoshi font-medium pt-0.5">
                Placed: {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-satoshi uppercase text-[10px] font-medium text-muted block">
                Shipping Address
              </span>
              <p className="text-ink leading-relaxed">
                {addr?.addressLine1}
                {addr?.addressLine2 ? `, ${addr.addressLine2}` : ''}
              </p>
              <p className="text-muted">
                {addr?.city}, {addr?.state} -{' '}
                <span className="font-satoshi font-medium text-ink">{addr?.postalCode}</span>
              </p>
              <p className="text-[11px] text-muted">{addr?.country || 'India'}</p>
            </div>
          </div>

          {/* Ordered Line Items */}
          {/* Ordered Line Items */}
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-satoshi uppercase text-[10px] font-medium text-muted block">
                Ordered Products ({order.items?.length || 0})
              </span>
              <span className="text-[11px] text-muted font-satoshi">
                {order.itemCount || order.items?.reduce((s, it) => s + it.quantity, 0) || 0} total units
              </span>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {order.items?.map((item) => {
                const snap = item.productSnapshot;
                const prodName =
                  item.productName || snap?.product?.name || item.variant?.product?.name || item.variantName || 'Product';
                const varName = item.variantName || snap?.variant?.name || item.variant?.name || '';
                const sku =
                  snap?.variant?.sku || item.variant?.sku || snap?.product?.sku || item.variant?.product?.sku;
                const imageSrc =
                  item.imageUrl ||
                  snap?.variant?.imageUrl ||
                  snap?.product?.imageUrl ||
                  item.variant?.imageUrl ||
                  item.variant?.product?.imageUrl;

                const isLight =
                  varName.toLowerCase().includes('light') ||
                  (sku && sku.toLowerCase().includes('lit'));
                const isDark =
                  varName.toLowerCase().includes('dark') ||
                  (sku && sku.toLowerCase().includes('drk'));

                return (
                  <div key={item.id} className="py-3 flex gap-3 items-start">
                    {/* Item Artwork Thumbnail */}
                    <div className="w-12 h-12 rounded-md border border-border bg-bg overflow-hidden shrink-0 relative flex items-center justify-center">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={`${prodName} (${varName})`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Tag className="w-5 h-5 text-muted/40" />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink text-xs leading-snug">
                            {prodName}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {varName && varName !== prodName && (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-satoshi font-medium border ${
                                  isDark
                                    ? 'bg-[#151513] text-[#f5f4ee] border-[#383730]'
                                    : isLight
                                    ? 'bg-[#f0eee6] text-ink border-[#aaa79c]'
                                    : 'bg-surface text-ink border-border'
                                }`}
                              >
                                {varName}
                              </span>
                            )}
                            {sku && (
                              <span className="font-mono text-[10px] text-muted">
                                {sku}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-satoshi font-medium text-xs text-ink">
                            {formatPrice(item.totalPrice)}
                          </p>
                          <p className="text-[10px] text-muted font-satoshi">
                            {item.quantity} × {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                      </div>

                      {/* Component breakdown */}
                      {snap?.components && snap.components.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1">
                          {snap.components.map((comp, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-1.5 py-0.5 rounded border border-border/70 text-[10px] font-satoshi text-muted bg-surface/50"
                            >
                              {comp.componentType === 'SERIALIZED_QR_TAG'
                                ? `🏷️ ${comp.quantity}x QR Tag`
                                : comp.componentType === 'DIGITAL_ENTITLEMENT'
                                ? `✨ Plus Plan (${comp.plusDurationMonths || 12}M)`
                                : `📦 ${comp.quantity}x ${comp.name}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tag Allocations */}
          {order.allocatedTags && order.allocatedTags.length > 0 && (
            <div className="pt-3 space-y-1.5">
              <span className="font-satoshi uppercase text-[10px] font-medium text-muted block">
                Allocated Tags ({order.allocatedTags.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {order.allocatedTags.map((tag) => (
                  <div
                    key={tag}
                    className="px-2 py-0.5 rounded border border-border font-satoshi font-medium text-xs text-ink flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3 text-accent" />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Snapshot */}
          <div className="pt-3 flex items-center justify-between">
            <div>
              <span className="font-satoshi uppercase text-[10px] font-medium text-muted block">
                Payment
              </span>
              <p className="font-medium text-ink">
                {order.payment?.provider || 'RAZORPAY'} ·{' '}
                <span
                  className={`font-satoshi uppercase font-medium ${
                    order.payment?.status === 'CAPTURED'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {order.payment?.status || 'PENDING'}
                </span>
              </p>
              {order.payment?.razorpayPaymentId && (
                <p className="font-satoshi font-medium text-[10px] text-muted">
                  ID: {order.payment.razorpayPaymentId}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted block font-satoshi uppercase">Grand Total</span>
              <span className="text-sm font-satoshi font-medium text-ink">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary !min-h-[32px] !py-0 !px-4 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
