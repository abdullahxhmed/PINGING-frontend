import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Resource, CallRecord } from '../../types/api';
import { extractResourceTag, getResourceContactUrl, resourcesApi } from '../../lib/api';
import { buildTagQrUrl } from '../../lib/qr';
import { ShareTagSheet } from './ShareTagSheet';
import {
  Car,
  Building2,
  Tag as TagIcon,
  QrCode,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
} from 'lucide-react';

export interface MobileTagDetailViewProps {
  resources: Resource[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onEdit?: (resource: Resource) => void;
  onDelete?: (id: string) => void;
  onAddTag: () => void;
}

const getColorHex = (name: string): string => {
  const lower = name.toLowerCase().trim();
  const map: Record<string, string> = {
    white: '#FFFFFF',
    black: '#11110F',
    silver: '#D1D5DB',
    grey: '#9CA3AF',
    gray: '#9CA3AF',
    red: '#EF4444',
    blue: '#3B82F6',
    navy: '#1E3A8A',
    green: '#22C55E',
    yellow: '#FACC15',
    gold: '#F59E0B',
    orange: '#FB923C',
    brown: '#92400E',
    bronze: '#78350F',
  };
  return map[lower] || '#E5E7EB';
};

const formatCallTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
};

const formatCallerNumber = (call: CallRecord): string => {
  if (call.callerLastTwo) {
    return `+91XXXXXXXX${call.callerLastTwo}`;
  }
  if (call.caller) {
    const digits = call.caller.replace(/\D/g, '');
    if (digits.length >= 2) {
      return `+91XXXXXXXX${digits.slice(-2)}`;
    }
  }
  return '+91XXXXXXXX43';
};

/**
 * Individual Belonging Plate Card
 */
interface BelongingPlateCardProps {
  resource: Resource;
  onOpenShare: () => void;
}

