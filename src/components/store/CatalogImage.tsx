// src/components/store/CatalogImage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { fetchCatalogImageUrl, extractUrlExpiration } from '../../services/catalogImages';

export interface CatalogImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  productId?: string;
  imageType?: 'dark' | 'light' | 'default';
  initialUrl?: string | null;
  expiresAt?: string | null;
  fallbackSrc?: string;
  maxRetries?: number;
  onRefreshSuccess?: (newUrl: string) => void;
}

import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';

export const CatalogImage: React.FC<CatalogImageProps> = ({
  productId,
  imageType = 'default',
  initialUrl,
  expiresAt,
  fallbackSrc = DEFAULT_PRODUCT_IMAGE,
  maxRetries = 3,
  alt = 'Product image',
  className = '',
  onRefreshSuccess,
  ...rest
}) => {
  // Current active display URL (starts with signed initialUrl if provided, else fallbackSrc)
  const [displayUrl, setDisplayUrl] = useState<string>(() => initialUrl || fallbackSrc || '');
  // Keep track of the last successfully rendered image to avoid flashing blank during retry
  const lastWorkingUrlRef = useRef<string>(initialUrl || fallbackSrc || '');
  // Retry counter bounded to maxRetries
  const retryCountRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to schedule proactive refresh before expiration
  const scheduleProactiveRefresh = (url: string, expIso?: string | null) => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    if (!productId) return;

    const expirationMs = extractUrlExpiration(url, expIso);
    if (!expirationMs) return;

    const now = Date.now();
    // Schedule refresh 3 minutes (180,000ms) before actual expiration
    const refreshDelay = Math.max(5000, expirationMs - now - 3 * 60 * 1000);

    // Only set timer if within reasonable window (less than 24 hours)
    if (refreshDelay < 24 * 60 * 60 * 1000) {
      expiryTimerRef.current = setTimeout(() => {
        handleRefresh('proactive');
      }, refreshDelay);
    }
  };

  // Re-fetch and preload fresh signed URL
  const handleRefresh = async (trigger: 'error' | 'proactive') => {
    if (!productId || isRefreshingRef.current) return;

    // Preserve exact variant artwork when an initial signed URL is provided
    if (initialUrl && trigger === 'proactive' && lastWorkingUrlRef.current === initialUrl) {
      return;
    }

    if (trigger === 'error') {
      if (retryCountRef.current >= maxRetries) {
        // Fall back to local placeholder if bounded retries exhausted
        if (fallbackSrc && displayUrl !== fallbackSrc) {
          setDisplayUrl(fallbackSrc);
        }
        return;
      }
      retryCountRef.current += 1;
    }

    isRefreshingRef.current = true;

    try {
      const refreshed = await fetchCatalogImageUrl(productId, imageType);
      if (refreshed?.url) {
        // Preload before updating DOM state
        const preloader = new Image();
        preloader.onload = () => {
          setDisplayUrl(refreshed.url);
          lastWorkingUrlRef.current = refreshed.url;
          retryCountRef.current = 0; // Reset retry counter on successful load
          isRefreshingRef.current = false;
          onRefreshSuccess?.(refreshed.url);
          scheduleProactiveRefresh(refreshed.url, refreshed.expiresAt);
        };
        preloader.onerror = () => {
          isRefreshingRef.current = false;
          if (trigger === 'error' && retryCountRef.current >= maxRetries) {
            if (fallbackSrc) setDisplayUrl(fallbackSrc);
          }
        };
        preloader.src = refreshed.url;
      } else {
        isRefreshingRef.current = false;
      }
    } catch {
      isRefreshingRef.current = false;
      if (trigger === 'error' && retryCountRef.current >= maxRetries) {
        if (fallbackSrc) setDisplayUrl(fallbackSrc);
      }
    }
  };

  // Reset component state cleanly when productId, imageType, or initialUrl changes
  useEffect(() => {
    retryCountRef.current = 0;
    isRefreshingRef.current = false;
    const nextUrl = initialUrl || fallbackSrc || '';
    setDisplayUrl(nextUrl);
    lastWorkingUrlRef.current = nextUrl;

    if (initialUrl) {
      scheduleProactiveRefresh(initialUrl, expiresAt);
    }

    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [productId, imageType, initialUrl, expiresAt, fallbackSrc]);

  const handleImageError = () => {
    if (productId) {
      handleRefresh('error');
    } else if (fallbackSrc && displayUrl !== fallbackSrc) {
      setDisplayUrl(fallbackSrc);
    }
  };

  const handleImageLoad = () => {
    lastWorkingUrlRef.current = displayUrl;
  };

  return (
    <img
      src={displayUrl}
      alt={alt}
      onError={handleImageError}
      onLoad={handleImageLoad}
      className={className}
      {...rest}
    />
  );
};
