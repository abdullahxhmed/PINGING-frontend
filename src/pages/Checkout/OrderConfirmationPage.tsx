import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { StoreHeader } from '../../components/store/StoreHeader';
import { StoreFooter } from '../../components/store/StoreFooter';
import {
  getOrderFromStorage,
  type OrderRecord,
} from '../../features/store/catalog';
import {
  PackageCheck,
  AlertCircle,
  QrCode,
  MapPin,
  Clock,
  Phone,
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const fromOrigin = (location.state as { from?: string } | null)?.from;
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      const found = getOrderFromStorage(orderId);
      setOrder(found);
    }
    setLoading(false);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <p className="text-sm text-muted">Retrieving order details...</p>
        </main>
        <StoreFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col">
        <StoreHeader />
        <main className="flex-1 max-w-xl mx-auto px-5 py-20 text-center">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-4" />
          <h1 className="font-display text-2xl font-medium text-ink mb-2">Order Not Found</h1>
          <p className="text-sm text-muted mb-6">
            We could not locate an order matching reference{' '}
            <span className="font-mono text-ink font-semibold">{orderId || 'unknown'}</span> on this device.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/#products"
              className="px-4 py-2 bg-ink text-bg text-xs uppercase tracking-wider font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Browse Sets
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 bg-surface border border-border text-ink text-xs uppercase tracking-wider font-medium rounded-md hover:border-ink transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink flex flex-col">
      <StoreHeader />

      <motion.main
        initial={fromOrigin === 'bottom' ? { opacity: 0, y: 70, scale: 0.95 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          fromOrigin === 'bottom'
            ? { type: 'spring' as const, damping: 26, stiffness: 260, mass: 0.85 }
            : { duration: 0.25, ease: 'easeOut' as const }
        }
        style={{ transformOrigin: '50% 100%' }}
        className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-6 py-10 sm:py-16"
      >
        {/* Order Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-4 text-ink">
            <PackageCheck className="w-6 h-6" />
          </div>
          <p className="text-xs uppercase tracking-wider font-mono text-muted mb-1">
            Order Reference: {order.orderId}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-ink tracking-tight mb-2">
            Order Registered
          </h1>
          <p className="text-sm text-muted">
            Thank you, {order.customer.fullName}. We have recorded your order details and queued your package for fulfillment.
          </p>
        </div>

        {/* Truthful Payment & Dispatch Status Banner */}
        <div className="mb-8 p-4 sm:p-5 rounded-xl bg-surface border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-ink">
                Status: Payment Pending / Awaiting Gateway Setup
              </span>
            </div>
            <span className="text-xs font-mono text-muted">
              Created: {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="pt-3 text-xs text-muted leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-subtle shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink mb-0.5">Payment gateway is in transition.</p>
              <p>
                Live automated payment processing is temporarily suspended while our payment gateway credentials are being updated.
                Your order is safely registered on our side. You will not be charged online at this moment, and our fulfillment desk
                will reach out to <span className="font-mono text-ink font-medium">+91 {order.customer.mobileNumber}</span> before dispatch.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Order Details & Items */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-xs uppercase tracking-wider font-medium text-muted mb-4 pb-2 border-b border-border">
              Items Ordered
            </h2>

            <div className="divide-y divide-border pb-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((it) => (
                  <div key={it.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-ink">{it.name}</p>
                      <p className="text-[11px] text-muted">{it.subtitle}</p>
                      <p className="font-mono text-[11px] text-muted mt-0.5">
                        Qty: {it.quantity} × ₹{it.unitPrice}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-ink">₹{it.totalPrice}</span>
                  </div>
                ))
              ) : (
                <div className="flex gap-4 items-start py-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-ink">Everyday Set</h3>
                    <p className="text-xs text-muted mt-0.5">Starter Pack</p>
                    <div className="flex justify-between items-baseline mt-2 text-xs">
                      <span className="font-mono text-muted">Qty: 1</span>
                      <span className="font-mono font-medium text-ink">₹{order.subtotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Included in set */}
            <div className="py-4 border-t border-b border-border">
              <p className="text-xs font-medium text-ink mb-2">Service &amp; Warranty:</p>
              <ul className="space-y-1.5 text-xs text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-ink font-mono text-[10px] mt-0.5">•</span>
                  <span>12 months included telecommunication voice relay &amp; web messaging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-ink font-mono text-[10px] mt-0.5">•</span>
                  <span>Free replacement guarantee if damaged in transit</span>
                </li>
              </ul>
            </div>

            {/* Pricing Breakdown */}
            <div className="pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-mono text-ink">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping Fee</span>
                <span className="font-mono text-ink">
                  {order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-baseline text-sm font-medium">
                <span className="text-ink">Order Total</span>
                <span className="font-mono text-base font-semibold text-ink">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address & Next Steps */}
          <div className="space-y-6">
            {/* Delivery Destination */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-xs uppercase tracking-wider font-medium text-muted mb-4 pb-2 border-b border-border flex items-center justify-between">
                <span>Delivery Address</span>
                <MapPin className="w-3.5 h-3.5 text-muted" />
              </h2>
              <div className="text-xs space-y-1 text-ink">
                <p className="font-medium text-sm text-ink">{order.customer.fullName}</p>
                <p className="text-muted">{order.customer.addressLine}</p>
                {order.customer.locality && <p className="text-muted">{order.customer.locality}</p>}
                <p className="text-muted">
                  {order.customer.city}, {order.customer.state} —{' '}
                  <span className="font-mono font-medium text-ink">{order.customer.pincode}</span>
                </p>
                <p className="pt-2 text-muted font-mono flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-muted" />
                  +91 {order.customer.mobileNumber}
                </p>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-xs uppercase tracking-wider font-medium text-muted mb-4 pb-2 border-b border-border flex items-center justify-between">
                <span>What Happens Next</span>
                <Clock className="w-3.5 h-3.5 text-muted" />
              </h2>

              <ol className="space-y-3.5 text-xs text-muted">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-bg border border-border flex items-center justify-center font-mono font-semibold text-ink shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <span className="font-medium text-ink">Packaging &amp; Dispatch</span>
                    <p className="text-[11px] mt-0.5">
                      Your items are packed in a tamper-evident protective envelope within 24–48 hours.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-bg border border-border flex items-center justify-center font-mono font-semibold text-ink shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <span className="font-medium text-ink">Transit (3–5 Business Days)</span>
                    <p className="text-[11px] mt-0.5">
                      Delivered straight to your doorstep across India via express courier.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-bg border border-border flex items-center justify-center font-mono font-semibold text-ink shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <span className="font-medium text-ink">30-Second Activation</span>
                    <p className="text-[11px] mt-0.5">
                      When your package arrives, scan any tag with your camera to link it to your Kauntact account.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
          <Link
            to="/#products"
            className="text-xs uppercase tracking-wider font-medium text-muted hover:text-ink transition-colors flex items-center gap-1.5"
          >
            ← Return to Storefront
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/pair"
              className="px-4 py-2.5 bg-surface border border-border text-xs uppercase tracking-wider font-medium text-ink rounded-lg hover:border-ink transition-colors flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Pair Existing Tag
            </Link>

            <Link
              to="/contact"
              className="px-4 py-2.5 bg-ink text-bg text-xs uppercase tracking-wider font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Help &amp; Support
            </Link>
          </div>
        </div>
      </motion.main>

      <StoreFooter />
    </div>
  );
};
