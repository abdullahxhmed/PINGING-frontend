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
  height = 32,
  width = 136,
  scale = 1,
  className = '',
  fallbackText = false,
}) => {
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
      customDevicePixelRatio:
        typeof window !== 'undefined'
          ? Math.max(window.devicePixelRatio || 1, 2)
          : 2,
    }
  );

  useEffect(() => {
    if (rive) {
      rive.resizeDrawingSurfaceToCanvas();
    }
  }, [rive, width, height]);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={`relative inline-flex items-center shrink-0 select-none overflow-visible ${className}`}
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

export const ParkPingLogo = PingInLogo;
export default PingInLogo;
