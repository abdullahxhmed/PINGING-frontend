import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import type { AdminProduct, AdminInventorySummary } from '../../../types/admin';
import {
  getStoreBundleName,
  parseSkuDetails,
  formatRelativeTime,
} from './inventoryUtils';

interface InventoryBundlesSectionProps {
  summary: AdminInventorySummary | null;
  onOpenBatchModal: (sku: string) => void;
  onRefreshParentSummary?: () => void;
}

interface ComponentConstraint {
  id: string;
  name: string;
  sku: string;
  requiredPerPack: number;
  availableWarehouseStock: number;
  unitsPossible: number;
  isBottleneck: boolean;
}

interface BundleAvailabilityItem {
  productId: string;
  productName: string;
  productSku: string;
  variantId: string;
  variantName: string;
  variantSku: string;
  price: number;
  calculatedSellablePacks: number;
  bottleneckComponent: ComponentConstraint | null;
  components: ComponentConstraint[];
}

export const InventoryBundlesSection: React.FC<InventoryBundlesSectionProps> = ({
  summary,
  onOpenBatchModal,
  onRefreshParentSummary,
}) => {
  const [bundles, setBundles] = useState<BundleAvailabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculatedTime, setLastCalculatedTime] = useState<string>(new Date().toISOString());
  const [expandedBundleIds, setExpandedBundleIds] = useState<Record<string, boolean>>({});
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Stock lookup from authoritative inventory summary
  const getComponentStock = useCallback(
    (sku: string | undefined): number => {
      if (!sku || !summary) return 0;
      const serialized = summary.serializedBySku?.find(
        (s) => s.sku.toLowerCase() === sku.toLowerCase()
      );
      if (serialized) {
        return (
          serialized.sellableStock ??
          Math.max(
            0,
            (serialized.physicalStock ?? serialized.inStock ?? 0) -
              (serialized.committedDemand ?? 0)
          )
        );
      }
      const bulk = summary.bulkStock?.find(
        (b) => b.sku.toLowerCase() === sku.toLowerCase()
      );
      if (bulk) {
        return bulk.availableCount ?? bulk.quantityOnHand ?? 0;
      }
      return 0;
    },
    [summary]
  );

  const evaluateBundles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await adminApi.getCatalogProducts({ limit: 100 });
      const products: AdminProduct[] =
        res?.products || (res as any)?.data?.products || [];

      const bundleItems: BundleAvailabilityItem[] = [];

      for (const prod of products) {
        const variants = prod.variants || [];
        for (const v of variants) {
          const comps = v.components || [];
          if (comps.length === 0) continue;

          const physicalComps = comps.filter(
            (c: any) =>
              c.componentType === 'SERIALIZED_QR_TAG' ||
              c.componentType === 'PHYSICAL_ITEM' ||
              Boolean(c.inventorySku)
          );

          if (physicalComps.length === 0) continue;

          let minUnits = Infinity;
          let calculatedConstraints: ComponentConstraint[] = [];

          for (const c of physicalComps) {
            const compSku = c.inventorySku || prod.sku;
            const stock = getComponentStock(compSku);
            const reqQty = Math.max(1, c.quantity || 1);
            const possible = Math.floor(stock / reqQty);

            if (possible < minUnits) {
              minUnits = possible;
            }

            calculatedConstraints.push({
              id: c.id || `${prod.id}-${compSku}`,
              name: c.name || compSku || 'Component',
              sku: compSku || 'UNKNOWN',
              requiredPerPack: reqQty,
              availableWarehouseStock: stock,
              unitsPossible: possible,
              isBottleneck: false,
            });
          }

          if (minUnits === Infinity) minUnits = 0;

          // Single limiting bottleneck component
          let bottleneck: ComponentConstraint | null = null;
          calculatedConstraints = calculatedConstraints.map((c) => {
            const isBot = c.unitsPossible === minUnits;
            if (isBot && !bottleneck) bottleneck = { ...c, isBottleneck: true };
            return { ...c, isBottleneck: isBot };
          });

          bundleItems.push({
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            variantId: v.id || `${prod.id}-v1`,
            variantName: v.name || 'Standard',
            variantSku: v.sku || prod.sku,
            price: v.price || prod.basePrice,
            calculatedSellablePacks: minUnits,
            bottleneckComponent: bottleneck,
            components: calculatedConstraints,
          });
        }
      }

      setBundles(bundleItems);
      setLastCalculatedTime(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate bundle availability.');
    } finally {
      setIsLoading(false);
    }
  }, [getComponentStock]);

  useEffect(() => {
    evaluateBundles();
  }, [evaluateBundles]);

  const toggleExpand = (id: string) => {
    setExpandedBundleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {/* ── TOP HEADER: Heading, "Updated 5s ago", and quiet text link "Formula" ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-medium">
          BUNDLES ({bundles.length})
        </span>

        <div className="flex items-center gap-3 text-xs font-sans text-muted">
          <span>Updated {formatRelativeTime(lastCalculatedTime)}</span>
          <button
            type="button"
            onClick={() => {
              evaluateBundles();
              if (onRefreshParentSummary) onRefreshParentSummary();
            }}
            disabled={isLoading}
            className="hover:text-ink cursor-pointer"
            title="Recalculate availability"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="hover:text-ink underline cursor-pointer"
          >
            Formula
          </button>
        </div>
      </div>

      {/* ONE PLAIN BORDERED NOTICE AT TOP: About the 2 mini stickers in Complete set */}
      <div className="p-3 border border-border bg-surface text-ink text-xs font-sans space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-muted shrink-0" />
          <strong className="font-medium">BOM Notice: Complete Set Mini Stickers</strong>
        </div>
        <p className="text-muted leading-relaxed text-[11px]">
          The Complete set bill of materials currently requires 2 Mini Stickers per pack. Complete set kits contain 2 vehicle stickers + 1 keychain + 1 general-purpose sticker. If Mini Sticker is the general-purpose sticker, verify whether component requirement should be 1 unit.
        </p>
      </div>

      {error && (
        <div className="p-3 border-y border-border text-xs text-danger">
          {error}
        </div>
      )}

      {isLoading && bundles.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted font-mono border-y border-border">
          Evaluating pack constraints...
        </div>
      ) : bundles.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted border-y border-border">
          No multi-component packs configured.
        </div>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {bundles.map((item) => {
            const key = `${item.productId}-${item.variantId}`;
            const isExpanded = Boolean(expandedBundleIds[key]);
            const storeName = getStoreBundleName(item.productName, item.variantName, item.variantSku);

            const bottleneck = item.bottleneckComponent;
            const bottleneckParsed = bottleneck ? parseSkuDetails(bottleneck.sku) : null;

            // Target pack calculation for quiet text link
            const targetPacks = Math.max(20, Math.ceil((item.calculatedSellablePacks + 10) / 10) * 10);
            const neededUnits = bottleneck
              ? (targetPacks - item.calculatedSellablePacks) * bottleneck.requiredPerPack
              : 0;

            return (
              <div key={key} className="py-3 px-0.5 space-y-2">
                {/* Main Row: Store Name (display font), Large "Can sell X packs", Muted Limited-by sentence */}
                <div
                  onClick={() => toggleExpand(key)}
                  className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.calculatedSellablePacks > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <h3 className="font-display font-medium text-sm sm:text-base text-ink">
                        {storeName}
                      </h3>
                      <span className="text-[11px] font-mono text-muted">
                        {item.variantSku}
                      </span>
                    </div>

                    {bottleneck && (
                      <p className="text-xs text-muted">
                        Limited by {bottleneckParsed?.humanTitle || bottleneck.name} ({bottleneck.availableWarehouseStock} in stock, needs {bottleneck.requiredPerPack} per pack)
                      </p>
                    )}
                  </div>

                  {/* Can sell count + expand toggle */}
                  <div className="shrink-0 flex items-center gap-3 self-start sm:self-auto">
                    <span className="font-display font-semibold text-base sm:text-lg text-ink">
                      Can sell {item.calculatedSellablePacks} packs
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    )}
                  </div>
                </div>

                {/* Plain text link below row (no box, no icon) */}
                {bottleneck && item.calculatedSellablePacks < 50 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => onOpenBatchModal(bottleneck.sku)}
                      className="text-xs font-semibold text-ink hover:underline cursor-pointer"
                    >
                      Print {neededUnits} more {bottleneckParsed?.humanTitle || bottleneck.name} to reach {targetPacks} packs →
                    </button>
                  </div>
                )}

                {/* Expanded Hairline Component Table (Limiting row bold with thin black left rule, no fill) */}
                {isExpanded && (
                  <div className="pt-2">
                    <div className="border border-border overflow-x-auto bg-surface">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase text-[10px]">
                            <th className="py-2 px-3 font-medium">Component</th>
                            <th className="py-2 px-3 font-medium">SKU</th>
                            <th className="py-2 px-3 text-right font-medium">Needed / pack</th>
                            <th className="py-2 px-3 text-right font-medium">In stock</th>
                            <th className="py-2 px-3 text-right font-medium">Packs supported</th>
                            <th className="py-2 px-3 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-sans text-xs">
                          {item.components.map((c) => {
                            const cParsed = parseSkuDetails(c.sku);
                            return (
                              <tr
                                key={c.id}
                                className={
                                  c.isBottleneck
                                    ? 'border-l-2 border-l-ink font-semibold'
                                    : ''
                                }
                              >
                                <td className="py-2.5 px-3 text-ink">
                                  {cParsed.humanTitle || c.name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-muted">
                                  {c.sku}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {c.requiredPerPack}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {c.availableWarehouseStock > 0 ? (
                                    <span className="inline-flex items-center justify-end gap-1 text-ink">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.isBottleneck ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                      <span>{c.availableWarehouseStock.toLocaleString()}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-end gap-1 text-danger font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                      <span>0</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {c.unitsPossible.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {c.isBottleneck && c.sku && !c.sku.startsWith('UNKNOWN') && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenBatchModal(c.sku)}
                                      className="text-xs font-semibold text-ink hover:underline cursor-pointer"
                                    >
                                      Print more →
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formula Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-sm border border-border bg-surface p-5 shadow-lg space-y-3 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                Pack Availability Formula
              </h3>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-mono text-xs text-ink">
              Can sell = min( floor( Stock / Required ) )
            </p>

            <p className="text-muted leading-relaxed text-xs">
              Pack availability is bounded by the scarcest required physical component. Increasing other components will not increase sellable packs until the bottleneck component is replenished.
            </p>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
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
