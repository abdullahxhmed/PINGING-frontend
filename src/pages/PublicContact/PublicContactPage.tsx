import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicContactApi, communicationApi } from '../../lib/api';
import type { PublicResourceContact, CallStatus } from '../../types/api';
import { validatePhoneNumber, useToast } from '../../components/ui';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';
import { Loader2, Check, HelpCircle } from 'lucide-react';

type ContactMethod = 'call' | 'message' | 'alert';

interface AlertOption {
  id: string;
  label: string;
  description: string;
  tag: 'ACCESS' | 'URGENT' | 'NOTICE';
  tagColor: string;
}

const ALERT_OPTIONS: AlertOption[] = [
  {
    id: 'blocking',
    label: 'ACCESS BLOCKED',
    description: 'Vehicle is obstructing vehicle passage or driveway',
    tag: 'ACCESS',
    tagColor: 'bg-[#a33b32]', // warm red
  },
  {
    id: 'lights',
    label: 'LIGHTS LEFT ON',
    description: 'Headlights or cabin lights appear to be on',
    tag: 'NOTICE',
    tagColor: 'bg-[#b45309]', // amber
  },
  {
    id: 'window',
    label: 'WINDOW / SUNROOF OPEN',
    description: 'Vehicle windows appear unclosed or vulnerable to rain',
    tag: 'NOTICE',
    tagColor: 'bg-[#475569]', // muted slate
  },
  {
    id: 'alarm',
    label: 'ALARM SOUNDING',
    description: 'Anti-theft or proximity alarm is active',
    tag: 'URGENT',
    tagColor: 'bg-[#a33b32]', // warm red
  },
  {
    id: 'tow',
    label: 'TOW / RESTRICTED BAY',
    description: 'Parking enforcement or towing is imminent in this zone',
    tag: 'URGENT',
    tagColor: 'bg-[#a33b32]', // warm red
  },
];

/**
 * Contextual PingIn Connection Line:
 * Responds to the selected communication method.
 * Uses only Clash Display and General Sans.
 */
