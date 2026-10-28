// src/types/orders.ts

export interface BackendCatalogVariantComponent {
  componentType: 'SERIALIZED_QR_TAG' | 'DIGITAL_ENTITLEMENT' | 'BULK_STOCK' | string;
  name: string;
  quantity: number;
  plusDurationMonths?: number;
  inventorySku?: string;
}

export interface BackendCatalogVariant {
  id: string;
  productId?: string;
  sku: string;
  name: string;
  price: number; // in paise (e.g. 49900 = ₹499.00)
  active?: boolean;
  components?: BackendCatalogVariantComponent[] | string;
  inStock?: boolean;
  availableQuantity?: number;
  imageUrl?: string | null;
}

export interface BackendCatalogProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  type?: 'PHYSICAL_TAG_PACK' | 'VEHICLE_STICKER' | 'KEYCHAIN' | 'MINI_STICKER' | 'MERCHANDISE' | 'SUBSCRIPTION_ONLY' | string;
  active?: boolean;
  basePrice: number; // in paise
  currency: string;
  imageUrl?: string | null;
  darkImageUrl?: string | null;
  lightImageUrl?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  createdAt?: string;
  updatedAt?: string;
  inStock?: boolean;
  tagsCount?: number;
  plusMonths?: number;
  imageReference?: string | null;
  variants: BackendCatalogVariant[];
}

export interface CatalogImageUrlResponse {
  url: string;
  expiresAt: string;
}

export interface InventoryAvailabilityData {
  variantId: string;
  requestedQuantity: number;
  isAvailable: boolean;
  maxAvailableQuantity: number;
}

export interface StockReservationData {
  reservationId: string;
  checkoutSessionId: string;
  status: 'ACTIVE' | 'EXPIRED' | string;
  expiresAt: string;
}

export interface ShippingAddressPayload {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface ShippingRateItemInput {
  variantId?: string;
  productId?: string;
  quantity: number;
}

export interface ShippingRateRequestInput {
  items: ShippingRateItemInput[];
  deliveryPincode: string;
  paymentMethod?: 'PREPAID' | 'COD';
}

export interface ShippingRateCourierDetails {
  courierCompanyId?: number;
  name: string;
  estimatedDeliveryDays?: string;
  etd?: string | null;
}

export interface ShippingRateResponseData {
  isServiceable: boolean;
  freeShippingThreshold: number; // 40000 paise (₹400)
  isFreeShipping: boolean;
  subtotalAmount: number; // in paise
  shippingFee: number | null; // in paise, null if unserviceable
  estimatedTax: number;
  estimatedTotal: number; // in paise
  currency: string;
  deliveryPincode: string;
  paymentMethod: 'PREPAID' | 'COD';
  courier?: ShippingRateCourierDetails | null;
  packageDetails?: {
    weightGrams: number;
    dimensions: {
      lengthCm: number;
      breadthCm: number;
      heightCm: number;
    };
  };
  unserviceableReason?: string;
}

export interface CheckoutCartItem {
  variantId: string;
  quantity: number;
  productId?: string;
}

export interface CheckoutPayload {
  items?: CheckoutCartItem[];
  variantId?: string;
  quantity?: number;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: ShippingAddressPayload;
}

export interface CheckoutOrderResponseData {
  orderNumber: string;
  orderId: string;
  status: 'PAYMENT_PENDING' | 'PAID' | string;
  amount: number; // in paise
  currency: string;
  razorpayOrderId: string;
  keyId: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    variantName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface OrderStatusItem {
  id?: string;
  name?: string;
  productName?: string;
  variantName: string;
  quantity: number;
  totalPrice: number;
  imageUrl?: string | null;
}

export interface OrderStatusData {
  orderNumber: string;
  status: 'PAYMENT_PENDING' | 'PAID' | 'DISPATCHED' | 'CANCELLED' | string;
  paymentStatus: 'PENDING' | 'CAPTURED' | 'FAILED' | string;
  totalAmount: number; // in paise
  currency: string;
  isClaimed: boolean;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: {
    fullName: string;
    phoneNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items?: OrderStatusItem[];
}

export interface ClaimOtpResponseData {
  success: boolean;
  message: string;
  maskedContact: string;
  expiresAt: string;
}

export interface TrackingMilestone {
  key: string;
  label: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  timestamp: string | null;
}

export interface CarrierTrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
}

export interface CarrierLiveTracking {
  awbCode: string;
  courierName: string;
  currentStatus: string;
  trackUrl: string;
  activities: CarrierTrackingActivity[];
}

export interface TrackingShipment {
  id?: string;
  status: string;
  courierName: string;
  awbCode: string;
  trackingUrl?: string;
  labelUrl?: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  carrierLiveTracking?: CarrierLiveTracking | null;
}

export interface UnifiedOrderTrackingData {
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  isClaimed: boolean;
  paymentStatus: string;
  razorpayOrderId?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: {
    fullName: string;
    phoneNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  } | null;
  items: Array<{
    productName?: string;
    variantName?: string;
    name?: string;
    quantity: number;
    totalPrice: number;
  }>;
  internalMilestones: TrackingMilestone[];
  shipment: TrackingShipment | null;
  createdAt: string;
}

