import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Copy,
  Check,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  AdminInventoryTagRecord,
  TagStockState,
  AdminInventorySummary,
} from '../../../types/admin';
import {
  TAG_STATE_MAP,
  parseSkuDetails,
  formatRelativeTime,
  formatExactTime,
  copyToClipboard,
} from './inventoryUtils';

interface InventoryTagsSectionProps {
  tags: AdminInventoryTagRecord[];
  total: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  skuFilter: string;
  stateFilter: string;
  searchTerm: string;
  availableSkuOptions: Array<{ sku: string; name: string; label: string }>;
  summary: AdminInventorySummary | null;
  onPageChange: (page: number) => void;
  onSkuFilterChange: (sku: string) => void;
  onStateFilterChange: (state: string) => void;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
  onOpenStickerModal: (tagNumber: string, isMini?: boolean) => void;
  onUpdateTagState: (tag: AdminInventoryTagRecord, nextState: TagStockState, reason?: string) => Promise<void>;
}

export const InventoryTagsSection: React.FC<InventoryTagsSectionProps> = ({
  tags,
  total,
  totalPages,
  currentPage,
  isLoading,
  error,
  skuFilter,
  stateFilter,
  searchTerm,
  availableSkuOptions,
  summary,
  onPageChange,
  onSkuFilterChange,
  onStateFilterChange,
  onSearchChange,
  onRefresh,
  onOpenStickerModal,
  onUpdateTagState,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [activeDetailTag, setActiveDetailTag] = useState<AdminInventoryTagRecord | null>(null);

  // Confirm State Change Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    tag: AdminInventoryTagRecord;
    nextState: TagStockState;
    title: string;
    description: string;
  } | null>(null);
  const [dialogReason, setDialogReason] = useState('');
  const [isSubmittingState, setIsSubmittingState] = useState(false);

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: summary?.totals?.totalPhysicalTags ?? total,
      IN_STOCK: summary?.totals?.physicalStock ?? 0,
      ALLOCATED_TO_ORDER: summary?.totals?.paidUnfulfilledDemand ?? 0,
      GENERATED: summary?.serializedBySku?.reduce((sum, s) => sum + (s.generated || 0), 0) || 0,
      SENT_TO_PRINT: summary?.serializedBySku?.reduce((sum, s) => sum + (s.sentToPrint || 0), 0) || 0,
      DISPATCHED: 0,
      DELIVERED: summary?.totals?.assignedToVehicles ?? 0,
      DAMAGED: summary?.serializedBySku?.reduce((sum, s) => sum + (s.damaged || 0), 0) || 0,
    };
    return counts;
  }, [summary, total]);

  // Uppercase text filters with muted counts
  const segmentedStates: Array<{ value: string; label: string }> = [
    { value: 'ALL', label: 'ALL' },
    { value: 'IN_STOCK', label: 'IN STOCK' },
    { value: 'ALLOCATED_TO_ORDER', label: 'RESERVED' },
    { value: 'GENERATED', label: 'WAITING TO PRINT' },
    { value: 'SENT_TO_PRINT', label: 'AT PRINTER' },
    { value: 'DISPATCHED', label: 'SHIPPED' },
    { value: 'DELIVERED', label: 'DELIVERED' },
    { value: 'DAMAGED', label: 'DAMAGED' },
  ];

  const handleConfirmStateChange = async () => {
    if (!confirmDialog) return;
    setIsSubmittingState(true);
    try {
      await onUpdateTagState(confirmDialog.tag, confirmDialog.nextState, dialogReason.trim() || undefined);
      setConfirmDialog(null);
      setDialogReason('');
      setActiveDetailTag(null);
    } catch (err: any) {
      alert(`Failed to update state: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingState(false);
    }
  };

  const isProductFiltered = skuFilter !== 'ALL';

  return (
    <div className="space-y-3">
      {/* ── TOP SEARCH & PRODUCT SELECT BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by tag #, order #, vehicle or user..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-sm bg-surface border border-border text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors font-mono"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Product Select */}
        <div className="w-full sm:w-64">
          <select
            value={skuFilter}
            onChange={(e) => onSkuFilterChange(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-sm bg-surface border border-border text-ink focus:outline-none focus:border-ink cursor-pointer"
          >
            <option value="ALL">All Products ({availableSkuOptions.length})</option>
            {availableSkuOptions.map((opt) => (
              <option key={opt.sku} value={opt.sku}>
                {opt.name} ({opt.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── SINGLE ROW OF SMALL UPPERCASE TEXT FILTERS WITH MUTED COUNTS & UNDERLINE ON ACTIVE ── */}
      <div className="flex items-center gap-4 overflow-x-auto border-b border-border pb-2 pt-1 scrollbar-none">
        {segmentedStates.map((st) => {
          const isActive = stateFilter === st.value;
          const count = stateCounts[st.value];
          return (
            <button
              key={st.value}
              type="button"
              onClick={() => onStateFilterChange(st.value)}
              className={`text-[10px] font-mono uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors relative pb-1 ${
                isActive ? 'text-ink font-bold' : 'text-muted hover:text-ink font-medium'
              }`}
            >
              <span>{st.label}</span>
              {count !== undefined && (
                <span className="text-muted ml-1 font-normal">({count})</span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active filter reset if applied */}
      {(skuFilter !== 'ALL' || stateFilter !== 'ALL' || searchTerm) && (
        <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
          <span>Active filter applied</span>
          <span>·</span>
          <button
            type="button"
            onClick={() => {
              onSkuFilterChange('ALL');
              onStateFilterChange('ALL');
              onSearchChange('');
            }}
            className="text-ink underline cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* ── DESKTOP TABLE VIEW (>=768px) ── */}
      <div className="hidden md:block border border-border rounded-sm bg-surface overflow-hidden">
        {isLoading && tags.length === 0 ? (
          <div className="py-12 text-center text-muted text-xs">
            Loading tags...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-danger space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-secondary !min-h-[30px] !py-0 !px-3 text-xs"
            >
              Retry
            </button>
          </div>
        ) : tags.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted font-mono">
            No tags match the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-bg/95 backdrop-blur-xs border-b border-border">
                <tr className="text-muted font-mono uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 font-medium">Tag Number</th>
                  {!isProductFiltered && <th className="py-2.5 px-3 font-medium">Product</th>}
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Order / Customer</th>
                  <th className="py-2.5 px-3 font-medium">Linked To</th>
                  <th className="py-2.5 px-3 font-medium">Last Updated</th>
                  <th className="py-2.5 px-3 font-medium text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-sans">
                {tags.map((t) => {
                  const stateMeta = TAG_STATE_MAP[t.stockState] || TAG_STATE_MAP.IN_STOCK;
                  const parsed = parseSkuDetails(t.sku);
                  const orderNum = t.activeHold?.orderNumber || (t.stockState === 'ALLOCATED_TO_ORDER' ? t.activeHold?.orderId : null);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setActiveDetailTag(t)}
                      className="hover:bg-bg/40 transition-colors cursor-pointer group h-12"
                    >
                      {/* Tag Number (Mono + Copy Target) */}
                      <td className="py-2.5 px-3 font-mono font-medium text-ink">
                        <div className="flex items-center gap-1.5">
                          <span>{t.tagNumber}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(t.tagNumber, `desk-${t.id}`);
                            }}
                            className="text-muted hover:text-ink p-0.5 rounded cursor-pointer"
                            title="Copy Tag Number"
                          >
                            {copiedId === `desk-${t.id}` ? (
                              <Check className="w-3 h-3 text-ink" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted/60" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Product (Hidden when filtered to 1 product) */}
                      {!isProductFiltered && (
                        <td className="py-2.5 px-3 text-ink">
                          {parsed.humanTitle}
                        </td>
                      )}

                      {/* Status: Semantic colored indicator dot + plain text */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${stateMeta.isDanger ? 'text-danger font-semibold' : 'text-ink'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stateMeta.dotClass || 'bg-ink'}`} />
                          <span>
                            {t.stockState === 'ALLOCATED_TO_ORDER' && t.activeHold?.orderNumber
                              ? `Assigned to order #${t.activeHold.orderNumber}`
                              : stateMeta.label}
                          </span>
                        </span>
                      </td>

                      {/* Order / Customer Link */}
                      <td className="py-2.5 px-3">
                        {orderNum ? (
                          <Link
                            to={`/admin/fulfillment?order=${encodeURIComponent(orderNum)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-ink hover:underline font-semibold"
                          >
                            #{orderNum}
                          </Link>
                        ) : t.assignedVehicle?.owner?.name ? (
                          <span className="text-ink">
                            {t.assignedVehicle.owner.name}
                          </span>
                        ) : (
                          <span className="text-muted font-mono">–</span>
                        )}
                      </td>

                      {/* Linked Resource */}
                      <td className="py-2.5 px-3 text-ink">
                        {t.assignedVehicle ? (
                          <span>
                            {t.assignedVehicle.name || 'Vehicle'}
                            {t.assignedVehicle.registrationNum && (
                              <span className="text-muted font-mono ml-1">
                                ({t.assignedVehicle.registrationNum})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted font-mono">–</span>
                        )}
                      </td>

                      {/* Relative Last Updated */}
                      <td
                        className="py-2.5 px-3 font-mono text-muted text-xs cursor-help"
                        title={formatExactTime(t.updatedAt)}
                      >
                        {formatRelativeTime(t.updatedAt)}
                      </td>

                      {/* Actions Kebab */}
                      <td
                        className="py-2.5 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenKebabId(openKebabId === t.id ? null : t.id)
                            }
                            className="w-7 h-7 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openKebabId === t.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 border border-border bg-surface shadow-md py-1 z-30 font-sans text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKebabId(null);
                                  onOpenStickerModal(t.tagNumber, t.sku.includes('MINI'));
                                }}
                                className="w-full text-left px-3 py-1.5 text-ink hover:bg-bg cursor-pointer"
                              >
                                Print sticker
                              </button>

                              {t.stockState !== 'DAMAGED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenKebabId(null);
                                    setConfirmDialog({
                                      tag: t,
                                      nextState: 'DAMAGED',
                                      title: 'Mark Tag as Damaged',
                                      description: `This will mark tag #${t.tagNumber} defective and remove it from sellable inventory.`,
                                    });
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-danger hover:bg-bg cursor-pointer"
                                >
                                  Mark as damaged
                                </button>
                              )}

                              {t.stockState === 'DAMAGED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenKebabId(null);
                                    setConfirmDialog({
                                      tag: t,
                                      nextState: 'IN_STOCK',
                                      title: 'Return Tag to Stock',
                                      description: `Tag #${t.tagNumber} will be marked IN_STOCK and made sellable again.`,
                                    });
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-ink hover:bg-bg cursor-pointer"
                                >
                                  Return to stock
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKebabId(null);
                                  setActiveDetailTag(t);
                                }}
                                className="w-full text-left px-3 py-1.5 text-ink hover:bg-bg cursor-pointer"
                              >
                                View history
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MOBILE CARD LIST (<768px): Hairline borders only, no fills ── */}
      <div className="block md:hidden border-y border-border divide-y divide-border">
        {isLoading && tags.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted">
            Loading tags...
          </div>
        ) : tags.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted font-mono">
            No tags found.
          </div>
        ) : (
          tags.map((t) => {
            const stateMeta = TAG_STATE_MAP[t.stockState] || TAG_STATE_MAP.IN_STOCK;
            const parsed = parseSkuDetails(t.sku);

            return (
              <div
                key={t.id}
                onClick={() => setActiveDetailTag(t)}
                className="py-2.5 px-0.5 space-y-1.5 cursor-pointer select-none"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-ink">
                      {t.tagNumber}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(t.tagNumber, `mob-${t.id}`);
                      }}
                      className="p-1 text-muted hover:text-ink cursor-pointer"
                    >
                      {copiedId === `mob-${t.id}` ? (
                        <Check className="w-3 h-3 text-ink" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted/60" />
                      )}
                    </button>
                  </div>

                  {/* Bullet + Status */}
                  <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${stateMeta.isDanger ? 'text-danger font-semibold' : 'text-ink'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stateMeta.dotClass || 'bg-ink'}`} />
                    <span>{stateMeta.label}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{parsed.humanTitle}</span>
                  <span className="font-mono">{formatRelativeTime(t.updatedAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted font-mono text-[11px]">
            Page {currentPage} of {totalPages} ({total} tags)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="text-xs text-ink disabled:text-muted/40 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="text-xs text-ink disabled:text-muted/40 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tag Detail & Verb Actions Bottom Sheet */}
      {activeDetailTag && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-t-sm sm:rounded-sm border border-border bg-surface p-5 space-y-4 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-muted">Tag Record</span>
                <h3 className="font-mono text-base font-bold text-ink">
                  #{activeDetailTag.tagNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailTag(null)}
                className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 font-mono text-xs text-muted">
              <div className="flex justify-between">
                <span>SKU:</span>
                <span className="text-ink">{activeDetailTag.sku}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-ink font-semibold">
                  {TAG_STATE_MAP[activeDetailTag.stockState]?.label || activeDetailTag.stockState}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Resource:</span>
                <span className="text-ink">
                  {activeDetailTag.assignedVehicle?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Updated:</span>
                <span className="text-ink">
                  {formatExactTime(activeDetailTag.updatedAt)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <button
                type="button"
                onClick={() => {
                  onOpenStickerModal(activeDetailTag.tagNumber, activeDetailTag.sku.includes('MINI'));
                }}
                className="w-full py-2 text-center text-xs font-semibold text-ink border border-border bg-surface rounded-xs cursor-pointer"
              >
                Print sticker
              </button>

              {activeDetailTag.stockState !== 'DAMAGED' && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDialog({
                      tag: activeDetailTag,
                      nextState: 'DAMAGED',
                      title: 'Mark Tag as Damaged',
                      description: `Tag #${activeDetailTag.tagNumber} will be marked DAMAGED and removed from sellable inventory.`,
                    });
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-danger border border-border bg-surface rounded-xs cursor-pointer"
                >
                  Mark as damaged
                </button>
              )}

              {activeDetailTag.stockState === 'DAMAGED' && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDialog({
                      tag: activeDetailTag,
                      nextState: 'IN_STOCK',
                      title: 'Return Tag to Stock',
                      description: `Tag #${activeDetailTag.tagNumber} will be returned to IN_STOCK.`,
                    });
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-ink border border-border bg-surface rounded-xs cursor-pointer"
                >
                  Return to stock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-sm border border-border bg-surface p-5 shadow-lg space-y-4 font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                {confirmDialog.title}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="w-6 h-6 flex items-center justify-center text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-muted leading-relaxed">
              {confirmDialog.description}
            </p>

            <div>
              <label className="block text-[11px] font-medium text-ink mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={dialogReason}
                onChange={(e) => setDialogReason(e.target.value)}
                placeholder="e.g. Defective print, scratch..."
                className="w-full px-3 py-1.5 rounded-xs border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn btn-secondary !min-h-[32px] !py-0 !px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingState}
                onClick={handleConfirmStateChange}
                className="btn btn-primary !min-h-[32px] !py-0 !px-4 text-xs"
              >
                {isSubmittingState ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
