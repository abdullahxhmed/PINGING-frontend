import React from 'react';
import type { OverviewSalesPipeline } from '../../../types/admin.overview.types';
import { formatPaise } from './overviewFormatters';

interface PipelineBarProps {
  pipeline: OverviewSalesPipeline;
}

export const PipelineBar: React.FC<PipelineBarProps> = ({ pipeline }) => {
  const unpaid = pipeline?.unpaid?.count ?? 0;
  const toPack = pipeline?.toPack?.count ?? 0;
  const packing = pipeline?.packing?.count ?? 0;
  const delivered = pipeline?.delivered?.count ?? 0;
  const cancelled = pipeline?.cancelledRefunded?.count ?? 0;
  const cancelledVal = pipeline?.cancelledRefunded?.valuePaise ?? 0;

  const totalActive = unpaid + toPack + packing + delivered;

  // Segment widths in percentages (fallback to equal distribution if empty)
  const unpaidPct = totalActive > 0 ? (unpaid / totalActive) * 100 : 0;
  const toPackPct = totalActive > 0 ? (toPack / totalActive) * 100 : 0;
  const packingPct = totalActive > 0 ? (packing / totalActive) * 100 : 0;
  const deliveredPct = totalActive > 0 ? (delivered / totalActive) * 100 : 0;

  return (
    <div className="space-y-2 py-1">
      {/* 8px Stacked Bar: Monochrome black & greys */}
      <div className="h-2 w-full bg-border rounded-sm overflow-hidden flex">
        {unpaidPct > 0 && (
          <div
            style={{ width: `${unpaidPct}%` }}
            className="h-full bg-neutral-300 transition-all duration-300"
            title={`Unpaid: ${unpaid}`}
          />
        )}
        {toPackPct > 0 && (
          <div
            style={{ width: `${toPackPct}%` }}
            className="h-full bg-neutral-500 transition-all duration-300"
            title={`To pack: ${toPack}`}
          />
        )}
        {packingPct > 0 && (
          <div
            style={{ width: `${packingPct}%` }}
            className="h-full bg-neutral-700 transition-all duration-300"
            title={`Packing: ${packing}`}
          />
        )}
        {deliveredPct > 0 && (
          <div
            style={{ width: `${deliveredPct}%` }}
            className="h-full bg-ink transition-all duration-300"
            title={`Delivered: ${delivered}`}
          />
        )}
      </div>

      {/* Counts & Stage Micro-labels under the bar */}
      <div className="grid grid-cols-4 gap-1 text-[11px] font-sans text-muted">
        <div>
          <span className="block font-medium text-ink">{unpaid}</span>
          <span className="text-[10px]">Unpaid</span>
        </div>
        <div>
          <span className="block font-medium text-ink">{toPack}</span>
          <span className="text-[10px]">To pack</span>
        </div>
        <div>
          <span className="block font-medium text-ink">{packing}</span>
          <span className="text-[10px]">Packing</span>
        </div>
        <div>
          <span className="block font-medium text-ink">{delivered}</span>
          <span className="text-[10px]">Delivered</span>
        </div>
      </div>

      {/* Cancelled / Refunded as a quiet muted note */}
      {cancelled > 0 && (
        <p className="text-[11px] text-muted font-sans pt-0.5">
          {cancelled} cancelled/refunded ({formatPaise(cancelledVal)})
        </p>
      )}
    </div>
  );
};

