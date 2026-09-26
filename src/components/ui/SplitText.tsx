import React, { useEffect, useRef, useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  threshold?: number;
  onAnimationComplete?: () => void;
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 80,
  duration = 500,
  threshold = 0.2,
  onAnimationComplete,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const words = text.split(' ');

  return (
    <span ref={ref} className={`inline ${className}`} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden" aria-hidden="true">
          <span
            style={{
              display: 'inline-block',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${i * delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${i * delay}ms`,
              willChange: 'opacity, transform',
            }}
            onTransitionEnd={() => {
              if (i === words.length - 1 && onAnimationComplete) onAnimationComplete();
            }}
          >
            {word}
          </span>
          {i < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  );
};

export default SplitText;
