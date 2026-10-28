import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AttentionItem } from '../../../types/admin.overview.types';
import { formatPaise, formatRelativeTime } from './overviewFormatters';

interface AttentionPanelProps {
  items: AttentionItem[];
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({ items }) => {
  const [showAll, setShowAll] = useState(false);
  const count = items.length;

  if (count === 0) {
    return (
      <div className="rounded-md border border-border bg-surface overflow-hidden">
        <div className="bg-ink px-4 py-2.5 text-xs font-medium text-surface font-sans flex items-center justify-between">
          <span>Needs attention · 0</span>
        </div>
        <div className="p-4 text-xs font-sans text-muted">
          Nothing needs attention.
        </div>
      </div>
    );
  }

  const displayedItems = showAll ? items : items.slice(0, 3);
  const remainingCount = items.length - 3;

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      {/* Black Header Band: The ONLY filled band on the page */}
      <div className="bg-ink px-4 py-2.5 text-xs font-medium text-surface font-sans flex items-center justify-between">
        <span>Needs attention · {count}</span>
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] text-surface/80 hover:text-surface underline cursor-pointer"
          >
            {showAll ? 'Show less' : `+${remainingCount} more`}
          </button>
        )}
      </div>

      {/* Attention Items Table / Rows */}
      <div className="divide-y divide-border">
        {displayedItems.map((item) => {
          // Format item what text
          let whatText = '';
          if (item.kind === 'waiting_for_tags') {
            const refsStr = item.refs?.length ? ` (${item.refs.slice(0, 2).join(', ')})` : '';
            whatText = `${item.count} paid ${item.count === 1 ? 'order' : 'orders'} waiting for tags${refsStr}`;
          } else if (item.kind === 'late_shipment') {
            const refsStr = item.refs?.length ? ` (${item.refs.slice(0, 2).join(', ')})` : '';
            whatText = `${item.count} shipped ${item.count === 1 ? 'order' : 'orders'} delayed in transit${refsStr}`;
          } else if (item.kind === 'unpaid_checkouts') {
            const refsStr = item.refs?.length ? ` (${item.refs.slice(0, 2).join(', ')})` : '';
            whatText = `${item.count} unpaid checkouts${refsStr} · Payment links expired`;
          } else if (item.kind === 'low_stock') {
            whatText = `${item.count} SKU ${item.count === 1 ? 'is' : 'are'} low or out of stock`;
          } else {
            const rawKind: string = item.kind || 'attention';
            whatText = `${rawKind.replace(/_/g, ' ')}`;
          }

          // Format atStake
          const atStakeStr = item.valuePaise !== null && item.valuePaise !== undefined
            ? formatPaise(item.valuePaise)
            : item.count ? `${item.count} items` : '–';

          // Format age vs target
          const ageStr = item.oldestAt ? formatRelativeTime(item.oldestAt) : '–';
          const targetStr = item.targetHours ? `target ${Math.round(item.targetHours / 24)}d` : null;
          const timingDisplay = targetStr ? `${ageStr} (${targetStr})` : ageStr;

          // Route mapping
          let targetRoute = item.route || '/admin/orders';
          if (!item.route) {
            if (item.kind === 'waiting_for_tags') targetRoute = '/admin/fulfillment';
            else if (item.kind === 'unpaid_checkouts') targetRoute = '/admin/orders';
            else if (item.kind === 'low_stock') targetRoute = '/admin/inventory';
          }

          return (
            <div
              key={item.id || item.kind}
              className="px-4 py-3 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs font-sans min-h-[44px]"
            >
              {/* Left: What */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.late && (
                  <span className="shrink-0 px-1.5 py-0.5 bg-ink text-surface text-[10px] font-semibold tracking-wider uppercase rounded-sm">
                    LATE
                  </span>
                )}
                <span className="text-ink font-medium truncate">{whatText}</span>
              </div>

              {/* Middle: At stake */}
              <div className="sm:w-28 shrink-0 text-muted sm:text-right font-mono">
                <span className="sm:hidden text-muted text-[11px] mr-1">At stake:</span>
                <span className="text-ink font-medium">{atStakeStr}</span>
              </div>

              {/* Right-Middle: Age vs Target */}
              <div className="sm:w-36 shrink-0 text-muted sm:text-right text-[11px]">
                {timingDisplay}
              </div>

              {/* Right: Action Link */}
              <div className="sm:w-28 shrink-0 sm:text-right">
                <Link
                  to={targetRoute}
                  className="inline-flex items-center text-xs font-medium text-ink hover:underline"
                >
                  <span>{item.kind === 'waiting_for_tags' ? 'Pack queue →' : 'View →'}</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
