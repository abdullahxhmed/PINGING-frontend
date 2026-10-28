import React from 'react';
import { Link } from 'react-router-dom';
import { KauntactLogo } from '../brand/KauntactLogo';
import { UpiIcon, RazorpayIcon } from './PaymentTrustBadges';

export const StoreFooter: React.FC = () => {
  return (
    <footer className="border-t border-border bg-surface/50 text-muted py-12 sm:py-16 transition-colors">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <Link to="/" className="inline-block hover:opacity-85 transition-opacity">
              <KauntactLogo height={18} className="w-auto h-[18px]" />
            </Link>
            <p className="text-xs leading-relaxed max-w-sm text-muted">
              Privacy-first physical QR contact tags for vehicles and everyday belongings.
              Enables visitors to call or message you without exposing your personal phone number.
            </p>
          </div>

          {/* Product & Store Links */}
          <div className="md:col-span-3 space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink font-semibold">
              Products
            </span>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/shop" className="hover:text-ink transition-colors">
                  Essential Starter Pack
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-ink transition-colors">
                  Curated Kit Complete Set
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-ink transition-colors">
                  Add-ons &amp; Individual tags
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Service Links */}
          <div className="md:col-span-4 space-y-2.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink font-semibold">
              Policy & Support
            </span>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/contact" className="hover:text-ink transition-colors">
                  Contact Support & Help
                </Link>
              </li>
              <li>
                <span className="text-muted/80">
                  Standard Delivery: 3–5 business days across India
                </span>
              </li>
              <li>
                <span className="text-muted/80">
                  12 months included basic voice & web contact service
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Links on Left, Payment Badges on Right */}
        <div className="pt-6 border-t border-border/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[11px] font-mono text-muted/70 text-center sm:text-left">
            <span>© {new Date().getFullYear()} Kauntact. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-ink transition-colors whitespace-nowrap">
                Account Login
              </Link>
              <span>•</span>
              <Link to="/pair" className="hover:text-ink transition-colors whitespace-nowrap">
                Pair Received Tag
              </Link>
            </div>
          </div>

          {/* Payment Badges - Larger & Optically Balanced */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="flex items-center px-3 py-1.5 rounded-sm border border-border/80 bg-surface shadow-2xs"
              title="Instant UPI Payments via GPay, PhonePe, Paytm, BHIM"
            >
              <UpiIcon height={18} className="h-[18px] w-auto" />
            </div>
            <div
              className="flex items-center px-3 py-1.5 rounded-sm border border-border/80 bg-surface shadow-2xs"
              title="Secured by Razorpay"
            >
              <RazorpayIcon height={18} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
