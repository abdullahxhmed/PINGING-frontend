import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { StoreHeader } from '../../components/store/StoreHeader';
import { StoreFooter } from '../../components/store/StoreFooter';
import {
  getOrderFromStorage,
  type OrderRecord,
  getProductThumbnail,
  DEFAULT_PRODUCT_IMAGE,
} from '../../features/store/catalog';
import { getOrderStatus } from '../../services/checkout';
import type { OrderStatusData } from '../../types/orders';
import { triggerConfetti } from '../../lib/confetti';
import {
  Check,
  Copy,
  CheckCircle2,
  Truck,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const fromOrigin = (location.state as { from?: string } | null)?.from;

  const [order] = useState<OrderRecord | null>(() => {
    return orderId ? getOrderFromStorage(orderId) : null;
  });
  const [liveOrder, setLiveOrder] = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(orderId));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    // Fetch live status from backend
    let isSubscribed = true;
    getOrderStatus(orderId)
      .then((data) => {
        if (isSubscribed) {
          setLiveOrder(data);
        }
      })
      .catch(() => {
        // Silently keep storage fallback if backend is offline
      })
      .finally(() => {
        if (isSubscribed) {
          setLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [orderId]);

  // Trigger celebration confetti on mount when order is confirmed
  useEffect(() => {
    if (!loading && (order || liveOrder)) {
      const cleanup = triggerConfetti(3500);
      return cleanup;
    }
  }, [loading, order, liveOrder]);

  const handleCopyOrderNumber = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted mb-3" />
          <p className="text-xs text-muted font-satoshi font-medium uppercase tracking-wider">
            Loading your order confirmation...
          </p>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const orderNumber = liveOrder?.orderNumber || order?.orderId || orderId || '';
  const isPaid =
    liveOrder?.status === 'PAID' ||
    liveOrder?.paymentStatus === 'CAPTURED' ||
    order?.paymentGatewayStatus === 'PAID';

  if (!order && !liveOrder) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col">
        <StoreHeader />
        <main className="flex-1 max-w-xl mx-auto px-5 py-24 text-center">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-4" />
          <h1 className="font-sans text-2xl font-medium text-ink mb-2">Order Not Found</h1>
          <p className="text-sm text-muted mb-6 font-satoshi">
            We could not locate an order matching reference{' '}
            <span className="font-satoshi font-medium text-ink">{orderId || 'unknown'}</span>.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/#products"
              className="px-4 py-2 bg-ink text-surface text-xs uppercase tracking-wider font-satoshi font-medium rounded hover:opacity-90 transition-opacity"
            >
              Browse Tags
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 bg-surface border border-border text-ink text-xs uppercase tracking-wider font-satoshi font-medium rounded hover:border-ink transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const customerName =
    liveOrder?.shippingAddress?.fullName || order?.customer.fullName || 'Customer';
  const addressLine1 =
    liveOrder?.shippingAddress?.addressLine1 || order?.customer.addressLine;
  const addressLine2 =
    liveOrder?.shippingAddress?.addressLine2 || order?.customer.locality;
  const city = liveOrder?.shippingAddress?.city || order?.customer.city;
  const state = liveOrder?.shippingAddress?.state || order?.customer.state;
  const pincode = liveOrder?.shippingAddress?.postalCode || order?.customer.pincode;
  const country =
    liveOrder?.shippingAddress?.country && liveOrder.shippingAddress.country !== 'IN'
      ? liveOrder.shippingAddress.country
      : 'India';
  const phone =
    liveOrder?.shippingAddress?.phoneNumber || liveOrder?.customerPhone || order?.customer.mobileNumber;
  const totalAmountPaise = liveOrder?.totalAmount;
  const displayTotal = totalAmountPaise
    ? (totalAmountPaise / 100).toFixed(0)
    : order?.total?.toFixed(0) || '0';
  const dateStr = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink flex flex-col">
      <StoreHeader />

      <motion.main
        initial={fromOrigin === 'bottom' ? { opacity: 0, y: 50 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14"
      >
        {/* Hero Title & Status */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-satoshi font-medium text-ink mb-3">
            {isPaid ? (
              <Check className="w-3.5 h-3.5 text-ink stroke-[2.5]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
            <span>{isPaid ? 'Payment Confirmed' : 'Payment Awaiting Settlement'}</span>
          </div>

          <h1 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-medium text-ink tracking-tight leading-tight">
            Your tags are on the way to you.
          </h1>

          <p className="mt-2 text-sm text-muted font-satoshi">
            Thank you, {customerName}. Your order has been placed and is being prepared for express delivery.
          </p>
        </div>

        {/* Primary Information Section (Satoshi Medium + Copy Button) */}
        <section aria-label="Order Details" className="border-t border-border pt-6 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-4 pb-6 border-b border-border">
            {/* Order Number with Tactile Copy Icon */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                Order Reference
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-satoshi font-medium text-sm sm:text-base text-ink tracking-tight break-all">
                  {orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyOrderNumber(orderNumber)}
                  title={copied ? 'Copied' : 'Copy order reference'}
                  aria-label="Copy order reference"
                  className="p-1 rounded text-muted hover:text-ink transition-colors cursor-pointer active:scale-95 shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-ink stroke-[2.5]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                Placed On
              </span>
              <span className="font-satoshi font-medium text-sm sm:text-base text-ink">
                {dateStr}
              </span>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                Fulfillment Status
              </span>
              <span className="inline-flex items-center gap-1.5 font-satoshi font-medium text-sm sm:text-base text-ink">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {liveOrder?.status || 'Confirmed'}
              </span>
            </div>

            {/* Total Amount */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-satoshi font-medium text-muted block">
                Total Paid
              </span>
              <span className="font-satoshi font-medium text-base sm:text-lg text-ink font-semibold">
                ₹{displayTotal}
              </span>
            </div>
          </div>

          {/* Items Summary - Clean Line Layout */}
          <div className="pt-6">
            <h2 className="text-xs uppercase tracking-wider font-satoshi font-medium text-muted mb-3">
              Included In This Package
            </h2>
            <div className="divide-y divide-border/80">
              {liveOrder?.items && liveOrder.items.length > 0 ? (
                liveOrder.items.map((it, idx) => {
                  const title = it.productName || it.name || it.variantName;
                  const isVariantDistinct = Boolean(
                    it.variantName &&
                    it.productName &&
                    it.variantName.toLowerCase() !== it.productName.toLowerCase()
                  );
                  const variantSubtitle = isVariantDistinct
                    ? it.variantName.toLowerCase().includes('pack')
                      ? it.variantName
                      : `${it.variantName} finish`
                    : null;
                  const imgSrc = it.imageUrl || getProductThumbnail(title);

                  return (
                    <div key={it.id || idx} className="py-3 flex justify-between items-center text-xs sm:text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-surface border border-border/70 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={imgSrc}
                            alt={title}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <p className="font-satoshi font-medium text-ink">{title}</p>
                          <p className="text-[11px] text-muted font-satoshi">
                            {variantSubtitle ? `${variantSubtitle} · ` : ''}Quantity: {it.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-satoshi font-medium text-ink">
                        ₹{(it.totalPrice / 100).toFixed(0)}
                      </span>
                    </div>
                  );
                })
              ) : order?.items && order.items.length > 0 ? (
                order.items.map((it) => {
                  const imgSrc = getProductThumbnail(it.name, it.image);
                  return (
                    <div key={it.id} className="py-3 flex justify-between items-center text-xs sm:text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-surface border border-border/70 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={imgSrc}
                            alt={it.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <p className="font-satoshi font-medium text-ink">{it.name}</p>
                          <p className="text-[11px] text-muted font-satoshi">
                            {it.subtitle ? `${it.subtitle} · ` : ''}Qty: {it.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-satoshi font-medium text-ink">₹{it.totalPrice}</span>
                    </div>
                  );
                })
              ) : (
                <div className="py-3 flex justify-between items-center text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-surface border border-border/70 overflow-hidden shrink-0 flex items-center justify-center p-1">
                      <img
                        src={DEFAULT_PRODUCT_IMAGE}
                        alt="Smart QR Tag Pack"
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="font-satoshi font-medium text-ink">Smart QR Tag Pack</p>
                      <p className="text-[11px] text-muted font-satoshi">Complete Set</p>
                    </div>
                  </div>
                  <span className="font-satoshi font-medium text-ink">₹{displayTotal}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Shipping Details Section */}
        <section aria-label="Shipping Address" className="border-t border-border pt-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wider font-satoshi font-medium text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted" />
              <span>Shipping Destination</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="space-y-1">
              <p className="font-satoshi font-medium text-base text-ink">{customerName}</p>
              {addressLine1 && <p className="text-muted font-satoshi">{addressLine1}</p>}
              {addressLine2 && <p className="text-muted font-satoshi">{addressLine2}</p>}
              <p className="text-muted font-satoshi">
                {city ? `${city}, ` : ''}{state} —{' '}
                <span className="font-satoshi font-medium text-ink">{pincode}</span>
              </p>
              <p className="text-muted font-satoshi">{country}</p>
            </div>

            <div className="space-y-2 sm:text-right">
              {phone && (
                <div className="inline-flex sm:flex-row-reverse items-center gap-1.5 text-muted font-satoshi font-medium text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted" />
                  <span>{phone.startsWith('+') ? phone : `+91 ${phone}`}</span>
                </div>
              )}
              <div className="text-[11px] text-muted font-satoshi flex sm:justify-end items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <span>Standard Delivery (3–5 business days)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Track Package Section at the End */}
        <section aria-label="Track Package" className="border-t border-border pt-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xs uppercase tracking-wider font-satoshi font-medium text-muted flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-muted" />
                <span>Package Tracking</span>
              </h2>
              <p className="font-satoshi font-medium text-sm sm:text-base text-ink">
                Track dispatch &amp; live courier milestones
              </p>
              <p className="text-xs text-muted font-satoshi">
                Real-time updates via SMS and live courier telemetry.
              </p>
            </div>

            <Link
              to={orderNumber ? `/track/${encodeURIComponent(orderNumber)}` : '/track'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-surface text-xs uppercase tracking-wider font-satoshi font-medium rounded hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
            >
              <span>Track Package</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Footer Links */}
          <div className="flex items-center justify-between pt-6 text-xs text-muted font-satoshi">
            <Link
              to="/#products"
              className="hover:text-ink transition-colors uppercase tracking-wider text-[11px] font-medium"
            >
              ← Continue Shopping
            </Link>
            <Link
              to="/pair"
              className="hover:text-ink transition-colors uppercase tracking-wider text-[11px] font-medium"
            >
              Activate an existing tag →
            </Link>
          </div>
        </section>
      </motion.main>

      <StoreFooter />
    </div>
  );
};
