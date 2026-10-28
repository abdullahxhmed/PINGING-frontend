import type { BackendCatalogProduct, BackendCatalogVariantComponent } from '../../types/orders';
import {
  resolveImageSource,
  getStableObjectReference,
  isUrlExpired,
} from '../../services/catalogImages';

export const DEFAULT_PRODUCT_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22225%22%20viewBox%3D%220%200%20400%20225%22%20fill%3D%22none%22%3E%3Crect%20width%3D%22400%22%20height%3D%22225%22%20fill%3D%22%231c1c1a%22%2F%3E%3Crect%20x%3D%22170%22%20y%3D%2270%22%20width%3D%2260%22%20height%3D%2260%22%20rx%3D%226%22%20stroke%3D%22%23444440%22%20stroke-width%3D%221.5%22%20stroke-dasharray%3D%224%204%22%2F%3E%3Cpath%20d%3D%22M190%20100h20M200%2090v20%22%20stroke%3D%22%23666660%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%22155%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888880%22%20font-family%3D%22monospace%22%20font-size%3D%2211%22%3ENo%20Artwork%20Configured%3C%2Ftext%3E%3C%2Fsvg%3E";

export interface SetProduct {
  id: string;
  name: string;
  tagline: string;
  price: number;
  shippingFee: number;
  featured?: boolean;
  image: string;
  images: {
    dark: string;
    light: string;
  };
  contents: string[];
  tagsCount: number;
  plusMonths: number;
  details: {
    origin: string;
    shipping: string;
    description: string;
    features: string[];
  };
  variantId?: string;
  productId?: string;
  sku?: string;
  inStock?: boolean;
  availableQuantity?: number;
}

export const SETS: Record<string, SetProduct> = {};

export const PRIMARY_PACK_IDS = ['essential', 'curated-kit'] as const;
export type PrimaryPackId = typeof PRIMARY_PACK_IDS[number];

export interface AddonItem {
  id: string;
  name: string;
  subtitle: string;
  tone: 'dark' | 'light';
  swatchHex: string;
  swatchBorderHex?: string;
  price: number;
  image: string;
  tagsCount: number;
  productId?: string;
  variantId?: string;
  sku?: string;
  inStock?: boolean;
}

export const ADDONS: Record<string, AddonItem> = {};

// In-memory live references for dynamic updates (strictly populated from backend)
let liveSets: Record<string, SetProduct> = {};
let liveAddons: Record<string, AddonItem> = {};
let liveProducts: BackendCatalogProduct[] = [];

/**
 * Helper to count serialized physical QR tags from product components
 */
function extractTagCount(components?: BackendCatalogVariantComponent[] | string): number {
  if (!components) return 0;
  const list: BackendCatalogVariantComponent[] =
    typeof components === 'string'
      ? (() => {
          try {
            return JSON.parse(components);
          } catch {
            return [];
          }
        })()
      : components;

  return list
    .filter((c) => c.componentType === 'SERIALIZED_QR_TAG')
    .reduce((sum, c) => sum + (c.quantity || 1), 0);
}

/**
 * Helper to extract plus duration months
 */
function extractPlusMonths(components?: BackendCatalogVariantComponent[] | string): number {
  if (!components) return 0;
  const list: BackendCatalogVariantComponent[] =
    typeof components === 'string'
      ? (() => {
          try {
            return JSON.parse(components);
          } catch {
            return [];
          }
        })()
      : components;

  return list
    .filter((c) => c.componentType === 'DIGITAL_ENTITLEMENT')
    .reduce((max, c) => Math.max(max, c.plusDurationMonths || 12), 0);
}

