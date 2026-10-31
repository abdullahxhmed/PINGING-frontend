import React from 'react';
import { Link } from 'react-router-dom';
import type { Resource, ResourceAnalyticsResponse } from '../../types/api';
import { useSubscription } from '../../features/subscription';
import { Lock } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'call' | 'request' | 'scan' | 'click' | 'notification';
  title: string;
  subtitle: string;
  time: string;
  status?: string;
  details?: {
    channel?: string;
    source?: string;
    duration?: string;
    callerMasked?: string;
    notes?: string;
  };
}

interface ResourceOverviewTabProps {
  resource: Resource;
  activeTag: string;
  publicUrl?: string;
  isTogglingPause?: boolean;
  onTogglePause?: () => void;
  analytics?: ResourceAnalyticsResponse | null;
  callsCount?: number;
  recentActivity?: ActivityItem[];
  onNavigateToActivity?: () => void;
  onOpenShareSheet?: () => void;
  onOpenPairModal?: () => void;
}

function formatLastScan(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Never';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today · ${timeStr}`;
    if (isYesterday) return `Yesterday · ${timeStr}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Never';
  }
}

export const ResourceOverviewTab: React.FC<ResourceOverviewTabProps> = ({
  resource,
  activeTag,
  isTogglingPause = false,
  onTogglePause,
  analytics,
  callsCount = 0,
}) => {
  const { isPlus, subscription, openUpgradeModal } = useSubscription();
  const hasAlertsAccess = Boolean(isPlus || subscription?.hasWhatsappAlerts);
  const hasAnalyticsAccess = Boolean(isPlus || subscription?.hasAnalytics);

  const tagIdentifier =
    activeTag ||
    resource.tagNumber ||
    (typeof resource.qrTag === 'object' && resource.qrTag?.tagNumber) ||
    '';
  const isConnected = Boolean(tagIdentifier);
  const isPaused = Boolean(
    resource.isPaused ||
    (typeof resource.qrTag === 'object' && resource.qrTag?.isPaused)
  );

  const scanCount =
    analytics?.summary?.qrScans ??
    analytics?.summary?.totalVisits ??
    0;

  const callCount =
    typeof callsCount === 'number'
      ? callsCount
      : (analytics?.summary?.callsInitiated ?? 0);

  const rawLastVisit = analytics?.recentVisits?.[0]?.createdAt;
  const lastScan = rawLastVisit ? formatLastScan(rawLastVisit) : 'Never';

  return (
    <div className="divide-y divide-border border-y border-border">
      {/* 1. Tag status */}
      <div className="py-4 flex items-center justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-ink block">Tag status</span>
          <p className="text-[11px] text-muted">
            {isPaused
              ? 'Paused. Visitors see an unavailable message.'
              : 'Scans can reach you'}
          </p>
        </div>

        {isConnected && onTogglePause && (
          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`text-xs font-medium ${
                isPaused ? 'text-muted' : 'text-emerald-600'
              }`}
            >
              {isPaused ? 'Paused' : 'Active'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!isPaused}
              onClick={onTogglePause}
              disabled={isTogglingPause}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                !isPaused ? 'bg-emerald-600' : 'bg-muted/40'
              }`}
              title={isPaused ? 'Resume incoming calls' : 'Pause incoming calls'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                  !isPaused ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* 2. Counts */}
      <div className="py-4 space-y-2">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="block text-xs text-muted">Scans</span>
            {hasAnalyticsAccess ? (
              <span className="font-display font-medium text-2xl text-ink block mt-0.5">
                {scanCount}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openUpgradeModal?.()}
                className="inline-flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-ink mt-2 cursor-pointer"
                title="Scan analytics requires Kauntact Plus"
              >
                <Lock className="h-3 w-3 shrink-0" />
                <span>Plus</span>
              </button>
            )}
          </div>
          <div>
            <span className="block text-xs text-muted">Calls</span>
            <span className="font-display font-medium text-2xl text-ink block mt-0.5">
              {callCount}
            </span>
          </div>
          <div>
            <span className="block text-xs text-muted">Last scan</span>
            {hasAnalyticsAccess ? (
              <span className="font-display font-medium text-lg sm:text-2xl text-ink block mt-0.5 truncate">
                {lastScan}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openUpgradeModal?.()}
                className="inline-flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-ink mt-2 cursor-pointer"
                title="Scan analytics requires Kauntact Plus"
              >
                <Lock className="h-3 w-3 shrink-0" />
                <span>Plus</span>
              </button>
            )}
          </div>
        </div>

        {!hasAnalyticsAccess && (
          <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-muted border-t border-border/50">
            <span>Scan analytics & visitor insights are included with Plus.</span>
            <button
              type="button"
              onClick={() => openUpgradeModal?.()}
              className="text-xs font-medium text-ink hover:underline cursor-pointer shrink-0"
            >
              Upgrade
            </button>
          </div>
        )}
      </div>

      {/* 3. Quick alerts */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-ink block">Quick alerts</span>
          {hasAlertsAccess ? (
            <p className="text-[11px] text-muted">
              Access blocked, lights left on, window open, alarm sounding
            </p>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <Lock className="h-3 w-3 shrink-0" />
              <span>Available on Plus plan</span>
            </div>
          )}
        </div>

        {hasAlertsAccess ? (
          <span className="text-xs font-medium text-emerald-600 shrink-0 self-start sm:self-center">
            Enabled
          </span>
        ) : (
          <Link
            to="/plans"
            className="text-xs font-medium text-ink hover:underline shrink-0 self-start sm:self-center"
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
};

export default ResourceOverviewTab;
