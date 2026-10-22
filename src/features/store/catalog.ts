export interface SetProduct {
  id: 'essential' | 'curated-kit' | 'pair' | 'complete-set';
  name: string;
  tagline: string;
  price: number;
  shippingFee: number;
  image: string;
  contents: string[];
  tagsCount: number;
  plusMonths: number;
  details: {
    origin: string;
    shipping: string;
    description: string;
    features: string[];
  };
}

export const SETS: Record<string, SetProduct> = {
  essential: {
    id: 'essential',
    name: 'Essential',
    tagline: '2 vehicle stickers + 12 months of Plus',
    price: 179,
    shippingFee: 40,
    image: '/assets/kauntact_sticker_pack.jpg',
    contents: ['2 vehicle stickers', 'Includes 12 months of Plus'],
    tagsCount: 2,
    plusMonths: 12,
    details: {
      origin: 'Ships from Hyderabad via express courier.',
      shipping: 'Dispatches within 24–48 hours from Hyderabad. Delivery calculated at checkout.',
      description: 'Two weatherproof matte vinyl stickers engineered for vehicle windshields or exterior bodywork.',
      features: [
        'UV and waterproof vinyl for exterior automotive exposure',
        'Direct caller voice relay without revealing your number',
        'Includes 12 months of Plus (up to 8 active tags & alerts)',
        'Your first 2 tags keep working for calls with no expiry',
      ],
    },
  },
  'curated-kit': {
    id: 'curated-kit',
    name: 'Curated kit',
    tagline: '2 vehicle stickers + 1 keychain + 1 general-purpose sticker + 12 months of Plus',
    price: 499,
    shippingFee: 0,
    image: '/assets/kauntact_everyday_pack.jpg',
    contents: [
      '2 vehicle stickers',
      '1 QR keychain tag',
      '1 general-purpose sticker',
      'Includes 12 months of Plus',
    ],
    tagsCount: 4,
    plusMonths: 12,
    details: {
      origin: 'Ships from Hyderabad via express courier.',
      shipping: 'Dispatches within 24–48 hours from Hyderabad. Delivery calculated at checkout.',
      description: 'Comprehensive 4-piece tag pack for your car, motorcycle, keychain, and daily belongings.',
      features: [
        '2 automotive stickers + 1 CNC anodized aluminum keychain + 1 compact sticker',
        'Laser-etched and weather-sealed finishes for long durability',
        'Includes 12 months of Plus service across all tags',
        'Independent tag management and private masked voice calls',
      ],
    },
  },
};

// Aliases for backwards compatibility
SETS.pair = SETS.essential;
SETS['complete-set'] = SETS['curated-kit'];

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
}

export const ADDONS: Record<string, AddonItem> = {
  'dark-sticker-pair': {
    id: 'dark-sticker-pair',
    name: 'Sticker pair',
    subtitle: 'For light-coloured surfaces',
    tone: 'dark',
    swatchHex: '#151513',
    price: 99,
    image: '/assets/kauntact_sticker_pack.jpg',
    tagsCount: 2,
  },
  'light-sticker-pair': {
    id: 'light-sticker-pair',
    name: 'Sticker pair',
    subtitle: 'For tinted glass or dark surfaces',
    tone: 'light',
    swatchHex: '#edece6',
    swatchBorderHex: '#aaa79c',
    price: 99,
    image: '/assets/kauntact_sticker_pack.jpg',
    tagsCount: 2,
  },
  'dark-keychain': {
    id: 'dark-keychain',
    name: 'Keychain',
    subtitle: 'Matte anodized tag for keys and luggage',
    tone: 'dark',
    swatchHex: '#151513',
    price: 179,
    image: '/assets/kauntact_everyday_pack.jpg',
    tagsCount: 1,
  },
  'light-keychain': {
    id: 'light-keychain',
    name: 'Keychain',
    subtitle: 'Silver aluminum tag for daily carry',
    tone: 'light',
    swatchHex: '#d8d5cc',
    price: 179,
    image: '/assets/kauntact_everyday_pack.jpg',
    tagsCount: 1,
  },
  'small-stickers': {
    id: 'small-stickers',
    name: 'Small stickers (2-pack)',
    subtitle: 'For helmets, laptops and compact gear',
    tone: 'dark',
    swatchHex: '#151513',
    price: 79,
    image: '/assets/kauntact_sticker_pack.jpg',
    tagsCount: 2,
  },
};

export interface CartItemDetail {
  id: string;
  name: string;
  subtitle: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  image?: string;
  tagsCount: number;
}

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
}

export const DEFAULT_STORE_CART: StoreCartState = {
  sets: {},
  addons: {},
};

export function calculateCart(cart: StoreCartState): CartCalculation {
  const items: CartItemDetail[] = [];
  let totalTags = 0;
  let hasCuratedKit = false;
  let hasSets = false;

  // Process Sets (Essential or Curated kit)
  Object.entries(cart.sets || {}).forEach(([id, qty]) => {
    if (qty > 0) {
      const targetId =
        id === 'pair' || id === 'sticker-set' ? 'essential' : id === 'complete-set' ? 'curated-kit' : id;
      const setProd = SETS[targetId];
      if (setProd) {
        hasSets = true;
        if (targetId === 'curated-kit') hasCuratedKit = true;
        const safeQty = Math.max(1, Math.min(20, qty));
        totalTags += setProd.tagsCount * safeQty;
        items.push({
          id: setProd.id,
          name: setProd.name,
          subtitle: setProd.tagline,
          unitPrice: setProd.price,
          quantity: safeQty,
          totalPrice: setProd.price * safeQty,
          image: setProd.image,
          tagsCount: setProd.tagsCount,
        });
      }
    }
  });

  // Process Add-ons
  Object.entries(cart.addons || {}).forEach(([id, qty]) => {
    if (qty > 0) {
      const targetId =
        id === 'dark-sticker'
          ? 'dark-sticker-pair'
          : id === 'light-sticker'
          ? 'light-sticker-pair'
          : id;
      const addon = ADDONS[targetId];
      if (addon) {
        const safeQty = Math.max(1, Math.min(20, qty));
        totalTags += addon.tagsCount * safeQty;
        items.push({
          id: addon.id,
          name: addon.name,
          subtitle: addon.subtitle,
          unitPrice: addon.price,
          quantity: safeQty,
          totalPrice: addon.price * safeQty,
          image: addon.image,
          tagsCount: addon.tagsCount,
        });
      }
    }
  });

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);

  // Delivery rule: Free if Curated kit is in cart or subtotal >= 499. Otherwise ₹40 (or ₹0 if empty).
  const isShippingFree = hasCuratedKit || subtotal >= 499 || subtotal === 0;
  const shippingFee = isShippingFree || subtotal === 0 ? 0 : 40;
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
    };
  } catch {
    return DEFAULT_STORE_CART;
  }
}

export function saveOrderToStorage(order: OrderRecord): void {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    const list: OrderRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((o) => o.orderId !== order.orderId);
    filtered.unshift(order);
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
