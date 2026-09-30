import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  Car,
  Home,
  Cat,
  Key,
  Backpack,
} from 'lucide-react';
import { PingInSvgLogo } from '../brand/PingInLogo';

const textVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir * 36,
  }),
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir * -28,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const cardVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir * 32,
    scale: 0.92,
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir * -24,
    scale: 1.04,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

interface Scenario {
  number: string;
  tag: string;
  moment: string;
  description: string;
  meta: string;
  cardName: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCENARIOS: Scenario[] = [
  {
    number: '01',
    tag: 'YOUR CAR',
    moment: 'When you block someone in.',
    description:
      'They scan the sticker to ask you to move your vehicle. Neither person ever sees the other’s phone number.',
    meta: 'WINDSHIELD STICKER',
    cardName: 'YOUR VEHICLE',
    icon: Car,
  },
    {
    number: '02',
    tag: 'YOUR PET',
    moment: 'When your pet wanders off.',
    description:
      'Whoever finds them scans the collar to call you with one tap. Your home address and phone number stay private.',
    meta: 'COLLAR TAG',
    cardName: 'BRUNO',
    icon: Cat,
  },
  {
    number: '03',
    tag: 'YOUR HOME',
    moment: 'When someone is at your door.',
    description:
      'Delivery or maintenance personel can reach you directly without having your private number.',
    meta: 'DOOR / GATE STICKER',
    cardName: 'FLAT 402',
    icon: Home,
  },

  {
    number: '04',
    tag: 'YOUR KEYS',
    moment: 'When you drop your keys.',
    description:
      'The person who finds them can contact you immediately to return them, without knowing where you live.',
    meta: 'KEYCHAIN FOB',
    cardName: 'KEYS',
    icon: Key,
  },
  {
    number: '05',
    tag: 'YOUR BACKPACK OR PERSONAL BELONGINGS',
    moment: 'When you leave your backpack or personal belongings behind.',
    description:
      'Attach a keychain or sticker to your backpack, laptop bag, or any personal belonging. If it gets lost or misplaced, the finder can instantly reach you.',
    meta: 'ZIPPER PULL TAG / KEYCHAIN / STICKER',
    cardName: 'BACKPACK',
    icon: Backpack,
  },
];

export const UseCasesStack: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevStepRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentScenario = SCENARIOS[activeStep];
  const ActiveIcon = currentScenario.icon;

  const scrollToStep = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const windowH = window.innerHeight;
    const totalScrollable = rect.height - windowH;
    const stepSize = totalScrollable / SCENARIOS.length;
    const target = window.scrollY + rect.top + stepSize * (index + 0.5);