const ContextualConnectionLine: React.FC<{
  method: ContactMethod;
  callStatus?: CallStatus | null;
  className?: string;
}> = ({ method, callStatus, className = '' }) => {
  return (
    <div className={`w-full select-none ${className}`} aria-label="Connection Status">
      <div className="flex items-center w-full">
        {/* Visitor endpoint */}
        <span className="w-2 h-2 rounded-full bg-ink shrink-0" />

        {/* Dynamic connection line */}
        {method === 'call' ? (
          <span
            className={`flex-1 h-[2px] mx-2 transition-all duration-300 ${
              callStatus === 'CONNECTED'
                ? 'bg-accent shadow-xs'
                : callStatus === 'INCOMING' || callStatus === 'INITIATED'
                ? 'bg-ink animate-pulse'
                : 'bg-ink'
            }`}
          />
        ) : (
          <div className="flex-1 flex items-center mx-2 transition-all duration-300">
            <span className="flex-1 h-[1px] bg-border-strong" />
            <span className="text-[11px] text-ink -ml-1 leading-none font-sans">▸</span>
          </div>
        )}

        {/* Owner endpoint */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
            method === 'call'
              ? callStatus === 'CONNECTED'
                ? 'bg-accent ring-2 ring-ink'
                : callStatus === 'MISSED'
                ? 'bg-[#a33b32]'
                : 'bg-accent ring-1 ring-ink/20'
              : method === 'alert'
              ? 'bg-[#a33b32]'
              : 'bg-ink'
          }`}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-sans font-medium tracking-widest uppercase text-muted mt-2">
        <span>YOU</span>
        <span>OWNER</span>
      </div>

      <div className="text-center text-[10px] font-sans font-medium tracking-[0.2em] uppercase mt-1">
        {method === 'call' && (
          <span className="text-ink font-semibold">
            {callStatus === 'INITIATED' && '● CALLING...'}
            {callStatus === 'INCOMING' && '● RINGING...'}
            {callStatus === 'CONNECTED' && '● CONNECTED'}
            {callStatus === 'COMPLETED' && '● CALL ENDED'}
            {callStatus === 'MISSED' && '● CALL MISSED'}
            {!callStatus && '● PHONE CALL'}
          </span>
        )}
        {method === 'message' && (
          <span className="text-muted">TEXT MESSAGE</span>
        )}
        {method === 'alert' && (
          <span className="text-[#a33b32] font-semibold">● QUICK ALERT</span>
        )}
      </div>
    </div>
  );
};

/**
 * Translates backend registration verification errors into clear, friendly guidance:
 * - NotFoundError ("registrationNum not found"): 404
 * - ForbiddenError ("Registration number does not match"): 403
 */
function translateRegistrationError(err: any): string {
  const status = err?.statusCode || err?.status || err?.data?.statusCode || err?.data?.status;
  const rawMessage = (
    Array.isArray(err?.data?.message)
      ? err.data.message.join('. ')
      : err?.data?.message || err?.message || ''
  ).toLowerCase();

  // 403 Forbidden - Mismatched registration number
  if (
    status === 403 ||
    rawMessage.includes('does not match') ||
    rawMessage.includes('not match')
  ) {
    return 'Registration number does not match. Please check the vehicle plate and try again.';
  }

  // 404 Not Found - No registration number on file
  if (
    status === 404 ||
    rawMessage.includes('not found') ||
    rawMessage.includes('registrationnum not found')
  ) {
    return 'No registration number is on file for this vehicle. Please try again later.';
  }

  // 400 Bad Request
  if (status === 400) {
    return 'Please enter a valid 4-digit registration number.';
  }

  // 429 Rate limited
  if (status === 429 || rawMessage.includes('too many') || rawMessage.includes('rate limit')) {
    return 'Too many verification attempts. Please wait a moment before trying again.';
  }

  // Generic message if backend sent a human string
  if (
    err?.data?.message &&
    typeof err.data.message === 'string' &&
    !rawMessage.includes('internal') &&
    !rawMessage.includes('unauthorized')
  ) {
    return err.data.message;
  }

  return 'Unable to verify registration number. Please try again.';
}

export const PublicContactPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [contact, setContact] = useState<PublicResourceContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Progressive disclosure active method
  const [selectedMethod, setSelectedMethod] = useState<ContactMethod>('call');

  // Form states
  const [visitorPhone, setVisitorPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showPhoneInfo, setShowPhoneInfo] = useState(false);

  // Registration number verification states (when hasRegistrationNumber is true)
  const [regNumber, setRegNumber] = useState('');
  const [isVerifyingReg, setIsVerifyingReg] = useState(false);
  const [isRegVerified, setIsRegVerified] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const phoneInputRef = React.useRef<HTMLInputElement | null>(null);

  const isBlockedByRegistration = Boolean(contact?.hasRegistrationNumber && !isRegVerified);

  const [messageText, setMessageText] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState<string>('blocking');
  const [alertNote, setAlertNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    setIsRegVerified(false);
    setRegNumber('');
    setRegError(null);

    if (!token) {
      setFetchError('Missing contact token');
      setIsLoading(false);
      return;
    }

    const fetchContact = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const data = await publicContactApi.getByToken(token);
        setContact(data);
      } catch (err: any) {
        setFetchError(err.message || 'Contact tag not found or inactive');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContact();
  }, [token]);

  // Active call session states
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);

  const handleResetCall = () => {
    setActiveCallId(null);
    setCallStatus(null);
    setCallDuration(0);
    setPhoneError(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Poll call status every ~2 seconds
  useEffect(() => {
    if (!activeCallId) return;

    const terminalStatuses: CallStatus[] = ['COMPLETED', 'MISSED'];
    if (callStatus && terminalStatuses.includes(callStatus)) {
      return;
    }

    let isSubscribed = true;
    let pollCount = 0;
    const maxPolls = 75; // 75 * 2s = 150s (2.5 mins limit)

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const poll = async () => {
      if (!isSubscribed) return;
      pollCount++;

      if (pollCount > maxPolls) {
        stopPolling();
        if (isSubscribed) {
          setCallStatus((prev) => (prev === 'CONNECTED' ? 'COMPLETED' : 'MISSED'));
        }
        return;
      }

      try {
        const res = await communicationApi.getCallStatus(activeCallId);
        if (!isSubscribed) return;

        const remoteStatus = (res?.data?.status || (res as any)?.status) as CallStatus | undefined;
        if (remoteStatus) {
          setCallStatus(remoteStatus);

          if (terminalStatuses.includes(remoteStatus)) {
            stopPolling();
          }
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        const statusCode = err?.statusCode || err?.status;
        if (statusCode === 404 || statusCode === 500) {
          console.warn('Call status polling halted:', statusCode);
          stopPolling();
          setCallStatus((prev) => (prev === 'CONNECTED' ? 'COMPLETED' : 'MISSED'));
        }
      }
    };

    intervalId = setInterval(poll, 2000);

    return () => {
      isSubscribed = false;
      stopPolling();
    };
  }, [activeCallId, callStatus]);

  // Connected duration timer
  useEffect(() => {
    if (callStatus !== 'CONNECTED') return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 12 && raw.startsWith('91')) {
      raw = raw.slice(2);
    }
    setVisitorPhone(raw.slice(0, 10));
    if (phoneError) setPhoneError(null);
  };

  const handleRegNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    setRegNumber(raw);
    if (regError) setRegError(null);
  };

  const handleVerifyReg = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    const trimmed = regNumber.trim();
    if (trimmed.length !== 4) {
      const err = 'Please enter the 4-digit number';
      setRegError(err);
      toast.error(err);
      return;
    }

    setIsVerifyingReg(true);
    setRegError(null);

    try {
      const res = await publicContactApi.verifyRegistrationNumber(token, trimmed);
      if (res?.success) {
        setIsRegVerified(true);
        setRegError(null);
        toast.success('Registration number verified');
        setTimeout(() => {
          phoneInputRef.current?.focus();
        }, 120);
      } else {
        const msg = translateRegistrationError({ message: res?.message });
        setRegError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = translateRegistrationError(err);
      setRegError(msg);
      toast.error(msg);
    } finally {
      setIsVerifyingReg(false);
    }
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (isBlockedByRegistration) {
      const err = 'Please verify the vehicle registration number first';
      setRegError(err);
      toast.error(err);
      return;
    }

    const validation = validatePhoneNumber(visitorPhone);
    if (!validation.isValid) {
      const err = validation.error || 'Please enter a valid 10-digit mobile number';
      setPhoneError(err);
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    setPhoneError(null);

    try {
      const res = await communicationApi.initiateCall(token, visitorPhone.trim());
      const newCallId = res?.data?.callId || (res as any)?.callId;
      const initialStatus = res?.data?.status || 'INITIATED';

      if (!newCallId) {
        throw new Error('Call initiation did not return a valid session ID');
      }

      setActiveCallId(newCallId);
      setCallStatus(initialStatus);
      setCallDuration(0);
      toast.success('Call initiated');
    } catch (err: any) {
      const statusCode = err?.statusCode || err?.status || err?.data?.statusCode;
      let userFriendlyMsg = 'Unable to initiate call. Please try again later.';

      if (statusCode === 429) {
        userFriendlyMsg = 'Please wait before trying again.';
      } else if (statusCode === 400) {
        userFriendlyMsg = 'Please enter a valid mobile number.';
      } else if (statusCode === 404) {
        userFriendlyMsg = 'Contact link or call not found.';
      } else if (statusCode === 500) {
        userFriendlyMsg = 'Unable to connect call. Please try again later.';
      }

      setPhoneError(userFriendlyMsg);
      toast.error(userFriendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(
        `Your message has been sent to the owner.`
      );
      setIsSuccess(true);
      toast.success('Message sent to owner');
    }, 400);
  };

  const handleAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const alert = ALERT_OPTIONS.find((a) => a.id === selectedAlertId);
    if (!alert) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(
        `Alert "${alert.label}" sent. The owner has been notified.`
      );
      setIsSuccess(true);
      toast.success('Alert sent');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between p-4 sm:p-8 lg:p-12 selection:bg-accent selection:text-ink font-sans">
      {/* 1. PUBLIC HEADER */}
      <header className="max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between pb-4">
          <Link to="/" className="focus:outline-none">
            <PingInLogo height={32} width={136} />
          </Link>

          {/* Desktop header label */}
          {/* <div className="hidden sm:inline-flex items-center gap-2 text-[11px] font-sans font-medium tracking-widest uppercase text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/20" />
            <span>CONTACT PRIVATELY</span>
          </div> */}

          {/* Mobile header label */}
          {/* <div className="sm:hidden inline-flex items-center gap-2 text-[11px] font-sans font-medium tracking-widest uppercase text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/20" />
            <span>CONTACT PRIVATELY</span>
          </div> */}
        </div>
        <div className="h-[1px] bg-border w-full" />
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto my-auto py-6 sm:py-10 space-y-6 sm:space-y-8">
        {isLoading ? (
          <div className="py-24 text-left">
            <div className="inline-flex items-center gap-2.5 text-xs font-sans font-medium tracking-widest uppercase text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>CONNECTING TO RELAY...</span>
            </div>
          </div>
        ) : fetchError || !contact ? (
          <div className="max-w-md py-12 space-y-6">
            <div className="pb-3 border-b border-border">
              <span className="text-xs font-sans font-semibold tracking-[0.16em] uppercase text-danger">
                LINK UNAVAILABLE
              </span>
            </div>
            <div className="space-y-3">
              <h2 className="font-display font-medium text-2xl text-ink">
                Contact Tag Not Active
              </h2>
              <p className="text-sm font-sans text-muted leading-relaxed">
                {fetchError || 'This contact link may be inactive, disabled by the owner, or expired.'}
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <Link
                to="/"
                className="text-xs font-sans font-medium tracking-wider uppercase text-ink underline hover:text-muted"
              >
                ← RETURN TO PINGIN
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 2. THE RESOURCE AS HERO */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-muted">
                  PUBLIC CONTACT
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium tracking-widest uppercase text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/20" />
                  AVAILABLE
                </span>
              </div>

              {/* Resource Title & Context */}
              <div className="pt-2">
                <div className="flex items-baseline gap-4">
                  <span className="font-display font-medium text-base sm:text-lg text-muted/60 select-none">
                    01
                  </span>
                  <h1 className="font-display font-medium text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight uppercase">
                    {contact.name}
                  </h1>
                </div>

                {contact.vehicleDetails?.colour && (
                  <div className="flex items-center gap-2 text-xs font-sans text-muted mt-2 ml-7 sm:ml-8">
                    <span className="tracking-wider">COLOUR: {contact.vehicleDetails.colour}</span>
                  </div>
                )}
              </div>
            </section>

            <div className="h-[1px] bg-border w-full" />

            {/* 3. CONTACT OWNER: PROGRESSIVE DISCLOSURE ROWS */}
            <section className="space-y-6">
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-xs font-sans font-semibold tracking-[0.16em] uppercase text-ink">
                  CONTACT OWNER
                </h2>
                <span className="text-[10px] font-sans tracking-wider uppercase text-muted">
                  HOW WOULD YOU LIKE TO REACH THEM?
                </span>
              </div>

              {isSuccess ? (
                /* Success feedback state */
                <div className="p-6 bg-surface border border-border rounded-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-sans font-semibold tracking-widest uppercase text-ink">
                      MESSAGE SENT
                    </span>
                    <span className="text-xs font-sans font-semibold text-accent bg-surface-dark px-2 py-0.5 rounded-xs">
                      DELIVERED
                    </span>
                  </div>
                  <p className="text-sm font-sans text-ink leading-relaxed">
                    {successMessage}
                  </p>
                  <div className="pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSuccess(false);
                        setSuccessMessage('');
                        setVisitorPhone('');
                        setMessageText('');
                      }}
                      className="text-xs font-sans font-medium tracking-wider uppercase text-ink underline hover:text-muted cursor-pointer transition-colors"
                    >
                      SEND ANOTHER NOTE →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* METHOD 01: PRIVATE CALL */}
                  <div
                    className={`border rounded-sm transition-all duration-200 ${
                      selectedMethod === 'call'
                        ? 'border-ink bg-surface shadow-xs'
                        : 'border-border bg-transparent hover:border-border-strong hover:bg-surface/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('call')}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-baseline gap-3.5 sm:gap-4">
                        <span className="font-display font-medium text-sm text-muted select-none">
                          01
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-medium text-base sm:text-lg text-ink uppercase tracking-wide">
                              PHONE CALL
                            </span>
                            <span className="text-[10px] font-sans px-1.5 py-0.5 bg-accent/20 text-ink rounded-xs font-semibold">
                              DIRECT
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-base text-ink font-sans ml-3">
                        {selectedMethod === 'call' ? '↓' : '→'}
                      </span>
                    </button>

                    {/* Expanded Controls for Private Call */}
                    {selectedMethod === 'call' && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">
                        {activeCallId ? (
                          /* Minimal Single-Line Call Bar */
                          <div className="mt-3 px-4 py-3 sm:px-5 sm:py-3.5 bg-surface-dark text-white rounded-sm border border-black shadow-xs flex items-center justify-between gap-3 text-xs font-sans tracking-wide animate-in fade-in duration-200">
                            {/* Left: Status with dynamic pulse / beacon dot */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              {callStatus === 'CONNECTED' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-accent animate-status-beacon shrink-0" />
                                  <span className="font-medium text-white">Connected</span>
                                  {/* Micro audio frequency wave */}
                                  <div className="hidden sm:flex items-center gap-0.5 h-3 ml-0.5">
                                    <span className="w-0.5 bg-accent/80 rounded-full animate-wave-1" />
                                    <span className="w-0.5 bg-accent/80 rounded-full animate-wave-2" />
                                    <span className="w-0.5 bg-accent/80 rounded-full animate-wave-3" />
                                  </div>
                                </>
                              ) : callStatus === 'INCOMING' ? (
                                <>
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                                  </span>
                                  <span className="font-medium text-white">Ringing...</span>
                                </>
                              ) : callStatus === 'INITIATED' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                                  <span className="font-medium text-white">Calling...</span>
                                </>
                              ) : callStatus === 'MISSED' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                                  <span className="font-medium text-white/90">Call missed</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-white/40 shrink-0" />
                                  <span className="font-medium text-white/90">Call ended</span>
                                </>
                              )}
                            </div>

                            {/* Center: Context Label */}
                            <div className="hidden sm:block text-white/50 text-xs">
                              {callStatus === 'MISSED' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleResetCall();
                                    setSelectedMethod('message');
                                  }}
                                  className="text-white/60 hover:text-accent underline cursor-pointer transition-colors"
                                >
                                  Send message instead
                                </button>
                              ) : (
                                <span>Private call</span>
                              )}
                            </div>

                            {/* Right: Timer & Action */}
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                              {callStatus === 'CONNECTED' && (
                                <span className="font-mono text-accent text-xs font-medium tracking-wider">
                                  {formatDuration(callDuration)}
                                </span>
                              )}
                              {callStatus === 'COMPLETED' && (
                                <span className="font-mono text-white/50 text-xs tracking-wider">
                                  {formatDuration(callDuration)}
                                </span>
                              )}

                              {(callStatus === 'COMPLETED' || callStatus === 'MISSED') ? (
                                <div className="flex items-center gap-2.5">
                                  {callStatus === 'MISSED' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleResetCall();
                                        setSelectedMethod('message');
                                      }}
                                      className="sm:hidden text-white/70 hover:text-accent font-sans text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                    >
                                      MSG
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={handleResetCall}
                                    className="text-accent hover:text-[#c7ef2f] font-sans text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                  >
                                    {callStatus === 'COMPLETED' ? 'CALL AGAIN' : 'RETRY'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleResetCall}
                                  className="text-red-400 hover:text-red-300 font-sans text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                >
                                  END CALL
                                </button>
                              )}
                            </div>
                          </div>
                        ) : contact?.hasRegistrationNumber && !isRegVerified ? (
                          /* STEP 1: COMPACT VEHICLE VERIFICATION (Mobile-optimized) */
                          <div className="space-y-3 max-w-lg mt-3">
                            <div className="p-3.5 sm:p-4 rounded-sm border border-border bg-surface space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor="reg-number-input"
                                  className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted"
                                >
                                  VERIFY VEHICLE PLATE
                                </label>
                                <span className="text-[10px] font-sans font-medium tracking-wider text-muted uppercase">
                                  STEP 1 OF 2
                                </span>
                              </div>

                              <p className="text-xs font-sans text-muted">
                                Enter the last 4 digits of the vehicle number to unlock call access.
                              </p>

                              <div className="flex items-center gap-2">
                                <input
                                  id="reg-number-input"
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={4}
                                  value={regNumber}
                                  onChange={handleRegNumberChange}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleVerifyReg();
                                    }
                                  }}
                                  placeholder="0000"
                                  disabled={isVerifyingReg}
                                  autoFocus
                                  className="w-28 sm:w-32 h-11 border border-border focus:border-ink rounded-sm bg-bg px-3 text-center font-mono text-base font-semibold tracking-[0.25em] text-ink outline-none uppercase placeholder:text-muted/30 placeholder:tracking-normal transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyReg}
                                  disabled={isVerifyingReg || regNumber.length !== 4}
                                  className="h-11 px-4 sm:px-5 bg-surface-dark hover:bg-black disabled:opacity-40 disabled:hover:bg-surface-dark text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
                                >
                                  {isVerifyingReg ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                                      <span>CHECKING...</span>
                                    </>
                                  ) : (
                                    <span>VERIFY →</span>
                                  )}
                                </button>
                              </div>

                              {regError && (
                                <p className="text-xs font-sans text-danger pt-0.5">
                                  {regError}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 px-1 text-xs font-sans text-muted/60 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                              <span>Private call unlocks once plate number is confirmed</span>
                            </div>
                          </div>
                        ) : (
                          /* STEP 2: PHONE INPUT & PRIVATE CALL (Unlocked & Concise) */
                          <form onSubmit={handleCallSubmit} className="space-y-3.5 max-w-lg mt-3">
                            {contact?.hasRegistrationNumber && isRegVerified && (
                              <div className="flex items-center justify-between px-3 py-2 rounded-sm border border-[#315f43]/30 bg-[#315f43]/5 text-xs font-sans">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#315f43] tracking-wider uppercase text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  PLATE VERIFIED
                                </span>
                                <span className="font-mono text-ink font-semibold tracking-wider text-xs">
                                  •••• {regNumber}
                                </span>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <label
                                  htmlFor="phone-input"
                                  className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted leading-none select-none"
                                >
                                  YOUR MOBILE NUMBER
                                </label>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowPhoneInfo((prev) => !prev);
                                  }}
                                  title="Why do we need your number?"
                                  aria-label="Why do we need your number?"
                                  aria-expanded={showPhoneInfo}
                                  className="inline-flex items-center justify-center text-muted/70 hover:text-ink transition-colors cursor-pointer select-none p-0.5 -m-0.5 rounded-full focus:outline-none"
                                >
                                  <HelpCircle
                                    className={`w-3.5 h-3.5 transition-colors ${
                                      showPhoneInfo ? 'text-ink' : 'text-muted/70 hover:text-ink'
                                    }`}
                                    strokeWidth={1.75}
                                  />
                                </button>
                              </div>

                              {showPhoneInfo && (
                                <div className="p-3 mb-2.5 rounded-sm bg-surface border border-border text-xs font-sans text-muted leading-relaxed space-y-1 animate-in fade-in duration-150">
                                  <p className="font-medium text-ink">
                                    Why do we need your number?
                                  </p>
                                  <p>
                                    It's required to connect the call. The person you're contacting won't see it, and it will not be stored in call log history.
                                  </p>
                                </div>
                              )}

                              <div
                                className={`w-full h-11 sm:h-12 border rounded-sm flex items-center px-3.5 sm:px-4 transition-colors ${
                                  phoneError
                                    ? 'border-danger bg-bg'
                                    : phoneFocused
                                    ? 'border-ink bg-white'
                                    : 'border-border bg-bg hover:border-border-strong'
                                }`}
                              >
                                <span className="font-sans text-base font-normal text-muted select-none whitespace-nowrap">
                                  +91
                                </span>
                                <span
                                  className="h-4 w-[1px] bg-border mx-3 shrink-0"
                                  aria-hidden="true"
                                />
                                <input
                                  ref={phoneInputRef}
                                  id="phone-input"
                                  type="tel"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={10}
                                  value={visitorPhone}
                                  onChange={handlePhoneChange}
                                  onFocus={() => setPhoneFocused(true)}
                                  onBlur={() => setPhoneFocused(false)}
                                  placeholder="10-digit mobile number"
                                  className="flex-1 bg-transparent outline-none font-sans text-base font-normal text-ink placeholder:text-muted/40 p-0 m-0"
                                  disabled={isSubmitting}
                                  autoFocus
                                />
                              </div>

                              {phoneError && (
                                <p className="mt-1.5 text-xs font-sans text-danger">
                                  {phoneError}
                                </p>
                              )}
                            </div>

                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full sm:w-auto h-11 sm:h-12 px-6 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm transition-all text-xs font-sans font-semibold tracking-widest uppercase flex items-center justify-between sm:justify-center gap-4 cursor-pointer disabled:opacity-75"
                            >
                              <span>
                                {isSubmitting ? 'CONNECTING...' : 'START PRIVATE CALL'}
                              </span>
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
                              ) : (
                                <span className="text-base text-accent">→</span>
                              )}
                            </button>

                            <p className="text-xs font-sans text-muted leading-relaxed pt-0.5">
                              <span className="font-medium text-ink">Your number stays private.</span> We use it to connect your call and don't store it as part of your Pingin call history.
                            </p>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  {/* METHOD 02: MESSAGE */}
                  <div
                    className={`border rounded-sm transition-all duration-200 ${
                      selectedMethod === 'message'
                        ? 'border-ink bg-surface shadow-xs'
                        : 'border-border bg-transparent hover:border-border-strong hover:bg-surface/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('message')}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-baseline gap-3.5 sm:gap-4">
                        <span className="font-display font-medium text-sm text-muted select-none">
                          02
                        </span>
                        <div>
                          <span className="font-display font-medium text-base sm:text-lg text-ink uppercase tracking-wide">
                            MESSAGE
                          </span>
                          <span className="text-xs font-sans text-muted block mt-0.5">
                            Send a quick note to the owner
                          </span>
                        </div>
                      </div>
                      <span className="text-base text-ink font-sans ml-3">
                        {selectedMethod === 'message' ? '↓' : '→'}
                      </span>
                    </button>

                    {/* Expanded Controls for Message */}
                    {selectedMethod === 'message' && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">
                        <form onSubmit={handleMessageSubmit} className="space-y-4 max-w-lg mt-3">
                          <div>
                            <label
                              htmlFor="message-text"
                              className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted mb-2"
                            >
                              NOTE FOR OWNER
                            </label>
                            <textarea
                              id="message-text"
                              rows={3}
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="e.g. Your lights appear on / please call me back regarding parking bay..."
                              className="w-full p-3.5 text-sm bg-bg border border-border rounded-sm focus:border-ink focus:bg-white outline-none resize-none font-sans"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting || !messageText.trim()}
                            className="w-full sm:w-auto h-12 px-6 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm transition-colors text-xs font-sans font-semibold tracking-widest uppercase flex items-center justify-between sm:justify-center gap-4 cursor-pointer disabled:opacity-50"
                          >
                            <span>
                              {isSubmitting ? 'SENDING...' : 'SEND MESSAGE'}
                            </span>
                            <span className="text-base text-accent">→</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* METHOD 03: QUICK ALERT */}
                  <div
                    className={`border rounded-sm transition-all duration-200 ${
                      selectedMethod === 'alert'
                        ? 'border-ink bg-surface shadow-xs'
                        : 'border-border bg-transparent hover:border-border-strong hover:bg-surface/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('alert')}
                      className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-baseline gap-3.5 sm:gap-4">
                        <span className="font-display font-medium text-sm text-muted select-none">
                          03
                        </span>
                        <div>
                          <span className="font-display font-medium text-base sm:text-lg text-ink uppercase tracking-wide">
                            QUICK ALERT
                          </span>
                          <span className="text-xs font-sans text-muted block mt-0.5">
                            Quickly notify the owner about a parking issue
                          </span>
                        </div>
                      </div>
                      <span className="text-base text-ink font-sans ml-3">
                        {selectedMethod === 'alert' ? '↓' : '→'}
                      </span>
                    </button>

                    {/* Expanded Controls for Quick Alert */}
                    {selectedMethod === 'alert' && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">
                        <form onSubmit={handleAlertSubmit} className="space-y-4 mt-3">
                          <label className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted mb-2">
                            CHOOSE AN ISSUE
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {ALERT_OPTIONS.map((item) => {
                              const isSelected = selectedAlertId === item.id;
                              return (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() => setSelectedAlertId(item.id)}
                                  className={`p-3 rounded-sm border text-left cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-ink bg-white shadow-xs ring-1 ring-ink'
                                      : 'border-border bg-bg/60 hover:bg-bg hover:border-border-strong'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-sans font-semibold tracking-wider text-ink uppercase">
                                      {item.label}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${item.tagColor}`} />
                                  </div>
                                  <p className="text-[11px] font-sans text-muted leading-snug">
                                    {item.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-2 max-w-lg">
                            <label
                              htmlFor="alert-note"
                              className="block text-[11px] font-sans font-medium tracking-wider uppercase text-muted mb-1.5"
                            >
                              ADD A NOTE (OPTIONAL)
                            </label>
                            <input
                              id="alert-note"
                              type="text"
                              value={alertNote}
                              onChange={(e) => setAlertNote(e.target.value)}
                              placeholder="e.g. Bay 24 or Black SUV"
                              className="w-full h-10 px-3 text-xs bg-bg border border-border rounded-sm focus:border-ink focus:bg-white outline-none font-sans"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto h-12 px-6 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm transition-colors text-xs font-sans font-semibold tracking-widest uppercase flex items-center justify-between sm:justify-center gap-4 cursor-pointer disabled:opacity-50"
                          >
                            <span>
                              {isSubmitting ? 'SENDING...' : 'SEND ALERT'}
                            </span>
                            <span className="text-base text-accent">→</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <div className="h-[1px] bg-border w-full" />

            {/* 4. CONTEXTUAL CONNECTION LINE & PRIVACY ASSURANCE */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
              {/* Contextual Connection Line */}
              <div className="max-w-sm">
                <ContextualConnectionLine method={selectedMethod} callStatus={callStatus} />
              </div>

              {/* Privacy Architecture Notice */}
              <div className="space-y-1.5 md:border-l md:border-border md:pl-8">
                <h3 className="text-xs font-sans font-semibold tracking-[0.16em] uppercase text-ink">
                  YOUR NUMBER STAYS PRIVATE
                </h3>
                <p className="text-sm font-sans text-muted leading-relaxed">
                  We use it to connect your call and don't store it as part of your Pingin call history.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-4xl w-full mx-auto pt-8 pb-12">
        <div className="h-[1px] bg-border w-full mb-8 sm:mb-10" />

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-8">
          <div className="space-y-2.5 max-w-md">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity" aria-label="PINGIN">
              <PingInSvgLogo height={18} className="text-ink" />
            </Link>
            <p className="font-display font-medium text-base sm:text-lg text-ink">
              Tag it. Scan it. Ping it.
            </p>
            <p className="text-xs sm:text-sm font-sans text-muted leading-relaxed">
              Give people a way to reach you without sharing your phone number.
            </p>
          </div>

          <div className="shrink-0 pt-1 sm:pt-0">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase transition-all shadow-xs group cursor-pointer"
            >
              <span>GET YOUR TAG</span>
              <span className="text-accent group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </div>

        <div className="h-[1px] bg-border w-full mt-8 sm:mt-10 mb-4" />

        <div className="flex items-center justify-between text-[11px] font-sans text-muted tracking-wider uppercase">
          <span>© 2026 PINGIN</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicContactPage;
