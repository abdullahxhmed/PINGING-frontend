import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TargetCursor } from '../ui/TargetCursor';
import { PingInSvgLogo } from '../brand/PingInLogo';
import { QRCodeSVG } from 'qrcode.react';
import {
  Phone,
  CheckCircle2,
  RotateCcw,
  Car,
  Lightbulb,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

import { PrivateRelayInteraction } from './PrivateRelayInteraction';
import { SlideToAnswer } from './SlideToAnswer';

type HeroState = 'idle' | 'scanning' | 'morphing' | 'contact' | 'incoming_call';

export const HeroRecreation: React.FC = () => {
  const [heroState, setHeroState] = useState<HeroState>('idle');
  const [isRelayActive, setIsRelayActive] = useState(false);
  const [isCallAnswered, setIsCallAnswered] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [alertSent, setAlertSent] = useState(false);

  // Click QR -> Trigger scan beam -> Morph into phone
  const handleQrClick = () => {
    if (heroState !== 'idle') return;

    setHeroState('scanning');

    // After 1.4s scanning beam, initiate morph into phone
    setTimeout(() => {
      setHeroState('morphing');
      setTimeout(() => {
        setHeroState('contact');
      }, 500);
    }, 1400);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAlert(null);
    setAlertSent(false);
    setIsRelayActive(false);
    setIsCallAnswered(false);
    setHeroState('idle');
  };

  const handleAnswerCall = () => {
    setIsCallAnswered(true);
    // Smoothly scroll down to the next section #the-problem
    setTimeout(() => {
      const target = document.getElementById('the-problem');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
      // Reset the sequence back to the QR code once scrolled away
      setTimeout(() => {
        handleReset();
      }, 750);
    }, 550);
  };

  const QUICK_ALERTS = [
    {
      id: 'blocked',
      title: 'Driveway or access blocked',
      subtitle: 'Please move vehicle for passage',
      icon: Car,
    },
    {
      id: 'lights',
      title: 'Lights or ignition left on',
      subtitle: 'Battery drain or hazard warning',
      icon: Lightbulb,
    },
    {
      id: 'window',
      title: 'Window or visor open',
      subtitle: 'Exposed to rain or security risk',
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center bg-[#F4F3EE] border-b border-[#D8D5CC] overflow-hidden select-none py-10 px-4 sm:px-6">
      {/* TargetCursor component active on PC, tracking .cursor-target */}
      {heroState === 'idle' && (
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

      {/* Architectural subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #D8D5CC 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Subtle ambient lighting */}
      <div className="absolute w-[460px] h-[460px] rounded-full bg-[#11110F]/5 blur-[110px] pointer-events-none -bottom-20 -right-20" />

      {/* Very Large Faded "TRY IT!" Background Watermark partially tucked under QR */}
      <div
        className="absolute top-6 sm:top-8 lg:top-10 inset-x-0 flex justify-center pointer-events-none select-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="font-display font-medium text-[clamp(4.5rem,13vw,11.5rem)] tracking-tight leading-none uppercase text-[#11110F]/[0.045] whitespace-nowrap">
          TRY IT :)
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto w-full text-center">

        {/* 3D Stage Container */}
        <div
          className="relative flex flex-col items-center justify-center w-full"
          style={{ perspective: 1200 }}
        >
          <AnimatePresence mode="wait">
            {/* ── STATE 1 & 2: QR TAG BUTTON & LASER SCANNER ── */}
            {(heroState === 'idle' || heroState === 'scanning') && (
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
                <div
                  onClick={handleQrClick}
                  className={`cursor-target relative p-6 sm:p-8 bg-[#F4F3EE] rounded-3xl border-2 transition-all duration-300 ${
                    heroState === 'scanning'
                      ? 'border-[#11110F] shadow-[0_24px_60px_rgba(215,255,63,0.35)] scale-[1.03]'
                      : 'border-[#11110F] shadow-[0_16px_40px_rgba(17,17,15,0.08)] hover:shadow-[0_20px_50px_rgba(17,17,15,0.16)] hover:-translate-y-1'
                  } group cursor-pointer`}
                >
                  {/* Top brand header on physical plate */}
                  <div className="flex items-center justify-between gap-6 mb-5 px-1">
                    <PingInSvgLogo height={18} className="text-[#11110F]" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#6E6B62]">
                        TAG #PG-4421
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full border border-[#11110F] ${
                          heroState === 'scanning'
                            ? 'bg-[#D7FF3F] animate-pulse'
                            : 'bg-[#D7FF3F]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* QR Core Container with Scan Viewport */}
                  <div className="relative bg-white p-4 sm:p-5 rounded-2xl border border-[#D8D5CC] overflow-hidden shadow-inner">
                    <QRCodeSVG
                      value="https://pingin.co.in"
                      size={220}
                      level="H"
                      fgColor="#11110F"
                      bgColor="#FFFFFF"
                      includeMargin={false}
                    />

                    {/* Corner Target Reticles */}
                    <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#11110F]" />
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#11110F]" />
                    <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#11110F]" />
                    <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#11110F]" />

                    {/* ── THE LASER SCANNER BEAM ── */}
                    {heroState === 'scanning' && (
                      <motion.div
                        className="absolute inset-x-0 h-10 pointer-events-none z-20"
                        initial={{ top: '-10%' }}
                        animate={{ top: ['0%', '85%', '0%'] }}
                        transition={{
                          duration: 1.35,
                          ease: 'easeInOut',
                          repeat: Infinity,
                        }}
                      >
                        <div className="w-full h-1 bg-[#D7FF3F] shadow-[0_0_15px_#D7FF3F,0_0_30px_#D7FF3F]" />
                        <div className="w-full h-8 bg-gradient-to-t from-transparent via-[#D7FF3F]/25 to-[#D7FF3F]/60" />
                      </motion.div>
                    )}

                    {heroState === 'scanning' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        className="absolute inset-0 bg-[#D7FF3F] mix-blend-multiply pointer-events-none"
                      />
                    )}
                  </div>

                  {/* Bottom plate metadata */}
                  <div className="mt-4 flex items-center justify-between text-xs font-mono text-[#6E6B62] px-1">
                    <span className="tracking-wider">pingin.co.in</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm transition-all ${
                        heroState === 'scanning'
                          ? 'bg-[#11110F] text-[#D7FF3F] animate-pulse'
                          : 'bg-[#D7FF3F] text-[#11110F]'
                      }`}
                    >
                      {heroState === 'scanning' ? 'SCANNING...' : 'CLICK TO SCAN'}
                    </span>
                  </div>
                </div>

                <p className="mt-6 text-sm font-sans text-[#6E6B62]">
                  Hover over the QR tag with the target cursor & click to trigger the optical scan.
                </p>
              </motion.div>
            )}

            {/* ── STATE 3 & 4: PHONE (PUBLIC CONTACT & INCOMING CALL) ── */}
            {(heroState === 'morphing' || heroState === 'contact' || heroState === 'incoming_call') && (
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
                  transition: { duration: 0.5 },
                }}
                className="flex flex-col items-center w-full max-w-[360px]"
              >
                {/* Smartphone Device Frame - Strict Fixed Dimensions */}
                <div className="relative w-full h-[640px] rounded-[48px] bg-[#0E0D0C] p-2.5 shadow-[0_32px_80px_rgba(17,17,15,0.38),0_0_0_1px_rgba(255,255,255,0.12)_inset] border border-[#2B2927] flex flex-col">
                  {/* Subtle side hardware accents */}
                  <div className="absolute -left-[3px] top-24 w-[3px] h-9 bg-[#262422] rounded-l-xs" />
                  <div className="absolute -left-[3px] top-36 w-[3px] h-9 bg-[#262422] rounded-l-xs" />
                  <div className="absolute -right-[3px] top-28 w-[3px] h-14 bg-[#262422] rounded-r-xs" />

                  {/* Phone Screen Glass - Strict 100% Height */}
                  <div className="relative w-full h-full rounded-[40px] overflow-hidden text-left border border-[#D8D5CC] bg-[#F4F3EE] text-[#11110F] flex flex-col">
                    {/* Refined Dynamic Island & iOS Status Bar */}
                    <div className="pt-3 pb-2 px-6 flex items-center justify-between text-[11px] font-sans font-semibold text-[#11110F] shrink-0">
                      <span className="tracking-tight pl-1">9:41</span>

                      {/* Apple Dynamic Island - Expands when receiving call */}
                      <motion.div
                        animate={{
                          width: heroState === 'incoming_call' ? 120 : 92,
                        }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="h-[22px] bg-[#0E0D0C] rounded-full mx-auto flex items-center justify-between px-2 shadow-xs"
                      >
                        {heroState === 'incoming_call' ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D7FF3F] animate-ping" />
                              <Phone className="w-3 h-3 text-[#D7FF3F] fill-current" />
                            </div>
                            <div className="flex items-center gap-0.5">
                              <span className="w-0.5 h-2 bg-[#D7FF3F]/80 rounded-full animate-pulse" />
                              <span className="w-0.5 h-3 bg-[#D7FF3F] rounded-full animate-pulse delay-75" />
                              <span className="w-0.5 h-1.5 bg-[#D7FF3F]/60 rounded-full animate-pulse delay-150" />
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
                        <span className="text-[10px] font-bold tracking-tight">5G</span>
                        <div className="w-5 h-2.5 border-[1.5px] border-[#11110F] rounded-[3px] p-[1px] flex items-center">
                          <div className="w-full h-full bg-[#11110F] rounded-[1px]" />
                        </div>
                      </div>
                    </div>

                    {/* App Bar inside Public Page */}
                    <div className="px-5 py-2.5 flex items-center justify-between border-b border-[#E3E0D8] bg-[#F4F3EE]/80 backdrop-blur-md shrink-0">
                      <PingInSvgLogo height={16} className="text-[#11110F]" />
                      <span className="text-[9.5px] font-mono uppercase tracking-wider text-[#6E6B62] font-medium">
                        Tag #PG-4421
                      </span>
                    </div>

                    {/* Contact Page Body / Private Relay / Incoming Call View */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between overflow-hidden">
                      {/* ── SCENE: OWNER RECEIVES CALL FROM UNKNOWN NUMBER (LIGHT THEME) ── */}
                      {heroState === 'incoming_call' ? (
                        <motion.div
                          key="incoming-call-view"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full flex flex-col items-center justify-between text-center py-2"
                        >
                          {/* Pulsing Ambient Halo Waves */}
                          <div className="relative flex items-center justify-center my-4">
                            <motion.div
                              animate={{ scale: [1, 1.8, 2.5], opacity: [0.7, 0.25, 0] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                              className="absolute w-24 h-24 rounded-full border border-[#D7FF3F] bg-[#D7FF3F]/20"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.4, 2], opacity: [0.6, 0.2, 0] }}
                              transition={{ duration: 2.2, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
                              className="absolute w-20 h-20 rounded-full border border-[#11110F]/15"
                            />

                            {/* Core Avatar Badge */}
                            <div className="relative w-16 h-16 rounded-full bg-[#11110F] text-[#D7FF3F] flex items-center justify-center shadow-[0_12px_28px_rgba(17,17,15,0.22)] z-10 border-2 border-[#D7FF3F]">
                              <Phone className="w-7 h-7 fill-current animate-pulse" />
                            </div>
                          </div>

                          {/* Caller Details */}
                          <div className="space-y-1 my-2">
                            <div className="text-[10px] font-mono tracking-[0.25em] text-emerald-700 uppercase flex items-center justify-center gap-1.5 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                              <span>INCOMING CALL</span>
                            </div>
                            <h3 className="font-display font-medium text-2xl text-[#11110F] tracking-tight">
                              Unknown Number
                            </h3>
                            <p className="text-xs font-mono text-[#6E6B62] tracking-wide">
                              Protected Caller · Tag #PG-4421
                            </p>
                          </div>

                          {/* Interactive Slide to Answer Component */}
                          <div className="flex flex-col items-center gap-3 w-full pb-1">
                            <SlideToAnswer onAnswer={handleAnswerCall} />
                            <div className="text-[10px] font-mono text-[#8C887E] tracking-widest uppercase">
                              {isCallAnswered ? 'Connecting Audio Bridge...' : 'Zero Number Exposure'}
                            </div>
                          </div>
                        </motion.div>
                      ) : isRelayActive ? (
                        /* ── SCENE: ZERO-KNOWLEDGE PRIVATE RELAY TRANSFORMATION ── */
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <PrivateRelayInteraction
                            autoStart={true}
                            onComplete={() => setHeroState('incoming_call')}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        /* ── SCENE: PUBLIC CONTACT INTERFACE ── */
                        <div className="h-full flex flex-col justify-between">
                          {/* Vehicle / Resource Card */}
                          <div className="p-3.5 bg-white rounded-2xl border border-[#E3E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-sans font-semibold tracking-wider text-[#6E6B62] uppercase">
                                Registered Vehicle
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#F4F3EE] border border-[#D8D5CC] font-mono text-[10px] font-bold text-[#11110F]">
                                PG-4421
                              </span>
                            </div>
                            <h3 className="font-display font-bold text-[18px] text-[#11110F] tracking-tight leading-snug">
                              Bajaj Pulsar
                            </h3>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-sans text-[#6E6B62]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
                              <span>Owner can be reached securely.</span>
                            </div>
                          </div>

                          {/* Primary Action: Anonymous Voice Call Button */}
                          <div className="space-y-1 shrink-0">
                            <div className="flex items-center justify-between px-0.5">
                              <span className="text-[10px] font-sans font-semibold text-[#6E6B62] uppercase tracking-wider">
                                Direct Contact
                              </span>
                              <span className="text-[10px] font-mono text-emerald-700 font-medium">
                                Zero number exposure
                              </span>
                            </div>

                            <motion.button
                              type="button"
                              onClick={() => setIsRelayActive(true)}
                              animate={{
                                boxShadow: [
                                  '0 4px 14px rgba(17,17,15,0.12), 0 0 0 1px rgba(255,255,255,0.08) inset',
                                  '0 8px 24px rgba(215,255,63,0.32), 0 0 0 1px rgba(215,255,63,0.35) inset',
                                  '0 4px 14px rgba(17,17,15,0.12), 0 0 0 1px rgba(255,255,255,0.08) inset',
                                ],
                              }}
                              transition={{
                                duration: 2.6,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              className="relative overflow-hidden w-full py-3 px-3.5 bg-[#11110F] hover:bg-black text-[#F4F3EE] rounded-2xl flex items-center justify-between group transition-colors duration-200 cursor-pointer"
                            >
                              {/* Ambient light sheen sweep */}
                              <motion.div
                                animate={{ x: ['-140%', '240%'] }}
                                transition={{
                                  duration: 3.2,
                                  repeat: Infinity,
                                  repeatDelay: 1.4,
                                  ease: [0.4, 0, 0.2, 1],
                                }}
                                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-12 pointer-events-none"
                              />

                              <div className="relative z-10 flex items-center gap-2.5">
                                <motion.span
                                  animate={{ scale: [1, 1.06, 1] }}
                                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                  className="w-7 h-7 rounded-full bg-[#D7FF3F] text-[#11110F] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(215,255,63,0.45)]"
                                >
                                  <Phone className="w-3.5 h-3.5 fill-current" />
                                </motion.span>
                                <div className="text-left">
                                  <div className="text-[12.5px] font-sans font-semibold text-[#F4F3EE] leading-tight flex items-center gap-1.5">
                                    <span>CALL PRIVATELY</span>
                                  </div>
                                  <div className="text-[10.5px] font-sans text-[#A8A59C] leading-tight mt-0.5">
                                    Your phone number stays hidden
                                  </div>
                                </div>
                              </div>
                              <motion.span
                                animate={{ scale: [1, 1.04, 1] }}
                                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                className="relative z-10 text-[10px] font-mono font-bold text-[#11110F] bg-[#D7FF3F] group-hover:bg-[#cbf535] px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(215,255,63,0.35)] uppercase tracking-wide transition-colors"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#11110F] animate-pulse" />
                                Call
                              </motion.span>
                            </motion.button>
                          </div>

                          {/* One-Tap Quick Notification Alerts */}
                          <div className="space-y-1.5 shrink-0">
                            <span className="text-[10px] font-sans font-semibold text-[#6E6B62] uppercase tracking-wider block px-0.5">
                              One-Tap Quick Notifications
                            </span>

                            <div className="space-y-1.5">
                              {QUICK_ALERTS.map((item) => {
                                const Icon = item.icon;
                                const isCurrentSent = selectedAlert === item.id && alertSent;

                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAlert(item.id);
                                      setAlertSent(true);
                                      setTimeout(() => setAlertSent(false), 2500);
                                    }}
                                    className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                                      isCurrentSent
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                                        : 'bg-white hover:bg-[#FAF9F5] border-[#E3E0D8] text-[#11110F] shadow-[0_1px_4px_rgba(0,0,0,0.02)] active:scale-[0.99]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                          isCurrentSent
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-[#F4F3EE] group-hover:bg-[#EAE8E0] text-[#11110F]'
                                        }`}
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                      </span>
                                      <div>
                                        <div className="text-[11.5px] font-sans font-semibold text-[#11110F] leading-tight">
                                          {item.title}
                                        </div>
                                        <div className="text-[9.5px] font-sans text-[#6E6B62] leading-tight mt-0.5">
                                          {item.subtitle}
                                        </div>
                                      </div>
                                    </div>

                                    {isCurrentSent ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <span className="w-5 h-5 rounded-full bg-[#F4F3EE] group-hover:bg-[#11110F] group-hover:text-white flex items-center justify-center text-[#6E6B62] transition-colors shrink-0">
                                        <ArrowUpRight className="w-3 h-3" />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Fixed Footer Slot - Reserves exact height so alert never shifts container! */}
                          <div className="h-8 flex items-center justify-center shrink-0 border-t border-[#E3E0D8]/60 pt-1">
                            <AnimatePresence mode="wait">
                              {alertSent ? (
                                <motion.div
                                  key="alert-sent-banner"
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -3 }}
                                  transition={{ duration: 0.2 }}
                                  className="w-full py-1 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10.5px] font-sans text-center font-medium flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Owner alerted successfully.</span>
                                </motion.div>
                              ) : (
                                <div className="text-center text-[10px] font-sans text-[#8C887E]">
                                  Encrypted PingIn Connection · Zero spam guarantee
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Minimal Revert Logo Button tucked in corner */}
      {heroState !== 'idle' && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2 }}
          type="button"
          onClick={handleReset}
          title="Reset to QR"
          className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30 p-2.5 rounded-full border border-[#D8D5CC] bg-white/80 hover:bg-white text-[#6E6B62] hover:text-[#11110F] backdrop-blur-md shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
          aria-label="Reset to QR"
        >
          <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform duration-200" />
        </motion.button>
      )}
    </section>
  );
};

export default HeroRecreation;
