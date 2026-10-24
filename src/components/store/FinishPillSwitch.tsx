import React from 'react';
import { motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';

export interface FinishPillSwitchProps {
  tone: 'dark' | 'light';
  onChange: (tone: 'dark' | 'light') => void;
  layoutId?: string;
  isCardDark?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const FinishPillSwitch: React.FC<FinishPillSwitchProps> = ({
  tone,
  onChange,
  layoutId = 'finish-pill',
  isCardDark,
  showLabel = true,
  className = '',
}) => {
  const isDark = tone === 'dark';
  // Use explicit isCardDark if passed, otherwise default to whether finish tone is dark
  const cardDark = isCardDark !== undefined ? isCardDark : isDark;

  return (
    <div className={`flex items-center justify-between gap-2 pt-0.5 relative z-20 ${className}`}>
      {showLabel && (
        <div className="flex items-baseline gap-1 font-mono text-[13px] sm:text-sm">
          <span
            className={`font-normal tracking-wider ${
              cardDark ? 'text-white/60' : 'text-muted'
            }`}
          >
            FINISH:
          </span>
          <span
            className={`font-normal transition-colors duration-200 ${
              cardDark ? 'text-white' : 'text-ink'
            }`}
          >
            {tone}
          </span>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Select finish"
        className={`relative inline-flex items-center p-1 rounded-full border transition-colors duration-300 ${
          cardDark
            ? 'border-white/15 bg-white/[0.08]'
            : 'border-border/90 bg-black/[0.05]'
        }`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={isDark}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('dark');
          }}
          className="relative w-11 h-7 rounded-full cursor-pointer flex items-center justify-center z-10"
          title="Switch to dark finish"
          aria-label="dark finish"
        >
          {isDark && (
            <motion.div
              layoutId={layoutId}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute inset-0 bg-white rounded-full shadow-xs"
            />
          )}
          <Moon
            className={`relative z-10 w-4 h-4 stroke-[2] transition-colors duration-200 ${
              isDark ? 'text-[#11110f]' : 'text-muted hover:text-ink'
            }`}
          />
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={!isDark}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('light');
          }}
          className="relative w-11 h-7 rounded-full cursor-pointer flex items-center justify-center z-10"
          title="Switch to light finish"
          aria-label="light finish"
        >
          {!isDark && (
            <motion.div
              layoutId={layoutId}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute inset-0 bg-[#11110f] rounded-full shadow-xs"
            />
          )}
          <Sun
            className={`relative z-10 w-4 h-4 stroke-[2] transition-colors duration-200 ${
              !isDark ? 'text-[#f5f4ee]' : 'text-white/45 hover:text-white'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
