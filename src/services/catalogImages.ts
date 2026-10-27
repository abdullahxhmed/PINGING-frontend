// src/services/catalogImages.ts
import type { CatalogImageUrlResponse, BackendCatalogProduct } from '../types/orders';
import { fetchPublicCatalogDetailed } from './checkout';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';
export const GCS_PUBLIC_BUCKET_URL = 'https://storage.googleapis.com/kauntact_product_images';

// In-memory cache for resolved image URLs with TTL
interface CachedImageUrl {
  url: string;
  expiresAt: number; // millisecond timestamp
}

const urlCache = new Map<string, CachedImageUrl>();

/**
 * Normalizes an image reference or relative storage path into a fully qualified URL.
 * Converts 'product_images/...' into the canonical GCS public bucket URL fallback.
 */
export function resolveImageSource(urlOrPath?: string | null): string {
  if (!urlOrPath) return '';
  const trimmed = urlOrPath.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('product_images/') || trimmed.startsWith('/product_images/')) {
    const cleanPath = trimmed.replace(/^\/+/, '');
    return `${GCS_PUBLIC_BUCKET_URL}/${cleanPath}`;
  }
  return trimmed;
}

/**
 * Strips transient Google Cloud Storage presigned query parameters, leaving
 * the stable canonical object reference or clean URL for long-lived storage.
 */
export function getStableObjectReference(urlOrPath?: string | null): string {
  if (!urlOrPath) return '';
  const trimmed = urlOrPath.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      if (
        parsed.searchParams.has('X-Goog-Algorithm') ||
        parsed.searchParams.has('X-Goog-Signature') ||
        parsed.searchParams.has('X-Goog-Date')
      ) {
        return `${parsed.origin}${parsed.pathname}`;
      }
      return trimmed;
    }
  } catch {
    // fallback to original trimmed string
  }
  return trimmed;
}

/**
 * Extracts expiration timestamp (in milliseconds) from a GCS V4 Signed URL or ISO string
 */
export function extractUrlExpiration(url: string, expiresAtIso?: string | null): number | null {
  if (expiresAtIso) {
    const parsed = Date.parse(expiresAtIso);
    if (!Number.isNaN(parsed)) return parsed;
  }

  try {
    const parsed = new URL(url);
    const googDate = parsed.searchParams.get('X-Goog-Date');
    const googExpires = parsed.searchParams.get('X-Goog-Expires');

    if (googDate && googExpires) {
      // Format: YYYYMMDDTHHMMSSZ (e.g. 20261026T140914Z)
      const year = parseInt(googDate.substring(0, 4), 10);
      const month = parseInt(googDate.substring(4, 6), 10) - 1;
      const day = parseInt(googDate.substring(6, 8), 10);
      const hour = parseInt(googDate.substring(9, 11), 10);
      const min = parseInt(googDate.substring(11, 13), 10);
      const sec = parseInt(googDate.substring(13, 15), 10);

      const startTime = Date.UTC(year, month, day, hour, min, sec);
      const durationSeconds = parseInt(googExpires, 10);

      return startTime + durationSeconds * 1000;
    }
  } catch {
    // If not a full URL or invalid
  }

  return null;
}

/**
 * Checks if a signed URL is expired or about to expire within bufferSeconds (default: 60s).
 * If the URL has no signing parameters, it is considered permanent/non-expiring (returns false).
 */
export function isUrlExpired(url?: string | null, bufferSeconds = 60): boolean {
  if (!url) return false;
  const expMs = extractUrlExpiration(url);
  if (!expMs) return false;
  return Date.now() + bufferSeconds * 1000 >= expMs;
}

/**
 * Populates the in-memory URL cache from catalog products and storefront slots.
 */
