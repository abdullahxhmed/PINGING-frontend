import React from 'react';

/**
 * Official UPI (Unified Payments Interface) brand logo.
 * Preserves authentic NPCI brand colors (Orange/Green arrows & crisp typography).
 */
export const UpiIcon: React.FC<{ className?: string; height?: number; alt?: string }> = ({
  className = 'h-4 w-auto',
  height,
  alt = 'UPI - Unified Payments Interface',
}) => (
  <img
    src="/UPI-Logo-vector.svg%20(1).webp"
    alt={alt}
    style={height ? { height: `${height}px` } : undefined}
    className={`inline-block object-contain select-none ${className}`}
    loading="lazy"
  />
);

/**
 * Official Razorpay brand logo.
 * Preserves authentic Razorpay brand colors (#3395ff folded symbol and navy wordmark).
 * Optically centered and scaled to eliminate square canvas padding.
 */
export const RazorpayIcon: React.FC<{ className?: string; height?: number; alt?: string }> = ({
  className = '',
  height = 15,
  alt = 'Secured by Razorpay',
}) => {
  // Natural Razorpay image is 550x550 with content between y=220 and y=329 (~109px tall).
  // Scaling by ~4.8x matches the visual text height to the requested container height.
  const imgHeight = Math.round(height * 4.8);

  return (
    <span
      style={{ height: `${height}px` }}
      className={`inline-flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}
      title={alt}
    >
      <img
        src="/lg-689813f509f4f-Razorpay.webp"
        alt={alt}
        style={{ height: `${imgHeight}px`, width: 'auto', maxWidth: 'none' }}
        className="block object-contain pointer-events-none"
        loading="lazy"
      />
    </span>
  );
};

interface PaymentTrustBadgesProps {
  layout?: 'row' | 'stacked';
  className?: string;
  showLabels?: boolean;
}

export const PaymentTrustBadges: React.FC<PaymentTrustBadgesProps> = ({
  layout = 'row',
  className = '',
  showLabels = true,
}) => {
  return (
    <div
      className={`flex items-center text-muted font-sans text-xs ${
        layout === 'stacked'
          ? 'flex-col gap-2'
          : 'flex-wrap gap-4 sm:gap-6 justify-between'
      } ${className}`}
    >
      {showLabels && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider uppercase text-muted">
          <svg
            className="w-3.5 h-3.5 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>Guaranteed Safe &amp; Secure Checkout</span>
        </div>
      )}

      {/* Official Brand Badges */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center px-2 py-1 rounded-sm border border-border/80 bg-surface/90 shadow-2xs"
          title="Instant UPI Payments via GPay, PhonePe, Paytm, BHIM"
        >
          <UpiIcon height={15} className="h-[15px] w-auto" />
        </div>
        <div
          className="flex items-center px-2 py-1 rounded-sm border border-border/80 bg-surface/90 shadow-2xs"
          title="Secured by Razorpay"
        >
          <RazorpayIcon height={15} />
        </div>
      </div>
    </div>
  );
};