function buildDynamicSetProduct(
  prod: BackendCatalogProduct,
  variant: any
): SetProduct {
  const priceInRupees = Math.round((variant?.price ?? prod.basePrice) / 100);
  const tagCount = extractTagCount(variant?.components) || prod.tagsCount || 1;
  const plusMonths = extractPlusMonths(variant?.components) || prod.plusMonths || 12;
  const inStock = variant?.inStock ?? prod.inStock ?? true;
  const availableQuantity = variant?.availableQuantity ?? (inStock ? 99 : 0);

  // Derive contents purely from variant components or fallback to product description
  let contents: string[] = [];
  if (variant?.components) {
    const list =
      typeof variant.components === 'string'
        ? (() => {
            try {
              return JSON.parse(variant.components);
            } catch {
              return [];
            }
          })()
        : variant.components;

    if (Array.isArray(list) && list.length > 0) {
      contents = list
        .filter((c: any) => c.componentType !== 'BULK_STOCK')
        .map((c: any) => {
          if (c.componentType === 'DIGITAL_ENTITLEMENT') {
            return `Includes ${c.plusDurationMonths || 12} months of Plus`;
          }
          return `${c.quantity || 1}x ${c.name || 'QR Tag'}`;
        });
    }
  }

  if (contents.length === 0 && prod.description) {
    contents = [prod.description];
  }

  // Variant-first image resolution: variant image is authoritative, fallback to product image
  const darkVariant = prod.variants?.find(
    (v) => v.name?.toLowerCase().includes('dark') || v.sku?.toLowerCase().includes('drk')
  );
  const lightVariant = prod.variants?.find(
    (v) => v.name?.toLowerCase().includes('light') || v.sku?.toLowerCase().includes('lit')
  );

  const darkImg =
    resolveImageSource(darkVariant?.imageUrl || variant?.imageUrl || prod.imageUrl) ||
    DEFAULT_PRODUCT_IMAGE;

  const lightImg =
    resolveImageSource(lightVariant?.imageUrl || variant?.imageUrl || prod.imageUrl) ||
    DEFAULT_PRODUCT_IMAGE;

  return {
    id: prod.id,
    name: prod.name,
    tagline: prod.description || `${prod.name} (${prod.sku})`,
    price: priceInRupees,
    shippingFee: priceInRupees >= 400 ? 0 : 49,
    featured: Boolean(prod.isFeatured),
    image: darkImg,
    images: {
      dark: darkImg,
      light: lightImg,
    },
    contents,
    tagsCount: tagCount,
    plusMonths: plusMonths,
    details: {
      origin: 'Ships from Hyderabad via express courier.',
      shipping: 'Dispatches within 24–48 hours from Hyderabad. Delivery calculated at checkout.',
      description: prod.description || `${prod.name} with complete Kauntact QR integration.`,
      features: [
        'Weather-sealed finishes for long exterior durability',
        'Direct caller voice relay without revealing your personal number',
        `Includes ${plusMonths} months of Plus subscription service`,
        'Private masked calls and instant digital emergency alerts',
      ],
    },
    variantId: variant?.id,
    productId: prod.id,
    sku: variant?.sku || prod.sku,
    inStock,
    availableQuantity,
  };
}

let livePrimaryPacks: SetProduct[] = [];

/**
 * Transforms backend products (from GET /api/catalog) into dynamic SetProduct items.
 * Strictly driven by backend catalog products and slot configuration.
 */
