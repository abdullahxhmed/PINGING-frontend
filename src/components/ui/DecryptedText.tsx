import React, { useEffect, useRef, useState, useCallback } from 'react';

interface DecryptedTextProps {
  text: string;
  className?: string;
  animateOn?: 'hover' | 'view';
  speed?: number;
  maxIterations?: number;
  characters?: string;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  className = '',
  animateOn = 'view',
  speed = 60,
  maxIterations = 10,
  characters = CHARS,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animate = useCallback(() => {
    if (hasAnimated) return;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text.split('').map((char, idx) => {
          if (char === ' ') return ' ';
          if (idx < iteration) return text[idx];
          return characters[Math.floor(Math.random() * characters.length)];
        }).join('')
      );
      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplayText(text);
        setHasAnimated(true);
      }
      iteration += text.length / maxIterations;
    }, speed);
    frameRef.current = interval;
  }, [text, hasAnimated, speed, maxIterations, characters]);

  useEffect(() => {
    if (animateOn !== 'view') return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { animate(); observer.disconnect(); }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frameRef.current) clearInterval(frameRef.current);
    };
  }, [animateOn, animate]);

  return (
    <span ref={ref} className={className} onMouseEnter={animateOn === 'hover' ? animate : undefined}>
      {displayText}
    </span>
  );
};

export default DecryptedText;