export function populateCatalogImageCache(
  products?: BackendCatalogProduct[],
  slots?: Record<string, any>
): void {
  const now = Date.now();

  const cacheEntry = (key: string, rawUrl?: string | null) => {
    if (!rawUrl) return;
    const resolved = resolveImageSource(rawUrl);
    const expMs = extractUrlExpiration(resolved) || now + 50 * 60 * 1000;
    urlCache.set(key, { url: resolved, expiresAt: expMs });
  };

  if (Array.isArray(products)) {
    for (const prod of products) {
      if (prod.imageUrl) {
        cacheEntry(`${prod.id}:default`, prod.imageUrl);
      }
      if (Array.isArray(prod.variants)) {
        for (const variant of prod.variants) {
          if (variant.imageUrl) {
            cacheEntry(`${variant.id}:default`, variant.imageUrl);
            const isDark = variant.name?.toLowerCase().includes('dark') || variant.sku?.toLowerCase().includes('drk');
            const isLight = variant.name?.toLowerCase().includes('light') || variant.sku?.toLowerCase().includes('lit');
            if (isDark) cacheEntry(`${prod.id}:dark`, variant.imageUrl);
            if (isLight) cacheEntry(`${prod.id}:light`, variant.imageUrl);
          }
        }
      }
    }
  }

  if (slots && typeof slots === 'object') {
    for (const [slotKey, slotData] of Object.entries(slots)) {
      if (!slotData) continue;
      const candidate = slotData.selectedVariant?.imageUrl || slotData.imageUrl;
      if (candidate) {
        cacheEntry(`${slotKey}:default`, candidate);
        if (slotData.id) cacheEntry(`${slotData.id}:default`, candidate);
        if (slotData.selectedVariantId) cacheEntry(`${slotData.selectedVariantId}:default`, candidate);
      }
    }
  }
}

/**
 * Calls backend image refresh endpoint or refetches public catalog data
 * to acquire fresh signed URLs without wiping already loaded UI.
 */
export async function fetchCatalogImageUrl(
  imageId: string,
  imageType: 'dark' | 'light' | 'default' = 'default'
): Promise<CatalogImageUrlResponse> {
  const cacheKey = `${imageId}:${imageType}`;
  const now = Date.now();

  const cached = urlCache.get(cacheKey);
  // Serve from cache if valid for at least 3 more minutes
  if (cached && cached.expiresAt - now > 3 * 60 * 1000) {
    return {
      url: cached.url,
      expiresAt: new Date(cached.expiresAt).toISOString(),
    };
  }

  // 1. Try single image endpoint: GET /api/catalog/images/:imageId/url
  try {
    const query = new URLSearchParams();
    if (imageType) {
      query.set('type', imageType);
    }

    const endpoint = `${BACKEND_URL}/api/catalog/images/${encodeURIComponent(imageId)}/url?${query.toString()}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const json: CatalogImageUrlResponse = await res.json();
      const resolved = resolveImageSource(json.url);
      const expiresAtMs = extractUrlExpiration(resolved, json.expiresAt) || now + 50 * 60 * 1000;

      urlCache.set(cacheKey, {
        url: resolved,
        expiresAt: expiresAtMs,
      });

      return {
        url: resolved,
        expiresAt: json.expiresAt,
      };
    }
  } catch {
    // Single image endpoint unavailable, proceed to catalog refetch
  }

  // 2. Fallback: Refetch catalog slots from server to get refreshed signed URLs
  try {
    const { data, slots } = await fetchPublicCatalogDetailed();
    populateCatalogImageCache(data, slots);

    // Broadcast refresh event so all active components sync their state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('catalog:updated'));
    }

    const recheck = urlCache.get(cacheKey);
    if (recheck && recheck.expiresAt - now > 60 * 1000) {
      return {
        url: recheck.url,
        expiresAt: new Date(recheck.expiresAt).toISOString(),
      };
    }
  } catch (catalogErr) {
    console.warn('[CatalogImages] Failed to refetch catalog for signed URL refresh:', catalogErr);
  }

  // If cached item exists even if expired, return it as last working fallback
  if (cached?.url) {
    return {
      url: cached.url,
      expiresAt: new Date(cached.expiresAt).toISOString(),
    };
  }

  throw new Error(`Failed to refresh catalog image for ${imageId}`);
}
