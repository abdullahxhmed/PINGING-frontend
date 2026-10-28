import React from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAdminOverview } from './useAdminOverview';
import { OverviewHeader } from './OverviewHeader';
import { Briefing } from './Briefing';
import { AttentionPanel } from './AttentionPanel';
import { Zone, type SupportingRow } from './Zone';
import { PipelineBar } from './PipelineBar';
import { ProgressBar } from './ProgressBar';
import { ActivityTable } from './ActivityTable';
import { LifetimeFooter } from './LifetimeFooter';
import {
  formatPaise,
  formatCount,
  formatRelativeTime,
  formatDaysRemaining,
} from './overviewFormatters';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const {
    period,
    setPeriod,
    data,
    isLoading,
    isRefreshing,
    error,
    refetch,
    updatedRelative,
  } = useAdminOverview();

  // Loading skeleton with fixed height to prevent layout shifts
  if (isLoading && !data) {
    return (
      <AdminLayout>
        <div className="space-y-6 w-full max-w-5xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="space-y-2">
              <div className="w-32 h-7 bg-border/60 rounded-sm animate-pulse" />
              <div className="w-64 h-4 bg-border/40 rounded-sm animate-pulse" />
            </div>
            <div className="w-48 h-8 bg-border/50 rounded-sm animate-pulse" />
          </div>

          {/* Briefing Skeleton */}
          <div className="w-3/4 h-5 bg-border/50 rounded-sm animate-pulse" />

          {/* Attention Panel Skeleton */}
          <div className="h-28 bg-surface border border-border rounded-md animate-pulse" />

          {/* 2x2 Zone Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-surface border border-border rounded-md animate-pulse" />
            <div className="h-64 bg-surface border border-border rounded-md animate-pulse" />
            <div className="h-64 bg-surface border border-border rounded-md animate-pulse" />
            <div className="h-64 bg-surface border border-border rounded-md animate-pulse" />
          </div>

          {/* Activity Table Skeleton */}
          <div className="h-56 bg-surface border border-border rounded-md animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  // Error State with Inline Retry
  if (error && !data) {
    return (
      <AdminLayout>
        <div className="space-y-6 w-full max-w-5xl mx-auto py-10">
          <div className="p-4 bg-surface border border-border rounded-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-ink shrink-0" />
              <div>
                <p className="text-xs font-semibold text-ink font-sans">
                  Unable to load operational overview
                </p>
                <p className="text-xs text-muted font-sans mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-ink text-surface text-xs font-medium rounded-sm hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  const isUnavailable = (key: string) => data.unavailable?.includes(key);

  // ----------------------------------------------------
  // ZONE 1: SALES COMPUTATIONS
  // ----------------------------------------------------
  const salesRevPaise = data.sales?.revenuePaise ?? 0;
  const salesRevFormatted = formatPaise(salesRevPaise);
  const paidOrders = data.sales?.paidOrders ?? 0;
  const convPct = data.sales?.conversionPercent;
  const convStr = convPct !== null && convPct !== undefined ? ` · ${convPct}% conversion` : '';

  // Previous period comparison sub-line
  let salesSubLine = `${paidOrders} paid ${paidOrders === 1 ? 'order' : 'orders'}${convStr}`;
  const prevRev = data.sales?.previous?.revenuePaise;
  if (prevRev !== undefined && prevRev !== null) {
    if (prevRev === 0 && salesRevPaise > 0) {
      salesSubLine += ` (up from ₹0)`;
    } else if (prevRev > 0) {
      const diffPaise = salesRevPaise - prevRev;
      const diffFormatted = formatPaise(Math.abs(diffPaise));
      if (diffPaise > 0) {
        salesSubLine += ` (+${diffFormatted} vs prev)`;
      } else if (diffPaise < 0) {
        salesSubLine += ` (-${diffFormatted} vs prev)`;
      }
    }
  }

  // ----------------------------------------------------
  // ZONE 2: FULFILMENT COMPUTATIONS
  // ----------------------------------------------------
  const waitingCount = data.fulfilment?.waitingForTags?.count ?? 0;
  const targetDays = Math.round((data.fulfilment?.waitingForTags?.targetHours ?? 48) / 24);
  const oldestWaitingAt = data.fulfilment?.waitingForTags?.oldestAt;
  const oldestWaitingAge = oldestWaitingAt ? formatRelativeTime(oldestWaitingAt) : null;
  const fulfilmentSub = oldestWaitingAge
    ? `Oldest ${oldestWaitingAge} (${targetDays}d target)`
    : `Packing queue target: ${targetDays}d`;

  // Age progress vs target (targetDays * 86400000ms)
  let fulfilmentProgressPct = 0;
  if (oldestWaitingAt) {
    const ageMs = Math.max(0, Date.now() - new Date(oldestWaitingAt).getTime());
    const targetMs = targetDays * 86400000;
    fulfilmentProgressPct = Math.min(100, (ageMs / targetMs) * 100);
  }

  // Extract packs available from store catalog names
  const pairPacks = data.fulfilment?.packsAvailable?.find(
    (p) => p.productId === 'pair' || p.name.toLowerCase().includes('pair')
  )?.packs ?? 0;

  const completePacks = data.fulfilment?.packsAvailable?.find(
    (p) => p.productId === 'complete_set' || p.name.toLowerCase().includes('complete')
  )?.packs ?? 0;

  const fulfilmentRows: SupportingRow[] = [
    {
      label: 'Sellable stock',
      value: `${pairPacks} Pair · ${completePacks} Complete`,
    },
    {
      label: 'Low stock',
      value: `${data.fulfilment?.lowStockCount ?? 0} SKUs`,
    },
  ];

  // ----------------------------------------------------
  // ZONE 3: PRODUCT USE COMPUTATIONS
  // ----------------------------------------------------
  const tagsLinked = data.activation?.tagsLinkedToVehicles ?? 0;
  const tagsCalled = data.activation?.tagsWithAtLeastOneCall ?? 0;
  const productUseHero = `${tagsCalled} of ${tagsLinked}`;
  const productUsePct = tagsLinked > 0 ? (tagsCalled / tagsLinked) * 100 : 0;

  const connectedCalls = data.usage?.currentPeriod?.callsConnected ?? 0;
  const missedCalls = data.usage?.currentPeriod?.callsMissed ?? 0;
  const ownersReached = data.usage?.currentPeriod?.ownersReached ?? 0;

  const productUseRows: SupportingRow[] = [
    {
      label: 'Calls in period',
      value: `${connectedCalls} answered, ${missedCalls} missed`,
    },
    {
      label: 'Vehicle owners reached',
      value: `${ownersReached} ${ownersReached === 1 ? 'owner' : 'owners'}`,
    },
  ];

  // ----------------------------------------------------
  // ZONE 4: COST AND PLANS COMPUTATIONS
  // ----------------------------------------------------
  const estCostPaise = data.callCost?.estimatedCostPaise ?? 0;
  const billableMin = data.callCost?.totalBillableMinutes ?? 0;
  const allTimeCostPaise = data.callCost?.allTimeCostPaise ?? 0;

  let costSubLine = `${billableMin} billed ${billableMin === 1 ? 'min' : 'mins'} · ${formatPaise(allTimeCostPaise)} all-time`;
  if (data.callCost?.estimatedWithProviderBillingPaise) {
    costSubLine += ` (provider est. ≈ ${formatPaise(data.callCost.estimatedWithProviderBillingPaise)})`;
  }

  const activePlus = data.plus?.activePlusBySource?.totalActivePlus ?? 0;
  const pendingPlus = data.plus?.pendingGrants ?? 0;
  const paidRenewals = data.plus?.activePlusBySource?.paid ?? 0;
  const nextExpiry = data.plus?.nextExpiryDate;
  const daysRem = formatDaysRemaining(nextExpiry);

  const costPlansRows: SupportingRow[] = [
    {
      label: 'Plus subscriptions',
      value: `${activePlus} active (${pendingPlus} pending pairing)`,
    },
    {
      label: 'Renewals & next expiry',
      value: `${paidRenewals} paid · ${daysRem ? daysRem.text : 'None due'}`,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 w-full max-w-5xl mx-auto">
        {/* ── 1. Flush Header & Period Selector ── */}
        <OverviewHeader
          meta={data.meta}
          period={period}
          onPeriodChange={setPeriod}
          isRefreshing={isRefreshing}
          onRefresh={refetch}
          updatedRelative={updatedRelative}
        />

        {/* ── 2. Briefing Sentence ── */}
        <Briefing data={data} />

        {/* ── 3. Needs Attention Panel (Black Header Band) ── */}
        <AttentionPanel items={data.attention || []} />

        {/* ── 4. Four Zones Grid (2x2 on Desktop, Stacked on Mobile) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zone 1: Sales */}
          {!isUnavailable('sales') && (
            <Zone
              title="Sales"
              question="Are people buying?"
              hero={salesRevFormatted}
              subLine={salesSubLine}
              visual={
                data.sales?.pipeline ? (
                  <PipelineBar pipeline={data.sales.pipeline} />
                ) : undefined
              }
              link={{
                text: 'Orders →',
                href: '/admin/orders',
              }}
            />
          )}

          {/* Zone 2: Fulfilment */}
          {!isUnavailable('fulfilment') && (
            <Zone
              title="Fulfilment"
              question="Can you ship what's coming?"
              hero={formatCount(waitingCount)}
              subLine={fulfilmentSub}
              visual={
                waitingCount > 0 ? (
                  <ProgressBar
                    percentage={fulfilmentProgressPct}
                    labelLeft="Age vs 2d target"
                    labelRight={`${Math.round(fulfilmentProgressPct)}%`}
                  />
                ) : undefined
              }
              rows={fulfilmentRows}
              link={{
                text: 'Fulfillment →',
                href: '/admin/fulfillment',
              }}
            />
          )}

          {/* Zone 3: Product Use */}
          {!isUnavailable('usage') && (
            <Zone
              title="Product use"
              question="Are tags being used?"
              hero={productUseHero}
              subLine={
                <span>
                  linked tags received a call
                  {data.usage?.isApproximate && (
                    <span className="text-muted/60 ml-1.5 text-[10px]">
                      (approximate)
                    </span>
                  )}
                </span>
              }
              visual={
                <ProgressBar
                  percentage={productUsePct}
                  labelLeft="Active linked ratio"
                  labelRight={`${Math.round(productUsePct)}%`}
                />
              }
              rows={productUseRows}
              link={{
                text: 'Call logs →',
                href: '/admin/communications',
              }}
            />
          )}

          {/* Zone 4: Cost and Plans */}
          {!isUnavailable('callCost') && !isUnavailable('plus') && (
            <Zone
              title="Cost and plans"
              question="What does it cost, what comes back?"
              hero={formatPaise(estCostPaise)}
              subLine={costSubLine}
              rows={costPlansRows}
              link={{
                text: 'Plans & Users →',
                href: '/admin/users',
              }}
            />
          )}
        </div>

        {/* ── 5. Recent Activity Table (The Only Table) ── */}
        {!isUnavailable('activity') && (
          <ActivityTable events={data.activity || []} />
        )}

        {/* ── 6. Lifetime Totals Footer ── */}
        {!isUnavailable('lifetime') && (
          <LifetimeFooter lifetime={data.lifetime} />
        )}
      </div>
    </AdminLayout>
  );
};

