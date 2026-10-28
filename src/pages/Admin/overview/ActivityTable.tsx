import React from 'react';
import { Link } from 'react-router-dom';
import type { OverviewActivityEvent } from '../../../types/admin.overview.types';
import { formatPaise, formatRelativeTime } from './overviewFormatters';

interface ActivityTableProps {
  events: OverviewActivityEvent[];
}

export const ActivityTable: React.FC<ActivityTableProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-5 text-center text-xs text-muted font-sans">
        No recent activity.
      </div>
    );
  }

  // Desktop max 8 rows; on mobile slice top 5
  const desktopRows = events.slice(0, 8);
  const mobileRows = events.slice(0, 5);

  const getEventName = (ev: OverviewActivityEvent) => {
    if (ev.groupedCount && ev.groupedCount > 1) {
      return `${ev.groupedCount} orders delivered`;
    }
    if (ev.type === 'order_paid') return 'Order paid';
    if (ev.type === 'order_delivered') return 'Order delivered';
    if (ev.type === 'tag_linked') return 'Tag linked';
    if (ev.type === 'call') {
      return ev.durationSec && ev.durationSec > 0 ? 'Call answered' : 'Call missed';
    }
    const rawType: string = ev.type || 'Event';
    return rawType.replace(/_/g, ' ');
  };

  const getAmountOrDuration = (ev: OverviewActivityEvent) => {
    if (ev.amountPaise !== null && ev.amountPaise !== undefined) {
      return formatPaise(ev.amountPaise);
    }
    if (ev.durationSec !== null && ev.durationSec !== undefined) {
      return ev.durationSec > 0 ? `${ev.durationSec}s` : '0s';
    }
    return '–';
  };

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-ink font-sans tracking-tight">
            Recent activity
          </h3>
          <p className="text-xs text-muted font-sans mt-0.5">
            Customer and operational events across the platform
          </p>
        </div>
        <Link
          to="/admin/communications"
          className="text-xs font-medium text-ink hover:underline font-sans"
        >
          View all communications →
        </Link>
      </div>

      {/* Desktop Table: Clean 4 Columns (Time | Event | Customer | Amount) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-border text-muted text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-5 font-normal w-28">Time</th>
              <th className="py-2.5 px-4 font-normal">Event</th>
              <th className="py-2.5 px-4 font-normal">Customer</th>
              <th className="py-2.5 px-5 font-normal text-right w-32">Amount / Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {desktopRows.map((ev, idx) => (
              <tr key={idx} className="h-10 hover:bg-bg/40 transition-colors">
                <td className="py-2 px-5 text-muted text-[11px] whitespace-nowrap">
                  {formatRelativeTime(ev.at)}
                </td>
                <td className="py-2 px-4 text-ink font-medium">
                  <span>{getEventName(ev)}</span>
                  {ev.summary && (
                    <span className="text-muted font-normal ml-1.5 text-[11px]">
                      · {ev.summary}
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-muted">
                  {ev.customerFirstName || 'Customer'}
                </td>
                <td className="py-2 px-5 text-right font-medium text-ink tabular-nums font-mono">
                  {getAmountOrDuration(ev)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Feed: 5 rows max, 44px min targets, stacked cleanly */}
      <div className="md:hidden divide-y divide-border">
        {mobileRows.map((ev, idx) => (
          <div
            key={idx}
            className="px-4 py-3 min-h-[44px] flex items-center justify-between text-xs font-sans"
          >
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-ink truncate">{getEventName(ev)}</span>
                <span className="text-[11px] text-muted shrink-0">· {formatRelativeTime(ev.at)}</span>
              </div>
              <p className="text-[11px] text-muted truncate mt-0.5">
                {ev.customerFirstName || 'Customer'} {ev.summary ? `· ${ev.summary}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right font-mono font-medium text-ink">
              {getAmountOrDuration(ev)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
