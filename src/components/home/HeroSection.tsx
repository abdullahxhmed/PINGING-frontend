import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ClickSpark } from '../ui/ClickSpark';
import { RedactionPlayground } from '../interactive/RedactionPlayground';

/**
 * Hero — rewritten to drop two things that made the previous version read
 * as templated regardless of animation: the all-caps display headline, and
 * a static QR mockup standing in for the product. The redaction toy
 * replaces the mockup as the visual centerpiece because it demonstrates
 * the product's claim instead of illustrating it.
 */
export const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-20 sm:pt-28 pb-24 sm:pb-32 border-b border-border overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7 space-y-7 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-sm text-[11px] font-sans font-medium tracking-[0.14em] uppercase text-muted">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Private contact for physical things</span>
            </div>

            {/* Sentence case, not uppercase — the template signature was the caps, not the size. */}
            <h1 className="font-display font-medium text-[clamp(2.6rem,6.4vw,4.8rem)] tracking-tight text-ink leading-[1.03]">
              Give people a way to reach you,
              <br />
              without giving them your number.
            </h1>

            <p className="text-lg sm:text-xl text-muted font-sans font-normal max-w-lg leading-relaxed">
              A tag on your car, door or bag. Someone scans it, calls you through a
              private relay, and never once sees your actual digits.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <ClickSpark sparkCount={7} sparkColor="#d7ff3f" sparkDuration={380}>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-3 px-7 py-4 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all group cursor-pointer w-full sm:w-auto"
                >
                  <span>Get your tag</span>
                  <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
                </Link>
              </ClickSpark>
              <a
                href="#privacy"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-surface hover:bg-surface/80 border border-border text-ink rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-colors"
              >
                <span>See how the call connects</span>
                <span className="text-muted">↓</span>
              </a>
            </div>
          </div>

          {/* Right: the redaction toy — this is the whole page's first impression now */}
          <div className="lg:col-span-5">
            <RedactionPlayground />
          </div>
        </div>
      </div>
    </section>
  );
};