import os

def w(path, content):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

split_text = """\
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
    <span ref={ref} className={inline \} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden" aria-hidden="true">
          <span
            style={{
              display: 'inline-block',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: opacity \ms cubic-bezier(0.16, 1, 0.3, 1) \ms, transform \ms cubic-bezier(0.16, 1, 0.3, 1) \ms,
              willChange: 'opacity, transform',
            }}
            onTransitionEnd={() => {
              if (i === words.length - 1 && onAnimationComplete) onAnimationComplete();
            }}
          >
            {word}
          </span>
          {i < words.length - 1 && '\u00a0'}
        </span>
      ))}
    </span>
  );
};

export default SplitText;
"""

tilted_card = """\
import React, { useRef, useState } from 'react';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
  style?: React.CSSProperties;
}

export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  className = '',
  rotateAmplitude = 8,
  scaleOnHover = 1.0,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotY = ((x - cx) / cx) * rotateAmplitude;
    const rotX = -((y - cy) / cy) * rotateAmplitude;
    setTransform(perspective(600px) rotateX(\deg) rotateY(\deg) scale(\));
  };

  const handleMouseLeave = () => {
    setTransform('perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)');
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transform,
        transition: 'transform 0.15s ease-out',
        willChange: 'transform',
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

export default TiltedCard;
"""

spotlight_card = """\
import React, { useRef, useState } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(215, 255, 63, 0.07)',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      className={elative overflow-hidden \}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos(null)}
      style={{
        background: pos
          ? adial-gradient(350px circle at \px \px, \, transparent 70%)
          : undefined,
      }}
    >
      {children}
    </div>
  );
};

export default SpotlightCard;
"""

decrypted_text = """\
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
"""

click_spark = """\
import React, { useRef, useState, useCallback } from 'react';

interface Spark { id: number; x: number; y: number; angle: number; }

interface ClickSparkProps {
  children: React.ReactNode;
  sparkCount?: number;
  sparkColor?: string;
  sparkSize?: number;
  sparkDuration?: number;
  className?: string;
}

export const ClickSpark: React.FC<ClickSparkProps> = ({
  children,
  sparkCount = 6,
  sparkColor = '#d7ff3f',
  sparkSize = 6,
  sparkDuration = 350,
  className = '',
}) => {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
      id: nextId.current++,
      x, y,
      angle: (360 / sparkCount) * i,
    }));
    setSparks((prev) => [...prev, ...newSparks]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.find((ns) => ns.id === s.id)));
    }, sparkDuration + 50);
  }, [sparkCount, sparkDuration]);

  return (
    <div className={elative \} onClick={handleClick} style={{ isolation: 'isolate' }}>
      <style>{\
        @keyframes spark-fly-out {
          0%   { opacity: 1; transform: translate(-50%, -50%) rotate(var(--sa)) translateX(0px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--sa)) translateX(28px) scale(0.5); }
        }
      \}</style>
      {sparks.map((spark) => (
        <span
          key={spark.id}
          style={{
            position: 'absolute',
            left: spark.x,
            top: spark.y,
            width: sparkSize,
            height: sparkSize,
            borderRadius: '50%',
            backgroundColor: sparkColor,
            pointerEvents: 'none',
            '--sa': \\deg\,
            animation: \spark-fly-out \ms ease-out forwards\,
            zIndex: 50,
          } as React.CSSProperties}
        />
      ))}
      {children}
    </div>
  );
};

export default ClickSpark;
"""

w('src/components/ui/SplitText.tsx', split_text)
w('src/components/ui/TiltedCard.tsx', tilted_card)
w('src/components/ui/SpotlightCard.tsx', spotlight_card)
w('src/components/ui/DecryptedText.tsx', decrypted_text)
w('src/components/ui/ClickSpark.tsx', click_spark)
print('all done')