export function hydrateSetsFromBackend(
  products: BackendCatalogProduct[],
  slots?: Record<string, BackendCatalogProduct>,
  activeSlots?: any[]
): Record<string, SetProduct> {
  const result: Record<string, SetProduct> = {};

  if (!Array.isArray(products) || products.length === 0) {
    liveSets = {};
    livePrimaryPacks = [];
    return {};
  }

  // 1. Build and index all products so product ID, slug, cart IDs and checkout mapping always resolve
  const productMap = new Map<string, BackendCatalogProduct>();
  products.forEach((prod) => {
    productMap.set(prod.id, prod);
    const variant = prod.variants?.[0];
    const pack = buildDynamicSetProduct(prod, variant);
    result[prod.id] = pack;
    if (prod.slug) {
      result[prod.slug] = pack;
    }
  });

  const packsList: SetProduct[] = [];

  // 2. If backend storefront slots are provided, slotted bundle packs take priority
  if (slots && typeof slots === 'object' && Object.keys(slots).length > 0) {
    let packPrefixes: string[] = [];

    if (Array.isArray(activeSlots) && activeSlots.length > 0) {
      const bundleSlots = activeSlots
        .filter(
          (s: any) =>
            (s.slotType === 'BUNDLE' ||
              s.slotKey.startsWith('bundle') ||
              s.slotKey.startsWith('section_1_pack')) &&
            s.active !== false
        )
        .sort((a: any, b: any) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

      packPrefixes = Array.from(
        new Set(
          bundleSlots.map((s: any) => s.slotKey.replace(/(_dark|_light|_drk|_lit)$/i, ''))
        )
      );
    } else {
      const bundleSlotKeys = Object.keys(slots)
        .filter((k) => k.startsWith('bundle') || k.startsWith('section_1_pack'))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
          const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
          return numA - numB;
        });

      packPrefixes = Array.from(
        new Set(
          bundleSlotKeys.map((k) => k.replace(/(_dark|_light|_drk|_lit)$/i, ''))
        )
      );
    }

    packPrefixes.forEach((prefix) => {
      const darkKey = `${prefix}_dark`;
      const lightKey = `${prefix}_light`;

      const darkSlotProd = slots[darkKey];
      const lightSlotProd = slots[lightKey];
      const baseSlotProd = slots[prefix];

      const darkCandidate =
        darkSlotProd ||
        (baseSlotProd?.sku?.toLowerCase().includes('drk') || baseSlotProd?.name?.toLowerCase().includes('dark')
          ? baseSlotProd
          : null);

      const lightCandidate =
        lightSlotProd ||
        (baseSlotProd?.sku?.toLowerCase().includes('drk') || baseSlotProd?.name?.toLowerCase().includes('dark')
          ? null
          : baseSlotProd);

      // Prefer light candidate for default storefront preview presentation
      const primaryCandidate = lightCandidate || darkCandidate || baseSlotProd;
      if (!primaryCandidate) return;

      const matchedPrimary = productMap.get(primaryCandidate.id) || primaryCandidate;
      const matchedDark = darkCandidate ? (productMap.get(darkCandidate.id) || darkCandidate) : null;
      const matchedLight = lightCandidate ? (productMap.get(lightCandidate.id) || lightCandidate) : null;

      const pack = buildDynamicSetProduct(matchedPrimary, matchedPrimary.variants?.[0]);

      if (matchedDark?.imageUrl) {
        pack.images.dark = resolveImageSource(matchedDark.imageUrl);
      }
      if (matchedLight?.imageUrl) {
        pack.images.light = resolveImageSource(matchedLight.imageUrl);
      }

      // Clean display name if it had 'Light' or 'Dark' suffix
      const cleanName = matchedPrimary.name.replace(/\s+(light|dark)(\s+kit|\s+pack)?/i, '').trim();
      if (cleanName) {
        pack.name = cleanName;
      }

      // Attach finish product IDs and exact variant IDs for finish-accurate checkout
      const resolveVariantForProduct = (prod?: BackendCatalogProduct | null, tone?: 'dark' | 'light') => {
        if (!prod || !prod.variants || prod.variants.length === 0) return undefined;
        if (tone === 'dark') {
          const darkV = prod.variants.find(
            (v) => v.name?.toLowerCase().includes('dark') || v.sku?.toLowerCase().includes('drk')
          );
          if (darkV) return darkV.id;
        } else if (tone === 'light') {
          const lightV = prod.variants.find(
            (v) => v.name?.toLowerCase().includes('light') || v.sku?.toLowerCase().includes('lit')
          );
          if (lightV) return lightV.id;
        }
        return prod.variants[0]?.id;
      };

      (pack as any).finishProducts = {
        dark: matchedDark?.id || matchedPrimary.id,
        light: matchedLight?.id || matchedPrimary.id,
      };

      (pack as any).finishVariants = {
        dark:
          resolveVariantForProduct(matchedDark, 'dark') ||
          resolveVariantForProduct(matchedPrimary, 'dark') ||
          pack.variantId,
        light:
          resolveVariantForProduct(matchedLight, 'light') ||
          resolveVariantForProduct(matchedPrimary, 'light') ||
          pack.variantId,
      };

      result[pack.id] = pack;
      if (matchedPrimary.slug) {
        result[matchedPrimary.slug] = pack;
      }
      if (matchedDark?.id) {
        result[matchedDark.id] = pack;
      }
      if (matchedLight?.id) {
        result[matchedLight.id] = pack;
      }

      packsList.push(pack);
    });
  }

  // Fallback: active physical packs ordered by displayOrder if no bundle slots matched
  if (packsList.length === 0) {
    const activePhysicalPacks = products
      .filter((p) => p.active !== false && (p.type === 'PHYSICAL_TAG_PACK' || p.type === 'COMBO_PACK'))
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

    activePhysicalPacks.forEach((prod) => {
      const variant = prod.variants?.[0];
      const pack = buildDynamicSetProduct(prod, variant);
      packsList.push(pack);
    });
  }

  liveSets = result;
  livePrimaryPacks = packsList;
  return result;
}

