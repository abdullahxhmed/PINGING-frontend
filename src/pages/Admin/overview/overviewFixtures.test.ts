import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  formatPaise,
  formatCount,
  pluralize,
  formatDaysRemaining,
  formatRelativeTime,
  generateBriefingSentence,
} from './overviewFormatters.ts';
import type { AdminOverviewResponse } from '../../../types/admin.overview.types.ts';

// ---------------------------------------------------------------------------
// FIXTURE A: Approved Sample
// ---------------------------------------------------------------------------
const fixtureApprovedSample: AdminOverviewResponse = {
  meta: {
    tz: 'Asia/Kolkata',
    period: '7d',
    range: {
      start: '2026-10-22T00:00:00.000Z',
      end: '2026-10-29T00:00:00.000Z',
    },
    previousRange: {
      start: '2026-10-15T00:00:00.000Z',
      end: '2026-10-22T00:00:00.000Z',
    },
    generatedAt: '2026-10-29T02:30:00.000Z',
    cached: false,
    excludesTestData: true,
  },
  sales: {
    revenuePaise: 376200,
    paidOrders: 14,
    checkoutsStarted: 22,
    conversionPercent: 64,
    pipeline: {
      unpaid: { count: 6, valuePaise: 305100 },
      toPack: { count: 3, valuePaise: 43700 },
      packing: { count: 7, valuePaise: 125300 },
      delivered: { count: 4, valuePaise: 71600 },
      cancelledRefunded: { count: 2, valuePaise: 197800 },
    },
    previous: {
      revenuePaise: 0,
      paidOrders: 0,
    },
  },
  fulfilment: {
    waitingForTags: {
      count: 3,
      valuePaise: 43700,
      oldestAt: '2026-10-28T01:30:00.000Z',
      targetHours: 48,
      orderRefs: ['KT659673', 'KT564025'],
    },
    packsAvailable: [
      { productId: 'pair', name: 'Pair', packs: 82 },
      { productId: 'complete_set', name: 'Complete set', packs: 82 },
    ],
    lowStockCount: 0,
  },
  attention: [
    {
      id: 'att-1',
      kind: 'waiting_for_tags',
      count: 3,
      valuePaise: 43700,
      oldestAt: '2026-10-28T01:30:00.000Z',
      targetHours: 48,
      late: false,
      refs: ['KT659673', 'KT564025'],
      route: '/admin/fulfillment',
    },
  ],
  health: {
    callProvider: { lastEventAt: '2026-10-28T02:00:00.000Z' },
    payments: { lastCallbackAt: '2026-10-28T18:00:00.000Z' },
    jobs: { errors24h: 0 },
  },
  activity: [
    {
      at: '2026-10-29T00:30:00.000Z',
      type: 'order_delivered',
      ref: 'KT-DEL-01',
      customerFirstName: 'Vikram',
      summary: 'Pair ×4',
      amountPaise: 71600,
      durationSec: null,
      outcome: 'Delivered',
      groupedCount: 4,
    },
  ],
  lifetime: {
    users: 23,
    registeredTags: 10,
    tagsMade: 334,
  },
  usage: {
    isApproximate: false,
    currentPeriod: {
      scans: 10,
      contactPageVisits: 15,
      callsInitiated: 2,
      callsConnected: 1,
      callsMissed: 1,
      ownersReached: 2,
      conversionPercent: 13.3,
    },
    previousPeriod: {
      scans: 0, contactPageVisits: 0, callsInitiated: 0, callsConnected: 0, callsMissed: 0, ownersReached: 0, conversionPercent: null,
    },
    allTime: {
      scans: 50, contactPageVisits: 60, callsInitiated: 14, callsConnected: 13, callsMissed: 1, ownersReached: 10, conversionPercent: 23.3,
    },
  },
  callCost: {
    ratePerMinutePaise: 150,
    totalBillableMinutes: 1,
    estimatedCostPaise: 150,
    allTimeCostPaise: 1800,
    attributedToTagsPaise: 150,
    unattributedPaise: 0,
    averageCostPerConnectedCallPaise: 150,
    costPerTagWithCallsPaise: 150,
    durationSource: 'estimated',
    config: { legs: 2, gstPercent: 18 },
    estimatedWithProviderBillingPaise: 354,
    top5TagsByCost: [],
  },
  activation: {
    deliveredTags: 4,
    tagsLinkedToVehicles: 10,
    tagsWithAtLeastOneCall: 4,
    medianDaysDeliveryToLinking: null,
  },
  plus: {
    activePlusBySource: {
      included_with_order: 10,
      paid: 0,
      admin_grant: 0,
      totalActivePlus: 10,
    },
    pendingGrants: 4,
    expiringInNext30Days: 0,
    nextExpiryDate: '2027-10-27T10:00:00.000Z',
  },
  consolidatedTagCounts: {
    readyToSell: 267,
    inUse: 10,
    inWarehouse: 334,
    reserved: 0,
    totalPhysicalTags: 334,
  },
  unavailable: [],
};

