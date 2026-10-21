import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { qrApi, resourcesApi, cacheResourceTag } from '../../lib/api';
import type { Resource, ResourceType, QrTagLookupResponse, PairQrResponse, CreateResourcePayload } from '../../types/api';
import { motion, AnimatePresence } from 'motion/react';
import { PingInQrCode } from '../qr/PingInQrCode';
import { buildTagQrUrl } from '../../lib/qr';
import {
  QrCode,
  Check,
  AlertTriangle,
  Loader2,
  Car,
  Building2,
  Wrench,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface PairQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTagNumber?: string;
  initialToken?: string;
  initialResourceId?: string;
  onSuccess?: (result: PairQrResponse) => void;
}

const RESOURCE_TYPES: { type: ResourceType; label: string }[] = [
  { type: 'VEHICLE', label: 'Vehicle' },
  { type: 'PROPERTY', label: 'Place' },
  { type: 'EQUIPMENT', label: 'Equipment' },
  { type: 'OTHER', label: 'Other' },
];

export const PairQrModal: React.FC<PairQrModalProps> = ({
  isOpen,
  onClose,
  initialTagNumber = '',
  initialToken = '',
  initialResourceId = '',
  onSuccess,
}) => {
  const { toast } = useToast();

  const [tagInput, setTagInput] = useState(initialTagNumber || initialToken);
  const [selectedResourceId, setSelectedResourceId] = useState(initialResourceId);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Mode: create a new resource or link to an existing resource
  const [assignmentMode, setAssignmentMode] = useState<'create-new' | 'existing'>('create-new');

  // Fields for creating a new resource
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState<ResourceType>('VEHICLE');
  const [newResourceReg, setNewResourceReg] = useState('');
  const [newResourceColor, setNewResourceColor] = useState('');

  // Resources list
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  // Live lookup state
  const [isVerifying, setIsVerifying] = useState(false);
  const [lookupResult, setLookupResult] = useState<QrTagLookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<PairQrResponse | null>(null);
  const [completionStage, setCompletionStage] = useState<'check' | 'qr'>('check');

  useEffect(() => {
    if (successData) {
      setCompletionStage('check');
      const timer = setTimeout(() => {
        setCompletionStage('qr');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [successData]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setTagInput(initialTagNumber || initialToken);
      setSelectedResourceId(initialResourceId);
      setReplaceExisting(false);
      setLookupResult(null);
      setLookupError(null);
      setSubmitError(null);
      setSuccessData(null);
      setCompletionStage('check');
      setNewResourceName('');
      setNewResourceType('VEHICLE');
      setNewResourceReg('');
      setNewResourceColor('');

      loadResources();
    }
  }, [isOpen, initialTagNumber, initialToken, initialResourceId]);

  const loadResources = async () => {
    setIsLoadingResources(true);
    try {
      const data = await resourcesApi.list();
      const list = Array.isArray(data) ? data : [];
      setResources(list);

      // If user has existing resources and an initial ID was passed, default to existing
      if (initialResourceId) {
        setSelectedResourceId(initialResourceId);
        setAssignmentMode('existing');
      } else if (list.length > 0) {
        // User has resources, let them choose or default to existing
        setSelectedResourceId(list[0].id || (list[0] as any)._id);
        setAssignmentMode('existing');
      } else {
        // Fresh user with no resources -> directly create-new!
        setAssignmentMode('create-new');
      }
    } catch {
      setAssignmentMode('create-new');
    } finally {
      setIsLoadingResources(false);
    }
  };

  // Helper to extract clean tag number or token
  const sanitizeIdentifier = (val: string): { tagNumber?: string; qrToken?: string; raw: string } => {
    const trimmed = val.trim();
    if (!trimmed) return { raw: '' };

    const urlMatch = trimmed.match(/\/qr\/([a-zA-Z0-9_-]+)/i);
    const identifier = urlMatch ? urlMatch[1] : trimmed;

    if (/^[a-zA-Z0-9]{7}$/.test(identifier)) {
      return { tagNumber: identifier.toUpperCase(), raw: identifier.toUpperCase() };
    }

    return { qrToken: identifier, raw: identifier };
  };

  // Debounced live verification of tag
  const verifyTag = useCallback(async (identifier: string) => {
    const clean = sanitizeIdentifier(identifier);
    if (!clean.raw || clean.raw.length < 5) {
      setLookupResult(null);
      setLookupError(null);
      return;
    }

    setIsVerifying(true);
    setLookupError(null);

    try {
      const data = await qrApi.lookup(clean.raw);
      setLookupResult(data);
      setLookupError(null);
    } catch (err: any) {
      setLookupResult(null);
      const msg = err?.data?.message || err.message || 'QR tag not recognized';
      setLookupError(msg);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tagInput.trim()) {
        verifyTag(tagInput);
      } else {
        setLookupResult(null);
        setLookupError(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [tagInput, verifyTag]);

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value.toUpperCase());
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const clean = sanitizeIdentifier(tagInput);
    if (!clean.raw) {
      setSubmitError('Please enter a 7-character sticker code or scan a QR tag.');
      return;
    }

    setIsSubmitting(true);

    try {
      let targetResourceId = selectedResourceId;

      // PATH A: Create resource first, then pair in one go
      if (assignmentMode === 'create-new') {
        const trimmedName = newResourceName.trim();
        if (!trimmedName) {
          setSubmitError('Please give your resource a name.');
          setIsSubmitting(false);
          return;
        }

        const createPayload: CreateResourcePayload = {
          name: trimmedName,
          type: newResourceType,
        };

        if (newResourceType === 'VEHICLE') {
          const trimmedReg = newResourceReg.trim();
          const trimmedColor = newResourceColor.trim();
          if (trimmedReg || trimmedColor) {
            createPayload.vehicleDetails = {
              ...(trimmedReg ? { registrationNum: trimmedReg } : {}),
              ...(trimmedColor ? { vehicleColour: trimmedColor } : {}),
            };
          }
        }

        const createRes: any = await resourcesApi.create(createPayload);
        const newResource: Resource = createRes?.resource || createRes;
        targetResourceId = newResource.id || (newResource as any)._id;
      }

      if (!targetResourceId) {
        setSubmitError('Resource ID is missing.');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Pair the tag to the resource
      const pairPayload = {
        ...(clean.tagNumber ? { tagNumber: clean.tagNumber } : { qrToken: clean.qrToken }),
        resourceId: targetResourceId,
        replaceExistingOnResource: replaceExisting || assignmentMode === 'create-new',
      };

      const res = await qrApi.pair(pairPayload);
      const code = res.tag?.tagNumber || clean.tagNumber;
      if (code && targetResourceId) {
        cacheResourceTag(targetResourceId, code);
      }
      setSuccessData(res);
      toast.success(res.message || 'QR tag successfully paired!');
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      const status = err?.statusCode || err?.status;
      const msg = err?.data?.message || err?.message || 'Failed to pair QR tag';

      if (status === 409) {
        setReplaceExisting(true);
        setSubmitError(`${msg} (We enabled 'Replace existing tag' below—click Pair again to confirm replacement).`);
      } else {
        setSubmitError(msg);
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-sm bg-ink text-surface flex items-center justify-center">
            <QrCode className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display font-medium text-lg text-ink uppercase tracking-tight block">
              PAIR PHYSICAL QR TAG
            </span>
            <span className="font-sans text-[11px] text-muted uppercase tracking-wider block">
              {resources.length === 0 ? 'Enter sticker code & name your resource' : 'Link sticker code to your resource'}
            </span>
          </div>
        </div>
      }
      maxWidth="md"
    >
      {successData ? (
        <div className="py-4 space-y-5 animate-fade-in font-sans text-center">
          <div>
            <span className="font-mono text-[11px] font-semibold text-success uppercase tracking-widest block mb-1">
              {completionStage === 'check' ? '• PAIRED' : '• CONNECTED'}
            </span>
            <h3 className="font-display font-medium text-2xl text-ink uppercase tracking-tight">
              {successData.resource?.name}
            </h3>
            <p className="text-xs text-muted mt-1">
              Physical Tag #{successData.tag?.tagNumber} &bull;{' '}
              {completionStage === 'check' ? 'Paired successfully' : 'Connected'}
            </p>
          </div>

          {/* Interactive Object: Large Tick Mark first, then smoothly morphs to QR code */}
          <div className="relative inline-flex items-center justify-center mx-auto w-44 h-44 bg-white border border-border rounded-sm shadow-xs overflow-hidden">
            <AnimatePresence mode="wait">
              {completionStage === 'check' ? (
                <motion.div
                  key="modal-tick-mark"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.12, 1], opacity: 1 }}
                  exit={{ scale: 0.82, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="w-18 h-18 rounded-full bg-[#D7FF3F] text-ink flex items-center justify-center shadow-xs border border-ink/10">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-9 h-9 text-ink"
                    >
                      <motion.path
                        d="M20 6L9 17L4 12"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.42, delay: 0.08, ease: 'easeOut' }}
                      />
                    </svg>
                  </div>
                  <span className="font-mono text-[10px] font-semibold text-ink uppercase tracking-widest mt-2">
                    Paired
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="modal-qr-code"
                  initial={{ scale: 0.88, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                  className="relative flex items-center justify-center w-full h-full p-3.5"
                >
                  <PingInQrCode
                    value={successData.tag?.tagNumber || ''}
                    size={144}
                    includeMargin={false}
                  />

                  {/* Single Restrained Scan Sweep (Runs ONCE upon QR reveal) */}
                  <motion.div
                    initial={{ top: '-10%', opacity: 0 }}
                    animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.15, ease: 'easeInOut' }}
                    className="absolute inset-x-0 h-1 bg-[#D7FF3F] shadow-[0_0_12px_#D7FF3F] pointer-events-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-xs font-mono text-muted select-all">
            {buildTagQrUrl(successData.tag?.tagNumber || '')}
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={buildTagQrUrl(successData.tag?.tagNumber || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 transition-opacity"
            >
              <span>View public page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 font-sans pt-1">
          {/* STEP 1: Tag Identifier Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink">
                1. Sticker Code (7 characters) <span className="text-danger">*</span>
              </label>
              <span className="text-[10px] text-muted uppercase tracking-wider">
                Printed on sticker
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="e.g. KT83B45"
                value={tagInput}
                onChange={handleTagInputChange}
                className="input !h-12 font-mono text-base uppercase tracking-wider pr-10"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ink" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* Live Verification Feedback Banner */}
            {lookupResult && (
              <div className="p-3 bg-surface border border-border rounded-sm flex items-start gap-2.5 text-xs animate-fade-in">
                {lookupResult.isAssigned ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-ink block">
                        Tag #{lookupResult.tagNumber} is currently assigned
                      </span>
                      <span className="text-muted block text-[11px] mt-0.5">
                        Paired to: <strong className="text-ink">{lookupResult.pairedResource?.name}</strong>. Pairing will re-assign it.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-success block">
                        Tag #{lookupResult.tagNumber} verified &amp; ready to pair!
                      </span>
                      <span className="text-muted block text-[11px] mt-0.5">
                        Authentic unassigned sticker. Ready to link to your resource.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {lookupError && (
              <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-sm text-xs text-danger flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          {/* STEP 2: Resource Assignment or Naming in One Go */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink block">
                2. Target Resource <span className="text-danger">*</span>
              </label>

              {resources.length > 0 && (
                <div className="flex items-center gap-1 bg-surface border border-border p-0.5 rounded-xs text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('create-new')}
                    className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                      assignmentMode === 'create-new'
                        ? 'bg-ink text-surface font-semibold'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    + Create New
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('existing')}
                    className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                      assignmentMode === 'existing'
                        ? 'bg-ink text-surface font-semibold'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Choose Existing ({resources.length})
                  </button>
                </div>
              )}
            </div>

            {assignmentMode === 'create-new' ? (
              /* Sub-form: Name the resource and pair in one go */
              <div className="p-4 border border-border bg-surface/40 rounded-sm space-y-3 animate-fade-in">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Name your vehicle or space
                </span>

                {/* Category Selector */}
                <div>
                  <div className="w-full p-0.5 bg-bg border border-border rounded-xs grid grid-cols-4 gap-1">
                    {RESOURCE_TYPES.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setNewResourceType(opt.type)}
                        className={`py-1 text-[11px] font-medium rounded-xs text-center transition-colors cursor-pointer ${
                          newResourceType === opt.type
                            ? 'bg-ink text-surface font-semibold shadow-xs'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Resource Name"
                  placeholder={
                    newResourceType === 'VEHICLE'
                      ? 'e.g. Blue Sedan, Yamaha R15'
                      : 'e.g. Apartment 204, Storage Bay'
                  }
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                />

                {newResourceType === 'VEHICLE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <Input
                      label="Plate (last 4 digits)"
                      placeholder="e.g. 8488"
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newResourceReg}
                      onChange={(e) => setNewResourceReg(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                    <Input
                      label="Colour"
                      placeholder="e.g. White, Black"
                      value={newResourceColor}
                      onChange={(e) => setNewResourceColor(e.target.value)}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Choose existing resource list */
              isLoadingResources ? (
                <div className="py-6 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-ink" />
                  <span>Loading resources...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {resources.map((res) => {
                  const resId = res.id || (res as any)._id;
                  const isSelected = selectedResourceId === resId;
                  const reg =
                    res.vehicleDetails?.registrationNum ||
                    res.vehicleDetails?.registrationLast4 ||
                    (res as any).registrationNum;

                  return (
                    <div
                      key={resId}
                      onClick={() => setSelectedResourceId(resId)}
                      className={`p-3 rounded-sm border cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-ink bg-surface shadow-xs'
                          : 'border-border bg-surface/30 hover:bg-surface/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-7 w-7 rounded-xs flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-ink text-surface' : 'bg-surface border border-border text-muted'
                          }`}
                        >
                          {res.type === 'VEHICLE' && <Car className="h-3.5 w-3.5" />}
                          {res.type === 'PROPERTY' && <Building2 className="h-3.5 w-3.5" />}
                          {res.type === 'EQUIPMENT' && <Wrench className="h-3.5 w-3.5" />}
                          {(!res.type || res.type === 'OTHER') && <Layers className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-ink block truncate">
                            {res.name}
                          </span>
                          <span className="text-[11px] text-muted block truncate">
                            {res.type || 'RESOURCE'}{reg ? ` • Plate: ${reg}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-ink bg-ink text-surface' : 'border-border'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Replace Existing Option if assigning to existing */}
          {assignmentMode === 'existing' && (
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-0.5 rounded-xs border-border text-ink focus:ring-0 cursor-pointer"
                />
                <span className="text-muted leading-relaxed">
                  <strong className="text-ink font-medium">Replace existing QR tag</strong> if this resource already has a tag assigned.
                </span>
              </label>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-xs text-danger flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={
                !tagInput.trim() ||
                (assignmentMode === 'existing' && !selectedResourceId) ||
                (assignmentMode === 'create-new' && !newResourceName.trim())
              }
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              {assignmentMode === 'create-new' ? 'Create & Pair Sticker' : 'Pair Sticker'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default PairQrModal;
