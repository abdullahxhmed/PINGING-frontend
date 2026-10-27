import React from 'react';
import { CatalogImage } from './CatalogImage';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';

export interface ProductArtworkProps {
  productId?: string;
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
  productId,
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
      <CatalogImage
        productId={productId}
        imageType="dark"
        initialUrl={images?.dark}
        alt={`${alt} (Dark)`}
        loading="eager"
        decoding="async"
        fallbackSrc={DEFAULT_PRODUCT_IMAGE}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          isDark ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />

      {/* Light Finish Image */}
      <CatalogImage
        productId={productId}
        imageType="light"
        initialUrl={images?.light}
        alt={`${alt} (Light)`}
        loading="eager"
        decoding="async"
        fallbackSrc={DEFAULT_PRODUCT_IMAGE}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          !isDark ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}
      />
    </div>
  );
};
