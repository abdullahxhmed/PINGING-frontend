import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TargetCursor } from '../ui/TargetCursor';
import { PingInSvgLogo } from '../brand/PingInLogo';
import { PingInQrCode } from '../qr/PingInQrCode';
import {
  Phone,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';

import { PrivateRelayInteraction } from './PrivateRelayInteraction';
import { SlideToAnswer } from './SlideToAnswer';

type HeroState =
  | 'idle'
  | 'scanning'
  | 'tag_found'
  | 'morphing'
  | 'contact'
  | 'incoming_call';

export const HeroRecreation: React.FC = () => {
  const [heroState, setHeroState] = useState<HeroState>('idle');
  const [isRelayActive, setIsRelayActive] = useState(false);
  const [isCallAnswered, setIsCallAnswered] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [alertSent, setAlertSent] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Timers tracker to prevent orphaned setTimeouts
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // Detect fine pointer for cursor
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  // Click / Tap QR -> Scanning beam -> Found beat -> Morph into phone
  const handleQrClick = () => {
    if (heroState !== 'idle') return;

    clearTimers();
    setHeroState('scanning');

    // 1. Scanning beam runs for 1000ms
    later(() => {
      setHeroState('tag_found');

      // 2. Short "found" beat for 250ms (brackets tighten, chip reads "Tag found")
      later(() => {
        setHeroState('morphing');

        // Smoothly scroll down to center and focus on the opening phone
        stageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // 3. Morph container into smartphone frame
        later(() => {
          setHeroState('contact');
        }, 400);
      }, 250);
    }, 1000);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    clearTimers();
    setSelectedAlert(null);
    setAlertSent(false);
    setIsRelayActive(false);
    setIsCallAnswered(false);
    setHeroState('idle');
  };

  const handleAnswerCall = () => {
    setIsCallAnswered(true);
    // Answering the call smoothly scrolls down to the next section (#use-cases)
    later(() => {
      const target = document.getElementById('use-cases');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
      later(() => {
        handleReset();
      }, 750);
    }, 500);
  };

  const QUICK_ALERTS = [
    {
      id: 'blocked',
      title: 'Your vehicle is blocking access',
      subtitle: 'Please move vehicle for passage',
    },
    {
      id: 'lights',
      title: 'Lights left on',
      subtitle: 'Battery drain hazard',
    },
    {
      id: 'window',
      title: 'Window open',
      subtitle: 'Exposed to rain or security risk',
    },
  ];

  return (
    <section className="relative min-h-[92svh] flex flex-col items-center justify-center bg-[#F4F3EE] border-b border-[#D8D5CC] overflow-hidden select-none pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6">
      {/* TargetCursor active only when a fine pointer exists */}
      {canHover && heroState === 'idle' && (
        <TargetCursor
          targetSelector=".cursor-target"
          spinDuration={2.2}
          hideDefaultCursor={true}
          hoverDuration={0.2}
          parallaxOn={true}
          cursorColor="#11110F"
          cursorColorOnTarget="#11110F"
        />
      )}

      {/* ── HERO HEADLINE (Above Demo) ── */}
      <div className="relative z-10 flex flex-col items-center max-w-3xl mx-auto w-full text-center mb-5 sm:mb-7 px-2">
        <h1 className="font-display font-medium text-[clamp(2.1rem,5.5vw,3.75rem)] text-ink tracking-tight leading-[1.08]">
          Private contact tags for your car, door and keys.
        </h1>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto w-full text-center">
        {/* 3D Stage Container */}
        <div
          ref={stageRef}
          className="relative flex flex-col items-center justify-center w-full"
          style={{ perspective: 1200 }}
        >
          <AnimatePresence mode="wait">
            {/* ── STATE 1: QR TAG BUTTON & LASER SCANNER ── */}
            {(heroState === 'idle' || heroState === 'scanning' || heroState === 'tag_found') && (
              <motion.div
                key="qr-plate-container"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.88,
                  rotateX: 12,
                  y: -20,
                  transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] },
                }}
                className="flex flex-col items-center"
              >
                <button
                  type="button"
                  aria-label="Scan demo tag"
                  onClick={handleQrClick}
                  className={`cursor-target relative p-6 sm:p-8 bg-[#F4F3EE] rounded-3xl border border-[#11110F]/15 ring-1 ring-[#11110F]/5 shadow-[0_24px_55px_-12px_rgba(17,17,15,0.14),0_10px_22px_-6px_rgba(17,17,15,0.07)] transition-all duration-300 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                    heroState === 'scanning' || heroState === 'tag_found'
                      ? 'border-[#11110F] ring-[#11110F] scale-[1.02] shadow-[0_32px_75px_-12px_rgba(17,17,15,0.22),0_14px_30px_-6px_rgba(17,17,15,0.1)]'
                      : 'hover:border-[#11110F] hover:-translate-y-1 hover:shadow-[0_30px_65px_-12px_rgba(17,17,15,0.18),0_12px_26px_-6px_rgba(17,17,15,0.09)]'
                  } group cursor-pointer`}
                >
                  {/* Top brand header on physical plate */}
                  <div className="flex items-center justify-between gap-6 mb-5 px-1">
                    <PingInSvgLogo height={14} className="text-[#11110F] opacity-30" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#6E6B62]">
                        TAG #KT-4421
                      </span>
                    </div>
                  </div>

                  {/* QR Core Container with Scan Viewport */}
                  <div className="relative bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#11110F]/20 overflow-hidden shadow-2xs w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] aspect-square flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <PingInQrCode
                        value="https://kauntact.com/t/demo"
                        directUrl={true}
                        size={220}
                        level="H"
                        fgColor="#11110F"
                        bgColor="#FFFFFF"
                        includeMargin={false}
                        className="w-full h-full flex items-center justify-center"
                      />
                    </div>

                    {/* Corner Target Reticles with subtle tightening on found beat */}
                    <motion.div
                      animate={{
                        top: heroState === 'tag_found' ? 12 : 8,
                        left: heroState === 'tag_found' ? 12 : 8,
                      }}
                      transition={{ duration: 0.2 }}
                      className="absolute w-3.5 h-3.5 border-t-2 border-l-2 border-[#11110F]"
                    />
                    <motion.div
                      animate={{
                        top: heroState === 'tag_found' ? 12 : 8,
                        right: heroState === 'tag_found' ? 12 : 8,
                      }}
                      transition={{ duration: 0.2 }}
                      className="absolute w-3.5 h-3.5 border-t-2 border-r-2 border-[#11110F]"
                    />
                    <motion.div
                      animate={{
                        bottom: heroState === 'tag_found' ? 12 : 8,
                        left: heroState === 'tag_found' ? 12 : 8,
                      }}
                      transition={{ duration: 0.2 }}
                      className="absolute w-3.5 h-3.5 border-b-2 border-l-2 border-[#11110F]"
                    />
                    <motion.div
                      animate={{
                        bottom: heroState === 'tag_found' ? 12 : 8,
                        right: heroState === 'tag_found' ? 12 : 8,
                      }}
                      transition={{ duration: 0.2 }}
                      className="absolute w-3.5 h-3.5 border-b-2 border-r-2 border-[#11110F]"
                    />

                    {/* ── THE LASER SCANNER BEAM (Animated via translateY) ── */}
                    {heroState === 'scanning' && (
                      <motion.div
                        className="absolute inset-x-0 h-8 pointer-events-none z-20"
                        initial={{ y: 0 }}
                        animate={{ y: [0, 200, 0] }}
                        transition={{
                          duration: 1.1,
                          ease: 'easeInOut',
                          repeat: Infinity,
                        }}
                      >
                        <div className="w-full h-1 bg-[#D7FF3F]" />
                        <div className="w-full h-7 bg-gradient-to-t from-transparent via-[#D7FF3F]/20 to-[#D7FF3F]/40" />
                      </motion.div>
                    )}

                    {heroState === 'tag_found' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        className="absolute inset-0 bg-[#D7FF3F] pointer-events-none"
                      />
                    )}
                  </div>
                </button>

                <p className="mt-3.5 text-xs sm:text-sm font-sans text-[#3A3A36]/80 tracking-wide">
                  {canHover ? 'Click the tag to scan' : 'Tap the tag to scan'}
                </p>
              </motion.div>
            )}

            {/* ── STATE 2: SMARTPHONE CONTAINER ── */}
            {(heroState === 'morphing' ||
              heroState === 'contact' ||
              heroState === 'incoming_call') && (
              <motion.div
                key="phone-device-container"
                initial={{
                  opacity: 0,
                  scale: 0.86,
                  rotateX: -14,
                  y: 35,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  filter: 'blur(0px)',
                  rotateX: 0,
                  y: 0,
                  transition: {
                    type: 'spring',
                    stiffness: 280,
                    damping: 24,
                    mass: 0.8,
                  },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.75,
                  transition: { duration: 0.4 },
                }}
                className="flex flex-col items-center w-full max-w-[364px]"
              >
                {/* Smartphone Device Frame - Clean flat 1px border */}
                <div className="relative w-full h-[min(710px,88svh)] sm:h-[710px] rounded-[50px] bg-[#0E0D0C] p-2.5 sm:p-3 border border-[#2B2927] shadow-xl flex flex-col">
                  {/* Subtle side hardware accents */}
                  <div className="absolute -left-[3px] top-24 w-[3px] h-9 bg-[#262422] rounded-l-xs" />
                  <div className="absolute -left-[3px] top-36 w-[3px] h-9 bg-[#262422] rounded-l-xs" />
                  <div className="absolute -right-[3px] top-28 w-[3px] h-14 bg-[#262422] rounded-r-xs" />

                  {/* Phone Screen Glass */}
                  <div className="relative w-full h-full rounded-[40px] overflow-hidden text-left border border-[#D8D5CC] bg-[#F4F3EE] text-[#11110F] flex flex-col">
                    {/* Status Bar */}
                    <div className="pt-3 pb-2 px-6 flex items-center justify-between text-[11px] font-sans font-medium text-[#11110F] shrink-0">
                      <span className="tracking-tight pl-1">9:41</span>

                      {/* Dynamic Island */}
                      <motion.div
                        animate={{
                          width: heroState === 'incoming_call' ? 120 : 92,
                        }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="h-[22px] bg-[#0E0D0C] rounded-full mx-auto flex items-center justify-between px-2.5 shadow-xs"
                      >
                        {heroState === 'incoming_call' ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D7FF3F]" />
                              <Phone className="w-3 h-3 text-[#D7FF3F] fill-current" />
                            </div>
                            <div className="flex items-center gap-0.5">
                              <span className="w-0.5 h-2 bg-[#D7FF3F]/80 rounded-full" />
                              <span className="w-0.5 h-3 bg-[#D7FF3F] rounded-full" />
                              <span className="w-0.5 h-1.5 bg-[#D7FF3F]/60 rounded-full" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-end pr-0.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#1A1918] ring-1 ring-[#2E2C2A]/60 flex items-center justify-center">
                              <div className="w-1 h-1 rounded-full bg-[#0E0D0C]" />
                            </div>
                          </div>
                        )}
                      </motion.div>

                      <div className="flex items-center gap-1.5 pr-1">
                        <span className="text-[10px] font-medium tracking-tight">5G</span>
                        <div className="w-5 h-2.5 border-[1.5px] border-[#11110F] rounded-[3px] p-[1px] flex items-center">
                          <div className="w-full h-full bg-[#11110F] rounded-[1px]" />
                        </div>
                      </div>
                    </div>

                    {/* App Bar inside Page */}
                    <div className="px-5 py-2.5 flex items-center justify-between border-b border-[#E3E0D8] bg-[#F4F3EE]/80 backdrop-blur-md shrink-0">
                      <PingInSvgLogo height={12} className="text-[#11110F]" />
                      <span className="text-[11px] font-mono text-[#6E6B62]">
                        KT-4421
                      </span>
                    </div>

                    {/* Inner Screen Views with Crossfade */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                      <AnimatePresence mode="wait">
                        {heroState === 'incoming_call' ? (
                          /* ── SCENE: OWNER RECEIVES CALL FROM MASKED RELAY ── */
                          <motion.div
                            key="incoming-call-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="h-full flex flex-col items-center justify-between text-center py-6"
                          >
                            {/* Avatar */}
                            <div className="relative flex items-center justify-center my-2">
                              <div className="relative w-16 h-16 rounded-full bg-[#11110F] text-[#D7FF3F] flex items-center justify-center border border-[#D7FF3F]">
                                <Phone className="w-7 h-7 fill-current" />
                              </div>
                            </div>

                            {/* Authentic Owner Display */}
                            <div className="space-y-1.5 my-3">
                              <div className="text-[12px] font-sans text-[#3A3A36] flex items-center justify-center gap-1.5 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D7FF3F]" />
                                <span>Incoming call</span>
                              </div>
                              <h3 className="font-display font-medium text-2xl text-[#11110F] tracking-tight">
                                Unknown Caller
                              </h3>
                              <p className="text-xs font-mono text-[#6E6B62]">
                                KT-4421
                              </p>
                            </div>

                            {/* Interactive Slide to Answer Component */}
                            <div className="flex flex-col items-center gap-3 w-full pb-1">
                              <SlideToAnswer onAnswer={handleAnswerCall} />
                              <div className="text-[11px] font-sans text-[#8C887E]">
                                {isCallAnswered ? 'Connecting…' : ''}
                              </div>
                            </div>
                          </motion.div>
                        ) : isRelayActive ? (
                          /* ── SCENE: ZERO-KNOWLEDGE PRIVATE RELAY TRANSFORMATION ── */
                          <motion.div
                            key="relay-interaction-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="w-full h-full flex flex-col items-center justify-center"
                          >
                            <PrivateRelayInteraction
                              autoStart={true}
                              onComplete={() => setHeroState('incoming_call')}
                              className="w-full h-full"
                            />
                          </motion.div>
                        ) : (
                          /* ── SCENE: PUBLIC VISITOR CONTACT INTERFACE ── */
                          <motion.div
                            key="public-contact-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="h-full flex flex-col justify-between"
                          >
                            {/* Vehicle Card */}
                            <div className="p-3.5 bg-white rounded-xl border border-[#D8D5CC]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-sans text-[#6E6B62]">
                                  Vehicle
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#F4F3EE] border border-[#D8D5CC] font-mono text-[11px] font-medium text-[#11110F]">
                                  KT-4421
                                </span>
                              </div>
                              <h3 className="font-display font-medium text-lg text-[#11110F] leading-snug">
                                Bajaj Pulsar
                              </h3>
                            </div>

                            {/* Voice Call Button (Single subtle icon pulse) */}
                            <div>
                              <button
                                type="button"
                                onClick={() => setIsRelayActive(true)}
                                className="w-full py-3.5 px-4 bg-[#11110F] hover:bg-black text-[#F4F3EE] rounded-xl flex items-center justify-between transition-colors duration-150 cursor-pointer shadow-xs active:scale-[0.99]"
                              >
                                <div className="flex items-center gap-3">
                                  <motion.span
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="w-7 h-7 rounded-full bg-[#D7FF3F] text-[#11110F] flex items-center justify-center shrink-0"
                                  >
                                    <Phone className="w-3.5 h-3.5 fill-current" />
                                  </motion.span>
                                  <div className="text-left">
                                    <div className="text-[13px] font-sans font-medium text-[#F4F3EE] leading-tight">
                                      Call owner
                                    </div>
                                    <div className="text-[11px] font-sans text-[#A8A59C] leading-tight mt-0.5">
                                      Your number isn’t shown to them
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[11px] font-sans font-medium text-[#11110F] bg-[#D7FF3F] px-2.5 py-1 rounded-md shrink-0">
                                  Call
                                </span>
                              </button>
                            </div>

                            {/* Quick Notification Messages */}
                            <div className="space-y-2">
                              <span className="text-xs font-sans text-[#6E6B62] block px-0.5">
                                Send a quick message
                              </span>

                              <div className="space-y-1.5">
                                {QUICK_ALERTS.map((item) => {
                                  const isCurrentSent = selectedAlert === item.id && alertSent;

                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedAlert(item.id);
                                        setAlertSent(true);
                                        later(() => setAlertSent(false), 2500);
                                      }}
                                      className={`w-full text-left py-2 px-3 rounded-lg border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                                        isCurrentSent
                                          ? 'bg-[#11110F] border-[#11110F] text-[#F4F3EE]'
                                          : 'bg-white hover:bg-[#FAF9F5] border-[#D8D5CC] text-[#11110F]'
                                      }`}
                                    >
                                      <div>
                                        <div className="text-xs font-sans font-medium leading-tight">
                                          {item.title}
                                        </div>
                                        <div
                                          className={`text-[11px] font-sans leading-tight mt-0.5 ${
                                            isCurrentSent ? 'text-white/70' : 'text-[#6E6B62]'
                                          }`}
                                        >
                                          {item.subtitle}
                                        </div>
                                      </div>

                                      {isCurrentSent ? (
                                        <CheckCircle2 className="w-4 h-4 text-[#D7FF3F] shrink-0" />
                                      ) : (
                                        <ArrowUpRight className="w-3.5 h-3.5 text-[#6E6B62] shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Clean Footer Slot */}
                            <div className="h-6 flex items-center justify-center shrink-0 border-t border-[#E3E0D8]/60 pt-1">
                              <AnimatePresence mode="wait">
                                {alertSent ? (
                                  <motion.div
                                    key="alert-sent-banner"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="w-full py-0.5 px-2 rounded-md bg-[#11110F] text-[#D7FF3F] text-[11px] font-sans text-center font-medium flex items-center justify-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D7FF3F] shrink-0" />
                                    <span>Owner alerted</span>
                                  </motion.div>
                                ) : (
                                  <div className="text-center text-[11px] font-sans text-[#8C887E]">
                                    No app required
                                  </div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Inline Reset Demo link below phone */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-3.5 text-xs font-sans font-medium text-[#6E6B62] hover:text-ink transition-colors cursor-pointer"
                >
                  ← Reset demo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── HERO CTA ACTION (Below Demo) ── */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center w-full">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent-hover text-ink rounded-sm text-[15px] font-sans font-medium transition-all shadow-xs auto-width"
          >
            <span>Get your tags</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroRecreation;
