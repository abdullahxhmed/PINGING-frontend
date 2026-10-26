import React, { useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { buildTagQrUrl } from '../../lib/qr';
import type { AdminBatchQrItem } from '../../types/admin';
import { Layers, X, Download, Sparkles } from 'lucide-react';
import { AdminStickerModal } from './AdminStickerModal';

interface AdminBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminBatchModal: React.FC<AdminBatchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(50);
  const [origin, setOrigin] = useState<'PREPRINTED_INVENTORY' | 'GENERATED_FOR_RESOURCE'>('PREPRINTED_INVENTORY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ batchId: string; items: AdminBatchQrItem[] } | null>(null);
  const [selectedStickerTag, setSelectedStickerTag] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 1 || quantity > 5000) {
      setError('Batch quantity must be between 1 and 5,000');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const res = await adminApi.generateBatchQr({
        quantity: Number(quantity),
        origin,
        idempotencyKey,
      });
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Batch generation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!result || !result.items.length) return;
    const headers = ['Tag Number', 'Token', 'Public QR URL'];
    const rows = result.items.map((item) => [
      item.tagNumber,
      item.token,
      buildTagQrUrl(item.tagNumber),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pingin_qr_batch_${result.batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg/40">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-ink" />
            <h3 className="text-base font-semibold text-ink">
              Generate QR Batch
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded text-xs text-danger">
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-bg border border-border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-satoshi text-xl font-medium text-ink">
                      {result.items.length} Tags Generated
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-success/20 text-success font-bold">
                      Ready
                    </span>
                  </div>
                  <p className="font-satoshi font-medium text-xs text-muted mt-0.5">
                    Batch: {result.batchId}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Download className="w-3.5 h-3.5 text-accent" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Items Preview */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-bg border-b border-border text-[11px] font-mono uppercase tracking-wider text-muted flex justify-between">
                  <span>Batch Preview (First 50)</span>
                  <span>Total: {result.items.length}</span>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-border/60">
                  {result.items.slice(0, 50).map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2 text-xs font-mono flex items-center justify-between hover:bg-bg/40 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-muted text-[11px] w-6">#{idx + 1}</span>
                        <span className="font-semibold text-ink">{item.tagNumber}</span>
                        <span className="text-muted truncate max-w-[150px] sm:max-w-[200px] text-[11px] hidden sm:inline">
                          {buildTagQrUrl(item.token || item.tagNumber)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStickerTag(item.tagNumber)}
                        className="px-2 py-0.5 bg-surface border border-border hover:border-ink rounded text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                        title="Preview & Download Sticker"
                      >
                        <Sparkles className="w-3 h-3 text-accent" />
                        <span>Sticker</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
                >
                  Generate Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Generate fresh, unassigned QR codes for physical sticker inventory.
                Tokens and public URLs will be available to download as CSV.
              </p>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                  Quantity (1 – 5,000)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-sm font-mono text-ink focus:outline-none focus:border-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                  Origin Classification
                </label>
                <select
                  value={origin}
                  onChange={(e: any) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-xs font-mono text-ink focus:outline-none focus:border-ink"
                >
                  <option value="PREPRINTED_INVENTORY">Preprinted Inventory (Physical Stickers)</option>
                  <option value="GENERATED_FOR_RESOURCE">Generated for Resource (Digital)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                  )}
                  <span>Generate Batch</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Kauntact Sticker Modal */}
      {selectedStickerTag && (
        <AdminStickerModal
          isOpen={Boolean(selectedStickerTag)}
          onClose={() => setSelectedStickerTag(null)}
          initialTagNumber={selectedStickerTag}
          initialQrUrl={buildTagQrUrl(selectedStickerTag)}
        />
      )}
    </div>
  );
};
