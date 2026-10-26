import type { ResourceType } from './api';

export type AdminQrTagStatus = 'UNASSIGNED' | 'ASSIGNED' | 'REVOKED';
export type AdminQrTagOrigin = 'PREPRINTED_INVENTORY' | 'GENERATED_FOR_RESOURCE';
export type CommunicationSessionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | string;
export type CommunicationSessionType = 'CALL' | 'ALERT' | 'MESSAGE' | string;

export interface AdminDashboardData {
  users: {
    total: number;
    active: number;
  };
  resources: {
    total: number;
  };
  qrTags: {
    total: number;
    assigned: number;
    available: number;
  };
  communications: {
    totalSessions: number;
  };
  recentActivity: Array<{
    id: string;
    reference: string;
    type: string;
    status: string;
    createdAt: string;
    resourceName: string;
    ownerName: string;
  }>;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  mobileNumber: string;
  active: boolean;
  role?: 'USER' | 'ADMIN';
  createdAt: string;
  resourceCount: number;
  hasContactEndpoint: boolean;
}

export interface AdminUsersResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  users: AdminUserListItem[];
}

export interface AdminUserResource {
  id: string;
  name: string;
  type: ResourceType;
  registrationNum?: string;
  vehicleColour?: string;
  qrTag?: {
    id: string;
    tagNumber: string;
    status: string;
    origin: string;
    assignedAt?: string;
  } | null;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  mobileNumber: string;
  active: boolean;
  role?: 'USER' | 'ADMIN';
  createdAt: string;
  hasContactEndpoint: boolean;
  contactEndpoint?: {
    id: string;
    type: string;
    phoneNumber?: string;
    createdAt?: string;
  } | null;
  resources: AdminUserResource[];
}

export interface AdminQrSummary {
  total: number;
  assigned: number;
  unassigned: number;
  revoked: number;
  byOrigin: Array<{
    origin: AdminQrTagOrigin | string;
    count: number;
  }>;
}

export interface AdminQrTagItem {
  id: string;
  tagNumber: string;
  origin: AdminQrTagOrigin;
  status: AdminQrTagStatus;
  assignmentMethod?: string | null;
  assignedAt?: string | null;
  createdAt: string;
  resource?: {
    id: string;
    name: string;
    type: ResourceType;
    owner?: {
      id: string;
      name: string;
      mobileNumber: string;
    } | null;
  } | null;
}

export interface AdminQrTagsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  tags: AdminQrTagItem[];
}

export interface AdminGenerateSingleQrPayload {
  resourceId?: string;
  origin?: AdminQrTagOrigin;
}

export interface AdminGenerateSingleQrResponse {
  message: string;
  tag: {
    id: string;
    tagNumber: string;
    token?: string;
    qrUrl?: string;
    origin: AdminQrTagOrigin;
    status: AdminQrTagStatus;
    resourceId?: string;
    assignedAt?: string;
  };
  resource?: {
    id: string;
    name: string;
    type?: ResourceType;
    registrationNum?: string;
  } | null;
}

export interface AdminBatchQrPayload {
  quantity: number;
  origin?: AdminQrTagOrigin;
  idempotencyKey?: string;
}

export interface AdminBatchQrItem {
  tagNumber: string;
  token: string;
  qrUrl: string;
}

export interface AdminBatchQrResponse {
  batchId: string;
  count: number;
  origin: AdminQrTagOrigin;
  items: AdminBatchQrItem[];
}

export interface AdminRevokeQrResponse {
  message: string;
  tagId: string;
  tagNumber: string;
  status: 'REVOKED';
}

export interface AdminCommunicationCall {
  id: string;
  callSid?: string;
  caller: string;
  callee: string;
  direction?: string;
  status: string;
  durationSec?: number;
  incomingAt?: string | null;
  connectedAt?: string | null;
  endedAt?: string | null;
}

export interface AdminCommunicationSession {
  id: string;
  reference: string;
  type: CommunicationSessionType;
  status: CommunicationSessionStatus;
  provider?: string;
  createdAt: string;
  expiresAt?: string;
  endedAt?: string | null;
  resource?: {
    id: string;
    name: string;
    type: ResourceType;
    owner?: {
      id: string;
      name: string;
      mobileNumber: string;
    } | null;
  } | null;
  calls: AdminCommunicationCall[];
  callCount: number;
  totalDurationSec: number;
}

export interface AdminCommunicationsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sessions: AdminCommunicationSession[];
}

// ==========================================
// 4. Admin Catalog Management Types
// ==========================================

