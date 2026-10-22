import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { qrApi, resourcesApi, syncResourceTagUpdate } from '../../lib/api';
import type { Resource, ResourceType, QrTagLookupResponse, PairQrResponse, CreateResourcePayload } from '../../types/api';
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
  Search,
} from 'lucide-react';
import { CreateResourceModal } from '../../components/resources/CreateResourceModal';

const RESOURCE_TYPES: { type: ResourceType; label: string }[] = [
  { type: 'VEHICLE', label: 'Vehicle' },
  { type: 'PROPERTY', label: 'Place' },
  { type: 'EQUIPMENT', label: 'Equipment' },
  { type: 'OTHER', label: 'Other' },
];

export const QrPairPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialTag = token || searchParams.get('tag') || searchParams.get('t') || searchParams.get('token') || '';
  const initialResourceId = searchParams.get('resourceId') || searchParams.get('resource') || '';

  const [tagInput, setTagInput] = useState(initialTag);
  const [selectedResourceId, setSelectedResourceId] = useState(initialResourceId);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Assignment Mode
  const [assignmentMode, setAssignmentMode] = useState<'create-new' | 'existing'>('create-new');

  // Fields for creating new resource in one go
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState<ResourceType>('VEHICLE');
  const [newResourceReg, setNewResourceReg] = useState('');
  const [newResourceColor, setNewResourceColor] = useState('');

  // User resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);

  // Live lookup
  const [isVerifying, setIsVerifying] = useState(false);
  const [lookupResult, setLookupResult] = useState<QrTagLookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PairQrResponse | null>(null);

  // Quick resource creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Quick lookup tab/widget in sidebar
  const [lookupSearchInput, setLookupSearchInput] = useState('');
  const [sidebarLookupLoading, setSidebarLookupLoading] = useState(false);
  const [sidebarLookupResult, setSidebarLookupResult] = useState<QrTagLookupResponse | null>(null);
  const [sidebarLookupError, setSidebarLookupError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setIsLoadingResources(true);
    try {
      const data = await resourcesApi.list();
      const list = Array.isArray(data) ? data : [];
      setResources(list);

      if (initialResourceId) {
        setSelectedResourceId(initialResourceId);
        setAssignmentMode('existing');
      } else if (list.length > 0) {
        setSelectedResourceId(list[0].id || (list[0] as any)._id);
        setAssignmentMode('existing');
      } else {
        setAssignmentMode('create-new');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load resources');
    } finally {
      setIsLoadingResources(false);
    }
  }, [initialResourceId, toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Clean identifier helper
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

  // Debounced verification
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const clean = sanitizeIdentifier(tagInput);
    if (!clean.raw) {
      setSubmitError('Please enter a 7-character tag code or scanned token.');
      return;
    }

    setIsSubmitting(true);

    try {
      let targetId = selectedResourceId;

      // If creating resource in one go
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
        targetId = newResource.id || (newResource as any)._id;
      }

      if (!targetId) {
        setSubmitError('Please select or name a target resource to pair with.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...(clean.tagNumber ? { tagNumber: clean.tagNumber } : { qrToken: clean.qrToken }),
        resourceId: targetId,
        replaceExistingOnResource: replaceExisting || assignmentMode === 'create-new',
      };

      const res = await qrApi.pair(payload);
      const code = res.tag?.tagNumber || clean.tagNumber;
      if (code && targetId) {
        syncResourceTagUpdate(targetId, code);
      }
      setSuccessResult(res);
      toast.success(res.message || 'Tag paired successfully!');
    } catch (err: any) {
      const status = err?.statusCode || err?.status;
      const msg = err?.data?.message || err?.message || 'Failed to pair QR tag';

      if (status === 409) {
        setReplaceExisting(true);
        setSubmitError(`${msg} (We enabled 'Replace existing tag' below—click Pair again to confirm).`);
      } else {
        setSubmitError(msg);
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSidebarLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeIdentifier(lookupSearchInput);
    if (!clean.raw) return;

    setSidebarLookupLoading(true);
    setSidebarLookupError(null);
    setSidebarLookupResult(null);

    try {
      const res = await qrApi.lookup(clean.raw);
      setSidebarLookupResult(res);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Tag not found';
      setSidebarLookupError(msg);
    } finally {
      setSidebarLookupLoading(false);
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-xs text-muted hover:text-ink tracking-wider uppercase mb-3 transition-colors"
          >
            ← Back to Resources
          </Link>
          <h1 className="font-display font-medium text-3xl sm:text-5xl lg:text-6xl leading-[0.94] tracking-[-0.03em] text-ink uppercase">
            PAIR PHYSICAL TAG
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start md:self-end">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-surface border border-border font-sans text-xs font-semibold text-ink uppercase tracking-wider">
            <QrCode className="h-3.5 w-3.5" />
            KAUNTACT STICKER SUITE
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
        {/* Left/Main Column: Pairing Workflow */}
        <div className="lg:col-span-8 space-y-6">
          {successResult ? (
            <div className="p-6 sm:p-8 border border-success/30 bg-surface rounded-sm space-y-6 animate-fade-in font-sans">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-sm bg-success/15 border border-success/30 flex items-center justify-center text-success shrink-0">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-success block">
                    PAIRING CONFIRMED
                  </span>
                  <h2 className="font-display font-medium text-2xl uppercase tracking-tight text-ink mt-0.5">
                    Tag #{successResult.tag?.tagNumber} Is Live
                  </h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    This physical sticker is now connected to{' '}
                    <strong className="text-ink">{successResult.resource?.name}</strong>. Visitors who scan this sticker can immediately reach you anonymously.
                  </p>
                </div>
              </div>

              {/* Tag Details Card */}
              <div className="p-4 bg-bg border border-border rounded-sm text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted uppercase tracking-wider text-[11px]">Tag Code</span>
                  <span className="font-mono font-bold text-ink text-sm bg-surface px-2.5 py-0.5 rounded-xs border border-border">
                    {successResult.tag?.tagNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted uppercase tracking-wider text-[11px]">Linked Resource</span>
                  <span className="font-medium text-ink">
                    {successResult.resource?.name}
                    {successResult.resource?.registrationNum ? ` • Plate: ${successResult.resource.registrationNum}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted uppercase tracking-wider text-[11px]">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-accent font-semibold uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {successResult.tag?.status || 'ASSIGNED'}
                  </span>
                </div>
              </div>

              {/* Next Steps Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/resources/${successResult.resource?.id || selectedResourceId}`)}
                >
                  View Resource Details
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSuccessResult(null);
                    setTagInput('');
                    setLookupResult(null);
                    setNewResourceName('');
                  }}
                >
                  Pair Another Sticker
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="border border-border bg-surface rounded-sm p-6 sm:p-8 space-y-6">
              {/* STEP 1: Tag Identifier */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-display text-sm font-medium text-subtle select-none">
                    STEP 01
                  </span>
                  <h2 className="font-display font-medium text-lg text-ink uppercase tracking-tight">
                    ENTER STICKER CODE
                  </h2>
                </div>

                <p className="font-sans text-xs text-muted">
                  Look at the bottom of your physical Kauntact sticker and type the 7-character code (e.g. <strong className="text-ink font-mono">KT83B45</strong>) or paste the URL.
                </p>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. KT83B45"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value.toUpperCase());
                      setSubmitError(null);
                    }}
                    className="input !h-14 font-mono text-xl uppercase tracking-widest text-ink pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                    {isVerifying ? (
                      <Loader2 className="h-5 w-5 animate-spin text-ink" />
                    ) : (
                      <QrCode className="h-5 w-5" />
                    )}
                  </div>
                </div>

                {/* Live Verification Result Banner */}
                {lookupResult && (
                  <div className="p-3.5 bg-bg border border-border rounded-sm flex items-start gap-3 text-xs animate-fade-in font-sans">
                    {lookupResult.isAssigned ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-ink block">
                            Tag #{lookupResult.tagNumber} is currently assigned
                          </span>
                          <span className="text-muted block text-[11px] mt-0.5">
                            Paired to: <strong>{lookupResult.pairedResource?.name || 'Another resource'}</strong>. You can re-assign it to a new resource below.
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-success block">
                            Tag #{lookupResult.tagNumber} Verified &amp; Ready
                          </span>
                          <span className="text-muted block text-[11px] mt-0.5">
                            Inventory: {lookupResult.origin === 'PREPRINTED_INVENTORY' ? 'Physical Sticker' : 'Digital Tag'} • Unassigned
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {lookupError && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-xs text-danger flex items-center gap-2 animate-fade-in font-sans">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* STEP 2: Choose Target Resource or Name It in One Go */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-display text-sm font-medium text-subtle select-none">
                    STEP 02
                  </span>
                  <div className="flex items-center justify-between flex-1 ml-3">
                    <h2 className="font-display font-medium text-lg text-ink uppercase tracking-tight">
                      RESOURCE DETAILS
                    </h2>

                    {resources.length > 0 && (
                      <div className="flex items-center gap-1 bg-bg border border-border p-0.5 rounded-xs text-[10px]">
                        <button
                          type="button"
                          onClick={() => setAssignmentMode('create-new')}
                          className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                            assignmentMode === 'create-new'
                              ? 'bg-ink text-surface font-semibold'
                              : 'text-muted hover:text-ink'
                          }`}
                        >
                          + Name New Resource
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignmentMode('existing')}
                          className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
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
                </div>

                {isLoadingResources ? (
                  <div className="py-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-ink" />
                    <span>Loading registered resources...</span>
                  </div>
                ) : assignmentMode === 'create-new' ? (
                  /* Embed resource creation in one go */
                  <div className="p-5 border border-border bg-surface/40 rounded-sm space-y-4 animate-fade-in">
                    <div>
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
                        Category
                      </span>
                      <div className="w-full p-1 bg-bg border border-border rounded-xs grid grid-cols-4 gap-1">
                        {RESOURCE_TYPES.map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => setNewResourceType(opt.type)}
                            className={`py-1.5 text-xs font-medium rounded-xs text-center transition-colors cursor-pointer ${
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
                          ? 'e.g. Tata Safari, Yamaha R15'
                          : 'e.g. Apartment 204, Driveway Bay'
                      }
                      value={newResourceName}
                      onChange={(e) => setNewResourceName(e.target.value)}
                    />

                    {newResourceType === 'VEHICLE' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <Input
                          label="Plate / Registration"
                          placeholder="e.g. KA01AB1234"
                          value={newResourceReg}
                          onChange={(e) => setNewResourceReg(e.target.value.toUpperCase())}
                          helperText="Full plate or last 4 digits"
                        />
                        <Input
                          label="Colour"
                          placeholder="e.g. White, Matte Black"
                          value={newResourceColor}
                          onChange={(e) => setNewResourceColor(e.target.value)}
                          helperText="Vehicle colour"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className={`p-3.5 rounded-sm border cursor-pointer transition-all flex items-start justify-between ${
                            isSelected
                              ? 'border-ink bg-bg shadow-xs ring-1 ring-ink'
                              : 'border-border bg-bg/50 hover:bg-bg hover:border-border-strong'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'bg-ink text-surface' : 'bg-surface border border-border text-muted'
                              }`}
                            >
                              {res.type === 'VEHICLE' && <Car className="h-4 w-4" />}
                              {res.type === 'PROPERTY' && <Building2 className="h-4 w-4" />}
                              {res.type === 'EQUIPMENT' && <Wrench className="h-4 w-4" />}
                              {(!res.type || res.type === 'OTHER') && <Layers className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-ink block truncate">
                                {res.name}
                              </span>
                              <span className="text-[11px] text-muted block truncate mt-0.5">
                                {res.type || 'RESOURCE'}{reg ? ` • Plate: ${reg}` : ''}
                              </span>
                            </div>
                          </div>

                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ml-2 mt-1 ${
                              isSelected ? 'border-ink bg-ink text-surface' : 'border-border'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 3: Replace Existing Tag & Confirm */}
              <div className="pt-2 space-y-4">
                {assignmentMode === 'existing' && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="mt-0.5 rounded-xs border-border text-ink focus:ring-0 cursor-pointer"
                    />
                    <span className="text-muted leading-relaxed">
                      <strong className="text-ink font-medium">Replace existing QR tag</strong> if this resource already has an active tag.
                    </span>
                  </label>
                )}

                {submitError && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-xs text-danger flex items-start gap-2 animate-fade-in font-sans">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="font-sans text-[11px] text-muted">
                    Instant activation via Kauntact Cloud
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={
                      !tagInput.trim() ||
                      (assignmentMode === 'create-new' && !newResourceName.trim()) ||
                      (assignmentMode === 'existing' && !selectedResourceId)
                    }
                    className="!h-11 px-6 uppercase tracking-wider text-xs font-semibold"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {assignmentMode === 'create-new' ? 'Create & Pair Sticker' : 'Pair Sticker'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right/Sidebar Column: Tag Lookup & Guidelines */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Tag Lookup Tool */}
          <div className="p-5 border border-border bg-surface rounded-sm space-y-4 font-sans">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Search className="h-4 w-4 text-ink" />
              <h3 className="font-display font-medium text-base text-ink uppercase tracking-tight">
                CHECK ANY TAG STATUS
              </h3>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Scan or enter any 7-character code to inspect whether it is authentic, unassigned, or active.
            </p>

            <form onSubmit={handleSidebarLookup} className="space-y-2.5">
              <input
                type="text"
                placeholder="e.g. KT83B45"
                value={lookupSearchInput}
                onChange={(e) => setLookupSearchInput(e.target.value.toUpperCase())}
                className="input !h-10 text-xs font-mono uppercase tracking-wider"
              />
              <Button
                type="submit"
                variant="secondary"
                isLoading={sidebarLookupLoading}
                disabled={!lookupSearchInput.trim()}
                className="w-full !h-9 text-xs"
              >
                Inspect Tag
              </Button>
            </form>

            {sidebarLookupResult && (
              <div className="p-3 bg-bg border border-border rounded-sm text-xs space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-[11px]">Tag Code</span>
                  <span className="font-mono font-bold text-ink">#{sidebarLookupResult.tagNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-[11px]">Status</span>
                  <span
                    className={`font-semibold uppercase text-[11px] ${
                      sidebarLookupResult.isAssigned ? 'text-accent' : 'text-success'
                    }`}
                  >
                    {sidebarLookupResult.status}
                  </span>
                </div>
                {sidebarLookupResult.pairedResource && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted text-[11px]">Paired To</span>
                    <span className="font-medium text-ink truncate max-w-[140px]">
                      {sidebarLookupResult.pairedResource.name}
                    </span>
                  </div>
                )}
                {!sidebarLookupResult.isAssigned && (
                  <button
                    type="button"
                    onClick={() => {
                      setTagInput(sidebarLookupResult.tagNumber);
                      setLookupSearchInput('');
                      setSidebarLookupResult(null);
                    }}
                    className="w-full text-center text-xs font-semibold text-ink underline pt-1 cursor-pointer"
                  >
                    Use this tag in form above ↑
                  </button>
                )}
              </div>
            )}

            {sidebarLookupError && (
              <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-sm text-xs text-danger">
                {sidebarLookupError}
              </div>
            )}
          </div>

          {/* Physical Placement Tips */}
          <div className="p-5 border border-border bg-surface/40 rounded-sm space-y-3 font-sans text-xs">
            <span className="text-muted text-[11px] font-semibold uppercase tracking-wider block">
              PHYSICAL STICKER BEST PRACTICES
            </span>
            <ul className="space-y-2 text-muted leading-relaxed list-disc list-inside">
              <li>Place stickers on lower driver-side or passenger windshield for best visibility.</li>
              <li>Wipe glass clean with an alcohol wipe before applying adhesive.</li>
              <li>Every Kauntact QR sticker is weatherproof and UV-resistant.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Create Resource Modal */}
      <CreateResourceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newRes) => {
          setResources((prev) => [newRes, ...prev]);
          setSelectedResourceId(newRes.id || (newRes as any)._id);
          setIsCreateModalOpen(false);
          toast.success(`Resource "${newRes.name}" created!`);
        }}
      />
    </Layout>
  );
};

export default QrPairPage;