/**
 * Returns the primary packs for storefront display directly from active backend physical tag packs.
 */
export function getPrimaryPacks(setsCatalog?: Record<string, SetProduct>): SetProduct[] {
  if (livePrimaryPacks && livePrimaryPacks.length > 0) {
    return livePrimaryPacks;
  }
  const currentSets = setsCatalog || liveSets;
  const packs: SetProduct[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(currentSets)) {
    const item = currentSets[key];
    const uniqueId = item?.productId || item?.id;
    if (item && uniqueId && !seen.has(uniqueId)) {
      seen.add(uniqueId);
      packs.push(item);
    }
  }
  return packs;
}

/**
 * Hydrates add-ons dynamically from catalog products and configured storefront slots.
 * Slotted items in activeSlots take full precedence to match the admin configurator layout exactly.
 */
export function hydrateAddonsFromBackend(
  products: BackendCatalogProduct[],
  slots?: Record<string, any>,
  activeSlots?: any[]
): Record<string, AddonItem> {
  const result: Record<string, AddonItem> = {};

  if (!Array.isArray(products) || products.length === 0) {
    liveAddons = {};
    return {};
  }

  // 1. If storefront slots are available, prioritize slotted individual items
  const indSlots = (activeSlots || [])
    .filter(
      (s: any) =>
        (s.slotType === 'INDIVIDUAL' || s.slotKey.startsWith('individual')) &&
        s.active !== false &&
        s.productId &&
        slots?.[s.slotKey]
    )
    .sort((a: any, b: any) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  if (indSlots.length > 0) {
    for (const s of indSlots) {
      const slotted = slots![s.slotKey];
      const boundVariant =
        s.variant ||
        slotted.selectedVariant ||
        slotted.variants?.find((v: any) => v.id === s.variantId);
      const variantKey = s.variantId || boundVariant?.id || slotted.id;

      const priceInPaise = boundVariant?.price ?? slotted.basePrice ?? 9900;
      const priceInRupees = Math.round(priceInPaise / 100);
      const inStock = boundVariant?.inStock ?? slotted.inStock ?? true;
      const tagCount = extractTagCount(boundVariant?.components) || slotted.tagsCount || 1;
      const candidateImg = slotted.selectedVariant?.imageUrl || slotted.imageUrl || boundVariant?.imageUrl;
      const resolvedVariantImg = resolveImageSource(candidateImg);
      const variantImg = resolvedVariantImg || DEFAULT_PRODUCT_IMAGE;

      const rawName = boundVariant?.name
        ? `${slotted.name.replace(/\s*\([^)]*\)/g, '').trim()} (${boundVariant.name})`
        : slotted.name;

      const isLight =
        rawName.toLowerCase().includes('light') ||
        (boundVariant?.sku && boundVariant.sku.toLowerCase().includes('lit')) ||
        (slotted.sku && slotted.sku.toLowerCase().includes('lit'));
      const tone: 'dark' | 'light' = isLight ? 'light' : 'dark';

      result[variantKey] = {
        id: variantKey,
        name: rawName,
        subtitle: boundVariant?.name ? `${boundVariant.name} finish` : slotted.description || rawName,
        tone,
        swatchHex: tone === 'light' ? '#edece6' : '#151513',
        swatchBorderHex: tone === 'light' ? '#aaa79c' : undefined,
        price: priceInRupees,
        image: variantImg,
        tagsCount: tagCount,
        productId: slotted.productId || slotted.id,
        variantId: s.variantId || boundVariant?.id,
        sku: boundVariant?.sku || slotted.sku,
        inStock,
      };
    }

    liveAddons = result;
    return result;
  }

  // Fallback: standard unslotted hydration across all active non-bundle products
  for (const prod of products) {
    if (prod.active === false) continue;
    if (prod.type === 'PHYSICAL_TAG_PACK' || prod.type === 'COMBO_PACK') continue;

    const variants = prod.variants && prod.variants.length > 0 ? prod.variants : [undefined];

    for (const variant of variants) {
      const variantKey = variant ? variant.id : prod.id;
      const priceInPaise = variant?.price ?? prod.basePrice;
      const priceInRupees = Math.round(priceInPaise / 100);
      const inStock = variant?.inStock ?? prod.inStock ?? true;
      const tagCount = extractTagCount(variant?.components) || prod.tagsCount || 1;
      const variantImg = variant?.imageUrl || prod.imageUrl || DEFAULT_PRODUCT_IMAGE;

      const isLight =
        variant?.name?.toLowerCase().includes('light') ||
        variant?.sku?.toLowerCase().includes('lit') ||
        variant?.sku?.toLowerCase().includes('light');
      const tone: 'dark' | 'light' = isLight ? 'light' : 'dark';

      const displayName =
        variants.length > 1 && variant?.name
          ? `${prod.name} (${variant.name})`
          : prod.name;
      const displaySubtitle =
        variants.length > 1 && variant?.name
          ? `${variant.name} finish`
          : prod.description || prod.name;

      result[variantKey] = {
        id: variantKey,
        name: displayName,
        subtitle: displaySubtitle,
        tone,
        swatchHex: tone === 'light' ? '#edece6' : '#151513',
        swatchBorderHex: tone === 'light' ? '#aaa79c' : undefined,
        price: priceInRupees,
        image: variantImg,
        tagsCount: tagCount,
        productId: prod.id,
        variantId: variant?.id,
        sku: variant?.sku || prod.sku,
        inStock,
      };
    }
  }

  liveAddons = result;
  return result;
}

export function updateLiveCatalog(
  products: BackendCatalogProduct[],
  slots?: Record<string, BackendCatalogProduct>,
  activeSlots?: any[]
): Record<string, SetProduct> {
  liveProducts = Array.isArray(products) ? products : [];
  hydrateAddonsFromBackend(products, slots, activeSlots);
  return hydrateSetsFromBackend(products, slots, activeSlots);
}

export function getLiveSets(): Record<string, SetProduct> {
  return liveSets;
}

export function getLiveAddons(): Record<string, AddonItem> {
  return liveAddons;
}

export function getLiveProducts(): BackendCatalogProduct[] {
  return liveProducts;
}

export const SESSION_SLOT_CACHE_KEY = 'kauntact_slot_catalog_v1';

// Synchronously hydrate from sessionStorage if available so products exist at t=0
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const raw = window.sessionStorage.getItem(SESSION_SLOT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.data) && parsed.data.length > 0) {
        updateLiveCatalog(parsed.data, parsed.slots, parsed.activeSlots);
      }
    }
  }
} catch {
  // Ignore storage access or parsing errors
}

