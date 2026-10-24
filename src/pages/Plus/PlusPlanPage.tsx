import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Tag,
  MapPin,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Lock,
  Gift,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { KauntactLogo, PlusLogo } from '../../components/brand/PingInLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { useSubscription } from '../../features/subscription';
import { subscriptionApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';

export const PlusPlanPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isPlus } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to activate your Plus plan.');
      navigate('/login?redirect=/plus');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const purchaseData = await subscriptionApi.createPurchase({
        packType: 'PLUS_99',
        paymentProvider: showPromoInput && promoCode.trim() ? 'PROMO' : 'RAZORPAY',
        metadata: {
          channel: 'editorial_page_checkout',
          promoCode: promoCode.trim() || undefined,
        },
      });

      const purchaseId = purchaseData?.purchase?.id;

      await subscriptionApi.activate({
        purchaseId,
        packType: 'PLUS_99',
        paymentProvider: showPromoInput && promoCode.trim() ? 'PROMO' : 'RAZORPAY',
        providerOrderId: `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        providerPaymentId: `pay_${Math.random().toString(36).substring(2, 12)}`,
      });

      setIsSuccess(true);
      toast.success('Plus Activated! Welcome to Kauntact Plus.');

      window.dispatchEvent(new CustomEvent('subscription:updated'));
      window.dispatchEvent(new CustomEvent('resource:updated'));
      window.dispatchEvent(new CustomEvent('tag:updated'));
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-[460px] mx-auto py-4 sm:py-8 space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors font-mono uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            PLAN STORE
          </span>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center space-y-4 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-full border border-ink flex items-center justify-center text-ink">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display font-medium text-2xl text-ink">You're on Kauntact Plus</h2>
              <p className="text-xs text-muted max-w-xs">
                Your 12-month membership is active. WhatsApp alerts, 8 tag pairings, parked locations, and analytics are now live.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="py-3 px-6 rounded bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
            {/* ── DARK HEADING SECTION ONLY ───────────────────────────────── */}
            <div className="bg-[#151513] text-[#f5f4ee] p-6 border-b border-[#2d2c26] space-y-3">
              {/* Brand row: Inverted Kauntact Logo + Plus Logo (balanced spacing) */}
              <div className="flex items-center gap-1.5">
                <KauntactLogo height={15} kaunColor="#f5f4ee" tactColor="#929087" />
                <PlusLogo height={15} width={15} theme="light" className="w-[15px] h-[15px] shrink-0" />
              </div>

              {/* Cleanly aligned Annual Plan & Price */}
              <div className="flex items-baseline justify-between gap-4 pt-1">
                <div>
                  <h1 className="font-display font-medium text-2xl text-white tracking-tight leading-none">
                    Annual Plan
                  </h1>
                  <p className="text-[12px] text-[#929087] mt-1 font-sans">
                    Full vehicle &amp; tag protection
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-3xl font-semibold text-white tracking-tight">
                    ₹99
                  </span>
                </div>
              </div>
            </div>

            {/* ── EDITORIAL SURFACE BODY ──────────────────────────────────── */}
            <div className="p-6 bg-surface text-ink space-y-4">
              {error && (
                <div className="p-3 rounded bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Validity Row */}
              <div className="flex items-center justify-between py-2 px-3 rounded bg-bg/75 border border-border text-xs">
                <span className="text-muted font-medium">Validity</span>
                <span className="font-mono font-semibold text-ink">12 Months (365 Days)</span>
              </div>

              {/* 4 Core Pillars */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-ink leading-none">WhatsApp Alerts</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Instant notifications delivered straight to your WhatsApp without revealing your phone number.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-ink leading-none">8 Tag Pairings</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Pair and keep up to 8 QR tags active simultaneously across all your vehicles and belongings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-ink leading-none">Parked Locations</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Save where you parked with 1-tap pinning and navigate back with walking directions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BarChart3 className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-ink leading-none">Scan & Call Analytics</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Real-time activity tracking for QR scan timestamps, visitor device types, and call logs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footnote */}
              <div className="pt-3 border-t border-border text-[11px] text-muted">
                Private relay with zero caller ID exposure.
              </div>

              {/* Promo code */}
              <div className="text-xs">
                {!showPromoInput ? (
                  <button
                    type="button"
                    onClick={() => setShowPromoInput(true)}
                    className="text-muted hover:text-ink font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5" /> Have a promo code?
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CODE"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="px-3 py-1.5 border border-border rounded bg-surface text-ink font-mono text-xs focus:outline-none focus:border-ink uppercase flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPromoInput(false)}
                      className="text-muted hover:text-ink text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isProcessing || isPlus}
                  className="w-full py-3.5 px-4 rounded bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : isPlus ? (
                    <span>Plan Already Active</span>
                  ) : (
                    <>
                      <span>Activate Plus — ₹99</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
                  <Lock className="w-3 h-3 text-muted" />
                  <span>Single payment • 365 days of coverage</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
