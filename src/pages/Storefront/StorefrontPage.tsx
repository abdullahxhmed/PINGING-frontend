import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { StoreHeader } from '../../components/store/StoreHeader';
import { StoreFooter } from '../../components/store/StoreFooter';
import {
  SETS,
  ADDONS,
  type StoreCartState,
  calculateCart,
  saveCartToStorage,
  getCartFromStorage,
} from '../../features/store/catalog';
import {
  Check,
  Plus,
  Minus,
  ArrowRight,
  RotateCw,
  ChevronDown,
  MapPin,
} from 'lucide-react';

export const StorefrontPage: React.FC = () => {
  const navigate = useNavigate();

  // Cart state persisted to storage
  const [cart, setCart] = useState<StoreCartState>(() => getCartFromStorage());

  // Flipped state for the two pack cards (front vs back)
  const [flipped, setFlipped] = useState<Record<string, boolean>>({
    essential: false,
    'curated-kit': false,
  });

  // Quirky animation trigger key
  const [lastAddedKey, setLastAddedKey] = useState<number>(0);

  // FAQ accordion state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    saveCartToStorage(cart);
  }, [cart]);

  const cartCalc = calculateCart(cart);

  const toggleFlip = (id: string) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const setSetQty = (id: string, delta: number) => {
    if (delta > 0) {
      setLastAddedKey(Date.now());
    }
    setCart((prev) => {
      const current = prev.sets[id] || 0;
      const next = Math.max(0, Math.min(20, current + delta));
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
    if (delta > 0) {
      setLastAddedKey(Date.now());
    }
    setCart((prev) => {
      const current = prev.addons[id] || 0;
      const next = Math.max(0, Math.min(20, current + delta));
      const updated = { ...prev.addons };
      if (next === 0) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return { ...prev, addons: updated };
    });
  };

  const handleCheckout = () => {
    navigate('/checkout', { state: { from: 'bottom' } });
  };


  const faqs = [
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

        {/* ── 2. SELECT A PACK: ESSENTIAL & CURATED KIT WITH 60FPS CARD FLIP ── */}
        <section className="py-6 space-y-4">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            SELECT A PACK
          </p>

          {/* CARD 1: ESSENTIAL (₹179) */}
          <div className="relative grid grid-cols-1 grid-rows-1" style={{ perspective: '1200px' }}>
            {/* FRONT SIDE */}
            <div
              className="col-start-1 row-start-1 w-full rounded-lg border border-border bg-surface p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-2xs"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: flipped.essential ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: flipped.essential ? 'none' : 'auto',
                transformStyle: 'preserve-3d',
              }}
              aria-hidden={flipped.essential}
            >
              <div className="space-y-3.5">
                <div className="flex items-baseline justify-between gap-2 border-b border-border/80 pb-2.5">
                  <div>
                    <h2 className="font-display font-medium text-xl text-ink uppercase tracking-tight">
                      {SETS.essential.name}
                    </h2>
                    <p className="text-[13px] text-muted">{SETS.essential.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xl font-semibold text-ink">
                      ₹{SETS.essential.price}
                    </span>
                  </div>
                </div>

                {/* Product Artwork Photo */}
                <div className="aspect-[16/9] rounded-md overflow-hidden border border-border bg-[#eceae1]">
                  <img
                    src={SETS.essential.image}
                    alt={SETS.essential.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Included Items Checklist (No delivery claims upfront) */}
                <div className="space-y-1.5 text-xs text-ink pt-0.5">
                  {SETS.essential.contents.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="text-[14px] leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Slot: Stepper + Know More Flip Button */}
              <div className="pt-2 flex items-center gap-2.5">
                <div className="flex-1">
                  {(cart.sets.essential || 0) === 0 ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      onClick={() => setSetQty('essential', 1)}
                      className="w-full min-h-[44px] px-4 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-md hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Add to cart</span>
                      <Plus className="w-3.5 h-3.5 text-accent" />
                    </motion.button>
                  ) : (
                    <div className="min-h-[44px] flex items-center justify-between border border-ink rounded-md bg-bg px-2 shadow-2xs">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        onClick={() => setSetQty('essential', -1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-surface rounded transition-colors cursor-pointer"
                        aria-label="Decrease Essential quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </motion.button>
                      <span className="font-mono text-sm font-semibold text-ink">
                        {cart.sets.essential} in cart
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        onClick={() => setSetQty('essential', 1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-surface rounded transition-colors cursor-pointer"
                        aria-label="Increase Essential quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Know More Flip Trigger */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  onClick={() => toggleFlip('essential')}
                  className="min-h-[44px] px-3.5 border border-border hover:border-ink rounded-md text-xs font-mono font-medium text-ink bg-bg hover:bg-surface transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Flip card for dispatch and specifications"
                >
                  <span>Know more</span>
                  <RotateCw className="w-3 h-3 text-muted" />
                </motion.button>
              </div>
            </div>

            {/* BACK SIDE (Clean 0deg facing with zero raster blur) */}
            <div
              className="col-start-1 row-start-1 w-full rounded-lg border border-border bg-surface p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: flipped.essential ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: flipped.essential ? 'auto' : 'none',
                transformStyle: 'preserve-3d',
              }}
              aria-hidden={!flipped.essential}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                    ESSENTIAL · DETAILS
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFlip('essential')}
                    className="text-xs font-mono font-medium text-ink hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Back</span>
                    <RotateCw className="w-3 h-3 text-muted" />
                  </button>
                </div>

                {/* Origin & Delivery Terms */}
                <div className="p-3 rounded-md bg-bg border border-border space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-ink font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-ink" />
                    <span>{SETS.essential.details.origin}</span>
                  </div>
                  <p className="text-muted leading-relaxed pl-5">
                    {SETS.essential.details.shipping}
                  </p>
                </div>

                {/* Specifications Checklist */}
                <div className="space-y-2 text-xs">
                  <span className="font-mono text-[10px] uppercase font-semibold text-muted block">
                    SPECIFICATIONS
                  </span>
                  <ul className="space-y-1.5 text-[13px] text-ink">
                    {SETS.essential.details.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Close back side action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleFlip('essential')}
                  className="w-full min-h-[44px] border border-border hover:border-ink rounded-md text-xs font-mono font-medium text-ink bg-bg transition-colors cursor-pointer"
                >
                  Close details
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: CURATED KIT (₹499) — HIGHLIGHTED VIA DEEP BORDER & ELEVATION SHADOW (NO BLACK BAR) */}
          <div className="relative grid grid-cols-1 grid-rows-1" style={{ perspective: '1200px' }}>
            {/* FRONT SIDE */}
            <div
              className="col-start-1 row-start-1 w-full rounded-lg border-2 border-[#1c1b18] bg-[#f0eee6] p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-lg shadow-black/8 ring-1 ring-black/5"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: flipped['curated-kit'] ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: flipped['curated-kit'] ? 'none' : 'auto',
                transformStyle: 'preserve-3d',
              }}
              aria-hidden={flipped['curated-kit']}
            >
              <div className="space-y-3.5">
                <div className="flex items-baseline justify-between gap-2 border-b border-border/80 pb-2.5">
                  <div>
                    <h2 className="font-display font-medium text-xl text-ink uppercase tracking-tight">
                      {SETS['curated-kit'].name}
                    </h2>
                    <p className="text-[13px] text-muted">Complete 4-piece kit</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xl font-semibold text-ink">
                      ₹{SETS['curated-kit'].price}
                    </span>
                  </div>
                </div>

                {/* Product Artwork Photo */}
                <div className="aspect-[16/9] rounded-md overflow-hidden border border-border bg-[#eceae1]">
                  <img
                    src={SETS['curated-kit'].image}
                    alt={SETS['curated-kit'].name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Exact Contents (No delivery claims upfront) */}
                <div className="space-y-1.5 text-xs text-ink pt-0.5">
                  {SETS['curated-kit'].contents.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="text-[14px] leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Slot: Stepper + Know More Flip Button */}
              <div className="pt-2 flex items-center gap-2.5">
                <div className="flex-1">
                  {(cart.sets['curated-kit'] || 0) === 0 ? (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      onClick={() => setSetQty('curated-kit', 1)}
                      className="w-full min-h-[44px] px-4 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-md hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Add to cart</span>
                      <Plus className="w-3.5 h-3.5 text-accent" />
                    </motion.button>
                  ) : (
                    <div className="min-h-[44px] flex items-center justify-between border border-ink rounded-md bg-bg px-2 shadow-2xs">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        onClick={() => setSetQty('curated-kit', -1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-surface rounded transition-colors cursor-pointer"
                        aria-label="Decrease Curated kit quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </motion.button>
                      <span className="font-mono text-sm font-semibold text-ink">
                        {cart.sets['curated-kit']} in cart
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        onClick={() => setSetQty('curated-kit', 1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-surface rounded transition-colors cursor-pointer"
                        aria-label="Increase Curated kit quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Know More Flip Trigger */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  onClick={() => toggleFlip('curated-kit')}
                  className="min-h-[44px] px-3.5 border border-border hover:border-ink rounded-md text-xs font-mono font-medium text-ink bg-bg hover:bg-surface transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Flip card for dispatch and specifications"
                >
                  <span>Know more</span>
                  <RotateCw className="w-3 h-3 text-muted" />
                </motion.button>
              </div>
            </div>

            {/* BACK SIDE (Clean 0deg facing with zero raster blur) */}
            <div
              className="col-start-1 row-start-1 w-full rounded-lg border-2 border-[#1c1b18] bg-[#f0eee6] p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-black/8"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: flipped['curated-kit'] ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: flipped['curated-kit'] ? 'auto' : 'none',
                transformStyle: 'preserve-3d',
              }}
              aria-hidden={!flipped['curated-kit']}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                    CURATED KIT · DETAILS
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFlip('curated-kit')}
                    className="text-xs font-mono font-medium text-ink hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Back</span>
                    <RotateCw className="w-3 h-3 text-muted" />
                  </button>
                </div>

                {/* Origin & Delivery Terms */}
                <div className="p-3 rounded-md bg-bg border border-border space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-ink font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-ink" />
                    <span>{SETS['curated-kit'].details.origin}</span>
                  </div>
                  <p className="text-muted leading-relaxed pl-5">
                    {SETS['curated-kit'].details.shipping}
                  </p>
                </div>

                {/* Specifications Checklist */}
                <div className="space-y-2 text-xs">
                  <span className="font-mono text-[10px] uppercase font-semibold text-muted block">
                    SPECIFICATIONS
                  </span>
                  <ul className="space-y-1.5 text-[13px] text-ink">
                    {SETS['curated-kit'].details.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Close back side action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleFlip('curated-kit')}
                  className="w-full min-h-[44px] border border-border hover:border-ink rounded-md text-xs font-mono font-medium text-ink bg-bg transition-colors cursor-pointer"
                >
                  Close details
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. PLAN COMPARISON: BASIC VS PLUS (COMPACT TABLE) ───────────── */}
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
              <div className="grid grid-cols-12 p-2.5 items-center">
                <span className="col-span-5 text-ink font-medium">Tags covered</span>
                <span className="col-span-3 text-center font-mono text-muted">2 tags</span>
                <span className="col-span-4 text-right font-mono font-medium text-ink">
                  Up to 8 tags
                </span>
              </div>

              <div className="grid grid-cols-12 p-2.5 items-center">
                <span className="col-span-5 text-ink font-medium">Voice calls</span>
                <span className="col-span-3 text-center text-success">Included</span>
                <span className="col-span-4 text-right text-success">Included</span>
              </div>

              <div className="grid grid-cols-12 p-2.5 items-center">
                <span className="col-span-5 text-ink font-medium">Whatsapp notifications</span>
                <span className="col-span-3 text-center text-muted">None</span>
                <span className="col-span-4 text-right text-success">Included</span>
              </div>

              <div className="grid grid-cols-12 p-2.5 items-center">
                <span className="col-span-5 text-ink font-medium">Call history</span>
                <span className="col-span-3 text-center text-muted">Recent</span>
                <span className="col-span-4 text-right text-ink font-medium">Full history</span>
              </div>

              <div className="grid grid-cols-12 p-2.5 items-center bg-bg/40">
                <span className="col-span-5 text-ink font-medium">Price</span>
                <span className="col-span-3 text-center font-mono text-success font-semibold">
                  Free
                </span>
                <span className="col-span-4 text-right font-mono text-ink font-semibold">
                  ₹99/year *
                </span>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-muted font-sans leading-relaxed">
            * First 12 months of Plus are included with both packs. If you choose not to renew, your 2
            selected tags remain active for calls with zero expiry.
          </p>
        </section>

        {/* ── 4. À LA CARTE (BUY INDIVIDUALLY OR ADD ON) ─────────────────── */}
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
          </div>

          {/* 2-Column Grid separated by break lines only (No cards) */}
          <div className="border-t border-border grid grid-cols-2">
            {Object.values(ADDONS).map((addon, idx) => {
              const qty = cart.addons[addon.id] || 0;
              const isLeftCol = idx % 2 === 0;

              return (
                <div
                  key={addon.id}
                  className={`p-3 sm:p-4 flex flex-col justify-between border-b border-border ${
                    isLeftCol ? 'border-r border-border' : ''
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Uncropped Image */}
                    <div className="aspect-[3/4] rounded-sm overflow-hidden bg-[#eceae1] relative border border-border/60">
                      <img
                        src={addon.image}
                        alt={addon.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Visual Swatch */}
                      <div className="absolute top-2 right-2 flex items-center justify-center p-1 rounded-full bg-bg/90 border border-border/80 shadow-2xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full block border"
                          style={{
                            backgroundColor: addon.swatchHex,
                            borderColor: addon.swatchBorderHex || addon.swatchHex,
                          }}
                          title={`Finish: ${addon.tone}`}
                        />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-0.5">
                      <div className="flex items-baseline justify-between gap-1">
                        <h3 className="text-xs sm:text-sm font-medium text-ink truncate">
                          {addon.name}
                        </h3>
                        <span className="font-mono text-xs sm:text-sm font-semibold text-ink shrink-0">
                          ₹{addon.price}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted line-clamp-1">
                        {addon.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Clean 44px Stepper / Add button */}
                  <div className="pt-3">
                    {qty === 0 ? (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ scale: 1.015 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        onClick={() => setAddonQty(addon.id, 1)}
                        className="w-full min-h-[44px] border border-border hover:border-ink rounded text-xs font-mono font-medium text-ink hover:bg-surface flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Add</span>
                        <Plus className="w-3.5 h-3.5 text-muted" />
                      </motion.button>
                    ) : (
                      <div className="min-h-[44px] flex items-center justify-between border border-ink rounded bg-surface px-1.5 shadow-2xs">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.8 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                          onClick={() => setAddonQty(addon.id, -1)}
                          className="min-w-[36px] min-h-[44px] flex items-center justify-center text-ink hover:bg-bg rounded transition-colors cursor-pointer"
                          aria-label={`Decrease ${addon.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </motion.button>
                        <span className="font-mono text-xs font-semibold text-ink">
                          {qty}
                        </span>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.8 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                          onClick={() => setAddonQty(addon.id, 1)}
                          className="min-w-[36px] min-h-[44px] flex items-center justify-center text-ink hover:bg-bg rounded transition-colors cursor-pointer"
                          aria-label={`Increase ${addon.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Subtle empty spacer cell if items are odd count so hairline finishes neatly */}
            {Object.values(ADDONS).length % 2 !== 0 && (
              <div className="border-b border-border p-3 sm:p-4 flex flex-col justify-center items-center text-center opacity-40">
                <span className="font-mono text-[10px] tracking-wider uppercase text-muted">
                  Kauntact
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── 5. SPECIFICATIONS & POLICIES (MARKED PLACEHOLDERS) ───────────── */}
        <section className="py-6 border-t border-border space-y-3 text-xs">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            SPECIFICATIONS &amp; POLICIES
          </p>

          <div className="rounded-lg border border-border bg-surface p-4 space-y-2.5 text-[13px] text-muted">
            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">Dimensions</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Physical dimensions]
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">Material &amp; Finish</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Vinyl material &amp; finish]
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">Adhesive</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Adhesive specification]
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">Outdoor Life</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Outdoor durability rating]
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">Returns &amp; Refunds</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Returns and refund policy]
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">Payment Methods</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Supported payment methods]
              </span>
            </div>

            <div className="flex items-start justify-between border-b border-border/70 pb-2">
              <span className="font-medium text-ink">GST Invoice</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: GST invoice information]
              </span>
            </div>

            <div className="flex items-start justify-between">
              <span className="font-medium text-ink">Support</span>
              <span className="font-mono text-muted text-right">
                [PLACEHOLDER: Support contact email/phone]
              </span>
            </div>
          </div>
        </section>

        {/* ── 6. FAQ (MOVED TO THE END) ───────────────────────────────────── */}
        <section className="py-6 border-t border-border space-y-3">
          <p className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            FREQUENTLY ASKED QUESTIONS
          </p>

          <div className="divide-y divide-border border-y border-border">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-3 font-medium text-[14px] text-ink hover:text-muted transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-ink' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-[13px] text-muted leading-relaxed animate-in fade-in duration-150">
                      {faq.a}
                    </p>
                  )}
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
