import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  formatPaise,
  formatCount,
  pluralize,
  formatDaysRemaining,
  formatIstDate,
  formatRelativeTime,
  generateBriefingSentence,
} from './overviewFormatters.ts';
import type { AdminOverviewResponse } from '../../../types/admin.overview.types.ts';

describe('Overview Formatters Unit Tests', () => {
  test('formatPaise formats paise into Indian Rupees with en-IN grouping without floats', () => {
    assert.strictEqual(formatPaise(376200), '₹3,762');
    assert.strictEqual(formatPaise(0), '₹0');
    assert.strictEqual(formatPaise(150), '₹2'); // 1.5 rounded to 2 rupees
    assert.strictEqual(formatPaise(10000000), '₹1,00,000');
    assert.strictEqual(formatPaise(null), '–');
    assert.strictEqual(formatPaise(undefined), '–');
    assert.strictEqual(formatPaise(NaN), '–');
  });

  test('formatCount formats counts with null safe fallback', () => {
    assert.strictEqual(formatCount(14), '14');
    assert.strictEqual(formatCount(10000), '10,000');
    assert.strictEqual(formatCount(0), '0');
    assert.strictEqual(formatCount(null), '–');
  });

  test('pluralize handles single, multiple and null correctly', () => {
    assert.strictEqual(pluralize(1, 'order', 'orders'), '1 order');
    assert.strictEqual(pluralize(14, 'order', 'orders'), '14 orders');
    assert.strictEqual(pluralize(0, 'order', 'orders'), '0 orders');
    assert.strictEqual(pluralize(null, 'order', 'orders'), '– orders');
  });

  test('formatDaysRemaining computes days remaining', () => {
    const futureDate = new Date(Date.now() + 10 * 86400000).toISOString();
    const result = formatDaysRemaining(futureDate);
    assert.ok(result);
    assert.ok(result.text.includes('d remaining'));
    assert.strictEqual(result.isPast, false);
    assert.strictEqual(formatDaysRemaining(null), null);
  });

  test('formatRelativeTime handles seconds, minutes, hours, days', () => {
    const now = Date.now();
    assert.strictEqual(formatRelativeTime(new Date(now - 10000).toISOString(), now), 'just now');
    assert.strictEqual(formatRelativeTime(new Date(now - 300000).toISOString(), now), '5m ago');
    assert.strictEqual(formatRelativeTime(new Date(now - 7200000).toISOString(), now), '2h ago');
    assert.strictEqual(formatRelativeTime(new Date(now - 86400000 * 3).toISOString(), now), '3d ago');
    assert.strictEqual(formatRelativeTime(null), '–');
  });
});

describe('generateBriefingSentence Unit Tests', () => {
  const baseMock: AdminOverviewResponse = {
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
      previous: { revenuePaise: 0, paidOrders: 0 },
    },
    fulfilment: {
      waitingForTags: {
        count: 3,
        valuePaise: 43700,
        oldestAt: null,
        targetHours: 48,
        orderRefs: ['KT659673', 'KT564025'],
      },
      packsAvailable: [
        { productId: 'pair', name: 'Pair', packs: 82 },
        { productId: 'complete_set', name: 'Complete set', packs: 82 },
      ],
      lowStockCount: 0,
    },
    attention: [],
    health: {
      callProvider: { lastEventAt: null },
      payments: { lastCallbackAt: null },
      jobs: { errors24h: 0 },
    },
    activity: [],
    lifetime: { users: 23, registeredTags: 10, tagsMade: 334 },
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
      nextExpiryDate: null,
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

  test('generates sentence for approved sample', () => {
    const s = generateBriefingSentence(baseMock);
    assert.strictEqual(s, '14 paid orders this week, ₹3,762 in sales. 3 waiting for tags. 1 call came in and 1 missed.');
  });

  test('generates sentence for 1 order', () => {
    const singleOrder = {
      ...baseMock,
      sales: {
        ...baseMock.sales,
        paidOrders: 1,
        revenuePaise: 29900,
      },
      fulfilment: {
        ...baseMock.fulfilment,
        waitingForTags: {
          ...baseMock.fulfilment.waitingForTags,
          count: 1,
        },
      },
    };
    const s = generateBriefingSentence(singleOrder);
    assert.strictEqual(s, '1 paid order this week, ₹299 in sales. 1 waiting for tags. 1 call came in and 1 missed.');
  });

  test('generates empty period sentence', () => {
    const emptyMock: AdminOverviewResponse = {
      ...baseMock,
      sales: {
        ...baseMock.sales,
        paidOrders: 0,
        revenuePaise: 0,
      },
    };
    assert.strictEqual(generateBriefingSentence(emptyMock), 'No sales yet this week.');

    const emptyToday: AdminOverviewResponse = {
      ...emptyMock,
      meta: { ...emptyMock.meta, period: 'today' },
    };
    assert.strictEqual(generateBriefingSentence(emptyToday), 'No sales yet today.');
  });
});
