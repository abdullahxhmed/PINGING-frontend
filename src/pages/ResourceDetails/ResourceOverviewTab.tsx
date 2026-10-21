import React from 'react';
import type { Resource } from '../../types/api';
import {
  PhoneCall,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Eye,
  MessageSquare,
  Activity,
  Bell,
} from 'lucide-react';

export interface OverviewMetrics {
  scansCount: number;
  requestsCount: number;
  connectedCallsCount: number;
}

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
  metrics: OverviewMetrics;
  recentActivity: ActivityItem[];
  onNavigateToActivity: () => void;
  onOpenShareSheet: () => void;
}

export const ResourceOverviewTab: React.FC<ResourceOverviewTabProps> = ({
  metrics,
  recentActivity,
  onNavigateToActivity,
}) => {
  const getEventIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="h-3.5 w-3.5 text-ink" />;
      case 'request':
        return <MessageSquare className="h-3.5 w-3.5 text-ink" />;
      case 'scan':
        return <QrCode className="h-3.5 w-3.5 text-ink" />;
      case 'click':
        return <Eye className="h-3.5 w-3.5 text-ink" />;
      case 'notification':
        return <Bell className="h-3.5 w-3.5 text-ink" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-ink" />;
    }
  };

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Consolidated 3-Metric Row (Tag health removed, natural casing) */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden grid grid-cols-3 divide-x divide-border shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Metric 1: QR Scans */}
        <div className="p-3 sm:p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-muted font-medium">
            QR Scans
          </span>
          <div className="my-0.5">
            <span className="font-display font-medium text-2xl sm:text-3xl text-ink leading-none">
              {metrics.scansCount}
            </span>
          </div>
          <span className="text-[11px] text-muted">
            Last 30 days
          </span>
        </div>

        {/* Metric 2: Contact Requests */}
        <div className="p-3 sm:p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-muted font-medium">
            Contact Requests
          </span>
          <div className="my-0.5">
            <span className="font-display font-medium text-2xl sm:text-3xl text-ink leading-none">
              {metrics.requestsCount}
            </span>
          </div>
          <span className="text-[11px] text-muted">
            Last 30 days
          </span>
        </div>

        {/* Metric 3: Calls Connected */}
        <div className="p-3 sm:p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-muted font-medium">
            Calls Connected
          </span>
          <div className="my-0.5">
            <span className="font-display font-medium text-2xl sm:text-3xl text-ink leading-none">
              {metrics.connectedCallsCount}
            </span>
          </div>
          <span className="text-[11px] text-muted">
            Last 30 days
          </span>
        </div>
      </div>

      {/* Consolidated Recent Activity */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted">
            Recent activity
          </span>
          <button
            type="button"
            onClick={onNavigateToActivity}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-muted transition-colors cursor-pointer"
          >
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {recentActivity.length > 0 ? (
          <div className="divide-y divide-border/60">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                onClick={onNavigateToActivity}
                className="px-4 py-3 flex items-center justify-between gap-3 text-xs hover:bg-bg/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-bg border border-border flex items-center justify-center shrink-0">
                    {getEventIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-ink block truncate text-xs">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-muted block truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-muted">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted">
            No activity recorded yet
          </div>
        )}
      </div>

      {/* Subtle Privacy Notice (Illustrative note completely removed) */}
      <div className="px-1 text-[11px] text-muted flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-ink/80" />
        <span>Private relay active · Phone numbers are masked</span>
      </div>
    </div>
  );
};
