import type { AdminOverviewResponse } from '../../../types/admin.overview.types';

/**
 * Format paise into Indian Rupees with en-IN grouping and no floats.
 * e.g., 376200 -> "₹3,762", 0 -> "₹0", null/undefined -> "–"
 */
export function formatPaise(paise?: number | null): string {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '–';
  }
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/**
 * Format count with en-IN grouping. null renders as "–".
 */
export function formatCount(count?: number | null): string {
  if (count === null || count === undefined || isNaN(count)) {
    return '–';
  }
  return count.toLocaleString('en-IN');
}

/**
 * Plural safe noun helper: e.g. pluralize(1, 'order', 'orders') -> '1 order'
 */
export function pluralize(count: number | null | undefined, singular: string, plural: string): string {
  if (count === null || count === undefined || isNaN(count)) {
    return `– ${plural}`;
  }
  return `${count.toLocaleString('en-IN')} ${count === 1 ? singular : plural}`;
}

/**
 * Format days remaining until a given target date ISO.
 * Returns null or formatted string like "363d remaining" or "due today"
 */
export function formatDaysRemaining(targetDateIso?: string | null): { text: string; isPast: boolean } | null {
  if (!targetDateIso) return null;
  const target = new Date(targetDateIso);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d ago`, isPast: true };
  }
  if (diffDays === 0) {
    return { text: 'due today', isPast: false };
  }
  return { text: `${diffDays}d remaining`, isPast: false };
}

/**
 * Format ISO string to IST short date: "27 Oct 2027"
 */
export function formatIstDate(isoString?: string | null): string {
  if (!isoString) return '–';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '–';
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '–';
  }
}

/**
 * Format ISO string to relative time (IST contextual): "1h ago", "2d ago", "just now"
 */
export function formatRelativeTime(isoString?: string | null, referenceNowMs = Date.now()): string {
  if (!isoString) return '–';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '–';
    const diffMs = referenceNowMs - d.getTime();
    if (diffMs < 0) return 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return '–';
  }
}

/**
 * Format date range for the header
 */
export function formatOverviewDateRange(
  period: string,
  startIso?: string,
  endIso?: string,
  prevStartIso?: string,
  prevEndIso?: string
): string {
  if (!startIso || !endIso) {
    if (period === 'today') return 'Today, compared with yesterday';
    if (period === '30d') return 'Last 30 days, compared with previous 30 days';
    return 'Last 7 days, compared with previous 7 days';
  }

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    });
  };

  const currentPart = `${fmt(startIso)} to ${fmt(endIso)}`;
  if (prevStartIso && prevEndIso) {
    return `${currentPart}, compared with ${fmt(prevStartIso)} to ${fmt(prevEndIso)}`;
  }
  return currentPart;
}

/**
 * Pure function to format the executive briefing sentence directly from response data.
 * Template: "{n} paid orders {period}, ₹{revenue} in sales. {k} waiting for tags. {c} calls came in and {m} missed."
 * Handles empty cases ("No sales yet this week.", "No sales yet today.", "No sales yet in the last 30 days.").
 */
export function generateBriefingSentence(data: AdminOverviewResponse): string {
  const period = data.meta?.period || '7d';
  const periodLabel = period === 'today' ? 'today' : period === '30d' ? 'in the last 30 days' : 'this week';

  const paidOrders = data.sales?.paidOrders ?? 0;
  const revenuePaise = data.sales?.revenuePaise ?? 0;
  const revenueRupees = Math.round(revenuePaise / 100).toLocaleString('en-IN');
  const waitingForTags = data.fulfilment?.waitingForTags?.count ?? 0;
  const callsConnected = data.usage?.currentPeriod?.callsConnected ?? 0;
  const callsMissed = data.usage?.currentPeriod?.callsMissed ?? 0;

  // Empty state check
  if (paidOrders === 0 && revenuePaise === 0) {
    if (period === 'today') return 'No sales yet today.';
    if (period === '30d') return 'No sales yet in the last 30 days.';
    return 'No sales yet this week.';
  }

  // Singular vs plural for orders
  const ordersPart = `${paidOrders} paid ${paidOrders === 1 ? 'order' : 'orders'} ${periodLabel}, ₹${revenueRupees} in sales.`;
  const waitingPart = `${waitingForTags} waiting for tags.`;

  // Calls part
  let callsPart = '';
  if (callsConnected === 0 && callsMissed === 0) {
    callsPart = 'No calls received.';
  } else if (callsConnected > 0 && callsMissed === 0) {
    callsPart = `${callsConnected} ${callsConnected === 1 ? 'call came' : 'calls came'} in and 0 missed.`;
  } else {
    callsPart = `${callsConnected} ${callsConnected === 1 ? 'call came' : 'calls came'} in and ${callsMissed} missed.`;
  }

  return `${ordersPart} ${waitingPart} ${callsPart}`;
}