const BelongingPlateCard: React.FC<BelongingPlateCardProps> = ({
  resource,
  onOpenShare,
}) => {
  const tagId = resource?.id || (resource as any)?._id;
  const tagNumber = extractResourceTag(resource);
  const publicUrl = tagNumber ? buildTagQrUrl(tagNumber) : getResourceContactUrl(resource);

  // Fetch or resolve call records for this specific belonging
  const [calls, setCalls] = useState<CallRecord[]>(() => {
    if (Array.isArray(resource.recentCalls)) return resource.recentCalls;
    return [];
  });

  useEffect(() => {
    if (!tagId) return;
    if (Array.isArray(resource.recentCalls) && resource.recentCalls.length > 0) {
      setCalls(resource.recentCalls);
      return;
    }

    let isMounted = true;
    resourcesApi
      .getCalls(tagId, { limit: 3 })
      .then((res) => {
        if (isMounted && res.calls) {
          setCalls(res.calls);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [tagId, resource.recentCalls]);

  // Extract clean vehicle/belonging metadata
  const rawDetails = resource.vehicleDetails;
  const parsedDetails: any =
    typeof rawDetails === 'string'
      ? (() => {
          try {
            return JSON.parse(rawDetails);
          } catch {
            return {};
          }
        })()
      : rawDetails || {};

  const rawPlate =
    parsedDetails?.registrationNum ||
    parsedDetails?.registrationNumber ||
    parsedDetails?.regNum ||
    parsedDetails?.registrationLast4 ||
    (resource as any)?.registrationNum ||
    '';

  const cleanDigits = String(rawPlate).replace(/\D/g, '');
  const last4Plate = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : (rawPlate ? String(rawPlate).slice(-4) : '');

  const rawColor =
    parsedDetails?.vehicleColour ||
    parsedDetails?.vehicleColor ||
    parsedDetails?.colour ||
    parsedDetails?.color ||
    (resource as any)?.vehicleColour ||
    '';
  const colorDisplay = rawColor ? rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase() : '';
  const colorHex = colorDisplay ? getColorHex(colorDisplay) : '';

  const getBelongingIcon = () => {
    switch (resource.type?.toUpperCase()) {
      case 'PROPERTY':
        return Building2;
      case 'EQUIPMENT':
      case 'OTHER':
        return TagIcon;
      case 'VEHICLE':
      default:
        return Car;
    }
  };
  const BelongingIcon = getBelongingIcon();

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] space-y-4 relative overflow-hidden select-none">
      {/* Top Section: Category & Tag */}
      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <BelongingIcon className="h-3.5 w-3.5 text-ink/80" />
          <span>{resource.type === 'PROPERTY' ? 'PROPERTY SPEC' : (resource.type || 'VEHICLE SPEC')}</span>
        </div>
        <span className="font-sans text-xs text-muted font-medium">
          {tagNumber ? `#${tagNumber}` : 'No tag'}
        </span>
      </div>

      {/* Belonging Name with > arrow */}
      <Link
        to={`/resources/${tagId}`}
        className="group flex items-center justify-between gap-3 pt-0.5 hover:opacity-85 transition-opacity cursor-pointer"
      >
        <h2 className="font-display font-medium text-3xl sm:text-4xl text-ink uppercase tracking-tight leading-none truncate">
          {resource.name}
        </h2>
        <ChevronRight className="h-6 w-6 text-muted group-hover:text-ink group-hover:translate-x-1 transition-all shrink-0" />
      </Link>

      {/* Plate & Color */}
      {(last4Plate || colorDisplay) && (
        <div className="flex items-center justify-between gap-3 pt-0.5">
          {last4Plate ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-bg border border-border-strong font-mono text-xs font-semibold text-ink shadow-2xs">
              <span className="text-[9px] font-sans font-bold text-muted border-r border-border pr-1.5 tracking-wider">
                IND
              </span>
              <span>•••• {last4Plate}</span>
            </div>
          ) : <div />}

          {colorDisplay && (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted font-sans font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full border border-border-strong shrink-0"
                style={{ backgroundColor: colorHex }}
              />
              <span>{colorDisplay}</span>
            </div>
          )}
        </div>
      )}

      {/* Call Activity Section */}
      <div className="p-3.5 rounded-lg bg-bg/60 border border-border space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-sans font-semibold uppercase tracking-wider text-muted text-[10px]">
            Call Activity
          </span>
          <span className="text-[10px] text-muted/80 font-sans">
            {calls.length > 0 ? `${calls.length} latest` : 'History'}
          </span>
        </div>

        {calls.length > 0 ? (
          <div className="divide-y divide-border/60">
            {calls.slice(0, 3).map((call: CallRecord, idx: number) => {
              const isMissed = call.status === 'MISSED' || call.status === 'FAILED';
              return (
                <div key={call.id || idx} className="py-2.5 flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${isMissed ? 'bg-danger/10 text-danger' : 'bg-surface border border-border text-ink'}`}>
                      {isMissed ? (
                        <PhoneMissed className="h-3 w-3" />
                      ) : (
                        <PhoneIncoming className="h-3 w-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-ink block truncate">
                        {formatCallerNumber(call)}
                      </span>
                      <span className="text-[10px] text-muted block font-sans">
                        {formatCallTime(call.createdAt || call.incomingAt)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isMissed ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-danger/10 text-danger font-medium uppercase">
                        Missed
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-surface border border-border text-muted font-medium">
                        {call.duration || (call.durationSec ? `${call.durationSec}s` : 'Connected')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 flex items-center gap-2 text-xs font-sans text-muted">
            <PhoneCall className="h-3.5 w-3.5 text-muted/60 shrink-0" />
            <span>No calls received yet</span>
          </div>
        )}
      </div>

      {/* Primary Action Buttons: Share Tag & Preview Page */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={onOpenShare}
          className="h-11 bg-ink text-surface font-sans text-xs font-medium rounded-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <QrCode className="h-4 w-4" />
          <span>Share Tag</span>
        </button>

        <a
          href={publicUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 border border-border text-ink bg-surface font-sans text-xs font-medium rounded-xs hover:border-ink active:bg-surface/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Preview Page</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted" />
        </a>
      </div>
    </div>
  );
};

export const MobileTagDetailView: React.FC<MobileTagDetailViewProps> = ({
  resources,
  selectedIndex,
  onSelectIndex,
}) => {
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(0, selectedIndex), Math.max(0, resources.length - 1))
  );
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [selectedShareResource, setSelectedShareResource] = useState<Resource | null>(null);

  // Sync activeIndex with external selectedIndex if changed from parent
  useEffect(() => {
    if (
      selectedIndex !== activeIndex &&
      selectedIndex >= 0 &&
      selectedIndex < resources.length
    ) {
      setActiveIndex(selectedIndex);
    }
  }, [selectedIndex, activeIndex, resources.length]);

  const handleDotClick = useCallback((idx: number) => {
    setActiveIndex(idx);
    onSelectIndex(idx);
  }, [onSelectIndex]);

  // Handle swipe/drag gesture with resistive physics and threshold
  const handleDragEnd = (
    _event: any,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    const swipeThreshold = 45;
    const velocityThreshold = 280;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      // Swiped left -> advance to next card
      if (activeIndex < resources.length - 1) {
        const next = activeIndex + 1;
        setActiveIndex(next);
        onSelectIndex(next);
      }
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      // Swiped right -> go to previous card
      if (activeIndex > 0) {
        const prev = activeIndex - 1;
        setActiveIndex(prev);
        onSelectIndex(prev);
      }
    }
  };

  if (!resources || resources.length === 0) return null;

  return (
    <div className="relative pt-2 font-sans space-y-3">
      {/* Scroll Rail at the Top: Centered, Borderless with spring morphing */}
      {resources.length > 1 && (
        <div
          className="flex items-center justify-center gap-2 py-1 select-none"
          role="tablist"
          aria-label="Belonging selector"
        >
          {resources.map((res, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={res.id || (res as any)._id || idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`View ${res.name} (Tag ${idx + 1} of ${resources.length})`}
                onClick={() => handleDotClick(idx)}
                className="group py-1 px-0.5 flex items-center justify-center cursor-pointer"
              >
                <motion.span
                  animate={{
                    width: isActive ? 24 : 6,
                    backgroundColor: isActive ? '#11110F' : 'rgba(216, 213, 204, 0.85)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 26,
                  }}
                  className="h-1.5 rounded-full block"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Springy Resistive Card Slider with Small Overshoot */}
      <div className="w-full overflow-hidden relative cursor-grab active:cursor-grabbing">
        <motion.div
          className="flex w-full"
          drag={resources.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.24} // Realistic rubber-band resistance
          onDragEnd={handleDragEnd}
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={{
            type: 'spring',
            stiffness: 300,  // Crisp responsiveness
            damping: 24,     // Underdamped (~0.75 damping ratio) for subtle ~2.8% overshoot
            mass: 0.8,
          }}
          style={{ touchAction: 'pan-y' }}
        >
          {resources.map((resource, idx) => (
            <div
              key={resource.id || (resource as any)._id || idx}
              className="w-full shrink-0 select-none px-0.5"
            >
              <BelongingPlateCard
                resource={resource}
                onOpenShare={() => {
                  setSelectedShareResource(resource);
                  setIsShareSheetOpen(true);
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Share Tag Bottom Sheet */}
      <ShareTagSheet
        isOpen={isShareSheetOpen}
        onClose={() => setIsShareSheetOpen(false)}
        resource={selectedShareResource || resources[activeIndex]}
      />
    </div>
  );
};

export default MobileTagDetailView;
