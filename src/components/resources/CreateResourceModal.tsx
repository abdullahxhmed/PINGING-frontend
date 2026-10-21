import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { resourcesApi, qrApi, cacheResourceTag, extractConflictTagNumber } from '../../lib/api';
import type { Resource, ResourceType, CreateResourcePayload, QrTagLookupResponse } from '../../types/api';
import { QrCode, Sparkles, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (resource: Resource) => void;
}

const RESOURCE_TYPES: { type: ResourceType; label: string }[] = [
  { type: 'VEHICLE', label: 'Vehicle' },
  { type: 'PROPERTY', label: 'Place' },
  { type: 'EQUIPMENT', label: 'Equipment' },
  { type: 'OTHER', label: 'Other' },
];

const PLACEHOLDERS: Record<ResourceType, string> = {
  VEHICLE: 'e.g. Blue Sedan, Yamaha R15',
  PROPERTY: 'e.g. Home, Office, Storage Bay',
  EQUIPMENT: 'e.g. Diesel Generator, Forklift #2',
  OTHER: 'e.g. Black Backpack, Camera Case',
};

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('VEHICLE');
  const [registrationLast4, setRegistrationLast4] = useState('');
  const [color, setColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR Tag Choice: Digital QR vs Physical Sticker
  const [qrChoice, setQrChoice] = useState<'digital' | 'sticker'>('digital');
  const [stickerCode, setStickerCode] = useState('');
  const [isVerifyingSticker, setIsVerifyingSticker] = useState(false);
  const [stickerLookupResult, setStickerLookupResult] = useState<QrTagLookupResponse | null>(null);
  const [stickerLookupError, setStickerLookupError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    setName('');
    setType('VEHICLE');
    setRegistrationLast4('');
    setColor('');
    setQrChoice('digital');
    setStickerCode('');
    setStickerLookupResult(null);
    setStickerLookupError(null);
    onClose();
  };

  // Helper to extract clean 7-character code or token
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

  // Live lookup of sticker code
  const verifySticker = useCallback(async (code: string) => {
    const clean = sanitizeIdentifier(code);
    if (!clean.raw || clean.raw.length < 5) {
      setStickerLookupResult(null);
      setStickerLookupError(null);
      return;
    }

    setIsVerifyingSticker(true);
    setStickerLookupError(null);

    try {
      const data = await qrApi.lookup(clean.raw);
      setStickerLookupResult(data);
      setStickerLookupError(null);
    } catch (err: any) {
      setStickerLookupResult(null);
      const msg = err?.data?.message || err?.message || 'Sticker not recognized';
      setStickerLookupError(msg);
    } finally {
      setIsVerifyingSticker(false);
    }
  }, []);

  useEffect(() => {
    if (qrChoice !== 'sticker') return;

    const timer = setTimeout(() => {
      if (stickerCode.trim()) {
        verifySticker(stickerCode);
      } else {
        setStickerLookupResult(null);
        setStickerLookupError(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [stickerCode, qrChoice, verifySticker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please give this resource a name.');
      toast.error('Name is required');
      return;
    }

    // If sticker chosen, ensure code is provided
    let cleanSticker: { tagNumber?: string; qrToken?: string; raw: string } = { raw: '' };
    if (qrChoice === 'sticker') {
      cleanSticker = sanitizeIdentifier(stickerCode);
      if (!cleanSticker.raw) {
        setError('Please enter the 7-character code from your sticker or switch to Digital QR.');
        toast.error('Sticker code required');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    const payload: CreateResourcePayload = {
      name: trimmedName,
      type,
    };

    if (type === 'VEHICLE') {
      const trimmedReg = registrationLast4.trim();
      const trimmedColor = color.trim();
      if (trimmedReg || trimmedColor) {
        payload.vehicleDetails = {
          ...(trimmedReg ? { registrationNum: trimmedReg } : {}),
          ...(trimmedColor ? { vehicleColour: trimmedColor } : {}),
        };
      }
    }

    try {
      // Step 1: Create Resource
      const response: any = await resourcesApi.create(payload);
      const createdResource: Resource = response?.resource
        ? { ...response.resource, contactUrl: response.contactUrl }
        : response;

      const createdId = createdResource.id || (createdResource as any)._id;

      // Step 2: Handle QR Tag association
      if (qrChoice === 'sticker' && cleanSticker.raw && createdId) {
        // Pair the physical sticker
        try {
          const pairPayload = {
            ...(cleanSticker.tagNumber ? { tagNumber: cleanSticker.tagNumber } : { qrToken: cleanSticker.qrToken }),
            resourceId: createdId,
            replaceExistingOnResource: true,
          };
          const pairRes = await qrApi.pair(pairPayload);
          const assignedCode = pairRes.tag?.tagNumber || cleanSticker.tagNumber;
          createdResource.tagNumber = assignedCode;
          if (assignedCode) cacheResourceTag(createdId, assignedCode);
          toast.success(`"${trimmedName}" created and sticker #${assignedCode || cleanSticker.raw} paired!`);
        } catch (pairErr: any) {
          const pairMsg = pairErr?.data?.message || pairErr.message || 'Resource created, but sticker pairing failed.';
          toast.error(pairMsg);
        }
      } else if (qrChoice === 'digital' && createdId) {
        // Generate digital QR tag bound to this resource
        try {
          const genRes = await qrApi.generate({
            resourceId: createdId,
            origin: 'GENERATED_FOR_RESOURCE',
          });
          const genCode = genRes.tag?.tagNumber;
          createdResource.tagNumber = genCode;
          if (genCode) cacheResourceTag(createdId, genCode);
          toast.success(`"${trimmedName}" created with digital QR tag #${genCode}!`);
        } catch (genErr: any) {
          const genMsg = genErr?.data?.message || genErr.message || '';
          const conflictCode = extractConflictTagNumber(genMsg);
          if (conflictCode) {
            createdResource.tagNumber = conflictCode;
            cacheResourceTag(createdId, conflictCode);
            toast.info(`"${trimmedName}" created; active tag #${conflictCode} linked.`);
          } else {
            toast.success(`"${trimmedName}" added successfully`);
          }
        }
      } else {
        toast.success(`"${trimmedName}" added`);
      }

      setName('');
      setType('VEHICLE');
      setRegistrationLast4('');
      setColor('');
      setStickerCode('');
      setStickerLookupResult(null);
      setStickerLookupError(null);
      setError(null);
      onCreated(createdResource);
      onClose();
    } catch (err: any) {
      const errorMessage =
        err?.message ||
        err?.data?.message ||
        err?.error ||
        'Failed to add resource. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add a resource"
      description="Choose what you're adding, give it a name, and choose how to pair your QR tag."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 font-sans">
        {/* Category Segmented Control */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
            Category
          </label>
          <div className="w-full p-1 bg-surface border border-border rounded-sm grid grid-cols-4 gap-1">
            {RESOURCE_TYPES.map((option) => {
              const isSelected = type === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setType(option.type);
                    if (error) setError(null);
                  }}
                  className={`py-1.5 px-1 text-xs sm:text-sm font-medium rounded-xs text-center transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-ink text-surface shadow-xs font-semibold'
                      : 'text-muted hover:text-ink hover:bg-bg/60'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name Field */}
        <Input
          label="Name"
          placeholder={PLACEHOLDERS[type]}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          autoFocus
        />

        {/* Vehicle-Specific Details */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            type === 'VEHICLE'
              ? 'max-h-64 opacity-100 translate-y-0 pt-1 pointer-events-auto'
              : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-medium">
                VEHICLE DETAILS
              </span>
              <span className="text-xs text-muted">Optional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <Input
                label="Registration — plate or last 4 digits"
                labelClassName="h-5 flex items-end"
                placeholder="e.g. KA01AB1234 or 1234"
                value={registrationLast4}
                onChange={(e) => setRegistrationLast4(e.target.value.toUpperCase())}
                helperText="Plate number or last 4 digits"
              />

              <Input
                label="Colour"
                labelClassName="h-5 flex items-end"
                placeholder="e.g. White, Matte black"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                helperText="Helps visitors identify your vehicle"
              />
            </div>
          </div>
        </div>

        {/* QR Tag Setup Choice */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink uppercase tracking-wider block">
              QR Tag Connection
            </span>
            <span className="text-[11px] text-muted">Choose sticker or digital tag</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option 1: Digital QR */}
            <div
              onClick={() => {
                setQrChoice('digital');
                setError(null);
              }}
              className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-3 ${
                qrChoice === 'digital'
                  ? 'border-ink bg-surface shadow-xs ring-1 ring-ink'
                  : 'border-border bg-surface/30 hover:bg-surface/70'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-xs flex items-center justify-center shrink-0 mt-0.5 ${
                  qrChoice === 'digital' ? 'bg-ink text-surface' : 'bg-surface border border-border text-muted'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs text-ink block">
                  Generate Digital Tag
                </span>
                <span className="text-[11px] text-muted block mt-0.5 leading-snug">
                  Creates a fresh digital QR tag bound to this resource immediately.
                </span>
              </div>
            </div>

            {/* Option 2: Physical Sticker */}
            <div
              onClick={() => {
                setQrChoice('sticker');
                setError(null);
              }}
              className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-3 ${
                qrChoice === 'sticker'
                  ? 'border-ink bg-surface shadow-xs ring-1 ring-ink'
                  : 'border-border bg-surface/30 hover:bg-surface/70'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-xs flex items-center justify-center shrink-0 mt-0.5 ${
                  qrChoice === 'sticker' ? 'bg-ink text-surface' : 'bg-surface border border-border text-muted'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs text-ink block">
                  I Have a Physical Sticker
                </span>
                <span className="text-[11px] text-muted block mt-0.5 leading-snug">
                  Link a 7-character sticker code you already have with you.
                </span>
              </div>
            </div>
          </div>

          {/* If physical sticker chosen, show input */}
          {qrChoice === 'sticker' && (
            <div className="p-3.5 border border-border bg-surface/50 rounded-sm space-y-2 animate-fade-in text-xs">
              <label className="font-semibold text-ink uppercase tracking-wider block text-[11px]">
                Sticker Code (7 characters) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. KT83B45"
                  value={stickerCode}
                  onChange={(e) => setStickerCode(e.target.value.toUpperCase())}
                  className="input !h-10 font-mono text-sm uppercase tracking-wider pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {isVerifyingSticker ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-ink" />
                  ) : (
                    <QrCode className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>

              {stickerLookupResult && (
                <div className="p-2 bg-bg border border-border rounded-xs flex items-center gap-2 text-[11px]">
                  {stickerLookupResult.isAssigned ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                      <span className="text-muted">
                        Tag #{stickerLookupResult.tagNumber} is already paired to{' '}
                        <strong className="text-ink">{stickerLookupResult.pairedResource?.name}</strong>. It will be reassigned.
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="text-success font-medium">
                        Tag #{stickerLookupResult.tagNumber} verified &amp; ready to pair!
                      </span>
                    </>
                  )}
                </div>
              )}

              {stickerLookupError && (
                <div className="p-2 bg-danger/10 border border-danger/20 rounded-xs text-[11px] text-danger">
                  {stickerLookupError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end items-center gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            {qrChoice === 'sticker' ? 'Create & Pair Sticker' : 'Create Resource'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateResourceModal;
