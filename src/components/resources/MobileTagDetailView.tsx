import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Resource, CallRecord } from '../../types/api';
import { extractResourceTag, getResourceContactUrl, resourcesApi, resourceCache } from '../../lib/api';
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

/**
 * Tunable constants for the custom high-performance 120Hz drag carousel
 */
export const CAROUSEL_CONFIG = {
  COMMIT_DISTANCE_RATIO: 0.22,
  COMMIT_VELOCITY: 0.5, // px/ms
  MAX_PULL_RATIO: 0.45,
  EDGE_PULL_RATIO: 0.12,
  SLOP_PX: 6,
  SPRING_EASING: 'linear(0, .38 9%, .95 20%, 1.07 30%, 1.03 42%, .99 58%, 1)',
  REDUCED_MOTION_EASING: 'ease-out',
  DURATION_MS: 520,
  REDUCED_DURATION_MS: 150,
} as const;

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
 * Flat styling (no heavy blur or complex box shadows) to keep repaint cost cheap at 120Hz.
 */
interface BelongingPlateCardProps {
  resource: Resource;
  onOpenShare: () => void;
}

const BelongingPlateCard: React.FC<BelongingPlateCardProps> = React.memo(({
  resource,
  onOpenShare,
}) => {
  const tagId = resource?.id || (resource as any)?._id;
  const [tagNumber, setTagNumber] = useState<string>(() => extractResourceTag(resource));
  const [cardResource, setCardResource] = useState<Resource>(resource);
  const fetchedDetailRef = useRef<string | null>(null);
  const fetchedCallsRef = useRef<string | null>(null);

  // Sync state if resource prop changes
  useEffect(() => {
    setCardResource(resource);
    const resolved = extractResourceTag(resource);
    if (resolved) setTagNumber(resolved);
  }, [resource]);

  // If tagNumber or vehicleDetails is missing from list summary, fetch full resource details ONCE per tagId
  useEffect(() => {
    if (!tagId || fetchedDetailRef.current === tagId) return;

    const hasTag = Boolean(extractResourceTag(resource));
    const hasVehicle = Boolean(resource.vehicleDetails);

    if (!hasTag || !hasVehicle) {
      fetchedDetailRef.current = tagId;
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
  }, [tagId, resource]);

  const publicUrl = useMemo(() => {
    return tagNumber ? buildTagQrUrl(tagNumber) : getResourceContactUrl(cardResource);
  }, [tagNumber, cardResource]);

  // Fetch or resolve call records for this specific belonging
  const [calls, setCalls] = useState<CallRecord[]>(() => {
    if (Array.isArray(resource.recentCalls) && resource.recentCalls.length > 0) return resource.recentCalls;
    if (Array.isArray(resource.calls) && resource.calls.length > 0) return resource.calls;
    if (tagId) {
      const cached = resourceCache.getCalls(tagId);
      if (cached && cached.length > 0) return cached;
    }
    return [];
  });

  useEffect(() => {
    if (!tagId || fetchedCallsRef.current === tagId) return;

    if (Array.isArray(resource.recentCalls) && resource.recentCalls.length > 0) {
      setCalls(resource.recentCalls);
      fetchedCallsRef.current = tagId;
      return;
    }
    if (Array.isArray(resource.calls) && resource.calls.length > 0) {
      setCalls(resource.calls);
      fetchedCallsRef.current = tagId;
      return;
    }

    const cached = resourceCache.getCalls(tagId);
    if (cached && cached.length > 0) {
      setCalls(cached);
      fetchedCallsRef.current = tagId;
      return;
    }

    fetchedCallsRef.current = tagId;
    let isMounted = true;
    resourcesApi
      .getCalls(tagId, { limit: 3 })
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.calls || res?.data?.calls || res?.data || []);
        if (Array.isArray(list)) {
          setCalls(list);
          resourceCache.setCalls(tagId, list);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [tagId, resource]);

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
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4 relative overflow-hidden select-none">
      {/* Top Section: Category & Tag */}
      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <BelongingIcon className="h-3.5 w-3.5 text-ink/80" />
          <span>{cardResource.type === 'PROPERTY' ? 'PROPERTY SPEC' : (cardResource.type || 'VEHICLE SPEC')}</span>
        </div>
        <span className="text-xs text-muted">
          {tagNumber ? (
            <span className="font-satoshi font-medium text-ink">#{tagNumber}</span>
          ) : (
            'No tag'
          )}
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
});

BelongingPlateCard.displayName = 'BelongingPlateCard';

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

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Active Web Animation API instance
  const activeAnimRef = useRef<Animation | null>(null);

  // High-performance pointer session state (0 React renders during gestures)
  const sessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    viewportWidth: number;
    initialTrackX: number;
    samples: Array<{ x: number; time: number }>;
    isCaptured: boolean;
    hasExceededSlop: boolean;
  } | null>(null);

  const suppressClickRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);

  // Run compositor spring animation via Web Animations API (WAAPI)
  const runSpringAnimation = useCallback(
    (fromX: number, targetIndex: number, width: number) => {
      const track = trackRef.current;
      if (!track) return;

      const targetX = -targetIndex * width;
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const duration = prefersReduced
        ? CAROUSEL_CONFIG.REDUCED_DURATION_MS
        : CAROUSEL_CONFIG.DURATION_MS;

      const easing = prefersReduced
        ? CAROUSEL_CONFIG.REDUCED_MOTION_EASING
        : CAROUSEL_CONFIG.SPRING_EASING;

      // Cancel any ongoing animation
      if (activeAnimRef.current) {
        activeAnimRef.current.cancel();
        activeAnimRef.current = null;
      }

      // Immediately set the persistent inline style so it holds target after animation
      track.style.transform = `translate3d(${targetX}px, 0, 0)`;

      const anim = track.animate(
        [
          { transform: `translate3d(${fromX}px, 0, 0)` },
          { transform: `translate3d(${targetX}px, 0, 0)` },
        ],
        {
          duration,
          easing,
          fill: 'forwards',
        }
      );

      activeAnimRef.current = anim;

      anim.onfinish = () => {
        if (activeAnimRef.current === anim) {
          activeAnimRef.current = null;
          anim.cancel(); // Clears WAAPI override layer so inline transform cleanly persists
          track.style.transform = `translate3d(${targetX}px, 0, 0)`;
        }
      };

      // Commit to React state ONCE on release/navigation
      if (targetIndex !== activeIndexRef.current) {
        setActiveIndex(targetIndex);
        onSelectIndex(targetIndex);
      }
    },
    [onSelectIndex]
  );

  const goTo = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= resources.length) return;
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const width = viewport.offsetWidth || 360;
      let currentX = -activeIndexRef.current * width;
      try {
        const style = window.getComputedStyle(track);
        const matrix = new DOMMatrix(style.transform);
        currentX = matrix.m41;
      } catch {}

      runSpringAnimation(currentX, targetIndex, width);
    },
    [resources.length, runSpringAnimation]
  );

  // Sync with external selectedIndex changes
  useEffect(() => {
    if (
      selectedIndex !== activeIndexRef.current &&
      selectedIndex >= 0 &&
      selectedIndex < resources.length
    ) {
      goTo(selectedIndex);
    }
  }, [selectedIndex, resources.length, goTo]);

  // Recompute position on resize/orientation change without animating
  useEffect(() => {
    const handleResize = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      const width = viewport.offsetWidth || 360;
      const targetX = -activeIndexRef.current * width;

      if (activeAnimRef.current) {
        activeAnimRef.current.cancel();
        activeAnimRef.current = null;
      }
      track.style.transform = `translate3d(${targetX}px, 0, 0)`;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (resources.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(Math.max(0, activeIndexRef.current - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(Math.min(resources.length - 1, activeIndexRef.current + 1));
    }
  };

  // Pointer Event handlers (never call preventDefault; touch-action: pan-y lets browser own vertical scroll)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (resources.length <= 1) return;

    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;

    // Layout read done strictly on pointerdown, never in pointermove
    const viewportWidth = viewport.offsetWidth || 360;

    // If interrupted during an ongoing animation, read current x from DOMMatrix and continue seamlessly
    let initialTrackX = -activeIndexRef.current * viewportWidth;
    if (activeAnimRef.current) {
      try {
        const style = window.getComputedStyle(track);
        const matrix = new DOMMatrix(style.transform);
        initialTrackX = matrix.m41;
      } catch {}
      activeAnimRef.current.cancel();
      activeAnimRef.current = null;
      track.style.transform = `translate3d(${initialTrackX}px, 0, 0)`;
    }

    sessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      viewportWidth,
      initialTrackX,
      samples: [{ x: e.clientX, time: performance.now() }],
      isCaptured: false,
      hasExceededSlop: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const now = performance.now();
    const dx = e.clientX - session.startX;
    const absDx = Math.abs(dx);

    session.samples.push({ x: e.clientX, time: now });
    if (session.samples.length > 3) {
      session.samples.shift();
    }

    // Call setPointerCapture ONLY after moving more than SLOP_PX (6px) so taps pass through naturally
    if (!session.hasExceededSlop) {
      if (absDx > CAROUSEL_CONFIG.SLOP_PX) {
        session.hasExceededSlop = true;
        suppressClickRef.current = true;
        if (!session.isCaptured && trackRef.current) {
          try {
            trackRef.current.setPointerCapture(session.pointerId);
            session.isCaptured = true;
          } catch {}
        }
      } else {
        return;
      }
    }

    // Gesture response formula:
    // offset = sign(dx) * max * (1 - exp(-|dx| / (max * 1.2)))
    const width = session.viewportWidth;
    const currIndex = activeIndexRef.current;
    const isMissingNeighbor =
      (currIndex === 0 && dx > 0) ||
      (currIndex === resources.length - 1 && dx < 0);

    const max = (isMissingNeighbor
      ? CAROUSEL_CONFIG.EDGE_PULL_RATIO
      : CAROUSEL_CONFIG.MAX_PULL_RATIO) * width;

    const sign = dx < 0 ? -1 : 1;
    const offset = sign * max * (1 - Math.exp(-absDx / (max * 1.2)));

    const currentX = -currIndex * width + offset;
    pendingXRef.current = currentX;

    // At most ONE write per frame via requestAnimationFrame
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (trackRef.current && pendingXRef.current !== null) {
          trackRef.current.style.transform = `translate3d(${pendingXRef.current}px, 0, 0)`;
        }
      });
    }
  };

  const finishGesture = (e: React.PointerEvent<HTMLDivElement>, isCancel: boolean) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (session.isCaptured && trackRef.current) {
      try {
        trackRef.current.releasePointerCapture(session.pointerId);
      } catch {}
    }

    const track = trackRef.current;
    const width = session.viewportWidth;
    const currIndex = activeIndexRef.current;

    // Read current position from track
    let currentX = -currIndex * width;
    if (track) {
      try {
        const style = window.getComputedStyle(track);
        const matrix = new DOMMatrix(style.transform);
        currentX = matrix.m41;
      } catch {
        currentX = pendingXRef.current ?? (-currIndex * width);
      }
    }

    const dx = e.clientX - session.startX;

    // Velocity from the last two pointer samples (px/ms)
    let vx = 0;
    if (session.samples.length >= 2) {
      const s0 = session.samples[session.samples.length - 2];
      const s1 = session.samples[session.samples.length - 1];
      const dt = Math.max(1, s1.time - s0.time);
      vx = (s1.x - s0.x) / dt;
    }

    sessionRef.current = null;

    let targetIndex = currIndex;

    // Commit rule: commit if |dx| > 0.22 * width OR |velocity| > 0.5 px/ms
    if (!isCancel && session.hasExceededSlop) {
      const isDisplaced = Math.abs(dx) > CAROUSEL_CONFIG.COMMIT_DISTANCE_RATIO * width;
      const isFastFlick = Math.abs(vx) > CAROUSEL_CONFIG.COMMIT_VELOCITY;

      if (isDisplaced || isFastFlick) {
        if ((dx < 0 || vx < -CAROUSEL_CONFIG.COMMIT_VELOCITY) && currIndex < resources.length - 1) {
          targetIndex = currIndex + 1;
        } else if ((dx > 0 || vx > CAROUSEL_CONFIG.COMMIT_VELOCITY) && currIndex > 0) {
          targetIndex = currIndex - 1;
        }
      }
    }

    runSpringAnimation(currentX, targetIndex, width);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishGesture(e, false);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    finishGesture(e, true);
  };

  // Suppress resulting click in the capture phase if pointer moved > 6px
  const handleClickCapture = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  if (!resources || resources.length === 0) return null;

  // Single tag: no carousel, no drag handlers, static render
  if (resources.length === 1) {
    const single = resources[0];
    return (
      <div className="pt-2 font-sans">
        <BelongingPlateCard
          resource={single}
          onOpenShare={() => {
            setSelectedShareResource(single);
            setIsShareSheetOpen(true);
          }}
        />
        <ShareTagSheet
          isOpen={isShareSheetOpen}
          onClose={() => setIsShareSheetOpen(false)}
          resource={single}
        />
      </div>
    );
  }

  return (
    <div className="relative pt-2 font-sans space-y-3">
      {/* Indicator Dots Rail */}
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
              onClick={() => goTo(idx)}
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

      {/* Viewport: overflow hidden, focusable for arrow keys */}
      <div
        ref={viewportRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Your Tags Carousel"
        onKeyDown={handleKeyDown}
        className="viewport w-full overflow-hidden relative select-none focus:outline-none"
      >
        {/* Track: flex, will-change: transform, touch-action: pan-y (browser owns vertical, JS owns horizontal) */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClickCapture={handleClickCapture}
          className="track flex w-full cursor-grab active:cursor-grabbing"
          style={{
            willChange: 'transform',
            touchAction: 'pan-y',
            transform: `translate3d(${-activeIndex * (viewportRef.current?.offsetWidth || 360)}px, 0, 0)`,
          }}
        >
          {resources.map((resource, idx) => (
            <div
              key={resource.id || (resource as any)._id || idx}
              role="group"
              aria-roledescription="slide"
              aria-label={`Tag ${idx + 1} of ${resources.length}`}
              className="card w-full shrink-0 flex-none px-0.5"
              style={{ flex: '0 0 100%' }}
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
        </div>
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
