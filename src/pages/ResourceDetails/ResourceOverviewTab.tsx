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
  Share2,
  ExternalLink,
  Plus,
} from 'lucide-react';

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
  recentActivity: ActivityItem[];
  onNavigateToActivity: () => void;
  onOpenShareSheet: () => void;
  onOpenPairModal?: () => void;
}

export const ResourceOverviewTab: React.FC<ResourceOverviewTabProps> = ({
  activeTag,
  publicUrl,
  recentActivity,
  onNavigateToActivity,
  onOpenShareSheet,
  onOpenPairModal,
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
      {/* 1. Tag & Relay Connection Card */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-bg border border-border flex items-center justify-center shrink-0">
              <QrCode className="h-5 w-5 text-ink" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink">
                  {activeTag ? `Tag: ${activeTag}` : 'No Physical Tag Linked'}
                </span>
                {activeTag ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-muted/15 text-muted border border-border">
                    Unlinked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                {activeTag
                  ? 'QR code is active and resolving to your private relay contact page.'
                  : 'Link a printed QR sticker to let people contact you without seeing your phone number.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {activeTag ? (
              <>
                <button
                  type="button"
                  onClick={onOpenShareSheet}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-border bg-bg hover:bg-surface text-ink text-xs font-medium transition-colors cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share QR</span>
                </button>
                {publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-border bg-bg hover:bg-surface text-ink text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Test Link</span>
                  </a>
                )}
              </>
            ) : (
              onOpenPairModal && (
                <button
                  type="button"
                  onClick={onOpenPairModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-ink text-surface text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Pair Sticker</span>
                </button>
              )
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Private Relay Active &bull; Calls and SMS are anonymously routed to your mobile number</span>
          </div>
        </div>
      </div>

      {/* 2. Recent Activity Card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted">
            Recent activity
          </span>
          {recentActivity.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToActivity}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-muted transition-colors cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
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
          <div className="p-8 text-center space-y-1.5">
            <p className="text-xs font-medium text-ink">No activity recorded yet</p>
            <p className="text-[11px] text-muted max-w-sm mx-auto">
              When someone scans your tag or contacts you through the private relay, interactions will be logged here.
            </p>
          </div>
        )}
      </div>

      {/* 3. Subtle Privacy Notice */}
      <div className="px-1 text-[11px] text-muted flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-ink/80" />
        <span>Private relay active &bull; Phone numbers are masked</span>
      </div>
    </div>
  );
};

export default ResourceOverviewTab;
