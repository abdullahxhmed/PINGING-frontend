import React from 'react';

export interface KauntactFaviconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  withBackground?: boolean;
}

export const KauntactFavicon: React.FC<KauntactFaviconProps> = ({
  size = 32,
  className = '',
  withBackground = true,
  style,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-label="Kauntact"
      role="img"
      style={{
        width: size,
        height: size,
        ...style,
      }}
      {...props}
    >
      <defs>
        <linearGradient id="kauntact-bone-surface-comp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f4ee" />
          <stop offset="100%" stopColor="#edece6" />
        </linearGradient>
      </defs>

      {withBackground && (
        <>
          <rect width="512" height="512" rx="112" fill="url(#kauntact-bone-surface-comp)" />
          <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="#cbc8bd" strokeWidth="4" />
        </>
      )}

      <g transform="translate(256, 256) scale(2.05) translate(-138, -162)">
        <rect x="50" y="79.148033" width="176" height="17.248861" fill="currentColor" />
        <path
          d="m 108.01526,244.80486 v -45.61978 h 31.91139 l 33.03499,45.61978 h 28.54046 l -41.79941,-57.97981 42.02412,-53.70997 h -28.31569 l -33.48447,44.27141 H 108.01526 V 94.237154 H 83.744665 V 244.80486 Z"
          fill="currentColor"
        />
        <rect
          x="142"
          y="-172"
          width="17"
          height="17"
          transform="rotate(44.292682)"
          ry="3.5"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export default KauntactFavicon;
