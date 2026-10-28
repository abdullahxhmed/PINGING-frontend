import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  MoreVertical,
  X,
} from 'lucide-react';
import type { SerializedSkuSummary } from '../../../types/admin';
import {
  parseSkuDetails,
  getReorderThreshold,
  setReorderThreshold,
  getHealthStatus,
  copyToClipboard,
} from './inventoryUtils';

interface InventoryStockSectionProps {
  serializedSummaries: SerializedSkuSummary[];
  onOpenBatchModal: (sku: string) => void;
  onFilterTagsBySku: (sku: string) => void;
  onNavigateTab: (tab: 'stock' | 'bundles' | 'tags' | 'production' | 'setup') => void;
}

export const InventoryStockSection: React.FC<InventoryStockSectionProps> = ({
  serializedSummaries,
  onOpenBatchModal,
  onFilterTagsBySku,
  onNavigateTab,
}) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [openKebabSku, setOpenKebabSku] = useState<string | null>(null);
  const [editingThresholdSku, setEditingThresholdSku] = useState<string | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(10);
  const [activeMobileActionItem, setActiveMobileActionItem] = useState<{
    summary: SerializedSkuSummary;
    parsed: ReturnType<typeof parseSkuDetails>;
  } | null>(null);

  // Listen to threshold updates to trigger rerender
  const [, setRerenderTick] = useState(0);
  useEffect(() => {
    const handleThresholdChange = () => setRerenderTick((t) => t + 1);
    window.addEventListener('inventory:threshold-updated', handleThresholdChange);
    return () => window.removeEventListener('inventory:threshold-updated', handleThresholdChange);
  }, []);

  const handleCopy = async (sku: string) => {
    const success = await copyToClipboard(sku);
    if (success) {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 1500);
    }
  };

  const handleSaveThreshold = (sku: string) => {
    setReorderThreshold(sku, tempThresholdValue);
    setEditingThresholdSku(null);
  };

  // Group SKUs by product category into a single table
  const groupedData = React.useMemo(() => {
    const groups: Record<
      string,
      { label: string; items: Array<{ summary: SerializedSkuSummary; parsed: ReturnType<typeof parseSkuDetails> }> }
    > = {
      VEHICLE_STICKER: { label: 'VEHICLE STICKERS', items: [] },
      KEYCHAIN: { label: 'KEYCHAINS', items: [] },
      MINI_STICKER: { label: 'MINI STICKERS', items: [] },
      OTHER: { label: 'OTHER PRODUCTS', items: [] },
      LEGACY: { label: 'LEGACY & UNMAPPED TAGS', items: [] },
    };

    serializedSummaries.forEach((s) => {
      const parsed = parseSkuDetails(s.sku);
      const groupKey = groups[parsed.category] ? parsed.category : 'OTHER';
      groups[groupKey].items.push({ summary: s, parsed });
    });

    return Object.entries(groups).filter(([, g]) => g.items.length > 0);
  }, [serializedSummaries]);

  return (
    <div className="space-y-3">
      {/* Quiet top action line with "Show all columns" toggle */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-medium">
          STOCK BY PRODUCT ({serializedSummaries.length})
        </span>

        <button
          type="button"
          onClick={() => setShowAllColumns(!showAllColumns)}
          className="text-xs font-sans text-muted hover:text-ink underline cursor-pointer"
        >
          {showAllColumns ? 'Show default columns' : 'Show all columns →'}
        </button>
      </div>

      {serializedSummaries.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted font-mono border border-border">
          No stock records tracked.
        </div>
      ) : (
        <>
          {/* ── DESKTOP VIEW: ONE SINGLE TABLE WITH INLINE GROUP HEADERS (>=768px) ── */}
          <div className="hidden md:block border border-border rounded-sm bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-bg/95 backdrop-blur-xs border-b border-border">
                  <tr className="text-muted font-mono uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Product</th>
                    <th className="py-2.5 px-3 font-medium text-right w-24">Ready to sell</th>
                    <th className="py-2.5 px-3 font-medium text-right w-20">Reserved</th>
                    <th className="py-2.5 px-3 font-medium text-right w-24">Waiting to print</th>
                    <th className="py-2.5 px-3 font-medium text-right w-20">At printer</th>
                    <th className="py-2.5 px-3 font-medium text-right w-20">Damaged</th>
                    {showAllColumns && (
                      <>
                        <th className="py-2.5 px-3 font-medium text-right w-20 bg-bg/40">In cart</th>
                        <th className="py-2.5 px-3 font-medium text-right w-24 bg-bg/40">In warehouse</th>
                        <th className="py-2.5 px-3 font-medium text-right w-20 bg-bg/40">Total</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 font-medium text-right w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupedData.map(([categoryKey, group]) => (
                    <React.Fragment key={categoryKey}>
                      {/* Group Header Row inside the single table */}
                      <tr className="bg-bg/60 border-y border-border">
                        <td
                          colSpan={showAllColumns ? 10 : 7}
                          className="py-1.5 px-3 text-[10px] font-mono uppercase tracking-wider text-muted font-semibold"
                        >
                          {group.label} ({group.items.length})
                        </td>
                      </tr>

                      {group.items.map(({ summary: item, parsed }) => {
                        const physical = item.physicalStock ?? item.inStock ?? 0;
                        const committed = item.committedDemand ?? (item.reserved || 0);
                        const sellable = item.sellableStock ?? Math.max(0, physical - committed);
                        const threshold = getReorderThreshold(item.sku);
                        const health = getHealthStatus(sellable, threshold, parsed.isLegacy);
                        const waitingToPrint = item.generated ?? 0;
                        const atPrinter = item.sentToPrint ?? 0;
                        const damaged = item.damaged ?? 0;

                        // Functional Fix: Legacy SKU must not show "Print more"
                        let rowAction: { label: string; onClick: () => void } | null = null;
                        if (parsed.isLegacy) {
                          rowAction = {
                            label: 'Fix mapping →',
                            onClick: () => onFilterTagsBySku(item.sku),
                          };
                        } else if (sellable <= threshold) {
                          rowAction = {
                            label: 'Print more →',
                            onClick: () => onOpenBatchModal(item.sku),
                          };
                        } else if (waitingToPrint > 0) {
                          rowAction = {
                            label: 'Send to print →',
                            onClick: () => onNavigateTab('production'),
                          };
                        }

                        return (
                          <tr
                            key={item.sku}
                            onClick={() => onFilterTagsBySku(item.sku)}
                            className="hover:bg-bg/40 transition-colors cursor-pointer group h-12"
                          >
                            {/* Product: Display font name + small muted mono SKU with copy + exception chip + tiny health indicator */}
                            <td className="py-2.5 px-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Tiny semantic health dot */}
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${health.dotClass}`} />
                                  <span className="font-display font-medium text-xs text-ink">
                                    {parsed.humanTitle}
                                  </span>

                                  {/* Small uppercase micro-chip for exceptions only (LOW, OUT, LEGACY) */}
                                  {health.status === 'OUT' && (
                                    <span className="px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold text-danger border border-danger/40">
                                      OUT
                                    </span>
                                  )}
                                  {health.status === 'LOW' && (
                                    <span className="px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold bg-ink text-surface">
                                      LOW
                                    </span>
                                  )}
                                  {health.status === 'LEGACY' && (
                                    <span className="px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold bg-bg text-muted border border-border">
                                      LEGACY
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-[11px] font-mono text-muted pl-3">
                                  <span>{item.sku}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(item.sku);
                                    }}
                                    className="p-0.5 text-muted hover:text-ink cursor-pointer"
                                    title="Copy SKU"
                                  >
                                    {copiedSku === item.sku ? (
                                      <Check className="w-3 h-3 text-ink" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-muted/60" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Ready to sell (Largest number, right-aligned) */}
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-sm">
                              {sellable > 0 ? (
                                <span className="text-ink">{sellable.toLocaleString()}</span>
                              ) : (
                                <span className={`inline-flex items-center justify-end gap-1 ${parsed.isLegacy ? 'text-muted' : 'text-danger'}`}>
                                  {!parsed.isLegacy && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                                  <span>0</span>
                                </span>
                              )}
                            </td>

                            {/* Reserved (Allocated to order: tiny blue indicator when active) */}
                            <td className="py-2.5 px-3 text-right font-mono text-ink">
                              {committed > 0 ? (
                                <span className="inline-flex items-center justify-end gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span>{committed.toLocaleString()}</span>
                                </span>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>

                            {/* Waiting to print (In print: tiny orange indicator when active) */}
                            <td className="py-2.5 px-3 text-right font-mono text-ink">
                              {waitingToPrint > 0 ? (
                                <span className="inline-flex items-center justify-end gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>{waitingToPrint.toLocaleString()}</span>
                                </span>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>

                            {/* At printer (In print: tiny orange indicator when active) */}
                            <td className="py-2.5 px-3 text-right font-mono text-ink">
                              {atPrinter > 0 ? (
                                <span className="inline-flex items-center justify-end gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>{atPrinter.toLocaleString()}</span>
                                </span>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>

                            {/* Damaged (Red indicator when active) */}
                            <td className="py-2.5 px-3 text-right font-mono">
                              {damaged > 0 ? (
                                <span className="inline-flex items-center justify-end gap-1 text-danger font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                  <span>{damaged.toLocaleString()}</span>
                                </span>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>

                            {/* Optional All Columns */}
                            {showAllColumns && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-muted bg-bg/20">
                                  {(item.activeReservationsDemand ?? item.reserved ?? 0) > 0
                                    ? (item.activeReservationsDemand ?? item.reserved ?? 0)
                                    : '–'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-ink bg-bg/20">
                                  {physical > 0 ? physical : '–'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-ink font-semibold bg-bg/20">
                                  {(item.total ?? 0) > 0 ? item.total : '–'}
                                </td>
                              </>
                            )}

                            {/* Actions: Plain text link + Kebab */}
                            <td
                              className="py-2.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2">
                                {rowAction && (
                                  <button
                                    type="button"
                                    onClick={rowAction.onClick}
                                    className="text-xs font-semibold text-ink hover:underline cursor-pointer"
                                  >
                                    {rowAction.label}
                                  </button>
                                )}

                                {/* Quiet Kebab */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenKebabSku(openKebabSku === item.sku ? null : item.sku)
                                    }
                                    className="w-7 h-7 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {openKebabSku === item.sku && (
                                    <div className="absolute right-0 top-full mt-1 w-44 border border-border bg-surface shadow-md py-1 z-30 font-sans text-xs">
                                      {!parsed.isLegacy && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenKebabSku(null);
                                            onOpenBatchModal(item.sku);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-ink hover:bg-bg cursor-pointer"
                                        >
                                          Create print batch
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKebabSku(null);
                                          onFilterTagsBySku(item.sku);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-ink hover:bg-bg cursor-pointer"
                                      >
                                        View tag records
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenKebabSku(null);
                                          setEditingThresholdSku(item.sku);
                                          setTempThresholdValue(threshold);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-ink hover:bg-bg cursor-pointer"
                                      >
                                        Set reorder level ({threshold})
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE VIEW: COMPACT 2-LINE ROWS, HAIRLINE BORDERS ONLY (<768px) ── */}
          <div className="block md:hidden border-y border-border divide-y divide-border">
            {serializedSummaries.map((item) => {
              const parsed = parseSkuDetails(item.sku);
              const physical = item.physicalStock ?? item.inStock ?? 0;
              const committed = item.committedDemand ?? (item.reserved || 0);
              const sellable = item.sellableStock ?? Math.max(0, physical - committed);
              const threshold = getReorderThreshold(item.sku);
              const health = getHealthStatus(sellable, threshold, parsed.isLegacy);
              const waitingToPrint = item.generated ?? 0;
              const atPrinter = item.sentToPrint ?? 0;
              const damaged = item.damaged ?? 0;

              return (
                <div
                  key={item.sku}
                  onClick={() => setActiveMobileActionItem({ summary: item, parsed })}
                  className="py-2.5 px-0.5 flex items-stretch justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left Column: Name, SKU, and second metadata line */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${health.dotClass}`} />
                      <span className="font-display font-medium text-xs text-ink truncate">
                        {parsed.humanTitle}
                      </span>
                      {health.status === 'OUT' && (
                        <span className="px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold text-danger border border-danger/40">
                          OUT
                        </span>
                      )}
                      {health.status === 'LOW' && (
                        <span className="px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold bg-ink text-surface">
                          LOW
                        </span>
                      )}
                      {health.status === 'LEGACY' && (
                        <span className="px-1 py-0.2 rounded-xs text-[9px] font-mono uppercase font-bold bg-bg text-muted border border-border">
                          LEGACY
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] font-mono text-muted pl-3">
                      {item.sku}
                    </p>

                    {/* Muted second line with tiny color accents */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted font-mono pt-0.5 pl-3">
                      <span className="inline-flex items-center gap-1">
                        {committed > 0 && <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />}
                        <span className={committed > 0 ? 'text-ink' : ''}>{committed} reserved</span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {waitingToPrint > 0 && <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />}
                        <span className={waitingToPrint > 0 ? 'text-ink' : ''}>{waitingToPrint} to print</span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {atPrinter > 0 && <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />}
                        <span className={atPrinter > 0 ? 'text-ink' : ''}>{atPrinter} at printer</span>
                      </span>
                      {damaged > 0 && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-danger font-semibold">
                            <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                            <span>{damaged} damaged</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Big "Ready to sell" number */}
                  <div className="shrink-0 flex flex-col justify-center items-end text-right pl-2">
                    <span className="text-[10px] text-muted font-mono uppercase">Ready</span>
                    <span className="font-display font-semibold text-lg">
                      {sellable > 0 ? (
                        <span className="text-ink">{sellable.toLocaleString()}</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 ${parsed.isLegacy ? 'text-muted' : 'text-danger'}`}>
                          {!parsed.isLegacy && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                          <span>0</span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Mobile Row Tap Bottom Sheet Actions */}
      {activeMobileActionItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-t-sm border-t border-border bg-surface p-4 space-y-3 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-muted">Stock Action</span>
                <h4 className="font-display font-medium text-sm text-ink">
                  {activeMobileActionItem.parsed.humanTitle}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveMobileActionItem(null)}
                className="w-7 h-7 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-xs text-muted">
              <div className="flex justify-between">
                <span>SKU:</span>
                <span className="text-ink">{activeMobileActionItem.summary.sku}</span>
              </div>
              <div className="flex justify-between">
                <span>Warehouse physical:</span>
                <span className="text-ink">
                  {activeMobileActionItem.summary.physicalStock ?? activeMobileActionItem.summary.inStock ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reorder threshold:</span>
                <span className="text-ink">
                  {getReorderThreshold(activeMobileActionItem.summary.sku)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              {!activeMobileActionItem.parsed.isLegacy && (
                <button
                  type="button"
                  onClick={() => {
                    const sku = activeMobileActionItem.summary.sku;
                    setActiveMobileActionItem(null);
                    onOpenBatchModal(sku);
                  }}
                  className="w-full py-2.5 text-center text-xs font-semibold text-surface bg-ink rounded-xs cursor-pointer"
                >
                  Create print batch
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const sku = activeMobileActionItem.summary.sku;
                  setActiveMobileActionItem(null);
                  onFilterTagsBySku(sku);
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-ink border border-border bg-surface rounded-xs cursor-pointer"
              >
                View tag records
              </button>

              <button
                type="button"
                onClick={() => {
                  const sku = activeMobileActionItem.summary.sku;
                  const th = getReorderThreshold(sku);
                  setActiveMobileActionItem(null);
                  setEditingThresholdSku(sku);
                  setTempThresholdValue(th);
                }}
                className="w-full py-2 text-center text-xs text-muted hover:text-ink underline cursor-pointer"
              >
                Set reorder level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {editingThresholdSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-sm border border-border bg-surface p-5 shadow-lg space-y-4 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                Set Reorder Point
              </h3>
              <button
                type="button"
                onClick={() => setEditingThresholdSku(null)}
                className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-muted leading-relaxed">
              Show LOW alert when ready to sell stock for <strong className="text-ink font-mono">{editingThresholdSku}</strong> is at or below this count.
            </p>

            <div>
              <input
                type="number"
                min="0"
                max="10000"
                value={tempThresholdValue}
                onChange={(e) => setTempThresholdValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-xs border border-border bg-bg text-ink font-mono text-sm focus:border-ink focus:outline-none"
              />
              <span className="text-[10px] text-muted font-mono mt-1 block">Default: 10 units · 0 shows OUT</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingThresholdSku(null)}
                className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveThreshold(editingThresholdSku)}
                className="btn btn-primary !min-h-[32px] !py-0 !px-4 text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