export interface CartItemDetail {
  id: string; // The cart key (targetId)
  productId?: string;
  variantId?: string;
  tone?: 'dark' | 'light';
  name: string;
  subtitle: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  image?: string;
  tagsCount: number;
  isSet?: boolean;
}

export const FREE_SHIPPING_THRESHOLD = 400;

export interface CartCalculation {
  items: CartItemDetail[];
  itemCount: number;
  totalTags: number;
  subtotal: number;
  shippingFee: number;
  isShippingFree: boolean;
  total: number;
  hasSets: boolean;
}

export interface StoreCartState {
  sets: Record<string, number>;
  addons: Record<string, number>;
  setTones?: Record<string, 'dark' | 'light'>;
}

export const MAX_ITEMS_PER_ORDER = 5;

export const DEFAULT_STORE_CART: StoreCartState = {
  sets: {},
  addons: {},
  setTones: {},
};

export function calculateCart(
  cart: StoreCartState,
  customSets?: Record<string, SetProduct>,
  customAddons?: Record<string, AddonItem>
): CartCalculation {
  const setsCatalog = customSets || liveSets || SETS;
  const addonsCatalog = customAddons || liveAddons || ADDONS;

  const items: CartItemDetail[] = [];
  let totalTags = 0;
  let hasSets = false;

  // Process Sets (custom packs by ID or slug)
  Object.entries(cart.sets || {}).forEach(([targetId, qty]) => {
    if (qty > 0) {
      const setProd = setsCatalog[targetId];
      if (setProd) {
        hasSets = true;
        const safeQty = Math.max(1, Math.min(20, qty));
        totalTags += setProd.tagsCount * safeQty;
        const tone = cart.setTones?.[targetId] || 'light';
        const displayImg = setProd.images ? setProd.images[tone] : setProd.image;
        const toneLabel = tone === 'light' ? 'Light' : 'Dark';
        const cleanSetName = setProd.name
          .replace(/\s*\((light|dark)\)/i, '')
          .replace(/\s+(light|dark)(\s+kit|\s+pack)?/i, '')
          .trim();
        const formattedSetName = `${cleanSetName || setProd.name} (${toneLabel})`;
        const activeProductId = (setProd as any).finishProducts?.[tone] || setProd.productId || setProd.id;
        const activeVariantId = (setProd as any).finishVariants?.[tone] || setProd.variantId;
        items.push({
          id: targetId,
          productId: activeProductId,
          variantId: activeVariantId,
          tone,
          name: formattedSetName,
          subtitle: setProd.tagline,
          unitPrice: setProd.price,
          quantity: safeQty,
          totalPrice: setProd.price * safeQty,
          image: displayImg,
          tagsCount: setProd.tagsCount,
          isSet: true,
        });
      }
    }
  });

  // Process Add-ons
  Object.entries(cart.addons || {}).forEach(([targetId, qty]) => {
    if (qty > 0) {
      const addon = addonsCatalog[targetId];
      if (addon) {
        const safeQty = Math.max(1, Math.min(20, qty));
        totalTags += addon.tagsCount * safeQty;
        const toneLabel = addon.tone === 'light' ? 'Light' : 'Dark';
        const formattedAddonName =
          addon.name.toLowerCase().includes(`(${toneLabel.toLowerCase()})`) ||
          addon.name.toLowerCase().endsWith(toneLabel.toLowerCase())
            ? addon.name
            : `${addon.name} (${toneLabel})`;
        items.push({
          id: addon.id,
          productId: addon.productId,
          variantId: addon.variantId,
          tone: addon.tone,
          name: formattedAddonName,
          subtitle: addon.subtitle,
          unitPrice: addon.price,
          quantity: safeQty,
          totalPrice: addon.price * safeQty,
          image: addon.image,
          tagsCount: addon.tagsCount,
          isSet: false,
        });
      }
    }
  });

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);

  // Delivery rule: Orders with merchandise subtotal >= ₹400 qualify for free shipping.
  // Before pincode is provided, customer fee is ₹0 for qualifying carts, or calculated at checkout.
  const isShippingFree = subtotal >= 400;
  const shippingFee = isShippingFree || subtotal === 0 ? 0 : 0;
  const total = subtotal + shippingFee;

  return {
    items,
    itemCount,
    totalTags,
    subtotal,
    shippingFee,
    isShippingFree,
    total,
    hasSets,
  };
}

