import React from 'react';

export interface FindatLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  height?: number | string;
  width?: number | string;
  findColor?: string;
  atColor?: string;
  scale?: number;
  inline?: boolean;
}

/**
 * Pure SVG vector Findat Wordmark extracted directly from public/findat.svg.
 * "find" adopts findColor (default: currentColor) while "at" adopts atColor (default: #8f8f8f).
 * Sized conservatively (default height: 16px, or 0.86em when inline) for crisp modern UI balance.
 */
export const FindatLogo: React.FC<FindatLogoProps> = ({
  className = '',
  height,
  width,
  findColor = 'currentColor',
  atColor = '#8f8f8f',
  scale = 1,
  inline = false,
  style,
  ...props
}) => {
  const resolvedHeight = height !== undefined ? height : inline ? '0.75em' : 16;
  const RATIO = 162.14761 / 34.734486; // ≈ 4.668234

  let computedWidth: string | number | undefined;
  if (width !== undefined) {
    computedWidth = width;
  } else if (typeof resolvedHeight === 'number') {
    computedWidth = Math.round(resolvedHeight * RATIO);
  } else if (typeof resolvedHeight === 'string' && resolvedHeight.endsWith('em')) {
    computedWidth = `${(parseFloat(resolvedHeight) * RATIO).toFixed(2)}em`;
  } else if (typeof resolvedHeight === 'string' && resolvedHeight.endsWith('px')) {
    computedWidth = `${Math.round(parseFloat(resolvedHeight) * RATIO)}px`;
  } else {
    computedWidth = typeof resolvedHeight === 'number' ? Math.round(resolvedHeight * RATIO) : undefined;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 162.14761 34.734486"
      height={resolvedHeight}
      width={computedWidth}
      style={{
        display: inline ? 'inline-block' : 'inline-block',
        verticalAlign: inline ? '-0.08em' : 'middle',
        width: computedWidth,
        height: resolvedHeight,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'left center',
        ...style,
      }}
      className={`shrink-0 select-none ${inline ? 'inline-block align-baseline' : ''} ${className}`}
      aria-label="FINDAT"
      role="img"
      {...props}
    >
      <g transform="translate(-21.299147,-118.963)">
        <path
          d="m 171.50961,578.26388 v -72.384 h 29.76 v -23.808 h -30.912 c -0.768,-9.408 5.184,-11.52 17.856,-11.52 h 13.056 v -20.928 h -8.448 c -29.568,0 -46.464,13.056 -49.536,32.448 h -14.208 v 23.808 h 13.632 v 72.384 z m 68.16,-105.984 v -22.656 h -28.8 v 22.656 z m 0,105.984 v -96.192 h -28.8 v 96.192 z m 43.9681,0 v -48.576 c 0,-16.32 6.528,-23.616 24.768,-23.616 17.664,0 24,6.528 24,21.888 v 50.304 h 28.8 v -59.904 c 0,-21.312 -12.48,-38.208 -38.784,-38.208 -25.152,0 -36.672,15.36 -39.168,31.488 h -1.728 v -29.568 h -26.688 v 96.192 z m 135.16784,1.92 c 22.08,0 34.752,-9.6 38.4,-28.608 h 1.536 v 26.688 h 26.88 v -128.64 h -28.8 v 57.984 h -1.728 c -3.264,-16.128 -14.976,-27.456 -37.824,-27.456 -28.608,0 -44.928,19.392 -44.928,50.112 0,30.336 16.512,49.92 46.464,49.92 z m -17.28,-49.92 c 0,-17.664 8.64,-23.808 27.072,-23.808 18.432,0 24.60596,4.2873 24.60596,20.9913 v 7.57029 c 0,10.35437 -6.36596,18.86241 -24.60596,18.86241 -18.432,0 -27.072,-6.144 -27.072,-23.616 z"
          fill={findColor}
          transform="matrix(0.3055025,0,0,0.26458333,-18.134387,0)"
        />
        <g transform="matrix(0.97947062,0,0,1,1.724624,0)">
          <path
            d="m 185.53097,153.18947 h -6.15118 c -5.6338,0 -9.25552,-2.08281 -9.25552,-7.9756 v -14.02079 h -5.05891 v -3.0988 h 5.05891 v -5.99439 h 4.13912 v 5.99439 h 11.26758 v 3.0988 h -11.26758 v 14.22399 c 0,3.5052 1.95457,4.4704 6.09369,4.4704 h 5.17389 z m -43.11753,-5.90117 c 0.1635,2.90612 2.20674,3.46511 2.64615,3.61517 2.76185,0.94318 12.35986,-2.6924 12.35986,-8.73759 v -0.2032 l -12.24488,1.21919 c -1.52284,0.10997 -2.89295,1.76356 -2.76113,4.10643 z m 1.72636,6.40916 c -5.57631,0 -9.3705,-2.33679 -9.3705,-6.40079 0,-4.1148 3.85168,-5.89279 9.14054,-6.40079 l 13.50961,-1.3208 v -1.9304 c 0,-4.87679 -2.41448,-6.8072 -8.62316,-6.8072 -6.09369,0 -4.053,6.03746 -5.98799,6.22719 l -3.32501,0.32601 h -4.08163 v -0.2032 c 0,-5.2832 4.94394,-9.60119 13.68208,-9.60119 8.62315,0 12.30236,4.36879 12.30236,9.90599 v 15.69719 h -3.67921 v -6.7564 h -0.28744 c -1.66715,4.6228 -6.66857,7.26439 -13.27965,7.26439 z"
            fill={atColor}
          />
        </g>
      </g>
    </svg>
  );
};

export const FindatSvgLogo = FindatLogo;
export default FindatLogo;
