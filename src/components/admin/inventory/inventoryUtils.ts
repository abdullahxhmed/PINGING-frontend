import type { TagStockState } from '../../../types/admin';

export const DEFAULT_REORDER_THRESHOLD = 10;
const THRESHOLDS_STORAGE_KEY = 'kauntact_sku_reorder_thresholds';

/**
 * Get the configured reorder threshold for a SKU (default: 10)
 */
export function getReorderThreshold(sku: string): number {
  if (typeof window === 'undefined') return DEFAULT_REORDER_THRESHOLD;
  try {
    const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (!raw) return DEFAULT_REORDER_THRESHOLD;
    const parsed = JSON.parse(raw);
    const val = Number(parsed[sku]);
    return Number.isFinite(val) && val >= 0 ? val : DEFAULT_REORDER_THRESHOLD;
  } catch {
    return DEFAULT_REORDER_THRESHOLD;
  }
}

/**
 * Persist an updated reorder threshold for a SKU
 */
export function setReorderThreshold(sku: string, threshold: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[sku] = Math.max(0, Math.floor(threshold));
    localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('inventory:threshold-updated', { detail: { sku, threshold } }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Evaluates stock health chip.
 * NO "OK" chip is shown for normal states. Only exceptions: LOW or OUT.
 */
export function getHealthStatus(
  sellableStock: number,
  reorderThreshold: number,
  isLegacy = false
): { status: 'OK' | 'LOW' | 'OUT' | 'LEGACY'; label?: string; dotClass: string } {
  if (isLegacy) {
    return { status: 'LEGACY', label: 'LEGACY', dotClass: 'bg-muted/60' };
  }
  if (sellableStock <= 0) {
    return { status: 'OUT', label: 'OUT', dotClass: 'bg-red-500' };
  }
  if (sellableStock <= reorderThreshold) {
    return { status: 'LOW', label: 'LOW', dotClass: 'bg-amber-500' };
  }
  return { status: 'OK', dotClass: 'bg-emerald-500' };
}

export interface ParsedProductItem {
  category: string;
  categoryLabel: string;
  variant: string;
  humanTitle: string;
  isLegacy: boolean;
  sku: string;
}

/**
 * Parse an inventory SKU into structured grouping and human labels
 */
export function parseSkuDetails(sku: string, catalogName?: string): ParsedProductItem {
  const upper = sku.toUpperCase();

  // Legacy detection
  if (upper === 'TAG-VEHICLE-STICKER') {
    return {
      category: 'LEGACY',
      categoryLabel: 'Legacy & unmapped tags',
      variant: 'Legacy',
      humanTitle: 'Vehicle sticker · Legacy',
      isLegacy: true,
      sku,
    };
  }
  if (upper === 'TAG-KEYCHAIN') {
    return {
      category: 'LEGACY',
      categoryLabel: 'Legacy & unmapped tags',
      variant: 'Legacy',
      humanTitle: 'Keychain tag · Legacy',
      isLegacy: true,
      sku,
    };
  }
  if (upper === 'TAG-MINI-STICKER') {
    return {
      category: 'LEGACY',
      categoryLabel: 'Legacy & unmapped tags',
      variant: 'Legacy',
      humanTitle: 'Mini sticker · Legacy',
      isLegacy: true,
      sku,
    };
  }

  // Modern structured SKUs
  if (upper.startsWith('KT-VS')) {
    const isDark = upper.includes('DRK');
    const isLit = upper.includes('LIT');
    const variant = isDark ? 'Dark' : isLit ? 'Light' : 'Standard';
    return {
      category: 'VEHICLE_STICKER',
      categoryLabel: 'Vehicle stickers',
      variant,
      humanTitle: `Vehicle sticker · ${variant}`,
      isLegacy: false,
      sku,
    };
  }

  if (upper.startsWith('KT-KC')) {
    const isDark = upper.includes('DRK');
    const isLit = upper.includes('LIT');
    const variant = isDark ? 'Dark' : isLit ? 'Light' : 'Standard';
    return {
      category: 'KEYCHAIN',
      categoryLabel: 'Keychains',
      variant,
      humanTitle: `Keychain tag · ${variant}`,
      isLegacy: false,
      sku,
    };
  }

  if (upper.startsWith('KT-MS')) {
    const isDark = upper.includes('DRK');
    const isLit = upper.includes('LIT');
    const variant = isDark ? 'Dark' : isLit ? 'Light' : 'Standard';
    return {
      category: 'MINI_STICKER',
      categoryLabel: 'Mini stickers',
      variant,
      humanTitle: `Mini sticker · ${variant}`,
      isLegacy: false,
      sku,
    };
  }

  if (catalogName) {
    return {
      category: 'OTHER',
      categoryLabel: 'Other products',
      variant: 'Standard',
      humanTitle: catalogName,
      isLegacy: false,
      sku,
    };
  }

  return {
    category: 'UNMAPPED',
    categoryLabel: 'Unmapped tags',
    variant: 'Unmapped',
    humanTitle: sku,
    isLegacy: true,
    sku,
  };
}

/**
 * 1:1 Tag Stock State label and typography (Quiet, dot + text, no colored pill badges)
 */
export interface TagStateMeta {
  state: TagStockState;
  label: string;
  dotClass: string;
  isDanger?: boolean;
}

export const TAG_STATE_MAP: Record<TagStockState, TagStateMeta> = {
  IN_STOCK: {
    state: 'IN_STOCK',
    label: 'In stock',
    dotClass: 'bg-emerald-500',
  },
  RESERVED: {
    state: 'RESERVED',
    label: 'In cart hold',
    dotClass: 'bg-blue-500',
  },
  ALLOCATED_TO_ORDER: {
    state: 'ALLOCATED_TO_ORDER',
    label: 'Assigned to order',
    dotClass: 'bg-blue-500',
  },
  GENERATED: {
    state: 'GENERATED',
    label: 'Waiting to print',
    dotClass: 'bg-amber-500',
  },
  SENT_TO_PRINT: {
    state: 'SENT_TO_PRINT',
    label: 'At printer',
    dotClass: 'bg-amber-500',
  },
  DISPATCHED: {
    state: 'DISPATCHED',
    label: 'Shipped',
    dotClass: 'bg-sky-400',
  },
  DELIVERED: {
    state: 'DELIVERED',
    label: 'Delivered',
    dotClass: 'bg-emerald-600',
  },
  DAMAGED: {
    state: 'DAMAGED',
    label: 'Damaged',
    dotClass: 'bg-red-500',
    isDanger: true,
  },
  RETURNED_TO_STOCK: {
    state: 'RETURNED_TO_STOCK',
    label: 'Returned to stock',
    dotClass: 'bg-emerald-500',
  },
};

/**
 * Map store customer names to internal bundles
 */
export function getStoreBundleName(productName: string, variantName?: string, sku?: string): string {
  const normProd = productName.toLowerCase();
  const normSku = (sku || '').toLowerCase();

  let storeTitle = productName;
  if (normProd.includes('curated') || normSku.includes('cur') || normSku.includes('complete')) {
    storeTitle = 'Complete set';
  } else if (normProd.includes('essential') || normSku.includes('ess') || normSku.includes('pair')) {
    storeTitle = 'Pair';
  }

  const vNorm = (variantName || '').toLowerCase();
  const tone = vNorm.includes('dark') || normSku.includes('drk')
    ? 'Dark'
    : vNorm.includes('light') || normSku.includes('lit')
    ? 'Light'
    : variantName && variantName !== 'Standard Pack' && variantName !== 'Standard'
    ? variantName
    : '';

  return tone ? `${storeTitle} · ${tone}` : storeTitle;
}

/**
 * Format relative time (e.g. "2h ago", "yesterday", "12m ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return 'recently';
  }
}

/**
 * Format full exact date & time for hover / popover
 */
export function formatExactTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Copy helper
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback
  }
  return false;
}
