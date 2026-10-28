import React, { useState, useMemo } from 'react';
import type { AdminInventorySummary } from '../../../types/admin';
import { parseSkuDetails, getReorderThreshold } from './inventoryUtils';

export interface AttentionItem {
  id: string;
  type: 'LOW_STOCK' | 'UNPRINTED_TAGS' | 'BUNDLE_OUT' | 'UNFULFILLED_ORDERS' | 'LEGACY_SKU';
  sentence: string;
  actionLabel: string;
  onAction: () => void;
  dotClass?: string;
  sku?: string;
  isLegacy?: boolean;
}

interface InventoryAttentionStripProps {
  summary: AdminInventorySummary | null;
  bundlesOutCount?: number;
  unfulfilledOrdersCount?: number;
  onOpenBatchModal: (sku?: string) => void;
  onNavigateTab: (tab: 'stock' | 'bundles' | 'tags' | 'production' | 'setup') => void;
  onOpenFulfillment: () => void;
}

export const InventoryAttentionStrip: React.FC<InventoryAttentionStripProps> = ({
  summary,
  bundlesOutCount = 0,
  unfulfilledOrdersCount = 0,
  onOpenBatchModal,
  onNavigateTab,
  onOpenFulfillment,
}) => {
  const [expanded, setExpanded] = useState(false);

  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];
    if (!summary) return items;

    // 1. Paid orders needing tags (Blue indicator for allocated to order demand)
    const paidUnfulfilled = summary.totals?.paidUnfulfilledDemand ?? unfulfilledOrdersCount;
    if (paidUnfulfilled > 0) {
      items.push({
        id: 'attention-unfulfilled',
        type: 'UNFULFILLED_ORDERS',
        sentence: `${paidUnfulfilled} paid ${paidUnfulfilled === 1 ? 'order needs' : 'orders need'} tags`,
        actionLabel: 'Open fulfillment →',
        onAction: onOpenFulfillment,
        dotClass: 'bg-blue-500',
      });
    }

    // 2. Low sellable stock / out of stock per SKU
    // Functional fix: TAG-VEHICLE-STICKER (or any legacy) must NOT trigger out of stock / "Print more"
    let hasCreatedPrintBatchAction = false;
    if (summary.serializedBySku && Array.isArray(summary.serializedBySku)) {
      for (const item of summary.serializedBySku) {
        const parsed = parseSkuDetails(item.sku);
        if (parsed.isLegacy) {
          // Handled separately below
          continue;
        }

        const physical = item.physicalStock ?? item.inStock ?? 0;
        const committed = item.committedDemand ?? (item.reserved || 0);
        const sellable = item.sellableStock ?? Math.max(0, physical - committed);
        const threshold = getReorderThreshold(item.sku);

        if (sellable <= 0) {
          items.push({
            id: `attention-out-${item.sku}`,
            type: 'LOW_STOCK',
            sentence: `${parsed.humanTitle}: Out of stock`,
            actionLabel: hasCreatedPrintBatchAction ? 'View in stock →' : 'Create print batch →',
            onAction: hasCreatedPrintBatchAction
              ? () => onNavigateTab('stock')
              : () => onOpenBatchModal(item.sku),
            sku: item.sku,
            dotClass: 'bg-red-500',
          });
          hasCreatedPrintBatchAction = true;
        } else if (sellable <= threshold) {
          items.push({
            id: `attention-low-${item.sku}`,
            type: 'LOW_STOCK',
            sentence: `${parsed.humanTitle}: ${sellable} left, enough for ~${Math.floor(sellable / 2)} packs`,
            actionLabel: hasCreatedPrintBatchAction ? 'View in stock →' : 'Create print batch →',
            onAction: hasCreatedPrintBatchAction
              ? () => onNavigateTab('stock')
              : () => onOpenBatchModal(item.sku),
            sku: item.sku,
            dotClass: 'bg-amber-500',
          });
          hasCreatedPrintBatchAction = true;
        }
      }
    }

    // 3. Digital tags waiting to print (Orange indicator for in print / waiting to print)
    const totalGenerated = summary.serializedBySku?.reduce((sum, s) => sum + (s.generated || 0), 0) || 0;
    if (totalGenerated > 0) {
      items.push({
        id: 'attention-unprinted',
        type: 'UNPRINTED_TAGS',
        sentence: `${totalGenerated} tags generated but not printed`,
        actionLabel: 'Send to print →',
        onAction: () => onNavigateTab('production'),
        dotClass: 'bg-amber-500',
      });
    }

    // 4. Bundles with 0 sellable packs (Red indicator for pack unavailable)
    if (bundlesOutCount > 0) {
      items.push({
        id: 'attention-bundles-out',
        type: 'BUNDLE_OUT',
        sentence: `${bundlesOutCount} store ${bundlesOutCount === 1 ? 'pack' : 'packs'} can't be sold right now`,
        actionLabel: 'View bundles →',
        onAction: () => onNavigateTab('bundles'),
        dotClass: 'bg-red-500',
      });
    }

    // 5. Legacy SKU (TAG-VEHICLE-STICKER): Must NOT trigger "Print more". Show "Fix mapping"
    if (summary.serializedBySku) {
      const legacy = summary.serializedBySku.find((s) => s.sku === 'TAG-VEHICLE-STICKER');
      if (legacy && (legacy.physicalStock || legacy.inStock || 0) > 0) {
        items.push({
          id: 'attention-legacy-sku',
          type: 'LEGACY_SKU',
          sentence: "TAG-VEHICLE-STICKER isn't linked to a product",
          actionLabel: 'Fix mapping →',
          onAction: () => onNavigateTab('stock'),
          sku: legacy.sku,
          isLegacy: true,
          dotClass: 'bg-muted/60',
        });
      }
    }

    return items;
  }, [summary, bundlesOutCount, unfulfilledOrdersCount, onOpenBatchModal, onNavigateTab, onOpenFulfillment]);

  const count = attentionItems.length;
  if (count === 0) {
    return (
      <div className="py-2 text-xs text-muted font-satoshi flex items-center justify-between border-b border-border">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>All good — stock levels and manufacturing runs are healthy.</span>
        </span>
      </div>
    );
  }

  const displayItems = expanded ? attentionItems.slice(0, 5) : attentionItems.slice(0, 3);
  const remainingCount = attentionItems.length - 3;

  return (
    <div className="w-full space-y-1.5 pt-1">
      {/* Small uppercase header label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-medium">
          NEEDS ATTENTION ({count})
        </span>

        {count > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-medium text-muted hover:text-ink cursor-pointer transition-colors"
          >
            {expanded ? 'Show fewer' : `+${remainingCount} more`}
          </button>
        )}
      </div>

      {/* Hairline rows with tiny semantic indicator dots */}
      <div className="border-y border-border divide-y divide-border">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="min-h-[40px] sm:min-h-[44px] py-2 px-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dotClass || 'bg-ink'}`} />
              {item.isLegacy && (
                <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono uppercase font-bold bg-bg text-muted border border-border shrink-0">
                  LEGACY
                </span>
              )}
              <span className="text-xs sm:text-[13px] text-ink font-sans truncate">
                {item.sentence}
              </span>
            </div>

            <button
              type="button"
              onClick={item.onAction}
              className="self-start sm:self-auto text-xs font-semibold text-ink hover:underline shrink-0 cursor-pointer pl-3.5 sm:pl-0"
            >
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
