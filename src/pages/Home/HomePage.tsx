import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';
import {
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { ClickSpark } from '../../components/ui/ClickSpark';
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
    question: 'Do I need an app to contact someone?',
    answer: 'No. Anyone with a smartphone camera can scan and reach you through their mobile browser. No download, no account, no registration for the visitor.',
  },
  {
    question: 'Does the person contacting me see my phone number?',
    answer: 'No. All calls pass through a private relay. The caller only ever sees "Connecting..." — your actual digits are never transmitted to their device.',
  },
  {
    question: 'Is Findat available in my country right now?',
    answer: 'Honestly, it depends. Voice relay currently works reliably in India. International numbers and certain VoIP providers behave inconsistently — we are still working through it.',
  },
  {
    question: 'What if someone scans my tag just to spam me?',
    answer: 'Vehicle tags can require the last 4 digits of your plate before allowing contact — that alone filters out almost all remote attempts. We also rate-limit call attempts per session. It is not perfect, but it meaningfully raises the effort required.',
  },
  {
    question: 'Can I disable or pause a tag?',
    answer: 'Yes. From your dashboard, toggle any tag inactive with one tap. Visitors see the link is unavailable. No need to touch the physical sticker.',
  },
  {
    question: 'What can I put a Findat tag on?',
    answer: 'Vehicles, front doors, delivery boxes, office desks, equipment, pet collars, luggage — anything physical where someone might need the owner.',
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
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity" aria-label="Findat Home">
            <PingInLogo height={18} className="w-auto h-[18px] sm:h-[19px]" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-sans font-medium tracking-wider uppercase text-muted">
            <a href="#the-problem" className="hover:text-ink transition-colors">The Problem</a>
            <a href="#use-cases" className="hover:text-ink transition-colors">Use Cases</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-xs font-sans font-medium tracking-wider uppercase text-ink hover:text-muted transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all shadow-xs">
              <span>GET YOUR TAG</span>
              <span className="text-accent">→</span>
            </Link>
          </div>

          {/* Animated Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="sm:hidden w-10 h-10 -mr-2 flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg text-ink hover:bg-black/5 active:scale-95 focus:outline-none transition-all cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`w-5 h-[1.5px] bg-ink rounded-full transition-transform duration-300 ease-out origin-center ${
                mobileMenuOpen ? 'rotate-45 translate-y-[4.5px]' : ''
              }`}
            />
            <span
              className={`w-5 h-[1.5px] bg-ink rounded-full transition-transform duration-300 ease-out origin-center ${
                mobileMenuOpen ? '-rotate-45 -translate-y-[3px]' : ''
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

      {/* ── 02. THE PROBLEM ──────────────────────────────────── */}
        <section id="the-problem" className="py-20 sm:py-32 border-b border-border bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">

            {/* Asymmetric: large number left, text right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-0 items-start">
              <div className="lg:col-span-3 lg:pt-2">
                <RevealBlock>
                  <span className="font-display font-medium text-[clamp(5rem,14vw,10rem)] text-border leading-none select-none">
                    01
                  </span>
                </RevealBlock>
              </div>

              <div className="lg:col-span-9 space-y-8">
                <RevealBlock>
                  <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                    THE PROBLEM
                  </span>
                  <h2 className="font-display font-medium text-3xl sm:text-[2.8rem] text-ink tracking-tight uppercase leading-tight mt-2">
                    YOU NEED TO BE REACHABLE.<br />
                    BUT YOU DON'T WANT TO SHARE YOUR NUMBER.
                  </h2>
                </RevealBlock>

                <RevealBlock delay={80}>
                  <div className="space-y-4 max-w-2xl text-sm sm:text-base font-sans text-muted leading-relaxed">
                    <p>
                      Your phone number is private. But in everyday situations, you may need to put it on your car, share it with a delivery person, or attach it to something you own.
                    </p>
                    <p>
                      Once someone gets your number, you don't know where it goes or who may contact you later.
                    </p>
                  </div>
                </RevealBlock>

                <RevealBlock delay={120}>
                  <p className="font-display font-medium text-xl sm:text-2xl text-ink border-t border-border pt-6 mt-2 leading-snug">
                    <span className="inline-flex items-baseline flex-wrap gap-x-2.5">
                      <PingInSvgLogo inline height="0.74em" className="ml-2.5 sm:ml-3" />
                      <span>gives physical things a private way to reach you.</span>
                    </span>
                  </p>
                </RevealBlock>
              </div>
            </div>
          </div>
        </section>

        {/* ── 02. USE CASES (SPREAD HORIZONTAL LAYOUT) ─────────── */}
        <section id="use-cases" className="py-4 sm:py-14 lg:py-24 border-b border-border bg-bg relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <UseCasesStack />
          </div>
        </section>

        {/* ── 03. FAQ ──────────────────────────────────────────── */}
        <section id="faq" className="py-20 sm:py-28 border-b border-border bg-surface">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <div className="space-y-3 mb-12">
                <div className="flex items-center gap-3">
                  <span className="font-display font-medium text-2xl sm:text-3xl text-border leading-none select-none">
                    03
                  </span>
                  <span className="text-border">/</span>
                  <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                    FAQ
                  </span>
                </div>
                <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight uppercase">
                  Frequently asked.
                </h2>
              </div>
            </RevealBlock>

            <div className="space-y-2">
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
                        <span className="font-display font-medium text-sm sm:text-base text-ink uppercase tracking-wide">
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
                            <div className="px-5 pb-5 text-xs sm:text-sm font-sans text-muted leading-relaxed border-t border-border/60 pt-3">
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
        </section>

        {/* ── 11. CTA ──────────────────────────────────────────── */}
        <section className="py-28 sm:py-40 bg-surface-dark text-[#f5f4ee]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
            <RevealBlock>
              <h2 className="font-display font-medium text-[clamp(3rem,8vw,6.5rem)] text-[#f5f4ee] tracking-tight uppercase leading-[0.9]">
                Put a <PingInSvgLogo inline findColor="#f5f4ee" atColor="#8f8f8f" className="mx-2" /> tag<br />on something.
              </h2>
            </RevealBlock>
            <RevealBlock delay={60}>
              <p className="text-base sm:text-lg font-sans text-white/70 max-w-md mx-auto leading-relaxed">
                Give people a way to reach you without putting your phone number in public.
              </p>
            </RevealBlock>
            <RevealBlock delay={100}>
              <div className="flex justify-center">
                <ClickSpark sparkCount={7} sparkColor="#d7ff3f" sparkDuration={380}>
                  <Link
                    to="/signup"
                    id="footer-cta"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-accent hover:bg-accent-hover text-ink rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all shadow-md group cursor-pointer"
                  >
                    <span>GET YOUR TAG</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </ClickSpark>
              </div>
            </RevealBlock>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-bg py-12 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2 max-w-md">
              <Link to="/" className="inline-block hover:opacity-80 transition-opacity -ml-0.5" aria-label="Findat Home">
                <PingInSvgLogo height={14} className="text-ink" />
              </Link>
              <p className="text-xs sm:text-sm font-sans text-muted">Give things a way to reach you.</p>
            </div>
            <div>
              <Link to="/signup" className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-widest uppercase text-ink underline hover:text-muted transition-colors">
                <span>Get your own tag</span>
                <span className="text-accent">→</span>
              </Link>
            </div>
          </div>

          <div className="h-[1px] bg-border w-full" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] font-sans text-muted tracking-wider">
            <div className="flex items-center gap-4 flex-wrap">
              <a href="#the-problem" className="hover:text-ink transition-colors">The Problem</a>
              <span className="text-border">•</span>
              <a href="#use-cases" className="hover:text-ink transition-colors">Use Cases</a>
              <span className="text-border">•</span>
              <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
              <span className="text-border">•</span>
              <a href="mailto:contact@findat.in" className="hover:text-ink transition-colors">Contact</a>
            </div>
            <span>© {new Date().getFullYear()} Findat · Built by Abdullah Ahmed</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;