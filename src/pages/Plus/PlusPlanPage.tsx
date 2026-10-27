import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Tag,
  MapPin,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Gift,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { KauntactLogo, PlusLogo } from '../../components/brand/PingInLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { useSubscription, initiateSubscriptionCheckout } from '../../features/subscription';
import { subscriptionApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import type { SubscriptionPack } from '../../types/subscription';

export const DEFAULT_99_PLAN: SubscriptionPack = {
  packType: 'PLUS_RENEWAL',
  name: '12-Month Plus Plan',
  amountPaise: 9900, // ₹99
  currency: 'INR',
  tagsIncluded: 0,
  plusDurationMonths: 12,
  badge: '12 Months',
  description: '12 months of Kauntact Plus coverage with WhatsApp alerts, 8 tag pairings, parked locations, and analytics.',
  features: [
    'WhatsApp alerts directly to your phone',
    'Up to 8 active tag pairings simultaneously',
    'Parked location pinning & navigation',
    'Live scan & private call analytics',
  ],
};

export const PlusPlanPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isPlus, showPaymentSuccess } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activePlan, setActivePlan] = useState<SubscriptionPack>(DEFAULT_99_PLAN);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const livePacks = await subscriptionApi.getPacks();
        if (Array.isArray(livePacks) && livePacks.length > 0) {
          const match = livePacks.find(
            (p) => p.packType === 'PLUS_RENEWAL' || p.amountPaise === 9900
          );
          if (match) {
            setActivePlan(match);
          }
        }
      } catch {
        // Fallback to DEFAULT_99_PLAN
      }
    }
    loadCatalog();
  }, []);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to activate your Plus plan.');
      navigate('/login?redirect=/plus');
      return;
    }

    setError(null);

    // Promo code path
    if (showPromoInput && promoCode.trim()) {
      setIsProcessing(true);
      try {
        const purchaseData = await subscriptionApi.createPurchase({
          packType: activePlan.packType,
          paymentProvider: 'PROMO',
          metadata: {
            channel: 'editorial_page_checkout',
            promoCode: promoCode.trim(),
          },
        });

        const purchaseId = purchaseData?.purchaseId || purchaseData?.purchase?.id;

        await subscriptionApi.activate({
          purchaseId,
          packType: activePlan.packType,
          paymentProvider: 'PROMO',
        });

        toast.success('Plus Activated! Welcome to Kauntact Plus.');
        window.dispatchEvent(new CustomEvent('subscription:updated'));
        window.dispatchEvent(new CustomEvent('resource:updated'));
        window.dispatchEvent(new CustomEvent('tag:updated'));

        showPaymentSuccess({
          planName: activePlan.name,
          durationMonths: activePlan.plusDurationMonths || 12,
          tier: 'PLUS',
          amountPaise: activePlan.amountPaise,
          expiresAt: null,
        });
      } catch (err: any) {
        setError(err.message || 'Promo activation failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ── Razorpay Secure Payment Flow ──────────────────────────────────────────
    await initiateSubscriptionCheckout({
      pack: activePlan,
      user: user
        ? {
            name: user.name,
            phone: (user as any).mobileNumber || (user as any).phone || '',
            email: (user as any).email || '',
          }
        : null,
      onProcessingChange: setIsProcessing,
      onError: (msg) => setError(msg),
      onSuccess: (details) => {
        setIsProcessing(false);
        // Pop up the small modal with the animated clean tick stating plan & duration
        showPaymentSuccess(details);
      },
    });
  };

  const displayPrice = (activePlan.amountPaise / 100).toFixed(0);
  const durationText = activePlan.plusDurationMonths
    ? `${activePlan.plusDurationMonths} Months`
    : '12 Months';

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

        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          {/* ── DARK HEADING SECTION ───────────────────────────────── */}
          <div className="bg-[#151513] text-[#f5f4ee] p-6 border-b border-[#2d2c26] space-y-3">
            {/* Brand row: Inverted Kauntact Logo + Plus Logo */}
            <div className="flex items-center gap-1.5">
              <KauntactLogo height={15} kaunColor="#f5f4ee" tactColor="#929087" />
              <PlusLogo height={15} width={15} theme="light" className="w-[15px] h-[15px] shrink-0" />
            </div>

            {/* Cleanly aligned Plan Name & Price */}
            <div className="flex items-baseline justify-between gap-4 pt-1">
              <div>
                <h1 className="font-display font-medium text-2xl text-white tracking-tight leading-none">
                  12-Month Plus Plan
                </h1>
                <p className="text-[12px] text-[#929087] mt-1 font-sans">
                  Full vehicle &amp; tag protection • 12 Months
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
            <div className="flex items-center justify-between py-2.5 px-3.5 rounded bg-bg/75 border border-border text-xs">
              <span className="text-muted font-medium">Plan Validity</span>
              <span className="font-mono font-semibold text-ink">{durationText}</span>
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
                  <p className="text-sm font-medium text-ink leading-none">Scan &amp; Call Analytics</p>
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
                className="w-full py-3.5 px-4 rounded bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening Secure Checkout...</span>
                  </>
                ) : isPlus ? (
                  <span>Plan Already Active</span>
                ) : (
                  <>
                    <span>Proceed to Pay — ₹{displayPrice}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <Lock className="w-3 h-3 text-muted" />
                <span>Single payment • 12 months of coverage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PlusPlanPage;
