import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  MapPin,
  MessageCircle,
  Tag,
  BarChart3,
  ArrowRight,
  Loader2,
  Lock,
  Gift,
  ChevronRight,
} from 'lucide-react';
import type { SubscriptionPack, PackType } from '../../types/subscription';
import { subscriptionApi } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { KauntactLogo, PlusLogo } from '../../components/brand/PingInLogo';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackType?: PackType | null;
}

export const PLUS_ANNUAL_PLAN: SubscriptionPack = {
  packType: 'PLUS_99',
  name: 'Kauntact Plus',
  amountPaise: 9900, // ₹99
  currency: 'INR',
  tagsIncluded: 0,
  plusDurationMonths: 12,
  badge: '12 Months',
  description: 'Annual Plus membership with WhatsApp alerts, 8 tag pairings, parked locations, and analytics.',
  features: [
    'WhatsApp alerts directly to your phone',
    'Up to 8 active tag pairings simultaneously',
    'Parked location pinning & navigation',
    'Live scan & private call analytics',
  ],
};

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  initialPackType,
}) => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [activePlan, setActivePlan] = useState<SubscriptionPack>(PLUS_ANNUAL_PLAN);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch live packs if available
  useEffect(() => {
    async function loadCatalog() {
      try {
        const livePacks = await subscriptionApi.getPacks();
        if (Array.isArray(livePacks) && livePacks.length > 0) {
          const matching = livePacks.find(
            (p) => p.amountPaise === 9900 || p.packType === 'PLUS_99' || p.packType === initialPackType
          );
          if (matching) {
            setActivePlan(matching);
          } else {
            setActivePlan({
              ...PLUS_ANNUAL_PLAN,
              packType: livePacks[0].packType || 'PLUS_99',
            });
          }
        }
      } catch {
        // Fallback to PLUS_ANNUAL_PLAN
      }
    }

    if (isAuthenticated) {
      loadCatalog();
    }
  }, [isAuthenticated, initialPackType]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsSuccess(false);
      setError(null);
      setShowPromoInput(false);
      setPromoCode('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const purchaseData = await subscriptionApi.createPurchase({
        packType: activePlan.packType,
        paymentProvider: showPromoInput && promoCode.trim() ? 'PROMO' : 'RAZORPAY',
        metadata: {
          channel: 'editorial_drawer_checkout',
          promoCode: promoCode.trim() || undefined,
        },
      });

      const purchaseId = purchaseData?.purchase?.id;

      await subscriptionApi.activate({
        purchaseId,
        packType: activePlan.packType,
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Subtle backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#151513]/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── SLIDING SIDE DRAWER: DOCKED RIGHT, FULL VIEWPORT EXPOSURE ── */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 280,
              mass: 0.85,
            }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 350 }}
            dragElastic={{ left: 0, right: 0.15 }}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 60 || info.velocity.x > 150) {
                onClose();
              }
            }}
            className="fixed right-0 top-0 bottom-0 h-full w-[92vw] max-w-[420px] bg-surface text-left border-l border-border z-50 shadow-2xl flex flex-col justify-between overflow-y-auto"
            style={{
              boxShadow: '-12px 0 36px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Connected close notch on drawer's left edge */}
            <button
              type="button"
              onClick={onClose}
              className="absolute -left-[38px] top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center pl-2 pr-1.5 py-2.5 bg-surface border-y border-l border-border shadow-[-4px_4px_16px_rgba(0,0,0,0.12)] rounded-l-xl text-ink cursor-pointer hover:border-ink/40 transition-colors z-20 group"
              title="Push to close drawer"
              aria-label="Push to close drawer"
            >
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-ink mr-0.5 group-hover:translate-x-0.5 transition-transform" />
              <PlusLogo height={18} width={18} className="w-[18px] h-[18px] drop-shadow-sm shrink-0" />
            </button>

            {/* High-contrast close X button in top right */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Success Screen */}
            {isSuccess ? (
              <div className="p-8 my-auto text-center flex flex-col items-center space-y-4">
                <div className="w-12 h-12 rounded-full border border-ink flex items-center justify-center text-ink">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-medium text-2xl text-ink">You're on Kauntact Plus</h3>
                  <p className="text-xs text-muted max-w-xs">
                    Your 12-month membership is active. WhatsApp alerts, 8 tag pairings, parked locations, and analytics are now enabled.
                  </p>
                </div>
                <div className="pt-2 w-full">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Continue to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* ── 1. DARK HEADING SECTION ONLY ─────────────────────────── */}
                  <div className="bg-[#151513] text-[#f5f4ee] p-6 border-b border-[#2d2c26] space-y-3">
                    {/* Brand row: Inverted Kauntact Logo + Plus Logo (balanced optical spacing) */}
                    <div className="flex items-center gap-1.5">
                      <KauntactLogo height={15} kaunColor="#f5f4ee" tactColor="#929087" />
                      <PlusLogo height={15} width={15} theme="light" className="w-[15px] h-[15px] shrink-0" />
                    </div>

                    {/* Cleanly aligned Annual Plan & Price */}
                    <div className="flex items-baseline justify-between gap-4 pt-1">
                      <div>
                        <h2 className="font-display font-medium text-2xl text-white tracking-tight leading-none">
                          Annual Plan
                        </h2>
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

                  {/* ── 2. EDITORIAL SURFACE CARD BODY ──────────────────────── */}
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

                    {/* 4 Core Pillars - Clean, quiet monochrome typography */}
                    <div className="space-y-3.5 pt-1">
                      {/* WhatsApp Alerts */}
                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-ink leading-none">
                            WhatsApp Alerts
                          </p>
                          <p className="text-xs text-muted leading-relaxed">
                            Instant notifications sent directly to your WhatsApp without revealing your phone number.
                          </p>
                        </div>
                      </div>

                      {/* 8 Tag Pairings */}
                      <div className="flex items-start gap-3">
                        <Tag className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-ink leading-none">
                            8 Tag Pairings
                          </p>
                          <p className="text-xs text-muted leading-relaxed">
                            Pair and keep up to 8 QR tags active simultaneously across all your vehicles and belongings.
                          </p>
                        </div>
                      </div>

                      {/* Parked Locations */}
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-ink leading-none">
                            Parked Locations
                          </p>
                          <p className="text-xs text-muted leading-relaxed">
                            Save where you parked with 1-tap pinning and navigate back with walking directions.
                          </p>
                        </div>
                      </div>

                      {/* Scan & Call Analytics */}
                      <div className="flex items-start gap-3">
                        <BarChart3 className="w-4 h-4 text-ink shrink-0 mt-0.5 stroke-[1.75]" />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-ink leading-none">
                            Scan & Call Analytics
                          </p>
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

                    {/* Promo code toggle */}
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
                  </div>
                </div>

                {/* Summary & Black Signature CTA pinned to bottom */}
                <div className="p-6 pt-0 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 rounded bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
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
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SubscriptionPlansModal;
