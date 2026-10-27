import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/adminApi';
import type {
  PrintBatch,
  SerializedSkuSummary,
  CreatePrintBatchPayload,
  AdminProduct,
} from '../../types/admin';
import {
  Printer,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  PackageCheck,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';

interface PrintBatchesSectionProps {
  serializedSummaries?: SerializedSkuSummary[];
  onRefreshInventory?: () => void;
  showToast: (msg: string) => void;
  onOpenBatchGenerator?: (sku?: string) => void;
  onSelectBatchForInward?: (batch: PrintBatch) => void;
}

export const PrintBatchesSection: React.FC<PrintBatchesSectionProps> = ({
  serializedSummaries = [],
  onRefreshInventory,
  showToast,
  onOpenBatchGenerator,
  onSelectBatchForInward,
}) => {
  const [batches, setBatches] = useState<PrintBatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [skuFilter, setSkuFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [detailBatch, setDetailBatch] = useState<PrintBatch | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [dispatchConfirmBatch, setDispatchConfirmBatch] = useState<PrintBatch | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
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
      showToast(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportingBatchId(null);
    }
  };

  // Open Detailed Drawer with Fresh Authoritative State
  const handleViewDetails = async (batch: PrintBatch) => {
    setDetailBatch(batch);
    setIsLoadingDetail(true);
    try {
      const res = await adminApi.getPrintBatchById(batch.id);
      if (res?.data) {
        setDetailBatch(res.data);
      }
    } catch {
      // Fallback to local batch
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Dispatch to Vendor Confirmation
  const handleConfirmDispatch = async () => {
    if (!dispatchConfirmBatch) return;
    setIsDispatching(true);
    try {
      const res = await adminApi.dispatchPrintBatch(dispatchConfirmBatch.id);
      showToast(res.message || `Batch ${dispatchConfirmBatch.batchNumber} dispatched to printer.`);
      setDispatchConfirmBatch(null);
      fetchBatches();
      if (onRefreshInventory) onRefreshInventory();
    } catch (err: any) {
      showToast(`Dispatch failed: ${err.message || 'Could not dispatch batch'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Filter batches locally by search term
  const filteredBatches = batches.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.batchNumber?.toLowerCase().includes(term) ||
      b.vendorName?.toLowerCase().includes(term) ||
      b.sku?.toLowerCase().includes(term) ||
      b.variantSnapshot?.variantName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-ink" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
              Production Print Runs &amp; Vendor Batches
            </h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Manage production print jobs, export sequence-numbered printer manifests, dispatch to vendors, and monitor inwarding progress.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchBatches}
            disabled={isLoading}
            className="w-8 h-8 rounded-full border border-border hover:border-ink bg-surface flex items-center justify-center text-muted hover:text-ink active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Refresh batches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink hover:opacity-90 active:scale-95 text-surface text-xs font-medium tracking-wide shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Production Batch</span>
          </button>
        </div>
      </div>

      {/* 2. Informational Banner: Lifecycle & Snapshot Invariant */}
      <div className="p-3.5 rounded border border-border bg-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-ink shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-ink">Manufacturing Invariant &amp; Snapshot Protection:</span>
            <p className="text-[11px] text-muted leading-relaxed">
              When created, batches record immutable snapshots of the variant artwork and print dimensions. Digital tags remain in vendor production until physically received at the warehouse via the Inwarding workflow.
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
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-surface text-xs font-mono">
            {[
              { id: 'ALL', label: `All (${batches.length})` },
              { id: 'PRINTING', label: 'In Printing' },
              { id: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
              { id: 'STOCKED', label: 'Stocked' },
              { id: 'GENERATED', label: 'Prepared' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-ink text-surface font-semibold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SKU Filter */}
          <select
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="px-2.5 py-1 rounded border border-border bg-surface text-xs text-ink font-mono focus:border-ink focus:outline-none"
          >
            <option value="ALL">All SKUs</option>
            {serializedSummaries.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.sku}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search batch #, vendor, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-ink placeholder:text-muted font-mono focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* 4. Error State */}
      {error && (
        <div className="p-3 rounded border border-danger/40 bg-bg text-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Batches Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2 font-mono">
          <RefreshCw className="w-4 h-4 animate-spin text-ink" />
          <span>Loading production print batches...</span>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-dashed border-border bg-surface space-y-2">
          <Printer className="w-8 h-8 text-muted mx-auto" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
            No Production Print Batches Found
          </h4>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL' || skuFilter !== 'ALL'
              ? 'Try clearing your filters or search terms.'
              : 'Create your first production print batch to dispatch digital tags to print shops.'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-medium">Batch Number</th>
                  <th className="py-2.5 px-3 font-medium">Product / Variant</th>
                  <th className="py-2.5 px-3 font-medium">Physical SKU</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Requested</th>
                  <th className="py-2.5 px-3 font-medium text-right">Accepted</th>
                  <th className="py-2.5 px-3 font-medium text-right">Defective</th>
                  <th className="py-2.5 px-3 font-medium text-right">Outstanding</th>
                  <th className="py-2.5 px-3 font-medium">Vendor</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                {filteredBatches.map((batch) => {
                  const accepted =
                    batch.quantityAccepted ??
                    Math.max(0, batch.quantityReceived - batch.quantityDefective);
                  const outstanding = Math.max(
                    0,
                    batch.quantityRequested - (accepted + batch.quantityDefective)
                  );
                  const isEligibleForInward =
                    batch.status === 'PRINTING' || batch.status === 'PARTIALLY_RECEIVED';
                  const isReadyToDispatch =
                    batch.status === 'GENERATED' || batch.status === 'PREPARED';

                  return (
                    <tr key={batch.id} className="hover:bg-bg/40 transition-colors">
                      {/* Batch Identifier & Barcode */}
                      <td className="py-3 px-4 font-semibold text-ink font-mono">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(batch)}
                          className="hover:underline text-ink font-bold text-left block"
                        >
                          {batch.batchNumber}
                        </button>
                        <span className="text-[10px] text-muted block font-sans">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Product & Variant */}
                      <td className="py-3 px-3 font-sans">
                        <span className="font-medium text-ink block truncate max-w-[160px]">
                          {batch.variantSnapshot?.variantName ||
                            batch.variant?.name ||
                            batch.product?.name ||
                            'Standard Sticker'}
                        </span>
                        <span className="text-[10px] text-muted font-mono block">
                          {batch.variantSnapshot?.variantSku || batch.variant?.sku || '—'}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3 text-ink font-mono font-medium">
                        {batch.sku}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                            batch.status === 'STOCKED'
                              ? 'border-border bg-bg text-ink'
                              : batch.status === 'PARTIALLY_RECEIVED'
                              ? 'border-border bg-bg text-ink font-bold'
                              : batch.status === 'PRINTING'
                              ? 'border-border bg-bg text-ink'
                              : 'border-border bg-bg text-muted'
                          }`}
                        >
                          {batch.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Quantities */}
                      <td className="py-3 px-3 text-right font-bold text-ink">
                        {batch.quantityRequested}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-ink">
                        {accepted}
                      </td>
                      <td
                        className={`py-3 px-3 text-right ${
                          batch.quantityDefective > 0 ? 'text-danger font-bold' : 'text-muted'
                        }`}
                      >
                        {batch.quantityDefective}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-semibold ${
                          outstanding > 0 ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {outstanding}
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3 text-muted font-sans truncate max-w-[120px]">
                        {batch.vendorName || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Export Manifest CSV */}
                          <button
                            type="button"
                            onClick={() => handleExportManifest(batch)}
                            disabled={exportingBatchId === batch.id}
                            className="p-1.5 rounded border border-border hover:border-ink text-muted hover:text-ink cursor-pointer"
                            title="Export Printer Manifest (CSV)"
                          >
                            <FileSpreadsheet
                              className={`w-3.5 h-3.5 ${
                                exportingBatchId === batch.id ? 'animate-spin' : ''
                              }`}
                            />
                          </button>

                          {/* Dispatch Action if not yet dispatched */}
                          {isReadyToDispatch && (
                            <button
                              type="button"
                              onClick={() => setDispatchConfirmBatch(batch)}
                              className="px-2 py-1 rounded bg-ink text-surface hover:opacity-90 text-[10px] font-mono uppercase cursor-pointer"
                            >
                              Dispatch
                            </button>
                          )}

                          {/* Inward Action if printing or partially received */}
                          {isEligibleForInward && onSelectBatchForInward && (
                            <button
                              type="button"
                              onClick={() => onSelectBatchForInward(batch)}
                              className="px-2 py-1 rounded border border-ink bg-surface hover:bg-ink hover:text-surface text-ink text-[10px] font-mono uppercase cursor-pointer transition-colors"
                            >
                              Inward
                            </button>
                          )}

                          {/* View Detail Drawer */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(batch)}
                            className="p-1.5 rounded border border-border hover:border-ink text-muted hover:text-ink cursor-pointer"
                            title="View Batch Details & Audit Receipts"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
      {/* MODAL: CREATE PRINT BATCH (CATALOG VARIANT LINKED)       */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <CreatePrintBatchModal
          serializedSummaries={serializedSummaries}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newBatch) => {
            setIsCreateModalOpen(false);
            showToast(`Batch ${newBatch.batchNumber} created successfully.`);
            fetchBatches();
            if (onRefreshInventory) onRefreshInventory();
          }}
          onOpenBatchGenerator={onOpenBatchGenerator}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: DISPATCH CONFIRMATION                              */}
      {/* ========================================================= */}
      {dispatchConfirmBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-ink font-semibold text-sm">
                <Send className="w-4 h-4" />
                <span>Confirm Batch Dispatch to Printer</span>
              </div>
              <button
                type="button"
                onClick={() => setDispatchConfirmBatch(null)}
                className="text-muted hover:text-ink p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to dispatch batch{' '}
              <strong className="text-ink font-mono">{dispatchConfirmBatch.batchNumber}</strong> ({dispatchConfirmBatch.quantityRequested} tags) to{' '}
              <strong className="text-ink">{dispatchConfirmBatch.vendorName}</strong>?
            </p>

            <div className="p-3 rounded border border-border bg-bg text-xs space-y-1 font-mono text-[11px]">
              <div>SKU: {dispatchConfirmBatch.sku}</div>
              <div>Quantity: {dispatchConfirmBatch.quantityRequested} tags</div>
              <div>State transition: GENERATED → PRINTING</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDispatchConfirmBatch(null)}
                className="px-3 py-1.5 rounded border border-border hover:border-ink text-xs font-medium text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={isDispatching}
                className="px-4 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRAWER: AUTHORITATIVE BATCH DETAILS & AUDIT RECEIPTS     */}
      {/* ========================================================= */}
      {detailBatch && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-surface border-l border-border h-full overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-6 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink font-mono">
                    {detailBatch.batchNumber}
                  </h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-ink text-surface font-semibold">
                    {detailBatch.status.replace(/_/g, ' ')}
                  </span>
                  {isLoadingDetail && (
                    <RefreshCw className="w-3.5 h-3.5 text-muted animate-spin" />
                  )}
                </div>
                <p className="text-xs text-muted mt-1 font-mono">
                  Physical SKU: <strong>{detailBatch.sku}</strong> · Created on{' '}
                  {new Date(detailBatch.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailBatch(null)}
                className="p-1 rounded text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleExportManifest(detailBatch)}
                disabled={exportingBatchId === detailBatch.id}
                className="px-3 py-1.5 rounded border border-border hover:border-ink bg-bg text-ink text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Manifest (CSV)</span>
              </button>

              {(detailBatch.status === 'PRINTING' ||
                detailBatch.status === 'PARTIALLY_RECEIVED') &&
                onSelectBatchForInward && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = detailBatch;
                      setDetailBatch(null);
                      onSelectBatchForInward(b);
                    }}
                    className="px-3.5 py-1.5 rounded bg-ink text-surface hover:opacity-90 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Inward Physical Delivery →</span>
                  </button>
                )}
            </div>

            {/* Quantities Overview */}
            <div className="grid grid-cols-4 gap-px bg-border border border-border rounded text-center overflow-hidden">
              <div className="bg-surface p-2.5 space-y-0.5">
                <span className="text-[10px] text-muted uppercase block font-mono">Requested</span>
                <span className="font-mono text-base font-bold text-ink block">
                  {detailBatch.quantityRequested}
                </span>
              </div>
              <div className="bg-surface p-2.5 space-y-0.5">
                <span className="text-[10px] text-muted uppercase block font-mono">Accepted</span>
                <span className="font-mono text-base font-bold text-ink block">
                  {detailBatch.quantityAccepted ??
                    (detailBatch.quantityReceived - detailBatch.quantityDefective)}
                </span>
              </div>
              <div className="bg-surface p-2.5 space-y-0.5">
                <span className="text-[10px] text-muted uppercase block font-mono">Defective</span>
                <span
                  className={`font-mono text-base font-bold block ${
                    detailBatch.quantityDefective > 0 ? 'text-danger' : 'text-ink'
                  }`}
                >
                  {detailBatch.quantityDefective}
                </span>
              </div>
              <div className="bg-surface p-2.5 space-y-0.5">
                <span className="text-[10px] text-muted uppercase block font-mono">Outstanding</span>
                <span className="font-mono text-base font-bold text-ink block">
                  {Math.max(
                    0,
                    detailBatch.quantityRequested -
                      ((detailBatch.quantityAccepted ??
                        (detailBatch.quantityReceived - detailBatch.quantityDefective)) +
                        detailBatch.quantityDefective)
                  )}
                </span>
              </div>
            </div>

            {/* Product / Variant Snapshot Details */}
            <div className="p-3.5 rounded border border-border bg-bg space-y-2 text-xs">
              <span className="font-semibold text-ink font-mono uppercase tracking-wider block text-[10px]">
                Immutable Product &amp; Print Snapshot
              </span>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted">
                <div>
                  Vendor: <strong className="text-ink">{detailBatch.vendorName}</strong>
                </div>
                <div>
                  Dispatched:{' '}
                  <strong className="text-ink">
                    {detailBatch.dispatchedAt
                      ? new Date(detailBatch.dispatchedAt).toLocaleDateString()
                      : 'Pending'}
                  </strong>
                </div>
                <div>
                  Dimensions:{' '}
                  <strong className="text-ink">
                    {detailBatch.profileSnapshot?.widthMm}x{detailBatch.profileSnapshot?.heightMm}mm
                  </strong>
                </div>
                <div>
                  Material:{' '}
                  <strong className="text-ink">
                    {detailBatch.profileSnapshot?.material || 'Vinyl UV Protected'}
                  </strong>
                </div>
                {detailBatch.variantSnapshot?.variantName && (
                  <div className="col-span-2">
                    Variant Snapshot:{' '}
                    <strong className="text-ink">
                      {detailBatch.variantSnapshot.variantName} (
                      {detailBatch.variantSnapshot.variantSku})
                    </strong>
                  </div>
                )}
                {detailBatch.notes && (
                  <div className="col-span-2 text-muted">
                    Notes: <span className="text-ink">{detailBatch.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chronological Inwarding Receipts (Audit Trail) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink font-mono">
                  Inwarding Audit History ({detailBatch.receipts?.length || 0})
                </span>
              </div>

              {(!detailBatch.receipts || detailBatch.receipts.length === 0) ? (
                <div className="p-4 rounded border border-border text-center text-xs text-muted font-mono">
                  No inwarding receipts recorded yet for this batch.
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {detailBatch.receipts.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded border border-border bg-surface space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{r.receiptNumber}</span>
                        <span className="text-[10px] text-muted">
                          {new Date(r.receivedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted">
                        <span>Delivered: <strong>{r.receivedQuantity}</strong></span>
                        <span>Accepted: <strong className="text-ink">{r.acceptedQuantity}</strong></span>
                        <span>
                          Defective:{' '}
                          <strong className={r.defectiveQuantity > 0 ? 'text-danger' : 'text-ink'}>
                            {r.defectiveQuantity}
                          </strong>
                        </span>
                        {r.missingQuantity > 0 && (
                          <span>Missing: <strong className="text-muted">{r.missingQuantity}</strong></span>
                        )}
                      </div>
                      {r.notes && (
                        <div className="text-[11px] text-muted italic font-sans">{r.notes}</div>
                      )}
                      {r.defectiveTagNumbers && (r.defectiveTagNumbers as string[]).length > 0 && (
                        <div className="text-[10px] text-danger bg-bg p-1.5 rounded border border-border">
                          Defective tags revoked:{' '}
                          {(r.defectiveTagNumbers as string[]).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Create Print Batch Modal (Product Variant Linked & Component SKU Safe)
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
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [sku, setSku] = useState<string>('TAG-VEHICLE-STICKER');
  const [quantity, setQuantity] = useState<number>(50);
  const [vendorName, setVendorName] = useState<string>('Precision Print Labs');
  const [templateId, setTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('Production print run');
  const [dispatchImmediately, setDispatchImmediately] = useState<boolean>(false);

  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available unprinted tags for selected SKU
  const skuSummary = serializedSummaries.find((s) => s.sku === sku);
  const availableGeneratedCount = skuSummary?.generated ?? 0;

  // Fetch catalog products to bind real variantId & component inventorySku
  useEffect(() => {
    let isCancelled = false;
    adminApi
      .getCatalogProducts({ limit: 50, activeOnly: true })
      .then((res: any) => {
        if (!isCancelled) {
          const prods: AdminProduct[] = res?.products || res?.data?.products || [];
          setProducts(prods);

          // Find default product with variant
          const firstWithVariants = prods.find((p) => (p.variants?.length || 0) > 0);
          if (firstWithVariants && firstWithVariants.variants?.[0]) {
            setSelectedProductId(firstWithVariants.id);
            setSelectedVariantId(firstWithVariants.variants[0].id || '');

            // Set physical SKU from first component if available
            const comp = firstWithVariants.variants[0].components?.[0];
            if (comp?.inventorySku) {
              setSku(comp.inventorySku);
            }
          }
        }
      })
      .catch(() => {
        // Keep fallback
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingProducts(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // When variant changes, update physical SKU
  const handleVariantChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    const prod = products.find((p) => p.id === selectedProductId);
    const variant = prod?.variants?.find((v) => v.id === variantId);
    const comp = variant?.components?.find((c: any) => c.inventorySku);
    if (comp?.inventorySku) {
      setSku(comp.inventorySku);
    }
  };

  // Fetch templates for selected SKU
  useEffect(() => {
    let isCancelled = false;
    adminApi
      .getPrintProfile(sku || 'TAG-VEHICLE-STICKER')
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
      variantId: selectedVariantId || undefined,
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

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-ink" />
            <h3 className="text-sm font-semibold text-ink font-mono">
              Create Production Print Batch
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
          {error && (
            <div className="p-3 rounded border border-danger/40 bg-bg text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product & Variant Binding */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-ink font-medium mb-1 font-sans">Catalog Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p?.variants?.[0]) {
                    handleVariantChange(p.variants[0].id || '');
                  }
                }}
                disabled={isLoadingProducts}
                className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ink font-medium mb-1 font-sans">Product Variant</label>
              <select
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                disabled={!selectedProduct || (selectedProduct.variants?.length || 0) === 0}
                className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
              >
                {(selectedProduct?.variants || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Physical Inventory SKU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-ink font-medium font-sans">
                Physical Inventory SKU
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  Unprinted available: <strong>{availableGeneratedCount}</strong>
                </span>
                {availableGeneratedCount === 0 && onOpenBatchGenerator && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBatchGenerator(sku);
                    }}
                    className="text-[10px] text-ink underline font-bold cursor-pointer"
                  >
                    Generate Tokens →
                  </button>
                )}
              </div>
            </div>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            >
              {serializedSummaries.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.sku} ({s.generated ?? 0} unprinted tokens ready)
                </option>
              ))}
              {serializedSummaries.length === 0 && (
                <option value="TAG-VEHICLE-STICKER">TAG-VEHICLE-STICKER</option>
              )}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-ink font-medium mb-1 font-sans">
              Print Quantity (Units)
            </label>
            <input
              type="number"
              min="1"
              max={Math.max(1, availableGeneratedCount)}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {/* Vendor Name */}
          <div>
            <label className="block text-ink font-medium mb-1 font-sans">Print Vendor</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Apex Print Labs"
              className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {/* Template */}
          <div>
            <label className="block text-ink font-medium mb-1 font-sans">Design Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} (v{tpl.version}) {tpl.isDefault ? '• Default' : ''}
                </option>
              ))}
              {templates.length === 0 && (
                <option value="">Standard Label Template</option>
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-ink font-medium mb-1 font-sans">Batch Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Production restock run"
              className="w-full px-3 py-1.5 rounded border border-border bg-bg text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {/* Dispatch immediately */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="dispatchImmediately"
              checked={dispatchImmediately}
              onChange={(e) => setDispatchImmediately(e.target.checked)}
              className="rounded border-border text-ink focus:ring-ink"
            />
            <label htmlFor="dispatchImmediately" className="text-xs text-ink cursor-pointer font-sans">
              Dispatch to vendor immediately (status: PRINTING)
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
              {isSubmitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