export interface ShippingAddress {
  fullName: string;
  mobileNumber: string;
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderRecord {
  orderId: string;
  items: CartItemDetail[];
  itemCount: number;
  totalTags: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  customer: ShippingAddress;
  status: 'PAYMENT_PENDING' | 'CONFIRMED' | 'DISPATCHED';
  paymentGatewayStatus: 'UNCONFIGURED' | 'PAID' | 'FAILED';
  createdAt: string;
}

const STORE_CART_KEY = 'kauntact_store_cart_v2';
const ORDERS_STORAGE_KEY = 'kauntact_orders';

export function saveCartToStorage(cart: StoreCartState): void {
  try {
    localStorage.setItem(STORE_CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error('Failed to save cart to localStorage:', err);
  }
}

export function getCartFromStorage(): StoreCartState {
  try {
    const raw = localStorage.getItem(STORE_CART_KEY);
    if (!raw) return DEFAULT_STORE_CART;
    const parsed = JSON.parse(raw);
    return {
      sets: parsed.sets || {},
      addons: parsed.addons || {},
      setTones: parsed.setTones || {},
    };
  } catch {
    return DEFAULT_STORE_CART;
  }
}

export function saveOrderToStorage(order: OrderRecord): void {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    const list: OrderRecord[] = raw ? JSON.parse(raw) : [];
    // Sanitize item images to stable canonical references to prevent persisting transient expired tokens
    const sanitizedItems = (order.items || []).map((it) => ({
      ...it,
      image: getStableObjectReference(it.image),
    }));
    const sanitizedOrder: OrderRecord = {
      ...order,
      items: sanitizedItems,
    };
    const filtered = list.filter((o) => o.orderId !== order.orderId);
    filtered.unshift(sanitizedOrder);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save order to localStorage:', err);
  }
}

export function getOrderFromStorage(orderId: string): OrderRecord | null {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return null;
    const list: OrderRecord[] = JSON.parse(raw);
    return list.find((o) => o.orderId === orderId) || null;
  } catch {
    return null;
  }
}

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi NCR',
  'Jammu and Kashmir',
  'Ladakh',
  'Chandigarh',
  'Puducherry',
];

