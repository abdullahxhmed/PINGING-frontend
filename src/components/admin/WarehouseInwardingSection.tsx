import React, { useState, useEffect, useCallback } from 'react';
import {
  PackageCheck,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  User,
  FileText,
  Boxes,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import type {
  PrintBatch,
  InwardPrintBatchPayload,
  InwardPrintBatchResponse,
} from '../../types/admin';

interface WarehouseInwardingSectionProps {
  preselectedBatch?: PrintBatch | null;
  onRefreshInventory?: () => void;
  showToast: (msg: string) => void;
  onNavigateToBatches?: () => void;
}

export const WarehouseInwardingSection: React.FC<WarehouseInwardingSectionProps> = ({
  preselectedBatch,
  onRefreshInventory,
  showToast,
  onNavigateToBatches,
}) => {
  // Batch Search & Selection State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [eligibleBatches, setEligibleBatches] = useState<PrintBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [selectedBatch, setSelectedBatch] = useState<PrintBatch | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Inwarding Form State
  const [receivedCount, setReceivedCount] = useState<number | ''>('');
  const [acceptedCount, setAcceptedCount] = useState<number | ''>('');
  const [defectiveCount, setDefectiveCount] = useState<number>(0);
  const [defectiveTagNumbersInput, setDefectiveTagNumbersInput] = useState<string>('');
  const [showDefectiveTagsInput, setShowDefectiveTagsInput] = useState<boolean>(false);
  const [markAsFinalShipment, setMarkAsFinalShipment] = useState<boolean>(false);
  const [receivedBy, setReceivedBy] = useState<string>('WH-Operator');
  const [notes, setNotes] = useState<string>('');

  // Idempotency Key (kept stable on retry, regenerated on new receipt)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Submission & Result State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [lastReceiptResult, setLastReceiptResult] = useState<InwardPrintBatchResponse['data'] | null>(null);

  // Fetch Eligible Batches (PRINTING, PARTIALLY_RECEIVED, STOCKED, GENERATED)
  const fetchEligibleBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const res = await adminApi.getPrintBatches({ limit: 50 });
      const batches = res?.batches || (res as any)?.data?.batches || [];
      // Sort so active receiving batches (PRINTING, PARTIALLY_RECEIVED) come first
      const sorted = [...batches].sort((a, b) => {
        const order: Record<string, number> = {
          PARTIALLY_RECEIVED: 1,
          PRINTING: 2,
          GENERATED: 3,
          PREPARED: 4,
          STOCKED: 5,
        };
        return (order[a.status] || 99) - (order[b.status] || 99);
      });
      setEligibleBatches(sorted);
    } catch {
      // Ignore
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibleBatches();
  }, [fetchEligibleBatches]);

  // Load Authoritative Batch Details
  const loadBatchDetails = useCallback(async (batchIdOrNumber: string) => {
    setIsLoadingDetails(true);
    setSubmissionError(null);
    try {
      const res = await adminApi.getPrintBatchById(batchIdOrNumber);
      const batchData = res?.data || (res as any);
      setSelectedBatch(batchData);

      // Auto-populate default received count to current outstanding
      const outstanding = Math.max(
        0,
        batchData.quantityRequested -
          ((batchData.quantityAccepted ?? (batchData.quantityReceived - batchData.quantityDefective)) +
            batchData.quantityDefective)
      );
      setReceivedCount(outstanding > 0 ? outstanding : '');
      setAcceptedCount(outstanding > 0 ? outstanding : '');
      setDefectiveCount(0);
      setDefectiveTagNumbersInput('');
      setMarkAsFinalShipment(false);
      setNotes(`Delivery receipt for ${batchData.batchNumber}`);

      // Generate a fresh idempotency key for this inwarding session
      setIdempotencyKey(`IDEMP-${batchData.batchNumber}-${Date.now()}`);
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to load batch details.');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Sync if preselectedBatch was passed
  useEffect(() => {
    if (preselectedBatch) {
      loadBatchDetails(preselectedBatch.id || preselectedBatch.batchNumber);
    }
  }, [preselectedBatch, loadBatchDetails]);

  // Calculate live values
  const numReceived = typeof receivedCount === 'number' ? receivedCount : 0;
  const numAccepted = typeof acceptedCount === 'number' ? acceptedCount : 0;
  const numDefective = Number(defectiveCount) || 0;
  const discrepancy = numReceived - (numAccepted + numDefective);

  const outstandingBefore = selectedBatch
    ? Math.max(
        0,
        selectedBatch.quantityRequested -
          ((selectedBatch.quantityAccepted ??
            (selectedBatch.quantityReceived - selectedBatch.quantityDefective)) +
            selectedBatch.quantityDefective)
      )
    : 0;

  const estimatedOutstandingAfter = Math.max(
    0,
    outstandingBefore - (numAccepted + numDefective)
  );

  // Handle Inwarding Submit
  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (numReceived <= 0 && numAccepted <= 0 && numDefective <= 0) {
      setSubmissionError('Please specify quantities to inward (Received, Accepted, or Defective).');
      return;
    }

    if (numAccepted < 0 || numDefective < 0) {
      setSubmissionError('Quantities cannot be negative.');
      return;
    }

    // Parse defective tags if provided
    let tagList: string[] | undefined = undefined;
    if (showDefectiveTagsInput && defectiveTagNumbersInput.trim()) {
      tagList = defectiveTagNumbersInput
        .split(/[\n,;\s]+/)
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0);
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const payload: InwardPrintBatchPayload = {
      batchIdentifier: selectedBatch.batchNumber,
      receivedCount: numReceived,
      acceptedCount: numAccepted,
      defectiveCount: numDefective,
      defectiveTagNumbers: tagList && tagList.length > 0 ? tagList : undefined,
      markAsFinalShipment,
      notes: notes.trim() || undefined,
      receivedBy: receivedBy.trim() || undefined,
      idempotencyKey, // Reuses exact key on retry
    };

    try {
      const res = await adminApi.inwardPrintBatch(selectedBatch.id, payload);
      const data = res.data;
      setLastReceiptResult(data);

      if (data.isDuplicateRequest) {
        showToast(`Idempotent reconciliation: Receipt ${data.receiptNumber} already recorded.`);
      } else {
        showToast(
          `Inwarded: ${data.newlyAccepted} to In Stock, ${data.newlyDefective} to Damaged.`
        );
      }

      // Refresh authoritative batch details & parent inventory
      await loadBatchDetails(selectedBatch.id);
      if (onRefreshInventory) onRefreshInventory();
      fetchEligibleBatches();
    } catch (err: any) {
      setSubmissionError(err.message || 'Warehouse inwarding failed. Please verify quantities.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter batches for search picker
  const filteredBatches = eligibleBatches.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.batchNumber.toLowerCase().includes(term) ||
      b.sku.toLowerCase().includes(term) ||
      b.vendorName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-ink" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink font-mono">
              Warehouse Inwarding &amp; Receiving
            </h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Record physical deliveries, activate usable stock (<code className="font-mono text-[11px]">IN_STOCK</code>), log defects, and preserve an immutable audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchEligibleBatches();
              if (selectedBatch) loadBatchDetails(selectedBatch.id);
            }}
            disabled={isLoadingBatches || isLoadingDetails}
            className="w-8 h-8 rounded-full border border-border hover:border-ink bg-surface flex items-center justify-center text-muted hover:text-ink active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Refresh Batches"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingBatches || isLoadingDetails ? 'animate-spin' : ''}`}
            />
          </button>

          {onNavigateToBatches && (
            <button
              type="button"
              onClick={onNavigateToBatches}
              className="px-3.5 py-1.5 rounded-full border border-border hover:border-ink bg-surface text-ink text-xs font-medium cursor-pointer"
            >
              <span>View Production Batches →</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Step 1: Select Batch to Inward */}
      <div className="p-4 rounded-lg border border-border bg-surface space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
              1. Select Production Batch
            </h3>
            <p className="text-[11px] text-muted">
              Choose an active batch currently in print production or partially received.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter batch #, SKU, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-bg border border-border rounded text-xs text-ink placeholder:text-muted font-mono focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {/* Batch Pills / Quick Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pt-1">
          {isLoadingBatches ? (
            <div className="col-span-full py-4 text-center text-xs text-muted">
              Loading batches...
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-muted">
              No matching print batches found.
            </div>
          ) : (
            filteredBatches.map((b) => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => loadBatchDetails(b.id)}
                  className={`p-2.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'border-ink bg-bg ring-1 ring-ink'
                      : 'border-border bg-surface hover:border-ink/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-ink truncate">
                      {b.batchNumber}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        b.status === 'PRINTING'
                          ? 'border-border bg-bg text-ink font-semibold'
                          : b.status === 'PARTIALLY_RECEIVED'
                          ? 'border-border bg-bg text-ink font-bold'
                          : b.status === 'STOCKED'
                          ? 'border-border text-muted'
                          : 'border-border text-muted'
                      }`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span className="truncate max-w-[140px] font-mono">{b.sku}</span>
                    <span>
                      Req: <strong>{b.quantityRequested}</strong>
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Selected Batch Authoritative Metrics & Inwarding Workspace */}
      {selectedBatch ? (
        <div className="space-y-6">
          {/* Authoritative State Metrics Bar */}
          <div className="border border-border rounded-lg bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg/50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-ink">
                    {selectedBatch.batchNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono uppercase bg-ink text-surface font-semibold">
                    {selectedBatch.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5 font-mono">
                  Physical SKU: <strong>{selectedBatch.sku}</strong> · Vendor: {selectedBatch.vendorName}
                  {selectedBatch.variant?.name && ` · Variant: ${selectedBatch.variant.name}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-muted">
                <span>Idempotency Guard:</span>
                <span className="text-[10px] bg-bg px-2 py-1 rounded border border-border text-ink font-mono select-all">
                  {idempotencyKey.slice(0, 24)}...
                </span>
              </div>
            </div>

            {/* 5 Quantities Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border text-center">
              <div className="bg-surface p-3 space-y-0.5">
                <span className="text-[10px] text-muted uppercase tracking-wider block font-medium">
                  Requested
                </span>
                <span className="font-mono text-xl font-bold text-ink block">
                  {selectedBatch.quantityRequested}
                </span>
                <span className="text-[10px] text-muted block">Expected total</span>
              </div>

              <div className="bg-surface p-3 space-y-0.5">
                <span className="text-[10px] text-muted uppercase tracking-wider block font-medium">
                  Received to Date
                </span>
                <span className="font-mono text-xl font-bold text-ink block">
                  {selectedBatch.quantityReceived}
                </span>
                <span className="text-[10px] text-muted block">Dock deliveries</span>
              </div>

              <div className="bg-surface p-3 space-y-0.5">
                <span className="text-[10px] text-muted uppercase tracking-wider block font-medium">
                  Accepted (In Stock)
                </span>
                <span className="font-mono text-xl font-bold text-ink block">
                  {selectedBatch.quantityAccepted ??
                    (selectedBatch.quantityReceived - selectedBatch.quantityDefective)}
                </span>
                <span className="text-[10px] text-muted block">Active sellable tags</span>
              </div>

              <div className="bg-surface p-3 space-y-0.5">
                <span className="text-[10px] text-muted uppercase tracking-wider block font-medium">
                  Defective (Damaged)
                </span>
                <span
                  className={`font-mono text-xl font-bold block ${
                    selectedBatch.quantityDefective > 0 ? 'text-danger' : 'text-ink'
                  }`}
                >
                  {selectedBatch.quantityDefective}
                </span>
                <span className="text-[10px] text-muted block">Revoked tags</span>
              </div>

              <div className="bg-surface p-3 space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-muted uppercase tracking-wider block font-medium">
                  Remaining Outstanding
                </span>
                <span
                  className={`font-mono text-xl font-bold block ${
                    outstandingBefore === 0 ? 'text-muted' : 'text-ink'
                  }`}
                >
                  {outstandingBefore}
                </span>
                <span className="text-[10px] text-muted block">Pending delivery</span>
              </div>
            </div>
          </div>

          {/* Submission Feedback Messages */}
          {submissionError && (
            <div className="p-3.5 rounded border border-danger/40 bg-bg text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submissionError}</span>
            </div>
          )}

          {lastReceiptResult && (
            <div
              className={`p-3.5 rounded border text-xs flex items-start gap-3 ${
                lastReceiptResult.isDuplicateRequest
                  ? 'border-border bg-bg text-ink'
                  : 'border-border bg-surface text-ink'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-ink mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <span>
                    {lastReceiptResult.isDuplicateRequest
                      ? 'Idempotent Duplicate Response (No Double Counting)'
                      : 'Delivery Successfully Inwarded & Activated'}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg border border-border">
                    {lastReceiptResult.receiptNumber}
                  </span>
                </div>
                <p className="text-[11px] text-muted font-mono leading-relaxed">
                  Activated {lastReceiptResult.newlyAccepted} tags to IN_STOCK · Marked{' '}
                  {lastReceiptResult.newlyDefective} tags DAMAGED · Remaining Outstanding:{' '}
                  {lastReceiptResult.outstanding} · Batch Status: {lastReceiptResult.batchStatus}
                </p>
              </div>
            </div>
          )}

          {/* Warning if Batch Already Complete */}
          {selectedBatch.status === 'STOCKED' && (
            <div className="p-3 rounded border border-border bg-bg text-ink text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted shrink-0" />
              <span>
                <strong>Batch is STOCKED:</strong> All expected tags have been received or reconciled. Subsequent submissions return the cached receipt idempotently.
              </span>
            </div>
          )}

          {/* 4. Physical Inwarding Form */}
          <form
            onSubmit={handleInwardSubmit}
            className="border border-border rounded-lg bg-surface p-4 sm:p-5 space-y-5"
          >
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                2. Record Physical Delivery
              </h3>
              <p className="text-[11px] text-muted mt-0.5">
                Enter counts for this specific physical shipment. The system activates accepted units to warehouse inventory.
              </p>
            </div>

            {/* Quantities Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Physically Delivered Count <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={receivedCount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setReceivedCount(val);
                    if (val !== '' && acceptedCount === '') {
                      setAcceptedCount(Math.max(0, val - numDefective));
                    }
                  }}
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-sm focus:border-ink focus:outline-none"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Total items counted on the dock
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Accepted (Usable) Count <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={acceptedCount}
                  onChange={(e) =>
                    setAcceptedCount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-sm focus:border-ink focus:outline-none"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Usable units activated to <code className="font-mono">IN_STOCK</code>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Defective (Damaged) Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={defectiveCount}
                  onChange={(e) => setDefectiveCount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-ink font-mono text-sm focus:border-ink focus:outline-none"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Defects marked <code className="font-mono">DAMAGED</code> &amp; revoked
                </span>
              </div>
            </div>

            {/* Discrepancy indicator */}
            {discrepancy !== 0 && (
              <div className="p-3 rounded border border-border bg-bg text-ink text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted shrink-0" />
                  <span>
                    <strong>Quantity discrepancy:</strong> Delivered ({numReceived}) vs Accepted + Defective ({numAccepted + numDefective}). Difference of {Math.abs(discrepancy)} will be recorded as {discrepancy > 0 ? 'missing / shortage' : 'excess'}.
                  </span>
                </div>
              </div>
            )}

            {/* Defective Tag Numbers Scanner/Entry Toggle */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-ink">
                    Deterministic Defect Allocation Policy
                  </span>
                  <p className="text-[11px] text-muted">
                    If defective tag numbers are omitted, the backend deterministically revokes the first {numDefective || 'N'} unactivated tags by ID order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDefectiveTagsInput(!showDefectiveTagsInput)}
                  className="text-xs font-medium text-ink underline hover:opacity-80 cursor-pointer"
                >
                  {showDefectiveTagsInput ? 'Hide tag scanner' : 'Scan / specify tag numbers'}
                </button>
              </div>

              {showDefectiveTagsInput && (
                <div className="mt-3 space-y-1.5">
                  <textarea
                    rows={3}
                    value={defectiveTagNumbersInput}
                    onChange={(e) => setDefectiveTagNumbersInput(e.target.value)}
                    placeholder="Enter or scan defective tag numbers (comma or newline separated, e.g. ZQ3TYEW, PRN884X)..."
                    className="w-full px-3 py-2 rounded border border-border bg-bg text-xs font-mono text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                  />
                  <span className="text-[10px] text-muted block font-mono">
                    Scanned tags will be validated against this batch's registered serial numbers.
                  </span>
                </div>
              )}
            </div>

            {/* Meta Row: Operator & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Received By (Operator ID / Name)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="e.g. WH-Operator-John"
                    className="w-full pl-8 pr-3 py-1.5 rounded border border-border bg-bg text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Inwarding Notes / Pallet Info
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Pallet 1 of 2 received via courier"
                    className="w-full pl-8 pr-3 py-1.5 rounded border border-border bg-bg text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mark as final shipment checkbox */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <input
                type="checkbox"
                id="markAsFinalShipment"
                checked={markAsFinalShipment}
                onChange={(e) => setMarkAsFinalShipment(e.target.checked)}
                className="rounded border-border text-ink focus:ring-ink"
              />
              <label htmlFor="markAsFinalShipment" className="text-xs text-ink cursor-pointer">
                <strong>Mark as Final Delivery:</strong> Close out this batch as STOCKED even if outstanding shortage remains.
              </label>
            </div>

            {/* Confirmation & Submission Footer */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted">
                <span>Outcome: </span>
                <strong className="text-ink font-mono">+{numAccepted} In-Stock</strong>
                {numDefective > 0 && (
                  <span className="text-danger font-mono ml-2">+{numDefective} Damaged</span>
                )}
                <span className="ml-2 font-mono">
                  (Estimated Remaining: {estimatedOutstandingAfter})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || numAccepted + numDefective <= 0}
                  className="px-5 py-2 rounded bg-ink hover:opacity-90 text-surface text-xs font-medium tracking-wide shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    {isSubmitting ? 'Confirming Inwarding...' : 'Confirm Warehouse Receipt'}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* 5. Chronological Receipt History (Audit Trail) */}
          <div className="border border-border rounded-lg bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                  3. Inwarding Audit Trail ({selectedBatch.receipts?.length || 0} Receipts)
                </h3>
                <p className="text-[11px] text-muted mt-0.5">
                  Immutable receipt logs with idempotency keys and tag defect recordings.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg/40 text-muted font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 font-medium">Receipt #</th>
                    <th className="py-2.5 px-3 font-medium">Delivered</th>
                    <th className="py-2.5 px-3 font-medium">Accepted</th>
                    <th className="py-2.5 px-3 font-medium">Defective</th>
                    <th className="py-2.5 px-3 font-medium">Missing</th>
                    <th className="py-2.5 px-4 font-medium">Received By</th>
                    <th className="py-2.5 px-4 font-medium">Date &amp; Time</th>
                    <th className="py-2.5 px-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {(!selectedBatch.receipts || selectedBatch.receipts.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted text-xs font-sans">
                        No delivery receipts recorded yet for batch {selectedBatch.batchNumber}.
                      </td>
                    </tr>
                  ) : (
                    selectedBatch.receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-ink font-mono">
                          {r.receiptNumber}
                        </td>
                        <td className="py-3 px-3 text-ink font-medium font-mono">
                          {r.receivedQuantity}
                        </td>
                        <td className="py-3 px-3 text-ink font-semibold font-mono">
                          {r.acceptedQuantity}
                        </td>
                        <td
                          className={`py-3 px-3 font-mono ${
                            r.defectiveQuantity > 0 ? 'text-danger font-semibold' : 'text-muted'
                          }`}
                        >
                          {r.defectiveQuantity}
                        </td>
                        <td className="py-3 px-3 text-muted font-mono">
                          {r.missingQuantity}
                        </td>
                        <td className="py-3 px-4 text-muted font-sans">
                          {r.receivedBy || 'Warehouse Staff'}
                        </td>
                        <td className="py-3 px-4 text-muted font-sans whitespace-nowrap">
                          {new Date(r.receivedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-muted font-sans max-w-xs truncate">
                          {r.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-lg border border-dashed border-border bg-surface space-y-2">
          <Boxes className="w-8 h-8 text-muted mx-auto" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
            No Batch Selected
          </h4>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Select an active print batch above or click &ldquo;Inward Batch&rdquo; from the Production Batches list to begin receiving deliveries.
          </p>
        </div>
      )}
    </div>
  );
};
