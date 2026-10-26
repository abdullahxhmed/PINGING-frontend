import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/adminApi';
import type {
  PrintBatch,
  SerializedSkuSummary,
  CreatePrintBatchPayload,
  ReceivePrintBatchPayload,
} from '../../types/admin';
import {
  Printer,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  X,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

interface PrintBatchesSectionProps {
  serializedSummaries?: SerializedSkuSummary[];
  onRefreshInventory?: () => void;
  showToast: (msg: string) => void;
  onOpenBatchGenerator?: (sku?: string) => void;
}

export const PrintBatchesSection: React.FC<PrintBatchesSectionProps> = ({
  serializedSummaries = [],
  onRefreshInventory,
  showToast,
  onOpenBatchGenerator,
}) => {
  const [batches, setBatches] = useState<PrintBatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [skuFilter, setSkuFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [receivingBatch, setReceivingBatch] = useState<PrintBatch | null>(null);
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null);

  // Fetch Print Batches
  const fetchBatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPrintBatches({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sku: skuFilter !== 'ALL' ? skuFilter : undefined,
        limit: 50,
      });
      const payload = (res as any)?.batches || (res as any)?.data?.batches || [];
      setBatches(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to load print batches');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, skuFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Export Manifest CSV
  const handleExportManifest = async (batch: PrintBatch) => {
    setExportingBatchId(batch.id);
    try {
      const csvText = await adminApi.exportPrintBatchManifest(batch.id, 'csv');
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `print_manifest_${batch.batchNumber}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported print manifest for ${batch.batchNumber}`);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportingBatchId(null);
    }
  };

  // Filter batches locally by search term
  const filteredBatches = batches.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.batchNumber?.toLowerCase().includes(term) ||
      b.vendorName?.toLowerCase().includes(term) ||
      b.sku?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-ink" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-satoshi">
              Production Print Runs & Vendor Batches
            </h2>
          </div>
          <p className="text-xs text-muted mt-1 font-satoshi">
            Dispatch digital QR tokens to print shops, download manufacturing manifests (CSV), and inward received stock.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchBatches}
            disabled={isLoading}
            className="p-1.5 rounded border border-border bg-surface hover:border-ink text-muted hover:text-ink cursor-pointer disabled:opacity-50"
            title="Refresh batches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium flex items-center gap-1.5 cursor-pointer font-satoshi"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Print Run</span>
          </button>
        </div>
      </div>

      {/* 2. Informational Banner: Lifecycle & Snapshot Immutability */}
      <div className="p-3.5 rounded-xl border border-border bg-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-satoshi">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-ink shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-ink">Manufacturing Invariant & Snapshot Protection:</span>
            <p className="text-[11px] text-muted leading-relaxed">
              When a print run is dispatched, each batch locks an immutable snapshot (<code className="font-mono text-[10px]">profileSnapshot</code>).
              Digital tags in <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-neutral-200 text-neutral-800">GENERATED</span> state do not enter storefront sellable stock until inwarded via Warehouse Receiving (<span className="font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">IN_STOCK</span>).
            </p>
          </div>
        </div>

        {onOpenBatchGenerator && (
          <button
            type="button"
            onClick={() => onOpenBatchGenerator()}
            className="text-xs font-medium text-ink hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Generate Digital Tokens First →</span>
          </button>
        )}
      </div>

      {/* 3. Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-surface text-xs font-satoshi">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-ink text-surface'
                  : 'text-muted hover:text-ink'
              }`}
            >
              All Batches ({batches.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PRINTING')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'PRINTING'
                  ? 'bg-amber-600 text-white'
                  : 'text-muted hover:text-ink'
              }`}
            >
              At Vendor (Printing)
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('STOCKED')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'STOCKED'
                  ? 'bg-emerald-600 text-white'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Stocked (Complete)
            </button>
          </div>

          {/* SKU Filter */}
          <select
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-border bg-surface text-xs text-ink font-mono focus:border-ink focus:outline-none"
          >
            <option value="ALL">All SKUs</option>
            <option value="TAG-VEHICLE-STICKER">TAG-VEHICLE-STICKER</option>
            <option value="TAG-KEYCHAIN">TAG-KEYCHAIN</option>
            <option value="TAG-MINI-STICKER">TAG-MINI-STICKER</option>
            <option value="TAG-BIKE-WATERPROOF">TAG-BIKE-WATERPROOF</option>
            <option value="TAG-PREPRINTED-STD">TAG-PREPRINTED-STD</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search batch # or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-ink placeholder:text-muted font-mono focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Batches Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted font-satoshi flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-ink" />
          <span>Loading production print batches...</span>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-surface space-y-2">
          <Printer className="w-6 h-6 text-muted mx-auto" />
          <p className="text-xs font-semibold text-ink font-satoshi">No production print runs found</p>
          <p className="text-[11px] text-muted font-satoshi max-w-sm mx-auto">
            Create a production print run to allocate generated digital QR tokens to a print vendor.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 px-3 py-1.5 rounded bg-ink text-surface text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Print Run</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/60 text-muted font-medium text-[11px] uppercase tracking-wider font-satoshi">
                  <th className="py-2.5 px-4">Batch Number</th>
                  <th className="py-2.5 px-3">SKU & Specs</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Receiving Progress</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-satoshi">
                {filteredBatches.map((batch) => {
                  const isStocked = batch.status === 'STOCKED' || batch.outstanding === 0;
                  const percentReceived = batch.quantityRequested > 0
                    ? Math.round(((batch.quantityReceived + batch.quantityDefective) / batch.quantityRequested) * 100)
                    : 100;

                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-bg/40 transition-colors"
                    >
                      {/* Batch Number & Date */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-semibold text-ink text-xs block">
                            {batch.batchNumber}
                          </span>
                          <span className="text-[10px] text-muted font-mono block">
                            Dispatched: {new Date(batch.dispatchedAt || batch.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* SKU & Immutable Snapshot Details */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-medium text-ink block">
                            {batch.sku}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono">
                            <span>
                              {batch.profileSnapshot?.widthMm || 100}×{batch.profileSnapshot?.heightMm || 100}mm
                            </span>
                            <span>•</span>
                            <span>{batch.profileSnapshot?.shape || 'CIRCLE'}</span>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{batch.templateSnapshot?.name || 'Default Template'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            isStocked
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isStocked ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          <span>{batch.status}</span>
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3">
                        <span className="text-xs font-medium text-ink block">
                          {batch.vendorName || 'Print Vendor'}
                        </span>
                        {batch.notes && (
                          <span className="text-[10px] text-muted truncate max-w-[150px] block" title={batch.notes}>
                            {batch.notes}
                          </span>
                        )}
                      </td>

                      {/* Progress / Receiving Accounting */}
                      <td className="py-3 px-3">
                        <div className="space-y-1.5 min-w-[170px]">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-ink font-semibold">
                              Accounted for: {percentReceived}%
                            </span>
                            <span className="text-muted text-[10px]">
                              Total: {batch.quantityRequested}
                            </span>
                          </div>

                          {/* Progress Bar (Accepted: emerald, Defective: red, Remaining: neutral) */}
                          <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden flex" title={`Accepted: ${batch.quantityReceived}, Defective: ${batch.quantityDefective}, Outstanding: ${batch.outstanding}`}>
                            <div
                              style={{ width: `${Math.min(100, (batch.quantityReceived / (batch.quantityRequested || 1)) * 100)}%` }}
                              className="bg-emerald-600 h-full"
                            />
                            {batch.quantityDefective > 0 && (
                              <div
                                style={{ width: `${Math.min(100, (batch.quantityDefective / (batch.quantityRequested || 1)) * 100)}%` }}
                                className="bg-red-500 h-full"
                              />
                            )}
                          </div>

                          {/* Explicit Separate Accounting Labels */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono">
                            <span className="text-emerald-700 font-medium">
                              Accepted: <strong>{batch.quantityReceived}</strong>
                            </span>
                            <span className="text-muted">•</span>
                            <span className={batch.quantityDefective > 0 ? 'text-red-600 font-medium' : 'text-muted'}>
                              Defective: <strong>{batch.quantityDefective}</strong>
                            </span>
                            <span className="text-muted">•</span>
                            <span className={batch.outstanding > 0 ? 'text-amber-700 font-medium' : 'text-muted'}>
                              Outstanding: <strong>{batch.outstanding}</strong>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Export Manifest CSV */}
                          <button
                            type="button"
                            onClick={() => handleExportManifest(batch)}
                            disabled={exportingBatchId === batch.id}
                            className="px-2.5 py-1 rounded border border-border bg-surface hover:border-ink text-ink text-xs font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Download CSV manifest for print shop"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-muted" />
                            <span>{exportingBatchId === batch.id ? 'Exporting...' : 'Manifest'}</span>
                          </button>

                          {/* Warehouse Inward */}
                          {batch.outstanding > 0 ? (
                            <button
                              type="button"
                              onClick={() => setReceivingBatch(batch)}
                              className="px-2.5 py-1 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PackageCheck className="w-3 h-3" />
                              <span>Inward</span>
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-[11px] font-mono text-muted inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Done</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE PRODUCTION PRINT RUN                      */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <CreatePrintBatchModal
          serializedSummaries={serializedSummaries}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(createdBatch) => {
            setIsCreateModalOpen(false);
            showToast(`Print batch '${createdBatch.batchNumber}' created for ${createdBatch.quantityRequested} tags.`);
            fetchBatches();
            if (onRefreshInventory) onRefreshInventory();
          }}
          onOpenBatchGenerator={onOpenBatchGenerator}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: WAREHOUSE RECEIVING & STOCK ACTIVATION           */}
      {/* ========================================================= */}
      {receivingBatch && (
        <ReceivePrintBatchModal
          batch={receivingBatch}
          onClose={() => setReceivingBatch(null)}
          onSuccess={(res) => {
            setReceivingBatch(null);
            showToast(
              `Inwarded: ${res.data.newlyAccepted} tags activated to IN_STOCK, ${res.data.newlyDefective} marked DAMAGED.`
            );
            fetchBatches();
            if (onRefreshInventory) onRefreshInventory();
          }}
        />
      )}
    </div>
  );
};

// =========================================================================
// Create Print Batch Modal Component
// =========================================================================
interface CreatePrintBatchModalProps {
  serializedSummaries: SerializedSkuSummary[];
  onClose: () => void;
  onSuccess: (batch: PrintBatch) => void;
  onOpenBatchGenerator?: (sku?: string) => void;
}

const CreatePrintBatchModal: React.FC<CreatePrintBatchModalProps> = ({
  serializedSummaries,
  onClose,
  onSuccess,
  onOpenBatchGenerator,
}) => {
  const [sku, setSku] = useState<string>('TAG-VEHICLE-STICKER');
  const [quantity, setQuantity] = useState<number>(50);
  const [vendorName, setVendorName] = useState<string>('Precision Print Labs');
  const [templateId, setTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('Urgent restock batch');
  const [dispatchImmediately, setDispatchImmediately] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available unprinted tags for selected SKU
  const skuSummary = serializedSummaries.find((s) => s.sku === sku);
  const availableGeneratedCount = skuSummary?.generated ?? 0;

  // Fetch templates for selected SKU
  useEffect(() => {
    let isCancelled = false;
    adminApi
      .getPrintProfile(sku)
      .then((res: any) => {
        if (!isCancelled) {
          const profile = res?.data || res;
          const tpls = profile?.templates || [];
          setTemplates(tpls);
          const defaultTpl = tpls.find((t: any) => t.isDefault) || tpls[0];
          if (defaultTpl) {
            setTemplateId(defaultTpl.id);
          }
        }
      })
      .catch(() => {
        if (!isCancelled) setTemplates([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [sku]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (availableGeneratedCount < quantity) {
      setError(
        `Insufficient unprinted digital tags for SKU '${sku}'. Requested: ${quantity}, Available: ${availableGeneratedCount}. Please generate digital tags first.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreatePrintBatchPayload = {
      sku: sku.trim().toUpperCase(),
      quantity: Number(quantity),
      vendorName: vendorName.trim(),
      templateId: templateId || undefined,
      notes: notes.trim() || undefined,
      dispatchImmediately,
    };

    try {
      const res = await adminApi.createPrintBatch(payload);
      const data = (res as any)?.data || res;
      onSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Failed to create print batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-ink" />
            <h3 className="text-sm font-semibold text-ink font-satoshi">
              Create Production Print Run (Vendor Dispatch)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-satoshi">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{error}</span>
                {availableGeneratedCount < quantity && onOpenBatchGenerator && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBatchGenerator(sku);
                      }}
                      className="font-semibold underline hover:text-red-900 cursor-pointer"
                    >
                      Click here to generate digital tags for {sku} →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SKU Selection */}
          <div>
            <label className="block font-medium text-ink mb-1">Product SKU *</label>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
            >
              <option value="TAG-VEHICLE-STICKER">TAG-VEHICLE-STICKER (Windshield Decal)</option>
              <option value="TAG-KEYCHAIN">TAG-KEYCHAIN (Acrylic / Metal)</option>
              <option value="TAG-MINI-STICKER">TAG-MINI-STICKER (Mini Decal)</option>
              <option value="TAG-BIKE-WATERPROOF">TAG-BIKE-WATERPROOF (Weatherproof)</option>
              <option value="TAG-PREPRINTED-STD">TAG-PREPRINTED-STD (Standard Decal)</option>
            </select>
          </div>

          {/* Available Generated Tokens Callout */}
          <div className="p-3 rounded-lg border border-border bg-bg flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-medium text-muted font-mono block">
                Available Digital Tags (Unprinted)
              </span>
              <span className="font-mono font-semibold text-sm text-ink block">
                {availableGeneratedCount} tags available
              </span>
            </div>

            {availableGeneratedCount === 0 && onOpenBatchGenerator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBatchGenerator(sku);
                }}
                className="px-2.5 py-1 rounded bg-ink text-surface text-[11px] font-medium cursor-pointer"
              >
                + Generate First
              </button>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block font-medium text-ink mb-1">
              Quantity to Dispatch *
            </label>
            <input
              type="number"
              min="1"
              max={Math.max(1, availableGeneratedCount)}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono focus:border-ink focus:outline-none"
            />
            <div className="flex items-center gap-1.5 mt-2">
              {[15, 25, 50, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
                    quantity === qty
                      ? 'bg-ink text-surface border-ink'
                      : 'bg-surface text-muted border-border hover:border-ink hover:text-ink'
                  }`}
                >
                  {qty}
                </button>
              ))}
              {availableGeneratedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(availableGeneratedCount)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono border border-border hover:border-ink text-ink bg-surface cursor-pointer"
                >
                  All ({availableGeneratedCount})
                </button>
              )}
            </div>
          </div>

          {/* Vendor Name */}
          <div>
            <label className="block font-medium text-ink mb-1">Print Vendor *</label>
            <input
              type="text"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Apex Print Solutions, Precision Print Labs"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {/* Reusable Template */}
          <div>
            <label className="block font-medium text-ink mb-1">Design Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink text-xs focus:border-ink focus:outline-none"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} (v{tpl.version}) {tpl.isDefault ? '• Default' : ''}
                </option>
              ))}
              {templates.length === 0 && (
                <option value="">Default Decal Layout</option>
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-ink mb-1">Batch Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent restock, Matte UV laminate run"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {/* Dispatch immediately */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dispatchImmediately"
              checked={dispatchImmediately}
              onChange={(e) => setDispatchImmediately(e.target.checked)}
              className="rounded border-border text-ink focus:ring-ink"
            />
            <label htmlFor="dispatchImmediately" className="text-xs text-ink cursor-pointer">
              Set status to PRINTING immediately and dispatch manifest to vendor
            </label>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableGeneratedCount === 0}
              className="px-4 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Dispatching...' : 'Dispatch Print Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// Warehouse Receiving Modal Component (Partial / Complete Stock Activation)
// =========================================================================
interface ReceivePrintBatchModalProps {
  batch: PrintBatch;
  onClose: () => void;
  onSuccess: (res: any) => void;
}

const ReceivePrintBatchModal: React.FC<ReceivePrintBatchModalProps> = ({
  batch,
  onClose,
  onSuccess,
}) => {
  const [acceptedInput, setAcceptedInput] = useState<string>('');
  const [defectiveInput, setDefectiveInput] = useState<string>('');
  const [notes, setNotes] = useState<string>(
    `Warehouse inward for batch ${batch.batchNumber}`
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to parse comma / newline separated tags
  const parseTags = (input: string): string[] => {
    return input
      .split(/[\n,;\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);
  };

  const acceptedTags = parseTags(acceptedInput);
  const defectiveTags = parseTags(defectiveInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (acceptedTags.length === 0 && defectiveTags.length === 0) {
      setError('Please provide at least one accepted or defective tag number to inward.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: ReceivePrintBatchPayload = {
      acceptedTagNumbers: acceptedTags,
      defectiveTagNumbers: defectiveTags.length > 0 ? defectiveTags : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await adminApi.receivePrintBatch(batch.id, payload);
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Receiving failed. Ensure tag numbers belong to this batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-semibold text-ink font-satoshi">
              Warehouse Inward & Stock Activation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-satoshi">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Batch Summary Info */}
          <div className="p-3 rounded-lg border border-border bg-bg/50 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-muted font-mono block">BATCH</span>
              <span className="font-mono font-semibold text-ink text-[11px] block truncate">
                {batch.batchNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted font-mono block">VENDOR</span>
              <span className="font-semibold text-ink text-[11px] block truncate">
                {batch.vendorName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted font-mono block">OUTSTANDING</span>
              <span className="font-mono font-semibold text-amber-700 text-[11px] block">
                {batch.outstanding} tags
              </span>
            </div>
          </div>

          {/* State Behavior Callout */}
          <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 text-emerald-900 text-[11px] leading-relaxed">
            <span className="font-semibold block text-emerald-950">Storefront Activation:</span>
            Accepted tags immediately transition to <strong className="font-mono">IN_STOCK</strong> and become sellable on the storefront. Defective tags transition to <strong className="font-mono">DAMAGED</strong>.
          </div>

          {/* Accepted Tags Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-ink">
                Accepted Tag Numbers ({acceptedTags.length} tags) *
              </label>
              <span className="text-[10px] text-muted font-mono">
                Comma or line separated
              </span>
            </div>
            <textarea
              rows={4}
              value={acceptedInput}
              onChange={(e) => setAcceptedInput(e.target.value)}
              placeholder="e.g.&#10;KT024958&#10;KT024959&#10;KT024960"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
            />
          </div>

          {/* Defective / Damaged Tags */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-ink">
                Defective / Damaged Tags ({defectiveTags.length} tags)
              </label>
              <span className="text-[10px] text-muted font-mono">Optional</span>
            </div>
            <textarea
              rows={2}
              value={defectiveInput}
              onChange={(e) => setDefectiveInput(e.target.value)}
              placeholder="e.g. KT024961 (misaligned laminate, print artifact)"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-xs focus:border-ink focus:outline-none"
            />
          </div>

          {/* Receiving Notes */}
          <div>
            <label className="block font-medium text-ink mb-1">Receiving Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Box 1 of 2 inwarded; QA verified"
              className="w-full px-3 py-2 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded border border-border hover:border-ink text-ink text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (acceptedTags.length === 0 && defectiveTags.length === 0)}
              className="px-4 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Inwarding...' : `Inward ${acceptedTags.length} Tag(s) to Stock`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
