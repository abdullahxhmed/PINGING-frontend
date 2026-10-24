import React, { useId } from 'react';

export interface PlusLogoProps extends React.SVGProps<SVGSVGElement> {
  height?: number | string;
  width?: number | string;
  theme?: 'dark' | 'light';
  className?: string;
}

/**
 * PlusLogo renders the official Kauntact Plus 3D geometric badge.
 * Extracted from plusLogoDark.svg and plusLogoLight.svg in src/assets.
 */
export const PlusLogo: React.FC<PlusLogoProps> = ({
  height = 18,
  width,
  theme = 'dark',
  className = '',
  style,
  ...props
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const isLight = theme === 'light';

  const stopColor1 = isLight ? '#cbc8bd' : '#2d2d2a';
  const stopColor2 = '#6b6961';
  const path3Fill = isLight ? '#cbc8bd' : '#2d2d2a';

  const grad1Id = `plusGrad1_${uniqueId}`;
  const grad2Id = `plusGrad2_${uniqueId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25.329279 25.380342"
      height={height}
      width={width || height}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', display: 'inline-block', ...style }}
      aria-label="Kauntact Plus"
      role="img"
      {...props}
    >
      <title>Kauntact Plus</title>
      <defs>
        <linearGradient
          id={grad1Id}
          x1="13.297596"
          y1="17.809753"
          x2="17.260221"
          y2="5.9118567"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={stopColor1} offset="0" />
          <stop stopColor={stopColor2} offset="1" />
        </linearGradient>
        <linearGradient
          id={grad2Id}
          x1="26.911694"
          y1="15.627665"
          x2="21.767216"
          y2="10.93131"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={stopColor1} offset="0" />
          <stop stopColor={stopColor2} offset="1" />
        </linearGradient>
      </defs>
      <g transform="translate(-3.978563,-4.0576435)">
        <path
          style={{ opacity: 1, fill: `url(#${grad1Id})`, strokeWidth: 0.264583 }}
          d="m 12.75723,5.9103892 v 6.9543018 c 0,0 0.05245,0.238805 -0.345413,0.345413 -0.397866,0.106608 -7.7449123,1.788468 -7.7449123,1.788468 0,0 -0.6374726,0.09472 -0.6846425,0.827534 -0.015624,0.242728 0.0059,0.581573 0.3123647,0.957096 0.2757814,0.337924 4.0856363,3.190482 4.0856363,3.190482 0,0 0.9878287,0.987829 5.0151318,-0.347368 4.027302,-1.335198 4.038158,-1.346053 4.038158,-1.346053 0,0 1.953947,-0.542763 1.888815,-3.11546 -0.06513,-2.572698 0,-5.2430927 0,-5.2430927 0,0 0.217105,-1.2917762 -1.063816,-2.4641447 -1.28092,-1.1723682 -3.549671,-3.0828946 -3.549671,-3.0828946 0,0 -0.770723,-0.6513157 -1.476315,-0.086842 -0.705593,0.5644737 -0.442988,1.5008638 -0.475336,1.6225602 z"
        />
        <path
          style={{ opacity: 1, fill: `url(#${grad2Id})`, strokeWidth: 0.264583 }}
          d="m 21.05921,11.875658 c 0,3.430263 0.01086,3.419408 0.01086,3.419408 0,0 -0.162829,2.464144 2.800658,1.899671 2.963487,-0.564474 4.791562,-1.069598 4.83059,-1.074671 0.126739,-0.01647 0.993498,-0.47548 0.401945,-1.500076 -0.591552,-1.024595 -4.168719,-3.504201 -4.168719,-3.504201 0,0 -0.607895,-0.4125 -2.0625,-0.173684 -1.454605,0.238816 -1.354508,0.212743 -1.498027,0.249671 -0.110386,0.0284 -0.249671,0.151974 -0.293092,0.423355 -0.04342,0.271382 -0.01241,0.266728 -0.01241,0.266728 z"
        />
        <path
          style={{ opacity: 1, fill: path3Fill, strokeWidth: 0.264583 }}
          d="m 12.847457,22.379848 c 0,2.192763 -0.0057,1.925086 -0.0057,1.925086 0,0 -0.119408,0.998684 0.792434,1.791118 0.911842,0.792435 3.593092,3.006908 3.593092,3.006908 0,0 0.738158,0.510198 1.313487,0.271383 0.575329,-0.238818 0.803289,-0.531908 0.803289,-0.694738 v -5.959539 c 0,0 0.429193,-3.283487 -2.281229,-2.428383 -1.772815,0.559301 -3.606254,1.120558 -3.753776,1.177371 -0.09257,0.03565 -0.495844,0.308418 -0.461621,0.910794 z"
        />
      </g>
    </svg>
  );
};

export default PlusLogo;
