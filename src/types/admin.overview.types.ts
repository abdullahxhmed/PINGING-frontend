export type OverviewPeriod = "today" | "7d" | "30d";

export interface OverviewMeta {
  tz: "Asia/Kolkata";
  period: OverviewPeriod;
  range: {
    start: string; // ISO 8601 UTC (Asia/Kolkata midnight boundary)
    end: string;   // ISO 8601 UTC (Asia/Kolkata midnight boundary)
  };
  previousRange: {
    start: string; // ISO 8601 UTC
    end: string;   // ISO 8601 UTC
  };
  generatedAt: string;
  cached: boolean;
  excludesTestData: boolean; // true by default; false when ?includeTest=1
}

export interface PipelineStage {
  count: number;
  valuePaise: number;
}

export interface OverviewSalesPipeline {
  unpaid: PipelineStage;
  toPack: PipelineStage;
  packing: PipelineStage;
  delivered: PipelineStage;
  cancelledRefunded: PipelineStage;
}

export interface OverviewSalesMetrics {
  revenuePaise: number;
  paidOrders: number;
  checkoutsStarted: number;
  conversionPercent: number | null;
  previous: {
    revenuePaise: number;
    paidOrders: number;
  };
  pipeline: OverviewSalesPipeline;
}

export interface WaitingForTags {
  count: number;
  valuePaise: number;
  oldestAt: string | null; // ISO UTC
  targetHours: number; // 48 hours (2 days)
  orderRefs: string[]; // Order numbers e.g. ["KT304067", "KT564025", "KT659673"]
}

export interface PackVariantStock {
  variantId: string;
  name: string; // "Light", "Dark"
  packs: number;
}

export interface PackAvailable {
  productId: string; // "pair", "complete_set", "stickers", "keychains", "mini_stickers"
  name: string;      // "Pair", "Complete set", "Extra stickers", "Keychains", "Mini stickers"
  packs: number;     // Summed across Light and Dark variants
  variants?: PackVariantStock[];
}

export interface OverviewFulfilmentMetrics {
  waitingForTags: WaitingForTags;
  packsAvailable: PackAvailable[];
  lowStockCount: number;
}

export interface AttentionItem {
  id: string;
  kind: "waiting_for_tags" | "late_shipment" | "unpaid_checkouts" | "low_stock" | "job_errors";
  count: number;
  valuePaise: number | null;
  oldestAt: string | null; // ISO UTC
  targetHours: number | null;
  late: boolean;
  refs: string[];
  route: string;
}

export interface OverviewHealthMetrics {
  callProvider: {
    lastEventAt: string | null; // ISO UTC
  };
  payments: {
    lastCallbackAt: string | null; // ISO UTC
  };
  jobs: {
    errors24h: number;
  };
}

export interface OverviewActivityEvent {
  at: string; // ISO UTC
  type: "order_paid" | "order_delivered" | "call" | "tag_linked";
  ref: string; // order number or tag short code
  customerFirstName: string | null; // privacy: only first name
  summary: string;
  amountPaise: number | null;
  durationSec: number | null;
  outcome: string | null;
  groupedCount: number | null;
}

export interface OverviewLifetimeMetrics {
  users: number;
  registeredTags: number;
  tagsMade: number;
}

export interface UsageMetricPeriod {
  scans: number;
  contactPageVisits: number;
  callsInitiated: number;
  callsConnected: number;
  callsMissed: number;
  ownersReached: number; // Distinct owners who received at least one CONNECTED call
  conversionPercent: number | null; // (visits resulting in a call / total visits) * 100; null on 0 visits
}

export interface OverviewUsageMetrics {
  isApproximate: boolean; // Note: Visitor traffic is bot-filtered & 30s IP-deduplicated
  currentPeriod: UsageMetricPeriod;
  previousPeriod: UsageMetricPeriod;
  allTime: UsageMetricPeriod;
}

export interface TopTagCost {
  tagShortCode: string;
  calls: number;
  billableMinutes: number;
  costPaise: number; // Integer paise
}

export interface OverviewCallCostMetrics {
  ratePerMinutePaise: number; // 150 paise (₹1.50)
  totalBillableMinutes: number; // billable minutes in current period
  estimatedCostPaise: number; // integer paise in current period
  allTimeCostPaise: number; // all-time cost in integer paise
  attributedToTagsPaise: number; // period cost attributed to physical tags
  unattributedPaise: number; // period cost for untagged calls
  averageCostPerConnectedCallPaise: number | null; // (period cost) / (period connected calls); null if 0
  costPerTagWithCallsPaise: number | null; // (period attributed cost) / (period tags with calls); null if 0
  durationSource: "provider" | "estimated";
  config: {
    legs: number; // 2
    gstPercent: number; // 18
  };
  estimatedWithProviderBillingPaise: number; // period cost with 2 legs and GST
  top5TagsByCost: TopTagCost[];
}

