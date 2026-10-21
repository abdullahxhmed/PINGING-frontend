import React, { useState } from 'react';

interface ResourceAnalyticsTabProps {
  scansCount?: number;
  requestsCount?: number;
  connectedCallsCount?: number;
}

export const ResourceAnalyticsTab: React.FC<ResourceAnalyticsTabProps> = ({
  scansCount = 128,
  requestsCount = 12,
  connectedCallsCount = 8,
}) => {
  const [timeRange, setTimeRange] = useState<'30d' | '7d' | 'all'>('30d');

  const mult = timeRange === '7d' ? 0.35 : timeRange === 'all' ? 2.4 : 1.0;
  const scans = Math.round(scansCount * mult);
  const requests = Math.round(requestsCount * mult);
  const connected = Math.round(connectedCallsCount * mult);

  const contactRate = scans > 0 ? ((requests / scans) * 100).toFixed(1) : '0.0';

  const weeklyData = [
    { label: 'Week 1', value: Math.round(16 * mult), height: '33%' },
    { label: 'Week 2', value: Math.round(24 * mult), height: '50%' },
    { label: 'Week 3', value: Math.round(32 * mult), height: '67%' },
    { label: 'Week 4', value: Math.round(48 * mult), height: '100%', isCurrent: true },
  ];

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* 1. Time Range Selector Header */}
      <div className="flex items-center justify-between pb-0.5">
        <span className="text-xs font-semibold text-muted">
          Performance metrics
        </span>

        {/* Minimal segmented pill for range */}
        <div className="inline-flex items-center p-0.5 rounded-full bg-surface border border-border">
          {(
            [
              { key: '7d', label: '7d' },
              { key: '30d', label: '30d' },
              { key: 'all', label: 'All' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTimeRange(t.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-all cursor-pointer ${
                timeRange === t.key
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Two Hero Metrics */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden grid grid-cols-2 divide-x divide-border shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="p-4 sm:p-5 flex flex-col justify-between gap-1">
          <span className="text-xs text-muted font-medium">
            Scans
          </span>
          <div className="my-1">
            <span className="font-display font-medium text-3xl sm:text-4xl text-ink leading-none">
              {scans}
            </span>
          </div>
          <span className="text-[11px] text-muted">
            Total tag interactions
          </span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between gap-1">
          <span className="text-xs text-muted font-medium">
            Contact rate
          </span>
          <div className="my-1">
            <span className="font-display font-medium text-3xl sm:text-4xl text-ink leading-none">
              {contactRate}%
            </span>
          </div>
          <span className="text-[11px] text-muted">
            Scans converted to contact
          </span>
        </div>
      </div>

      {/* 3. Scans Over Time Trend Chart (No lime green, clean monochrome) */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <span className="text-xs font-semibold text-muted">
            Scans over time
          </span>
          <span className="font-mono text-[11px] text-muted">Weekly volume</span>
        </div>

        <div className="pt-3 pb-1">
          <div className="h-28 flex items-end gap-3 sm:gap-6 justify-between px-2">
            {weeklyData.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="font-mono text-[11px] text-muted group-hover:text-ink transition-colors">
                  {bar.value}
                </span>
                <div className="w-full max-w-[48px] bg-bg rounded-xs border border-border relative overflow-hidden flex items-end h-18">
                  <div
                    className={`w-full transition-all duration-500 ${
                      bar.isCurrent ? 'bg-ink' : 'bg-ink/75'
                    }`}
                    style={{ height: bar.height }}
                  />
                </div>
                <span className="text-[11px] font-mono text-muted">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
