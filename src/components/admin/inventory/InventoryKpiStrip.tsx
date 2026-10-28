import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { AdminInventorySummary } from '../../../types/admin';

interface InventoryKpiStripProps {
  summary: AdminInventorySummary | null;
  onNavigateTab: (tab: 'stock' | 'bundles' | 'tags' | 'production' | 'setup') => void;
  onFilterTagsByState: (state: string) => void;
}

export const InventoryKpiStrip: React.FC<InventoryKpiStripProps> = ({
  summary,
  onNavigateTab,
  onFilterTagsByState,
}) => {
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  const totals = summary?.totals;
  const physicalStock = totals?.physicalStock ?? totals?.inCommerceStock ?? 0;
  const totalCommittedDemand = totals?.totalCommittedDemand ?? totals?.reservedInCheckout ?? 0;
  const totalSentToPrint =
    summary?.serializedBySku?.reduce((sum, item) => sum + (item.sentToPrint || 0), 0) || 0;
  const totalDamaged =
    summary?.serializedBySku?.reduce((sum, item) => sum + (item.damaged || 0), 0) || 0;
  const totalSellableStock =
    totals?.totalSellableStock ?? Math.max(0, physicalStock - totalCommittedDemand);
  const totalGenerated =
    summary?.serializedBySku?.reduce((sum, item) => sum + (item.generated || 0), 0) || 0;

  return (
    <div className="w-full">
      {/* One single bordered container with 4 cells separated by dividers */}
      <div className="border border-border rounded-sm bg-surface overflow-hidden">
        {/* 4 Cells Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* 1. Ready to sell */}
          <div
            onClick={() => onNavigateTab('stock')}
            className="p-3.5 sm:p-4 space-y-1 cursor-pointer hover:bg-bg/40 transition-colors"
          >
            <span className="text-[10px] text-muted tracking-wider uppercase font-medium font-mono block">
              Ready to sell
            </span>
            <span className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight block">
              {totalSellableStock.toLocaleString()}
            </span>
          </div>

          {/* 2. Reserved */}
          <div
            onClick={() => {
              onFilterTagsByState('ALLOCATED_TO_ORDER');
              onNavigateTab('tags');
            }}
            className="p-3.5 sm:p-4 space-y-1 cursor-pointer hover:bg-bg/40 transition-colors"
          >
            <span className="text-[10px] text-muted tracking-wider uppercase font-medium font-mono block">
              Reserved for orders
            </span>
            <span className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight block">
              {totalCommittedDemand.toLocaleString()}
            </span>
          </div>

          {/* 3. At printer */}
          <div
            onClick={() => onNavigateTab('production')}
            className="p-3.5 sm:p-4 space-y-1 cursor-pointer hover:bg-bg/40 transition-colors"
          >
            <span className="text-[10px] text-muted tracking-wider uppercase font-medium font-mono block">
              At printer
            </span>
            <span className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight block">
              {totalSentToPrint.toLocaleString()}
            </span>
          </div>

          {/* 4. Damaged */}
          <div
            onClick={() => {
              onFilterTagsByState('DAMAGED');
              onNavigateTab('tags');
            }}
            className="p-3.5 sm:p-4 space-y-1 cursor-pointer hover:bg-bg/40 transition-colors"
          >
            <span className="text-[10px] text-muted tracking-wider uppercase font-medium font-mono block">
              Damaged
            </span>
            <span
              className={`font-display font-semibold text-2xl sm:text-3xl tracking-tight block ${
                totalDamaged > 0 ? 'text-danger' : 'text-ink'
              }`}
            >
              {totalDamaged.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Secondary Stats Muted Line Under Divider Inside Same Container */}
        <div className="border-t border-border px-3.5 sm:px-4 py-2 bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-muted font-mono">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              <strong className="text-ink font-semibold">{physicalStock.toLocaleString()}</strong> in warehouse
            </span>
            <span>·</span>
            <span>
              <strong className="text-ink font-semibold">{totalGenerated.toLocaleString()}</strong> waiting to print
            </span>
            <span>·</span>
            <span>
              <strong className="text-ink font-semibold">{(totals?.assignedToVehicles ?? 0).toLocaleString()}</strong> tags in use
            </span>
            <span>·</span>
            <span>
              <strong className="text-ink font-semibold">{(totals?.totalPhysicalTags ?? 0).toLocaleString()}</strong> made in total
            </span>
          </div>

          {/* Single Quiet Text Link */}
          <button
            type="button"
            onClick={() => setShowExplanationModal(true)}
            className="self-start sm:self-auto text-[11px] font-sans text-muted hover:text-ink underline cursor-pointer shrink-0"
          >
            How these numbers work
          </button>
        </div>
      </div>

      {/* Popover / Sheet Explaining Formulas */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-sm border border-border bg-surface p-5 shadow-lg space-y-4 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                How Inventory Numbers Work
              </h3>
              <button
                type="button"
                onClick={() => setShowExplanationModal(false)}
                className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <span className="font-semibold text-ink block font-mono text-[11px]">
                  Ready to sell
                </span>
                <p className="text-muted leading-relaxed">
                  Physical warehouse stock minus reserved orders. Available for customers to buy right now.
                </p>
                <code className="text-[10px] font-mono text-muted block mt-0.5">
                  max(0, physicalStock − committedDemand)
                </code>
              </div>

              <div>
                <span className="font-semibold text-ink block font-mono text-[11px]">
                  Reserved for orders
                </span>
                <p className="text-muted leading-relaxed">
                  Paid customer orders awaiting tag assignment plus active checkout holds (15-min reservation).
                </p>
                <code className="text-[10px] font-mono text-muted block mt-0.5">
                  paidUnfulfilledDemand + reservedInCheckout
                </code>
              </div>

              <div>
                <span className="font-semibold text-ink block font-mono text-[11px]">
                  At printer
                </span>
                <p className="text-muted leading-relaxed">
                  Tags dispatched to vendor print batch manifests currently in production.
                </p>
              </div>

              <div>
                <span className="font-semibold text-ink block font-mono text-[11px]">
                  Damaged
                </span>
                <p className="text-muted leading-relaxed">
                  Defective or damaged tags reported during receiving or customer replacement.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowExplanationModal(false)}
                className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
