import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';
import {
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { HeroRecreation } from '../../components/home/HeroRecreation';
import { UseCasesStack } from '../../components/home/UseCasesStack';
import { MobileMenu } from '../../components/home/MobileMenu';

// ─────────────────────────────────────────────────────────────
// Reusable scroll-reveal hook (hand-rolled IntersectionObserver)
// ─────────────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─────────────────────────────────────────────────────────────
// FAQ Data — 2 blunt/limited answers
// ─────────────────────────────────────────────────────────────
interface FaqItem { question: string; answer: string; }

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Does the person scanning need an app?',
    answer: 'No. Anyone with a smartphone camera can scan and reach you through their mobile browser without downloading an app or creating an account.',
  },
  {
    question: 'Does the person contacting me see my phone number?',
    answer: 'No. All calls and messages pass through a private relay, so your phone number is never exposed to the person contacting you.',
  },
  {
    question: 'Where do you ship?',
    answer: '[PLACEHOLDER: Shipping locations and delivery timelines]',
  },
  {
    question: 'What if someone scans my tag just to spam me?',
    answer: 'Vehicle tags can require the last digits of your license plate before allowing contact, and call attempts are rate-limited per session.',
  },
  {
    question: 'Can I disable or pause a tag?',
    answer: 'Yes. You can toggle any tag inactive with one tap from your dashboard without needing to touch the physical tag.',
  },
  {
    question: 'What can I put a Kauntact tag on?',
    answer: 'Vehicles, front doors, delivery boxes, pet collars, keys, and everyday belongings.',
  },
];

