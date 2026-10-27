import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPublicCatalogDetailed } from '../../services/checkout';
import { populateCatalogImageCache } from '../../services/catalogImages';
import {
  type SetProduct,
  type AddonItem,
  getLiveAddons,
  updateLiveCatalog,
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

export function useStoreCatalog(): UseStoreCatalogResult {
  const [products, setProducts] = useState<BackendCatalogProduct[]>([]);
  const [sets, setSets] = useState<Record<string, SetProduct>>({});
  const [addons, setAddons] = useState<Record<string, AddonItem>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number>(0);

  const refreshCatalog = useCallback(async (background = false) => {
    try {
      if (!background) {
        setIsLoading(true);
      }
      setError(null);
      const { data, slots, activeSlots } = await fetchPublicCatalogDetailed();
      if (Array.isArray(data)) {
        populateCatalogImageCache(data, slots);
        setProducts(data);
        const updatedSets = updateLiveCatalog(data, slots, activeSlots);
        setSets(updatedSets);
        setAddons(getLiveAddons());
        lastFetchedRef.current = Date.now();
      }
    } catch (err: any) {
      console.warn('[Catalog] Could not refresh live catalog from server:', err);
      setError(err.message || 'Failed to refresh catalog');
      // Intentionally preserve existing products, sets, and addons so UI never flashes blank
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshCatalog(false);

    const handleUpdate = () => {
      refreshCatalog(true);
    };

    // Re-check catalog when user returns to tab (e.g. after backgrounding phone or switching tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchedRef.current;
        // Refresh silently if away for more than 10 minutes
        if (timeSinceLastFetch > 10 * 60 * 1000) {
          refreshCatalog(true);
        }
      }
    };

    window.addEventListener('catalog:updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('catalog:updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
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
