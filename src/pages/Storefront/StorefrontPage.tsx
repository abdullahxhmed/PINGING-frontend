import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  StoreHeader,
  StoreFooter,
  StorePackCard,
  StoreAddonCard,
} from '../../components/store';
import {
  getPrimaryPacks,
  type StoreCartState,
  calculateCart,
  saveCartToStorage,
  getCartFromStorage,
  MAX_ITEMS_PER_ORDER,
} from '../../features/store/catalog';
import { useStoreCatalog } from '../../features/store/useStoreCatalog';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  Minus,
  Plus,
  Loader2,
  MapPin,
  Trash2,
} from 'lucide-react';
import { fetchShippingRates } from '../../services/checkout';
import type { ShippingRateResponseData } from '../../types/orders';

const getStoredDraftPincode = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem('kauntact_checkout_draft') || localStorage.getItem('kauntact_checkout_draft');
    return raw ? JSON.parse(raw).pincode || '' : '';
  } catch {
    return '';
  }
};

const savePincodeToDraft = (pin: string) => {
  try {
    const raw = sessionStorage.getItem('kauntact_checkout_draft') || localStorage.getItem('kauntact_checkout_draft');
    const draft = raw ? JSON.parse(raw) : {};
    draft.pincode = pin;
    const serialized = JSON.stringify(draft);
    sessionStorage.setItem('kauntact_checkout_draft', serialized);
    localStorage.setItem('kauntact_checkout_draft', serialized);
  } catch {}
};

interface StorePolicyItem {
  label: string;
  value?: string;
  values?: string[];
  isLink?: boolean;
}

const STORE_POLICIES: StorePolicyItem[] = [
  {
    label: 'Sizes',
    values: ['Normal stickers: 5 × 7 cm', 'Mini: 3 × 4 cm', 'Keychain: 2.5 × 4 cm'],
  },
  {
    label: 'Material & finish',
    value: 'Vinyl, satin finish',
  },
  {
    label: 'Adhesive',
    value: '3M non-residue',
  },
  {
    label: 'Outdoor resistance',
    value: 'Weather & UV tolerant',
  },
  {
    label: 'Returns & refunds',
    value: 'Plan can be cancelled & refunded. Shipping is non-refundable.',
  },
  {
    label: 'Payment methods',
    value: 'UPI, Cards, Netbanking, COD',
  },
  {
    label: 'Support',
    value: 'info@kauntact.in',
    isLink: true,
  },
];

const PLAN_COMPARISON_ROWS = [
  {
    feature: 'Tags covered',
    basic: '2 tags',
    basicClass: 'font-mono text-muted',
    plus: 'Up to 8 tags',
    plusClass: 'font-mono font-medium text-ink',
  },
  {
    feature: 'Voice calls',
    basic: 'Included',
    basicClass: 'text-success',
    plus: 'Included',
    plusClass: 'text-success',
  },
  {
    feature: 'Whatsapp notifications',
    basic: 'None',
    basicClass: 'text-muted',
    plus: 'Included',
    plusClass: 'text-success',
  },
  {
    feature: 'Call history',
    basic: 'Recent',
    basicClass: 'text-muted',
    plus: 'Full history',
    plusClass: 'text-ink font-medium',
  },
  {
    feature: 'Price',
    basic: 'Free',
    basicClass: 'font-mono text-success font-semibold',
    plus: '₹99/year *',
    plusClass: 'font-mono text-ink font-semibold',
    isHighlight: true,
  },
];

