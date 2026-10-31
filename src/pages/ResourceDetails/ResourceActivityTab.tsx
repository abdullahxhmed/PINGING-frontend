import React, { useState, useMemo } from 'react';
import type { ActivityItem } from './ResourceOverviewTab';
import { useSubscription } from '../../features/subscription';
import {
  PhoneCall,
  QrCode,
  Eye,
  MessageSquare,
  ChevronDown,
  Lock,
} from 'lucide-react';

interface ResourceActivityTabProps {
  events: ActivityItem[];
  resourceId?: string;
}

function parseEventDayAndTime(timeStr: string): { day: string; time: string } {
  if (!timeStr) return { day: 'Earlier', time: '' };

  // Parse ISO date string if present
  const parsedDate = new Date(timeStr);
  if (!isNaN(parsedDate.getTime()) && timeStr.includes('-')) {
    const now = new Date();
    const isToday = parsedDate.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = parsedDate.toDateString() === yesterday.toDateString();

    let day = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (isToday) day = 'Today';
    else if (isYesterday) day = 'Yesterday';

    const hours = parsedDate.getHours();
    const minutes = parsedDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const time = `${displayHours}:${minutes} ${ampm}`;

    return { day, time };
  }

  // Handle formatted strings like "Today · 03:46 PM" or "Oct 27 · 03:46 PM"
  if (timeStr.includes('·')) {
    const parts = timeStr.split('·').map((s) => s.trim());
    const day = parts[0] || 'Today';
    let rawTime = parts[1] || '';
    rawTime = rawTime.replace(/^0/, '').toLowerCase();
    return { day, time: rawTime };
  }

  return { day: 'Activity', time: timeStr.toLowerCase() };
}

function getEventDetails(item: ActivityItem) {
  const isCall = item.type === 'call';
  const isConnected = item.status === 'CONNECTED' || item.status === 'COMPLETED';
  const isMissed = isCall && !isConnected;

  // Extract duration from subtitle or details
  let duration = item.details?.duration;
  if (!duration && item.subtitle) {
    const match = item.subtitle.match(/·\s*([0-9]+[smh](?:\s*[0-9]+s)?)/i);
    if (match) duration = match[1];
  }

  // Extract caller digits if present
  let callerLastTwo = item.details?.callerMasked;
  if (!callerLastTwo && item.subtitle) {
    const match = item.subtitle.match(/•••?\s*([0-9]{2,4})/);
    if (match) callerLastTwo = match[1];
  }

  let title = item.title;
  let meta = item.subtitle;

  if (isCall) {
    if (isConnected) {
      title = duration && duration !== '0s' ? `Call connected · ${duration}` : 'Call connected';
      meta = callerLastTwo ? `Via sticker scan · ••• ${callerLastTwo}` : 'Via sticker scan';
    } else {
      title = 'Missed call';
      meta = 'Not answered';
    }
  } else if (item.type === 'scan') {
    title = 'Sticker scanned';
    meta = 'Via sticker scan';
  } else if (item.type === 'click') {
    title = 'Link opened';
    meta = 'Via shared link';
  } else if (item.type === 'request' || item.type === 'notification') {
    title = 'Message received';
    meta = 'Via private relay';
  }

  return { isCall, isConnected, isMissed, title, meta, duration, callerLastTwo };
}

