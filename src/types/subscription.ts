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

export interface CreatePurchaseResponse {
  success: boolean;
  message: string;
  data: {
    purchase: PurchaseRecord;
    pack: {
      name: string;
      amountPaise: number;
    };
  };
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