const STORE_FAQS = [
  {
    q: 'Does the person scanning need an app?',
    a: 'No. Any smartphone camera opens the contact page directly in their browser. The person reaching out never needs to install an app or create an account.',
  },
  {
    q: 'Will they see my phone number?',
    a: 'Never. Calls pass through our secure relay bridge. The caller talks to you through a virtual connection without ever seeing your personal digits.',
  },
  {
    q: 'How do I activate or manage multiple tags?',
    a: 'When your package arrives, scan any tag with your camera to link it to your Kauntact dashboard. You can manage multiple vehicles, keys, and personal belongings from one account.',
  },
  {
    q: 'What is included for the first 12 months?',
    a: 'Both packs include 12 months of Plus service: voice relay calling, web alerts, and up to 8 active tags. There are no monthly fees during your included year.',
  },
  {
    q: 'What happens if I don’t renew for ₹99?',
    a: 'Your first 2 tags keep working for calls with no expiry. Plus renewal (₹99/year) is only needed if you have more than 2 tags active or want web notifications.',
  },
  {
    q: 'Where do orders ship from and what is the return policy?',
    a: 'All orders dispatch within 24–48 hours from Hyderabad via express courier (3–5 business days across India). Defective items receive an immediate free replacement.',
  },
];

export const StorefrontPage: React.FC = () => {
  const navigate = useNavigate();

  // Dynamic live catalog driven strictly from backend
  const { sets, addons, isLoading, products: backendCatalog } = useStoreCatalog();

  // Cart state persisted to storage
  const [cart, setCart] = useState<StoreCartState>(() => getCartFromStorage());

  // Dynamic primary packs list derived from backend catalog
  const primaryPacks = React.useMemo(() => getPrimaryPacks(sets), [sets]);

  // Finish tone state for the pack cards (renders in light mode by default on page load)
  const [packTones, setPackTones] = useState<Record<string, 'dark' | 'light'>>({});

  // Flipped state for the pack cards (front vs back) dynamically initialized
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  // Quirky animation trigger key
  const [lastAddedKey, setLastAddedKey] = useState<number>(0);

  // FAQ accordion state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    saveCartToStorage(cart);
  }, [cart]);

  // Dynamically preload pack images and addon images for instant finish switching without 1s lag
  useEffect(() => {
    const toPreload: string[] = [];
    primaryPacks.forEach((p) => {
      if (p?.images) {
        if (p.images.dark) toPreload.push(p.images.dark);
        if (p.images.light) toPreload.push(p.images.light);
      }
    });
    Object.values(addons).forEach((a) => {
      if (a.image) toPreload.push(a.image);
    });
    toPreload.forEach((src) => {
      if (src && !src.startsWith('data:')) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [primaryPacks, addons]);

  const cartCalc = calculateCart(cart, sets, addons);
  const canAddMore = cartCalc.itemCount < MAX_ITEMS_PER_ORDER;

  const toggleFlip = (id: string) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setSetQty = (id: string, delta: number) => {
    const product = sets[id];
    const maxStock =
      product?.availableQuantity !== undefined
        ? Math.min(MAX_ITEMS_PER_ORDER, Math.max(0, product.availableQuantity))
        : MAX_ITEMS_PER_ORDER;
    const isSoldOut =
      product?.inStock === false ||
      (product?.availableQuantity !== undefined && product.availableQuantity <= 0);

    if (delta > 0 && (isSoldOut || cartCalc.itemCount >= MAX_ITEMS_PER_ORDER)) {
      return;
    }

    if (delta > 0) {
      setLastAddedKey(Date.now());
    }

    setCart((prev) => {
      const totalItems =
        Object.values(prev.sets || {}).reduce((a, b) => a + b, 0) +
        Object.values(prev.addons || {}).reduce((a, b) => a + b, 0);

      if (delta > 0 && totalItems >= MAX_ITEMS_PER_ORDER) {
        return prev;
      }

      const current = prev.sets[id] || 0;
      if (delta > 0 && current >= maxStock) {
        return prev;
      }
      const next = Math.max(0, Math.min(maxStock, current + delta));
      const updated = { ...prev.sets };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return { ...prev, sets: updated };
    });
  };

  const setAddonQty = (id: string, delta: number) => {
    if (delta > 0 && cartCalc.itemCount >= MAX_ITEMS_PER_ORDER) {
      return;
    }

    if (delta > 0) {
      setLastAddedKey(Date.now());
    }

    setCart((prev) => {
      const totalItems =
        Object.values(prev.sets || {}).reduce((a, b) => a + b, 0) +
        Object.values(prev.addons || {}).reduce((a, b) => a + b, 0);

      if (delta > 0 && totalItems >= MAX_ITEMS_PER_ORDER) {
        return prev;
      }

      const current = prev.addons[id] || 0;
      if (delta > 0 && current >= MAX_ITEMS_PER_ORDER) {
        return prev;
      }
      const next = Math.max(0, Math.min(MAX_ITEMS_PER_ORDER, current + delta));
      const updated = { ...prev.addons };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return { ...prev, addons: updated };
    });
  };

  const handleToneChange = (setId: string, tone: 'dark' | 'light') => {
    setPackTones((prev) => ({ ...prev, [setId]: tone }));
    setCart((prev) => {
      const updated = {
        ...prev,
        setTones: {
          ...(prev.setTones || {}),
          [setId]: tone,
        },
      };
      saveCartToStorage(updated);
      return updated;
    });
  };

  const handleCheckout = () => {
    navigate('/checkout', { state: { from: 'bottom' } });
  };

  // Floating cart expansion & pincode rate calculator state
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [calcPincode, setCalcPincode] = useState(() => getStoredDraftPincode());
  const [calcRateQuote, setCalcRateQuote] = useState<ShippingRateResponseData | null>(null);
  const [isCalculatingStoreRate, setIsCalculatingStoreRate] = useState(false);
  const [calcRateError, setCalcRateError] = useState<string | null>(null);

  // Auto-close expanded drawer if cart is emptied
  useEffect(() => {
    if (cartCalc.itemCount === 0 && isCartExpanded) {
      setIsCartExpanded(false);
    }
  }, [cartCalc.itemCount, isCartExpanded]);

  // Virtual viewport listener for iOS keyboard lift so pill and PIN field remain visible
  const [viewportBottomOffset, setViewportBottomOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setViewportBottomOffset(keyboardHeight);
    };

    const vv = window.visualViewport;
    vv.addEventListener('resize', handleVisualViewportChange);
    vv.addEventListener('scroll', handleVisualViewportChange);

    return () => {
      vv.removeEventListener('resize', handleVisualViewportChange);
      vv.removeEventListener('scroll', handleVisualViewportChange);
    };
  }, []);

  const handleCheckStoreShipping = async (pinOverride?: string) => {
    const pin = (pinOverride !== undefined ? pinOverride : calcPincode).replace(/\D/g, '');
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setCalcRateError('Enter a valid 6-digit Indian PIN code');
      setCalcRateQuote(null);
      return;
    }

    const checkoutItems = cartCalc.items
      .filter((it) => it.quantity > 0 && (it.variantId || it.productId || it.id))
      .map((it) => {
        let resolvedVariantId = it.variantId;
        if (!resolvedVariantId && backendCatalog && backendCatalog.length > 0) {
          const prod = backendCatalog.find(
            (p) => p.id === it.productId || p.id === it.id || p.sku === it.id
          );
          if (prod && prod.variants && prod.variants.length > 0) {
            resolvedVariantId = prod.variants[0].id;
          }
        }
        return {
          variantId: resolvedVariantId || undefined,
          productId: it.productId || it.id,
          quantity: it.quantity,
        };
      });

    if (checkoutItems.length === 0) return;

    setIsCalculatingStoreRate(true);
    setCalcRateError(null);

    try {
      const response = await fetchShippingRates({
        items: checkoutItems,
        deliveryPincode: pin,
        paymentMethod: 'PREPAID',
      });
      setCalcRateQuote(response);
      savePincodeToDraft(pin);
      if (!response.isServiceable) {
        setCalcRateError(response.unserviceableReason || 'Delivery is currently not available for this pincode.');
      }
    } catch (err: any) {
      setCalcRateError(err.message || 'Unable to fetch rate. Please retry.');
      setCalcRateQuote(null);
    } finally {
      setIsCalculatingStoreRate(false);
    }
  };




  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink flex flex-col relative">
      <StoreHeader
        cartCount={cartCalc.itemCount}
        lastAddedKey={lastAddedKey}
        onCartClick={() => setIsCartExpanded((prev) => !prev)}
      />

      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 sm:px-5 pt-6 pb-28">
        {/* ── 1. HERO: GETTING / PURCHASING FOCUS ──────────────────────────── */}
        <section className="pb-5 border-b border-border space-y-1">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            STORE
          </p>
          <h1 className="font-display font-medium text-2xl sm:text-3xl text-ink uppercase tracking-tight leading-tight">
            Order your tags
          </h1>
          <p className="text-[14px] text-muted font-sans">
            Select a pack or purchase individual tags below.
          </p>
        </section>

        {/* ── 2. SELECT A PACK: ESSENTIAL & CURATED KIT (MODULAR) ────────── */}
        <section
          id="shop-packs-section"
          data-section="shop_page_1st_section"
          className="py-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              SELECT A PACK
            </p>
          </div>

          <div className="space-y-4">
            {primaryPacks.length === 0 ? (
              isLoading ? (
                /* Subtle skeleton while initial load finishes */
                <div className="space-y-4 animate-pulse">
                  <div className="h-64 rounded-2xl bg-surface border border-border flex items-center justify-center">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted/60">Loading packs...</span>
                  </div>
                  <div className="h-64 rounded-2xl bg-surface border border-border flex items-center justify-center">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted/60">Loading packs...</span>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-4 rounded-xl border border-dashed border-border text-center space-y-1.5 bg-surface/50">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
                    No Featured Packs Slotted
                  </p>
                  <p className="text-xs text-muted max-w-xs mx-auto">
                    Storefront packs are being configured in the admin placement console.
                  </p>
                </div>
              )
            ) : (
              primaryPacks.map((product, index) => {
                const packId = product.id;
                const tone = packTones[packId] || 'light';
                const isCardFlipped = Boolean(flipped[packId]);
                const cardQty = cart.sets[packId] || 0;
                const isSecondPack = index === 1;

                return (
                  <StorePackCard
                    key={packId}
                    product={product}
                    tone={tone}
                    onToneChange={(newTone) => handleToneChange(packId, newTone)}
                    quantity={cardQty}
                    onQuantityChange={(delta) => setSetQty(packId, delta)}
                    isFlipped={isCardFlipped}
                    onToggleFlip={() => toggleFlip(packId)}
                    isFeatured={Boolean(product.featured) || isSecondPack}
                    isRecommended={isSecondPack}
                    canAddMore={canAddMore}
                  />
                );
              })
            )}
          </div>
        </section>

        {/* ── 3. À LA CARTE (BUY INDIVIDUALLY OR ADD ON) ─────────────────── */}
        <section className="py-6 border-t border-border space-y-4">
          <div>
            <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              À LA CARTE
            </p>
            <h2 className="font-display font-medium text-xl text-ink uppercase tracking-tight mt-0.5">
              Buy individually or add on
            </h2>
            <p className="text-[13px] text-muted">
              Extra stickers and keychains for people who want tags separately.
            </p>
            <p>
              Click on the images to add to cart.
            </p>
          </div>

          {/* Edge-to-edge Seamless Photo Grid with Clean Break Lines */}
          {Object.keys(addons).length === 0 ? (
            isLoading ? (
              <div className="grid grid-cols-2 gap-2 animate-pulse">
                <div className="h-32 rounded-xl bg-surface border border-border flex items-center justify-center">
                  <span className="font-mono text-[11px] text-muted/60">Loading...</span>
                </div>
                <div className="h-32 rounded-xl bg-surface border border-border flex items-center justify-center">
                  <span className="font-mono text-[11px] text-muted/60">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 rounded-xl border border-dashed border-border text-center space-y-1 bg-surface/50">
                <p className="text-xs text-muted font-medium">
                  No individual items currently in catalog.
                </p>
              </div>
            )
          ) : (
            <div className="-mx-4 sm:-mx-5 grid grid-cols-2 gap-[1px] bg-border border-y border-border">
              {Object.values(addons).map((addon) => (
                <StoreAddonCard
                  key={addon.id}
                  addon={addon}
                  quantity={cart.addons[addon.id] || 0}
                  onQuantityChange={(delta) => setAddonQty(addon.id, delta)}
                  canAddMore={canAddMore}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 4. PLAN COMPARISON: BASIC VS PLUS (COMPACT TABLE) ───────────── */}
        <section className="py-6 border-t border-border space-y-3">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            PLAN COMPARISON
          </p>

          <p className="text-[15px] font-medium text-ink leading-snug">
            Your first 2 tags keep working for calls with no expiry.
          </p>

          <div className="rounded-lg border border-border overflow-hidden bg-surface text-xs">
            <div className="grid grid-cols-12 bg-bg border-b border-border p-2.5 font-mono text-[11px] font-semibold text-muted uppercase">
              <span className="col-span-5">Feature</span>
              <span className="col-span-3 text-center">Basic</span>
              <span className="col-span-4 text-right">Plus</span>
            </div>

            <div className="divide-y divide-border/70">
              {PLAN_COMPARISON_ROWS.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-12 p-2.5 items-center ${row.isHighlight ? 'bg-bg/40' : ''}`}
                >
                  <span className="col-span-5 text-ink font-medium">{row.feature}</span>
                  <span className={`col-span-3 text-center ${row.basicClass}`}>{row.basic}</span>
                  <span className={`col-span-4 text-right ${row.plusClass}`}>{row.plus}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-muted font-sans leading-relaxed">
            * First 12 months of Plus are included with both packs. If you choose not to renew, your 2
            selected tags remain active for calls with zero expiry.
          </p>
        </section>

        {/* ── 5. SPECIFICATIONS & POLICIES ────────────────────────────────── */}
        <section className="py-6 border-t border-border space-y-3 font-sans">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            SPECIFICATIONS &amp; POLICIES
          </p>

          <div className="space-y-0 font-sans">
            {STORE_POLICIES.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start sm:items-center justify-between gap-4 py-2.5 sm:py-3 border-t border-border/50 first:border-t-0"
              >
                <span className="text-sm sm:text-base text-muted font-medium shrink-0">
                  {item.label}
                </span>
                {item.isLink ? (
                  <a
                    href={`mailto:${item.value}`}
                    className="text-sm sm:text-base font-medium text-ink hover:text-muted transition-colors text-right underline underline-offset-4 decoration-border/60 hover:decoration-ink"
                  >
                    {item.value}
                  </a>
                ) : item.values ? (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2.5 text-right font-sans">
                    {item.values.map((v, i) => (
                      <span key={i} className="text-sm sm:text-base font-medium text-ink inline-flex items-center gap-2.5">
                        {i > 0 && <span className="hidden sm:inline text-border">·</span>}
                        <span>{v}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm sm:text-base font-medium text-ink text-right">
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. FAQ (MOVED TO THE END) ───────────────────────────────────── */}
        <section className="py-6 border-t border-border space-y-3 font-sans">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            FREQUENTLY ASKED QUESTIONS
          </p>

          <div className="divide-y divide-border border-y border-border">
            {STORE_FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="py-1">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full py-3 sm:py-3.5 flex items-center justify-between text-left gap-4 font-medium text-[15px] sm:text-base text-ink hover:text-muted transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="leading-snug">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                      className="shrink-0 text-muted"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-colors ${
                          isOpen ? 'text-ink' : 'text-muted'
                        }`}
                      />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: 'auto',
                          opacity: 1,
                          transition: {
                            height: { duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] },
                            opacity: { duration: 0.2, delay: 0.05 },
                          },
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                          transition: {
                            height: { duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] },
                            opacity: { duration: 0.15 },
                          },
                        }}
                        className="overflow-hidden"
                      >
                        <p className="pb-3 text-sm sm:text-[15px] text-muted leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── EXPANDABLE STICKY CHECKOUT PILL & CART DRAWER (SINGLE PERSISTENT DOM CONTAINER) ── */}
      <AnimatePresence>
        {cartCalc.itemCount > 0 && (() => {
          const freeShippingThreshold = 400;
          const subtotal = cartCalc.subtotal;
          const isFree = subtotal >= freeShippingThreshold;
          const remaining = Math.max(0, freeShippingThreshold - subtotal);
          const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
          const shippingFeeRupees =
            isFree
              ? 0
              : calcRateQuote?.isServiceable && calcRateQuote.shippingFee !== null
              ? Math.round(calcRateQuote.shippingFee / 100)
              : null;
          const estimatedTotal = shippingFeeRupees !== null ? subtotal + shippingFeeRupees : subtotal;

          // Fixed expanded window budgeting comfortable content (~324px content + 56px bottom bar = 380px)
          const expandedHeight = 380;

          return (
            <>
              {/* Subtle backdrop overlay (soft 1.5px blur) */}
              <AnimatePresence>
                {isCartExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsCartExpanded(false)}
                    className="fixed inset-0 bg-black/20 backdrop-blur-[1.5px] z-40"
                  />
                )}
              </AnimatePresence>

              {/* ── ONE PERSISTENT DOM CONTAINER (.cart-pill with spring enter/exit & tactile pop) ── */}
              <motion.aside
                role="region"
                aria-label="Active order summary"
                data-expanded={isCartExpanded ? 'true' : 'false'}
                initial={{ x: '-50%', y: 70, opacity: 0, scale: 0.95 }}
                animate={{
                  x: '-50%',
                  y: 0,
                  opacity: 1,
                  scale: lastAddedKey && !isCartExpanded ? [1, 1.03, 0.985, 1] : 1,
                }}
                exit={{
                  x: '-50%',
                  y: 70,
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.22, ease: 'easeIn' },
                }}
                transition={{
                  y: { type: 'spring', damping: 25, stiffness: 350 },
                  opacity: { duration: 0.22 },
                  scale: { duration: 0.35, ease: 'easeOut' },
                }}
                style={{
                  '--expanded-height': `${expandedHeight}px`,
                  ...(viewportBottomOffset > 0
                    ? { bottom: `${viewportBottomOffset + 12}px`, transition: 'bottom 150ms ease-out' }
                    : {}),
                } as React.CSSProperties}
                className="cart-pill bg-[#161614]/98 backdrop-blur-md border border-white/15 shadow-2xl shadow-black/60 text-[#f5f4ee] z-50 flex flex-col justify-between"
              >
                {/* ── UPPER EXPANDED CONTENT AREA (Fixed 240px window) ── */}
                <div
                  className={`flex-1 min-h-0 flex flex-col transition-opacity duration-200 overflow-hidden ${
                    isCartExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drawer Header (Clickable to collapse, ~44px pinned) */}
                  <div
                    onClick={() => setIsCartExpanded(false)}
                    className="h-[44px] px-5 flex items-center justify-between border-b border-white/10 shrink-0 cursor-pointer select-none"
                  >
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="font-display font-medium text-[15px] sm:text-base text-white tracking-tight">
                        Your cart
                      </h3>
                      <span className="font-mono text-[11px] text-[#B5B2A9]">
                        {cartCalc.itemCount} {cartCalc.itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCartExpanded(false);
                      }}
                      className="p-1 rounded-full text-[#B5B2A9] hover:text-white transition-colors cursor-pointer"
                      aria-label="Collapse cart"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Itemized Cart List (Comfortable scrolling area, only this scrolls) */}
                  <div className="relative flex-1 min-h-0">
                    <div className="h-full overflow-y-auto px-5 divide-y divide-white/10 overscroll-contain no-scrollbar">
                      {cartCalc.items.map((it) => {
                        const displayName = it.name.replace(/\s*\((Light|Dark)\)/gi, '').trim();
                        return (
                          <div key={`${it.id}-${it.tone || 'def'}`} className="py-3 flex items-center gap-3.5">
                            {it.image && (
                              <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0">
                                <img src={it.image} alt={displayName} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              {/* Line 1: Name */}
                              <p className="font-medium text-sm text-white truncate leading-snug">{displayName}</p>

                              {/* Line 2: Variant */}
                              <p className="text-xs text-[#B5B2A9] truncate mt-0.5">
                                {it.subtitle || 'Standard'}
                              </p>

                              {/* Stepper count button moved to the left */}
                              <div className="mt-2 flex items-center">
                                <div className="h-7 px-1 inline-flex items-center border border-white/15 rounded-md bg-white/5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (it.isSet) setSetQty(it.id, -1);
                                      else setAddonQty(it.id, -1);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center text-[#B5B2A9] hover:text-white hover:bg-white/10 transition-colors cursor-pointer rounded"
                                    aria-label={it.quantity === 1 ? `Remove ${displayName}` : `Decrease ${displayName}`}
                                    title={it.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                                  >
                                    {it.quantity === 1 ? (
                                      <Trash2 className="w-3.5 h-3.5 hover:text-red-400 transition-colors" />
                                    ) : (
                                      <Minus className="w-3 h-3" />
                                    )}
                                  </button>
                                  <span className="px-2 font-mono text-xs font-semibold text-white">
                                    {it.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (it.isSet) setSetQty(it.id, 1);
                                      else setAddonQty(it.id, 1);
                                    }}
                                    className="w-5 h-5 flex items-center justify-center text-[#B5B2A9] hover:text-white hover:bg-white/10 transition-colors cursor-pointer rounded"
                                    aria-label={`Increase ${displayName}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Entire right side: Clear price display */}
                            <div className="shrink-0 text-right flex flex-col items-end justify-center pl-3">
                              <span className="font-mono text-base font-bold text-white tracking-tight">
                                ₹{it.totalPrice}
                              </span>
                              {it.quantity > 1 && (
                                <span className="text-[11px] font-mono text-[#B5B2A9] mt-0.5">
                                  ₹{it.unitPrice} each
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Short fade at the bottom of the list when 2+ items */}
                    {cartCalc.items.length >= 2 && (
                      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-[#161614] to-transparent" />
                    )}
                  </div>

                  {/* Pinned PIN Row (~48px) */}
                  <div className="h-[48px] px-5 flex items-center justify-between gap-3 border-t border-white/10 shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <label htmlFor="drawer-pincode" className="sr-only">
                        Delivery PIN code
                      </label>
                      <MapPin className="w-3.5 h-3.5 text-[#B5B2A9] shrink-0" />
                      <input
                        id="drawer-pincode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={calcPincode}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCalcPincode(val);
                          savePincodeToDraft(val);
                          if (val.length === 6) {
                            handleCheckStoreShipping(val);
                          }
                        }}
                        placeholder="Delivery PIN code"
                        className="h-8 flex-1 min-w-0 bg-white/5 border border-white/15 focus:border-white/40 rounded-md px-2.5 text-xs font-mono text-white placeholder:text-[#B5B2A9]/60 outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isCalculatingStoreRate || calcPincode.replace(/\D/g, '').length !== 6}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckStoreShipping();
                      }}
                      className={`h-8 px-3 rounded-md text-xs font-mono font-medium transition-colors shrink-0 flex items-center justify-center ${
                        calcPincode.replace(/\D/g, '').length === 6 && !isCalculatingStoreRate
                          ? 'bg-[#F5F4EE] hover:bg-white text-[#161614] cursor-pointer'
                          : 'border border-white/20 text-[#B5B2A9]/40 bg-transparent cursor-not-allowed'
                      }`}
                    >
                      {isCalculatingStoreRate ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                      ) : (
                        'Check'
                      )}
                    </button>
                  </div>

                  {/* Pinned Totals Breakdown (~48px) */}
                  <div className="h-[48px] px-5 py-2 flex flex-col justify-center gap-1.5 border-t border-white/10 shrink-0">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#B5B2A9]">Subtotal</span>
                      <span className="font-mono text-white font-medium">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#B5B2A9]">Delivery</span>
                      <span className="font-mono text-white">
                        {isFree ? (
                          <span className="text-accent font-medium">Free</span>
                        ) : calcRateError ? (
                          <span className="text-xs text-red-400 font-sans">Invalid PIN</span>
                        ) : shippingFeeRupees !== null ? (
                          `₹${shippingFeeRupees}`
                        ) : (
                          <span className="text-xs text-[#B5B2A9] font-sans">Enter PIN code</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── BOTTOM ROW (Symmetrical & Entire Row Expands/Collapses on Click) ── */}
                <div
                  onClick={() => setIsCartExpanded((prev) => !prev)}
                  className="relative h-[56px] shrink-0 pl-2.5 pr-5 flex items-center justify-between gap-2.5 select-none cursor-pointer"
                >
                  {/* Hairline progress loader pinned flush to top without pushing button down */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-white/10 overflow-hidden pointer-events-none">
                    <div
                      className={`h-full transition-all duration-300 ${isFree ? 'bg-accent' : 'bg-accent/80'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Left: Compact Symmetrical Checkout button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckout();
                    }}
                    style={{ fontWeight: 700 }}
                    className="h-[36px] px-3.5 bg-accent hover:bg-[#c9f232] text-ink rounded-full text-xs font-satoshi font-bold tracking-tight active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <span style={{ fontWeight: 700 }}>Checkout</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>

                  {/* Middle: Free shipping details (Autoscrolling marquee when text overflows) */}
                  <div className="flex-1 min-w-0 px-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-8px),transparent)]">
                    {isFree ? (
                      <p className="text-center truncate text-[11px] font-mono leading-none">
                        <span className="text-accent font-semibold inline-flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[2.5]" /> Free shipping
                        </span>
                      </p>
                    ) : (
                      <div className="flex items-center overflow-hidden">
                        <div className="animate-pill-marquee items-center whitespace-nowrap">
                          {/* Track 1 */}
                          <div className="flex shrink-0 items-center gap-3 pr-6">
                            <span className="text-[11px] font-mono text-[#ccc9bd]">
                              Add ₹{remaining} for free delivery
                            </span>
                            <span className="text-[10px] text-white/30">•</span>
                          </div>
                          {/* Track 2 (Identical Twin - guarantees zero reset jitter) */}
                          <div className="flex shrink-0 items-center gap-3 pr-6" aria-hidden="true">
                            <span className="text-[11px] font-mono text-[#ccc9bd]">
                              Add ₹{remaining} for free delivery
                            </span>
                            <span className="text-[10px] text-white/30">•</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Arrow + Item Count on left of price, Total Price aligned with breakdown above */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Expand/collapse arrow on the left */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCartExpanded((prev) => !prev);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-[#aaa79c] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title={isCartExpanded ? "Collapse cart" : "View cart details"}
                      aria-label={isCartExpanded ? "Collapse cart" : "View cart details"}
                    >
                      <div
                        className="transition-transform duration-250 ease-out"
                        style={{ transform: isCartExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    {/* Item count on the left of price */}
                    <span className="text-xs text-[#aaa79c] font-sans">
                      ({cartCalc.itemCount})
                    </span>

                    {/* Total Price (persists total with delivery whether expanded or collapsed) */}
                    <span className="font-mono text-[15px] sm:text-base font-bold text-white tracking-tight leading-none">
                      ₹{estimatedTotal}
                    </span>
                  </div>
                </div>
              </motion.aside>
            </>
          );
        })()}
      </AnimatePresence>

      <StoreFooter />
    </div>
  );
};
