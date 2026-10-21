import { getPublicBaseUrl, extractResourceTag } from './api';

/**
 * Normalizes any QR identifier (token or tag number) into the canonical QR URL format:
 * `${baseUrl}/t/${cleanIdentifier}`
 *
 * Guaranteed:
 * - NEVER encodes /contact/ or /c/ in a QR code.
 * - Always targets the unified permanent tag resolver route (/t/:identifier).
 */
export function buildTagQrUrl(identifierOrUrl?: string | null): string {
  if (!identifierOrUrl || typeof identifierOrUrl !== 'string') return '';

  const raw = identifierOrUrl.trim();
  if (!raw) return '';

  const baseUrl = getPublicBaseUrl();

  // If a full URL was passed, extract the trailing identifier (e.g. from /t/xyz or /qr/xyz)
  let cleanId = raw;
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const parsed = new URL(raw);
      const segments = parsed.pathname.split('/').filter(Boolean);
      cleanId = segments[segments.length - 1] || '';
    }
  } catch {
    // If not a parseable URL, treat as raw identifier
  }

  // Strip leading prefixes if present
  cleanId = cleanId.replace(/^(\/?(t|qr|c|contact)\/)+/i, '').replace(/^\/+/, '');

  if (!cleanId) return '';

  return `${baseUrl}/t/${cleanId}`;
}

/**
 * Checks whether a given resource currently has an assigned physical or digital QR tag.
 */
export function hasResourceQrTag(resource: any): boolean {
  if (!resource) return false;
  const tag = extractResourceTag(resource);
  return Boolean(tag && tag.trim().length > 0);
}

/**
 * Resolves the QR scan URL for a given resource.
 *
 * CRITICAL RULE:
 * If the resource has an assigned QR tag, returns `${baseUrl}/t/${tag}`.
 * If the resource has NO QR tag, returns null.
 * NEVER falls back to the public contact link (/c/:token)!
 */
export function getResourceTagQrUrl(resource: any, explicitTag?: string): string | null {
  const tag = (explicitTag || extractResourceTag(resource) || '').trim();
  if (!tag) return null;
  return buildTagQrUrl(tag);
}
