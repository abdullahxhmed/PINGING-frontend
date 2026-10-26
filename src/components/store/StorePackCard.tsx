import React from 'react';
import { motion } from 'motion/react';
import { Check, Plus, Minus, RotateCw, MapPin } from 'lucide-react';
import type { SetProduct } from '../../features/store/catalog';
import { FinishPillSwitch } from './FinishPillSwitch';
import { ProductArtwork } from './ProductArtwork';

export interface StorePackCardProps {
  product: SetProduct;
  tone: 'dark' | 'light';
  onToneChange: (tone: 'dark' | 'light') => void;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  isFlipped: boolean;
  onToggleFlip: () => void;
  isFeatured?: boolean;
  canAddMore?: boolean;
}

export const StorePackCard: React.FC<StorePackCardProps> = ({
  product,
  tone,
  onToneChange,
  quantity,
  onQuantityChange,
  isFlipped,
  onToggleFlip,
  isFeatured = false,
  canAddMore = true,
}) => {
  const isDark = tone === 'dark';
  const isSoldOut =
    product.inStock === false ||
    (product.availableQuantity !== undefined && product.availableQuantity <= 0);
  const maxStock =
    product.availableQuantity !== undefined ? Math.min(5, Math.max(0, product.availableQuantity)) : 5;
  const isMaxReached = quantity >= maxStock || canAddMore === false;

  return (
    <div
      style={{ perspective: '1200px' }}
      className="w-full"
      data-product-id={product.productId || product.id}
      data-variant-id={product.variantId}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative grid grid-cols-1 grid-rows-1 w-full"
      >
        {/* ── FRONT SIDE ──────────────────────────────────────────────── */}
        <div
          className={`col-start-1 row-start-1 w-full rounded-lg ${
            isFeatured ? 'border-2' : 'border'
          } p-4 sm:p-5 flex flex-col justify-between space-y-3.5 transition-colors duration-300 ${
            isDark
              ? isFeatured
                ? 'border-[#383730] bg-[#151513] text-[#f5f4ee] shadow-2xl shadow-black/40 ring-1 ring-white/10'
                : 'border-[#2d2c26] bg-[#151513] text-[#f5f4ee] shadow-xl shadow-black/30'
              : isFeatured
              ? 'border-[#1c1b18] bg-[#f0eee6] text-ink shadow-lg shadow-black/8 ring-1 ring-black/5'
              : 'border-border bg-surface text-ink shadow-2xs'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
            pointerEvents: isFlipped ? 'none' : 'auto',
          }}
          aria-hidden={isFlipped}
        >
          <div className="space-y-3.5">
            {/* Header: Name, Tagline & Price */}
            <div
              className={`flex items-baseline justify-between gap-2 border-b pb-2.5 ${
                isDark ? 'border-white/10' : 'border-border/80'
              }`}
            >
              <div>
                <h2
                  className={`font-display font-semibold text-xl tracking-tight ${
                    isDark ? 'text-[#f5f4ee]' : 'text-ink'
                  }`}
                >
                  {product.name}
                </h2>
                <p className={`text-[13px] ${isDark ? 'text-[#929087]' : 'text-muted'}`}>
                  {product.tagline}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`font-mono text-xl font-semibold ${
                    isDark ? 'text-white' : 'text-ink'
                  }`}
                >
                  ₹{product.price}
                </span>
                {isSoldOut ? (
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-red-500 font-semibold mt-0.5">
                    Sold Out
                  </span>
                ) : product.availableQuantity !== undefined &&
                  product.availableQuantity < 4 &&
                  product.availableQuantity > 0 ? (
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-amber-500 font-medium mt-0.5">
                    Only {product.availableQuantity} left
                  </span>
                ) : null}
              </div>
            </div>

            {/* Modular Finish Pill Switch */}
            <FinishPillSwitch
              tone={tone}
              onChange={onToneChange}
              layoutId={`pill-${product.id}`}
              isCardDark={isDark}
            />

            {/* Modular Cross-Fading Artwork */}
            <ProductArtwork
              productId={product.productId || product.id}
              images={product.images}
              alt={product.name}
              tone={tone}
            />

            {/* Checklist of included items */}
            <div
              className={`space-y-1.5 text-xs pt-0.5 ${
                isDark ? 'text-[#d6d4cb]' : 'text-ink'
              }`}
            >
              {product.contents.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isDark ? 'text-white/80' : 'text-ink'
                    }`}
                  />
                  <span className="text-[14px] leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Slot: Add / Stepper + Know More Flip Button */}
          <div className="pt-2 flex items-center gap-2.5">
            <div className="flex-1">
              {isSoldOut ? (
                <button
                  type="button"
                  disabled
                  className={`w-full min-h-[44px] px-4 text-[13px] font-medium tracking-tight rounded-md cursor-not-allowed flex items-center justify-center gap-1.5 shadow-2xs opacity-60 ${
                    isDark ? 'bg-white/10 text-white/50' : 'bg-black/10 text-ink/50'
                  }`}
                >
                  <span>Sold out</span>
                </button>
              ) : quantity === 0 ? (
                canAddMore === false ? (
                  <button
                    type="button"
                    disabled
                    className={`w-full min-h-[44px] px-4 text-[12px] font-medium tracking-tight rounded-md cursor-not-allowed flex items-center justify-center gap-1.5 shadow-2xs opacity-50 ${
                      isDark ? 'bg-white/10 text-white/50' : 'bg-black/10 text-ink/50'
                    }`}
                    title="Maximum limit of 5 items per order reached"
                  >
                    <span>Max 5 items reached</span>
                  </button>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    onClick={() => onQuantityChange(1)}
                    className={`w-full min-h-[44px] px-4 text-[13px] font-medium tracking-tight rounded-md cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs transition-all ${
                      isDark
                        ? 'bg-[#f5f4ee] hover:bg-white text-[#11110f]'
                        : 'bg-[#11110f] hover:bg-[#201f1c] text-[#f5f4ee]'
                    }`}
                  >
                    <span>Add to cart</span>
                    <Plus
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-[#11110f]' : 'text-[#f5f4ee]'
                      }`}
                    />
                  </motion.button>
                )
              ) : (
                <div
                  className={`min-h-[44px] flex items-center justify-between border rounded-md px-2 shadow-2xs transition-colors ${
                    isDark ? 'border-white/20 bg-[#1e1d1a]' : 'border-ink bg-bg'
                  }`}
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    onClick={() => onQuantityChange(-1)}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors cursor-pointer ${
                      isDark ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-surface'
                    }`}
                    aria-label={`Decrease ${product.name} quantity`}
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <span
                    className={`font-mono text-sm font-semibold ${
                      isDark ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {quantity} in cart
                  </span>
                  <motion.button
                    type="button"
                    disabled={isMaxReached}
                    whileTap={!isMaxReached ? { scale: 0.8 } : undefined}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    onClick={() => !isMaxReached && onQuantityChange(1)}
                    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded transition-colors ${
                      isMaxReached
                        ? 'opacity-25 cursor-not-allowed text-muted'
                        : isDark
                        ? 'text-white hover:bg-white/10 cursor-pointer'
                        : 'text-ink hover:bg-surface cursor-pointer'
                    }`}
                    title={isMaxReached ? `Maximum available stock (${maxStock}) reached` : `Increase ${product.name} quantity`}
                    aria-label={`Increase ${product.name} quantity`}
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
              onClick={onToggleFlip}
              className={`min-h-[44px] px-3.5 border rounded-md text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isDark
                  ? 'border-white/20 hover:border-white/40 text-[#f5f4ee] bg-white/5 hover:bg-white/10'
                  : 'border-border hover:border-ink text-ink bg-bg hover:bg-surface'
              }`}
              title="Flip card for dispatch and specifications"
            >
              <span>Know more</span>
              <RotateCw
                className={`w-3 h-3 ${isDark ? 'text-[#929087]' : 'text-muted'}`}
              />
            </motion.button>
          </div>
        </div>

        {/* ── BACK SIDE ───────────────────────────────────────────────── */}
        <div
          className={`col-start-1 row-start-1 w-full rounded-lg ${
            isFeatured ? 'border-2' : 'border'
          } p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-colors duration-300 ${
            isDark
              ? isFeatured
                ? 'border-[#383730] bg-[#151513] text-[#f5f4ee] shadow-2xl shadow-black/40'
                : 'border-[#2d2c26] bg-[#151513] text-[#f5f4ee] shadow-xl shadow-black/30'
              : isFeatured
              ? 'border-[#1c1b18] bg-[#f0eee6] text-ink shadow-lg shadow-black/8'
              : 'border-border bg-surface text-ink shadow-2xs'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            pointerEvents: isFlipped ? 'auto' : 'none',
          }}
          aria-hidden={!isFlipped}
        >
          <div className="space-y-3.5">
            <div
              className={`flex items-center justify-between border-b pb-2.5 ${
                isDark ? 'border-white/10' : 'border-border/80'
              }`}
            >
              <span
                className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-[#929087]' : 'text-muted'
                }`}
              >
                {product.name} · DETAILS
              </span>
              <button
                type="button"
                onClick={onToggleFlip}
                className={`text-xs font-mono font-medium hover:underline flex items-center gap-1 cursor-pointer ${
                  isDark ? 'text-[#f5f4ee]' : 'text-ink'
                }`}
              >
                <span>Back</span>
                <RotateCw
                  className={`w-3 h-3 ${isDark ? 'text-[#929087]' : 'text-muted'}`}
                />
              </button>
            </div>

            {/* Origin & Delivery Terms */}
            <div
              className={`p-3 rounded-md border space-y-1.5 text-xs ${
                isDark
                  ? 'bg-[#1e1d1a] border-white/10 text-[#d6d4cb]'
                  : 'bg-bg border-border text-ink'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 font-semibold ${
                  isDark ? 'text-white' : 'text-ink'
                }`}
              >
                <MapPin
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-white/80' : 'text-ink'
                  }`}
                />
                <span>{product.details.origin}</span>
              </div>
              <p
                className={`leading-relaxed pl-5 ${
                  isDark ? 'text-[#929087]' : 'text-muted'
                }`}
              >
                {product.details.shipping}
              </p>
            </div>

            {/* Specifications Checklist */}
            <div className="space-y-2 text-xs">
              <span
                className={`font-mono text-[10px] uppercase font-semibold block ${
                  isDark ? 'text-[#929087]' : 'text-muted'
                }`}
              >
                SPECIFICATIONS
              </span>
              <ul
                className={`space-y-1.5 text-[13px] ${
                  isDark ? 'text-[#d6d4cb]' : 'text-ink'
                }`}
              >
                {product.details.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isDark ? 'text-white/80' : 'text-ink'
                      }`}
                    />
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
              onClick={onToggleFlip}
              className={`w-full min-h-[44px] border rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/20 hover:border-white/40 text-white bg-white/5 hover:bg-white/10'
                  : 'border-border hover:border-ink text-ink bg-bg'
              }`}
            >
              Close details
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
