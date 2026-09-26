import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Check, PhoneCall, PhoneOff, Radio, ArrowRight,
  Shield, Send, RotateCcw, ChevronDown,
} from 'lucide-react';

type Stage = 'vehicle' | 'scanning' | 'contact' | 'calling' | 'connected' | 'zoomed_out';

interface LineupObject {
  id: string;
  name: string;
  category: string;
  tagId: string;
  description: string;
}

const LINEUP_OBJECTS: LineupObject[] = [
  {
    id: 'vehicle',
    name: 'Suzuki Access 125',
    category: 'Vehicles',
    tagId: 'PG-4421',
    description: 'Blocked parking, lights left on, or tow alerts without displaying a phone number.',
  },
  {
    id: 'package',
    name: 'Delivery Parcel',
    category: 'Deliveries',
    tagId: 'PG-9014',
    description: 'Courier instructions, delivery drop-off questions, and gate codes securely.',
  },
  {
    id: 'door',
    name: 'Apartment Entryway',
    category: 'Doors & Gates',
    tagId: 'PG-1202',
    description: 'Visitors ring the resident privately from the curb or front gate.',
  },
  {
    id: 'bag',
    name: 'Commuter Backpack',
    category: 'Everyday Carry',
    tagId: 'PG-7734',
    description: 'Lost luggage or misplaced bag safely returned without exposing home address.',
  },
  {
    id: 'equipment',
    name: 'Camera & Gear Case',
    category: 'Tools & Gear',
    tagId: 'PG-8820',
    description: 'Production crew and equipment identification with verified owner contact.',
  },
];