    setDirection(index >= activeStep ? 1 : -1);
    prevStepRef.current = index;
    setActiveStep(index);
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  return (
    // ── SCROLL RUNWAY: Pins section with generous scroll travel ──
    <div ref={scrollRef} className="relative h-[650vh]">
      
      {/* ── THE PINNED STAGE (Clean horizontal framing, no outer card box) ── */}
      <div className="sticky top-16 sm:top-20 lg:top-[12vh] w-full select-none">
        
        {/* Horizontal Divider Line Top */}
        <div className="border-t border-border" />

        <div className="py-4 sm:py-8 lg:py-14 min-h-0 lg:min-h-[440px] flex flex-col justify-center">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 lg:gap-16 items-center">
            
            {/* ── LEFT: Clear Everyday Language ──────────────────────── */}
            <div className="lg:col-span-6 flex flex-col justify-between min-h-0 lg:min-h-[340px]">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-display font-medium text-2xl sm:text-3xl text-border leading-none select-none">
                    02
                  </span>
                  <span className="text-border">/</span>
                  <span className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-muted">
                    USE CASES
                  </span>
                </div>
                <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-[3rem] text-ink tracking-tight uppercase leading-[0.98]">
                  ONE CONTACT FOR EVERYTHING YOU OWN.
                </h2>
                <p className="text-xs sm:text-base font-sans text-muted leading-relaxed">
                  Put a private tag on each of your belongings.<br className="hidden sm:inline" />
                  Anyone can reach you without knowing your phone number.
                </p>
              </div>

              {/* Dynamic Moment: Slower, graceful travel with scroll */}
              <div className="py-3 sm:py-6 my-auto">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentScenario.number}
                    custom={direction}
                    variants={textVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-1.5 sm:space-y-2.5"
                  >
                    <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted block">
                      {currentScenario.tag}
                    </span>

                    <h3 className="font-display font-medium text-xl sm:text-2xl lg:text-3xl text-ink tracking-tight uppercase leading-snug">
                      {currentScenario.moment}
                    </h3>

                    <p className="text-xs sm:text-sm font-sans text-muted leading-relaxed max-w-md">
                      {currentScenario.description}
                    </p>

                    <div className="pt-1.5">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-ink/70 bg-surface border border-border px-2.5 py-1 rounded-xs inline-block">
                        {currentScenario.meta}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Persistent Minimal Counter */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-ink font-semibold">
                  0{activeStep + 1} / 0{SCENARIOS.length}
                </span>
              </div>
            </div>

            {/* ── RIGHT: The Hero Physical PingIn Tag ────────────────── */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div
                className="w-full max-w-[250px] sm:max-w-[280px] lg:max-w-[310px] bg-[#F4F3EE] border-[1.5px] border-[#D8D5CC] rounded-2xl p-6 sm:p-7 lg:p-8 shadow-2xl shadow-ink/5 flex flex-col justify-between items-center text-center relative select-none"
                style={{ aspectRatio: '1 / 1.34' }}
              >
                {/* Tag Top Bar */}
                <div className="w-full flex items-center justify-between pb-3 sm:pb-3.5 border-b border-[#D8D5CC]">
                  <PingInSvgLogo height={14} className="text-ink" />
                  <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-accent border-[1.5px] border-ink" />
                </div>

                {/* Tag Center: The Changing Glyph & Object Name */}
                <div className="my-auto py-3.5 sm:py-5 flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentScenario.number}
                      custom={direction}
                      variants={cardVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="flex flex-col items-center justify-center space-y-3 sm:space-y-4"
                    >
                      {/* The Changing Icon */}
                      <div className="p-3.5 sm:p-4 bg-surface rounded-xl border border-dashed border-[#D8D5CC]">
                        <ActiveIcon className="w-13 h-13 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-ink stroke-[1.4]" />
                      </div>

                      {/* The Object Identity */}
                      <div>
                        <p className="font-display font-bold text-base sm:text-lg lg:text-xl text-ink tracking-tight uppercase">
                          {currentScenario.cardName}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Tag Bottom: Fixed Product Promise */}
                <div className="w-full pt-3 sm:pt-3.5 border-t border-[#D8D5CC]">
                  <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] font-semibold text-muted uppercase">
                    PRIVATE CONTACT
                  </p>
                </div>
              </div>
            </div>

            {/* ── FAR RIGHT: Minimal Vertical Scroll Index ───────────── */}
            <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center gap-3">
              {SCENARIOS.map((item, idx) => {
                const isActive = activeStep === idx;
                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => scrollToStep(idx)}
                    className="group flex items-center gap-2 text-xs font-mono transition-all cursor-pointer py-1"
                    title={item.tag}
                  >
                    <span
                      className={`transition-colors ${
                        isActive ? 'text-ink font-semibold' : 'text-muted/40 group-hover:text-ink'
                      }`}
                    >
                      {item.number}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        isActive
                          ? 'bg-accent scale-125'
                          : 'bg-transparent border border-border group-hover:bg-muted'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

          </div>

        </div>

        {/* Horizontal Divider Line Bottom */}
        <div className="border-b border-border" />

      </div>

    </div>
  );
};