/**
 * Resolves a product thumbnail image given an item title or variant name.
 * Uses explicit image URL if valid, or matches against live dynamic catalog.
 */
export function getProductThumbnail(name?: string, fallbackImage?: string): string {
  const resolvedFallback = resolveImageSource(fallbackImage);
  if (
    resolvedFallback &&
    resolvedFallback !== DEFAULT_PRODUCT_IMAGE &&
    !isUrlExpired(resolvedFallback)
  ) {
    return resolvedFallback;
  }

  if (name) {
    const clean = name.toLowerCase().trim();

    // 1. Check live add-ons by exact or partial name/finish
    for (const addon of Object.values(liveAddons || {})) {
      const aName = addon.name.toLowerCase();
      if (aName === clean || clean.includes(aName) || aName.includes(clean)) {
        const candidate = resolveImageSource(addon.image);
        if (candidate && !isUrlExpired(candidate)) {
          return candidate;
        }
      }
    }

    // 2. Check live sets by name and tone
    for (const pack of Object.values(liveSets || {})) {
      const pName = pack.name.toLowerCase();
      if (clean.includes(pName) || pName.includes(clean)) {
        const isDark = clean.includes('dark') || clean.includes('drk');
        const img = isDark ? pack.images?.dark : pack.images?.light;
        const candidate = resolveImageSource(img || pack.image);
        if (candidate && !isUrlExpired(candidate)) {
          return candidate;
        }
      }
    }
  }

  // If fallback was expired or only available reference, return it rather than blank placeholder
  if (resolvedFallback && resolvedFallback !== DEFAULT_PRODUCT_IMAGE) {
    return resolvedFallback;
  }

  return DEFAULT_PRODUCT_IMAGE;
}

