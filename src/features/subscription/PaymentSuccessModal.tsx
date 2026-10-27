import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { PaymentSuccessDetails } from '../../types/subscription';

export interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: PaymentSuccessDetails | null;
  onAction?: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  details,
  onAction,
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !details) return null;

  const planName = details.planName || 'Kauntact Plus';
  const durationMonths = details.durationMonths || 12;
  const durationText = `${durationMonths} Months`;

  const formatExpiryDate = (isoString?: string | null) => {
    if (!isoString) {
      const d = new Date();
      d.setMonth(d.getMonth() + durationMonths);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const expiryFormatted = formatExpiryDate(details.expiresAt);

  const handleContinue = () => {
    onClose();
    if (onAction) {
      onAction();
    } else {
      window.location.href = '/dashboard';
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-[#0c0c0b]/70 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Small Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-[360px] rounded-xl bg-surface border border-border shadow-2xl text-ink p-6 text-center space-y-4 z-10"
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded text-muted hover:text-ink transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── ANIMATED CLEAN TICK ─────────────────────────── */}
          <div className="pt-2 pb-1 flex justify-center">
            <svg
              viewBox="0 0 52 52"
              className="w-14 h-14"
              fill="none"
            >
              {/* Outline Circle */}
              <motion.circle
                cx="26"
                cy="26"
                r="23"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-ink"
                initial={{ pathLength: 0, rotate: -90 }}
                animate={{ pathLength: 1, rotate: -90 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'center' }}
              />

              {/* Clean Checkmark Path */}
              <motion.path
                d="M15 26.5 L22.5 34 L37 19.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h3 className="font-display font-medium text-2xl text-ink tracking-tight">
              Payment Successful
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Your subscription is active and all features are now unlocked.
            </p>
          </div>

          {/* Plan & Duration Details */}
          <div className="p-3.5 rounded-lg bg-bg/60 border border-border space-y-2 text-left text-xs font-sans">
            <div className="flex items-center justify-between">
              <span className="text-muted">Plan</span>
              <span className="font-medium text-ink">{planName}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-muted">Duration</span>
              <span className="font-mono font-medium text-ink">{durationText}</span>
            </div>
            {expiryFormatted && (
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <span className="text-muted">Valid until</span>
                <span className="font-mono text-muted">{expiryFormatted}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-3 px-4 rounded-lg bg-ink text-surface font-mono text-xs font-semibold uppercase tracking-wider hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default PaymentSuccessModal;
