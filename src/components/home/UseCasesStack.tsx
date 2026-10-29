import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  Car,
  Home,
  Cat,
  Key,
  Backpack,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PingInSvgLogo } from '../brand/PingInLogo';

const textVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir * 18,
  }),
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir * -14,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

interface Scenario {
  id: string;
  moment: string;
  description: string;
  meta: string;
  tagId: string;
  cardName: string;
  objectType: string;
  actionLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'car',
    moment: 'Blocked in',
    description:
      'A windshield sticker lets someone ask you to move your vehicle without knowing your phone number.',
    meta: 'Windshield sticker',
    tagId: 'KT-4421',
    cardName: 'Hyundai i20',
    objectType: 'Vehicle',
    actionLabel: 'Call owner',
    icon: Car,
  },
  {
    id: 'door',
    moment: 'Package at the gate',
    description:
      'Delivery personnel can reach you through their browser to confirm where to drop a package.',
    meta: 'Door sticker',
    tagId: 'KT-8812',
    cardName: 'Flat 402',
    objectType: 'Front door',
    actionLabel: 'Call resident',
    icon: Home,
  },
  {
    id: 'pet',
    moment: 'Lost pet',
    description:
      'Anyone who finds your dog or cat can scan their collar to reach you with one tap.',
    meta: 'Collar tag',
    tagId: 'KT-1904',
    cardName: 'Bruno',
    objectType: 'Pet collar',
    actionLabel: 'Contact owner',
    icon: Cat,
  },
  {
    id: 'keys',
    moment: 'Dropped keys',
    description:
      'Whoever finds your keys can contact you directly to arrange a return.',
    meta: 'Key fob',
    tagId: 'KT-6231',
    cardName: 'House keys',
    objectType: 'Keychain',
    actionLabel: 'Message owner',
    icon: Key,
  },
  {
    id: 'backpack',
    moment: 'Left behind',
    description:
      'A tag on your backpack or luggage lets the finder notify you immediately.',
    meta: 'Luggage tag',
    tagId: 'KT-3095',
    cardName: 'Travel bag',
    objectType: 'Backpack',
    actionLabel: 'Notify owner',
    icon: Backpack,
  },
];

