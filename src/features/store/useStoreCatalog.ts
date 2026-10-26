import { useState, useEffect, useCallback } from 'react';
import { fetchPublicCatalogDetailed } from '../../services/checkout';
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
  refreshCatalog: () => Promise<void>;
}

export function useStoreCatalog(): UseStoreCatalogResult {
  const [products, setProducts] = useState<BackendCatalogProduct[]>([]);
  const [sets, setSets] = useState<Record<string, SetProduct>>({});
  const [addons, setAddons] = useState<Record<string, AddonItem>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCatalog = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, slots, activeSlots } = await fetchPublicCatalogDetailed();
      if (Array.isArray(data)) {
        setProducts(data);
        const updatedSets = updateLiveCatalog(data, slots, activeSlots);
        setSets(updatedSets);
        setAddons(getLiveAddons());
      }
    } catch (err: any) {
      console.warn('Could not fetch live catalog from server:', err);
      setError(err.message || 'Failed to refresh catalog');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();

    const handleUpdate = () => {
      refreshCatalog();
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