// ---------------------------------------------------------------------------
// FIXTURE B: Empty Database
// ---------------------------------------------------------------------------
const fixtureEmptyDb: AdminOverviewResponse = {
  meta: {
    tz: 'Asia/Kolkata',
    period: '7d',
    range: { start: '2026-10-22T00:00:00.000Z', end: '2026-10-29T00:00:00.000Z' },
    previousRange: { start: '2026-10-15T00:00:00.000Z', end: '2026-10-22T00:00:00.000Z' },
    generatedAt: '2026-10-29T02:30:00.000Z',
    cached: false,
    excludesTestData: true,
  },
  sales: {
    revenuePaise: 0,
    paidOrders: 0,
    checkoutsStarted: 0,
    conversionPercent: null,
    pipeline: {
      unpaid: { count: 0, valuePaise: 0 },
      toPack: { count: 0, valuePaise: 0 },
      packing: { count: 0, valuePaise: 0 },
      delivered: { count: 0, valuePaise: 0 },
      cancelledRefunded: { count: 0, valuePaise: 0 },
    },
    previous: { revenuePaise: 0, paidOrders: 0 },
  },
  fulfilment: {
    waitingForTags: { count: 0, valuePaise: 0, oldestAt: null, targetHours: 48, orderRefs: [] },
    packsAvailable: [],
    lowStockCount: 0,
  },
  attention: [],
  health: {
    callProvider: { lastEventAt: null },
    payments: { lastCallbackAt: null },
    jobs: { errors24h: 0 },
  },
  activity: [],
  lifetime: { users: 0, registeredTags: 0, tagsMade: 0 },
  usage: {
    isApproximate: false,
    currentPeriod: { scans: 0, contactPageVisits: 0, callsInitiated: 0, callsConnected: 0, callsMissed: 0, ownersReached: 0, conversionPercent: null },
    previousPeriod: { scans: 0, contactPageVisits: 0, callsInitiated: 0, callsConnected: 0, callsMissed: 0, ownersReached: 0, conversionPercent: null },
    allTime: { scans: 0, contactPageVisits: 0, callsInitiated: 0, callsConnected: 0, callsMissed: 0, ownersReached: 0, conversionPercent: null },
  },
  callCost: {
    ratePerMinutePaise: 150,
    totalBillableMinutes: 0,
    estimatedCostPaise: 0,
    allTimeCostPaise: 0,
    attributedToTagsPaise: 0,
    unattributedPaise: 0,
    averageCostPerConnectedCallPaise: null,
    costPerTagWithCallsPaise: null,
    durationSource: 'estimated',
    config: { legs: 2, gstPercent: 18 },
    estimatedWithProviderBillingPaise: 0,
    top5TagsByCost: [],
  },
  activation: { deliveredTags: 0, tagsLinkedToVehicles: 0, tagsWithAtLeastOneCall: 0, medianDaysDeliveryToLinking: null },
  plus: {
    activePlusBySource: { included_with_order: 0, paid: 0, admin_grant: 0, totalActivePlus: 0 },
    pendingGrants: 0,
    expiringInNext30Days: 0,
    nextExpiryDate: null,
  },
  consolidatedTagCounts: { readyToSell: 0, inUse: 0, inWarehouse: 0, reserved: 0, totalPhysicalTags: 0 },
  unavailable: [],
};

// ---------------------------------------------------------------------------
// FIXTURE C: All-Null / Missing Values
// ---------------------------------------------------------------------------
const fixtureAllNull: AdminOverviewResponse = {
  meta: {
    tz: 'Asia/Kolkata',
    period: '7d',
    range: { start: '', end: '' },
    previousRange: { start: '', end: '' },
    generatedAt: '',
    cached: false,
    excludesTestData: true,
  },
  sales: {
    revenuePaise: null as any,
    paidOrders: null as any,
    checkoutsStarted: null as any,
    conversionPercent: null,
    pipeline: null as any,
    previous: { revenuePaise: null as any, paidOrders: null as any },
  },
  fulfilment: {
    waitingForTags: null as any,
    packsAvailable: [],
    lowStockCount: null as any,
  },
  attention: [],
  health: { callProvider: { lastEventAt: null }, payments: { lastCallbackAt: null }, jobs: { errors24h: 0 } },
  activity: [],
  lifetime: { users: null as any, registeredTags: null as any, tagsMade: null as any },
  usage: {
    isApproximate: false,
    currentPeriod: null as any,
    previousPeriod: null as any,
    allTime: null as any,
  },
  callCost: {
    ratePerMinutePaise: 150,
    totalBillableMinutes: null as any,
    estimatedCostPaise: null as any,
    allTimeCostPaise: null as any,
    attributedToTagsPaise: 0,
    unattributedPaise: 0,
    averageCostPerConnectedCallPaise: null,
    costPerTagWithCallsPaise: null,
    durationSource: 'estimated',
    config: { legs: 2, gstPercent: 18 },
    estimatedWithProviderBillingPaise: 0,
    top5TagsByCost: [],
  },
  activation: { deliveredTags: 0, tagsLinkedToVehicles: null as any, tagsWithAtLeastOneCall: null as any, medianDaysDeliveryToLinking: null },
  plus: {
    activePlusBySource: { included_with_order: 0, paid: 0, admin_grant: 0, totalActivePlus: null as any },
    pendingGrants: null as any,
    expiringInNext30Days: 0,
    nextExpiryDate: null,
  },
  consolidatedTagCounts: null as any,
  unavailable: [],
};