export interface OverviewActivationMetrics {
  deliveredTags: number;
  tagsLinkedToVehicles: number;
  tagsWithAtLeastOneCall: number;
  medianDaysDeliveryToLinking: number | null; // null if historical delivery timestamps are unavailable
}

export interface OverviewPlusMetrics {
  activePlusBySource: {
    included_with_order: number;
    paid: number;
    admin_grant: number;
    totalActivePlus: number;
  };
  pendingGrants: number; // Starter packs paid but awaiting physical tag pairing or guest claim
  expiringInNext30Days: number;
  nextExpiryDate: string | null;
}

export interface ConsolidatedTagCounts {
  readyToSell: number; // In warehouse minus reserved / committed demand
  inUse: number;       // Assigned to a vehicle/resource
  inWarehouse: number; // Physical inventory in stock (state = IN_STOCK)
  reserved: number;    // Committed demand / active reservations
  totalPhysicalTags: number; // Total physical tags generated
}

export interface AdminTelephonySummary {
  period: string;
  startsAt: string;
  endsAt: string;
  totalPlatformMinutesThisMonth: number;
  totalActualMinutesThisMonth: number;
  totalCallsThisMonth: number;
  connectedCallsThisMonth: number;
  carrierCost: {
    provider: string;
    ratePerMinuteRupees: number;
    gstPercent: number;
    rateWithGstRupees: number;
    estimatedCostPaise: number;
    estimatedCostRupees: number;
    effectiveCostPaise: number;
    effectiveCostRupees: number;
  };
  subscriptionRevenue: {
    collectedRevenueRupees: number;
    refundedRupees: number;
    grossRevenueRupees: number;
    netRevenueRupees: number;
  };
  margin: {
    telephonyMarginRupees: number;
    telephonyMarginPercent: number | null;
    telecomCostRatioPercent: number | null;
  };
  fupOversight: {
    thresholdMinutes: number;
    thresholdSeconds: number;
    usersExceedingFupCount: number;
    totalActiveUsersWithCalls: number;
    fupExceedRatioPercent: number;
  };
  callDurationOversight: {
    averageDurationSeconds: number;
    averageDurationMinutes: number;
    averageDurationFormatted: string;
    p50DurationSeconds: number;
    p90DurationSeconds: number;
    maxDurationSeconds: number;
    maxDurationFormatted: string;
    hardCapMinutes: number;
    hardCapSeconds: number;
    callsExceeding10MinCount: number;
    isWithin10MinCap: boolean;
    complianceStatus: 'COMPLIANT' | 'CAP_EXCEEDED';
  };
}

export interface AdminTelephonyFupUser {
  userId: string;
  userName: string;
  totalCalls: number;
  connectedCalls: number;
  actualMinutes: number;
  billedMinutes: number;
  effectiveCostRupees: number;
  excessMinutes: number;
}

export interface AdminTelephonyUsageSection {
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  actualTalkTimeSeconds: number;
  actualTalkTimeMinutes: number;
  actualTalkTimeFormatted: string;
  averageCallDurationSeconds: number;
  averageCallDurationFormatted: string;
  longestCallSeconds: number;
  longestCallFormatted: string;
  totalSessions: number;
  p50DurationSeconds: number;
  p90DurationSeconds: number;
}

export interface AdminTelephonyFinancialsSection {
  estimatedCarrierCostPaise: number;
  estimatedCarrierCostRupees: number;
  actualCarrierCostPaise: number;
  actualCarrierCostRupees: number;
  effectiveCarrierCostPaise: number;
  effectiveCarrierCostRupees: number;
  hasActualCarrierBillingData: boolean;
  subscriptionRevenuePaise: number;
  subscriptionRevenueRupees: number;
  grossSubscriptionRevenuePaise: number;
  grossSubscriptionRevenueRupees: number;
  costPerActiveSubscriberPaise: number;
  costPerActiveSubscriberRupees: number;
  grossContributionPaise: number;
  grossContributionRupees: number;
  grossContributionMarginPercent: number | null;
  activeSubscribersCount: number;
  carrierRatePerMinuteRupees: number;
  carrierGstPercent: number;
  effectiveCarrierRateRupees: number;
}

