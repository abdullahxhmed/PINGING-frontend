import type { Resource, CallRecord, ResourceAnalyticsResponse } from '../types/api';

const RES_DETAIL_PREFIX = 'kauntact_res_detail_';
const RES_CALLS_PREFIX = 'kauntact_res_calls_';
const RES_ANALYTICS_PREFIX = 'kauntact_res_analytics_';
const RES_LIST_KEY = 'kauntact_resources_list';

let hasConsumedReload = false;

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
   * Caches resource details in localStorage and keeps the list cache synchronized.
   */
  setResource(id: string, resource: Resource): void {
    if (!id || !resource || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${RES_DETAIL_PREFIX}${id}`, JSON.stringify(resource));

      // Keep cached resource list synchronized without dropping items
      const list = this.getResourcesList();
      if (list) {
        let found = false;
        const next = list.map((r) => {
          if ((r.id || (r as any)._id) === id) {
            found = true;
            return { ...r, ...resource };
          }
          return r;
        });
        if (!found) {
          next.push(resource);
        }
        localStorage.setItem(RES_LIST_KEY, JSON.stringify(next));
      }
    } catch (err) {
      console.warn('Failed to cache resource details', err);
    }
  },

  /**
   * Updates pause state for a resource across both individual detail and list caches.
   */
  updateResourcePauseState(id: string, isPaused: boolean): void {
    if (!id || typeof window === 'undefined') return;
    try {
      const now = isPaused ? new Date().toISOString() : null;

      // 1. Update individual detail cache
      const detail = this.getResource(id);
      if (detail) {
        detail.isPaused = isPaused;
        detail.pausedAt = now;
        if (detail.qrTag) {
          detail.qrTag.isPaused = isPaused;
          detail.qrTag.pausedAt = now;
        }
        localStorage.setItem(`${RES_DETAIL_PREFIX}${id}`, JSON.stringify(detail));
      }

      // 2. Update resource in list cache (CRITICAL: preserve resource in list)
      const list = this.getResourcesList();
      if (list) {
        const next = list.map((r) => {
          if ((r.id || (r as any)._id) === id) {
            const updated = {
              ...r,
              isPaused,
              pausedAt: now,
            };
            if (updated.qrTag) {
              updated.qrTag = {
                ...updated.qrTag,
                isPaused,
                pausedAt: now,
              };
            }
            return updated;
          }
          return r;
        });
        localStorage.setItem(RES_LIST_KEY, JSON.stringify(next));
      }
    } catch (err) {
      console.warn('Failed to update resource pause state in cache', err);
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
   * Retrieves cached analytics for a resource.
   */
  getAnalytics(id: string): ResourceAnalyticsResponse | null {
    if (!id || typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(`${RES_ANALYTICS_PREFIX}${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Caches analytics for a resource.
   */
  setAnalytics(id: string, analytics: ResourceAnalyticsResponse): void {
    if (!id || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${RES_ANALYTICS_PREFIX}${id}`, JSON.stringify(analytics));
    } catch {
      // Ignore quota errors
    }
  },

  /**
   * Removes cached resource detail, calls, and analytics from localStorage.
   */
  removeResource(id: string): void {
    if (!id || typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${RES_DETAIL_PREFIX}${id}`);
      localStorage.removeItem(`${RES_CALLS_PREFIX}${id}`);
      localStorage.removeItem(`${RES_ANALYTICS_PREFIX}${id}`);

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
   * Caches the resources list in localStorage and primes individual resource detail and calls caches.
   */
  setResourcesList(list: Resource[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(RES_LIST_KEY, JSON.stringify(list));
      // Pre-seed individual detail and calls caches so clicking any resource opens instantaneously
      list.forEach((res) => {
        const resId = res.id || (res as any)._id;
        if (resId) {
          if (!localStorage.getItem(`${RES_DETAIL_PREFIX}${resId}`)) {
            localStorage.setItem(`${RES_DETAIL_PREFIX}${resId}`, JSON.stringify(res));
          }
          if (Array.isArray(res.recentCalls) && !localStorage.getItem(`${RES_CALLS_PREFIX}${resId}`)) {
            localStorage.setItem(`${RES_CALLS_PREFIX}${resId}`, JSON.stringify(res.recentCalls));
          } else if (Array.isArray(res.calls) && !localStorage.getItem(`${RES_CALLS_PREFIX}${resId}`)) {
            localStorage.setItem(`${RES_CALLS_PREFIX}${resId}`, JSON.stringify(res.calls));
          }
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
    if (hasConsumedReload) return false;
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

  /**
   * Marks the current page reload as consumed so subsequent in-app route changes do not re-trigger reload behavior.
   */
  consumeReload(): void {
    hasConsumedReload = true;
  },
};