export type ProductType =
  | 'PHYSICAL_TAG_PACK'
  | 'COMBO_PACK'
  | 'VEHICLE_STICKER'
  | 'KEYCHAIN'
  | 'MINI_STICKER'
  | 'MERCHANDISE'
  | 'SUBSCRIPTION_ONLY'
  | string;

export type ProductComponentType =
  | 'SERIALIZED_QR_TAG'
  | 'PHYSICAL_ITEM'
  | 'DIGITAL_ENTITLEMENT'
  | string;

export interface ProductVariantComponent {
  id?: string;
  variantId?: string;
  componentType: ProductComponentType;
  name: string;
  quantity: number;
  inventorySku?: string;
  plusDurationMonths?: number;
}

export interface ProductVariant {
  id?: string;
  sku: string;
  name: string;
  price: number; // in paise
  active?: boolean;
  inStock?: boolean;
  availableQuantity?: number;
  imageUrl?: string | null;
  components: ProductVariantComponent[];
  _count?: { orderItems?: number };
}

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  type: ProductType;
  active: boolean;
  basePrice: number; // in paise (e.g. 24900 = ₹249.00)
  basePriceFormatted?: string;
  currency?: string;
  inStock?: boolean;
  imageUrl?: string | null;
  darkImageUrl?: string | null;
  lightImageUrl?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  imageReference?: string | null;
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  variantCount?: number;
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  products: AdminProduct[];
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  slug: string;
  description?: string;
  type: ProductType;
  basePrice: number;
  imageUrl?: string | null;
  darkImageUrl?: string | null;
  lightImageUrl?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  variants: Array<{
    sku: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    components: ProductVariantComponent[];
  }>;
}

export interface UpdateProductPayload {
  name?: string;
  slug?: string;
  description?: string;
  type?: ProductType;
  active?: boolean;
  basePrice?: number;
  imageUrl?: string | null;
  darkImageUrl?: string | null;
  lightImageUrl?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  weightGrams?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
}

export interface AddVariantPayload {
  sku: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  components: ProductVariantComponent[];
}

export interface UpdateVariantPayload {
  name?: string;
  price?: number;
  active?: boolean;
  imageUrl?: string | null;
  components?: ProductVariantComponent[];
}

// ==========================================
// 5. Admin QR Tag Inventory Management Types
// ==========================================

export type TagStockState =
  | 'GENERATED'
  | 'SENT_TO_PRINT'
  | 'IN_STOCK'
  | 'RESERVED'
  | 'ALLOCATED_TO_ORDER'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'DAMAGED'
  | 'RETURNED_TO_STOCK';

export interface SerializedSkuSummary {
  sku: string;
  generated?: number;
  sentToPrint?: number;
  inStock: number;
  reserved: number;
  allocated: number;
  delivered: number;
  damaged: number;
  total: number;
}

export type PrintShape = 'CIRCLE' | 'SQUARE' | 'RECTANGLE' | 'ROUNDED_RECTANGLE' | string;
export type TagNumberPosition = 'BELOW_QR' | 'ABOVE_QR' | 'INSIDE_FRAME' | 'NONE' | string;

