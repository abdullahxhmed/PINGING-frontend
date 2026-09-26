import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';
import {
  ArrowRight,
  Shield,
  QrCode,
  Car,
  Home,
  Briefcase,
  Package,
  Layers,
  Search,
  Check,
  ChevronDown,
  Lock,
  Smartphone,
  EyeOff,
  Menu,
  X,
} from 'lucide-react';
import { DecryptedText } from '../../components/ui/DecryptedText';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ClickSpark } from '../../components/ui/ClickSpark';
import { HeroRecreation } from '../../components/home/HeroRecreation';

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
// Relay Diagram — custom scroll-animated dot
// ─────────────────────────────────────────────────────────────
const RelayDiagram: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [bridgeVisible, setBridgeVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const dot = dotRef.current;
    if (!section || !dot) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const windowH = window.innerHeight;
      // 0 = top of section at bottom of viewport, 1 = bottom of section at top
      const progress = Math.max(0, Math.min(1, 1 - rect.top / windowH));
      const clamped = Math.max(0, Math.min(1, (progress - 0.1) / 0.7));
      dot.style.left = `${clamped * 100}%`;
      if (clamped > 0.45 && !bridgeVisible) setBridgeVisible(true);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [bridgeVisible]);

  return (
    <div ref={sectionRef} className="relative">
      {/* Three endpoints */}
      <div className="grid grid-cols-3 gap-2 items-center mb-6">
        <div className="p-3 bg-bg border border-border rounded-sm space-y-1 text-center">
          <Smartphone className="w-5 h-5 mx-auto text-ink" />
          <p className="text-[11px] font-sans font-medium text-ink">Visitor</p>
          <p className="text-[10px] text-muted">Sees QR, enters web</p>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div
            className="transition-all duration-500"
            style={{ opacity: bridgeVisible ? 1 : 0, transform: bridgeVisible ? 'translateY(0)' : 'translateY(4px)' }}
            ref={labelRef}
          >
            <span className="text-[9px] font-sans font-semibold text-[#315f43] tracking-wider uppercase block text-center">
              ENCRYPTED BRIDGE
            </span>
          </div>
          <div className="relative w-full h-[2px] bg-border-strong">
            <div
              ref={dotRef}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-2 border-surface-dark"
              style={{ left: '0%', transition: 'left 0.05s linear' }}
            />
          </div>
          <p className="text-[10px] font-sans text-muted tracking-wider uppercase text-center">PINGIN RELAY</p>
        </div>

        <div className="p-3 bg-bg border border-border rounded-sm space-y-1 text-center">
          <Smartphone className="w-5 h-5 mx-auto text-ink" />
          <p className="text-[11px] font-sans font-medium text-ink">You</p>
          <p className="text-[10px] text-muted">Phone rings</p>
        </div>
      </div>

      <div className="p-3 bg-bg border border-border rounded-sm text-xs font-sans text-muted leading-relaxed">
        <span className="font-semibold text-ink">Result: </span>
        Both parties speak on a live connection. Neither ever sees the other's actual number.
      </div>
    </div>
  );
};

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
    question: 'Is Pingin available in my country right now?',
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
    question: 'What can I put a Pingin tag on?',
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
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 550ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 550ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
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
  const [activePreviewTab, setActivePreviewTab] = useState<'contact' | 'call' | 'dashboard'>('contact');

  const toggleFaq = (index: number) => {
    setActiveFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink">

      {/* ── NAVIGATION ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity -ml-1 sm:ml-0" aria-label="PingIn Home">
            <PingInLogo className="w-[114px] h-[27px] sm:w-[136px] sm:h-[32px]" width={136} height={32} />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-sans font-medium tracking-wider uppercase text-muted">
            <a href="#the-problem" className="hover:text-ink transition-colors">The Problem</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">How It Works</a>
            <a href="#use-cases" className="hover:text-ink transition-colors">Use Cases</a>
            <a href="#privacy" className="hover:text-ink transition-colors">Privacy</a>
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="sm:hidden p-2 text-ink hover:text-muted focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-border bg-surface px-6 py-5 space-y-4 animate-in fade-in duration-150">
            <nav className="flex flex-col gap-3 text-xs font-sans font-medium tracking-wider uppercase text-muted">
              {['the-problem', 'how-it-works', 'use-cases', 'privacy', 'faq'].map((id) => (
                <a key={id} href={`#${id}`} onClick={() => setMobileMenuOpen(false)} className="hover:text-ink transition-colors py-1 capitalize">
                  {id.replace(/-/g, ' ')}
                </a>
              ))}
            </nav>
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2 text-xs font-sans font-semibold tracking-wider uppercase text-ink border border-border rounded-sm">
                Sign In
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 bg-surface-dark text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase">
                Get Your Tag →
              </Link>
            </div>
          </div>
        )}
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
                    The Problem
                  </span>
                  <h2 className="font-display font-medium text-3xl sm:text-[2.8rem] text-ink tracking-tight uppercase leading-tight mt-2">
                    Someone needs to reach you.<br />The easiest option exposes your number.
                  </h2>
                </RevealBlock>

                <RevealBlock delay={80}>
                  <p className="text-sm font-sans text-muted leading-relaxed max-w-2xl">
                    Your car blocks someone in. A courier needs gate access. Someone found your bag.
                    The reflex is to write a phone number somewhere visible — a slip of paper, a note on the windshield.
                  </p>
                  <div className="mt-5 p-4 rounded-sm border border-danger/30 bg-danger/5 text-xs font-sans text-ink leading-relaxed">
                    <span className="font-semibold text-danger">The problem with that: </span>
                    once that number is in a stranger's pocket, you can't un-share it.
                    It gets saved, forwarded, or sold. There's no take-back.
                  </div>
                </RevealBlock>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[
                    { icon: Car, label: 'Blocked vehicle' },
                    { icon: Package, label: 'Delivery access' },
                    { icon: Search, label: 'Lost valuables' },
                    { icon: Briefcase, label: 'Office / desk' },
                  ].map(({ icon: Icon, label }, i) => (
                    <RevealBlock key={label} delay={i * 60}>
                      <div className="p-4 bg-bg border border-border rounded-sm space-y-2.5">
                        <Icon className="w-4 h-4 text-muted" />
                        <p className="text-xs font-sans font-medium text-ink uppercase tracking-wide">{label}</p>
                      </div>
                    </RevealBlock>
                  ))}
                </div>

                <RevealBlock delay={120}>
                  <p className="font-display font-medium text-xl sm:text-2xl text-ink border-t border-border pt-6 mt-2">
                    Pingin gives physical things a private way to reach you.
                  </p>
                </RevealBlock>
              </div>
            </div>
          </div>
        </section>

        {/* ── 03. HOW IT WORKS ─────────────────────────────────── */}
        <section id="how-it-works" className="py-20 sm:py-32 border-b border-border bg-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <div className="flex items-baseline gap-4 mb-14">
                <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">02 / Workflow</span>
              </div>
              <h2 className="font-display font-medium text-3xl sm:text-5xl text-ink tracking-tight uppercase mb-14 max-w-md leading-tight">
                Four steps.<br />Nobody shares their number.
              </h2>
            </RevealBlock>

            {/* Horizontal step flow — different layout from others */}
            <div className="relative">
              <div className="absolute top-[2.2rem] left-0 right-0 h-[1px] bg-border hidden sm:block" aria-hidden="true" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 sm:gap-4">
                {[
                  { n: '01', title: 'Tag it', body: "Attach a Pingin sticker to the Suzuki's windshield. Your personal number goes nowhere near it." },
                  { n: '02', title: 'They scan', body: 'Someone sees the sticker, opens their camera, scans. A clean web page opens in 2 seconds.' },
                  { n: '03', title: 'They choose', body: 'Private call or quick note. They enter their number; the relay takes it from there.' },
                  { n: '04', title: 'You respond', body: 'Your phone rings. The relay bridges it. MH01-BX-4421 stays private the entire time.' },
                ].map(({ n, title, body }, i) => (
                  <RevealBlock key={n} delay={i * 70} className="relative">
                    <div className="sm:pt-14 space-y-3">
                      <span className="font-display font-medium text-2xl text-muted/50 relative bg-bg pr-3">{n}</span>
                      <h3 className="font-display font-medium text-base text-ink uppercase">{title}</h3>
                      <p className="text-xs font-sans text-muted leading-relaxed">{body}</p>
                    </div>
                  </RevealBlock>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 04. FLAGSHIP SCENARIO: THE PARKED CAR ───────────── */}
        <section className="border-b border-border bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

              <div className="lg:col-span-6 space-y-6">
                <RevealBlock>
                  <div className="inline-flex items-center gap-1.5 text-xs font-sans font-medium tracking-widest uppercase text-muted">
                    <Car className="w-4 h-4 text-ink" />
                    <span>Flagship use case</span>
                  </div>
                  <h2 className="font-display font-medium text-3xl sm:text-5xl text-ink tracking-tight uppercase leading-tight mt-4">
                    Your car doesn't need your phone number on it.
                  </h2>
                </RevealBlock>

                <RevealBlock delay={60}>
                  <p className="text-sm font-sans text-muted leading-relaxed">
                    You park in Khan Market and accidentally block a white Fortuner. The driver walks
                    up, sees the Pingin sticker on your Suzuki Access, and scans it.
                  </p>
                  <blockquote className="mt-4 p-4 bg-bg border-l-2 border-ink rounded-r-sm text-sm font-sans italic text-ink">
                    "Bhai, please move your scooter — I need to leave in 5 minutes."
                  </blockquote>
                </RevealBlock>

                <RevealBlock delay={100}>
                  <p className="text-sm font-sans text-muted leading-relaxed">
                    They enter the last 4 digits of your plate (MH01-BX-<strong>4421</strong>) to confirm they're actually at your vehicle, not calling you from a different city.
                    Then they tap "Call privately." Your phone rings. Their number is never stored.
                  </p>
                </RevealBlock>

                <RevealBlock delay={140}>
                  <ul className="space-y-2 text-xs font-sans text-ink pt-2">
                    {[
                      '4-digit plate check blocks remote spam',
                      'Private voice call connects in seconds',
                      'Your number never appears anywhere',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#315f43] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </RevealBlock>
              </div>

              {/* Side-by-side comparison — flat vs SpotlightCard */}
              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Traditional — flat, faded */}
                <RevealBlock>
                  <div className="p-6 bg-bg border border-dashed border-border-strong rounded-sm space-y-4 select-none opacity-80 h-full">
                    <span className="text-[10px] font-sans font-semibold tracking-widest uppercase text-danger block">
                      Traditional
                    </span>
                    <div className="p-4 bg-surface border border-border rounded-xs text-center space-y-1 font-sans">
                      <p className="text-xs text-muted uppercase">Call me</p>
                      <p className="text-base font-semibold tracking-wider text-danger line-through">+91 98765 43210</p>
                    </div>
                    <ul className="text-[11px] font-sans text-muted space-y-1.5 leading-snug">
                      <li>• Visible to anyone walking past</li>
                      <li>• Saved, shared, or spammed with no recourse</li>
                      <li>• No way to revoke once seen</li>
                    </ul>
                  </div>
                </RevealBlock>

                {/* Pingin — SpotlightCard */}
                <RevealBlock delay={80}>
                  <SpotlightCard
                    spotlightColor="rgba(215, 255, 63, 0.07)"
                    className="p-6 bg-surface-dark text-[#f5f4ee] border border-black rounded-sm space-y-4 shadow-md h-full"
                  >
                    <span className="text-[10px] font-sans font-semibold tracking-widest uppercase text-accent block">
                      With Pingin
                    </span>
                    <div className="p-4 bg-[#1e1e1b] border border-white/10 rounded-xs text-center space-y-2">
                      <div className="inline-flex p-2 bg-white rounded-xs">
                        <QrCode className="w-10 h-10 text-ink" />
                      </div>
                      <p className="text-[10px] font-sans tracking-widest text-white/60 uppercase">MH01-BX-4421</p>
                    </div>
                    <ul className="text-[11px] font-sans text-white/80 space-y-1.5 leading-snug">
                      <li className="text-accent">• Zero phone numbers exposed</li>
                      <li>• Plate check filters remote attempts</li>
                      <li>• Pause or disable anytime</li>
                    </ul>
                  </SpotlightCard>
                </RevealBlock>
              </div>
            </div>
          </div>
        </section>

        {/* ── 05. PRIVACY / RELAY DIAGRAM ──────────────────────── */}
        <section id="privacy" className="border-b border-border bg-bg">
          {/* Full-bleed eyebrow — structurally different */}
          <div className="bg-surface-dark text-[#f5f4ee] py-10 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <p className="font-display font-medium text-[clamp(2.5rem,6vw,5rem)] uppercase tracking-tight leading-none">
                The call goes through.{' '}
                <DecryptedText
                  text="PRIVATE."
                  animateOn="view"
                  speed={55}
                  maxIterations={12}
                  className="text-accent"
                />{' '}
                Your number doesn't.
              </p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-5 space-y-4">
                <RevealBlock>
                  <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                    05 / Privacy architecture
                  </span>
                  <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight uppercase leading-tight mt-2">
                    How it's kept private.
                  </h2>
                </RevealBlock>
                <RevealBlock delay={60}>
                  <div className="space-y-3 pt-2 text-xs font-sans text-ink">
                    {[
                      { icon: Shield, text: 'Your phone number is never shown to the visitor scanning your tag.' },
                      { icon: Lock, text: 'Contact details used for connecting calls are not exposed in the QR data itself.' },
                      { icon: EyeOff, text: "Visitor numbers are transient — they're used to bridge the call, then discarded." },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-start gap-2.5">
                        <Icon className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </RevealBlock>
              </div>

              {/* Custom Relay Diagram */}
              <div className="lg:col-span-7 p-6 sm:p-8 bg-surface border border-border rounded-sm space-y-6">
                <div className="flex items-center justify-between text-xs font-sans uppercase text-muted pb-3 border-b border-border">
                  <span>Visitor (caller)</span>
                  <span className="text-accent bg-surface-dark px-1.5 py-0.5 rounded-xs font-semibold text-[10px]">
                    Private relay
                  </span>
                  <span>You</span>
                </div>
                <RelayDiagram />
              </div>
            </div>
          </div>
        </section>

        {/* ── 06. USE CASES ────────────────────────────────────── */}
        <section id="use-cases" className="py-20 sm:py-28 border-b border-border bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
                <div>
                  <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted block mb-2">
                    06 / Applications
                  </span>
                  <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight uppercase">
                    One tag. Many places.
                  </h2>
                </div>
                <p className="text-sm font-sans text-muted max-w-xs leading-relaxed">
                  Anything physical that might need a voice. Same Suzuki Access. Different scenarios.
                </p>
              </div>
            </RevealBlock>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Car, label: 'Vehicle', headline: '"Need to reach the owner?"', sub: 'Parking blocks, lights left on, accidental alarms. Already demonstrated above with the Suzuki.' },
                { icon: Home, label: 'Home / Gate', headline: '"Need to contact someone here?"', sub: "For couriers and neighbors. Without your digits on the door." },
                { icon: Briefcase, label: 'Office / Desk', headline: '"Need to reach the right person?"', sub: 'Shared workspaces or equipment that needs someone responsible.' },
                { icon: Package, label: 'Delivery box', headline: '"Something arrived?"', sub: 'Direct courier access to confirm safe drop-off, no personal contact info required.' },
                { icon: Search, label: 'Lost item', headline: '"Found something?"', sub: 'Tag your bag or keys so the finder can ping you to arrange a return. The Suzuki key fob too.' },
                { icon: Layers, label: 'Equipment', headline: '"Need to report an issue?"', sub: 'Communal appliances, shared machines — flag maintenance without hunting for a manager.' },
              ].map(({ icon: Icon, label, headline, sub }, i) => (
                <RevealBlock key={label} delay={i * 55}>
                  <div className="p-6 bg-bg border border-border rounded-sm space-y-3 h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-display font-medium tracking-widest uppercase text-ink">{label}</span>
                      <Icon className="w-4 h-4 text-muted" />
                    </div>
                    <h3 className="font-display font-medium text-base text-ink">{headline}</h3>
                    <p className="text-xs font-sans text-muted leading-relaxed">{sub}</p>
                  </div>
                </RevealBlock>
              ))}
            </div>
          </div>
        </section>

        {/* ── 07. PRODUCT PREVIEW ──────────────────────────────── */}
        <section className="py-20 sm:py-28 border-b border-border bg-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <div className="max-w-xl space-y-3 mb-10">
                <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                  07 / Interfaces
                </span>
                <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight uppercase">
                  Minimal by design.
                </h2>
                <p className="text-sm font-sans text-muted leading-relaxed">
                  The actual screens you and your visitors interact with.
                </p>
              </div>
            </RevealBlock>

            <div className="flex items-center gap-2 pb-6 border-b border-border text-xs font-sans font-medium tracking-wider uppercase overflow-x-auto">
              {(['contact', 'call', 'dashboard'] as const).map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePreviewTab(tab)}
                  className={`px-4 py-2 rounded-sm transition-colors cursor-pointer whitespace-nowrap ${
                    activePreviewTab === tab
                      ? 'bg-surface-dark text-[#f5f4ee]'
                      : 'bg-surface text-muted hover:text-ink border border-border'
                  }`}
                >
                  0{i + 1} {tab === 'contact' ? 'Public Contact' : tab === 'call' ? 'Private Call' : 'Owner Dashboard'}
                </button>
              ))}
            </div>

            <div className="mt-8 p-6 sm:p-10 bg-surface border border-border rounded-sm min-h-[340px] flex items-center justify-center">
              {activePreviewTab === 'contact' && (
                <div className="w-full max-w-md bg-bg border border-border rounded-sm p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-sans text-muted uppercase pb-2 border-b border-border">
                    <span>Public Contact</span>
                    <span className="text-accent font-semibold flex items-center gap-1.5 text-ink">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Available
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-display text-muted">01</span>
                    <h4 className="font-display font-medium text-2xl text-ink uppercase">Suzuki Access 125</h4>
                    <p className="text-[11px] font-sans text-muted tracking-wider uppercase mt-0.5">
                      Colour: Pearl moon gray · MH01-BX-4421
                    </p>
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-sm flex items-center justify-between">
                    <span className="text-xs font-display uppercase text-ink">01 Phone Call</span>
                    <span className="text-xs text-accent bg-surface-dark px-1.5 py-0.5 rounded-xs font-sans font-semibold">Private</span>
                  </div>
                </div>
              )}
              {activePreviewTab === 'call' && (
                <div className="w-full max-w-sm bg-surface-dark text-white rounded-sm p-5 border border-black shadow-lg space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span className="font-medium">Connecting via relay…</span>
                    </div>
                    <span className="font-sans text-accent text-xs">00:14</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-[11px] text-white/50 space-y-1">
                    <p>Suzuki Access 125 · MH01-BX-4421</p>
                    <p>Neither party's number is visible.</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/40 uppercase tracking-wider">Private relay active</span>
                    <span className="text-danger uppercase font-semibold cursor-pointer">End Call</span>
                  </div>
                </div>
              )}
              {activePreviewTab === 'dashboard' && (
                <div className="w-full max-w-lg bg-bg border border-border rounded-sm p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="font-display text-sm uppercase text-ink font-medium">Resources (2)</span>
                    <span className="text-xs font-sans text-accent bg-surface-dark px-2 py-0.5 rounded-xs font-semibold">+ Add Tag</span>
                  </div>
                  <div className="space-y-2 text-xs font-sans">
                    <div className="p-3 bg-surface border border-border rounded-sm flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink uppercase">Suzuki Access 125</p>
                        <p className="text-[10px] text-muted">MH01-BX-•••• 4421</p>
                      </div>
                      <span className="text-[10px] text-[#315f43] font-semibold">Active</span>
                    </div>
                    <div className="p-3 bg-surface border border-border rounded-sm flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink uppercase">Apartment Front Gate</p>
                        <p className="text-[10px] text-muted">Direct note enabled</p>
                      </div>
                      <span className="text-[10px] text-[#315f43] font-semibold">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 08. VISION — full-bleed, oversized ───────────────── */}
        <section className="py-28 sm:py-40 border-b border-border bg-surface overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted block mb-6">
                08 / The idea
              </span>
            </RevealBlock>
            <RevealBlock delay={40}>
              <h2 className="font-display font-medium text-[clamp(2.8rem,8vw,7rem)] text-ink tracking-tight uppercase leading-[0.92] max-w-5xl">
                The internet is great at connecting people online.
              </h2>
            </RevealBlock>
            <RevealBlock delay={100}>
              <p className="text-xl sm:text-2xl font-sans text-ink leading-relaxed max-w-2xl mt-8">
                Pingin is for when the thing you're looking at is right in front of you.
              </p>
            </RevealBlock>
            <RevealBlock delay={140}>
              <p className="text-sm font-sans text-muted max-w-xl mt-4 leading-relaxed">
                A QR code turns a physical object into a private, dynamic contact point.
                No permanent phone numbers. No exposure. Complete control over who reaches you.
              </p>
            </RevealBlock>
          </div>
        </section>

        {/* ── 09. FOUNDER ──────────────────────────────────────── */}
      {/* <FounderSection /> */}

      {/* ── 10. FAQ ──────────────────────────────────────────── */}
        <section id="faq" className="py-20 sm:py-28 border-b border-border bg-surface">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <RevealBlock>
              <div className="space-y-3 mb-12">
                <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                  10 / Questions
                </span>
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
                    <div className="border border-border rounded-sm bg-bg transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                      >
                        <span className="font-display font-medium text-sm sm:text-base text-ink uppercase tracking-wide">
                          {faq.question}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-ink' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-xs sm:text-sm font-sans text-muted leading-relaxed border-t border-border/60 pt-3 animate-in fade-in duration-150">
                          {faq.answer}
                        </div>
                      )}
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
                Put a Pingin<br />on something.
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
              <Link to="/" className="inline-block hover:opacity-80 transition-opacity -ml-0.5" aria-label="PingIn Home">
                <PingInSvgLogo height={20} className="text-ink" />
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

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] font-sans text-muted tracking-wider uppercase">
            <div className="flex items-center gap-4 flex-wrap">
              <a href="#privacy" className="hover:text-ink transition-colors">Privacy</a>
              <span className="text-border">•</span>
              <a href="#how-it-works" className="hover:text-ink transition-colors">How It Works</a>
              <span className="text-border">•</span>
              <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
              <span className="text-border">•</span>
              <a href="mailto:contact@pingin.in" className="hover:text-ink transition-colors">Contact</a>
            </div>
            <span>© {new Date().getFullYear()} Pingin · Built by Abdullah</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;