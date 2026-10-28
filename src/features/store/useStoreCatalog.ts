import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPublicCatalogDetailed, type PublicCatalogResponse } from '../../services/checkout';
import { populateCatalogImageCache, resolveImageSource } from '../../services/catalogImages';
import {
  type SetProduct,
  type AddonItem,
  getLiveAddons,
  getLiveSets,
  getLiveProducts,
  updateLiveCatalog,
  SESSION_SLOT_CACHE_KEY,
} from './catalog';
import type { BackendCatalogProduct } from '../../types/orders';

export interface UseStoreCatalogResult {
  products: BackendCatalogProduct[];
  sets: Record<string, SetProduct>;
  addons: Record<string, AddonItem>;
  isLoading: boolean;
  error: string | null;
  refreshCatalog: (background?: boolean) => Promise<void>;
}

// Module-level persistent cache of slot catalog data (valid until page refresh)
let cachedCatalogResponse: PublicCatalogResponse | null = null;
let inFlightPreloadPromise: Promise<PublicCatalogResponse> | null = null;

// Synchronously restore from sessionStorage at script evaluation time
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const raw = window.sessionStorage.getItem(SESSION_SLOT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.data) && parsed.data.length > 0) {
        cachedCatalogResponse = {
          data: parsed.data,
          slots: parsed.slots,
          activeSlots: parsed.activeSlots,
        };
        populateCatalogImageCache(parsed.data, parsed.slots);
        updateLiveCatalog(parsed.data, parsed.slots, parsed.activeSlots);
      }
    }
  }
} catch {
  // Ignore parsing errors
}

/**
 * Preload all images associated with slotted products and variants into browser cache
 */
function preloadSlotImages(products: BackendCatalogProduct[], slots?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const urls: string[] = [];

  products.forEach((p) => {
    if (p.imageUrl) urls.push(resolveImageSource(p.imageUrl));
    p.variants?.forEach((v) => {
      if (v.imageUrl) urls.push(resolveImageSource(v.imageUrl));
    });
  });

  if (slots && typeof slots === 'object') {
    Object.values(slots).forEach((s: any) => {
      if (s?.imageUrl) urls.push(resolveImageSource(s.imageUrl));
      if (s?.selectedVariant?.imageUrl) urls.push(resolveImageSource(s.selectedVariant.imageUrl));
    });
  }

  urls.forEach((src) => {
    if (src && !src.startsWith('data:')) {
      const img = new Image();
      img.src = src;
    }
  });
}

/**
 * Preloads the storefront slot catalog immediately on page load.
 * Cached in memory and sessionStorage until a full page refresh.
 */
export async function preloadStoreCatalog(force = false): Promise<PublicCatalogResponse> {
  // If already cached in memory and not forced, return cached data immediately
  if (cachedCatalogResponse && !force && Object.keys(getLiveSets()).length > 0) {
    return cachedCatalogResponse;
  }

  if (inFlightPreloadPromise && !force) {
    return inFlightPreloadPromise;
  }

  inFlightPreloadPromise = (async () => {
    try {
      const response = await fetchPublicCatalogDetailed(force);
      const { data, slots, activeSlots } = response;

      if (Array.isArray(data) && data.length > 0) {
        cachedCatalogResponse = response;
        populateCatalogImageCache(data, slots);
        updateLiveCatalog(data, slots, activeSlots);

        // Persist to sessionStorage for instant synchronous recovery across transitions
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(
              SESSION_SLOT_CACHE_KEY,
              JSON.stringify({ data, slots, activeSlots, timestamp: Date.now() })
            );
          }
        } catch {
          // Ignore storage quota/permission issues
        }

        // Preload imagery into browser cache
        preloadSlotImages(data, slots);

        // Notify active hooks
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('catalog:updated'));
        }
      }

      return response;
    } catch (err) {
      console.warn('[Catalog] Preload error:', err);
      throw err;
    } finally {
      inFlightPreloadPromise = null;
    }
  })();

  return inFlightPreloadPromise;
}

export function useStoreCatalog(): UseStoreCatalogResult {
  // Synchronously initialize from live memory/sessionStorage (instantaneous render if cached)
  const [products, setProducts] = useState<BackendCatalogProduct[]>(() => getLiveProducts());
  const [sets, setSets] = useState<Record<string, SetProduct>>(() => getLiveSets());
  const [addons, setAddons] = useState<Record<string, AddonItem>>(() => getLiveAddons());

  const hasCachedData = Object.keys(getLiveSets()).length > 0;
  const [isLoading, setIsLoading] = useState<boolean>(!hasCachedData);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number>(hasCachedData ? Date.now() : 0);

  const refreshCatalog = useCallback(async (background = false) => {
    try {
      const currentSetsCount = Object.keys(getLiveSets()).length;
      if (!background && currentSetsCount === 0) {
        setIsLoading(true);
      }
      setError(null);

      const response = await preloadStoreCatalog(background ? false : false);
      const { data, slots, activeSlots } = response;

      if (Array.isArray(data) && data.length > 0) {
        populateCatalogImageCache(data, slots);
        setProducts(data);
        const updatedSets = updateLiveCatalog(data, slots, activeSlots);
        setSets(updatedSets);
        setAddons(getLiveAddons());
        lastFetchedRef.current = Date.now();
      }
    } catch (err: any) {
      console.warn('[Catalog] Could not refresh live catalog from server:', err);
      if (Object.keys(getLiveSets()).length === 0) {
        setError(err.message || 'Failed to refresh catalog');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentSetsCount = Object.keys(getLiveSets()).length;
    if (currentSetsCount === 0) {
      refreshCatalog(false);
    } else {
      setProducts(getLiveProducts());
      setSets(getLiveSets());
      setAddons(getLiveAddons());
      setIsLoading(false);
    }

    const handleUpdate = () => {
      setProducts(getLiveProducts());
      setSets(getLiveSets());
      setAddons(getLiveAddons());
      setIsLoading(false);
    };

    window.addEventListener('catalog:updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('catalog:updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshCatalog]);

  return {
    products,
    sets,
    addons,
    isLoading,
    error,
    refreshCatalog,
  };
}
