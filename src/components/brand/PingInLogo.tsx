import React, { useEffect } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export interface PingInLogoProps {
  height?: number;
  width?: number;
  scale?: number;
  className?: string;
  fallbackText?: boolean;
}

export const PingInLogo: React.FC<PingInLogoProps> = ({
  height,
  width,
  scale = 1,
  className = '',
  fallbackText = false,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Maintain full 2x Retina sharpness while preventing 3x/4x overdraw
  const customDpr =
    typeof window !== 'undefined'
      ? Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
      : 1;

  const { rive, RiveComponent } = useRive(
    {
      src: '/pingin.riv',
      autoplay: true,
      layout: new Layout({
        fit: Fit.FitWidth,
        alignment: Alignment.CenterLeft,
      }),
    },
    {
      useDevicePixelRatio: true,
      customDevicePixelRatio: customDpr,
    }
  );

  useEffect(() => {
    if (rive) {
      rive.resizeDrawingSurfaceToCanvas();
    }
  }, [rive, width, height]);

  // Dynamically adapt canvas when container dimensions change responsively
  useEffect(() => {
    if (!rive || !containerRef.current) return;
    const observer = new ResizeObserver(() => {
      rive.resizeDrawingSurfaceToCanvas();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [rive]);

  const hasCustomSizeClass = /(?:^|\s)(?:w-|h-)/.test(className);
  const inlineStyle: React.CSSProperties = {
    ...(width !== undefined ? { width: `${width}px` } : !hasCustomSizeClass ? { width: '136px' } : {}),
    ...(height !== undefined ? { height: `${height}px` } : !hasCustomSizeClass ? { height: '32px' } : {}),
  };

  return (
    <div
      ref={containerRef}
      style={inlineStyle}
      className={`relative inline-flex items-center shrink-0 select-none overflow-visible will-change-transform ${className}`}
      aria-label="PINGIN"
    >
      <div
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'left center',
        }}
        className="w-full h-full flex items-center"
      >
        <RiveComponent className="w-full h-full" />
      </div>
      {fallbackText && !rive && (
        <span className="font-display font-medium text-base tracking-[0.14em] uppercase text-ink absolute inset-0 flex items-center">
          PINGIN
        </span>
      )}
    </div>
  );
};

export { PingInSvgLogo } from './PingInSvgLogo';
export const ParkPingLogo = PingInLogo;
export default PingInLogo;