// ─────────────────────────────────────────────────────────────
// RevealBlock — hand-rolled scroll reveal
// ─────────────────────────────────────────────────────────────
interface RevealBlockProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const RevealBlock: React.FC<RevealBlockProps> = ({ children, className = '', delay = 0 }) => {
  const { ref, visible } = useReveal(0.12);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export const HomePage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const toggleFaq = (index: number) => {
    setActiveFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink">

      {/* ── NAVIGATION ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity" aria-label="Kauntact Home">
            <PingInLogo height={18} className="w-auto h-[18px] sm:h-[19px]" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-sans font-medium tracking-wider uppercase text-muted">
            <Link to="/" className="hover:text-ink transition-colors">Home</Link>
            <Link to="/shop" className="hover:text-ink transition-colors">Shop</Link>
            <Link to="/track" className="hover:text-ink transition-colors">Track Order</Link>
            <Link to="/contact" className="hover:text-ink transition-colors">Support</Link>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-xs font-sans font-medium text-ink hover:text-muted transition-colors">
              Sign In
            </Link>
            <Link to="/shop" className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-medium transition-all shadow-xs">
              <span>Get your tags</span>
              <span className="text-accent">→</span>
            </Link>
          </div>

          {/* Animated Menu Toggle Button (Transitions to X on open) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="w-10 h-10 -mr-2 flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg text-ink hover:bg-black/5 active:scale-95 focus-visible:ring-2 focus-visible:ring-ink focus:outline-none transition-all cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="falling-nav-menu"
          >
            <span
              className={`w-5 h-[1.5px] bg-ink rounded-full transition-transform duration-300 ease-out origin-center ${
                mobileMenuOpen ? 'rotate-45 translate-y-[3.75px]' : ''
              }`}
            />
            <span
              className={`w-5 h-[1.5px] bg-ink rounded-full transition-transform duration-300 ease-out origin-center ${
                mobileMenuOpen ? '-rotate-45 -translate-y-[3.75px]' : ''
              }`}
            />
          </button>
        </div>

        {/* ── White Smooth Mobile Drawer Menu ── */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </header>

      <main>

        {/* ── 01. HERO RECREATION — STEP 01: QR BUTTON & TARGET CURSOR ── */}
        <HeroRecreation />

        {/* ── FULL WIDTH FLEX STICKERS SHOWCASE ─────────────────── */}
        <section className="w-full border-b border-border bg-[#0d0d0c] overflow-hidden">
          <img
            src="/stickerImages/flexStickers.PNG"
            alt="Kauntact Flex Stickers"
            className="w-full h-auto block select-none pointer-events-none"
            loading="lazy"
          />
        </section>

        {/* ── 02. USE CASES (SPREAD HORIZONTAL LAYOUT) ─────────── */}
        <section id="use-cases" className="py-4 sm:py-14 lg:py-24 bg-bg relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <UseCasesStack />
          </div>
        </section>

        {/* ── 03. OWNER CONTROLS (BALANCED TWO-COLUMN HEADER) ──── */}
        <section className="py-14 sm:py-20 border-t border-b border-border bg-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 pb-6 border-b border-border">
                <div>
                  <span className="text-[11px] font-sans font-medium tracking-[0.08em] uppercase text-muted block mb-1">
                    Tag management
                  </span>
                  <h2 className="font-display font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight">
                    Controls for each tag
                  </h2>
                </div>
                <p className="font-satoshi text-sm sm:text-base text-[#6E6B62] max-w-md sm:text-right leading-relaxed">
                  Manage privacy rules, toggle availability, and review visitor logs in real time from your browser.
                </p>
              </div>
            </RevealBlock>

            <div className="divide-y divide-border">
              <RevealBlock delay={40}>
                <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 sm:gap-8">
                  <div className="sm:w-1/3 shrink-0 flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent border border-ink" />
                    <h3 className="font-sans font-medium text-base sm:text-lg text-ink">
                      Pause or disable a tag
                    </h3>
                  </div>
                  <p className="font-satoshi text-sm sm:text-base text-[#3A3A36] leading-relaxed sm:w-2/3">
                    Turn off incoming contact from your dashboard whenever you want privacy. Anyone scanning will see that the tag is inactive.
                  </p>
                </div>
              </RevealBlock>

              <RevealBlock delay={80}>
                <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 sm:gap-8">
                  <div className="sm:w-1/3 shrink-0 flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#11110F]" />
                    <h3 className="font-sans font-medium text-base sm:text-lg text-ink">
                      Block unwanted callers
                    </h3>
                  </div>
                  <p className="font-satoshi text-sm sm:text-base text-[#3A3A36] leading-relaxed sm:w-2/3">
                    Block nuisance callers with one tap.
                  </p>
                </div>
              </RevealBlock>

              <RevealBlock delay={120}>
                <div className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 sm:gap-8">
                  <div className="sm:w-1/3 shrink-0 flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D8D5CC]" />
                    <h3 className="font-sans font-medium text-base sm:text-lg text-ink">
                      Call and scan history
                    </h3>
                  </div>
                  <p className="font-satoshi text-sm sm:text-base text-[#3A3A36] leading-relaxed sm:w-2/3">
                    Every scan and contact attempt is logged with a timestamp so you can see when someone reached out.
                  </p>
                </div>
              </RevealBlock>
            </div>
          </div>
        </section>

        {/* ── 04. FAQ (MODERN TWO-COLUMN LAYOUT) ───────────────── */}
        <section id="faq" className="py-14 sm:py-22 border-b border-border bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              
              {/* Left Column: Contextual title & support link */}
              <div className="lg:col-span-4">
                <RevealBlock>
                  <div className="space-y-3 sticky top-24">
                    <span className="text-[11px] font-sans font-medium tracking-[0.08em] uppercase text-muted block">
                      Support
                    </span>
                    <h2 className="font-display font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight">
                      Questions
                    </h2>
                    <p className="font-satoshi text-sm text-[#6E6B62] leading-relaxed">
                      Everything you need to know about setting up tags, caller privacy, and delivery.
                    </p>
                    <div className="pt-2">
                      <Link
                        to="/contact"
                        className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-ink hover:text-muted transition-colors group"
                      >
                        <span>Need more help? Contact us</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>
                </RevealBlock>
              </div>

              {/* Right Column: Accordion list */}
              <div className="lg:col-span-8 space-y-2">
                {FAQ_ITEMS.map((faq, index) => {
                  const isOpen = activeFaqIndex === index;
                  return (
                    <RevealBlock key={faq.question} delay={index * 35}>
                      <div className="border border-border rounded-sm bg-bg transition-colors overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleFaq(index)}
                          className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                        >
                          <span className="font-sans font-medium text-sm sm:text-base text-ink tracking-normal">
                            {faq.question}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-300 ease-out shrink-0 ${isOpen ? 'rotate-180 text-ink' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{
                                height: 'auto',
                                opacity: 1,
                                transition: {
                                 height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                 opacity: { duration: 0.25, delay: 0.05 },
                                },
                              }}
                              exit={{
                                height: 0,
                                opacity: 0,
                                transition: {
                                  height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                                  opacity: { duration: 0.18 },
                                },
                              }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 text-xs sm:text-sm font-satoshi text-[#3A3A36] leading-relaxed border-t border-border/60 pt-3">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </RevealBlock>
                  );
                })}
              </div>

            </div>
          </div>
        </section>

        {/* ── 05. CLOSING BAND (DARK) ─────────────────────────── */}
        <section className="py-20 sm:py-28 bg-surface-dark text-[#f5f4ee]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
            <div className="space-y-4 max-w-xl text-left">
              <RevealBlock>
                <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl text-[#f5f4ee] tracking-tight leading-tight">
                  Get tags for your car, door or keys.
                </h2>
              </RevealBlock>
              <RevealBlock delay={40}>
                <p className="font-satoshi text-sm sm:text-base text-white/70 leading-relaxed">
                  Weatherproof matte vinyl stickers and anodised aluminium tags. Ships across India in 3 to 5 business days.
                </p>
              </RevealBlock>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <RevealBlock delay={80}>
                <Link
                  to="/shop"
                  id="footer-cta"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-accent hover:bg-accent-hover text-ink rounded-sm text-[15px] font-sans font-medium transition-all shadow-md group cursor-pointer"
                >
                  <span>Get your tags</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </RevealBlock>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-bg py-12 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity -ml-0.5" aria-label="Kauntact Home">
              <PingInSvgLogo height={16} className="text-ink" />
            </Link>

            <nav className="flex items-center gap-5 sm:gap-6 flex-wrap text-xs font-sans text-[#3A3A36]">
              <Link to="/shop" className="hover:text-ink transition-colors">Shop</Link>
              <a href="#use-cases" className="hover:text-ink transition-colors">How it works</a>
              <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
              <Link to="/contact" className="hover:text-ink transition-colors">Support</Link>
              <Link to="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-ink transition-colors">Terms</Link>
              <Link to="/shipping-and-refunds" className="hover:text-ink transition-colors">Shipping and refunds</Link>
              <a href="mailto:support@kauntact.com" className="text-muted hover:text-ink transition-colors">
                [PLACEHOLDER: Support contact]
              </a>
            </nav>
          </div>

          <div className="h-[1px] bg-border w-full" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-sans text-muted">
            <span>© 2026 Kauntact</span>
            <span>Made in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;