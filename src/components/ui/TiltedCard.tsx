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
    setTransform(`perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scaleOnHover})`);
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
