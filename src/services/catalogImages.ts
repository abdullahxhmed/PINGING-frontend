// src/services/catalogImages.ts
import type { CatalogImageUrlResponse } from '../types/orders';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

// In-memory cache for resolved image URLs with TTL
interface CachedImageUrl {
  url: string;
  expiresAt: number; // millisecond timestamp
}

const urlCache = new Map<string, CachedImageUrl>();

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
      // Format: 20261026T140914Z
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
 * Calls backend endpoint: GET /api/catalog/images/:imageId/url?type=dark|light|default
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

  const query = new URLSearchParams();
  if (imageType) {
    query.set('type', imageType);
  }

  const endpoint = `${BACKEND_URL}/api/catalog/images/${encodeURIComponent(imageId)}/url?${query.toString()}`;

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh catalog image: HTTP ${res.status}`);
  }

  const json: CatalogImageUrlResponse = await res.json();
  const expiresAtMs = extractUrlExpiration(json.url, json.expiresAt) || now + 50 * 60 * 1000;

  urlCache.set(cacheKey, {
    url: json.url,
    expiresAt: expiresAtMs,
  });

  return json;
}
