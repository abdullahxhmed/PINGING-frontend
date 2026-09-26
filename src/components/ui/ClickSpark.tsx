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
    <div className={`relative ${className}`} onClick={handleClick} style={{ isolation: 'isolate' }}>
      <style>{`
        @keyframes spark-fly-out {
          0%   { opacity: 1; transform: translate(-50%, -50%) rotate(var(--sa)) translateX(0px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--sa)) translateX(28px) scale(0.5); }
        }
      `}</style>
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
            '--sa': `${spark.angle}deg`,
            animation: `spark-fly-out ${sparkDuration}ms ease-out forwards`,
            zIndex: 50,
          } as React.CSSProperties}
        />
      ))}
      {children}
    </div>
  );
};

export default ClickSpark;
