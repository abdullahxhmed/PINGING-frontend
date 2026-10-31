import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminApi } from '../../lib/adminApi';
import type { AdminCommunicationSession } from '../../types/admin';
import type { AdminTelephonyOverviewResponse } from '../../types/admin.overview.types';
import { formatRelativeTime } from './overview/overviewFormatters';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Radio,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  Filter,
  X,
} from 'lucide-react';

type TelephonyPeriod = 'all_time' | 'this_month' | 'last_month' | 'last_30d';

export const AdminCommunicationsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AdminCommunicationSession[]>([]);
  const [telephonyOverview, setTelephonyOverview] = useState<AdminTelephonyOverviewResponse | null>(null);
  const [telephonyPeriod, setTelephonyPeriod] = useState<TelephonyPeriod>('this_month');
  const [isTelephonyLoading, setIsTelephonyLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Security: Phone number masking & authorized reveal state
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [revealedPhoneIds, setRevealedPhoneIds] = useState<Set<string>>(new Set());

  // Session table state
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Financial gross breakdown expand toggle
  const [showGrossBreakdown, setShowGrossBreakdown] = useState(false);

  // Expanded row ID for nested calls
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const fetchTelephonyOverview = useCallback(async (period: TelephonyPeriod = telephonyPeriod) => {
    setIsTelephonyLoading(true);
    try {
      const data = await adminApi.getTelephonyOverview(period);
      setTelephonyOverview(data);
    } catch (err) {
      console.error('Failed to fetch telephony overview:', err);
    } finally {
      setIsTelephonyLoading(false);
    }
  }, [telephonyPeriod]);

  const handlePeriodChange = (newPeriod: TelephonyPeriod) => {
    setTelephonyPeriod(newPeriod);
    fetchTelephonyOverview(newPeriod);
  };

  const fetchCommunications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res] = await Promise.all([
        adminApi.getCommunications({
          page,
          limit,
          status: statusFilter,
        }) as Promise<any>,
        fetchTelephonyOverview(telephonyPeriod),
      ]);
      const payload = res?.data || res;
      setSessions(payload?.sessions || []);
      setTotal(payload?.total || 0);
      setTotalPages(payload?.totalPages || 1);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch communication sessions');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, fetchTelephonyOverview, telephonyPeriod]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const toggleExpand = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  const toggleRevealPhone = (key: string) => {
    setRevealedPhoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const maskPhoneNumber = (phone?: string | null): string => {
    if (!phone || phone === '—') return '—';
    const clean = phone.trim();
    if (clean.startsWith('v1:') || clean.length > 25) {
      return '•••••••• (Encrypted)';
    }
    if (clean.length <= 4) return '••••';
    const last4 = clean.slice(-4);
    const prefix = clean.startsWith('+') ? clean.slice(0, 3) + ' ' : '';
    return `${prefix}••••••${last4}`;
  };

  // Indian number format helpers
  const formatIndianNumber = (num?: number | null): string => {
    if (num == null || isNaN(num)) return '—';
    return num.toLocaleString('en-IN');
  };

  const formatRupees = (amount?: number | null): string => {
    if (amount == null || isNaN(amount)) return '—';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Duration formatter: drops zero minutes (e.g. "15s" instead of "0m 15s", "2m 28s")
  const formatDuration = (seconds?: number | null): string => {
    if (seconds == null || isNaN(seconds)) return '—';
    const totalSecs = Math.round(seconds);
    if (totalSecs === 0) return '0s';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Quick filter on sessions when clicking summary indicators
  const applyQuickFilter = (type: 'not_answered' | 'connected' | 'all') => {
    setActiveQuickFilter(type === 'all' ? null : type);
    if (type === 'not_answered') {
      setStatusFilter('PENDING');
      setPage(1);
    } else if (type === 'connected') {
      setStatusFilter('COMPLETED');
      setPage(1);
    } else {
      setStatusFilter('ALL');
      setPage(1);
    }
  };

  // Filtered session list if quick filter is active
  const displayedSessions = useMemo(() => {
    if (!activeQuickFilter) return sessions;
    if (activeQuickFilter === 'not_answered') {
      return sessions.filter((s) => s.status !== 'COMPLETED' || (s.callCount === 0));
    }
    if (activeQuickFilter === 'connected') {
      return sessions.filter((s) => s.status === 'COMPLETED' && (s.callCount ?? 0) > 0);
    }
    return sessions;
  }, [sessions, activeQuickFilter]);

  // Derived metrics from data
  const billedSeconds = (telephonyOverview?.usageLimits?.totalMinutesConsumed || 0) * 60;
  const talkSeconds = telephonyOverview?.usage?.actualTalkTimeSeconds || 0;
  const billingEfficiencyPercent =
    billedSeconds > 0
      ? Math.min(100, Math.round((talkSeconds / billedSeconds) * 100))
      : null;

  // Cost per connected call derivation
  const connectedCallsCount = telephonyOverview?.usage?.connectedCalls ?? 0;
  const estimatedCost = telephonyOverview?.financials?.estimatedCarrierCostRupees ?? null;
  const costPerConnectedCall =
    connectedCallsCount > 0 && estimatedCost != null
      ? estimatedCost / connectedCallsCount
      : null;

  // Needs Attention items
  const attentionItems = useMemo(() => {
    if (!telephonyOverview) return [];
    const items: Array<{
      id: string;
      label: string;
      actionText: string;
      onClick: () => void;
      state: 'danger' | 'amber' | 'neutral';
    }> = [];

    // 1. Users exceeding limit
    if (telephonyOverview.usageLimits.usersExceedingFupCount > 0) {
      const count = telephonyOverview.usageLimits.usersExceedingFupCount;
      items.push({
        id: 'fup_exceeded',
        label: `${count} ${count === 1 ? 'user' : 'users'} over the monthly limit (> 5m talk time)`,
        actionText: 'View limits',
        onClick: () => {
          document.getElementById('monthly-limits-section')?.scrollIntoView({ behavior: 'smooth' });
        },
        state: 'danger',
      });
    }

    // 2. Not-answered calls
    if (telephonyOverview.usage.missedCalls > 0) {
      const count = telephonyOverview.usage.missedCalls;
      items.push({
        id: 'missed_calls',
        label: `${count} ${count === 1 ? 'call was' : 'calls were'} not answered`,
        actionText: 'Filter log',
        onClick: () => {
          applyQuickFilter('not_answered');
          document.getElementById('session-log-section')?.scrollIntoView({ behavior: 'smooth' });
        },
        state: 'amber',
      });
    }

    // 3. Carrier invoice pending
    if (!telephonyOverview.financials.hasActualCarrierBillingData) {
      items.push({
        id: 'carrier_invoice_pending',
        label: 'Carrier invoice pending from provider (Edesy)',
        actionText: 'View statement',
        onClick: () => {
          document.getElementById('money-statement-section')?.scrollIntoView({ behavior: 'smooth' });
        },
        state: 'neutral',
      });
    }

    return items;
  }, [telephonyOverview]);

  // Combined ranked users for limits table (pinned to current calendar month)
  const rankedLimitUsers = useMemo(() => {
    if (!telephonyOverview) return [];
    const exceeding = (telephonyOverview.usageLimits.usersExceedingFup || []).map((u) => ({
      ...u,
      status: 'Over' as const,
    }));
    const approaching = (telephonyOverview.usageLimits.usersApproachingFup || []).map((u) => ({
      ...u,
      excessMinutes: 0,
      status: 'Near' as const,
    }));
    return [...exceeding, ...approaching];
  }, [telephonyOverview]);

  const periods: Array<{ id: TelephonyPeriod; label: string }> = [
    { id: 'all_time', label: 'All time' },
    { id: 'this_month', label: 'This month' },
    { id: 'last_month', label: 'Last month' },
    { id: 'last_30d', label: 'Last 30 days' },
  ];

  const statusOptions = [
    { id: 'ALL', label: 'All statuses' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'EXPIRED', label: 'Expired' },
  ];

  return (
    <AdminLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
        {/* ── 1. Header & Range Control (Fixed-width, Stable-height, Overview Style) ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          {/* Title, Metrics Count & Inline Actions */}
          <div className="shrink-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink font-sans">
              Communications
            </h1>
            <p className="text-xs text-muted font-sans mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
              <span>{formatIndianNumber(total)} mediated sessions</span>
              <span>·</span>
              <span>Updated {formatRelativeTime(lastUpdated.toISOString())}</span>

              {/* Refresh icon button (only icon) */}
              <button
                type="button"
                onClick={() => fetchCommunications()}
                disabled={isLoading || isTelephonyLoading}
                className="p-1 text-muted hover:text-ink transition-colors cursor-pointer inline-flex items-center disabled:opacity-50"
                title="Refresh communications data"
                aria-label="Refresh communications data"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoading || isTelephonyLoading ? 'animate-spin' : ''}`}
                />
              </button>

              {/* Mask / Reveal Phone Numbers: ONLY icon */}
              <button
                type="button"
                onClick={() => setShowAllPhones((prev) => !prev)}
                className={`p-1 transition-colors cursor-pointer inline-flex items-center rounded-xs ${
                  showAllPhones
                    ? 'text-amber-600 hover:text-amber-700 bg-amber-500/10'
                    : 'text-muted hover:text-ink'
                }`}
                title={showAllPhones ? 'Mask phone numbers' : 'Reveal plain phone numbers (authorized admin)'}
                aria-label={showAllPhones ? 'Mask phone numbers' : 'Reveal phone numbers'}
              >
                {showAllPhones ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </p>
          </div>

          {/* Minimal & Integrated Period Text Tabs with Underline Indicator */}
          <div className="flex items-center gap-4 text-xs font-sans self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
            {periods.map(({ id, label }) => {
              const isActive = telephonyPeriod === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePeriodChange(id)}
                  className={`pb-1 text-xs font-sans transition-colors cursor-pointer relative shrink-0 ${
                    isActive
                      ? 'text-ink font-semibold'
                      : 'text-muted hover:text-ink font-normal'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-xs" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {error && (
          <div className="p-3 border-y border-red-500/30 text-xs text-danger font-medium flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchCommunications()}
              className="underline font-bold text-xs cursor-pointer min-h-[44px] inline-flex items-center"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 2. Needs Attention ── */}
        <section className="space-y-2" aria-labelledby="needs-attention-heading">
          <div className="flex items-center justify-between">
            <h2 id="needs-attention-heading" className="text-xs font-medium text-muted font-sans">
              Needs attention
            </h2>
            {attentionItems.length > 0 && (
              <span className="text-[11px] text-muted font-sans">
                {attentionItems.length} {attentionItems.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          <div className="border-y border-border/60 divide-y divide-border/40 font-sans text-xs">
            {attentionItems.length === 0 ? (
              <div className="py-3 flex items-center gap-2 text-muted">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="font-medium text-ink">All clear</span>
                <span className="text-muted">· All calls answered, within fair usage limits, and reconciled</span>
              </div>
            ) : (
              attentionItems.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.state === 'danger'
                          ? 'bg-danger'
                          : item.state === 'amber'
                          ? 'bg-amber-500'
                          : 'bg-muted'
                      }`}
                    />
                    <span className="text-ink font-medium">{item.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="min-h-[44px] px-2 text-xs text-muted hover:text-ink underline decoration-border hover:decoration-ink cursor-pointer inline-flex items-center shrink-0 font-medium"
                  >
                    {item.actionText}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── 3. Money, as a Statement ── */}
        <section
          id="money-statement-section"
          className="space-y-3"
          aria-labelledby="money-statement-heading"
        >
          <div className="flex items-center justify-between">
            <h2 id="money-statement-heading" className="text-xs font-medium text-muted font-sans">
              Financial statement
            </h2>
            <span className="text-[11px] text-muted font-sans">
              {telephonyOverview?.period.label}
            </span>
          </div>

          <div className="border-y border-border/60 divide-y divide-border/40 font-sans text-xs">
            {/* Net Revenue */}
            <div className="py-3 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-ink font-medium">Net subscription revenue</span>
                  <span
                    className="text-muted hover:text-ink cursor-help"
                    title="Formula: Gross collections less 18% GST and ~2.36% payment gateway fees"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-ink text-sm">
                    {formatRupees(telephonyOverview?.financials.subscriptionRevenueRupees)}
                  </span>
                  {(telephonyOverview?.financials.grossSubscriptionRevenueRupees ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowGrossBreakdown((v) => !v)}
                      className="text-[11px] text-muted hover:text-ink underline decoration-border min-h-[30px] inline-flex items-center cursor-pointer"
                    >
                      {showGrossBreakdown ? 'Hide gross' : 'Show gross'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Gross Revenue Breakdown */}
              {showGrossBreakdown && (
                <div className="mt-1 p-2.5 rounded bg-surface border border-border/60 text-[11px] text-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Gross collections</span>
                    <span className="font-medium text-ink">
                      {formatRupees(telephonyOverview?.financials.grossSubscriptionRevenueRupees)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicable GST (18% inclusive)</span>
                    <span>
                      -
                      {formatRupees(
                        telephonyOverview
                          ? (telephonyOverview.financials.grossSubscriptionRevenueRupees * 18) / 118
                          : 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated gateway fee (~2.36%)</span>
                    <span>
                      -
                      {formatRupees(
                        telephonyOverview
                          ? telephonyOverview.financials.grossSubscriptionRevenueRupees * 0.0236
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Carrier Cost (Estimated) */}
            <div className="py-3 flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-ink font-medium">Carrier cost (estimated)</span>
                  <span
                    className="text-muted hover:text-ink cursor-help"
                    title="Formula: billed minutes × ₹1.50/min + 18% GST"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <span className="font-semibold text-ink text-sm">
                  {formatRupees(telephonyOverview?.financials.estimatedCarrierCostRupees)}
                </span>
              </div>
              <div className="text-[11px] text-muted">
                Formula:{' '}
                <span className="text-ink">
                  {formatIndianNumber(telephonyOverview?.usageLimits.totalMinutesConsumed || 0)} billed minutes
                  × ₹{telephonyOverview?.financials.carrierRatePerMinuteRupees.toFixed(2) || '1.50'} +{' '}
                  {telephonyOverview?.financials.carrierGstPercent || 18}% GST
                </span>
              </div>
            </div>

            {/* Carrier Cost (Invoiced) */}
            <div className="py-3 flex items-baseline justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-ink font-medium">Carrier cost (invoiced)</span>
                <span
                  className="text-muted hover:text-ink cursor-help"
                  title="Actual billing records reported by telephony carrier provider"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                {telephonyOverview?.financials.hasActualCarrierBillingData ? (
                  <div className="text-right">
                    <span className="font-semibold text-ink text-sm">
                      {formatRupees(telephonyOverview.financials.actualCarrierCostRupees)}
                    </span>
                    {telephonyOverview.financials.estimatedCarrierCostRupees != null && (
                      <span className="block text-[11px] text-muted">
                        {(telephonyOverview.financials.actualCarrierCostRupees -
                          telephonyOverview.financials.estimatedCarrierCostRupees) >= 0
                          ? '+'
                          : ''}
                        {formatRupees(
                          telephonyOverview.financials.actualCarrierCostRupees -
                            telephonyOverview.financials.estimatedCarrierCostRupees
                        )}{' '}
                        vs estimate
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted font-medium">— (Awaiting invoice)</span>
                )}
              </div>
            </div>

            {/* Contribution & Margin */}
            <div className="py-3 flex items-baseline justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-ink font-medium">Gross contribution</span>
                <span
                  className="text-muted hover:text-ink cursor-help"
                  title="Formula: Net subscription revenue minus carrier telephony cost"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`font-semibold text-sm ${
                    (telephonyOverview?.financials.grossContributionRupees ?? 0) >= 0
                      ? 'text-success'
                      : 'text-danger'
                  }`}
                >
                  {formatRupees(telephonyOverview?.financials.grossContributionRupees)}
                </span>
                <span className="block text-[11px] text-muted">
                  {telephonyOverview?.financials.grossContributionMarginPercent != null
                    ? `${telephonyOverview.financials.grossContributionMarginPercent}% margin`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Below statement: Unit economics */}
            <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface/30 px-2 rounded-xs">
              <div className="flex items-baseline justify-between sm:justify-start sm:gap-3">
                <span className="text-muted">Cost per connected call:</span>
                <span className="font-medium text-ink">
                  {costPerConnectedCall != null ? formatRupees(costPerConnectedCall) : '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between sm:justify-start sm:gap-3">
                <span className="text-muted">Cost per active subscriber:</span>
                <span className="font-medium text-ink">
                  {telephonyOverview?.financials.costPerActiveSubscriberRupees != null
                    ? `${formatRupees(telephonyOverview.financials.costPerActiveSubscriberRupees)} (${telephonyOverview.financials.activeSubscribersCount || 0} active)`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Calls: Funnel & Durations ── */}
        <section className="space-y-3" aria-labelledby="calls-heading">
          <div className="flex items-center justify-between">
            <h2 id="calls-heading" className="text-xs font-medium text-muted font-sans">
              Calls
            </h2>
            <span className="text-[11px] text-muted font-sans">
              Funnel &amp; duration analysis
            </span>
          </div>

          {/* Horizontal Funnel */}
          <div className="border border-border/80 rounded bg-surface/50 p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
              {/* Step 1: Sessions */}
              <button
                type="button"
                onClick={() => applyQuickFilter('all')}
                className="text-left space-y-0.5 p-1.5 rounded hover:bg-surface cursor-pointer transition-colors"
                title="Click to view all sessions"
              >
                <span className="text-[11px] text-muted block">Sessions</span>
                <span className="text-base font-semibold text-ink block">
                  {formatIndianNumber(telephonyOverview?.usage.totalSessions || 0)}
                </span>
                <span className="text-[10px] text-muted block">100% initiated</span>
              </button>

              {/* Step 2: Calls Placed */}
              <div className="space-y-0.5 p-1.5">
                <span className="text-[11px] text-muted block">Calls placed</span>
                <span className="text-base font-semibold text-ink block">
                  {formatIndianNumber(telephonyOverview?.usage.totalCalls || 0)}
                </span>
                <span className="text-[10px] text-muted block">
                  {telephonyOverview?.usage.totalSessions
                    ? `${Math.round(
                        ((telephonyOverview.usage.totalCalls || 0) /
                          telephonyOverview.usage.totalSessions) *
                          100
                      )}% of sessions`
                    : '—'}
                </span>
              </div>

              {/* Step 3: Connected */}
              <button
                type="button"
                onClick={() => applyQuickFilter('connected')}
                className="text-left space-y-0.5 p-1.5 rounded hover:bg-surface cursor-pointer transition-colors"
                title="Click to filter session log to connected calls"
              >
                <span className="text-[11px] text-muted block">Connected</span>
                <span className="text-base font-semibold text-success block">
                  {formatIndianNumber(telephonyOverview?.usage.connectedCalls || 0)}
                </span>
                <span className="text-[10px] text-muted block">
                  {telephonyOverview?.usage.totalCalls
                    ? `${Math.round(
                        ((telephonyOverview.usage.connectedCalls || 0) /
                          telephonyOverview.usage.totalCalls) *
                          100
                      )}% reached owner`
                    : '—'}
                </span>
              </button>

              {/* Step 4: Not Answered */}
              <button
                type="button"
                onClick={() => applyQuickFilter('not_answered')}
                className="text-left space-y-0.5 p-1.5 rounded hover:bg-surface cursor-pointer transition-colors"
                title="Click to filter session log to not-answered calls"
              >
                <span className="text-[11px] text-muted block">Not answered</span>
                <span
                  className={`text-base font-semibold block ${
                    (telephonyOverview?.usage.missedCalls || 0) > 0 ? 'text-amber-600' : 'text-ink'
                  }`}
                >
                  {formatIndianNumber(telephonyOverview?.usage.missedCalls || 0)}
                </span>
                <span className="text-[10px] text-muted block">
                  {telephonyOverview?.usage.totalCalls
                    ? `${Math.round(
                        ((telephonyOverview.usage.missedCalls || 0) /
                          telephonyOverview.usage.totalCalls) *
                          100
                      )}% unanswered`
                    : '—'}
                </span>
              </button>
            </div>
          </div>

          {/* Line for Talk time, Billed minutes, Average, Longest */}
          <div className="py-2.5 border-y border-border/60 flex flex-wrap items-center justify-between gap-y-2 text-xs font-sans">
            <div>
              <span className="text-muted">Talk time: </span>
              <span className="font-semibold text-ink">
                {formatDuration(telephonyOverview?.usage.actualTalkTimeSeconds)}
              </span>
            </div>
            <div>
              <span className="text-muted">Billed minutes: </span>
              <span className="font-semibold text-ink">
                {formatIndianNumber(telephonyOverview?.usageLimits.totalMinutesConsumed || 0)} billed minutes
              </span>
            </div>
            <div>
              <span className="text-muted">Average: </span>
              <span className="font-semibold text-ink">
                {formatDuration(telephonyOverview?.usage.averageCallDurationSeconds)}
              </span>
            </div>
            <div>
              <span className="text-muted">Longest: </span>
              <span className="font-semibold text-ink">
                {formatDuration(telephonyOverview?.usage.longestCallSeconds)}
              </span>
            </div>
          </div>

          {/* Billing Efficiency */}
          <div className="py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs font-sans text-muted">
            <div className="flex items-center gap-1.5">
              <span>Billing efficiency:</span>
              <span className="font-semibold text-ink">
                {billingEfficiencyPercent != null ? `${billingEfficiencyPercent}%` : '—'}
              </span>
              <span
                className="text-muted hover:text-ink cursor-help"
                title="Formula: actual talk seconds ÷ billed seconds"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="text-[11px]">
              Calls are billed in 60-second minimum increments (pulses), causing billed minutes to exceed actual talk time.
            </span>
          </div>
        </section>

        {/* ── 5. Monthly Limits (Pinned to current calendar month) ── */}
        <section
          id="monthly-limits-section"
          className="space-y-3"
          aria-labelledby="monthly-limits-heading"
        >
          <div className="flex items-center justify-between">
            <h2 id="monthly-limits-heading" className="text-xs font-medium text-muted font-sans">
              Monthly limits
            </h2>
            <span className="text-[11px] text-muted font-sans">
              Pinned to current calendar month · 5m talk time limit
            </span>
          </div>

          {/* 10-Minute Cap Line */}
          <div className="py-2 px-3 rounded bg-surface/50 border border-border/70 text-xs font-sans text-ink">
            {telephonyOverview?.usageLimits.callsExceeding10MinCount === 0
              ? 'No call reached the 10-minute cap'
              : `${telephonyOverview?.usageLimits.callsExceeding10MinCount} ${
                  telephonyOverview?.usageLimits.callsExceeding10MinCount === 1 ? 'call' : 'calls'
                } reached the 10-minute cap`}
          </div>

          {/* Ranked List of Users */}
          <div className="border-y border-border/60 divide-y divide-border/40 font-sans text-xs">
            {rankedLimitUsers.length === 0 ? (
              <div className="py-3.5 text-muted flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>All users within fair usage limits (5m talk time/month).</span>
              </div>
            ) : (
              rankedLimitUsers.map((user) => {
                const limitMinutes = telephonyOverview?.usageLimits.fupThresholdMinutes || 5;
                const percent = Math.min(100, Math.round((user.actualMinutes / limitMinutes) * 100));
                return (
                  <div key={user.userId} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{user.userName}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                            user.status === 'Over'
                              ? 'bg-danger/10 text-danger border border-danger/30'
                              : 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
                          }`}
                        >
                          {user.status}
                        </span>
                      </div>
                      <span className="text-muted text-[11px]">
                        <strong className="text-ink font-semibold">{user.actualMinutes}m</strong> talk time ({user.billedMinutes} billed minutes)
                      </span>
                    </div>

                    {/* Progress Bar against 5m limit */}
                    <div className="w-full h-1.5 rounded-full bg-border/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          user.status === 'Over' ? 'bg-danger' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── 6. Session Log ── */}
        <section
          id="session-log-section"
          className="space-y-3 pt-2"
          aria-labelledby="session-log-heading"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <h2 id="session-log-heading" className="text-xs font-medium text-muted font-sans">
                Session log
              </h2>
              {activeQuickFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-ink text-surface">
                  <Filter className="w-2.5 h-2.5" />
                  <span>Filtered: {activeQuickFilter === 'not_answered' ? 'Not answered' : 'Connected'}</span>
                  <button
                    type="button"
                    onClick={() => applyQuickFilter('all')}
                    className="hover:text-amber-400 cursor-pointer ml-0.5"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {/* Minimal & Integrated Status Filter Text Tabs (Overview-inspired) */}
            <div className="flex items-center gap-4 text-xs font-sans self-start sm:self-auto overflow-x-auto max-w-full">
              {statusOptions.map((opt) => {
                const isActive = statusFilter === opt.id && !activeQuickFilter;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.id);
                      setActiveQuickFilter(null);
                      setPage(1);
                    }}
                    className={`pb-1 text-xs font-sans transition-colors cursor-pointer relative shrink-0 ${
                      isActive
                        ? 'text-ink font-semibold'
                        : 'text-muted hover:text-ink font-normal'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile View: Stacked Items with Hairline Separators */}
          <div className="block md:hidden">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent mb-2" />
                <p className="font-satoshi text-xs text-muted">Loading sessions...</p>
              </div>
            ) : displayedSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted border-y border-border/60">
                No communication sessions found.
              </div>
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60 font-sans">
                {displayedSessions.map((sess) => {
                  const isExpanded = expandedSessionId === sess.id;
                  const isOwnerRevealed = showAllPhones || revealedPhoneIds.has(sess.id);
                  return (
                    <div key={sess.id} className="py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-xs text-ink font-mono">
                          {sess.reference}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] uppercase border border-border text-muted">
                            {sess.type}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] uppercase ${
                              sess.status === 'COMPLETED'
                                ? 'bg-success/15 text-success'
                                : sess.status === 'ACTIVE'
                                ? 'bg-accent/30 text-ink'
                                : 'bg-surface text-muted'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <div className="truncate">
                          <span className="font-medium text-ink">
                            {sess.resource?.name || 'Asset'}
                          </span>
                          {sess.resource?.owner && (
                            <span className="text-muted ml-1.5 text-[11px] inline-flex items-center gap-1">
                              · {sess.resource.owner.name} (
                              {isOwnerRevealed
                                ? sess.resource.owner.mobileNumber
                                : maskPhoneNumber(sess.resource.owner.mobileNumber)}
                              )
                              <button
                                type="button"
                                onClick={() => toggleRevealPhone(sess.id)}
                                className="min-h-[44px] min-w-[30px] inline-flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                                title="Toggle reveal owner phone"
                              >
                                {isOwnerRevealed ? (
                                  <EyeOff className="w-3 h-3 text-amber-600" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                            </span>
                          )}
                        </div>
                        <span className="text-muted text-[11px] shrink-0">
                          {sess.callCount || 0} calls ({formatDuration(sess.totalDurationSec)})
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted">{formatDate(sess.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                          className="min-h-[44px] px-3 py-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-ink cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide calls' : 'View calls'}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-border/40 text-xs space-y-2">
                          {sess.calls && sess.calls.length > 0 ? (
                            <div className="space-y-1.5">
                              {sess.calls.map((call, cIdx) => {
                                const callKey = call.id || `${sess.id}-call-${cIdx}`;
                                const isCallRevealed = showAllPhones || revealedPhoneIds.has(callKey);
                                return (
                                  <div
                                    key={callKey}
                                    className="p-2.5 bg-surface border border-border/60 rounded text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-ink">
                                        {call.direction || 'outbound-api'}
                                      </span>
                                      <span className="text-[10px] text-muted">{call.status}</span>
                                    </div>
                                    <div className="text-muted text-[10px] flex items-center justify-between">
                                      <span>
                                        {isCallRevealed
                                          ? `${call.caller} → ${call.callee}`
                                          : `${maskPhoneNumber(call.caller)} → ${maskPhoneNumber(call.callee)}`}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => toggleRevealPhone(callKey)}
                                        className="min-h-[44px] min-w-[30px] inline-flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                                        title="Toggle reveal caller/callee"
                                      >
                                        {isCallRevealed ? (
                                          <EyeOff className="w-3 h-3 text-amber-600" />
                                        ) : (
                                          <Eye className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted">
                                      <span>Talk time: {formatDuration(call.durationSec)}</span>
                                      <span>
                                        {call.connectedAt
                                          ? new Date(call.connectedAt).toLocaleTimeString('en-IN')
                                          : '—'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-muted text-[11px]">No nested call records logged for this session.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop View: Line Table */}
          <div className="hidden md:block border-y border-border/60 overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent mb-2" />
                <p className="font-sans text-xs text-muted">Loading communication sessions...</p>
              </div>
            ) : displayedSessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted font-sans">
                No communication sessions found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-border/60 text-muted text-[11px] font-medium">
                    <th className="py-2.5 px-3">Session ref</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Resource &amp; owner</th>
                    <th className="py-2.5 px-3">Calls / talk time</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {displayedSessions.map((sess) => {
                    const isExpanded = expandedSessionId === sess.id;
                    const isOwnerRevealed = showAllPhones || revealedPhoneIds.has(sess.id);
                    return (
                      <React.Fragment key={sess.id}>
                        <tr className={`hover:bg-surface/50 transition-colors ${isExpanded ? 'bg-surface/50' : ''}`}>
                          <td className="py-3 px-3 font-mono font-medium text-ink">
                            {sess.reference}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border/70 text-ink">
                              {sess.type}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                sess.status === 'COMPLETED'
                                  ? 'bg-success/15 text-success'
                                  : sess.status === 'ACTIVE'
                                  ? 'bg-accent/30 text-ink'
                                  : 'bg-surface text-muted'
                              }`}
                            >
                              {sess.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {sess.resource ? (
                              <div>
                                <div className="font-medium text-ink">{sess.resource.name}</div>
                                {sess.resource.owner && (
                                  <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                                    <span>{sess.resource.owner.name}</span>
                                    <span>
                                      (
                                      {isOwnerRevealed
                                        ? sess.resource.owner.mobileNumber
                                        : maskPhoneNumber(sess.resource.owner.mobileNumber)}
                                      )
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleRevealPhone(sess.id)}
                                      className="min-h-[30px] min-w-[24px] inline-flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                                      title="Toggle reveal owner phone"
                                    >
                                      {isOwnerRevealed ? (
                                        <EyeOff className="w-3 h-3 text-amber-600" />
                                      ) : (
                                        <Eye className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted text-[11px]">Unlinked</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-muted">
                            <div>{sess.callCount || sess.calls?.length || 0} call(s)</div>
                            <div className="text-ink font-medium">
                              {formatDuration(sess.totalDurationSec)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(sess.createdAt)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleExpand(sess.id)}
                              className="min-h-[44px] px-3 py-1.5 inline-flex items-center gap-1 rounded text-xs font-medium text-ink hover:text-ink cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Calls'}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </td>
                        </tr>

                        {/* Nested Call Logs Row */}
                        {isExpanded && (
                          <tr className="bg-surface/30">
                            <td colSpan={7} className="p-3 sm:p-4">
                              <div className="p-3 bg-surface border border-border/80 rounded space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted border-b border-border/60 pb-1.5">
                                  <span className="flex items-center gap-1.5 font-medium text-ink">
                                    <Radio className="w-3.5 h-3.5 text-accent" />
                                    Proxy records for {sess.reference}
                                  </span>
                                  <span>Provider: {sess.provider || 'edesy'}</span>
                                </div>

                                {sess.calls && sess.calls.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {sess.calls.map((call, cIdx) => {
                                      const callKey = call.id || `${sess.id}-desktop-call-${cIdx}`;
                                      const isCallRevealed = showAllPhones || revealedPhoneIds.has(callKey);
                                      return (
                                        <div
                                          key={callKey}
                                          className="p-2.5 bg-bg/50 border border-border/50 rounded grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs"
                                        >
                                          <div>
                                            <span className="text-[10px] text-muted block">
                                              Direction / SID
                                            </span>
                                            <span className="text-ink font-medium">
                                              {call.direction || 'outbound-api'}
                                            </span>
                                            <span className="text-[10px] text-muted block truncate">
                                              {call.callSid || '—'}
                                            </span>
                                          </div>

                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-muted">Caller → Callee</span>
                                              <button
                                                type="button"
                                                onClick={() => toggleRevealPhone(callKey)}
                                                className="min-h-[30px] min-w-[24px] inline-flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                                                title="Toggle reveal caller/callee"
                                              >
                                                {isCallRevealed ? (
                                                  <EyeOff className="w-3 h-3 text-amber-600" />
                                                ) : (
                                                  <Eye className="w-3 h-3" />
                                                )}
                                              </button>
                                            </div>
                                            <span className="text-ink text-[11px] block truncate">
                                              {isCallRevealed
                                                ? `${call.caller} → ${call.callee}`
                                                : `${maskPhoneNumber(call.caller)} → ${maskPhoneNumber(call.callee)}`}
                                            </span>
                                          </div>

                                          <div>
                                            <span className="text-[10px] text-muted block">Duration &amp; status</span>
                                            <span className="text-ink font-medium">
                                              {formatDuration(call.durationSec)}
                                            </span>
                                            <span className="text-[10px] text-muted block">
                                              {call.status}
                                            </span>
                                          </div>

                                          <div>
                                            <span className="text-[10px] text-muted block">Connected time</span>
                                            <span className="text-[11px] text-muted block">
                                              {call.connectedAt
                                                ? new Date(call.connectedAt).toLocaleTimeString('en-IN')
                                                : '—'}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="py-3 text-center text-xs text-muted">
                                    No nested call records logged for this session.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-3 flex items-center justify-between text-xs font-sans text-muted">
              <span>
                Page {page} of {totalPages} ({formatIndianNumber(total)} sessions total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

