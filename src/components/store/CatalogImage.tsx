// src/components/store/CatalogImage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  fetchCatalogImageUrl,
  extractUrlExpiration,
  isUrlExpired,
  resolveImageSource,
} from '../../services/catalogImages';
import { DEFAULT_PRODUCT_IMAGE } from '../../features/store/catalog';

export interface CatalogImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  productId?: string;
  imageType?: 'dark' | 'light' | 'default';
  initialUrl?: string | null;
  expiresAt?: string | null;
  fallbackSrc?: string;
  maxRetries?: number;
  onRefreshSuccess?: (newUrl: string) => void;
}

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
  const resolvedInitial = resolveImageSource(initialUrl);

  // Current active display URL
  const [displayUrl, setDisplayUrl] = useState<string>(() => resolvedInitial || fallbackSrc || '');
  // Track whether an image has ever loaded successfully in this instance
  const hasLoadedRef = useRef<boolean>(false);
  // Keep track of the last successfully rendered image to avoid flashing blank or placeholder during retry
  const lastWorkingUrlRef = useRef<string>(resolvedInitial || fallbackSrc || '');
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

    if (trigger === 'error') {
      if (retryCountRef.current >= maxRetries) {
        // If image has already loaded successfully, NEVER replace it with fallback placeholder!
        if (hasLoadedRef.current && lastWorkingUrlRef.current && lastWorkingUrlRef.current !== fallbackSrc) {
          return;
        }
        // Only fall back to local placeholder if bounded retries exhausted and never loaded
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
        // Preload image off-DOM before updating state
        const preloader = new Image();
        preloader.onload = () => {
          setDisplayUrl(refreshed.url);
          lastWorkingUrlRef.current = refreshed.url;
          hasLoadedRef.current = true;
          retryCountRef.current = 0; // Reset retry counter on successful load
          isRefreshingRef.current = false;
          onRefreshSuccess?.(refreshed.url);
          scheduleProactiveRefresh(refreshed.url, refreshed.expiresAt);
        };
        preloader.onerror = () => {
          isRefreshingRef.current = false;
          // Retain the currently loaded image if already visible
          if (hasLoadedRef.current && lastWorkingUrlRef.current && lastWorkingUrlRef.current !== fallbackSrc) {
            return;
          }
          if (trigger === 'error' && retryCountRef.current >= maxRetries) {
            if (fallbackSrc && displayUrl !== fallbackSrc) setDisplayUrl(fallbackSrc);
          }
        };
        preloader.src = refreshed.url;
      } else {
        isRefreshingRef.current = false;
      }
    } catch {
      isRefreshingRef.current = false;
      // If image has already loaded successfully, avoid replacing it with fallback
      if (hasLoadedRef.current && lastWorkingUrlRef.current && lastWorkingUrlRef.current !== fallbackSrc) {
        return;
      }
      if (trigger === 'error' && retryCountRef.current >= maxRetries) {
        if (fallbackSrc && displayUrl !== fallbackSrc) {
          setDisplayUrl(fallbackSrc);
        }
      }
    }
  };

  // Reset component state cleanly when productId, imageType, or initialUrl changes
  useEffect(() => {
    retryCountRef.current = 0;
    isRefreshingRef.current = false;
    const nextResolved = resolveImageSource(initialUrl);
    const nextUrl = nextResolved || fallbackSrc || '';

    setDisplayUrl(nextUrl);

    if (nextResolved && nextResolved !== fallbackSrc) {
      // Check if URL is already expired upon initialization
      if (isUrlExpired(nextResolved)) {
        if (productId) {
          handleRefresh('error');
        }
      } else {
        scheduleProactiveRefresh(nextResolved, expiresAt);
      }
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
    } else {
      // If we already loaded a working image, don't immediately blank it out
      if (hasLoadedRef.current && lastWorkingUrlRef.current && lastWorkingUrlRef.current !== fallbackSrc) {
        return;
      }
      if (fallbackSrc && displayUrl !== fallbackSrc) {
        setDisplayUrl(fallbackSrc);
      }
    }
  };

  const handleImageLoad = () => {
    hasLoadedRef.current = true;
    lastWorkingUrlRef.current = displayUrl;
    retryCountRef.current = 0;
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

