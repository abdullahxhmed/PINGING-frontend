import React, { useEffect, useRef, useState, useCallback } from 'react';

interface DecryptedTextProps {
  text: string;
  className?: string;
  encryptedClassName?: string;
  animateOn?: 'hover' | 'view';
  speed?: number;
  maxIterations?: number;
  characters?: string;
  reanimateOnHover?: boolean;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  className = '',
  encryptedClassName = '',
  animateOn = 'view',
  speed = 35,
  maxIterations = 14,
  characters = CHARS,
  reanimateOnHover = true,
}) => {
  const [revealedCount, setRevealedCount] = useState<number>(text.length);
  const [scrambledChars, setScrambledChars] = useState<string[]>(() => text.split(''));
  const [isAnimating, setIsAnimating] = useState(false);
  const hasAnimatedOnceRef = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAnimation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsAnimating(true);
    let iteration = 0;
    const step = Math.max(1, Math.ceil(text.length / maxIterations));

    intervalRef.current = setInterval(() => {
      iteration += step;
      setRevealedCount(iteration);
      setScrambledChars(
        text.split('').map((char, idx) => {
          if (char === ' ') return ' ';
          if (idx < iteration) return char;
          return characters[Math.floor(Math.random() * characters.length)];
        })
      );

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRevealedCount(text.length);
        setScrambledChars(text.split(''));
        setIsAnimating(false);
        hasAnimatedOnceRef.current = true;
      }
    }, speed);
  }, [text, speed, maxIterations, characters]);

  useEffect(() => {
    if (animateOn !== 'view') return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimatedOnceRef.current) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animateOn, startAnimation]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' || (reanimateOnHover && !isAnimating)) {
      startAnimation();
    }
  };

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      aria-label={text}
    >
      {text.split('').map((char, idx) => {
        const isRevealed = idx < revealedCount;
        const displayChar = scrambledChars[idx] ?? char;

        if (char === ' ') {
          return <span key={idx}> </span>;
        }

        return (
          <span
            key={idx}
            className={
              !isRevealed && isAnimating && encryptedClassName
                ? encryptedClassName
                : undefined
            }
          >
            {displayChar}
          </span>
        );
      })}
    </span>
  );
};

export default DecryptedText;
