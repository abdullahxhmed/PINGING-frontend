// src/lib/requestCache.ts
/**
 * Request Stabilizer: In-flight deduplication & TTL memory caching.
 * Prevents multiple components or concurrent route navigations from firing duplicate
 * HTTP requests to the backend, completely eliminating rate-limit spikes on mobile.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Deduplicates in-flight promises and optionally caches the result for ttlMs milliseconds.
 */
export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; force?: boolean } = {}
): Promise<T> {
  const { ttlMs = 0, force = false } = options;
  const now = Date.now();

  // 1. Check TTL memory cache if not forced
  if (!force && ttlMs > 0) {
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.data as T;
    }
  }

  // 2. Check if identical request is already in-flight across components
  const existingPromise = inFlightRequests.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  // 3. Initiate request with in-flight deduplication
  const promise = (async () => {
    try {
      const data = await fetcher();
      if (ttlMs > 0 && data !== undefined && data !== null) {
        memoryCache.set(key, {
          data,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Explicitly invalidate cached items matching a prefix or regex pattern.
 */
export function invalidateRequestCache(keyOrPattern?: string | RegExp): void {
  if (!keyOrPattern) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (typeof keyOrPattern === 'string') {
      if (key === keyOrPattern || key.startsWith(keyOrPattern)) {
        memoryCache.delete(key);
      }
    } else if (keyOrPattern.test(key)) {
      memoryCache.delete(key);
    }
  }
}
