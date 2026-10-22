import type { Resource, CallRecord } from '../types/api';

const RES_DETAIL_PREFIX = 'kauntact_res_detail_';
const RES_CALLS_PREFIX = 'kauntact_res_calls_';
const RES_LIST_KEY = 'kauntact_resources_list';

export const resourceCache = {
  /**
   * Retrieves cached resource details for a specific resource ID from localStorage.
   */
  getResource(id: string): Resource | null {
    if (!id || typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(`${RES_DETAIL_PREFIX}${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Caches resource details in localStorage.
   */
  setResource(id: string, resource: Resource): void {
    if (!id || !resource || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${RES_DETAIL_PREFIX}${id}`, JSON.stringify(resource));
    } catch (err) {
      console.warn('Failed to cache resource details', err);
    }
  },

  /**
   * Retrieves cached call history records for a resource.
   */
  getCalls(id: string): CallRecord[] | null {
    if (!id || typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(`${RES_CALLS_PREFIX}${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Caches call records for a resource.
   */
  setCalls(id: string, calls: CallRecord[]): void {
    if (!id || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${RES_CALLS_PREFIX}${id}`, JSON.stringify(calls));
    } catch {
      // Ignore quota errors
    }
  },

  /**
   * Removes cached resource detail and calls from localStorage.
   */
  removeResource(id: string): void {
    if (!id || typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${RES_DETAIL_PREFIX}${id}`);
      localStorage.removeItem(`${RES_CALLS_PREFIX}${id}`);

      // Also update cached resource list if present
      const list = this.getResourcesList();
      if (list) {
        const next = list.filter((r) => (r.id || (r as any)._id) !== id);
        this.setResourcesList(next);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Retrieves cached resources list for the dashboard.
   */
  getResourcesList(): Resource[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(RES_LIST_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Caches the resources list in localStorage and primes individual resource detail caches.
   */
  setResourcesList(list: Resource[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(RES_LIST_KEY, JSON.stringify(list));
      // Pre-seed individual detail caches so clicking any resource opens instantaneously
      list.forEach((res) => {
        const resId = res.id || (res as any)._id;
        if (resId && !localStorage.getItem(`${RES_DETAIL_PREFIX}${resId}`)) {
          localStorage.setItem(`${RES_DETAIL_PREFIX}${resId}`, JSON.stringify(res));
        }
      });
    } catch {
      // Ignore
    }
  },

  /**
   * Invalidates cached resources list so next query fetches fresh server state.
   */
  invalidate(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(RES_LIST_KEY);
    } catch {
      // Ignore
    }
  },

  /**
   * Detects whether the current page load is a browser reload/refresh (e.g. F5 or refresh button).
   */
  isPageReload(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const navEntry = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
      if (navEntry) {
        return navEntry.type === 'reload';
      }
      return (performance as any)?.navigation?.type === 1;
    } catch {
      return false;
    }
  },
};