export const UseCasesStack: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevStepRef = useRef(0);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScroll.current) return;
      const container = scrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const windowH = window.innerHeight;
      const totalScrollable = rect.height - windowH;

      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollable));

      const stepSize = 1 / SCENARIOS.length;
      const stepIdx = Math.min(
        SCENARIOS.length - 1,
        Math.floor(progress / stepSize)
      );

      if (stepIdx !== prevStepRef.current) {
        setDirection(stepIdx > prevStepRef.current ? 1 : -1);
        prevStepRef.current = stepIdx;
        setActiveStep(stepIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const currentScenario = SCENARIOS[activeStep];

  const scrollToStep = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const windowH = window.innerHeight;
    const totalScrollable = rect.height - windowH;
    if (totalScrollable <= 0) return;
    const stepSize = totalScrollable / SCENARIOS.length;
    const target = window.scrollY + rect.top + stepSize * (index + 0.5);

    isProgrammaticScroll.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 750);

    setDirection(index >= activeStep ? 1 : -1);
    prevStepRef.current = index;
    setActiveStep(index);
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -45 && activeStep < SCENARIOS.length - 1) {
      scrollToStep(activeStep + 1);
    } else if (deltaX > 45 && activeStep > 0) {
      scrollToStep(activeStep - 1);
    }
    touchStartX.current = null;
  };

  return (
    // ── SCROLL RUNWAY: Pins section with generous scroll travel ──
    <div ref={scrollRef} className="relative h-[650vh]">
      
      {/* ── THE PINNED STAGE ── */}
      <div className="sticky top-16 sm:top-20 lg:top-[12vh] w-full select-none overflow-x-clip">
        
        {/* Horizontal Divider Line Top */}
        <div className="border-t border-border" />

        <div className="py-6 sm:py-10 lg:py-16 min-h-0 lg:min-h-[460px] flex flex-col justify-center">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">
            
            {/* ── LEFT: Text format stays exactly the same ──────────── */}
            <div className="lg:col-span-5 flex flex-col justify-between min-h-0 lg:min-h-[320px]">
              <div className="space-y-2">
                <h2 className="font-display font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight leading-tight">
                  Things you can tag
                </h2>
              </div>

              {/* Dynamic Moment: Slower, graceful travel with scroll */}
              <div className="py-4 sm:py-6 my-auto">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentScenario.id}
                    custom={direction}
                    variants={textVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-2"
                  >
                    <h3 className="font-display font-medium text-xl sm:text-[22px] text-ink tracking-tight leading-snug">
                      {currentScenario.moment}
                    </h3>

                    <p className="font-satoshi text-sm sm:text-base text-[#3A3A36] leading-relaxed max-w-md">
                      {currentScenario.description}
                    </p>

                    <div className="pt-2">
                      <span className="font-sans text-[11px] font-medium tracking-wide text-muted border border-border px-2.5 py-1 rounded-xs inline-block">
                        {currentScenario.meta}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Minimal step indicators + prev/next controls */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {SCENARIOS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => scrollToStep(idx)}
                      className="py-1 cursor-pointer focus:outline-none"
                      aria-label={`Jump to ${SCENARIOS[idx].cardName}`}
                    >
                      <span
                        className={`block h-1 rounded-full transition-all duration-300 ${
                          activeStep === idx ? 'w-6 bg-surface-dark' : 'w-2 bg-border hover:bg-muted'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollToStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="w-7 h-7 rounded-sm border border-border flex items-center justify-center text-ink disabled:opacity-25 disabled:cursor-not-allowed hover:bg-surface active:scale-95 transition-all cursor-pointer"
                    aria-label="Previous card"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToStep(Math.min(SCENARIOS.length - 1, activeStep + 1))}
                    disabled={activeStep === SCENARIOS.length - 1}
                    className="w-7 h-7 rounded-sm border border-border flex items-center justify-center text-ink disabled:opacity-25 disabled:cursor-not-allowed hover:bg-surface active:scale-95 transition-all cursor-pointer"
                    aria-label="Next card"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Fun Animated Sticky Carousel of Cards ────────── */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="lg:col-span-7 flex items-center justify-center relative min-h-[360px] sm:min-h-[400px] lg:min-h-[430px] overflow-hidden py-4 touch-pan-y"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {SCENARIOS.map((scenario, index) => {
                  const offset = index - activeStep;
                  const isActive = offset === 0;
                  const isVisible = Math.abs(offset) <= 2;
                  const Icon = scenario.icon;

                  return (
                    <motion.div
                      key={scenario.id}
                      onClick={() => {
                        if (!isActive) scrollToStep(index);
                      }}
                      className={`absolute w-[245px] sm:w-[270px] lg:w-[290px] bg-white border border-[#D8D5CC] rounded-xl p-5 sm:p-6 select-none flex flex-col justify-between transition-shadow duration-300 ${
                        isActive
                          ? 'shadow-xl shadow-ink/8 ring-1 ring-ink/5 cursor-default'
                          : 'cursor-pointer hover:border-ink/40 shadow-sm'
                      }`}
                      style={{
                        aspectRatio: '1 / 1.32',
                        zIndex: 30 - Math.abs(offset) * 5,
                        pointerEvents: isVisible ? (isActive ? 'auto' : 'auto') : 'none',
                      }}
                      initial={false}
                      animate={{
                        x: `${offset * 62}%`,
                        scale: isActive ? 1 : Math.max(0.76, 1 - Math.abs(offset) * 0.1),
                        rotateZ: offset * 3.5,
                        opacity: isVisible ? (isActive ? 1 : Math.max(0.18, 0.65 - Math.abs(offset) * 0.25)) : 0,
                        filter: isActive ? 'blur(0px)' : `blur(${Math.min(2, Math.abs(offset) * 0.8)}px)`,
                      }}
                      whileHover={
                        !isActive
                          ? { scale: Math.max(0.8, 1 - Math.abs(offset) * 0.08) }
                          : undefined
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 26,
                        mass: 0.8,
                      }}
                    >
                      {/* Top Bar: Wordmark + Tag ID */}
                      <div className="w-full flex items-center justify-between pb-2.5">
                        <PingInSvgLogo height={12} className="text-ink" />
                        <span className="font-mono text-[10px] text-muted tracking-wide">
                          {scenario.tagId}
                        </span>
                      </div>

                      {/* Middle Body */}
                      <div className="my-auto py-2.5 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-muted block">
                              {scenario.objectType}
                            </span>
                            <h4 className="font-display font-medium text-lg sm:text-xl text-ink tracking-tight mt-0.5">
                              {scenario.cardName}
                            </h4>
                          </div>
                          <div className="w-8 h-8 rounded-md bg-[#F4F3EE] border border-border flex items-center justify-center text-ink shrink-0">
                            <Icon className="w-4 h-4 stroke-[1.5]" />
                          </div>
                        </div>

                        <div className="w-full py-2.5 px-3.5 bg-ink text-[#f5f4ee] rounded-sm flex items-center justify-between text-xs font-sans font-medium transition-colors">
                          <span>{scenario.actionLabel}</span>
                          <span className="text-accent text-[11px]">→</span>
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div className="w-full pt-2 flex items-center justify-between">
                        <p className="font-sans text-[10px] text-muted">
                          Your number isn’t shown
                        </p>
                        <span className="font-sans text-[10px] font-medium text-muted/70">
                          {scenario.meta}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