// ---------------------------------------------------------------------------
// FIXTURE E: Very Large Numbers
// ---------------------------------------------------------------------------
const fixtureVeryLarge: AdminOverviewResponse = {
  ...fixtureApprovedSample,
  sales: {
    ...fixtureApprovedSample.sales,
    revenuePaise: 1250000000, // ₹1,25,00,000
    paidOrders: 48920,
    checkoutsStarted: 98120,
  },
  fulfilment: {
    ...fixtureApprovedSample.fulfilment,
    waitingForTags: {
      ...fixtureApprovedSample.fulfilment.waitingForTags,
      count: 1500,
    },
  },
  callCost: {
    ...fixtureApprovedSample.callCost,
    estimatedCostPaise: 5000000, // ₹50,000
    allTimeCostPaise: 75000000,  // ₹7,50,000
    totalBillableMinutes: 33333,
  },
  lifetime: {
    users: 125000,
    registeredTags: 88400,
    tagsMade: 250000,
  },
};

describe('Overview Fixtures & Edge-case Formatter Verification', () => {
  test('(a) Approved Sample formats accurately without null/undefined/NaN', () => {
    const briefing = generateBriefingSentence(fixtureApprovedSample);
    assert.strictEqual(briefing, '14 paid orders this week, ₹3,762 in sales. 3 waiting for tags. 1 call came in and 1 missed.');
    assert.strictEqual(formatPaise(fixtureApprovedSample.sales.revenuePaise), '₹3,762');
    assert.strictEqual(formatCount(fixtureApprovedSample.lifetime.tagsMade), '334');
    assert.strictEqual(briefing.includes('NaN'), false);
    assert.strictEqual(briefing.includes('undefined'), false);
    assert.strictEqual(briefing.includes('null'), false);
  });

  test('(b) Empty Database Fixture formats cleanly to zero state', () => {
    const briefing = generateBriefingSentence(fixtureEmptyDb);
    assert.strictEqual(briefing, 'No sales yet this week.');
    assert.strictEqual(formatPaise(fixtureEmptyDb.sales.revenuePaise), '₹0');
    assert.strictEqual(formatCount(fixtureEmptyDb.sales.paidOrders), '0');
    assert.strictEqual(formatCount(fixtureEmptyDb.fulfilment.waitingForTags.count), '0');
    assert.strictEqual(briefing.includes('NaN'), false);
  });

  test('(c) All-Null Fixture gracefully falls back to "–" and never renders NaN/undefined', () => {
    assert.strictEqual(formatPaise(fixtureAllNull.sales.revenuePaise), '–');
    assert.strictEqual(formatCount(fixtureAllNull.sales.paidOrders), '–');
    assert.strictEqual(formatCount(fixtureAllNull.lifetime.users), '–');
    assert.strictEqual(pluralize(fixtureAllNull.sales.paidOrders, 'order', 'orders'), '– orders');
    assert.strictEqual(formatDaysRemaining(fixtureAllNull.plus.nextExpiryDate), null);
    assert.strictEqual(formatRelativeTime(fixtureAllNull.meta.generatedAt), '–');
  });

  test('(e) Very Large Numbers format properly with en-IN separators', () => {
    assert.strictEqual(formatPaise(fixtureVeryLarge.sales.revenuePaise), '₹1,25,00,000');
    assert.strictEqual(formatCount(fixtureVeryLarge.sales.paidOrders), '48,920');
    assert.strictEqual(formatPaise(fixtureVeryLarge.callCost.allTimeCostPaise), '₹7,50,000');
    assert.strictEqual(formatCount(fixtureVeryLarge.lifetime.tagsMade), '2,50,000');
  });
});

