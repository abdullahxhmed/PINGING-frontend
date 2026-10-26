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
} from 'lucide-react';

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
  const { sets, addons } = useStoreCatalog();

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




  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink flex flex-col relative">
      <StoreHeader cartCount={cartCalc.itemCount} lastAddedKey={lastAddedKey} />

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
              <div className="py-10 px-4 rounded-xl border border-dashed border-border text-center space-y-1.5 bg-surface/50">
                <p className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
                  No Featured Packs Slotted
                </p>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Storefront packs are being configured in the admin placement console.
                </p>
              </div>
            ) : (
              primaryPacks.map((product) => {
                const packId = product.id;
                const tone = packTones[packId] || 'light';
                const isCardFlipped = Boolean(flipped[packId]);
                const cardQty = cart.sets[packId] || 0;

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
                    isFeatured={Boolean(product.featured)}
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
            <div className="py-8 px-4 rounded-xl border border-dashed border-border text-center space-y-1 bg-surface/50">
              <p className="text-xs text-muted font-medium">
                No individual items currently in catalog.
              </p>
            </div>
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

      {/* ── STICKY CHECKOUT ROW (COMPACT FLOATING DOCK WITH SMOOTH OPEN/CLOSE) ── */}
      <AnimatePresence>
        {cartCalc.itemCount > 0 && (
          <motion.aside
            role="region"
            aria-label="Active order summary"
            initial={{ y: 80, opacity: 0, scale: 0.92 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: lastAddedKey ? [1, 1.035, 0.985, 1] : 1,
            }}
            exit={{ y: 80, opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-4 inset-x-4 max-w-[370px] mx-auto z-40"
          >
            <div className="bg-[#1c1b18]/95 backdrop-blur-md text-[#f5f4ee] rounded-full py-1.5 pl-4 pr-1.5 shadow-xl shadow-black/25 border border-white/10 flex items-center justify-between gap-3">
              <div className="overflow-hidden min-w-0">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`dock-stats-${cartCalc.total}-${cartCalc.itemCount}`}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className="flex items-baseline gap-1.5 truncate"
                  >
                    <span className="font-mono text-xs font-bold text-white">
                      ₹{cartCalc.total}
                    </span>
                    <span className="text-[11px] text-[#aaa79c] truncate font-sans">
                      ({cartCalc.itemCount} {cartCalc.itemCount === 1 ? 'item' : 'items'})
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                style={{ fontWeight: 700 }}
                className="px-4 py-1.5 bg-accent hover:bg-[#c9f232] text-ink rounded-full text-[13px] sm:text-sm font-satoshi font-bold tracking-tight active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <span style={{ fontWeight: 700 }}>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <StoreFooter />
    </div>
  );
};
