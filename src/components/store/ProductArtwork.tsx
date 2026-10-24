import React from 'react';

export interface ProductArtworkProps {
  images: {
    dark: string;
    light: string;
  };
  alt: string;
  tone: 'dark' | 'light';
  aspectRatioClass?: string;
  className?: string;
}

export const ProductArtwork: React.FC<ProductArtworkProps> = ({
  images,
  alt,
  tone,
  aspectRatioClass = 'aspect-[16/9]',
  className = '',
}) => {
  const isDark = tone === 'dark';

  return (
    <div
      className={`relative ${aspectRatioClass} rounded-md overflow-hidden border transition-colors duration-300 ${
        isDark ? 'border-white/10 bg-[#0d0d0c]' : 'border-border bg-[#eceae1]'
      } ${className}`}
    >
      {/* Dark Finish Image */}
      <img
        src={images.dark}
        alt={`${alt} (Dark)`}
        loading="eager"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          isDark ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* Light Finish Image */}
      <img
        src={images.light}
        alt={`${alt} (Light)`}
        loading="eager"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          !isDark ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />
    </div>
  );
};
