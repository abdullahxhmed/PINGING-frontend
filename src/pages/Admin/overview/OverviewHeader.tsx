import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { OverviewMeta, OverviewPeriod } from '../../../types/admin.overview.types';
import { formatOverviewDateRange } from './overviewFormatters';

interface OverviewHeaderProps {
  meta?: OverviewMeta;
  period: OverviewPeriod;
  onPeriodChange: (p: OverviewPeriod) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  updatedRelative: string;
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  meta,
  period,
  onPeriodChange,
  isRefreshing,
  onRefresh,
  updatedRelative,
}) => {
  const dateRangeText = formatOverviewDateRange(
    period,
    meta?.range?.start,
    meta?.range?.end,
    meta?.previousRange?.start,
    meta?.previousRange?.end
  );

  const periods: Array<{ id: OverviewPeriod; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-border">
      {/* Title & Date Range */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink font-sans">
          Overview
        </h1>
        <p className="text-xs text-muted font-sans mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>{dateRangeText}</span>
          <span>·</span>
          <span>Updated {updatedRelative}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 text-muted hover:text-ink transition-colors cursor-pointer inline-flex items-center disabled:opacity-50"
            title="Refresh overview metrics (manual fetch)"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </p>
      </div>

      {/* Minimal & Integrated Period Text Tabs */}
      <div className="flex items-center gap-4 text-xs font-sans self-start sm:self-auto pt-1 sm:pt-0">
        {periods.map(({ id, label }) => {
          const isActive = period === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPeriodChange(id)}
              className={`pb-1 text-xs font-sans transition-colors cursor-pointer relative ${
                isActive
                  ? 'text-ink font-semibold'
                  : 'text-muted hover:text-ink font-normal'
              }`}
            >
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-xs" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
