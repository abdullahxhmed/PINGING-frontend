import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

/**
 * RedactionPlayground
 * ────────────────────
 * The product's whole pitch is "your number stays hidden, no matter what."
 * Instead of saying that in a bullet point, this lets the visitor try to
 * break it themselves: press and hold, watch it scramble instead of reveal,
 * and see a running count of how many times it just failed.
 *
 * No real data is ever rendered — the digits are always synthetic/random.
 * Works with mouse, touch and keyboard (space/enter) via Pointer Events.
 */

const MASK_CHAR = '•';
const DIGIT_POOL = '0123456789';
const MASKABLE_LENGTH = 10; // e.g. a 10-digit mobile number, split 5 + 5
const SCRAMBLE_INTERVAL_MS = 45;
const FLASH_DURATION_MS = 240;

function randomDigit() {
  return DIGIT_POOL[Math.floor(Math.random() * DIGIT_POOL.length)];
}

interface RedactionPlaygroundProps {
  className?: string;
  /** Shown above the number. Keep it short. */
  label?: string;
}

export const RedactionPlayground: React.FC<RedactionPlaygroundProps> = ({
  className = '',
  label = 'Press and hold. Try to read it.',
}) => {
  const [chars, setChars] = useState<string[]>(() =>
    Array(MASKABLE_LENGTH).fill(MASK_CHAR),
  );
  const [holding, setHolding] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [flash, setFlash] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const startHold = useCallback(() => {
    setHolding((already) => {
      if (already) return already;
      intervalRef.current = window.setInterval(() => {
        setChars((prev) => prev.map(() => randomDigit()));
        setAttempts((a) => a + 1);
      }, SCRAMBLE_INTERVAL_MS);
      return true;
    });
  }, []);

  const endHold = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHolding(false);
    setChars(Array(MASKABLE_LENGTH).fill(MASK_CHAR));
    setFlash(true);
    if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setFlash(false), FLASH_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      startHold();
    }
  };
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') endHold();
  };

  const groupA = chars.slice(0, 5).join('');
  const groupB = chars.slice(5, 10).join('');

  return (
    <div className={`select-none ${className}`}>
      <div
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        role="button"
        tabIndex={0}
        aria-label="Press and hold to attempt to read the number. It will not reveal."
        aria-live="polite"
        className={[
          'group relative touch-none cursor-pointer rounded-sm border px-6 py-8 sm:px-10 sm:py-10 text-center',
          'bg-surface-dark transition-all duration-200 ease-out',
          flash ? 'border-danger/60 ring-2 ring-danger/40 scale-[0.98]' : 'border-black scale-100',
        ].join(' ')}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <p className="text-[10px] font-sans tracking-[0.2em] uppercase text-white/40 mb-4">
          {label}
        </p>

        <p className="font-mono text-3xl sm:text-5xl tracking-[0.14em] text-white">
          <span className="text-white/40 mr-2 align-middle text-xl sm:text-2xl">+91</span>
          {groupA}
          <span className="mx-2 text-white/20">·</span>
          {groupB}
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-sans">
          <Lock className={`w-3.5 h-3.5 transition-colors ${holding ? 'text-danger' : 'text-accent'}`} />
          <span className={holding ? 'text-danger' : 'text-white/50'}>
            {holding ? 'Access denied — every time.' : 'This is what every visitor sees.'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-[10px] font-sans tracking-wider uppercase text-muted">
        <span>Failed attempts this session</span>
        <span className="font-mono text-ink text-xs tabular-nums">{attempts.toLocaleString()}</span>
      </div>
    </div>
  );
};