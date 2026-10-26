import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { StoreHeader, StoreFooter } from '../../components/store';
import { trackOrderPublicly } from '../../services/checkout';
import { getProductThumbnail } from '../../features/store/catalog';
import type { UnifiedOrderTrackingData, TrackingMilestone } from '../../types/orders';
import {
  Search,
  Truck,
  Package,
  Check,
  Copy,
  Clock,
  ExternalLink,
  MapPin,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  X,
} from 'lucide-react';

export const OrderTrackingPage: React.FC = () => {
  const { identifier, orderId } = useParams<{ identifier?: string; orderId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = identifier || orderId || searchParams.get('order') || searchParams.get('id') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [trackingData, setTrackingData] = useState<UnifiedOrderTrackingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchTracking = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTrackingData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await trackOrderPublicly(trimmed);
      setTrackingData(data);
    } catch (err: any) {
      setTrackingData(null);
      setError(err.message || 'No shipment or order found matching this reference.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when initialQuery from URL changes
  useEffect(() => {
    if (!initialQuery) return;
    let ignore = false;

    trackOrderPublicly(initialQuery.trim())
      .then((data) => {
        if (!ignore) {
          setTrackingData(data);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          setTrackingData(null);
          setError(err.message || 'No shipment or order found matching this reference.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setSearchParams({ order: trimmed });
    fetchTracking(trimmed);
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
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

  const getStatusBadgeClass = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('DELIVER') || s.includes('COMPLETED')) {
      return 'bg-ink text-surface border-ink';
    }
    if (s.includes('CANCEL') || s.includes('FAIL')) {
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    }
    return 'bg-surface border-border text-ink';
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink flex flex-col">
      <StoreHeader />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Page Hero Header */}
        <section className="mb-8">
          <p className="font-satoshi text-xs font-medium tracking-wider text-muted uppercase mb-1">
            Logistics &amp; Delivery Status
          </p>
          <h1 className="font-sans text-3xl sm:text-4xl font-medium text-ink tracking-tight">
            Track your order.
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted font-satoshi">
            Enter your order reference (e.g. KT09..) or courier AWB code to view live dispatch milestones.
          </p>

          {/* Search Bar Form */}
          <form onSubmit={handleSearchSubmit} className="mt-5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Order ID or Courier AWB number"
                className="w-full pl-10 pr-9 py-2.5 bg-surface border border-border rounded text-xs sm:text-sm text-ink font-satoshi font-medium placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer p-0.5"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-5 py-2.5 bg-ink text-surface text-xs uppercase tracking-wider font-satoshi font-medium rounded hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Tracking...</span>
                </>
              ) : (
                <>
                  <span>Track</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </section>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="py-16 text-center text-muted border-t border-border">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink mb-3" />
            <p className="text-xs font-satoshi font-medium uppercase tracking-wider">
              Retrieving live shipment milestones...
            </p>
          </div>
        )}

        {/* Error Notification */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-lg border border-red-500/30 bg-surface text-xs space-y-2 mb-8"
          >
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="text-muted font-satoshi pl-6">
              Please verify that you entered the correct order ID from your confirmation email/SMS, or check the AWB code provided by the courier partner.
            </p>
          </motion.div>
        )}

        {/* Tracking Data Content */}
        {trackingData && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* Primary Order Details Bar (Clean Two-Column Grid) */}
            <section className="border-t border-border pt-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-6 border-b border-border">
                {/* Order Reference with Copy Button */}
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                    Order Reference
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-satoshi font-medium text-sm sm:text-base text-ink tracking-tight break-all">
                      {trackingData.orderNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(trackingData.orderNumber, 'order')}
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        copiedKey === 'order' ? 'text-ink' : 'text-muted hover:text-ink'
                      }`}
                      title="Copy order number"
                      aria-label="Copy order number"
                    >
                      {copiedKey === 'order' ? (
                        <Check className="w-3.5 h-3.5 text-ink stroke-[2.5]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Status Badge */}
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                    Fulfillment Status
                  </span>
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-satoshi font-medium border ${getStatusBadgeClass(
                        trackingData.status
                      )}`}
                    >
                      {trackingData.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Placed Date */}
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                    Order Date
                  </span>
                  <span className="font-satoshi font-medium text-sm text-ink block">
                    {formatDate(trackingData.createdAt) || 'Recent'}
                  </span>
                </div>

                {/* Quick Refresh */}
                <div className="space-y-1 flex sm:flex-col sm:items-end justify-between items-center">
                  <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                    Live Sync
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchTracking(trackingData.orderNumber)}
                    className="inline-flex items-center gap-1 text-[11px] font-satoshi font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Internal Milestones Timeline */}
            <section aria-label="Order Milestones" className="border-t border-border pt-6 pb-6">
              <h2 className="text-xs uppercase tracking-wider font-satoshi font-medium text-muted mb-5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <span>Lifecycle Milestones</span>
              </h2>

              <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                {trackingData.internalMilestones && trackingData.internalMilestones.length > 0 ? (
                  trackingData.internalMilestones.map((m: TrackingMilestone, idx: number) => {
                    const isCompleted = m.status === 'COMPLETED';
                    const isInProgress = m.status === 'IN_PROGRESS';

                    return (
                      <div key={m.key || idx} className="relative flex items-start gap-3.5 group">
                        {/* Milestone Indicator Icon */}
                        <div
                          className={`absolute -left-6 sm:-left-8 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isCompleted
                              ? 'bg-ink text-surface border-ink'
                              : isInProgress
                              ? 'bg-surface border-ink text-ink ring-2 ring-ink/10'
                              : 'bg-surface text-muted/30 border-border'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3 h-3 text-surface stroke-[2.5]" />
                          ) : isInProgress ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-border" />
                          )}
                        </div>

                        {/* Milestone Description */}
                        <div className="flex-1 -mt-0.5">
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <p
                              className={`text-xs sm:text-sm font-satoshi font-medium ${
                                isCompleted
                                  ? 'text-ink'
                                  : isInProgress
                                  ? 'text-ink font-semibold'
                                  : 'text-muted/60'
                              }`}
                            >
                              {m.label}
                            </p>
                            {m.timestamp && (
                              <span className="text-[10px] font-satoshi text-muted/70">
                                {formatDate(m.timestamp)}
                              </span>
                            )}
                          </div>
                          {isInProgress && (
                            <p className="text-[11px] text-muted font-satoshi mt-0.5">
                              Currently in fulfillment pipeline.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted font-satoshi">No milestones logged yet.</p>
                )}
              </div>
            </section>

            {/* Courier & Shipment Details (If Dispatched) */}
            {trackingData.shipment ? (
              <section aria-label="Courier Logistics" className="border-t border-border pt-6 pb-6">
                <h2 className="text-xs uppercase tracking-wider font-satoshi font-medium text-muted mb-4 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-muted" />
                  <span>Courier Dispatch &amp; Tracking</span>
                </h2>

                <div className="p-4 sm:p-5 rounded-lg bg-surface border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="space-y-0.5">
                      <p className="font-satoshi font-medium text-xs sm:text-sm text-ink">
                        {trackingData.shipment.courierName || 'Express Courier Partner'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted font-satoshi">
                          AWB: <strong className="text-ink font-mono">{trackingData.shipment.awbCode}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(trackingData.shipment?.awbCode || '', 'awb')}
                          className="text-muted hover:text-ink cursor-pointer p-0.5"
                          title="Copy AWB code"
                          aria-label="Copy AWB code"
                        >
                          {copiedKey === 'awb' ? (
                            <Check className="w-3 h-3 text-ink stroke-[2.5]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Carrier External Link */}
                    {trackingData.shipment.trackingUrl && (
                      <a
                        href={trackingData.shipment.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg border border-border text-ink hover:border-ink text-xs font-satoshi font-medium transition-colors shrink-0"
                      >
                        <span>Carrier Portal</span>
                        <ExternalLink className="w-3 h-3 text-muted" />
                      </a>
                    )}
                  </div>

                  {/* Carrier Live Activities Feed */}
                  {trackingData.shipment.carrierLiveTracking?.activities &&
                  trackingData.shipment.carrierLiveTracking.activities.length > 0 ? (
                    <div className="space-y-3 pt-1">
                      <span className="text-[10px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                        Live Carrier Transit Events
                      </span>
                      <div className="divide-y divide-border/60">
                        {trackingData.shipment.carrierLiveTracking.activities.map((act, i) => (
                          <div key={i} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-satoshi font-medium text-ink">{act.activity}</p>
                              {act.location && (
                                <p className="text-[11px] text-muted font-satoshi flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted/60 shrink-0" />
                                  <span>{act.location}</span>
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] font-satoshi text-muted shrink-0">
                              {formatDate(act.date)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted font-satoshi">
                      Shipment dispatched. Live transit scan events will populate as the carrier scans your parcel at sorting hubs.
                    </p>
                  )}
                </div>
              </section>
            ) : (
              <section className="border-t border-border pt-6 pb-6">
                <div className="p-4 rounded-lg bg-surface border border-border/80 flex items-center gap-3 text-xs text-muted font-satoshi">
                  <Package className="w-4 h-4 text-muted shrink-0" />
                  <span>
                    Your package is currently in queue at the fulfillment warehouse. Courier AWB and live transit telemetry will appear as soon as the parcel is handed over.
                  </span>
                </div>
              </section>
            )}

            {/* Destination & Items Overview (Clean Line Separation) */}
            <section className="border-t border-border pt-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
              {/* Shipping Address */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                  Delivery Destination
                </span>
                {trackingData.shippingAddress ? (
                  <div className="space-y-0.5 text-muted font-satoshi text-xs sm:text-sm">
                    <p className="font-medium text-ink">
                      {trackingData.shippingAddress.fullName}
                    </p>
                    {trackingData.shippingAddress.addressLine1 && (
                      <p>{trackingData.shippingAddress.addressLine1}</p>
                    )}
                    {trackingData.shippingAddress.addressLine2 && (
                      <p>{trackingData.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {trackingData.shippingAddress.city ? `${trackingData.shippingAddress.city}, ` : ''}
                      {trackingData.shippingAddress.state} —{' '}
                      <span className="font-medium text-ink">
                        {trackingData.shippingAddress.postalCode}
                      </span>
                    </p>
                    {trackingData.shippingAddress.country && trackingData.shippingAddress.country !== 'IN' && (
                      <p>{trackingData.shippingAddress.country}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted font-satoshi">Verified Indian Delivery Address</p>
                )}
              </div>

              {/* Items Summary */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                  Items in Shipment
                </span>
                <div className="divide-y divide-border/60">
                  {trackingData.items?.map((it, idx) => {
                    const itemName = it.name || it.productName || it.variantName || 'QR Tag Pack';
                    const itemImage = (it as any).imageUrl || (it as any).image || (it as any).darkImageUrl;
                    const imgSrc = getProductThumbnail(itemName, itemImage);
                    return (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded bg-surface border border-border/70 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                            <img
                              src={imgSrc}
                              alt={itemName}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-satoshi font-medium text-ink truncate">
                              {itemName}
                            </p>
                            <p className="text-[11px] text-muted font-satoshi">Qty: {it.quantity}</p>
                          </div>
                        </div>
                        <span className="font-satoshi font-medium text-ink shrink-0">
                          ₹{(it.totalPrice / 100).toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Bottom Navigation Controls */}
            <div className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-4 text-xs font-satoshi">
              <Link
                to="/shop"
                className="text-muted hover:text-ink transition-colors uppercase tracking-wider text-[11px] font-medium"
              >
                ← Return to Store
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  to="/pair"
                  className="px-3.5 py-2 rounded bg-surface border border-border text-ink hover:border-ink uppercase tracking-wider text-[11px] font-medium transition-colors"
                >
                  Pair a Tag
                </Link>
                <Link
                  to="/dashboard"
                  className="px-3.5 py-2 rounded bg-ink text-surface uppercase tracking-wider text-[11px] font-medium hover:opacity-90 transition-opacity"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <StoreFooter />
    </div>
  );
};
