import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminBatchModal } from '../../components/admin/AdminBatchModal';
import { AdminStickerModal } from '../../components/admin/AdminStickerModal';
import { PingInQrCode } from '../../components/qr/PingInQrCode';
import { buildTagQrUrl } from '../../lib/qr';
import { adminApi } from '../../lib/adminApi';
import type {
  AdminQrSummary,
  AdminQrTagItem,
  AdminGenerateSingleQrResponse,
} from '../../types/admin';
import {
  Plus,
  Layers,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  X,
  Trash2,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import { ResourceAnalyticsModal } from '../../components/admin/ResourceAnalyticsModal';

export const AdminQrInventoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Summary & Table state
  const [summary, setSummary] = useState<AdminQrSummary | null>(null);
  const [tags, setTags] = useState<AdminQrTagItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy helper
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [stickerModal, setStickerModal] = useState<{
    isOpen: boolean;
    tagNumber: string;
    qrUrl?: string;
    resourceName?: string;
    ownerName?: string;
  }>({
    isOpen: false,
    tagNumber: '',
  });
  const [revokeConfirmTag, setRevokeConfirmTag] = useState<AdminQrTagItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [analyticsResource, setAnalyticsResource] = useState<{
    id: string;
    name: string;
    tagNumber?: string;
    ownerName?: string;
  } | null>(null);

  // Single Generate Form
  const [singleResourceId, setSingleResourceId] = useState('');
  const [singleOrigin, setSingleOrigin] = useState<'PREPRINTED_INVENTORY' | 'GENERATED_FOR_RESOURCE'>('PREPRINTED_INVENTORY');
  const [singleSubmitting, setSingleSubmitting] = useState(false);
  const [singleResult, setSingleResult] = useState<AdminGenerateSingleQrResponse | null>(null);

  // Handle URL action=batch
  useEffect(() => {
    if (searchParams.get('action') === 'batch') {
      setIsBatchModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchSummary = async () => {
    try {
      const res: any = await adminApi.getQrSummary();
      setSummary(res?.data || res);
    } catch {
      // Ignored
    }
  };

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res: any = await adminApi.getQrTags({
        page,
        limit,
        status: statusFilter,
        origin: originFilter,
      });
      const payload = res?.data || res;
      setTags(payload?.tags || []);
      setTotal(payload?.total || 0);
      setTotalPages(payload?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load QR inventory');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, originFilter]);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(id);
    setTimeout(() => setCopiedTag(null), 1800);
  };

  // Single Generation
  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleSubmitting(true);
    setError(null);
    try {
      const res = await adminApi.generateSingleQr({
        resourceId: singleResourceId.trim() || undefined,
        origin: singleOrigin,
      });
      setSingleResult(res);
      fetchSummary();
      fetchTags();
    } catch (err: any) {
      setError(err.message || 'Single QR generation failed');
    } finally {
      setSingleSubmitting(false);
    }
  };

  // Revoke Action
  const handleRevokeConfirm = async () => {
    if (!revokeConfirmTag) return;
    setIsRevoking(true);
    try {
      await adminApi.revokeQrTag(revokeConfirmTag.id);
      setRevokeConfirmTag(null);
      fetchSummary();
      fetchTags();
    } catch (err: any) {
      alert(`Revoke failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            QR inventory
          </h1>
          <p className="text-xs text-muted mt-1">
            {(total ?? 0).toLocaleString()} registered physical stickers and digital tags
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setStickerModal({
                isOpen: true,
                tagNumber: tags[0]?.tagNumber || 'J39VFSA',
                qrUrl: tags[0] ? buildTagQrUrl(tags[0].tagNumber) : undefined,
              })
            }
            className="px-3 py-2 rounded border border-border bg-surface hover:border-ink text-xs font-semibold uppercase tracking-wider text-ink transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Open Kauntact Sticker Generator Studio"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Sticker Studio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSingleResult(null);
              setSingleResourceId('');
              setIsSingleModalOpen(true);
            }}
            className="px-3 py-2 rounded border border-border bg-surface hover:border-ink text-xs font-semibold uppercase tracking-wider text-ink transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Single</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3.5 py-2 rounded bg-ink text-surface hover:opacity-90 text-xs font-semibold uppercase tracking-wider transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>Generate batch</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Band */}
      {summary && (
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 py-2">
          <div>
            <span className="text-xs font-medium text-muted">Total generated</span>
            <div className="my-1">
              <span className="font-display text-2xl sm:text-3xl font-medium text-ink">
                {(summary.total ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted">All QR tags across system</div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted">Assigned / Paired</span>
            <div className="my-1">
              <span className="font-display text-2xl sm:text-3xl font-medium text-ink">
                {(summary.assigned ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted">
              {(summary.total ?? 0) > 0 ? Math.round(((summary.assigned ?? 0) / summary.total) * 100) : 0}% utilization
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted">Available / Ready</span>
            <div className="my-1">
              <span className="font-display text-2xl sm:text-3xl font-medium text-emerald-600">
                {(summary.unassigned ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted">Unassigned stickers</div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted">Revoked</span>
            <div className="my-1">
              <span className="font-display text-2xl sm:text-3xl font-medium text-rose-600">
                {(summary.revoked ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted">Permanently disabled</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="mt-8 p-4 bg-surface border border-border rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted mr-1.5 hidden sm:inline">
            Status:
          </span>
          {['ALL', 'UNASSIGNED', 'ASSIGNED', 'REVOKED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-ink text-surface'
                  : 'bg-bg text-muted hover:text-ink border border-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Origin Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted hidden sm:inline">
            Origin:
          </span>
          <select
            value={originFilter}
            onChange={(e) => {
              setOriginFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-bg border border-border rounded text-xs font-mono uppercase text-ink focus:outline-none focus:border-ink"
          >
            <option value="ALL">All Origins</option>
            <option value="PREPRINTED_INVENTORY">Preprinted Inventory</option>
            <option value="GENERATED_FOR_RESOURCE">Generated for Resource</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="my-6 p-4 rounded bg-danger/10 border border-danger/20 text-xs text-danger font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchTags()} className="underline font-bold uppercase tracking-wider">
            Retry
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="mt-6 bg-surface border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-4" />
            <p className="font-mono text-xs text-muted tracking-widest uppercase">
              Loading QR Inventory...
            </p>
          </div>
        ) : tags.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted font-mono">
            No QR tags found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/50 text-muted font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5 font-medium">Tag Number</th>
                  <th className="py-3 px-5 font-medium">Status</th>
                  <th className="py-3 px-5 font-medium">Origin</th>
                  <th className="py-3 px-5 font-medium">Paired Asset / Owner</th>
                  <th className="py-3 px-5 font-medium">Assignment</th>
                  <th className="py-3 px-5 font-medium">Created</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tags.map((t) => (
                  <tr key={t.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm tracking-widest text-ink">
                          {t.tagNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(t.tagNumber, t.id)}
                          className="text-muted hover:text-ink p-1 rounded transition-colors"
                          title="Copy tag number"
                        >
                          {copiedTag === t.id ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          t.status === 'ASSIGNED'
                            ? 'bg-ink text-surface'
                            : t.status === 'UNASSIGNED'
                            ? 'bg-success/15 text-success'
                            : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[11px] font-mono text-muted uppercase">
                        {t.origin === 'PREPRINTED_INVENTORY' ? 'Sticker Stock' : 'Digital Tag'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      {t.resource ? (
                        <div>
                          <div className="font-semibold text-ink">{t.resource.name}</div>
                          {t.resource.owner && (
                            <div className="font-mono text-[11px] text-muted">
                              {t.resource.owner.name} ({t.resource.owner.mobileNumber})
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-subtle text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-muted text-[11px]">
                      {t.assignedAt ? (
                        <span>
                          {t.assignmentMethod || 'PAIRED'} on{' '}
                          {new Date(t.assignedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-muted text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.resource?.id && (
                          <button
                            type="button"
                            onClick={() =>
                              setAnalyticsResource({
                                id: t.resource!.id,
                                name: t.resource!.name,
                                tagNumber: t.tagNumber,
                                ownerName: t.resource?.owner ? `${t.resource.owner.name} (${t.resource.owner.mobileNumber})` : undefined,
                              })
                            }
                            className="px-2.5 py-1 bg-surface border border-border hover:border-ink rounded text-xs font-semibold uppercase tracking-wider text-ink transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="View scan & visitor analytics"
                          >
                            <BarChart2 className="w-3 h-3 text-muted" />
                            <span>Analytics</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setStickerModal({
                              isOpen: true,
                              tagNumber: t.tagNumber,
                              qrUrl: buildTagQrUrl(t.tagNumber),
                              resourceName: t.resource?.name,
                              ownerName: t.resource?.owner ? `${t.resource.owner.name} (${t.resource.owner.mobileNumber})` : undefined,
                            })
                          }
                          className="px-2.5 py-1 bg-surface border border-border hover:border-ink rounded text-xs font-semibold uppercase tracking-wider text-ink transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer group"
                          title="Generate, Preview & Download Kauntact Sticker"
                        >
                          <Sparkles className="w-3 h-3 text-accent group-hover:rotate-12 transition-transform" />
                          <span>Sticker</span>
                        </button>

                        {t.status !== 'REVOKED' && (
                          <button
                            type="button"
                            onClick={() => setRevokeConfirmTag(t)}
                            className="p-1 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                            title="Revoke Tag"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border bg-bg/50 flex items-center justify-between text-xs">
            <span className="font-mono text-muted text-[11px]">
              Page {page} of {totalPages} ({total} tags total)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded border border-border bg-surface text-ink hover:border-ink disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SINGLE GENERATE MODAL */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface border border-border rounded-lg p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-ink flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="font-display text-lg font-medium uppercase text-ink">
                Generate Single QR Tag
              </h3>
            </div>

            {singleResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-bg border border-border rounded-lg text-center space-y-3">
                  <div className="flex justify-center p-3 bg-surface border border-border rounded w-fit mx-auto">
                    <PingInQrCode
                      value={singleResult.tag.tagNumber}
                      size={140}
                    />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted block">
                      Generated Tag Code
                    </span>
                    <span className="font-mono font-bold text-xl text-ink">
                      {singleResult.tag.tagNumber}
                    </span>
                  </div>
                  {singleResult.tag.token && (
                    <div className="p-2 bg-surface rounded border border-border font-mono text-[11px] text-muted break-all text-left">
                      <span className="text-ink font-bold block mb-1">Raw Token (One-time):</span>
                      {singleResult.tag.token}
                    </div>
                  )}
                  {singleResult.resource && (
                    <p className="text-xs text-success font-medium">
                      Immediately bound to resource: {singleResult.resource.name}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSingleResult(null);
                      setSingleResourceId('');
                    }}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
                  >
                    Generate Another
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSingleModalOpen(false)}
                    className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateSingle} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                    Tag Origin
                  </label>
                  <select
                    value={singleOrigin}
                    onChange={(e: any) => setSingleOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-xs font-mono text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="PREPRINTED_INVENTORY">Preprinted Inventory (Physical Sticker)</option>
                    <option value="GENERATED_FOR_RESOURCE">Generated For Resource (Digital Tag)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                    Resource ID (Optional UUID)
                  </label>
                  <input
                    type="text"
                    value={singleResourceId}
                    onChange={(e) => setSingleResourceId(e.target.value)}
                    placeholder="Leave empty for unassigned inventory..."
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-xs font-mono text-ink placeholder:text-subtle focus:outline-none focus:border-ink"
                  />
                  <p className="text-[11px] text-muted mt-1 leading-normal">
                    If omitted, the QR tag is created as unassigned inventory ready to be paired by users.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSingleModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={singleSubmitting}
                    className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {singleSubmitting ? (
                      <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                    )}
                    <span>Generate Tag</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BATCH GENERATOR MODAL */}
      <AdminBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => {
          fetchSummary();
          fetchTags();
        }}
      />

      {/* KAUNTACT STICKER STUDIO & PREVIEW MODAL */}
      <AdminStickerModal
        isOpen={stickerModal.isOpen}
        onClose={() => setStickerModal({ isOpen: false, tagNumber: '' })}
        initialTagNumber={stickerModal.tagNumber}
        initialQrUrl={stickerModal.qrUrl}
        resourceName={stickerModal.resourceName}
        ownerName={stickerModal.ownerName}
      />

      {/* REVOKE CONFIRMATION MODAL */}
      {revokeConfirmTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface border border-danger/30 rounded-lg p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-medium uppercase text-ink">
                  Revoke QR Tag {revokeConfirmTag.tagNumber}?
                </h3>
                <span className="text-xs text-danger font-semibold font-mono">
                  This action is permanent and irreversible.
                </span>
              </div>
            </div>

            <p className="text-xs text-muted mb-6 leading-relaxed">
              Revoking this QR tag will immediately close any active assignment to a vehicle/property and mark the tag as deactivated. Any future scans will return a deactivated error notice.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevokeConfirmTag(null)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeConfirm}
                disabled={isRevoking}
                className="px-4 py-2 bg-danger text-white text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRevoking ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Revocation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Analytics Modal */}
      <ResourceAnalyticsModal
        isOpen={Boolean(analyticsResource)}
        onClose={() => setAnalyticsResource(null)}
        resourceId={analyticsResource?.id || null}
        resourceName={analyticsResource?.name}
        tagNumber={analyticsResource?.tagNumber}
        ownerName={analyticsResource?.ownerName}
      />
    </AdminLayout>
  );
};
