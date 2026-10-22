import React, { useState, useEffect, useMemo } from 'react';
import type { ActivityItem } from './ResourceOverviewTab';
import { resourcesApi } from '../../lib/api';
import {
  PhoneCall,
  QrCode,
  Eye,
  Bell,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

export type ActivityFilter = 'all' | 'scans' | 'clicks' | 'calls' | 'notifications';

interface ResourceActivityTabProps {
  events: ActivityItem[];
  resourceId?: string;
}

export const ResourceActivityTab: React.FC<ResourceActivityTabProps> = ({
  events,
  resourceId,
}) => {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    scans: number;
    clicks: number;
    calls: number;
  } | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    let isMounted = true;

    resourcesApi
      .getAnalytics(resourceId)
      .then((res: any) => {
        if (!isMounted) return;
        const payload = res?.data || res;
        const s = payload?.summary;
        if (s) {
          setSummary({
            scans: Number(s.qrScans ?? 0),
            clicks: Number(s.sharedVisits ?? 0) + Number(s.directVisits ?? 0),
            calls: Number(s.callsInitiated ?? 0),
          });
        }
      })
      .catch(() => {
        // Quietly fallback to event counts
      });

    return () => {
      isMounted = false;
    };
  }, [resourceId]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'scans') return events.filter((e) => e.type === 'scan');
    if (filter === 'clicks') return events.filter((e) => e.type === 'click');
    if (filter === 'calls') return events.filter((e) => e.type === 'call');
    if (filter === 'notifications') return events.filter((e) => e.type === 'notification' || e.type === 'request');
    return events;
  }, [events, filter]);

  const counts = useMemo(() => {
    return {
      all: events.length,
      scans: events.filter((e) => e.type === 'scan').length,
      clicks: events.filter((e) => e.type === 'click').length,
      calls: events.filter((e) => e.type === 'call').length,
      notifications: events.filter((e) => e.type === 'notification' || e.type === 'request').length,
    };
  }, [events]);

  const getEventIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="h-3 w-3 text-ink" />;
      case 'scan':
        return <QrCode className="h-3 w-3 text-ink" />;
      case 'click':
        return <Eye className="h-3 w-3 text-ink" />;
      case 'notification':
        return <Bell className="h-3 w-3 text-ink" />;
      case 'request':
        return <MessageSquare className="h-3 w-3 text-ink" />;
      default:
        return <Clock className="h-3 w-3 text-muted" />;
    }
  };

  const displayScans = summary ? summary.scans : counts.scans;
  const displayClicks = summary ? summary.clicks : counts.clicks;
  const displayCalls = summary ? summary.calls : counts.calls;

  const filterTabs: { key: ActivityFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'scans', label: 'Scans', count: displayScans },
    { key: 'clicks', label: 'Clicks', count: displayClicks },
    { key: 'calls', label: 'Calls', count: displayCalls },
    { key: 'notifications', label: 'Notifications', count: counts.notifications },
  ];

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* 1. Concise 3-Stat Metric Row (Scans, Clicks, Calls Initiated) */}
      <div className="grid grid-cols-3 gap-3">
        {/* Scans */}
        <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span className="font-medium text-[11px]">Scans</span>
            <QrCode className="h-3.5 w-3.5 text-muted" />
          </div>
          <div>
            <span className="font-display text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              {displayScans.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-muted mt-0.5 truncate">Physical QR scans</p>
        </div>

        {/* Clicks */}
        <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span className="font-medium text-[11px]">Clicks</span>
            <Eye className="h-3.5 w-3.5 text-muted" />
          </div>
          <div>
            <span className="font-display text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              {displayClicks.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-muted mt-0.5 truncate">Shared & direct links</p>
        </div>

        {/* Calls Initiated */}
        <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs mb-1">
            <span className="font-medium text-[11px]">Calls Initiated</span>
            <PhoneCall className="h-3.5 w-3.5 text-muted" />
          </div>
          <div>
            <span className="font-display text-xl sm:text-2xl font-semibold text-ink tracking-tight">
              {displayCalls.toLocaleString()}
            </span>
          </div>
          <p className="text-[10px] text-muted mt-0.5 truncate">Relay contact taps</p>
        </div>
      </div>

      {/* 2. Filter strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-ink text-surface shadow-xs'
                  : 'bg-surface border border-border text-muted hover:text-ink hover:border-border-strong'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[10px] px-1 rounded-full ${
                  isActive ? 'bg-surface/20 text-surface' : 'text-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Structured Grid Table (All columns aligned in a grid, click expands details) */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-bg/50 border-b border-border text-[11px] font-semibold text-muted">
          <div className="col-span-5 sm:col-span-4">Event</div>
          <div className="hidden sm:block sm:col-span-4">Channel / Source</div>
          <div className="col-span-3 sm:col-span-2">Status</div>
          <div className="col-span-4 sm:col-span-2 text-right">Time</div>
        </div>

        {/* Rows */}
        {filteredEvents.length > 0 ? (
          <div className="divide-y divide-border/60">
            {filteredEvents.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} className="transition-colors">
                  {/* Grid Data Row */}
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-xs hover:bg-bg/40 transition-colors cursor-pointer select-none"
                  >
                    {/* Event Col */}
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-bg border border-border flex items-center justify-center shrink-0">
                        {getEventIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-ink truncate text-xs block">
                          {item.title}
                        </span>
                        <span className="sm:hidden text-[10px] text-muted truncate block">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    {/* Channel / Source Col (visible sm+) */}
                    <div className="hidden sm:block sm:col-span-4 text-muted truncate text-[11px]">
                      {item.subtitle}
                    </div>

                    {/* Status Col */}
                    <div className="col-span-3 sm:col-span-2">
                      <span className="inline-block px-1.5 py-0.5 rounded-xs bg-bg border border-border text-[10px] font-mono text-muted">
                        {item.status || 'Recorded'}
                      </span>
                    </div>

                    {/* Time Col + Expand Icon */}
                    <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-1 text-right">
                      <span className="text-[11px] font-mono text-muted truncate">
                        {item.time}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-3.5 pt-2 bg-bg/50 border-t border-border/40 text-xs text-muted space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                        <div>
                          <span className="text-[10px] text-muted block font-mono">Event Type</span>
                          <span className="font-medium text-ink capitalize mt-0.5 block">{item.type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block font-mono">Channel</span>
                          <span className="font-medium text-ink mt-0.5 block truncate">{item.subtitle}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block font-mono">Status</span>
                          <span className="font-mono text-ink mt-0.5 block">{item.status || 'Recorded'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block font-mono">Timestamp</span>
                          <span className="font-mono text-ink mt-0.5 block">{item.time}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted">
                        <ShieldCheck className="h-3 w-3 text-ink/70 shrink-0" />
                        <span>Private relay record · Personal identity and numbers are securely masked.</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs font-medium text-ink">No events recorded</p>
            <p className="text-[11px] text-muted">
              No activity matching &ldquo;{filter}&rdquo; was found.
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-xs font-medium text-ink underline underline-offset-4 hover:opacity-80 pt-1 cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceActivityTab;
