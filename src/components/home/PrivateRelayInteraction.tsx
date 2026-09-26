import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Phone } from 'lucide-react';

export type MorphStage =
  | 'idle'         // Button visible
  | 'number'       // Raw phone number in place
  | 'scrambling'   // Digits scrambling in place
  | 'collapsing'   // Contracted into left node ●
  | 'extending'    // Line growing out from ●
  | 'pulsing'      // Signal traveling across the line
  | 'connected';   // Owner node activated, "CONNECTED" visible

interface PrivateRelayInteractionProps {
  onComplete?: () => void;
  className?: string;
  autoStart?: boolean;
}

const INITIAL_NUMBER = '+91 98765 43210';
const SCRAMBLED_TARGET = '9K3A57X210';
const SCRAMBLE_POOL = '0123456789ABCDEFHKMNPXYZ';

export const PrivateRelayInteraction: React.FC<PrivateRelayInteractionProps> = ({
  onComplete,
  className = '',
  autoStart = false,
}) => {
  const [stage, setStage] = useState<MorphStage>(autoStart ? 'number' : 'idle');
  const [displayChars, setDisplayChars] = useState<string[]>(INITIAL_NUMBER.split(''));
  const [activeBlur, setActiveBlur] = useState<boolean[]>(
    new Array(INITIAL_NUMBER.length).fill(false)
  );

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    if (autoStart) {
      startContinuousMorph();
    }
    return () => clearAllTimers();
  }, [autoStart]);

  const startContinuousMorph = () => {
    clearAllTimers();
    setDisplayChars(INITIAL_NUMBER.split(''));
    setActiveBlur(new Array(INITIAL_NUMBER.length).fill(false));

    // 1. NUMBER REVEALED IN PLACE (0.00s - 0.50s)
    setStage('number');

    // 2. DIGITS SCRAMBLE IN PLACE (0.50s - 1.45s)
    const tScramble = setTimeout(() => {
      setStage('scrambling');
      runDigitScramble();
    }, 500);
    timersRef.current.push(tScramble);

    // 3. NUMBER COMPRESSES INTO THE NODE ● (1.45s - 1.85s)
    const tCollapse = setTimeout(() => {
      setStage('collapsing');
    }, 1450);
    timersRef.current.push(tCollapse);

    // 4. LINE GROWS OUT FROM THE NODE (1.85s - 2.45s)
    const tExtend = setTimeout(() => {
      setStage('extending');
    }, 1850);
    timersRef.current.push(tExtend);

    // 5. PULSE TRAVELS TO OWNER (2.45s - 3.15s)
    const tPulse = setTimeout(() => {
      setStage('pulsing');
    }, 2450);
    timersRef.current.push(tPulse);

    // 6. CONNECTED (3.15s+)
    const tConnected = setTimeout(() => {
      setStage('connected');
      if (onComplete) {
        const tDone = setTimeout(() => {
          onComplete();
        }, 1200);
        timersRef.current.push(tDone);
      }
    }, 3150);
    timersRef.current.push(tConnected);
  };

  // In-place precision odometer wave
  const runDigitScramble = () => {
    const chars = INITIAL_NUMBER.split('');
    const targetArr = SCRAMBLED_TARGET.split('');
    
    // Map initial alphanumeric indices to target
    let targetIndex = 0;

    chars.forEach((char, idx) => {
      if (char === ' ' || char === '+') return;

      const currentTargetChar = targetArr[targetIndex] || 'X';
      targetIndex++;

      const staggerDelay = idx * 30; // 30ms wave
      const cycles = 5;
      const speed = 36;

      const tStart = setTimeout(() => {
        setActiveBlur((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });

        for (let step = 0; step < cycles; step++) {
          const tCycle = setTimeout(() => {
            setDisplayChars((prev) => {
              const next = [...prev];
              if (step === cycles - 1) {
                next[idx] = currentTargetChar;
              } else {
                next[idx] = SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)];
              }
              return next;
            });

            if (step === cycles - 1) {
              setActiveBlur((prev) => {
                const next = [...prev];
                next[idx] = false;
                return next;
              });
            }
          }, step * speed);
          timersRef.current.push(tCycle);
        }
      }, staggerDelay);

      timersRef.current.push(tStart);
    });
  };

  // Layout width for the circuit track
  const CIRCUIT_WIDTH = 240;

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* Unified Spatial Stage: All transformations occur within this single coordinate frame */}
      <div className="relative w-full max-w-[280px] h-36 flex flex-col items-center justify-center">

        {/* ── STAGE 0: CALL PRIVATELY ACTION BUTTON ── */}
        {stage === 'idle' && (
          <motion.button
            key="call-btn"
            type="button"
            onClick={startContinuousMorph}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 px-6 bg-[#11110F] hover:bg-black text-[#F4F3EE] rounded-2xl flex items-center justify-between group transition-all duration-200 border border-zinc-800 shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#D7FF3F] text-[#11110F] flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 fill-current" />
              </span>
              <div className="text-left">
                <div className="text-[13px] font-sans font-semibold tracking-wide text-zinc-100">
                  CALL PRIVATELY
                </div>
                <div className="text-[11px] font-sans text-zinc-400 mt-0.5">
                  Your identity stays hidden
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#11110F] bg-[#D7FF3F] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#11110F] animate-pulse" />
              Call
            </span>
          </motion.button>
        )}

        {/* ── CONTINUOUS ENTITY CONTAINER: NUMBER → SCRAMBLE → DOT → GROWING LINE → PULSE → CONNECTED ── */}
        {stage !== 'idle' && (
          <div
            className="relative flex items-center justify-start"
            style={{ width: `${CIRCUIT_WIDTH}px`, height: '28px' }}
          >
            {/* The Text Entity: Number -> Scramble -> Collapses into Left Node */}
            {(stage === 'number' || stage === 'scrambling' || stage === 'collapsing') && (
              <motion.div
                key="number-entity"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: stage === 'collapsing' ? 0 : 1,
                  scale: stage === 'collapsing' ? 0.05 : 1,
                  letterSpacing: stage === 'collapsing' ? '-0.3em' : '0.04em',
                  filter: stage === 'collapsing' ? 'blur(1px)' : 'blur(0px)',
                }}
                transition={{
                  duration: stage === 'collapsing' ? 0.35 : 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  transformOrigin: 'left center',
                  fontVariantNumeric: 'tabular-nums',
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 font-mono text-xl sm:text-2xl text-[#11110F] font-light tracking-wider flex items-center whitespace-nowrap z-10"
              >
                {displayChars.map((ch, idx) => (
                  <span
                    key={idx}
                    className={`inline-block text-center transition-all duration-100 ${
                      ch === ' ' ? 'w-[0.5ch]' : 'w-[1.1ch]'
                    } ${activeBlur[idx] ? 'blur-[0.7px] text-[#8C887E]' : 'text-[#11110F] blur-0'}`}
                  >
                    {ch}
                  </span>
                ))}
              </motion.div>
            )}

            {/* The Left Node ● (Materializes at the exact left anchor as the string finishes contracting) */}
            {(stage === 'collapsing' || stage === 'extending' || stage === 'pulsing' || stage === 'connected') && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: stage === 'collapsing' ? 0.18 : 0,
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#11110F] shadow-[0_0_8px_rgba(17,17,15,0.3)] z-20"
              />
            )}

            {/* The Line Growing Directly Out from the Left Node ● */}
            {(stage === 'extending' || stage === 'pulsing' || stage === 'connected') && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: CIRCUIT_WIDTH }}
                transition={{
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1], // Smooth engineered extension
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-[#D8D5CC] origin-left"
              />
            )}

            {/* The Owner Node ● (Materializes at the exact tip of the grown line) */}
            {(stage === 'extending' || stage === 'pulsing' || stage === 'connected') && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: stage === 'extending' ? 0.45 : 0, // Appears as line reaches the end
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full z-20 transition-all duration-300 ${
                  stage === 'connected'
                    ? 'bg-emerald-600 shadow-[0_0_12px_rgba(5,150,105,0.5)] ring-4 ring-emerald-500/20'
                    : 'bg-[#B0ACA2]'
                }`}
                style={{ left: `${CIRCUIT_WIDTH}px` }}
              />
            )}

            {/* Single moving signal pulse traveling along the newly constructed line */}
            {stage === 'pulsing' && (
              <motion.div
                initial={{ left: 0 }}
                animate={{ left: CIRCUIT_WIDTH }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#11110F] shadow-[0_0_8px_rgba(17,17,15,0.7)] z-30 pointer-events-none"
              />
            )}
          </div>
        )}

        {/* ── STAGE 6: THE RESULT - ONLY "CONNECTED" ── */}
        {stage === 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-700 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.6)]" />
              <span>CONNECTED</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PrivateRelayInteraction;
