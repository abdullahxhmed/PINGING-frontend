import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ResourceAnalyticsResponse } from '../../types/api';
import { resourcesApi } from '../../lib/api';
import { useSubscription } from '../../features/subscription';
import {
  PhoneCall,
  QrCode,
  Share2,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Percent,
  CheckCircle2,
  Users,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ResourceAnalyticsViewProps {
  resourceId: string;
  resourceName?: string;
  tagNumber?: string;
  isCompact?: boolean;
}

export const ResourceAnalyticsView: React.FC<ResourceAnalyticsViewProps> = ({
  resourceId,
  resourceName,
  tagNumber,
  isCompact = false,
}) => {
  const { openUpgradeModal } = useSubscription();
  const [data, setData] = useState<ResourceAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [hoveredHour, setHoveredHour] = useState<{ hour: number; count: number } | null>(null);

  const fetchAnalytics = useCallback(
    async (showRefreshIndicator = false) => {
      if (!resourceId) return;
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await resourcesApi.getAnalytics(resourceId);
        const payload: ResourceAnalyticsResponse = (res as any)?.data || res;
        setData(payload);
        setLastRefreshed(new Date());
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [resourceId]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    totalVisits: 0,
    qrScans: 0,
    sharedVisits: 0,
    directVisits: 0,
    callsInitiated: 0,
    callsCompleted: 0,
    conversionRate: 0,
  };

  const deviceBreakdown = data?.deviceBreakdown || {
    mobile: 0,
    desktop: 0,
    tablet: 0,
  };

  const hourlyActivity = useMemo(() => {
    // Fill all 24 hours (0 through 23) in IST
    const map = new Map<number, number>();
    (data?.hourlyActivity || []).forEach((item) => {
      map.set(Number(item.hour), Number(item.count));
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: map.get(i) || 0,
    }));
  }, [data?.hourlyActivity]);

  const maxHourlyCount = useMemo(() => {
    const max = Math.max(...hourlyActivity.map((h) => h.count), 1);
    return max;
  }, [hourlyActivity]);

  const peakHour = useMemo(() => {
    let best = { hour: 0, count: 0 };
    for (const h of hourlyActivity) {
      if (h.count > best.count) best = h;
    }
    return best;
  }, [hourlyActivity]);

  const recentVisits = data?.recentVisits || [];

  // Device percentage calculation
  const totalDeviceHits =
    deviceBreakdown.mobile + deviceBreakdown.desktop + deviceBreakdown.tablet;
  const mobilePct =
    totalDeviceHits > 0 ? Math.round((deviceBreakdown.mobile / totalDeviceHits) * 100) : 0;
  const desktopPct =
    totalDeviceHits > 0 ? Math.round((deviceBreakdown.desktop / totalDeviceHits) * 100) : 0;
  const tabletPct =
    totalDeviceHits > 0 ? Math.round((deviceBreakdown.tablet / totalDeviceHits) * 100) : 0;

  const topDevice = useMemo(() => {
    if (totalDeviceHits === 0) return { label: 'Mobile', pct: 100 };
    if (deviceBreakdown.mobile >= deviceBreakdown.desktop && deviceBreakdown.mobile >= deviceBreakdown.tablet) {
      return { label: 'Mobile', pct: mobilePct };
    }
    if (deviceBreakdown.desktop >= deviceBreakdown.tablet) {
      return { label: 'Desktop', pct: desktopPct };
    }
    return { label: 'Tablet', pct: tabletPct };
  }, [deviceBreakdown, totalDeviceHits, mobilePct, desktopPct, tabletPct]);

  const formatVisitTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display} ${period}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-border rounded-xl p-4 space-y-2">
              <div className="h-3 w-16 bg-muted/20 rounded" />
              <div className="h-6 w-12 bg-muted/30 rounded" />
            </div>
          ))}
        </div>
        <div className="h-56 bg-surface border border-border rounded-xl p-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-surface border border-border rounded-xl" />
          <div className="h-44 bg-surface border border-border rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    const isPlusLocked =
      error.toLowerCase().includes('plus') ||
      error.toLowerCase().includes('exclusive') ||
      error.toLowerCase().includes('subscription');

    if (isPlusLocked) {
      return (
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 sm:p-8 text-center">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-36 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent/25 border border-accent/60 flex items-center justify-center text-ink shadow-sm">
              <Lock className="w-6 h-6 stroke-[2.2] text-ink" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/40 text-[11px] font-bold text-ink uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 fill-ink" />
                <span>Plus Feature</span>
              </div>
              <h3 className="heading-md text-ink text-xl font-bold">
                Unlock Visitor Scan & Traffic Analytics
              </h3>
              <p className="body-sm text-muted mt-1.5 leading-relaxed">
                {error}
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-left text-xs bg-bg/80 border border-border/80 rounded-lg p-3 my-2">
              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span>Real-time QR scan alerts</span>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span>24h Peak scan heatmap</span>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span>Mobile vs Desktop share</span>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span>Up to 8 active tags quota</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openUpgradeModal()}
              className="btn-primary w-full sm:w-auto px-6 py-2.5 rounded-[var(--radius-sm)] font-semibold text-xs flex items-center justify-center gap-2 bg-ink text-surface hover:bg-ink/90 shadow-md cursor-pointer transition-all"
            >
              <span>Upgrade to Plus — From ₹179/yr</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center space-y-3">
        <p className="text-xs text-danger font-medium">{error}</p>
        <button
          type="button"
          onClick={() => fetchAnalytics(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-ink text-surface text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${isCompact ? 'text-xs' : ''}`}>
      {/* 1. Header Toolbar with Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink">
            {resourceName ? `${resourceName} Traffic & Conversion` : 'Real-Time Scan Analytics'}
          </span>
          {tagNumber && (
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-bg border border-border text-muted font-medium">
              #{tagNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>Updated {formatVisitTime(lastRefreshed.toISOString())}</span>
          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="p-1 text-muted hover:text-ink transition-colors rounded cursor-pointer"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Visits */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span className="font-medium">Total Tag Hits</span>
            <QrCode className="h-3.5 w-3.5 text-muted" />
          </div>
          <div className="my-2">
            <span className="font-display text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              {summary.totalVisits.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono truncate">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {summary.qrScans} QR
            </span>
            <span>•</span>
            <span>{summary.sharedVisits} links</span>
            <span>•</span>
            <span>{summary.directVisits} direct</span>
          </div>
        </div>

        {/* Calls Initiated */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span className="font-medium">Calls Initiated</span>
            <PhoneCall className="h-3.5 w-3.5 text-muted" />
          </div>
          <div className="my-2">
            <span className="font-display text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              {summary.callsInitiated.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-muted font-mono">
            {summary.callsCompleted} completed ({summary.callsInitiated > 0 ? Math.round((summary.callsCompleted / summary.callsInitiated) * 100) : 0}% success)
          </div>
        </div>

        {/* Tag-to-Call Conversion Rate */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span className="font-medium">Conversion Rate</span>
            <Percent className="h-3.5 w-3.5 text-muted" />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              {summary.conversionRate}%
            </span>
          </div>
          <div className="text-[10px] text-muted">
            {summary.conversionRate > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> High visitor intent
              </span>
            ) : (
              'Scan-to-call ratio'
            )}
          </div>
        </div>

        {/* Top Device */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span className="font-medium">Primary Device</span>
            <Smartphone className="h-3.5 w-3.5 text-muted" />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              {topDevice.label}
            </span>
          </div>
          <div className="text-[10px] text-muted font-mono">
            {topDevice.pct}% of all visitor traffic
          </div>
        </div>
      </div>

      {/* 3. Conversion Funnel Card */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-ink" />
            <span className="text-xs font-semibold text-ink">Visitor Conversion Funnel</span>
          </div>
          <span className="text-[11px] text-muted">End-to-end contact flow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Step 1: Tag Scan */}
          <div className="p-3.5 rounded-lg bg-bg border border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="font-semibold uppercase font-mono tracking-wider">1. Tag Hits</span>
              <span className="font-mono text-ink font-bold">100%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-bold text-ink">
                {summary.totalVisits.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted">Total visitors</span>
            </div>
            <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
              <div className="bg-ink h-full rounded-full w-full" />
            </div>
          </div>

          {/* Step 2: Call Initiated */}
          <div className="p-3.5 rounded-lg bg-bg border border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="font-semibold uppercase font-mono tracking-wider">2. Calls Initiated</span>
              <span className="font-mono text-ink font-bold">{summary.conversionRate}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-bold text-ink">
                {summary.callsInitiated.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted">Contact taps</span>
            </div>
            <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(summary.conversionRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Step 3: Call Completed */}
          <div className="p-3.5 rounded-lg bg-bg border border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="font-semibold uppercase font-mono tracking-wider">3. Connected</span>
              <span className="font-mono text-ink font-bold">
                {summary.callsInitiated > 0
                  ? Math.round((summary.callsCompleted / summary.callsInitiated) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-bold text-ink">
                {summary.callsCompleted.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted">Relay completed</span>
            </div>
            <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalVisits > 0
                      ? Math.min(Math.round((summary.callsCompleted / summary.totalVisits) * 100), 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Device Breakdown & 24h Hourly Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-ink" />
              <span className="text-xs font-semibold text-ink">Device Distribution</span>
            </div>
            <span className="text-[11px] font-mono text-muted">{totalDeviceHits} parsed hits</span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Mobile */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-ink font-medium">
                  <Smartphone className="h-3.5 w-3.5 text-muted" />
                  <span>Mobile Phone</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-ink font-semibold">{deviceBreakdown.mobile}</span>
                  <span className="text-muted text-[11px]">({mobilePct}%)</span>
                </div>
              </div>
              <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-ink h-full rounded-full transition-all duration-500"
                  style={{ width: `${mobilePct}%` }}
                />
              </div>
            </div>

            {/* Desktop */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-ink font-medium">
                  <Monitor className="h-3.5 w-3.5 text-muted" />
                  <span>Desktop / Laptop</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-ink font-semibold">{deviceBreakdown.desktop}</span>
                  <span className="text-muted text-[11px]">({desktopPct}%)</span>
                </div>
              </div>
              <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-neutral-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${desktopPct}%` }}
                />
              </div>
            </div>

            {/* Tablet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-ink font-medium">
                  <Tablet className="h-3.5 w-3.5 text-muted" />
                  <span>Tablet</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-ink font-semibold">{deviceBreakdown.tablet}</span>
                  <span className="text-muted text-[11px]">({tabletPct}%)</span>
                </div>
              </div>
              <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-neutral-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${tabletPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 24-Hour Activity (IST) */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-ink" />
              <span className="text-xs font-semibold text-ink">24-Hour Activity (IST)</span>
            </div>
            <span className="text-[11px] font-mono text-muted">
              Peak: {formatHourLabel(peakHour.hour)} ({peakHour.count})
            </span>
          </div>

          <div className="pt-2">
            {/* Visualizer Bars */}
            <div className="h-28 flex items-end gap-1 px-1">
              {hourlyActivity.map((item) => {
                const heightPct = Math.max(
                  item.count > 0 ? Math.round((item.count / maxHourlyCount) * 100) : 6,
                  6
                );
                const isPeak = item.hour === peakHour.hour && item.count > 0;
                const isHovered = hoveredHour?.hour === item.hour;

                return (
                  <div
                    key={item.hour}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onMouseEnter={() => setHoveredHour(item)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    <div
                      className={`w-full rounded-xs transition-all duration-200 ${
                        isHovered
                          ? 'bg-ink scale-y-105'
                          : isPeak
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : item.count > 0
                          ? 'bg-ink/75 hover:bg-ink'
                          : 'bg-muted/20 hover:bg-muted/40'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Hour Scale Ticks */}
            <div className="flex justify-between items-center text-[10px] font-mono text-muted pt-2 px-1 border-t border-border/50 mt-1">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>

            {/* Hover Tooltip display */}
            <div className="mt-2 text-center text-xs h-4 text-muted font-mono">
              {hoveredHour ? (
                <span className="text-ink font-semibold">
                  {formatHourLabel(hoveredHour.hour)}: {hoveredHour.count} visits
                </span>
              ) : (
                <span className="text-[11px]">Hover over an hour bar to inspect hits</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent Privacy-Scrubbed Visitors Stream */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ink" />
            <span className="text-xs font-semibold text-ink">Recent Visitor Log</span>
          </div>
          <span className="text-[11px] font-mono text-muted">
            {recentVisits.length} events logged
          </span>
        </div>

        {recentVisits.length > 0 ? (
          <div className="divide-y divide-border/60">
            {recentVisits.map((visit) => {
              const isQr = visit.source === 'qr_scan';
              const isShare = visit.source === 'share';
              const isMobile = visit.deviceType?.toUpperCase() === 'MOBILE';
              const isDesktop = visit.deviceType?.toUpperCase() === 'DESKTOP';

              return (
                <div
                  key={visit.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 text-xs hover:bg-bg/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-bg border border-border flex items-center justify-center shrink-0">
                      {isQr ? (
                        <QrCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : isShare ? (
                        <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink block truncate">
                          {isQr ? 'Physical QR Sticker Scan' : isShare ? 'Shared Link Visit' : 'Direct Link Access'}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-semibold ${
                            isQr
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : isShare
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                              : 'bg-muted/15 text-muted'
                          }`}
                        >
                          {visit.source}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          {isMobile ? (
                            <Smartphone className="h-3 w-3" />
                          ) : isDesktop ? (
                            <Monitor className="h-3 w-3" />
                          ) : (
                            <Tablet className="h-3 w-3" />
                          )}
                          <span>{visit.deviceType}</span>
                        </span>
                        {(visit.os || visit.browser) && (
                          <>
                            <span>•</span>
                            <span>
                              {visit.os} {visit.browser && `(${visit.browser})`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-muted">
                      {formatVisitTime(visit.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center space-y-1.5">
            <p className="text-xs font-medium text-ink">No visits recorded yet</p>
            <p className="text-[11px] text-muted max-w-sm mx-auto">
              Scan your physical sticker or test the public contact URL to record privacy-preserving visitor analytics in real time.
            </p>
          </div>
        )}
      </div>

      {/* 6. Privacy Assurance Callout Banner */}
      <div className="rounded-xl border border-border bg-bg/50 p-3.5 flex items-start gap-2.5 text-muted text-xs">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px]">
          <span className="font-semibold text-ink block">Zero-Knowledge Visitor Privacy</span>
          <p>
            Raw IP addresses and user agents are never written to the database. All IPs are salted and converted to one-way daily hashes, automated crawler bots are stripped, and visitor sessions are strictly isolated.
          </p>
        </div>
      </div>
    </div>
  );
};
