export type SubscriptionTier = 'BASIC' | 'PLUS';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';

export type PackType = 'PLUS_99' | 'PACK_499' | 'PACK_179' | 'PLUS_RENEWAL' | (string & {});

export type PaymentProvider = 'RAZORPAY' | 'PROMO' | 'STRIPE' | string;

export type PurchaseStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SubscriptionPack {
  packType: PackType;
  name: string;
  amountPaise: number;
  currency: string;
  tagsIncluded: number;
  plusDurationMonths: number;
  badge?: string;
  description: string;
  features: string[];
}

export interface UserSubscription {
  id?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  maxActiveTags: number;
  hasLifetimeCalling?: boolean;
  hasWhatsappAlerts?: boolean;
  hasAnalytics?: boolean;
  startsAt?: string;
  expiresAt?: string | null;
  daysRemaining?: number;
  isExpired?: boolean;
}

export interface UserTagResource {
  id: string;
  name: string;
  type?: string;
  vehicleDetail?: {
    registrationNum?: string;
    vehicleColour?: string;
  };
}

export interface UserTagItem {
  id: string;
  tagNumber: string;
  status: 'ASSIGNED' | 'SUSPENDED';
  assignedAt?: string;
  resource?: UserTagResource | null;
}

export interface SubscriptionTagsState {
  activeCount: number;
  suspendedCount: number;
  totalCount: number;
  maxLimit: number;
  needsTagSelection: boolean;
  assigned: UserTagItem[];
  suspended: UserTagItem[];
}

export interface UserSubscriptionMeData {
  subscription: UserSubscription;
  tags: SubscriptionTagsState;
  catalog: SubscriptionPack[];
}

export interface UserSubscriptionMeResponse {
  success: boolean;
  data: UserSubscriptionMeData;
}

export interface SubscriptionPacksResponse {
  success: boolean;
  data: {
    packs: SubscriptionPack[];
  };
}

export interface SelectActiveTagsPayload {
  activeTagIds: string[];
}

export interface SelectActiveTagsResponse {
  success: boolean;
  message: string;
  data: {
    subscription: {
      tier: SubscriptionTier;
      maxActiveTags: number;
    };
    tags: {
      activeCount: number;
      suspendedCount: number;
      needsTagSelection: boolean;
      assigned: UserTagItem[];
      suspended: UserTagItem[];
    };
  };
}

export interface CreatePurchasePayload {
  packType: PackType;
  paymentProvider?: PaymentProvider;
  metadata?: Record<string, any>;
}

export interface PurchaseRecord {
  id: string;
  userId?: string;
  packType: PackType;
  amountPaise: number;
  currency: string;
  tagsIncluded: number;
  plusDurationMonths: number;
  status: PurchaseStatus;
  paymentProvider: PaymentProvider;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  packDetails?: {
    name: string;
    amountPaise: number;
  };
}

export interface CreatePurchaseResponseData {
  purchaseId: string;
  packType: PackType;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  keyId: string;
  pack: {
    name: string;
    plusDurationMonths: number;
    amountPaise: number;
  };
  prefill?: {
    name?: string;
    contact?: string;
  };
  purchase?: PurchaseRecord;
}

export interface CreatePurchaseResponse {
  success: boolean;
  message: string;
  data: CreatePurchaseResponseData;
}

export interface VerifySubscriptionPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifySubscriptionPaymentResponse {
  success: boolean;
  status?: string;
  message: string;
  data: {
    subscription: Partial<UserSubscription> & {
      id?: string;
      tier: SubscriptionTier;
      maxActiveTags: number;
      hasWhatsappAlerts?: boolean;
      hasAnalytics?: boolean;
      expiresAt?: string;
    };
    purchase?: {
      id: string;
      status: string;
      providerOrderId?: string;
      providerPaymentId?: string;
    };
  };
}

export interface PaymentSuccessDetails {
  planName: string;
  durationMonths: number;
  tier?: SubscriptionTier;
  amountPaise?: number;
  expiresAt?: string | null;
  paymentId?: string;
  orderId?: string;
}

export interface ActivateSubscriptionPayload {
  purchaseId?: string;
  packType?: PackType;
  paymentProvider?: PaymentProvider;
  providerOrderId?: string;
  providerPaymentId?: string;
}

export interface ActivateSubscriptionResponse {
  success: boolean;
  message: string;
  data: {
    subscription: Partial<UserSubscription> & {
      tier: SubscriptionTier;
      maxActiveTags: number;
      expiresAt?: string;
    };
    purchase?: PurchaseRecord;
  };
}

export interface SubscriptionPurchasesResponse {
  success: boolean;
  data: {
    purchases: PurchaseRecord[];
  };
}

