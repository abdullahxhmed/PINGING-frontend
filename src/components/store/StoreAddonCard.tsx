import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import type { AddonItem } from '../../features/store/catalog';

export interface StoreAddonCardProps {
  addon: AddonItem;
  quantity: number;
  onQuantityChange: (delta: number) => void;
}

export const StoreAddonCard: React.FC<StoreAddonCardProps> = ({
  addon,
  quantity,
  onQuantityChange,
}) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsActive(false);
    }, 5000);
  };

  const handleCardClick = () => {
    // Toggle active state on click: tapping again dismisses back to clean photo immediately
    if (isActive) {
      setIsActive(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    } else {
      setIsActive(true);
      resetTimer();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      onClick={handleCardClick}
      className="group relative aspect-square bg-[#101010] overflow-hidden cursor-pointer select-none transition-all duration-300"
    >
      {/* Edge-to-edge Photo */}
      <img
        src={addon.image}
        alt={addon.name}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        loading="lazy"
      />

      {/* Subtle baseline vignette for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none z-10" />

      {/* Price: Bottom-Left, pure text, no pill */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 pointer-events-none">
        <span className="font-mono text-sm sm:text-[15px] font-semibold text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          ₹{addon.price}
        </span>
      </div>

      {/* Quantity Count: Top-Right, prominent large typography without pill */}
      <AnimatePresence>
        {quantity > 0 && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute top-2 right-2.5 sm:top-2.5 sm:right-3.5 z-10 pointer-events-none"
          >
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              {quantity}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active State Overlay (revealed on click, dismissible on click or after 5s) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] p-2.5 sm:p-3 flex flex-col justify-between"
          >
            {/* Item Info: Top-Left */}
            <motion.div
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="pr-10 pointer-events-none"
            >
              <h3 className="text-xs sm:text-[13px] font-medium text-white drop-shadow-sm tracking-tight leading-tight">
                {addon.name}
              </h3>
              <p className="text-[10px] font-mono text-white/75 uppercase tracking-wider mt-0.5 drop-shadow-xs">
                {addon.tone} finish · {addon.tagsCount} {addon.tagsCount === 1 ? 'tag' : 'tags'}
              </p>
            </motion.div>

            {/* Transparent Minimal Buttons: Bottom-Right (No pill) */}
            <motion.div
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="self-end"
            >
              {quantity === 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuantityChange(1);
                    resetTimer();
                  }}
                  className="px-2 py-1 text-white hover:text-white/80 active:scale-90 font-mono text-xs sm:text-sm font-semibold tracking-wider flex items-center gap-1 transition-all cursor-pointer drop-shadow-md"
                >
                  <span>+ Add</span>
                </button>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    resetTimer();
                  }}
                  className="inline-flex items-center gap-1.5 drop-shadow-md py-0.5"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(-1);
                      resetTimer();
                    }}
                    className="w-7 h-7 flex items-center justify-center text-white hover:text-white/75 active:scale-80 transition-transform cursor-pointer"
                    aria-label={`Decrease ${addon.name}`}
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="font-mono text-sm sm:text-base font-bold text-white min-w-[14px] text-center drop-shadow-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuantityChange(1);
                      resetTimer();
                    }}
                    className="w-7 h-7 flex items-center justify-center text-white hover:text-white/75 active:scale-80 transition-transform cursor-pointer"
                    aria-label={`Increase ${addon.name}`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
