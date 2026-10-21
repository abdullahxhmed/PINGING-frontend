import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, animate } from 'motion/react';
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
  const [tagNumber, setTagNumber] = useState<string>(() => extractResourceTag(resource));
  const [cardResource, setCardResource] = useState<Resource>(resource);

  // Sync state if resource prop changes
  useEffect(() => {
    setCardResource(resource);
    const resolved = extractResourceTag(resource);
    if (resolved) setTagNumber(resolved);
  }, [resource]);

  // If tagNumber or vehicleDetails is missing from list summary, fetch full resource details
  useEffect(() => {
    if (!tagId) return;
    const hasTag = Boolean(extractResourceTag(cardResource));
    const hasVehicle = Boolean(cardResource.vehicleDetails);

    if (!hasTag || !hasVehicle) {
      let isMounted = true;
      resourcesApi
        .getById(tagId)
        .then((res: any) => {
          if (!isMounted) return;
          const fullData = res?.resource || res?.data || res;
          if (fullData) {
            setCardResource((prev) => ({ ...prev, ...fullData }));
            const resolvedTag = extractResourceTag(fullData);
            if (resolvedTag) setTagNumber(resolvedTag);
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [tagId, cardResource]);

  const publicUrl = tagNumber ? buildTagQrUrl(tagNumber) : getResourceContactUrl(cardResource);

  // Fetch or resolve call records for this specific belonging
  const [calls, setCalls] = useState<CallRecord[]>(() => {
    if (Array.isArray(cardResource.recentCalls) && cardResource.recentCalls.length > 0) return cardResource.recentCalls;
    if (Array.isArray(cardResource.calls) && cardResource.calls.length > 0) return cardResource.calls;
    return [];
  });

  useEffect(() => {
    if (!tagId) return;
    if (Array.isArray(cardResource.recentCalls) && cardResource.recentCalls.length > 0) {
      setCalls(cardResource.recentCalls);
      return;
    }
    if (Array.isArray(cardResource.calls) && cardResource.calls.length > 0) {
      setCalls(cardResource.calls);
      return;
    }

    let isMounted = true;
    resourcesApi
      .getCalls(tagId, { limit: 3 })
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.calls || res?.data?.calls || res?.data || []);
        if (Array.isArray(list)) {
          setCalls(list);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [tagId, cardResource.recentCalls, cardResource.calls]);

  // Extract clean vehicle/belonging metadata
  const rawDetails = cardResource.vehicleDetails;
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
    (cardResource as any)?.registrationNum ||
    '';

  const cleanDigits = String(rawPlate).replace(/\D/g, '');
  const last4Plate = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : (rawPlate ? String(rawPlate).slice(-4) : '');

  const rawColor =
    parsedDetails?.vehicleColour ||
    parsedDetails?.vehicleColor ||
    parsedDetails?.colour ||
    parsedDetails?.color ||
    (cardResource as any)?.vehicleColour ||
    '';
  const colorDisplay = rawColor ? rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase() : '';
  const colorHex = colorDisplay ? getColorHex(colorDisplay) : '';

  const getBelongingIcon = () => {
    switch (cardResource.type?.toUpperCase()) {
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
          <span>{cardResource.type === 'PROPERTY' ? 'PROPERTY SPEC' : (cardResource.type || 'VEHICLE SPEC')}</span>
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
        <h2 className="font-display font-medium text-xl sm:text-2xl text-ink uppercase tracking-tight leading-snug truncate">
          {cardResource.name}
        </h2>
        <ChevronRight className="h-5 w-5 text-muted group-hover:text-ink group-hover:translate-x-1 transition-all shrink-0" />
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

// Fluid rubber-band resistance at boundaries (iOS-grade elastic stretch)
const rubberBand = (distance: number, dimension: number, constant = 0.55): number => {
  const absDist = Math.abs(distance);
  const resisted = (absDist * dimension * constant) / (dimension + constant * absDist);
  return distance < 0 ? -resisted : resisted;
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

  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const activeAnimRef = useRef<any>(null);

  // Gesture state for predictable, tactile horizontal card swipe
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const directionLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const isPointerDownRef = useRef(false);
  const hasSwipedRef = useRef(false);

  const getContainerWidth = useCallback(() => {
    return containerRef.current?.offsetWidth || window.innerWidth || 360;
  }, []);

  const animateTo = useCallback(
    (
      targetIndex: number,
      velocity = 0,
      mode: 'advance' | 'snapback' | 'boundary' = 'advance'
    ) => {
      const width = getContainerWidth();
      const targetX = -targetIndex * width;

      if (activeAnimRef.current) {
        activeAnimRef.current.stop();
      }

      // Playful spring physics tailored to the gesture outcome:
      // - snapback / boundary: lively, bouncy, elastic recoil
      // - advance: deliberate, confident glide with a subtle cushion settle
      const springConfig =
        mode === 'boundary'
          ? { stiffness: 320, damping: 14, mass: 0.45 }
          : mode === 'snapback'
          ? { stiffness: 300, damping: 15, mass: 0.45 }
          : { stiffness: 240, damping: 18, mass: 0.5 };

      activeAnimRef.current = animate(x, targetX, {
        type: 'spring',
        ...springConfig,
        velocity,
      });
    },
    [getContainerWidth, x]
  );

  // Sync activeIndex with external selectedIndex if changed from parent
  useEffect(() => {
    if (
      selectedIndex !== activeIndex &&
      selectedIndex >= 0 &&
      selectedIndex < resources.length
    ) {
      setActiveIndex(selectedIndex);
      animateTo(selectedIndex, 0);
    }
  }, [selectedIndex, activeIndex, resources.length, animateTo]);

  // Handle window resize or orientation change
  useEffect(() => {
    const handleResize = () => {
      const width = getContainerWidth();
      x.set(-activeIndex * width);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex, getContainerWidth, x]);

  const handleDotClick = useCallback((idx: number) => {
    setActiveIndex(idx);
    onSelectIndex(idx);
    animateTo(idx, 0);
  }, [onSelectIndex, animateTo]);

  // Touch and pointer gesture handlers with zero-lag compositor direct tracking
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (resources.length <= 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (activeAnimRef.current) {
      activeAnimRef.current.stop();
    }

    touchStartRef.current = { x: clientX, y: clientY, time: performance.now() };
    directionLockRef.current = null;
    isPointerDownRef.current = true;
    hasSwipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current || !isPointerDownRef.current || resources.length <= 1) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - touchStartRef.current.x;
    const dy = clientY - touchStartRef.current.y;

    // Filter out accidental micro-taps (< 6px deadzone)
    if (directionLockRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        return;
      }
      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical scroll: leave browser native scroll uninterrupted
        directionLockRef.current = 'vertical';
        return;
      } else {
        // Horizontal swipe: claim card swipe gesture
        directionLockRef.current = 'horizontal';
        hasSwipedRef.current = true;
      }
    }

    if (directionLockRef.current === 'horizontal') {
      const width = getContainerWidth();
      const baseOffset = -activeIndex * width;

      let effectiveDx = dx;
      // Fluid rubber-band elasticity at boundaries
      if (activeIndex === 0 && dx > 0) {
        effectiveDx = rubberBand(dx, width, 0.55);
      } else if (activeIndex === resources.length - 1 && dx < 0) {
        effectiveDx = rubberBand(dx, width, 0.55);
      }

      x.set(baseOffset + effectiveDx);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (!touchStartRef.current || resources.length <= 1) {
      return;
    }

    const wasLockedHorizontal = directionLockRef.current === 'horizontal';
    const clientX =
      'changedTouches' in e
        ? e.changedTouches[0].clientX
        : (e as React.MouseEvent).clientX;

    const dx = clientX - touchStartRef.current.x;
    const elapsed = Math.max(1, performance.now() - touchStartRef.current.time);
    const vx = (dx / elapsed) * 1000; // px per second

    touchStartRef.current = null;
    directionLockRef.current = null;

    if (wasLockedHorizontal) {
      const width = getContainerWidth();
      // Deliberate and playful threshold:
      // - Requires deliberate drag of ~20% card width (~68-75px), or
      // - Decisive flick (>380px/s with >28px drag displacement)
      const isFlick = Math.abs(vx) > 380 && Math.abs(dx) > 28;
      const isDisplaced = Math.abs(dx) > Math.min(75, width * 0.20);

      let targetIndex = activeIndex;

      if ((isDisplaced || isFlick) && dx < 0) {
        if (activeIndex < resources.length - 1) {
          targetIndex = activeIndex + 1;
        }
      } else if ((isDisplaced || isFlick) && dx > 0) {
        if (activeIndex > 0) {
          targetIndex = activeIndex - 1;
        }
      }

      const isBoundary =
        (activeIndex === 0 && dx > 0) ||
        (activeIndex === resources.length - 1 && dx < 0);

      const didChange = targetIndex !== activeIndex;

      if (didChange) {
        setActiveIndex(targetIndex);
        onSelectIndex(targetIndex);
      }

      const mode = isBoundary
        ? 'boundary'
        : didChange
        ? 'advance'
        : 'snapback';

      animateTo(targetIndex, vx, mode);

      setTimeout(() => {
        hasSwipedRef.current = false;
      }, 80);
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasSwipedRef.current) {
      e.stopPropagation();
      e.preventDefault();
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
                    backgroundColor: isActive ? '#11110F' : 'rgba(17, 17, 15, 0.4)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 340,
                    damping: 18,
                  }}
                  className="h-1.5 rounded-full block"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Springy Resistive Card Slider with Immediate Hardware Acceleration */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden relative touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onClickCapture={handleClickCapture}
      >
        <motion.div
          style={{ x }}
          className="flex w-full"
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
