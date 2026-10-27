import React, { useState, useEffect, useCallback } from 'react';
import { Boxes, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import type { AdminProduct, AdminInventorySummary } from '../../types/admin';

interface BundleHealthSectionProps {
  summary: AdminInventorySummary | null;
  onRefresh?: () => void;
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

export const BundleHealthSection: React.FC<BundleHealthSectionProps> = ({
  summary,
  onRefresh,
}) => {
  const [bundles, setBundles] = useState<BundleAvailabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stock lookup maps built from authoritative inventory summary
  const getComponentStock = useCallback(
    (sku: string | undefined): number => {
      if (!sku || !summary) return 0;
      // 1. Check serialized inventory summary (sellable stock = max(0, physical - committed))
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

      // 2. Check bulk stock items
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

  // Fetch catalog products and evaluate bundle health
  const evaluateBundles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await adminApi.getCatalogProducts({ limit: 50 });
      const products: AdminProduct[] = res?.products || (res as any)?.data?.products || [];

      // Filter products that represent bundles or have multi-component variants
      const bundleItems: BundleAvailabilityItem[] = [];

      for (const prod of products) {
        const variants = prod.variants || [];
        for (const v of variants) {
          const comps = v.components || [];
          if (comps.length === 0) continue;

          // Only consider physical & serialized components
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

          // Mark the bottleneck component(s)
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
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate bundle availability.');
    } finally {
      setIsLoading(false);
    }
  }, [getComponentStock]);

  useEffect(() => {
    evaluateBundles();
  }, [evaluateBundles]);

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden space-y-0">
      <div className="px-4 py-3 border-b border-border bg-bg/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-ink" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
              Bundle Health &amp; Component Constraints
            </h3>
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            Dynamic availability: <code className="font-mono text-[10px]">min(floor(componentStock / requiredPerPack))</code>. Constrained by the scarcest required physical SKU.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            evaluateBundles();
            if (onRefresh) onRefresh();
          }}
          disabled={isLoading}
          className="self-start sm:self-auto px-3 py-1.5 rounded border border-border bg-surface hover:border-ink text-xs font-medium text-ink flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Recalculate Availability</span>
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs text-danger bg-bg border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted font-mono flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-ink" />
          <span>Evaluating component constraints across catalog bundles...</span>
        </div>
      ) : bundles.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted">
          No multi-component packs or bundles configured in the catalog.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {bundles.map((item) => {
            const isOutOfStock = item.calculatedSellablePacks <= 0;
            const isLow = item.calculatedSellablePacks > 0 && item.calculatedSellablePacks <= 10;
            return (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="p-4 hover:bg-bg/40 transition-colors space-y-3"
              >
                {/* Bundle Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink">{item.productName}</span>
                      <span className="text-[10px] text-muted font-mono">({item.variantName})</span>
                      <span className="text-[10px] font-mono text-muted bg-bg px-1.5 py-0.5 rounded border border-border">
                        {item.variantSku}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Calculated Sellable Count */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Sellable Availability:</span>
                      <span
                        className={`text-sm font-bold font-mono px-2 py-0.5 rounded border ${
                          isOutOfStock
                            ? 'bg-bg text-danger border-border'
                            : isLow
                            ? 'bg-bg text-ink border-border font-semibold'
                            : 'bg-bg text-ink border-border'
                        }`}
                      >
                        {item.calculatedSellablePacks} packs
                      </span>
                    </div>

                    {/* Bottleneck Badge */}
                    {item.bottleneckComponent && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
                        <span>Constrained by:</span>
                        <strong className="text-ink">
                          {item.bottleneckComponent.sku} ({item.bottleneckComponent.availableWarehouseStock} in stock)
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Component Breakdown Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  {item.components.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2 rounded border text-xs flex flex-col justify-between gap-1 ${
                        c.isBottleneck
                          ? 'border-ink bg-bg ring-1 ring-ink/30'
                          : 'border-border bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-ink truncate" title={c.name}>
                          {c.name}
                        </span>
                        {c.isBottleneck && (
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-ink text-surface font-semibold tracking-wider">
                            Bottleneck
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>Req: {c.requiredPerPack} per pack</span>
                        <span>Stock: {c.availableWarehouseStock}</span>
                      </div>

                      <div className="text-[10px] text-muted border-t border-border/50 pt-1 flex items-center justify-between">
                        <span>Max units:</span>
                        <span className="font-bold text-ink">{c.unitsPossible}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
