import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { qrApi, resourcesApi, syncResourceTagUpdate } from '../../lib/api';
import { buildTagQrUrl } from '../../lib/qr';
import { PingInQrCode } from '../qr/PingInQrCode';
import type { Resource, ResourceType, QrTagLookupResponse } from '../../types/api';

const StickerPairing = React.lazy(
  () => import('../../features/sticker-pairing/StickerPairing')
);
import {
  QrCode,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Car,
  Building2,
  Wrench,
  Layers,
  ShieldAlert,
  Lock,
  ChevronDown,
  Palette,
} from 'lucide-react';

export interface TagSetupFlowProps {
  onComplete: (resource: Resource) => void;
  onCancel?: () => void;
  existingResources?: Resource[];
  hasExistingTags?: boolean;
}

type FlowView =
  | 'approach'
  | 'scanner'
  | 'identifying'
  | 'already-paired'
  | 'unauthorized'
  | 'invalid'
  | 'destination'
  | 'digital'
  | 'completed';

const RESOURCE_TYPES: {
  type: ResourceType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  placeholder: string;
}[] = [
  { type: 'VEHICLE', label: 'vehicle', subtitle: 'Car, bike, scooter', icon: Car, placeholder: 'e.g. Honda City' },
  { type: 'PROPERTY', label: 'place', subtitle: 'Home, office, gate', icon: Building2, placeholder: 'e.g. Front Door' },
  { type: 'EQUIPMENT', label: 'equipment', subtitle: 'Tools, tech, gear', icon: Wrench, placeholder: 'e.g. Camera Kit' },
  { type: 'OTHER', label: 'everyday item', subtitle: 'Keys, bag, luggage', icon: Layers, placeholder: 'e.g. House Keys' },
];