export const InteractiveHero: React.FC = () => {
  const [stage, setStage] = useState<Stage>('vehicle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [signalPosition, setSignalPosition] = useState<number>(0);
  const [noteOpen, setNoteOpen] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('Bhai, please move your scooter — I need to leave in 5 mins.');
  const [noteSent, setNoteSent] = useState<boolean>(false);
  const [selectedLineupIndex, setSelectedLineupIndex] = useState<number>(0);

  // Mouse proximity & 3D tilt tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const tagAnchorRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [proximity, setProximity] = useState<number>(0); // 0 (far) to 1 (cursor right on tag)

  // Track cursor position for subtle 3D tilt & proximity reaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== 'vehicle') {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Subtle 3D camera parallax tilt
    const normX = (mouseX / rect.width - 0.5) * 2; // -1 to 1
    const normY = (mouseY / rect.height - 0.5) * 2; // -1 to 1
    setTilt({
      x: -normY * 4.5, // tilt up/down
      y: normX * 6.0,  // tilt left/right
    });

    // Proximity to Pingin Tag
    const tag = tagAnchorRef.current;
    if (tag) {
      const tagRect = tag.getBoundingClientRect();
      const tagCenterX = tagRect.left + tagRect.width / 2 - rect.left;
      const tagCenterY = tagRect.top + tagRect.height / 2 - rect.top;

      const dist = Math.hypot(mouseX - tagCenterX, mouseY - tagCenterY);
      const maxDistance = 280; // proximity threshold in px
      const proxScore = Math.max(0, Math.min(1, 1 - dist / maxDistance));
      setProximity(proxScore);
    }
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setProximity(0);
  };

  // Active call duration counter
  useEffect(() => {
    if (stage !== 'connected') {
      return;
    }
    const interval = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [stage]);

  // Traveling signal pulse animation during call & relay
  useEffect(() => {
    if (stage !== 'connected' && stage !== 'calling') {
      return;
    }
    const interval = window.setInterval(() => {
      setSignalPosition((prev) => (prev + 1.8) % 100);
    }, 28);
    return () => window.clearInterval(interval);
  }, [stage]);

  // 1. Tag clicked -> Zoom into the Tag & Scan
  const handleTagClick = () => {
    if (stage === 'vehicle') {
      setStage('scanning');
      // Scan animation sweeps across QR, then smoothly morphs into public contact interface
      setTimeout(() => {
        setStage('contact');
      }, 1200);
    }
  };

  // 2. Call Privately clicked -> Transform Contact Card into Private Relay
  const handleStartCall = () => {
    setCallDuration(0);
    setStage('calling');
    setTimeout(() => {
      setStage('connected');
    }, 900);
  };

  // 3. Hang up / Reveal clicked -> Zoom Back Out into the wider physical world
  const handleRevealAll = () => {
    setStage('zoomed_out');
    setCallDuration(0);
  };

  // Reset back to original vehicle interaction
  const handleResetToVehicle = () => {
    setStage('vehicle');
    setCallDuration(0);
    setNoteSent(false);
    setNoteOpen(false);
    setSelectedLineupIndex(0);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[86vh] lg:min-h-[90vh] flex flex-col justify-between pt-6 sm:pt-8 pb-10 sm:pb-12 border-b border-border bg-bg overflow-hidden select-none"
    >
      {/* Restrained studio floor line */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[68%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute top-[68%] left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-24 bg-ink/[0.02] blur-xl rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex-1 flex flex-col justify-between relative z-10">
        {/* TOP QUIET CONTEXT: Drastically reduced clutter — one single contextual sentence */}
        <div className="flex items-center justify-between text-xs font-sans text-muted pb-4 border-b border-border/50">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/20" />
            <span className="tracking-widest uppercase font-medium text-ink text-[11px]">
              {stage === 'vehicle' && 'Private contact for physical things'}
              {stage === 'scanning' && 'Scanning physical tag...'}
              {stage === 'contact' && 'Public contact interface'}
              {(stage === 'calling' || stage === 'connected') && 'Private encrypted relay'}
              {stage === 'zoomed_out' && 'The realization'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-sans">
            {stage !== 'vehicle' && (
              <button
                type="button"
                onClick={handleResetToVehicle}
                className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset to vehicle view"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline uppercase tracking-wider text-[10px]">Reset view</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-muted font-mono text-[10px] tracking-wider uppercase">
              <span>SUZUKI ACCESS 125</span>
              <span className="text-border">·</span>
              <span className="text-ink font-semibold">MH01-BX-4421</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            THE LIVING CONTINUOUS OBJECT STAGE
            Instead of switching between disconnected cards, the entire
            interaction takes place through spatial transformations of
            this single physical scene.
           ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center relative py-6 sm:py-8 my-auto min-h-[440px] sm:min-h-[500px]">
          {/* CAMERA MATRIX CONTAINER */}
          <div
            className="w-full flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              perspective: '1200px',
              perspectiveOrigin: 'center center',
            }}
          >
            {/* STAGE WORLD: Transforms smoothly based on state */}
            <div
              className="relative w-full max-w-4xl flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform:
                  stage === 'vehicle'
                    ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1)`
                    : stage === 'scanning'
                    ? 'scale(1.08) translate3d(0, -6px, 0)'
                    : 'scale(1)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* ───────────────────────────────────────────────────────
                  1. THE PRIMARY PHYSICAL OBJECT: SUZUKI ACCESS 125
                  Always present in the world. Dominates the initial viewport.
                  Softly recedes when camera enters the tag doorway.
                 ─────────────────────────────────────────────────────── */}
              <div
                className={[
                  'relative w-full max-w-[560px] flex flex-col items-center justify-center transition-all duration-600',
                  stage === 'scanning' ? 'opacity-30 blur-[2px] scale-95 pointer-events-none' : '',
                  stage === 'contact' || stage === 'calling' || stage === 'connected' ? 'hidden' : 'block',
                  stage === 'zoomed_out' ? 'hidden' : '',
                ].join(' ')}
              >
                {/* Floating ambient motion container */}
                <div className="relative w-full flex flex-col items-center animate-[float_4.4s_ease-in-out_infinite]">
                  {/* High-fidelity Suzuki Access 125 vector in Pearl Moon Gray */}
                  <svg
                    viewBox="0 0 540 340"
                    className="w-full h-auto drop-shadow-sm select-none"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Rear wheel and tire */}
                    <circle cx="120" cy="245" r="54" fill="#1c1c1a" />
                    <circle cx="120" cy="245" r="39" fill="#333330" />
                    <circle cx="120" cy="245" r="22" fill="#555550" />
                    <circle cx="120" cy="245" r="6" fill="#cbc8bd" />

                    {/* Front wheel and tire */}
                    <circle cx="420" cy="245" r="54" fill="#1c1c1a" />
                    <circle cx="420" cy="245" r="39" fill="#333330" />
                    <circle cx="420" cy="245" r="22" fill="#555550" />
                    <circle cx="420" cy="245" r="6" fill="#cbc8bd" />

                    {/* Main Chassis & Floorboard (Pearl Moon Gray tones) */}
                    <path
                      d="M115 220 L160 160 L245 165 L275 230 L385 230 L405 180 L365 110 L330 90 L260 90 L220 120 L130 140 Z"
                      fill="#dedcd5"
                      stroke="#aaa79c"
                      strokeWidth="2"
                    />

                    {/* Seat: Dark matte charcoal */}
                    <path
                      d="M135 140 C160 128 220 128 255 135 C255 148 245 156 230 156 L145 156 Z"
                      fill="#1e1e1c"
                    />

                    {/* Front Apron / Cowl (Iconic Suzuki Access front profile) */}
                    <path
                      d="M330 90 L390 140 L415 210 L375 210 L350 145 Z"
                      fill="#c8c6bc"
                      stroke="#aaa79c"
                      strokeWidth="2"
                    />

                    {/* Front Fender */}
                    <path
                      d="M380 210 Q420 190 455 220 L445 235 Q420 210 385 225 Z"
                      fill="#dedcd5"
                      stroke="#aaa79c"
                    />

                    {/* Chrome / Metal Exhaust Muffler */}
                    <rect x="90" y="232" width="88" height="18" rx="9" fill="#888880" stroke="#1c1c1a" strokeWidth="1.5" />

                    {/* Handlebar & Headlamp Visor */}
                    <path
                      d="M330 90 L345 55 L385 55 L365 90 Z"
                      fill="#dedcd5"
                      stroke="#888880"
                      strokeWidth="1.5"
                    />
                    <polygon points="368,60 388,63 385,78 363,74" fill="#f5f4ee" stroke="#cbc8bd" />
                    {/* Rear view mirror */}
                    <path d="M342 55 L325 28 L342 26 Z" fill="#1e1e1c" />

                    {/* Registration License Plate: MH01-BX-4421 */}
                    <rect x="400" y="162" width="76" height="24" rx="2" fill="#f7f6f0" stroke="#11110f" strokeWidth="1.5" />
                    <text x="438" y="178" textAnchor="middle" fill="#11110f" fontSize="8.5" fontFamily="monospace" fontWeight="bold" letterSpacing="0.5">
                      MH01·BX·4421
                    </text>

                    {/* Tail lamp */}
                    <path d="M110 162 L120 162 L120 175 L110 170 Z" fill="#a33b32" />
                  </svg>

                  {/* Soft synchronized ground contact shadow */}
                  <div className="w-4/5 h-4 bg-ink/15 rounded-full blur-[6px] -mt-3 animate-[shadowPulse_4.4s_ease-in-out_infinite]" />
                </div>

                {/* ─────────────────────────────────────────────────────
                    THE PINGIN TAG: Mounted physically on the front cowl
                    Responds to cursor proximity dynamically!
                   ───────────────────────────────────────────────────── */}
                <div
                  ref={tagAnchorRef}
                  onClick={handleTagClick}
                  className="absolute top-[28%] right-[15%] sm:right-[18%] z-30 cursor-pointer transition-transform duration-200 select-none group"
                  style={{
                    transform: `scale(${1 + proximity * 0.16}) translate3d(0, ${-proximity * 6}px, 0)`,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="PingIn Tag on Suzuki Access 125. Click to scan and contact."
                >
                  {/* Integral affordance beacon — reacts smoothly to proximity */}
                  <div
                    className={[
                      'absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-xs text-[9.5px] font-mono tracking-widest uppercase transition-all duration-300 pointer-events-none',
                      proximity > 0.3
                        ? 'opacity-100 -translate-y-1 bg-surface-dark text-accent border border-accent/40 shadow-sm'
                        : 'opacity-70 translate-y-0 bg-surface-dark/90 text-white/80 border border-white/20',
                    ].join(' ')}
                  >
                    <span>{proximity > 0.4 ? 'TOUCH TO SCAN ▸' : 'PINGIN TAG'}</span>
                  </div>

                  {/* Physical Tag Card */}
                  <div
                    className={[
                      'p-2.5 sm:p-3 bg-surface-dark text-white rounded-sm border-2 shadow-xl flex flex-col items-center gap-1.5 min-w-[96px] sm:min-w-[108px] relative overflow-hidden transition-all duration-300',
                      proximity > 0.3 ? 'border-accent shadow-[0_4px_16px_rgba(215,255,63,0.18)]' : 'border-black',
                    ].join(' ')}
                  >
                    {/* Corner Accent Energy indicator */}
                    <span
                      className={[
                        'absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-all duration-300',
                        proximity > 0.2 ? 'bg-accent shadow-[0_0_6px_#d7ff3f] scale-125' : 'bg-white/40',
                      ].join(' ')}
                    />

                    <div className="w-full flex items-center justify-between px-0.5 text-[8px] font-mono text-white/50">
                      <span>PINGIN</span>
                      <span className={proximity > 0.2 ? 'text-accent font-semibold' : 'text-white/60'}>
                        SECURE
                      </span>
                    </div>

                    {/* QR Code Matrix block */}
                    <div className="relative p-1.5 bg-white rounded-xs shadow-xs">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 grid grid-cols-4 gap-0.5 p-0.5 bg-white">
                        <div className="bg-ink col-span-2 row-span-2 rounded-2xs border border-white" />
                        <div className="bg-ink col-start-4 row-start-1" />
                        <div className="bg-ink col-start-3 row-start-2" />
                        <div className="bg-ink col-start-1 row-start-4" />
                        <div className="bg-ink col-span-2 row-span-2 col-start-3 row-start-3 rounded-2xs border border-white" />
                      </div>
                    </div>

                    <div className="text-center leading-none mt-0.5">
                      <p className="font-mono text-[8.5px] font-semibold text-white tracking-widest">
                        MH01-4421
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────
                  2. SCANNING STATE: Camera Zooms Into the Tag
                  The tag expands into center view as the optical scan executes.
                 ─────────────────────────────────────────────────────── */}
              {stage === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center z-40 animate-in zoom-in-75 duration-300">
                  <div className="p-6 sm:p-7 bg-surface-dark text-white rounded-sm border-2 border-accent shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full relative overflow-hidden">
                    <div className="w-full flex items-center justify-between text-xs font-mono text-white/60 pb-2 border-b border-white/10">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        <span className="text-accent font-semibold tracking-wider">OPTICAL SCAN</span>
                      </span>
                      <span>PG-4421</span>
                    </div>

                    {/* Zoomed QR Code with sweeping laser line */}
                    <div className="relative p-3 bg-white rounded-xs shadow-lg">
                      <div className="w-28 h-28 grid grid-cols-5 gap-1 p-1 bg-white">
                        <div className="bg-ink col-span-2 row-span-2 rounded-xs border-2 border-white" />
                        <div className="bg-ink col-start-5 row-start-1" />
                        <div className="bg-ink col-start-4 row-start-2" />
                        <div className="bg-ink col-start-3 row-start-3" />
                        <div className="bg-ink col-start-1 row-start-5" />
                        <div className="bg-ink col-span-2 row-span-2 col-start-4 row-start-4 rounded-xs border-2 border-white" />
                      </div>

                      {/* Optical Laser Scan Beam */}
                      <div className="absolute inset-x-0 h-[2.5px] bg-accent shadow-[0_0_12px_#d7ff3f] animate-[scanSweep_0.75s_ease-in-out_infinite]" />
                    </div>

                    <div className="text-center space-y-1">
                      <p className="font-mono text-xs font-semibold text-accent tracking-widest uppercase">
                        Scanning Tag #MH01-BX-4421
                      </p>
                      <p className="text-[11px] font-sans text-white/60">
                        Resolving encrypted contact endpoint...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  3. CONTACT STATE: Contact Interface Emerges from the QR
                  The tag morphs into the public contact interface.
                  Matching existing Pingin public contact design language.
                 ─────────────────────────────────────────────────────── */}
              {stage === 'contact' && (
                <div className="w-full max-w-md bg-surface border border-border rounded-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 z-30">
                  {/* Verified Header / Address bar */}
                  <div className="px-4 py-3 bg-surface-dark text-white/80 text-xs font-mono flex items-center justify-between border-b border-black">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-white font-medium">pingin.in/t/mh01-bx-4421</span>
                    </div>
                    <span className="text-[10px] font-sans tracking-widest text-accent font-semibold uppercase">
                      VERIFIED TAG
                    </span>
                  </div>

                  {/* Body: Resource Information */}
                  <div className="p-5 sm:p-6 space-y-5 text-left">
                    <div className="flex items-start justify-between border-b border-border pb-3.5">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-muted uppercase block">
                          PUBLIC CONTACT
                        </span>
                        <h3 className="font-display font-medium text-2xl text-ink uppercase mt-0.5">
                          Suzuki Access 125
                        </h3>
                        <p className="text-xs font-mono text-muted tracking-wider mt-0.5">
                          MH01-BX-4421 · Pearl moon gray
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent/20 text-ink text-[10px] font-mono font-semibold rounded-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/30" />
                        AVAILABLE
                      </span>
                    </div>

                    <p className="text-xs font-sans text-ink">
                      Someone needs to reach the owner. How would you like to connect?
                    </p>

                    <div className="space-y-3">
                      {/* Method 01: Call Privately */}
                      <button
                        type="button"
                        onClick={handleStartCall}
                        className="w-full p-4 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm flex items-center justify-between group transition-all cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2 bg-white/10 rounded-xs text-accent">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-sans font-semibold tracking-wider uppercase">
                                Call Privately
                              </span>
                              <span className="text-[9px] font-sans px-1.5 py-0.2 bg-accent/20 text-accent rounded-xs font-medium">
                                DIRECT RELAY
                              </span>
                            </div>
                            <p className="text-[11px] text-white/60 font-sans mt-0.5">
                              Free audio bridge · Neither phone number revealed
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
                      </button>

                      {/* Method 02: Send a Note */}
                      <div className="border border-border rounded-sm bg-bg overflow-hidden transition-all">
                        <button
                          type="button"
                          onClick={() => setNoteOpen((prev) => !prev)}
                          className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-surface/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-display font-medium text-xs text-muted">02</span>
                            <div>
                              <p className="text-xs font-sans font-semibold tracking-wider uppercase text-ink">
                                Send a Note
                              </p>
                              <p className="text-[10px] text-muted font-sans">
                                Fast SMS / instant notification alert
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted transition-transform duration-200 ${
                              noteOpen ? 'rotate-180 text-ink' : ''
                            }`}
                          />
                        </button>

                        {noteOpen && (
                          <div className="p-3.5 border-t border-border bg-white space-y-2.5 animate-in fade-in duration-150">
                            {noteSent ? (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-xs font-sans text-emerald-800 flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Note delivered to owner's device. No number was shared.</span>
                              </div>
                            ) : (
                              <>
                                <textarea
                                  rows={2}
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  className="w-full p-2.5 bg-bg border border-border rounded-sm text-xs font-sans text-ink focus:outline-none focus:border-ink resize-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNoteSent(true)}
                                  className="w-full py-2.5 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Send className="w-3.5 h-3.5 text-accent" />
                                  <span>Deliver Note to Owner</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-sans text-muted">
                      <span>Powered by Pingin Private Protocol</span>
                      <button
                        type="button"
                        onClick={handleResetToVehicle}
                        className="text-ink underline hover:text-muted cursor-pointer"
                      >
                        ← Back to vehicle
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  4. CALL & RELAY STATE: Moving Deeper into the Interface
                  The contact interface transforms directly into the Call State.
                  The connection is represented as visible physical movement.
                 ─────────────────────────────────────────────────────── */}
              {(stage === 'calling' || stage === 'connected') && (
                <div className="w-full max-w-md p-6 sm:p-7 bg-surface-dark text-white rounded-sm border-2 border-black shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 z-30">
                  {/* Relay Status Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/10 text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      {stage === 'connected' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                          <span className="text-accent font-semibold tracking-wider">
                            PRIVATE RELAY ACTIVE
                          </span>
                          {/* Audio Wave Frequency Bars */}
                          <div className="flex items-center gap-0.5 h-3 ml-1">
                            <span className="w-0.5 h-3 bg-accent animate-pulse" />
                            <span className="w-0.5 h-2 bg-accent/80 animate-pulse delay-75" />
                            <span className="w-0.5 h-3.5 bg-accent animate-pulse delay-150" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                          <span className="text-white/80 font-medium">CONNECTING PROXY BRIDGE...</span>
                        </>
                      )}
                    </div>
                    <span className="text-accent font-mono text-sm tabular-nums">
                      {formatTimer(callDuration)}
                    </span>
                  </div>

                  {/* ───────────────────────────────────────────────────
                      PHYSICAL RELAY DIAGRAM (Section 7)
                      VISITOR  ──▶  PINGIN RELAY  ──▶  OWNER
                      Signal visibly travels through the bridge.
                     ─────────────────────────────────────────────────── */}
                  <div className="relative py-4 select-none">
                    {/* Connecting physical track line */}
                    <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-white/20 -translate-y-1/2" />

                    {/* Forward Traveling Signal Pulse Dot */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent shadow-[0_0_10px_#d7ff3f] pointer-events-none"
                      style={{
                        left: `calc(2.5rem + ${signalPosition * 0.72}%)`,
                        transition: 'left 0.028s linear',
                      }}
                    />

                    {/* Three Physical Relay Nodes */}
                    <div className="relative flex items-center justify-between z-10">
                      {/* Node 1: Visitor */}
                      <div className="flex flex-col items-center space-y-1 text-center w-24">
                        <div className="w-10 h-10 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center text-accent shadow-sm">
                          <PhoneCall className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                          Visitor
                        </span>
                        <span className="text-[11px] font-mono text-white/90 font-medium">
                          +91 ••••• •••••
                        </span>
                      </div>

                      {/* Node 2: Pingin Relay Bridge */}
                      <div className="flex flex-col items-center space-y-1 text-center px-3 py-1.5 bg-black/80 border border-accent/50 rounded-sm shadow-md">
                        <Shield className="w-4 h-4 text-accent" />
                        <span className="text-[9px] font-mono text-accent font-semibold uppercase tracking-wider">
                          PINGIN RELAY
                        </span>
                        <span className="text-[8px] font-sans text-white/50">
                          Encrypted Proxy
                        </span>
                      </div>

                      {/* Node 3: Owner */}
                      <div className="flex flex-col items-center space-y-1 text-center w-24">
                        <div className="w-10 h-10 rounded-sm bg-white/10 border border-white/20 flex items-center justify-center text-accent shadow-sm">
                          <Radio className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                          Owner
                        </span>
                        <span className="text-[11px] font-mono text-white/90 font-medium">
                          +91 ••••• •••••
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Core Editorial Realization: Neither phone number is visible */}
                  <div className="p-3.5 bg-white/5 rounded-xs border border-white/10 text-center space-y-1">
                    <p className="font-display font-medium text-sm text-accent uppercase tracking-wide">
                      Neither phone number is visible.
                    </p>
                    <p className="text-[11px] font-sans text-white/70 leading-relaxed">
                      The call bridges through Pingin proxy. Both parties speak in real time without disclosing phone numbers.
                    </p>
                  </div>

                  {/* Action: End Call & Zoom Back Out */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-sans text-white/50">
                      Session active on MH01-BX-4421
                    </span>

                    <button
                      type="button"
                      onClick={handleRevealAll}
                      className="w-full sm:w-auto px-4 py-2.5 bg-accent hover:bg-accent-hover text-ink font-sans text-xs font-semibold tracking-wider uppercase rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End Call & Zoom Out →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────
                  5. ZOOM BACK OUT & THE BIG REALIZATION (Section 8)
                  Pull back from contact interface.
                  Reveal vehicle again, and pull back farther to reveal
                  the lineup of physical objects:
                  Vehicle, Package, Door, Bag, Equipment.
                  "Pingin is not really about cars."
                 ─────────────────────────────────────────────────────── */}
              {stage === 'zoomed_out' && (
                <div className="w-full space-y-8 animate-in zoom-in-95 duration-500 z-30">
                  {/* Conceptual Headline Reveal */}
                  <div className="text-center space-y-2 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-surface-dark text-accent text-[10px] font-mono tracking-widest uppercase rounded-xs">
                      <span>THE BIGGER REALIZATION</span>
                    </div>

                    <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
                      Pingin is not really about cars.
                    </h2>

                    <p className="text-sm sm:text-base font-sans text-muted max-w-lg mx-auto leading-relaxed">
                      It is about giving physical things a way to reach the person behind them.
                    </p>
                  </div>

                  {/* ───────────────────────────────────────────────────
                      THE PHYSICAL OBJECTS LINEUP
                      5 Real Physical Objects with Genuine Pingin Tags
                     ─────────────────────────────────────────────────── */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto">
                    {LINEUP_OBJECTS.map((obj, idx) => {
                      const isSelected = selectedLineupIndex === idx;
                      return (
                        <div
                          key={obj.id}
                          onClick={() => setSelectedLineupIndex(idx)}
                          className={[
                            'p-3.5 sm:p-4 rounded-sm border transition-all duration-200 cursor-pointer flex flex-col justify-between text-left group',
                            isSelected
                              ? 'border-ink bg-surface shadow-md ring-1 ring-ink/20 -translate-y-1'
                              : 'border-border bg-bg hover:border-border-strong hover:bg-surface/50',
                          ].join(' ')}
                        >
                          {/* Object Visual Icon / Vector */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono tracking-widest uppercase text-muted">
                                0{idx + 1}
                              </span>
                              <span className="px-1.5 py-0.5 bg-surface-dark text-accent font-mono text-[8px] font-semibold rounded-2xs">
                                {obj.tagId}
                              </span>
                            </div>

                            {/* Object Illustration */}
                            <div className="h-20 flex items-center justify-center text-ink/80 group-hover:scale-105 transition-transform">
                              {obj.id === 'vehicle' && (
                                <svg viewBox="0 0 160 100" className="w-24 h-auto" fill="none">
                                  <circle cx="35" cy="72" r="16" fill="#1c1c1a" />
                                  <circle cx="125" cy="72" r="16" fill="#1c1c1a" />
                                  <path d="M35 65 L50 48 L80 50 L90 70 L120 70 L110 38 L95 28 L70 28 Z" fill="#dedcd5" stroke="#aaa79c" strokeWidth="1.5" />
                                  <rect x="105" y="44" width="16" height="12" rx="1" fill="#151513" />
                                  <rect x="108" y="46" width="10" height="8" rx="0.5" fill="#d7ff3f" />
                                </svg>
                              )}
                              {obj.id === 'package' && (
                                <svg viewBox="0 0 120 100" className="w-20 h-auto" fill="none">
                                  <rect x="20" y="30" width="80" height="55" rx="3" fill="#c49b66" stroke="#96703c" strokeWidth="1.5" />
                                  <line x1="20" y1="55" x2="100" y2="55" stroke="#b0854e" strokeWidth="1" />
                                  <line x1="60" y1="30" x2="60" y2="85" stroke="#b0854e" strokeWidth="1.5" />
                                  {/* Pingin Tag on box */}
                                  <rect x="68" y="36" width="22" height="14" rx="1.5" fill="#151513" stroke="#d7ff3f" strokeWidth="1" />
                                  <rect x="71" y="38" width="6" height="6" fill="#d7ff3f" />
                                </svg>
                              )}
                              {obj.id === 'door' && (
                                <svg viewBox="0 0 100 110" className="w-16 h-auto" fill="none">
                                  <rect x="25" y="15" width="50" height="85" rx="2" fill="#2d2b28" stroke="#151513" strokeWidth="1.5" />
                                  <line x1="25" y1="15" x2="75" y2="15" stroke="#4a4641" strokeWidth="1" />
                                  <rect x="32" y="24" width="36" height="30" rx="1" fill="#22201d" />
                                  <rect x="32" y="60" width="36" height="34" rx="1" fill="#22201d" />
                                  <circle cx="68" cy="62" r="2.5" fill="#cbc8bd" />
                                  {/* Mounted Pingin Plate Tag */}
                                  <rect x="12" y="52" width="10" height="18" rx="1" fill="#151513" stroke="#d7ff3f" strokeWidth="0.8" />
                                  <circle cx="17" cy="58" r="1.5" fill="#d7ff3f" />
                                </svg>
                              )}
                              {obj.id === 'bag' && (
                                <svg viewBox="0 0 100 100" className="w-16 h-auto" fill="none">
                                  <path d="M30 35 C30 20 70 20 70 35 L76 80 C76 86 68 88 50 88 C32 88 24 86 24 80 Z" fill="#242320" stroke="#151513" strokeWidth="1.5" />
                                  <path d="M40 22 C40 14 60 14 60 22" stroke="#44423d" strokeWidth="2" fill="none" />
                                  <rect x="34" y="50" width="32" height="24" rx="2" fill="#1c1b18" />
                                  {/* Lanyard Tag */}
                                  <line x1="60" y1="22" x2="74" y2="38" stroke="#d7ff3f" strokeWidth="1" />
                                  <rect x="70" y="38" width="12" height="18" rx="1" fill="#151513" stroke="#d7ff3f" strokeWidth="0.8" />
                                </svg>
                              )}
                              {obj.id === 'equipment' && (
                                <svg viewBox="0 0 120 100" className="w-20 h-auto" fill="none">
                                  <rect x="20" y="32" width="80" height="50" rx="4" fill="#20201e" stroke="#11110f" strokeWidth="2" />
                                  <line x1="20" y1="46" x2="100" y2="46" stroke="#11110f" strokeWidth="1.5" />
                                  <rect x="52" y="24" width="16" height="8" rx="2" fill="#333330" stroke="#11110f" strokeWidth="1" />
                                  <rect x="30" y="44" width="8" height="5" rx="1" fill="#888880" />
                                  <rect x="82" y="44" width="8" height="5" rx="1" fill="#888880" />
                                  {/* Equipment Tag */}
                                  <rect x="46" y="56" width="28" height="14" rx="1.5" fill="#151513" stroke="#d7ff3f" strokeWidth="1" />
                                  <rect x="49" y="59" width="6" height="6" fill="#d7ff3f" />
                                </svg>
                              )}
                            </div>

                            <div>
                              <p className="text-[11px] font-sans font-semibold text-ink uppercase tracking-wide">
                                {obj.name}
                              </p>
                              <p className="text-[10px] font-sans text-muted">
                                {obj.category}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active selected object detail snippet */}
                  <div className="p-4 sm:p-5 bg-surface border border-border rounded-sm max-w-xl mx-auto flex items-center justify-between gap-4 text-left">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-muted uppercase">
                        {LINEUP_OBJECTS[selectedLineupIndex].category} · {LINEUP_OBJECTS[selectedLineupIndex].tagId}
                      </span>
                      <p className="font-display font-medium text-base text-ink uppercase mt-0.5">
                        {LINEUP_OBJECTS[selectedLineupIndex].name}
                      </p>
                      <p className="text-xs font-sans text-muted mt-1 leading-relaxed">
                        {LINEUP_OBJECTS[selectedLineupIndex].description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetToVehicle}
                      className="px-3.5 py-2 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-[11px] font-sans font-semibold tracking-wider uppercase transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-accent" />
                      <span>Replay</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SUBTLE GUIDANCE: Clean, quiet anchor down to the rest of the page */}
        <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans text-muted">
          <span className="text-[11px] tracking-wide">
            {stage === 'vehicle' && 'Interact with the tag on the scooter to experience the contact flow.'}
            {stage === 'scanning' && 'Optical scan verifies cryptographic token.'}
            {stage === 'contact' && 'Visitor initiates private contact directly from browser.'}
            {(stage === 'calling' || stage === 'connected') && 'Voice packets bridge through Pingin proxy in real time.'}
            {stage === 'zoomed_out' && 'Physical things become reachable. Without ever revealing phone numbers.'}
          </span>

          <div className="flex items-center gap-4">
            <a
              href="#the-problem"
              className="hover:text-ink transition-colors flex items-center gap-1 uppercase tracking-wider text-[11px]"
            >
              <span>Explore how it works</span>
              <span>↓</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
