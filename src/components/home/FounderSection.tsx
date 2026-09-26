import React from 'react';
import { Mail } from 'lucide-react';

/**
 * Founder section — deliberately the one place on the page with no border,
 * no rounded card, no eyebrow label. Everything else on the page lives in a
 * bordered box; this section sits directly on the background so it reads
 * as a person talking, not another module in the grid.
 *
 * `photoSrc` is optional. Without a real photo the plate-tag annotation
 * still carries the section — add the photo when you have one, don't fake it.
 */

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface FounderSectionProps {
  photoSrc?: string;
}

export const FounderSection: React.FC<FounderSectionProps> = ({ photoSrc }) => {
  return (
    <section id="founder" className="py-24 sm:py-36 border-b border-border bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Photo or, absent one, the plate rendered as a torn annotation instead of a card */}
          <div className="lg:col-span-4">
            {photoSrc ? (
              <div className="relative">
                <img
                  src={photoSrc}
                  alt="Abdullah with the Suzuki Access 125 used throughout this page"
                  className="w-full aspect-[4/5] object-cover rounded-sm -rotate-1"
                />
                <span className="absolute -bottom-3 -right-3 bg-accent text-ink text-[10px] font-mono tracking-widest uppercase px-2 py-1 rotate-2 shadow-md">
                  MH01-BX-4421
                </span>
              </div>
            ) : (
              <div className="relative pt-6">
                <p className="font-mono text-4xl sm:text-5xl text-ink -rotate-1 leading-none">
                  MH01
                  <br />
                  BX-4421
                </p>
                <p className="mt-4 text-[11px] font-sans text-muted tracking-wide uppercase rotate-1">
                  same plate, every mockup on this page
                </p>
              </div>
            )}
          </div>

          {/* Copy — no border, no card, just type */}
          <div className="lg:col-span-8 space-y-6">
            <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight leading-tight">
              Why I built Pingin.
            </h2>

            <div className="space-y-4 text-base font-sans text-ink/80 leading-relaxed max-w-2xl">
              <p>
                I'm based in Delhi. I ride a Suzuki Access 125 — plate MH01-BX-4421, the
                same one you've seen through this whole page. I've parked in a cramped
                spot more than once and genuinely worried someone would need to reach
                me. The only real option was leaving my personal number somewhere
                visible.
              </p>
              <p>
                I wasn't comfortable with that, and I couldn't find anything that
                handled it properly — most alternatives still assumed you'd just hand
                over your number eventually.
              </p>
              <p className="text-ink">
                Before this I did full-stack freelance work. Pingin is my first real
                product. It isn't finished. I use it daily, on that scooter.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans text-ink">
              <span className="font-display text-sm text-ink">Abdullah</span>
              <span className="text-border">·</span>
              <a
                href="https://github.com/abdullahxhmed"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-muted hover:text-ink transition-colors uppercase tracking-wider"
              >
                <GithubIcon />
                <span>GitHub</span>
              </a>
              <a
                href="mailto:contact@pingin.in"
                className="inline-flex items-center gap-1.5 text-muted hover:text-ink transition-colors uppercase tracking-wider"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};