export const ResourceActivityTab: React.FC<ResourceActivityTabProps> = ({
  events,
}) => {
  const { isPlus, subscription, openUpgradeModal } = useSubscription();
  const hasAnalyticsAccess = Boolean(isPlus || subscription?.hasAnalytics);

  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Derive counts directly from the events list
  const scanCount = useMemo(() => events.filter((e) => e.type === 'scan').length, [events]);
  const clickCount = useMemo(() => events.filter((e) => e.type === 'click').length, [events]);
  const callCount = useMemo(() => events.filter((e) => e.type === 'call').length, [events]);

  // Construct filters dynamically based on Plus status
  const filterTabs = useMemo(() => {
    const tabs: { key: string; label: string; count?: number; locked?: boolean }[] = [
      { key: 'all', label: 'All', count: events.length },
      { key: 'calls', label: 'Calls', count: callCount },
    ];

    if (hasAnalyticsAccess) {
      if (scanCount > 0 || events.length > 0) {
        tabs.push({ key: 'scans', label: 'Sticker scans', count: scanCount });
      }
      if (clickCount > 0) {
        tabs.push({ key: 'clicks', label: 'Link opens', count: clickCount });
      }
    } else {
      // Basic plan: show Sticker scans tab with lock icon
      tabs.push({ key: 'scans', label: 'Sticker scans', locked: true });
    }

    return tabs;
  }, [events.length, scanCount, clickCount, callCount, hasAnalyticsAccess]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'scans') return events.filter((e) => e.type === 'scan');
    if (filter === 'clicks') return events.filter((e) => e.type === 'click');
    if (filter === 'calls') return events.filter((e) => e.type === 'call');
    return events;
  }, [events, filter]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};

    filteredEvents.slice(0, visibleCount).forEach((item) => {
      const { day } = parseEventDayAndTime(item.time);
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(item);
    });

    return Object.entries(groups);
  }, [filteredEvents, visibleCount]);

  const getEmptyMessage = () => {
    if (filter === 'calls') return 'No calls yet';
    if (filter === 'scans') return 'No sticker scans yet';
    if (filter === 'clicks') return 'No link opens yet';
    return 'No activity yet';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Underline-Style Filter Tabs on One Line */}
      <div className="flex items-center gap-6 border-b border-border overflow-x-hidden">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setFilter(tab.key);
                setVisibleCount(20);
              }}
              className={`pb-2.5 text-xs transition-colors cursor-pointer flex items-center gap-1.5 -mb-px whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-ink text-ink font-semibold'
                  : 'border-b-2 border-transparent text-muted hover:text-ink'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="font-mono text-[11px] text-muted">
                  {tab.count}
                </span>
              )}
              {tab.locked && (
                <Lock className="h-3 w-3 text-muted shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Content View: Scan Upgrade Prompt for Basic Users selecting Scans */}
      {filter === 'scans' && !hasAnalyticsAccess ? (
        <div className="py-12 text-center space-y-3 border-y border-border">
          <div className="h-10 w-10 rounded-full bg-bg border border-border flex items-center justify-center mx-auto text-muted">
            <Lock className="h-4 w-4 text-ink" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-medium text-base text-ink">
              Scan analytics is only for Plus users
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              Upgrade to Kauntact Plus to see when your stickers are scanned, view device details, and track traffic in real time.
            </p>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => openUpgradeModal?.()}
              className="px-4 py-2 bg-ink text-surface text-xs font-medium rounded-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Upgrade to Plus</span>
            </button>
          </div>
        </div>
      ) : groupedEvents.length > 0 ? (
        /* Grouped Activity List */
        <div className="space-y-4">
          {groupedEvents.map(([day, dayItems]) => (
            <div key={day} className="space-y-1">
              <div className="pt-2 pb-1">
                <span className="text-xs font-semibold text-muted">
                  {day}
                </span>
              </div>

              <div className="divide-y divide-border border-y border-border">
                {dayItems.map((item) => {
                  const {
                    isCall,
                    isConnected,
                    isMissed,
                    title,
                    meta,
                    duration,
                    callerLastTwo,
                  } = getEventDetails(item);
                  const { time } = parseEventDayAndTime(item.time);
                  const isExpanded = expandedId === item.id;

                  // Render expandable button row for call items
                  if (isCall) {
                    return (
                      <div key={item.id} className="transition-colors">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpand(item.id)}
                          className="w-full text-left py-3 min-h-[44px] flex items-center justify-between gap-3 hover:bg-bg/40 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Outcome Icon Colour */}
                            <PhoneCall
                              className={`h-4 w-4 shrink-0 ${
                                isConnected
                                  ? 'text-emerald-600'
                                  : isMissed
                                  ? 'text-red-500'
                                  : 'text-muted'
                              }`}
                            />

                            <div className="min-w-0 space-y-0.5">
                              <span className="font-sans font-medium text-[15px] text-ink leading-snug block break-words">
                                {title}
                              </span>
                              <span className="font-sans text-[13px] text-muted leading-normal block break-words">
                                {meta}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono tabular-nums text-xs text-muted">
                              {time}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-muted transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {/* Inline Expanded Call Details */}
                        {isExpanded && (
                          <div className="pb-3.5 pt-1 pl-7 text-xs text-muted space-y-2 border-t border-border/40">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                              <div>
                                <span className="text-[11px] text-muted block">Duration</span>
                                <span className="font-mono text-ink text-xs block mt-0.5">
                                  {duration && duration !== '0s' ? duration : 'Not answered'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[11px] text-muted block">Source</span>
                                <span className="text-ink text-xs block mt-0.5">
                                  Sticker scan · Private relay
                                </span>
                              </div>
                              {callerLastTwo && (
                                <div>
                                  <span className="text-[11px] text-muted block">Caller</span>
                                  <span className="font-mono text-ink text-xs block mt-0.5">
                                    •••• {callerLastTwo}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Non-expandable, lighter row for scans, clicks, and messages
                  return (
                    <div
                      key={item.id}
                      className="py-3 min-h-[44px] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.type === 'scan' ? (
                          <QrCode className="h-4 w-4 text-muted shrink-0" />
                        ) : item.type === 'click' ? (
                          <Eye className="h-4 w-4 text-muted shrink-0" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-muted shrink-0" />
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <span className="font-sans font-medium text-sm text-ink leading-snug block break-words">
                            {title}
                          </span>
                          <span className="font-sans text-xs text-muted leading-normal block break-words">
                            {meta}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span className="font-mono tabular-nums text-xs text-muted">
                          {time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {filteredEvents.length > visibleCount && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="px-4 py-2 text-xs font-medium rounded-xs border border-border text-ink hover:bg-bg transition-colors cursor-pointer"
              >
                Load more
              </button>
            </div>
          )}

          {/* Upgrade prompt below calls list for Basic users */}
          {!hasAnalyticsAccess && (
            <div className="p-3.5 rounded-xs border border-border bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <Lock className="h-3.5 w-3.5 text-muted" />
                  <span>Want to see when someone scans your sticker?</span>
                </div>
                <p className="text-[11px] text-muted">
                  Visitor scan tracking and device insights are included with Kauntact Plus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpgradeModal?.()}
                className="px-3 py-1.5 rounded-xs bg-ink text-surface text-xs font-medium hover:opacity-90 transition-opacity shrink-0 cursor-pointer self-start sm:self-center"
              >
                Upgrade to Plus
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 text-center space-y-1.5 border-y border-border">
          <p className="text-sm font-medium text-ink">{getEmptyMessage()}</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Activity and calls directed to this resource will appear here.
          </p>
          {!hasAnalyticsAccess && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => openUpgradeModal?.()}
                className="text-xs font-medium text-ink underline underline-offset-4 hover:opacity-80 cursor-pointer inline-flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                <span>Upgrade to Plus for scan analytics</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceActivityTab;