export const TagSetupFlow: React.FC<TagSetupFlowProps> = ({
  onComplete,
  onCancel,
  existingResources,
  hasExistingTags,
}) => {
  const [view, setView] = useState<FlowView>('approach');

  // User's owned resources (initialized synchronously from props to eliminate text flash/jitter)
  const [ownedResources, setOwnedResources] = useState<Resource[]>(() => existingResources || []);

  const hasTags = hasExistingTags !== undefined ? hasExistingTags : ownedResources.length > 0;

  // Identification & Tag State
  const [detectedCode, setDetectedCode] = useState<string>('');
  const [identificationPhase, setIdentificationPhase] = useState<'detected' | 'checking'>('detected');
  const [tagLookup, setTagLookup] = useState<QrTagLookupResponse | null>(null);
  const [invalidMessage, setInvalidMessage] = useState<string>('');

  // Destination / Belonging Selection State
  const [destinationChoice, setDestinationChoice] = useState<'initial-ask' | 'configure'>(() => {
    return (existingResources && existingResources.length > 0) ? 'initial-ask' : 'configure';
  });
  const [destinationMode, setDestinationMode] = useState<'create-new' | 'choose-existing'>('create-new');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [isMovingSticker, setIsMovingSticker] = useState<boolean>(false);

  // New Resource Form
  const [belongingName, setBelongingName] = useState<string>('');
  const [belongingType, setBelongingType] = useState<ResourceType>('VEHICLE');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleColor, setVehicleColor] = useState<string>('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState<boolean>(false);
  const [isDigitalCategoryMenuOpen, setIsDigitalCategoryMenuOpen] = useState<boolean>(false);
  const [hasStoppedTypingName, setHasStoppedTypingName] = useState<boolean>(false);

  // Debounce typing in name field so vehicle verification prompt appears smoothly after typing pauses
  useEffect(() => {
    if (!belongingName.trim()) {
      setHasStoppedTypingName(false);
      return;
    }
    const timer = setTimeout(() => {
      setHasStoppedTypingName(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [belongingName]);

  const isVehiclePromptVisible =
    belongingType === 'VEHICLE' &&
    belongingName.trim().length > 0 &&
    hasStoppedTypingName;

  // Autocursor: automatically focus the belonging name input when entering the step
  const nameInputRef = useRef<HTMLInputElement>(null);
  const digitalNameInputRef = useRef<HTMLInputElement>(null);
  const hasAutofocusedRef = useRef<boolean>(false);
  const hasDigitalAutofocusedRef = useRef<boolean>(false);

  useEffect(() => {
    if (view === 'destination' && destinationChoice === 'configure' && destinationMode === 'create-new') {
      hasAutofocusedRef.current = false;
    } else {
      hasAutofocusedRef.current = false;
    }
  }, [view, destinationChoice, destinationMode]);

  useEffect(() => {
    if (view === 'digital') {
      hasDigitalAutofocusedRef.current = false;
    } else {
      hasDigitalAutofocusedRef.current = false;
    }
  }, [view]);

  // Dropdown click-outside detection to eliminate fragile backdrop divs
  const categoryMenuRef = useRef<HTMLSpanElement>(null);
  const digitalCategoryMenuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
      if (digitalCategoryMenuRef.current && !digitalCategoryMenuRef.current.contains(e.target as Node)) {
        setIsDigitalCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeResourceType =
    RESOURCE_TYPES.find((r) => r.type === belongingType) || RESOURCE_TYPES[0];

  // Activation & Completion State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedResource, setCompletedResource] = useState<Resource | null>(null);
  const [completedTagNumber, setCompletedTagNumber] = useState<string>('');
  const [completionStage, setCompletionStage] = useState<'check' | 'qr'>('check');

  useEffect(() => {
    if (view === 'completed') {
      setCompletionStage('check');
      const timer = setTimeout(() => {
        setCompletionStage('qr');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Fetch user's existing resources in the background if not provided via props
  useEffect(() => {
    if (existingResources && existingResources.length > 0) {
      setOwnedResources(existingResources);
      return;
    }
    let isMounted = true;
    resourcesApi
      .list()
      .then((data) => {
        if (isMounted) setOwnedResources(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [existingResources]);

  // Step 2: Handle Tag Detected from Scanner or Manual Input
  const handleTagDetected = async (code: string, preloadedLookup?: QrTagLookupResponse) => {
    const clean = code.trim().toUpperCase();
    setDetectedCode(clean);
    setSubmitError(null);

    try {
      let lookup = preloadedLookup;
      let resourcesList = ownedResources;

      if (!lookup) {
        setView('identifying');
        setIdentificationPhase('detected');

        // Phase 1 -> Phase 2 transition (brief real state)
        const phaseTimer = setTimeout(() => {
          setIdentificationPhase('checking');
        }, 320);

        // Fetch fresh owned resources if needed to check ownership
        const [fetchedLookup, userResources] = await Promise.all([
          qrApi.lookup(clean),
          ownedResources.length > 0 ? Promise.resolve(ownedResources) : resourcesApi.list().catch(() => []),
        ]);

        clearTimeout(phaseTimer);
        lookup = fetchedLookup;
        resourcesList = Array.isArray(userResources) ? userResources : [];
        setOwnedResources(resourcesList);
      } else if (resourcesList.length === 0) {
        const userResources = await resourcesApi.list().catch(() => []);
        resourcesList = Array.isArray(userResources) ? userResources : [];
        setOwnedResources(resourcesList);
      }

      setTagLookup(lookup);

      // Branch based on real tag record:
      if (lookup.status === 'REVOKED') {
        setInvalidMessage(`Tag #${clean} has been revoked and can no longer be connected.`);
        setView('invalid');
        return;
      }

      if (lookup.isAssigned || lookup.status === 'ASSIGNED') {
        // Check if the assigned resource belongs to this user
        const pairedId = lookup.pairedResource?.id;
        const isOwnedByUser = pairedId
          ? resourcesList.some((r) => (r.id || (r as any)._id) === pairedId)
          : false;

        if (isOwnedByUser) {
          // User owns this sticker: Offer reassignment / move
          setIsMovingSticker(true);
          setView('already-paired');
        } else {
          // Tag is assigned to another user's account: Protect privacy & prevent transfer
          setIsMovingSticker(false);
          setView('unauthorized');
        }
        return;
      }

      // Unassigned tag: Ready to connect!
      setIsMovingSticker(false);
      setDestinationChoice(resourcesList.length > 0 ? 'initial-ask' : 'configure');
      setDestinationMode('create-new');
      setView('destination');
    } catch (err: any) {
      setInvalidMessage(err.message || `Unable to recognize code "${clean}". Please check the 7 printed characters.`);
      setView('invalid');
    }
  };

  // Step 5: Confirm and persist the connection
  const handleConfirmConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedCode) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let targetResource: Resource;

      if (destinationMode === 'create-new') {
        if (!belongingName.trim()) {
          setSubmitError('Please provide a name for your belonging.');
          setIsSubmitting(false);
          return;
        }

        const createPayload = {
          name: belongingName.trim(),
          type: belongingType,
          ...(belongingType === 'VEHICLE' && (vehiclePlate || vehicleColor)
            ? {
                vehicleDetails: {
                  registrationNum: vehiclePlate.trim().toUpperCase() || undefined,
                  vehicleColour: vehicleColor.trim() || undefined,
                },
              }
            : {}),
        };

        const createRes: any = await resourcesApi.create(createPayload);
        const created: Resource = createRes?.resource || createRes;
        targetResource = created;
      } else {
        const found = ownedResources.find((r) => (r.id || (r as any)._id) === selectedResourceId);
        if (!found) {
          setSubmitError('Please select a destination belonging.');
          setIsSubmitting(false);
          return;
        }
        targetResource = found;
      }

      const targetId = targetResource?.id || (targetResource as any)?._id;
      if (!targetId) {
        throw new Error('Could not establish belonging ID. Please try again.');
      }

      // Pair or Reassign
      const pairRes = await qrApi.pair({
        tagNumber: detectedCode,
        resourceId: targetId,
        replaceExistingOnResource: true,
      });

      const finalTag = pairRes.tag?.tagNumber || detectedCode;
      if (targetId && finalTag) {
        syncResourceTagUpdate(targetId, finalTag);
      }

      const updatedResource: Resource = {
        ...targetResource,
        tagNumber: finalTag,
        qrTag: {
          id: pairRes.tag?.id || '',
          tagNumber: finalTag,
          status: 'ASSIGNED',
        },
      };

      setCompletedResource(updatedResource);
      setCompletedTagNumber(finalTag);
      setView('completed');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to complete connection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pure Digital Tag Generation
  const handleGenerateDigitalTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!belongingName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createPayload = {
        name: belongingName.trim(),
        type: belongingType,
        ...(belongingType === 'VEHICLE' && (vehiclePlate || vehicleColor)
          ? {
              vehicleDetails: {
                registrationNum: vehiclePlate.trim().toUpperCase() || undefined,
                vehicleColour: vehicleColor.trim() || undefined,
              },
            }
          : {}),
      };

      const createRes: any = await resourcesApi.create(createPayload);
      const newResource: Resource = createRes?.resource || createRes;
      const resourceId = newResource.id || (newResource as any)._id;

      const genRes = await qrApi.generate({
        origin: 'GENERATED_FOR_RESOURCE',
        resourceId,
      });

      const assignedTag = genRes.tag?.tagNumber || 'DIGITAL';
      if (resourceId && assignedTag) {
        syncResourceTagUpdate(resourceId, assignedTag);
      }

      const updatedNewResource: Resource = {
        ...newResource,
        tagNumber: assignedTag,
        qrTag: {
          id: genRes.tag?.id || '',
          tagNumber: assignedTag,
          status: 'ASSIGNED',
        },
      };

      setCompletedResource(updatedNewResource);
      setCompletedTagNumber(assignedTag);
      setView('completed');
    } catch (err: any) {
      setSubmitError(err.message || 'Unable to generate digital tag.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto font-sans">
      <AnimatePresence mode="wait">
        {/* =================================================================== */}
        {/* VIEW 0: APPROACH SELECTION (HOMEPAGE, ZERO CAMERA)                  */}
        {/* =================================================================== */}
        {view === 'approach' && (
          <motion.div
            key="approach-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="space-y-6"
          >
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to your tags</span>
              </button>
            )}

            <div>
              <span className="font-mono text-[11px] font-semibold text-muted tracking-widest uppercase block mb-1">
                {hasTags ? 'NEW TAG' : 'FIRST SETUP'}
              </span>
              <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight uppercase">
                {hasTags ? 'Connect a new tag' : 'Connect your first tag'}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1.5 leading-relaxed max-w-md">
                Pair your physical Kauntact sticker to your car, bike, or belonging to activate private caller forwarding.
              </p>
            </div>

            {/* Primary Action Card: Pair physical sticker */}
            <div
              onClick={() => setView('scanner')}
              className="p-6 bg-surface border border-ink/80 rounded-sm hover:border-ink transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink uppercase tracking-wider">
                    <QrCode className="h-4 w-4" />
                    <span>Physical Sticker</span>
                  </div>
                  <h3 className="font-display font-medium text-xl sm:text-2xl text-ink uppercase">
                    Pair Physical Sticker
                  </h3>
                  <p className="text-xs text-muted leading-relaxed max-w-sm">
                    Scan your sticker with your camera, or enter the printed 7-character code.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setView('scanner');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs group-hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                >
                  <span>Pair Tag</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Understated Secondary Action: Create Digital Tag */}
            <div className="pt-2 text-center border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setDetectedCode('');
                  setSubmitError(null);
                  setView('digital');
                }}
                className="text-xs text-muted hover:text-ink font-medium transition-colors cursor-pointer"
              >
                Don't have a physical sticker?{' '}
                <span className="underline underline-offset-4 text-ink font-semibold">
                  Create a digital tag instead &rarr;
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* VIEW 1: SCANNER SCREEN (REAL CAMERA FEED & MANUAL ENTRY)            */}
        {/* =================================================================== */}
        {view === 'scanner' && (
          <motion.div
            key="scanner-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="space-y-4"
          >
            <React.Suspense
              fallback={
                <div className="w-full max-w-sm mx-auto p-12 rounded-xl bg-surface border border-border flex flex-col items-center justify-center gap-3 text-center my-6 shadow-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-[#D7FF3F]" />
                  <span className="font-mono text-xs uppercase tracking-wider text-muted">
                    Loading optical scanner…
                  </span>
                </div>
              }
            >
              <StickerPairing
                onResolved={(code, lookup) => handleTagDetected(code, lookup)}
                onClose={() => setView('approach')}
                ownedResources={ownedResources}
              />
            </React.Suspense>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: IDENTIFICATION STATE (BRIEF REAL-TIME SERVER CHECK)         */}
        {/* =================================================================== */}
        {view === 'identifying' && (
          <motion.div
            key="identifying-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="p-8 bg-surface border border-border rounded-xl text-center space-y-4 my-6 shadow-sm"
          >
            <div className="h-12 w-12 mx-auto rounded-full bg-ink/5 border border-border flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink" />
            </div>

            {identificationPhase === 'detected' ? (
              <div className="space-y-1">
                <span className="font-mono text-[11px] text-muted uppercase tracking-wider block">
                  Sticker detected
                </span>
                <h3 className="font-display font-medium text-xl text-ink uppercase">
                  Reading tag identity…
                </h3>
                <p className="text-xs text-muted">Tag <span className="font-satoshi font-medium text-ink">#{detectedCode}</span></p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="font-mono text-[11px] text-success uppercase tracking-wider block">
                  Sticker identified
                </span>
                <h3 className="font-display font-medium text-xl text-ink uppercase">
                  Checking whether it can be connected…
                </h3>
                <p className="text-xs text-muted">Tag <span className="font-satoshi font-medium text-ink">#{detectedCode}</span></p>
              </div>
            )}
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* VIEW 3: SCREEN TWO — STICKER ALREADY PAIRED (OWNED BY USER)         */}
        {/* =================================================================== */}
        {/* =================================================================== */}
        {/* VIEW 3: SCREEN TWO — STICKER ALREADY PAIRED (OWNED BY USER)         */}
        {/* =================================================================== */}
        {view === 'already-paired' && tagLookup && (() => {
          const pairedType = RESOURCE_TYPES.find((r) => r.type === tagLookup.pairedResource?.type) || RESOURCE_TYPES[0];
          const PairedIcon = pairedType.icon;
          const hostName = tagLookup.pairedResource?.name || 'Active Belonging';

          return (
            <motion.div
              key="already-paired-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
              className="space-y-6"
            >
              {/* Compact Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <button
                  type="button"
                  onClick={() => setView('scanner')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to scanner</span>
                </button>
                <span className="font-satoshi font-medium text-xs text-ink">
                  #{tagLookup.tagNumber || detectedCode}
                </span>
              </div>

              {/* Title & Context */}
              <div className="space-y-1.5">
                <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink tracking-tight leading-snug">
                  This sticker is in use
                </h2>
                <p className="text-sm text-muted font-sans leading-relaxed">
                  Tag <span className="font-satoshi font-medium text-ink">#{tagLookup.tagNumber || detectedCode}</span> is currently connected to <strong className="text-ink font-medium">{hostName}</strong>. Choose what you want to do with it.
                </p>
              </div>

              {/* Current Host Snapshot */}
              <div className="p-3.5 rounded-xs bg-[#e4e2d8]/60 dark:bg-white/5 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xs bg-ink text-surface flex items-center justify-center shrink-0">
                    <PairedIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-display font-medium text-base sm:text-lg text-ink block truncate leading-tight">
                      {hostName}
                    </span>
                    <span className="text-xs text-muted font-mono block mt-0.5 truncate">
                      {pairedType.label}
                      {tagLookup.pairedResource?.registrationNum ? ` • Plate ${tagLookup.pairedResource.registrationNum}` : ''}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase font-semibold text-muted px-2 py-0.5 rounded-xs bg-bg border border-border">
                  Active
                </span>
              </div>

              {/* Horizontal line separated actionable steps */}
              <div className="divide-y divide-border border-y border-border">
                {/* 01: Attach to something new */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMovingSticker(true);
                    setDestinationMode('create-new');
                    setDestinationChoice('configure');
                    setView('destination');
                  }}
                  className="w-full py-5 sm:py-6 flex items-center justify-between text-left group hover:opacity-80 transition-opacity cursor-pointer font-sans"
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <span className="font-mono text-sm sm:text-base font-semibold text-muted mt-1">01</span>
                    <div className="space-y-1">
                      <span className="block font-sans font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight leading-snug">
                        Attach to something new
                      </span>
                      <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                        Disconnect from {hostName} and set up a new vehicle or item.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-ink stroke-[2.5] group-hover:translate-x-1.5 transition-transform shrink-0 ml-4" />
                </button>

                {/* 02: Move to an existing belonging */}
                {ownedResources.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMovingSticker(true);
                      setDestinationMode('choose-existing');
                      setDestinationChoice('configure');
                      setView('destination');
                    }}
                    className="w-full py-5 sm:py-6 flex items-center justify-between text-left group hover:opacity-80 transition-opacity cursor-pointer font-sans"
                  >
                    <div className="flex items-start gap-4 sm:gap-5">
                      <span className="font-mono text-sm sm:text-base font-semibold text-muted mt-1">02</span>
                      <div className="space-y-1">
                        <span className="block font-sans font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight leading-snug">
                          Move to an existing belonging
                        </span>
                        <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                          Reassign to another belonging you already manage ({ownedResources.length} available).
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-ink stroke-[2.5] group-hover:translate-x-1.5 transition-transform shrink-0 ml-4" />
                  </button>
                )}

                {/* 03 (or 02): Keep as is and scan another */}
                <button
                  type="button"
                  onClick={() => setView('scanner')}
                  className="w-full py-5 sm:py-6 flex items-center justify-between text-left group hover:opacity-80 transition-opacity cursor-pointer font-sans"
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <span className="font-mono text-sm sm:text-base font-semibold text-muted mt-1">
                      {ownedResources.length > 0 ? '03' : '02'}
                    </span>
                    <div className="space-y-1">
                      <span className="block font-sans font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight leading-snug">
                        Keep as is and scan another
                      </span>
                      <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                        Leave this tag connected to {hostName} and return to scanner.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-ink stroke-[2.5] group-hover:translate-x-1.5 transition-transform shrink-0 ml-4" />
                </button>
              </div>

              {/* High-Trust Reassurance Note */}
              <div className="pt-2 text-xs text-muted leading-relaxed">
                Moving transfers contact routing immediately. No message logs or communication settings will be lost.
              </div>
            </motion.div>
          );
        })()}

        {/* =================================================================== */}
        {/* VIEW 4: UNAUTHORIZED TAG (MANAGED BY ANOTHER ACCOUNT)               */}
        {/* =================================================================== */}
        {view === 'unauthorized' && (
          <motion.div
            key="unauthorized-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="p-6 bg-surface border border-border rounded-xl space-y-5 shadow-sm"
          >
            <div className="flex items-center gap-2 text-danger text-xs font-semibold uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              <span>Restricted Sticker</span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display font-medium text-2xl text-ink uppercase tracking-tight">
                Sticker Managed by Another Account
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Tag <span className="font-satoshi font-medium text-ink">#{detectedCode}</span> is already linked to an account you do not manage. For privacy and security, its contact details are confidential and it cannot be transferred.
              </p>
            </div>

            <div className="pt-2 border-t border-border flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('scanner')}
                className="w-full h-10 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Scan a different sticker
              </button>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* VIEW 5: REVOKED OR INVALID TAG                                      */}
        {/* =================================================================== */}
        {view === 'invalid' && (
          <motion.div
            key="invalid-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="p-6 bg-surface border border-border rounded-xl space-y-5 shadow-sm"
          >
            <div className="flex items-center gap-2 text-danger text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4" />
              <span>Sticker Not Available</span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display font-medium text-2xl text-ink uppercase tracking-tight">
                Unable to Connect Tag
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                {invalidMessage || 'This tag code could not be verified.'}
              </p>
            </div>

            <div className="pt-2 border-t border-border flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('scanner')}
                className="w-full h-10 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Try Another Code or Rescan
              </button>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* VIEW 6: CHOOSE DESTINATION & CONFIRM CONNECTION                     */}
        {/* =================================================================== */}
        {view === 'destination' && (
          <AnimatePresence mode="wait">
            {destinationChoice === 'initial-ask' && ownedResources.length > 0 && !isMovingSticker ? (
              /* STEP 2A: INITIAL CHOICE (Attach to something new OR Replace existing tag) */
              <motion.div
                key="destination-initial-choice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setView('scanner')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to scanner</span>
                  </button>
                  {detectedCode && (
                    <span className="font-satoshi font-medium text-xs text-ink">
                      #{detectedCode}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="font-display font-medium text-xl sm:text-2xl text-ink tracking-tight">
                    What are you tagging?
                  </h2>
                </div>

                {/* Horizontal line separated format for the actionable steps */}
                <div className="divide-y divide-border border-y border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationMode('create-new');
                      setDestinationChoice('configure');
                    }}
                    className="w-full py-5 sm:py-6 flex items-center justify-between text-left group hover:opacity-80 transition-opacity cursor-pointer font-sans"
                  >
                    <div className="flex items-start gap-4 sm:gap-5">
                      <span className="font-mono text-sm sm:text-base font-semibold text-muted mt-1">01</span>
                      <div className="space-y-1">
                        <span className="block font-sans font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight leading-snug">
                          Attach to something new
                        </span>
                        <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                          Set up a new vehicle, place, equipment, or everyday item.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-ink stroke-[2.5] group-hover:translate-x-1.5 transition-transform shrink-0 ml-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDestinationMode('choose-existing');
                      setDestinationChoice('configure');
                    }}
                    className="w-full py-5 sm:py-6 flex items-center justify-between text-left group hover:opacity-80 transition-opacity cursor-pointer font-sans"
                  >
                    <div className="flex items-start gap-4 sm:gap-5">
                      <span className="font-mono text-sm sm:text-base font-semibold text-muted mt-1">02</span>
                      <div className="space-y-1">
                        <span className="block font-sans font-medium text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight leading-snug">
                          Replace existing tag
                        </span>
                        <p className="text-xs sm:text-sm text-muted font-sans leading-relaxed">
                          You have {ownedResources.length} existing tag{ownedResources.length === 1 ? '' : 's'} available to replace.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-ink stroke-[2.5] group-hover:translate-x-1.5 transition-transform shrink-0 ml-4" />
                  </button>
                </div>

                {/* High-Trust Reassurance Note */}
                <div className="pt-2 text-xs text-muted leading-relaxed">
                  Stickers can be reassigned, renamed, or moved between belongings at any time from your dashboard.
                </div>
              </motion.div>
            ) : (
              /* STEP 2B: CONFIGURE (Natural language or Choose Existing) */
              <motion.div
                key="destination-configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onAnimationComplete={() => {
                  if (!hasAutofocusedRef.current && !isCategoryMenuOpen) {
                    nameInputRef.current?.focus({ preventScroll: true });
                    hasAutofocusedRef.current = true;
                  }
                }}
                className="space-y-5"
              >
                {/* Compact Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <button
                    type="button"
                    onClick={() => {
                      if (ownedResources.length > 0 && !isMovingSticker) {
                        setDestinationChoice('initial-ask');
                      } else {
                        setView(isMovingSticker ? 'already-paired' : 'scanner');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>
                      {ownedResources.length > 0 && !isMovingSticker
                        ? 'Back to options'
                        : isMovingSticker
                        ? 'Back to tag info'
                        : 'Back to scanner'}
                    </span>
                  </button>
                  {detectedCode && (
                    <span className="font-satoshi font-medium text-xs text-ink">
                      #{detectedCode}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h2 className="font-sans font-medium text-3xl sm:text-4xl text-ink tracking-tight leading-snug">
                    {destinationMode === 'create-new' ? 'Name your belonging' : 'Replace existing tag'}
                  </h2>
                  <p className="text-sm text-muted font-sans leading-relaxed">
                    {destinationMode === 'create-new' ? (
                      <>
                        Tell callers what tag{' '}
                        <span className="font-satoshi font-medium text-ink">#{detectedCode}</span> is attached to.
                      </>
                    ) : (
                      `You have ${ownedResources.length} existing tag${ownedResources.length === 1 ? '' : 's'} available to replace.`
                    )}
                  </p>
                </div>

                <form onSubmit={handleConfirmConnection} className="space-y-4">
                  {destinationMode === 'create-new' ? (
                    <div className={`py-2 space-y-4 relative ${isCategoryMenuOpen ? 'z-40' : 'z-10'}`}>
                      {/* Conversational Statement Sentence */}
                      <div className="font-display font-medium text-3xl sm:text-4xl text-ink leading-relaxed tracking-tight">
                        <span>This tag is for my </span>

                        {/* Inline Category Dropdown Trigger */}
                        <span
                          ref={categoryMenuRef}
                          className={`relative inline-block align-baseline ${isCategoryMenuOpen ? 'z-[90]' : 'z-20'}`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCategoryMenuOpen(!isCategoryMenuOpen);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-[#e4e2d8] dark:bg-white/10 hover:opacity-90 text-ink transition-colors cursor-pointer group align-baseline"
                          >
                            {(() => {
                              const CurrentIcon = activeResourceType.icon;
                              return <CurrentIcon className="h-6 w-6 text-ink inline shrink-0 group-hover:scale-105 transition-transform" />;
                            })()}
                            <span className="font-display font-medium text-ink">
                              {activeResourceType.label}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-muted transition-transform duration-200 ${
                                isCategoryMenuOpen ? 'rotate-180 text-ink' : ''
                              }`}
                            />
                          </button>

                          {/* Category Floating Popover Menu */}
                          <AnimatePresence>
                            {isCategoryMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                style={{ backgroundColor: '#f5f4ee', opacity: 1 }}
                                className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-[#f5f4ee] dark:bg-[#151513] border border-border rounded-xs shadow-2xl z-[100] py-1.5 overflow-hidden font-sans text-left normal-case tracking-normal not-italic font-normal text-ink select-none"
                              >
                                <div className="px-3 py-1.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted">
                                  Select belonging type
                                </div>
                                <div className="p-1 space-y-0.5">
                                  {RESOURCE_TYPES.map((cat) => {
                                    const Icon = cat.icon;
                                    const isSelected = belongingType === cat.type;
                                    return (
                                      <button
                                        key={cat.type}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBelongingType(cat.type);
                                          setIsCategoryMenuOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 rounded-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                                          isSelected
                                            ? 'bg-ink text-surface font-semibold'
                                            : 'text-ink hover:bg-bg/80'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Icon className="h-4 w-4 shrink-0" />
                                          <div>
                                            <span className="text-xs uppercase font-medium block leading-tight">
                                              {cat.label}
                                            </span>
                                            <span
                                              className={`text-[10px] block mt-0.5 leading-tight ${
                                                isSelected ? 'text-surface/75' : 'text-muted'
                                              }`}
                                            >
                                              {cat.subtitle}
                                            </span>
                                          </div>
                                        </div>
                                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </span>

                        <span> named </span>

                        {/* Belonging Name Input - seamless inline, high-opacity placeholder, no full stop */}
                        <span
                          onClick={() => nameInputRef.current?.focus()}
                          className="inline-block min-w-[200px] max-w-full align-baseline cursor-text"
                        >
                          <input
                            ref={nameInputRef}
                            type="text"
                            autoFocus
                            required
                            placeholder={activeResourceType.placeholder}
                            value={belongingName}
                            onChange={(e) => setBelongingName(e.target.value)}
                            onBlur={() => {
                              if (belongingName.trim()) setHasStoppedTypingName(true);
                            }}
                            style={{
                              fontSize: 'inherit',
                              fontFamily: 'inherit',
                              fontWeight: 'inherit',
                            }}
                            className="statement-input w-full bg-transparent border-none outline-none text-ink tracking-tight py-0.5 px-1 placeholder:text-muted/75 placeholder:font-sans transition-colors cursor-text"
                          />
                        </span>
                      </div>

                      {/* Dedicated Prompt: License Plate & Vehicle Color for False-Flag Verification (NOT sentence-based, only shown after stopped typing) */}
                      <AnimatePresence initial={false}>
                        {isVehiclePromptVisible && (
                          <motion.div
                            key="setup-vehicle-details"
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{
                              opacity: 1,
                              height: 'auto',
                              marginTop: 14,
                              transition: {
                                height: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.35, delay: 0.08 },
                                marginTop: { duration: 0.35 },
                              },
                            }}
                            exit={{
                              opacity: 0,
                              height: 0,
                              marginTop: 0,
                              transition: {
                                height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.2 },
                              },
                            }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 border-t border-border/80 space-y-3.5">
                              {/* Verification Prompt Header */}
                              <div className="p-3 rounded-xs bg-bg border border-border flex items-start gap-3">
                                <div className="h-7 w-7 rounded-xs bg-ink/5 border border-ink/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <ShieldAlert className="h-4 w-4 text-ink" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-ink uppercase tracking-wide">
                                      Verify False Flags
                                    </span>
                                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-ink/5 border border-ink/15 text-muted rounded-xs font-medium">
                                      Recommended
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted leading-relaxed">
                                    Add your vehicle’s plate and colour so callers can verify they are pinging the correct vehicle before disturbing you.
                                  </p>
                                </div>
                              </div>

                              {/* TWO DISTINCT TEXT BOX STYLES */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0.5">
                                {/* STYLE 1: 4-DIGIT SEGMENTED INPUT BOX */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label
                                      htmlFor="vehicle-plate-input"
                                      className="block font-mono text-[10px] uppercase tracking-wider text-muted font-medium"
                                    >
                                      License Plate (Last 4 Digits)
                                    </label>
                                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted/60">
                                      4 Digits
                                    </span>
                                  </div>

                                  <div className="relative inline-flex items-center gap-2">
                                    <input
                                      id="vehicle-plate-input"
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      maxLength={4}
                                      value={vehiclePlate}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                        setVehiclePlate(val);
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                      aria-label="Last 4 digits of license plate"
                                    />
                                    {[0, 1, 2, 3].map((index) => {
                                      const digit = vehiclePlate[index] || '';
                                      const isCurrent = vehiclePlate.length === index;
                                      return (
                                        <div
                                          key={index}
                                          className={`w-11 h-12 sm:w-12 sm:h-12 rounded-xs border-2 flex items-center justify-center font-mono font-bold text-xl transition-all ${
                                            digit
                                              ? 'border-ink bg-surface text-ink shadow-xs'
                                              : isCurrent
                                              ? 'border-ink bg-surface text-ink ring-2 ring-ink/10'
                                              : 'border-border bg-surface/60 text-muted/25'
                                          }`}
                                        >
                                          {digit || (isCurrent ? <span className="animate-pulse text-muted">|</span> : '·')}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* STYLE 2: VEHICLE COLOUR — SLEEK TEXT BOX (NO PILLS) */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label
                                      htmlFor="vehicle-color-input"
                                      className="block font-mono text-[10px] uppercase tracking-wider text-muted font-medium"
                                    >
                                      Vehicle Colour
                                    </label>
                                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted/60">
                                      Finish
                                    </span>
                                  </div>
                                  <div className="relative flex items-center bg-surface border border-border focus-within:border-ink rounded-xs px-3.5 transition-all shadow-xs">
                                    <Palette className="h-4 w-4 text-muted shrink-0 mr-2.5" />
                                    <input
                                      id="vehicle-color-input"
                                      type="text"
                                      placeholder="e.g. Pearl White, Matte Black"
                                      value={vehicleColor}
                                      onChange={(e) => setVehicleColor(e.target.value)}
                                      className="w-full h-12 bg-transparent border-none outline-none font-sans text-sm font-medium text-ink placeholder:text-muted/45 placeholder:font-normal"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    /* Choose Existing Belonging List */
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 animate-fade-in">
                      {ownedResources.map((res) => {
                        const resId = res.id || (res as any)._id;
                        const isSelected = selectedResourceId === resId;
                        const isCurrentHost = tagLookup?.pairedResource?.id === resId;

                        return (
                          <div
                            key={resId}
                            onClick={() => {
                              if (!isCurrentHost) setSelectedResourceId(resId);
                            }}
                            className={`p-3 rounded-xs border transition-colors flex items-center justify-between ${
                              isCurrentHost
                                ? 'border-border/60 bg-surface/30 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'border-ink bg-surface shadow-xs cursor-pointer'
                                : 'border-border bg-surface/40 hover:bg-surface cursor-pointer'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-ink block truncate">
                                {res.name}
                              </span>
                              <span className="text-[11px] text-muted block truncate">
                                {res.type || 'RESOURCE'}
                                {res.vehicleDetails?.registrationNum ? ` • Plate: ${res.vehicleDetails.registrationNum}` : ''}
                                {isCurrentHost ? ' (Current belonging)' : ''}
                              </span>
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
                  )}

                  {/* Explicit Confirmation Consequence Callout before Committing */}
                  {isMovingSticker && (
                    <div className="p-3 bg-surface border border-ink/30 rounded-xs text-xs space-y-1 animate-fade-in">
                      <div className="flex items-center gap-1.5 font-semibold text-ink uppercase tracking-wider text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Transfer Confirmation</span>
                      </div>
                      <p className="text-muted leading-relaxed text-[11px]">
                        Tag <strong className="font-satoshi font-medium text-ink">#{detectedCode}</strong> will be unlinked from{' '}
                        <strong className="text-ink">{tagLookup?.pairedResource?.name}</strong> and connected to this new belonging.
                      </p>
                    </div>
                  )}

                  {submitError && (
                    <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-xs text-xs text-danger flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Confirmation CTA */}
                  <div className="pt-3 border-t border-border flex items-center justify-end gap-3 relative z-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (ownedResources.length > 0 && !isMovingSticker) {
                          setDestinationChoice('initial-ask');
                        } else {
                          setView('scanner');
                        }
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      {ownedResources.length > 0 && !isMovingSticker ? 'Back' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        (destinationMode === 'create-new' && (
                          !belongingName.trim() ||
                          (belongingType === 'VEHICLE' && !isVehiclePromptVisible)
                        )) ||
                        (destinationMode === 'choose-existing' && !selectedResourceId)
                      }
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>{isMovingSticker ? 'Moving Sticker...' : 'Connecting...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{isMovingSticker ? 'Confirm & Move Sticker' : 'Confirm & Connect'}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* =================================================================== */}
        {/* VIEW 7: DIGITAL TAG CREATION                                        */}
        {/* =================================================================== */}
        {view === 'digital' && (
          <motion.div
            key="digital-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={() => {
              if (!hasDigitalAutofocusedRef.current && !isDigitalCategoryMenuOpen) {
                digitalNameInputRef.current?.focus({ preventScroll: true });
                hasDigitalAutofocusedRef.current = true;
              }
            }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <button
                type="button"
                onClick={() => setView('approach')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to options</span>
              </button>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                DIGITAL TAG
              </span>
            </div>

            <div>
              <h2 className="font-display font-medium text-2xl text-ink uppercase tracking-tight">
                Create a digital tag
              </h2>
              <p className="text-xs text-muted mt-1">
                Generate a permanent QR code tag you can display, print, or share.
              </p>
            </div>

            <form onSubmit={handleGenerateDigitalTag} className="space-y-4">
              <div className={`py-2 space-y-4 relative ${isDigitalCategoryMenuOpen ? 'z-40' : 'z-10'}`}>
                {/* Conversational Statement Sentence */}
                <div className="font-display font-medium text-3xl sm:text-4xl text-ink leading-relaxed tracking-tight">
                  <span>This tag is for my </span>

                  {/* Inline Category Dropdown Trigger */}
                  <span
                    ref={digitalCategoryMenuRef}
                    className={`relative inline-block align-baseline ${isDigitalCategoryMenuOpen ? 'z-[90]' : 'z-20'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDigitalCategoryMenuOpen(!isDigitalCategoryMenuOpen);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-[#e4e2d8] dark:bg-white/10 hover:opacity-90 text-ink transition-colors cursor-pointer group align-baseline"
                    >
                      {(() => {
                        const CurrentIcon = activeResourceType.icon;
                        return <CurrentIcon className="h-6 w-6 text-ink inline shrink-0 group-hover:scale-105 transition-transform" />;
                      })()}
                      <span className="font-display font-medium text-ink">
                        {activeResourceType.label}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted transition-transform duration-200 ${
                          isDigitalCategoryMenuOpen ? 'rotate-180 text-ink' : ''
                        }`}
                      />
                    </button>

                    {/* Category Floating Popover Menu */}
                    <AnimatePresence>
                      {isDigitalCategoryMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          style={{ backgroundColor: '#f5f4ee', opacity: 1 }}
                          className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-3rem)] bg-[#f5f4ee] dark:bg-[#151513] border border-border rounded-xs shadow-2xl z-[100] py-1.5 overflow-hidden font-sans text-left normal-case tracking-normal not-italic font-normal text-ink select-none"
                        >
                          <div className="px-3 py-1.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted">
                            Select belonging type
                          </div>
                          <div className="p-1 space-y-0.5">
                            {RESOURCE_TYPES.map((cat) => {
                              const Icon = cat.icon;
                              const isSelected = belongingType === cat.type;
                              return (
                                <button
                                  key={cat.type}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBelongingType(cat.type);
                                    setIsDigitalCategoryMenuOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 rounded-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-ink text-surface font-semibold'
                                      : 'text-ink hover:bg-bg/80'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <div>
                                      <span className="text-xs uppercase font-medium block leading-tight">
                                        {cat.label}
                                      </span>
                                      <span
                                        className={`text-[10px] block mt-0.5 leading-tight ${
                                          isSelected ? 'text-surface/75' : 'text-muted'
                                        }`}
                                      >
                                        {cat.subtitle}
                                      </span>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </span>

                  <span> named </span>

                  {/* Belonging Name Input - seamless inline, high-opacity placeholder, no full stop */}
                  <span
                    onClick={() => digitalNameInputRef.current?.focus()}
                    className="inline-block min-w-[200px] max-w-full align-baseline cursor-text"
                  >
                    <input
                      ref={digitalNameInputRef}
                      type="text"
                      autoFocus
                      required
                      placeholder={activeResourceType.placeholder}
                      value={belongingName}
                      onChange={(e) => setBelongingName(e.target.value)}
                      onBlur={() => {
                        if (belongingName.trim()) setHasStoppedTypingName(true);
                      }}
                      style={{
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        fontWeight: 'inherit',
                      }}
                      className="statement-input w-full bg-transparent border-none outline-none text-ink tracking-tight py-0.5 px-1 placeholder:text-muted/75 placeholder:font-sans transition-colors cursor-text"
                    />
                  </span>
                </div>

                {/* Dedicated Prompt: License Plate & Vehicle Color for False-Flag Verification (NOT sentence-based) */}
                <AnimatePresence initial={false}>
                  {isVehiclePromptVisible && (
                    <motion.div
                      key="digital-vehicle-verification-prompt"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{
                        opacity: 1,
                        height: 'auto',
                        marginTop: 14,
                        transition: {
                          height: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: 0.35, delay: 0.08 },
                          marginTop: { duration: 0.35 },
                        },
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                        marginTop: 0,
                        transition: {
                          height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: 0.2 },
                        },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 border-t border-border/80 space-y-3.5">
                        {/* Verification Prompt Header */}
                        <div className="p-3 rounded-xs bg-bg border border-border flex items-start gap-3">
                          <div className="h-7 w-7 rounded-xs bg-ink/5 border border-ink/10 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldAlert className="h-4 w-4 text-ink" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-ink uppercase tracking-wide">
                                Verify False Flags
                              </span>
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-ink/5 border border-ink/15 text-muted rounded-xs font-medium">
                                Recommended
                              </span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                              Add your vehicle’s plate and colour so callers can verify they are pinging the correct vehicle before disturbing you.
                            </p>
                          </div>
                        </div>

                        {/* TWO DISTINCT TEXT BOX STYLES */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0.5">
                          {/* STYLE 1: 4-DIGIT SEGMENTED INPUT BOX */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label
                                htmlFor="digital-vehicle-plate-input"
                                className="block font-mono text-[10px] uppercase tracking-wider text-muted font-medium"
                              >
                                License Plate (Last 4 Digits)
                              </label>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-muted/60">
                                4 Digits
                              </span>
                            </div>

                            <div className="relative inline-flex items-center gap-2">
                              <input
                                id="digital-vehicle-plate-input"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={vehiclePlate}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                                  setVehiclePlate(val);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                aria-label="Last 4 digits of license plate"
                              />
                              {[0, 1, 2, 3].map((index) => {
                                const digit = vehiclePlate[index] || '';
                                const isCurrent = vehiclePlate.length === index;
                                return (
                                  <div
                                    key={index}
                                    className={`w-11 h-12 sm:w-12 sm:h-12 rounded-xs border-2 flex items-center justify-center font-mono font-bold text-xl transition-all ${
                                      digit
                                        ? 'border-ink bg-surface text-ink shadow-xs'
                                        : isCurrent
                                        ? 'border-ink bg-surface text-ink ring-2 ring-ink/10'
                                        : 'border-border bg-surface/60 text-muted/25'
                                    }`}
                                  >
                                    {digit || (isCurrent ? <span className="animate-pulse text-muted">|</span> : '·')}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* STYLE 2: VEHICLE COLOUR — SLEEK TEXT BOX (NO PILLS) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label
                                htmlFor="digital-vehicle-color-input"
                                className="block font-mono text-[10px] uppercase tracking-wider text-muted font-medium"
                              >
                                Vehicle Colour
                              </label>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-muted/60">
                                Finish
                              </span>
                            </div>
                            <div className="relative flex items-center bg-surface border border-border focus-within:border-ink rounded-xs px-3.5 transition-all shadow-xs">
                              <Palette className="h-4 w-4 text-muted shrink-0 mr-2.5" />
                              <input
                                id="digital-vehicle-color-input"
                                type="text"
                                placeholder="e.g. Pearl White, Matte Black"
                                value={vehicleColor}
                                onChange={(e) => setVehicleColor(e.target.value)}
                                className="w-full h-12 bg-transparent border-none outline-none font-sans text-sm font-medium text-ink placeholder:text-muted/45 placeholder:font-normal"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {submitError && (
                <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-xs text-xs text-danger flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3 relative z-0">
                <button
                  type="button"
                  onClick={() => setView('approach')}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!belongingName.trim() || (belongingType === 'VEHICLE' && !isVehiclePromptVisible) || isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Tag...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Digital Tag</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* VIEW 8: COMPLETION — SHOW REAL TAG OBJECT (NO GENERIC SUCCESS)      */}
        {/* =================================================================== */}
        {view === 'completed' && completedResource && (
          <motion.div
            key="completed-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-6 text-center"
          >
            <div>
              <span className="font-mono text-[11px] font-semibold text-success uppercase tracking-widest block mb-1">
                {completionStage === 'check' ? '• PAIRED' : '• CONNECTED'}
              </span>
              <h2 className="font-display font-medium text-3xl text-ink uppercase tracking-tight">
                {completedResource.name}
              </h2>
              <p className="text-xs text-muted mt-1">
                {completedTagNumber ? (
                  <>
                    Tag <span className="font-satoshi font-medium text-ink">#{completedTagNumber}</span>
                  </>
                ) : (
                  'Digital Tag'
                )} &bull;{' '}
                {completionStage === 'check' ? 'Paired successfully' : 'Connected'}
              </p>
            </div>

            {/* Interactive Object: Large Tick Mark first, then smoothly morphs to QR code */}
            <div className="relative inline-flex items-center justify-center mx-auto w-48 h-48 bg-white border border-border rounded-sm shadow-xs overflow-hidden">
              <AnimatePresence mode="wait">
                {completionStage === 'check' ? (
                  <motion.div
                    key="tick-mark-view"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.12, 1], opacity: 1 }}
                    exit={{ scale: 0.82, opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#D7FF3F] text-ink flex items-center justify-center shadow-xs border border-ink/10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-10 h-10 text-ink"
                      >
                        <motion.path
                          d="M20 6L9 17L4 12"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.42, delay: 0.08, ease: 'easeOut' }}
                        />
                      </svg>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-ink uppercase tracking-widest mt-2.5">
                      Paired
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="qr-code-view"
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}
                    className="relative flex items-center justify-center w-full h-full p-4"
                  >
                    <PingInQrCode
                      value={completedTagNumber}
                      size={160}
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

            {/* Public Scan URL */}
            <div className="text-xs font-mono text-muted select-all">
              {buildTagQrUrl(completedTagNumber)}
            </div>

            {/* Actions: Preview Public Contact Page & Return to My Tags */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={buildTagQrUrl(completedTagNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink text-surface text-xs font-semibold uppercase tracking-wider rounded-xs hover:opacity-90 transition-opacity"
              >
                <span>Preview public contact page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => onComplete(completedResource)}
                className="w-full sm:w-auto px-4 py-2.5 border border-border text-xs font-semibold uppercase tracking-wider text-ink hover:border-ink transition-colors cursor-pointer rounded-xs"
              >
                Go to my tags
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TagSetupFlow;