export interface AdminTelephonyApproachingUser {
  userId: string;
  userName: string;
  totalCalls: number;
  connectedCalls: number;
  actualMinutes: number;
  billedMinutes: number;
  effectiveCostRupees: number;
  remainingSeconds: number;
}

export interface AdminTelephonyLimitsSection {
  fupThresholdMinutes: number;
  fupThresholdSeconds: number;
  usersExceedingFupCount: number;
  usersApproachingFupCount: number;
  callsExceeding10MinCount: number;
  isWithin10MinCap: boolean;
  totalMinutesConsumed: number;
  totalActualMinutesConsumed: number;
  expectedUsageMinutes: number;
  consumptionRatioPercent: number | null;
  totalActiveUsersWithCalls: number;
  usersExceedingFup: AdminTelephonyFupUser[];
  usersApproachingFup: AdminTelephonyApproachingUser[];
}

export interface AdminTelephonyOverviewResponse {
  period: {
    name: 'this_month' | 'last_month' | 'last_30d' | 'all_time' | string;
    label: string;
    startsAt: string;
    endsAt: string;
  };
  usage: AdminTelephonyUsageSection;
  financials: AdminTelephonyFinancialsSection;
  usageLimits: AdminTelephonyLimitsSection;
  summary: AdminTelephonySummary;
  totalPlatformMinutesThisMonth: number;
  totalActualMinutesThisMonth: number;
  estimatedCarrierCostRupees: number;
  effectiveCarrierCostRupees: number;
  subscriptionRevenueRupees: number;
  grossSubscriptionRevenueRupees: number;
  telephonyMarginRupees: number;
  usersExceedingFupCount: number;
  usersApproachingFupCount?: number;
  averageCallDurationSeconds: number;
  averageCallDurationFormatted: string;
  maxCallDurationSeconds: number;
  callsExceeding10MinCount: number;
  isWithin10MinCap: boolean;
  usersExceedingFup: AdminTelephonyFupUser[];
  usersApproachingFup?: AdminTelephonyApproachingUser[];
  providerConfig: {
    provider: string;
    ratePerMinutePaise: number;
    billingIncrementSeconds: number;
    minimumBillableSeconds: number;
    gstRate: number;
  };
  metrics: {
    totalCalls: number;
    connectedCalls: number;
    failedCalls: number;
    actualCallMinutes: number;
    actualCallSeconds: number;
    billedCallMinutes: number;
    billedCallSeconds: number;
    averageDurationSeconds: number;
    p50DurationSeconds: number;
    p90DurationSeconds: number;
    maxDurationSeconds: number;
    callsExceeding10MinCount: number;
    isWithin10MinCap: boolean;
  };
  expenditure: {
    providerReportedCostPaise: number;
    providerReportedCostRupees: number;
    estimatedCostPaise: number;
    estimatedCostRupees: number;
    effectiveCostPaise: number;
    effectiveCostRupees: number;
    costSource: string;
  };
  unitEconomics: {
    activeSubscribers: number;
    activeTags: number;
    costPerActiveSubscriberPaise: number;
    costPerActiveSubscriberRupees: number;
    costPerActiveTagPaise: number;
    costPerActiveTagRupees: number;
  };
  revenueComparison: {
    collectedRevenuePaise: number;
    collectedRevenueRupees: number;
    refundedPaise: number;
    refundedRupees: number;
    applicableGstPaise: number;
    applicableGstRupees: number;
    gatewayFeePaise: number;
    gatewayFeeRupees: number;
    netRevenuePaise: number;
    netRevenueRupees: number;
    effectiveTelephonyCostPaise: number;
    effectiveTelephonyCostRupees: number;
    telecomMarginPaise: number;
    telecomMarginRupees: number;
    telecomCostRatioPercent: number | null;
  };
  highUsageAccounts: any[];
}

export interface AdminOverviewResponse {
  meta: OverviewMeta;
  sales: OverviewSalesMetrics;
  fulfilment: OverviewFulfilmentMetrics;
  attention: AttentionItem[];
  health: OverviewHealthMetrics;
  activity: OverviewActivityEvent[];
  lifetime: OverviewLifetimeMetrics;
  usage: OverviewUsageMetrics;
  callCost: OverviewCallCostMetrics;
  activation: OverviewActivationMetrics;
  plus: OverviewPlusMetrics;
  consolidatedTagCounts: ConsolidatedTagCounts;
  unavailable: string[]; // List of metric dot-paths that could not be computed
}