export interface PrintTemplate {
  id: string;
  profileId?: string;
  name: string;
  version: number;
  isDefault: boolean;
  qrSizeMm: number;
  tagNumberPosition: TagNumberPosition;
  qrXPosition?: number;
  qrYPosition?: number;
  typographyJson?: Record<string, any> | null;
  brandingAssets?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrintProfile {
  id: string;
  sku: string;
  name: string;
  widthMm: number;
  heightMm: number;
  shape: PrintShape;
  material: string;
  finish: string;
  bleedMm: number;
  safeMarginMm: number;
  active: boolean;
  templates?: PrintTemplate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertPrintProfilePayload {
  name: string;
  widthMm: number;
  heightMm: number;
  shape: string;
  material: string;
  finish: string;
  bleedMm: number;
  safeMarginMm: number;
  active?: boolean;
}

export interface CreatePrintTemplatePayload {
  name: string;
  version?: number;
  isDefault?: boolean;
  qrSizeMm: number;
  tagNumberPosition?: TagNumberPosition;
  qrXPosition?: number;
  qrYPosition?: number;
  typographyJson?: Record<string, any>;
  brandingAssets?: Record<string, any>;
}

export type PrintBatchStatus = 'DRAFT' | 'PREPARED' | 'PRINTING' | 'STOCKED' | 'CANCELLED' | string;

export interface PrintBatch {
  id: string;
  batchNumber: string;
  sku: string;
  status: PrintBatchStatus;
  vendorName: string;
  quantityRequested: number;
  quantityReceived: number;
  quantityDefective: number;
  outstanding: number;
  notes?: string | null;
  profileSnapshot: {
    sku?: string;
    name?: string;
    shape?: string;
    finish?: string;
    bleedMm?: number;
    widthMm: number;
    heightMm: number;
    material?: string;
    safeMarginMm?: number;
    [key: string]: any;
  };
  templateSnapshot: {
    id?: string;
    name?: string;
    version?: number;
    qrSizeMm?: number;
    tagNumberPosition?: string;
    [key: string]: any;
  };
  dispatchedAt?: string | null;
  stockedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  tagCount?: number;
}

export interface PrintBatchesResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  batches: PrintBatch[];
}

export interface CreatePrintBatchPayload {
  sku: string;
  quantity: number;
  vendorName: string;
  templateId?: string;
  notes?: string;
  dispatchImmediately?: boolean;
}

export interface ReceivePrintBatchPayload {
  acceptedTagNumbers: string[];
  defectiveTagNumbers?: string[];
  notes?: string;
}

export interface ReceivePrintBatchResponse {
  message: string;
  data: {
    batchId: string;
    batchNumber: string;
    sku: string;
    batchStatus: PrintBatchStatus;
    newlyAccepted: number;
    newlyDefective: number;
    totalReceived: number;
    totalDefective: number;
    outstanding: number;
    totalSellableInStockForSku: number;
    isFullyStocked: boolean;
  };
}

export interface BulkStockItem {
  id?: string;
  sku: string;
  name: string;
  quantityOnHand: number;
  reservedCount: number;
  availableCount: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export interface InventoryTotals {
  totalPhysicalTags: number;
  assignedToVehicles: number;
  inCommerceStock: number;
  reservedInCheckout: number;
}

export interface AdminInventorySummary {
  serializedBySku: SerializedSkuSummary[];
  bulkStock: BulkStockItem[];
  totals: InventoryTotals;
}

export interface AdminInventoryTagRecord {
  id: string; // inventory UUID
  qrTagId: string;
  tagNumber: string;
  sku: string;
  stockState: TagStockState;
  operationalStatus: string;
  assignedVehicle?: any;
  activeHold?: any;
  updatedAt: string;
}

export interface AdminInventoryTagsResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  records: AdminInventoryTagRecord[];
}

export interface AdminBatchGenerateTagsPayload {
  sku: string;
  quantity: number;
}

export interface AdminBatchGenerateTagsResponse {
  message: string;
  data: {
    batchId: string;
    sku: string;
    count: number;
    origin: string;
    createdAt: string;
    items: Array<{
      tagNumber: string;
      token: string;
      qrUrl: string;
    }>;
  };
}

export interface UpdateTagStatePayload {
  state: TagStockState;
  reason?: string;
}

export interface CreateOrUpdateBulkStockPayload {
  sku: string;
  name?: string;
  quantityOnHandDelta?: number;
  reorderLevel?: number;
}

// ==========================================
// Admin Orders Management Types (/api/admin/orders)
// ==========================================

export type AdminOrderStatus =
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PACKING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'RECONCILIATION_REQUIRED';

export interface AdminOrderShippingAddress {
  id?: string;
  orderId?: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface AdminOrderItem {
  id: string;
  variantName: string;
  productName?: string;
  name?: string;
  quantity: number;
  unitPrice: number; // in paise
  totalPrice: number; // in paise
  imageUrl?: string | null;
  imageReference?: string | null;
  productSnapshot?: {
    product?: {
      id?: string;
      sku?: string;
      name?: string;
      slug?: string;
      type?: string;
      imageUrl?: string | null;
    };
    variant?: {
      id?: string;
      sku?: string;
      name?: string;
      price?: number;
      imageUrl?: string | null;
    };
    components?: Array<{
      componentType: string;
      name: string;
      quantity: number;
      inventorySku?: string | null;
      plusDurationMonths?: number;
    }>;
  };
  variant?: {
    id: string;
    sku?: string;
    name: string;
    price?: number;
    imageUrl?: string | null;
    product?: {
      id: string;
      sku?: string;
      name: string;
      slug?: string;
      imageUrl?: string | null;
    };
  };
}

export interface AdminOrderPayment {
  id?: string;
  provider: string;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | string;
  amount?: number;
  razorpayPaymentId?: string | null;
  capturedAt?: string | null;
}

export interface AdminOrderShipment {
  id?: string;
  trackingNumber?: string | null;
  courierName?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface AdminOrderSubscriptionGrant {
  id: string;
  status: string;
  plusDurationMonths: number;
  activatedAt?: string | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  totalAmount: number; // in paise
  subtotalAmount: number; // in paise
  currency: string;
  customerEmail: string | null;
  customerPhone: string;
  isClaimed: boolean;
  user?: {
    id: string;
    name: string;
    mobileNumber: string;
    role?: string;
  } | null;
  shippingAddress: AdminOrderShippingAddress;
  itemCount: number;
  items: AdminOrderItem[];
  allocatedTags: string[];
  payment?: AdminOrderPayment | null;
  payments?: AdminOrderPayment[];
  shipment?: AdminOrderShipment | null;
  shipments?: AdminOrderShipment[];
  hasSubscriptionGrant: boolean;
  grantStatus: string | null;
  subscriptionGrants?: AdminOrderSubscriptionGrant[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrdersResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  orders: AdminOrder[];
}

export interface AdminOrderMetrics {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalRevenuePaise: number;
  totalRevenueRupees: number;
  byStatus: Array<{
    status: AdminOrderStatus | string;
    count: number;
  }>;
}

// ==========================================
// Warehouse Pick-to-Scan Packing Types (/api/admin/orders/:orderId/packing)
// ==========================================

export interface PackingSkuProgress {
  sku: string;
  name: string;
  required: number;
  scanned: number;
  remaining: number;
}

export interface PackingScannedTag {
  tagNumber: string;
  sku: string;
  scannedAt: string;
  orderItemId?: string;
}

export interface PackingStatusData {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  activeSessionId: string | null;
  sessionStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | null;
  sessionNumber: number | null;
  packedBy: string | null;
  totalRequired: number;
  totalScanned: number;
  isComplete: boolean;
  skuProgress: PackingSkuProgress[];
  scannedTags: PackingScannedTag[];
}

export interface StartPackingSessionResponse {
  message: string;
  data: {
    id: string;
    orderId: string;
    sessionNumber: number;
    packedBy: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ScanPackingTagResponse {
  message: string;
  data: {
    success: boolean;
    alreadyScanned: boolean;
    scannedTagNumber: string;
    sku: string;
    orderItemId?: string;
    progress: PackingStatusData;
  };
}

export interface CancelPackingSessionResponse {
  message: string;
  data: {
    success: boolean;
    sessionId: string;
    releasedTagCount: number;
    reason?: string;
  };
}

export interface FinalizePackingResponse {
  message: string;
  data: {
    success: boolean;
    orderId: string;
    orderNumber: string;
    orderStatus: string;
    allocatedTagsCount: number;
    session: {
      id: string;
      orderId: string;
      sessionNumber: number;
      packedBy: string;
      status: string;
      startedAt: string;
      completedAt: string;
    };
  };
}

// -------------------------------------------------------------
// Storefront Slot Configurator Types (Phase 5)
// -------------------------------------------------------------

export interface StorefrontSlotVariant {
  id: string;
  name: string;
  price: number;
  sku: string;
  imageUrl?: string | null;
  active?: boolean;
  inStock?: boolean;
  availableQuantity?: number;
}

export interface StorefrontSlotProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  type: string;
  active: boolean;
  basePrice: number;
  currency?: string;
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
  variants?: StorefrontSlotVariant[];
  imageReference?: string | null;
}

export interface StorefrontSlot {
  id: string;
  slotKey: string;
  label: string;
  slotType: 'BUNDLE' | 'INDIVIDUAL' | string;
  displayOrder: number;
  active: boolean;
  productId: string | null;
  product?: StorefrontSlotProduct | null;
  variantId?: string | null;
  variant?: StorefrontSlotVariant | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateStorefrontSlotPayload {
  label?: string;
  displayOrder?: number;
  active?: boolean;
  productId?: string | null;
  variantId?: string | null;
  reason?: string;
}

export interface AdminStorefrontSlotsResponse {
  data: {
    slots: StorefrontSlot[];
    availableBundles: Array<StorefrontSlotProduct | AdminProduct>;
    availableIndividuals: Array<StorefrontSlotProduct | AdminProduct>;
    totalSlots: number;
  };
}

export interface StorefrontSlotHistoryItem {
  id: string;
  slotId: string;
  slotKey: string;
  slotLabel: string;
  action: 'ASSIGN' | 'SWAP' | 'CLEAR' | 'INITIAL_SEED' | 'CREATE_SLOT' | 'DELETE_SLOT' | string;
  previousProductId: string | null;
  newProductId: string | null;
  changedBy: string | null;
  reason: string | null;
  assignedAt: string;
  previousProduct: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string | null;
  } | null;
  newProduct: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string | null;
  } | null;
}

export interface AdminStorefrontSlotHistoryResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  history: StorefrontSlotHistoryItem[];
}
