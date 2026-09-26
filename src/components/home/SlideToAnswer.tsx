import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Phone, Check } from 'lucide-react';

interface SlideToAnswerProps {
  onAnswer: () => void;
  disabled?: boolean;
}

export const SlideToAnswer: React.FC<SlideToAnswerProps> = ({ onAnswer, disabled = false }) => {
  const [answered, setAnswered] = useState(false);
  const x = useMotionValue(0);
  const maxDrag = 180; // Distance handle can travel in px

  // Shimmering prompt text fades as handle is dragged
  const textOpacity = useTransform(x, [0, maxDrag * 0.7], [1, 0]);

  const handleDragEnd = () => {
    if (x.get() > maxDrag * 0.6 && !answered && !disabled) {
      setAnswered(true);
      x.set(maxDrag);
      onAnswer();
    } else if (!answered) {
      x.set(0);
    }
  };

  const handleQuickTap = () => {
    if (!answered && !disabled) {
      setAnswered(true);
      x.set(maxDrag);
      onAnswer();
    }
  };

  return (
    <div className="relative w-full max-w-[248px] h-[54px] bg-white rounded-full border border-[#D8D5CC] p-1 flex items-center select-none overflow-hidden shadow-inner touch-none">
      {/* Background Track Prompt Text */}
      <motion.div
        style={{ opacity: textOpacity }}
        className="absolute inset-0 flex items-center justify-center pl-10 pr-4 text-[11px] font-mono text-[#6E6B62] tracking-wider pointer-events-none"
      >
        <span className="tracking-widest uppercase">Slide to answer</span>
        <span className="ml-1 text-[#11110F] font-sans tracking-normal font-bold">››</span>
      </motion.div>

      {/* Answered State Background Fill */}
      {answered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-emerald-50 border border-emerald-400 rounded-full flex items-center justify-center text-[11px] font-mono text-emerald-900 tracking-widest uppercase pointer-events-none"
        >
          Connecting audio...
        </motion.div>
      )}

      {/* Draggable Action Handle */}
      <motion.div
        drag={answered ? false : 'x'}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.06}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={handleQuickTap}
        className={`w-11 h-11 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-colors shadow-md touch-none select-none ${
          answered
            ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]'
            : 'bg-[#11110F] hover:bg-black text-[#D7FF3F] shadow-[0_4px_12px_rgba(17,17,15,0.25)]'
        }`}
      >
        {answered ? (
          <Check className="w-5 h-5 text-white stroke-[2.5]" />
        ) : (
          <Phone className="w-5 h-5 fill-current" />
        )}
      </motion.div>
    </div>
  );
};

export default SlideToAnswer;
