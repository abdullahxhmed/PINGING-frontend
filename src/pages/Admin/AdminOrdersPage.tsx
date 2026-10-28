import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminOrder,
  AdminOrderMetrics,
  AdminOrderStatus,
} from '../../types/admin';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';
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

  const getStatusDot = (status: AdminOrderStatus | string) => {
    switch (status) {
      case 'PAID':
      case 'DELIVERED':
      case 'SHIPPED':
        return 'bg-emerald-600';
      case 'PAYMENT_PENDING':
        return 'bg-amber-500';
      case 'PACKING':
      case 'PACKED':
        return 'bg-ink/70';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-rose-500';
      case 'RECONCILIATION_REQUIRED':
        return 'bg-amber-600';
      default:
        return 'bg-muted/40';
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
      <div className="space-y-6 w-full max-w-5xl mx-auto">
        {/* ── 1. Flush Header & Refresh Action ── */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Orders
            </h1>
            <p className="text-xs text-muted font-sans mt-0.5">
              Live orders and fulfillment status
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData()}
              disabled={isLoading}
              className="p-2 border border-border rounded-md hover:bg-surface text-muted hover:text-ink transition-colors disabled:opacity-50"
              title="Refresh orders"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/admin/fulfillment"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-sans font-medium transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Fulfillment →</span>
            </Link>
          </div>
        </div>

        {/* ── 2. Metric Columns ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1">
          <div className="space-y-0.5">
            <span className="text-xs text-muted font-sans block">
              Total orders
            </span>
            <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
              {metrics ? metrics.totalOrders : total}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-xs text-muted font-sans block">
              Paid
            </span>
            <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
              {metrics ? metrics.paidOrders : '—'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-xs text-muted font-sans block">
              Gross revenue
            </span>
            <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
              {metrics ? `₹${metrics.totalRevenueRupees.toLocaleString('en-IN')}` : '—'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-xs text-muted font-sans block">
              Payment pending
            </span>
            <span className="font-satoshi font-medium text-2xl text-ink tracking-tight block">
              {metrics ? metrics.pendingOrders : '—'}
            </span>
          </div>
        </div>

        {/* ── 3. Filters: Search & Dropdown ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order ID, customer, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-md bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors font-sans"
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
          <div className="relative w-full sm:w-44">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full appearance-none pl-8 pr-8 py-2 text-xs rounded-md bg-surface border border-border text-ink focus:outline-none focus:border-ink transition-colors cursor-pointer font-sans"
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
          <div className="p-3 bg-surface border border-red-500/20 text-xs text-ink rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData()}
              className="text-xs text-muted hover:text-ink underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 4. Mobile View: Flush Separator-Line List ── */}
        <div className="block md:hidden">
          {isLoading && orders.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <RefreshCw className="w-4 h-4 animate-spin text-ink mx-auto mb-2" />
              <p className="text-xs font-sans">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-muted border-y border-border space-y-1 font-sans">
              <p className="font-medium text-ink text-xs">No orders found</p>
              <p className="text-xs text-muted">
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
                    className="py-3.5 px-0.5 flex items-stretch justify-between gap-3 hover:bg-surface/50 active:bg-surface transition-colors cursor-pointer select-none focus:outline-none"
                  >
                    {/* Left Column: Order ID & Customer Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-satoshi font-medium text-xs text-ink">
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
                        >
                          {copiedId === o.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted/40 hover:text-ink" />
                          )}
                        </button>
                      </div>

                      <p className="font-sans font-medium text-xs text-ink truncate pt-0.5">
                        {customerName}
                      </p>

                      {customerSub && (
                        <p className="text-xs text-muted font-satoshi truncate">
                          {customerSub}
                        </p>
                      )}

                      {metaLine && (
                        <p className="text-xs text-muted font-satoshi truncate">
                          {metaLine}
                        </p>
                      )}
                    </div>

                    {/* Right Column: Status & Price */}
                    <div className="shrink-0 flex flex-col justify-between items-end text-right pl-3">
                      {/* Text-only status with indicator */}
                      <span className="inline-flex items-center gap-1.5 text-xs font-sans text-muted">
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(o.status)}`} />
                        <span>{formatStatusLabel(o.status)}</span>
                      </span>

                      <div className="flex items-center gap-1.5 pt-2">
                        <span className="font-satoshi font-medium text-sm text-ink">
                          {formatPrice(o.totalAmount)}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-ink transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 5. Desktop View: Clean Line Table ── */}
        <div className="hidden md:block border-y border-border overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted font-sans text-xs">
                <th className="py-2.5 pr-4 font-normal">Order Number</th>
                <th className="py-2.5 px-4 font-normal">Customer &amp; Location</th>
                <th className="py-2.5 px-4 font-normal">Items</th>
                <th className="py-2.5 px-4 font-normal">Total</th>
                <th className="py-2.5 px-4 font-normal">Status</th>
                <th className="py-2.5 pl-4 font-normal text-right w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-ink" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted font-sans">
                    <p className="font-medium text-ink">No customer orders found</p>
                    <p className="text-xs text-muted">
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
                          <p className="text-xs text-muted font-satoshi font-medium">
                            {formatDate(o.createdAt)}
                          </p>
                        </div>
                      </td>

                      {/* Customer & Location */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-[200px]">
                          <p className="font-sans font-medium text-ink truncate">{customerName}</p>
                          <p className="text-xs text-muted font-satoshi font-medium truncate">
                            {phone || '—'}
                          </p>
                          {city && (
                            <p className="text-xs text-muted/80 font-sans truncate">
                              {city}{addr?.state ? `, ${addr.state}` : ''}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-[220px]">
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
                              <div key={idx} className="flex items-center gap-2 text-xs font-sans">
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
                                  <span className="text-muted font-satoshi font-medium shrink-0 text-xs">
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

                      {/* Status: Text-only with indicator dot */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-sans text-muted">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(o.status)}`} />
                          <span>{formatStatusLabel(o.status)}</span>
                        </span>
                      </td>

                      {/* Right Edge Action: Subtle Chevron */}
                      <td className="py-3 pl-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted/30 group-hover:text-ink transition-colors ml-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. Pagination ── */}
        {totalPages > 1 && (
          <div className="pt-2 flex items-center justify-between text-xs text-muted">
            <span className="text-xs font-satoshi font-medium">
              Page {page} of {totalPages} ({total} orders)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-border rounded text-xs font-sans text-ink hover:bg-surface disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-border rounded text-xs font-sans text-ink hover:bg-surface disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── 7. Detailed Order Inspection & Editing Modal ── */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onStatusChange={handleStatusChange}
            formatPrice={formatPrice}
            formatDate={formatDate}
            getStatusDot={getStatusDot}
            formatStatusLabel={formatStatusLabel}
            isUpdating={isUpdatingStatus === selectedOrder.id}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// =========================================================================
// Detailed Order Inspection & Edit Modal
// =========================================================================
interface OrderDetailModalProps {
  order: AdminOrder;
  onClose: () => void;
  onStatusChange: (orderId: string, status: AdminOrderStatus) => Promise<void>;
  formatPrice: (paise?: number) => string;
  formatDate: (iso: string) => string;
  getStatusDot: (status: AdminOrderStatus | string) => string;
  formatStatusLabel: (status: string) => string;
  isUpdating?: boolean;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onStatusChange,
  formatPrice,
  formatDate,
  getStatusDot,
  formatStatusLabel,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-bg border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <h3 className="font-satoshi font-medium text-base text-ink">
              {order.orderNumber}
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs font-sans text-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(order.status)}`} />
              <span>{formatStatusLabel(order.status)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink cursor-pointer p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans divide-y divide-border">
          {/* Status Editing Section */}
          <div className="space-y-2 pb-1">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-muted">
                Fulfillment status
              </span>
              <span className="text-muted">
                Current: <strong className="text-ink font-medium">{formatStatusLabel(order.status)}</strong>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as AdminOrderStatus)}
                disabled={busy}
                className="flex-1 py-1.5 px-3 rounded-md bg-surface border border-border text-xs font-sans text-ink focus:outline-none focus:border-ink cursor-pointer"
              >
                <option value="PAYMENT_PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="PACKING">Packing</option>
                <option value="PACKED">Packed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
                <option value="RECONCILIATION_REQUIRED">Reconciliation</option>
              </select>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={busy || targetStatus === order.status}
                className={`px-3.5 py-1.5 rounded-md text-xs font-sans font-medium transition-colors shrink-0 ${
                  busy || targetStatus === order.status
                    ? 'border border-border bg-surface text-muted/60 cursor-not-allowed'
                    : 'bg-ink text-bg hover:bg-ink/90 cursor-pointer'
                }`}
              >
                {busy ? 'Saving...' : 'Update status'}
              </button>
            </div>
          </div>

          {/* Customer & Shipping Summary */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted block">
                Customer
              </span>
              <p className="font-sans font-medium text-ink">
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
              <p className="text-xs text-muted font-satoshi pt-0.5">
                Placed: {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted block">
                Shipping address
              </span>
              <p className="text-ink leading-relaxed">
                {addr?.addressLine1}
                {addr?.addressLine2 ? `, ${addr.addressLine2}` : ''}
              </p>
              <p className="text-muted">
                {addr?.city}, {addr?.state} -{' '}
                <span className="font-satoshi font-medium text-ink">{addr?.postalCode}</span>
              </p>
              <p className="text-muted">{addr?.country || 'India'}</p>
            </div>
          </div>

          {/* Ordered Line Items */}
          <div className="pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink block">
                Ordered products ({order.items?.length || 0})
              </span>
              <span className="text-xs text-muted font-satoshi">
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

                return (
                  <div key={item.id} className="py-3 flex gap-3 items-start">
                    {/* Item Artwork Thumbnail */}
                    <div className="w-10 h-10 rounded border border-border bg-bg overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={imageSrc || DEFAULT_PRODUCT_IMAGE}
                        alt={`${prodName} (${varName})`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                        }}
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-sans font-medium text-ink text-xs leading-snug">
                            {prodName}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {varName && varName !== prodName && (
                              <span className="text-xs font-sans text-muted">
                                {varName}
                              </span>
                            )}
                            {sku && (
                              <span className="font-satoshi text-xs text-muted">
                                · {sku}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-satoshi font-medium text-xs text-ink">
                            {formatPrice(item.totalPrice)}
                          </p>
                          <p className="text-xs text-muted font-satoshi">
                            {item.quantity} × {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                      </div>

                      {/* Component breakdown */}
                      {snap?.components && snap.components.length > 0 && (
                        <div className="pt-0.5 flex flex-wrap gap-1 text-[11px] text-muted font-sans">
                          {snap.components.map((comp, cIdx) => (
                            <span key={cIdx}>
                              {comp.componentType === 'SERIALIZED_QR_TAG'
                                ? `${comp.quantity}× QR Tag`
                                : comp.componentType === 'DIGITAL_ENTITLEMENT'
                                ? `Plus Plan (${comp.plusDurationMonths || 12}M)`
                                : `${comp.quantity}× ${comp.name}`}
                              {cIdx < snap.components!.length - 1 ? ' · ' : ''}
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
            <div className="pt-4 space-y-1.5">
              <span className="text-xs text-muted block">
                Allocated tags ({order.allocatedTags.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {order.allocatedTags.map((tag) => (
                  <div
                    key={tag}
                    className="px-2 py-0.5 rounded border border-border font-satoshi font-medium text-xs text-ink flex items-center gap-1 bg-surface/50"
                  >
                    <Tag className="w-3 h-3 text-muted" />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Snapshot */}
          <div className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted block">
                Payment
              </span>
              <p className="font-sans font-medium text-ink">
                {order.payment?.provider || 'RAZORPAY'} ·{' '}
                <span className="font-sans text-muted">
                  {order.payment?.status ? formatStatusLabel(order.payment.status) : 'Pending'}
                </span>
              </p>
              {order.payment?.razorpayPaymentId && (
                <p className="font-satoshi text-xs text-muted mt-0.5">
                  ID: {order.payment.razorpayPaymentId}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-muted block font-sans">Grand total</span>
              <span className="text-base font-satoshi font-medium text-ink">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-border rounded-md text-xs font-sans text-ink hover:bg-surface transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
