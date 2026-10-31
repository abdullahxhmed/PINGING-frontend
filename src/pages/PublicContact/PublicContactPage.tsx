import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { publicContactApi, communicationApi } from '../../lib/api';
import type { PublicResourceContact, CallStatus } from '../../types/api';
import { validatePhoneNumber, useToast, DelayedSpinner } from '../../components/ui';
import { PingInLogo, PingInSvgLogo } from '../../components/brand/PingInLogo';
import { Loader2, Check, HelpCircle, Phone, Globe, ChevronDown } from 'lucide-react';
import {
  type LanguageCode,
  SUPPORTED_LANGUAGES,
  CONTACT_TRANSLATIONS,
} from './locales';

type ContactMethod = 'call' | 'message' | 'alert';

interface AlertOption {
  id: string;
  label: string;
  description: string;
  tag: 'ACCESS' | 'URGENT' | 'NOTICE';
  tagColor: string;
}

/**
 * Returns a static hex color swatch for common vehicle colors
 */
function getColourSwatch(colour?: string): string | null {
  if (!colour) return null;
  const c = colour.trim().toLowerCase();
  const map: Record<string, string> = {
    black: '#171717',
    white: '#FFFFFF',
    silver: '#C0C0C0',
    grey: '#6B7280',
    gray: '#6B7280',
    red: '#DC2626',
    blue: '#2563EB',
    navy: '#1E3A8A',
    green: '#16A34A',
    yellow: '#EAB308',
    orange: '#EA580C',
    brown: '#78350F',
    gold: '#D97706',
    beige: '#D4C5B9',
    maroon: '#800000',
    bronze: '#CD7F32',
    charcoal: '#374151',
  };
  return map[c] || null;
}

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

  // Paused tag check
  if (rawMessage.includes('paused') || err?.data?.message?.includes('paused')) {
    return 'This QR tag is currently paused by the owner. Calls are temporarily disabled.';
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

  // Language & Translation state
  const [lang, setLang] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('kauntact_lang') as LanguageCode | null;
    if (stored && ['en', 'hi', 'ur', 'mr'].includes(stored)) return stored;
    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('hi')) return 'hi';
    if (browserLang.startsWith('ur')) return 'ur';
    if (browserLang.startsWith('mr')) return 'mr';
    return 'en';
  });

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    if (!isLangDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLangDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLangDropdownOpen]);

  const handleLanguageChange = (newLang: LanguageCode) => {
    setLang(newLang);
    setIsLangDropdownOpen(false);
    try {
      localStorage.setItem('kauntact_lang', newLang);
    } catch {}
  };

  const currentLangOption = useMemo(
    () => SUPPORTED_LANGUAGES.find((item) => item.code === lang) || SUPPORTED_LANGUAGES[0],
    [lang]
  );

  const t = CONTACT_TRANSLATIONS[lang] || CONTACT_TRANSLATIONS.en;
  const isRtl = lang === 'ur';

  const alertOptions = useMemo<AlertOption[]>(() => [
    {
      id: 'blocking',
      label: t.alert_blocking_label,
      description: t.alert_blocking_desc,
      tag: 'ACCESS' as const,
      tagColor: 'bg-[#a33b32]',
    },
    {
      id: 'lights',
      label: t.alert_lights_label,
      description: t.alert_lights_desc,
      tag: 'NOTICE' as const,
      tagColor: 'bg-[#b45309]',
    },
    {
      id: 'window',
      label: t.alert_window_label,
      description: t.alert_window_desc,
      tag: 'NOTICE' as const,
      tagColor: 'bg-[#475569]',
    },
    {
      id: 'alarm',
      label: t.alert_alarm_label,
      description: t.alert_alarm_desc,
      tag: 'URGENT' as const,
      tagColor: 'bg-[#a33b32]',
    },
    {
      id: 'tow',
      label: t.alert_tow_label,
      description: t.alert_tow_desc,
      tag: 'URGENT' as const,
      tagColor: 'bg-[#a33b32]',
    },
  ], [t]);

  const [contact, setContact] = useState<PublicResourceContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Progressive disclosure active method (collapsed by default on arrival)
  const [selectedMethod, setSelectedMethod] = useState<ContactMethod | null>(null);

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

  // Tag Visit Beacon & Analytics Source Tracking
  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams(window.location.search);
    const rawSource = params.get('src') || 'direct';
    const source = ['qr_scan', 'share', 'direct'].includes(rawSource) ? rawSource : 'direct';

    // 1. Strip ?src= from address bar so sharing doesn't propagate it
    if (params.has('src')) {
      params.delete('src');
      const cleanUrl =
        window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', cleanUrl);
    }

    // 2. Generate and store visitId in sessionStorage
    const visitId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    try {
      sessionStorage.setItem('active_visit_id', visitId);
    } catch {
      // Ignore sessionStorage errors
    }

    // 3. Send beacon
    publicContactApi.recordVisit(token, visitId, source).catch(() => {});
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

    if (contact?.isPaused) {
      const err = 'This QR tag is currently paused by the owner. Calls are temporarily disabled.';
      setPhoneError(err);
      toast.error(err);
      return;
    }

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
      const activeVisitId =
        typeof window !== 'undefined' ? sessionStorage.getItem('active_visit_id') : null;
      const res = await communicationApi.initiateCall(token, visitorPhone.trim(), activeVisitId);
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

      if (statusCode === 403 || err?.message?.includes('paused') || err?.data?.message?.includes('paused')) {
        userFriendlyMsg = 'This QR tag is currently paused by the owner. Calls are temporarily disabled.';
      } else if (statusCode === 429) {
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
      setSuccessMessage(t.success_message_sent);
      setIsSuccess(true);
      toast.success(t.message_sent);
    }, 400);
  };

  const handleAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const alert = alertOptions.find((a) => a.id === selectedAlertId);
    if (!alert) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(t.success_alert_sent(alert.label));
      setIsSuccess(true);
      toast.success(t.delivered);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between p-4 sm:p-8 lg:p-12 selection:bg-accent selection:text-ink font-sans">
      {/* 1. PUBLIC HEADER WITH LANGUAGE SWITCHER DROPDOWN */}
      <header className="max-w-4xl w-full mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between pb-4">
          <Link to="/" className="focus:outline-none -ml-1 sm:ml-0 rtl:-mr-1 rtl:sm:mr-0 rtl:ml-0" aria-label="Kauntact Home">
            <PingInLogo height={16} />
          </Link>

          {/* Language Switcher Icon Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen((prev) => !prev)}
              aria-label="Select language"
              aria-expanded={isLangDropdownOpen}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border text-xs font-sans font-medium flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none ${
                isLangDropdownOpen
                  ? 'bg-ink text-[#F5F4EE] border-ink shadow-xs'
                  : 'bg-surface hover:bg-white text-ink border-border hover:border-border-strong shadow-2xs'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentLangOption.code}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="font-medium text-xs"
                >
                  {currentLangOption.nativeLabel}
                </motion.span>
              </AnimatePresence>
              <ChevronDown
                className="w-3 h-3 shrink-0 opacity-60 transition-transform duration-250 ease-out"
                style={{
                  transform: isLangDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isLangDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute ${
                    isRtl ? 'left-0' : 'right-0'
                  } top-full mt-2 w-48 sm:w-52 bg-surface border border-border rounded-sm shadow-md py-1.5 z-50 overflow-hidden backdrop-blur-sm`}
                >
                  <div className="px-3 py-1.5 text-[10px] font-sans font-medium tracking-wider uppercase text-muted border-b border-border/60">
                    Language / भाषा / زبان
                  </div>
                  <div className="p-1 space-y-0.5">
                    {SUPPORTED_LANGUAGES.map((item) => {
                      const isSelected = item.code === lang;
                      return (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleLanguageChange(item.code)}
                          className={`w-full px-3 py-2 rounded-xs flex items-center justify-between text-start text-xs font-sans transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-ink text-[#F5F4EE] font-medium'
                              : 'text-ink hover:bg-bg'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium leading-snug">
                              {item.nativeLabel}
                            </span>
                            {item.label !== item.nativeLabel && (
                              <span
                                className={`text-[11px] ${
                                  isSelected ? 'text-[#F5F4EE]/70' : 'text-muted'
                                }`}
                              >
                                {item.label}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Check className="w-3.5 h-3.5 shrink-0 text-accent" />
                            </motion.span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="h-[1px] bg-border w-full" />
      </header>

      {/* MAIN CONTAINER */}
      <main dir={isRtl ? 'rtl' : 'ltr'} className="max-w-4xl w-full mx-auto my-auto py-6 sm:py-10 space-y-6 sm:space-y-8">
        {isLoading ? (
          <DelayedSpinner delay={180}>
            <div className="py-24 text-left">
              <div className="inline-flex items-center gap-2.5 text-xs font-sans font-medium tracking-widest uppercase text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>CONNECTING TO RELAY...</span>
              </div>
            </div>
          </DelayedSpinner>
        ) : fetchError || !contact ? (
          <div className="max-w-md py-12 space-y-6 animate-fade-in">
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
                ← RETURN TO KAUNTACT
              </Link>
            </div>
          </div>
        ) : (
          <motion.div
            key={lang}
            initial={{ opacity: 0.65, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 sm:space-y-8"
          >
            {/* 2. THE RESOURCE AS HERO */}
            <section>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display font-medium text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight">
                    {contact.name}
                  </h1>
                  {contact.vehicleDetails?.colour && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {getColourSwatch(contact.vehicleDetails.colour) && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: getColourSwatch(contact.vehicleDetails.colour)! }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-sans text-sm text-[#55524A]">
                        {contact.vehicleDetails.colour}
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 pt-2 sm:pt-3">
                  <span className="text-xs font-sans font-medium text-ink">
                    {contact.isPaused ? t.paused : t.available}
                  </span>
                </div>
              </div>
            </section>

            <div className="h-[1px] bg-border w-full" />

            {/* 3. CONTACT METHODS */}
            <section className="space-y-3">

              {contact.isPaused ? (
                /* Paused state notice */
                <div className="p-6 sm:p-8 bg-surface border border-border rounded-sm space-y-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-sans font-semibold tracking-widest uppercase text-muted">
                      {t.paused.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-display font-medium text-xl sm:text-2xl text-ink leading-snug">
                    {t.tag_paused_title}
                  </h3>
                  <p className="font-satoshi text-sm text-[#3A3A36] leading-relaxed">
                    {t.tag_paused_desc}
                  </p>
                </div>
              ) : isSuccess ? (
                /* Success feedback state */
                <div className="p-6 bg-surface border border-border rounded-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-sans font-semibold tracking-widest uppercase text-ink">
                      {t.message_sent}
                    </span>
                    <span className="text-xs font-sans font-semibold text-accent bg-surface-dark px-2 py-0.5 rounded-xs">
                      {t.delivered}
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
                      {t.send_another_note}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* METHOD: CALL OWNER */}
                  <div className="border border-[#11110F] rounded-sm overflow-hidden bg-surface transition-all">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod((prev) => (prev === 'call' ? null : 'call'))}
                      className="w-full min-h-[72px] p-4 sm:p-5 flex items-center justify-between text-start cursor-pointer bg-[#11110F] text-[#F5F4EE] focus:outline-none"
                    >
                      <div>
                        <div className="font-sans font-medium text-[17px] text-[#F5F4EE] leading-snug">
                          {t.call_owner}
                        </div>
                        <div className="font-satoshi text-xs sm:text-[13px] text-[#F5F4EE]/70 mt-0.5">
                          {t.number_not_shown}
                        </div>
                      </div>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xs bg-accent text-ink flex items-center justify-center shrink-0 ml-3 rtl:mr-3 rtl:ml-0">
                        <Phone className="w-4 h-4 fill-ink" />
                      </div>
                    </button>

                    {/* Expanded Controls for Private Call */}
                    <AnimatePresence initial={false}>
                      {selectedMethod === 'call' && (
                        <motion.div
                          key="call-controls"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                            transition: {
                              height: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.28, delay: 0.06, ease: 'easeOut' },
                            },
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                            transition: {
                              height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.18, ease: 'easeIn' },
                            },
                          }}
                          className="overflow-hidden border-t border-border bg-surface"
                        >
                          <div className="px-4 sm:px-5 pb-5 pt-1">
                        <AnimatePresence mode="wait" initial={false}>
                        {activeCallId ? (
                          /* Minimal Single-Line Call Bar */
                          <motion.div
                            key="call-bar"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: 'easeOut' }}
                            className="mt-3 px-4 py-3 sm:px-5 sm:py-3.5 bg-surface-dark text-white rounded-sm border border-black shadow-xs flex items-center justify-between gap-3 text-xs font-sans tracking-wide"
                          >
                            {/* Left: Status with dynamic pulse / beacon dot */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              {callStatus === 'CONNECTED' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-accent animate-status-beacon shrink-0" />
                                  <span className="font-medium text-white">{t.call_connected}</span>
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
                                  <span className="font-medium text-white">{t.call_ringing}</span>
                                </>
                              ) : callStatus === 'INITIATED' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                                  <span className="font-medium text-white">{t.call_calling}</span>
                                </>
                              ) : callStatus === 'MISSED' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                                  <span className="font-medium text-white/90">{t.call_missed}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-white/40 shrink-0" />
                                  <span className="font-medium text-white/90">{t.call_ended}</span>
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
                                  {t.send_msg_instead}
                                </button>
                              ) : (
                                <span>{t.private_call}</span>
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
                                    {callStatus === 'COMPLETED' ? t.btn_call_again : t.btn_retry}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleResetCall}
                                  className="text-red-400 hover:text-red-300 font-sans text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                                >
                                  {t.btn_end_call}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ) : contact?.hasRegistrationNumber && !isRegVerified ? (
                          /* STEP 1: COMPACT VEHICLE VERIFICATION (Mobile-optimized) */
                          <motion.div
                            key="plate-verification"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: 'easeOut' }}
                            className="space-y-3 max-w-lg mt-3"
                          >
                            <div className="p-3.5 sm:p-4 rounded-sm border border-border bg-surface space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor="reg-number-input"
                                  className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted"
                                >
                                  {t.verify_plate}
                                </label>
                                <span className="text-[10px] font-sans font-medium tracking-wider text-muted uppercase">
                                  {t.step_1_of_2}
                                </span>
                              </div>

                              <p className="text-xs font-sans text-muted">
                                {t.verify_plate_desc}
                              </p>

                              <div className="flex items-center gap-2" dir="ltr">
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
                                      <span>{t.checking}</span>
                                    </>
                                  ) : (
                                    <span>{t.btn_verify}</span>
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
                              <span>{t.plate_unlock_note}</span>
                            </div>
                          </motion.div>
                        ) : (
                          /* STEP 2: PHONE INPUT & PRIVATE CALL (Unlocked & Concise) */
                          <motion.form
                            key="phone-form"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24, ease: 'easeOut' }}
                            onSubmit={handleCallSubmit}
                            className="space-y-3.5 max-w-lg mt-3"
                          >
                            {contact?.hasRegistrationNumber && isRegVerified && (
                              <div className="flex items-center justify-between px-3 py-2 rounded-sm border border-[#315f43]/30 bg-[#315f43]/5 text-xs font-sans">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#315f43] tracking-wider text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  {t.plate_verified}
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
                                  {t.your_mobile_number}
                                </label>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowPhoneInfo((prev) => !prev);
                                  }}
                                  title={t.why_need_number_title}
                                  aria-label={t.why_need_number_title}
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

                              <AnimatePresence>
                                {showPhoneInfo && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3 rounded-sm bg-surface border border-border text-xs font-sans text-muted leading-relaxed space-y-1">
                                      <p className="font-medium text-ink">
                                        {t.why_need_number_title}
                                      </p>
                                      <p>
                                        {t.why_need_number_desc}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div
                                dir="ltr"
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
                                  placeholder={t.phone_placeholder}
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
                                {isSubmitting ? t.connecting : t.btn_start_call}
                              </span>
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
                              ) : (
                                <span className="text-base text-accent">→</span>
                              )}
                            </button>

                            <p className="text-xs font-sans text-muted leading-relaxed pt-0.5">
                              <span className="font-medium text-ink">{t.privacy_statement}</span> {t.privacy_sub}
                            </p>
                          </motion.form>
                        )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

                  {/* METHOD: SEND A MESSAGE */}
                  <div
                    className={`border border-border rounded-sm bg-surface transition-colors duration-250 overflow-hidden ${
                      selectedMethod === 'message'
                        ? 'border-ink shadow-xs'
                        : 'hover:border-border-strong'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMethod((prev) => (prev === 'message' ? null : 'message'))}
                      className="w-full min-h-[64px] p-4 sm:p-5 flex items-center justify-between text-start cursor-pointer focus:outline-none"
                    >
                      <div>
                        <div className="font-sans font-medium text-[16px] text-ink leading-snug">
                          {t.send_message}
                        </div>
                        <div className="font-satoshi text-[14px] text-[#3A3A36] mt-0.5">
                          {t.send_message_sub}
                        </div>
                      </div>
                      <div
                        className="text-base text-ink font-sans ml-3 rtl:mr-3 rtl:ml-0 select-none transition-transform duration-300 ease-[0.16,1,0.3,1] shrink-0"
                        style={{
                          transform: selectedMethod === 'message' ? (isRtl ? 'rotate(-90deg)' : 'rotate(90deg)') : (isRtl ? 'scaleX(-1)' : 'none'),
                        }}
                      >
                        →
                      </div>
                    </button>

                    {/* Expanded Controls for Message */}
                    <AnimatePresence initial={false}>
                      {selectedMethod === 'message' && (
                        <motion.div
                          key="message-controls"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                            transition: {
                              height: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.28, delay: 0.06, ease: 'easeOut' },
                            },
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                            transition: {
                              height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.18, ease: 'easeIn' },
                            },
                          }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="px-4 sm:px-5 pb-5 pt-1">
                            <form onSubmit={handleMessageSubmit} className="space-y-4 max-w-lg mt-3">
                              <div>
                                <label
                                  htmlFor="message-text"
                                  className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted mb-2 text-start"
                                >
                                  {t.note_for_owner}
                                </label>
                                <textarea
                                  id="message-text"
                                  rows={3}
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder={t.message_placeholder}
                                  className="w-full p-3.5 text-sm bg-bg border border-border rounded-sm focus:border-ink focus:bg-white outline-none resize-none font-sans text-start"
                                  required
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={isSubmitting || !messageText.trim()}
                                className="w-full sm:w-auto h-12 px-6 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm transition-colors text-xs font-sans font-semibold tracking-widest uppercase flex items-center justify-between sm:justify-center gap-4 cursor-pointer disabled:opacity-50"
                              >
                                <span>
                                  {isSubmitting ? t.sending : t.btn_send_message}
                                </span>
                                <span className={`text-base text-accent ${isRtl ? 'scale-x-[-1]' : ''}`}>→</span>
                              </button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* METHOD: REPORT AN ISSUE */}
                  <div
                    className={`border border-border rounded-sm bg-surface transition-colors duration-250 overflow-hidden ${
                      selectedMethod === 'alert'
                        ? 'border-ink shadow-xs'
                        : 'hover:border-border-strong'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMethod((prev) => (prev === 'alert' ? null : 'alert'))}
                      className="w-full min-h-[64px] p-4 sm:p-5 flex items-center justify-between text-start cursor-pointer focus:outline-none"
                    >
                      <div>
                        <div className="font-sans font-medium text-[16px] text-ink leading-snug">
                          {t.report_issue}
                        </div>
                        <div className="font-satoshi text-[14px] text-[#3A3A36] mt-0.5">
                          {t.report_issue_sub}
                        </div>
                      </div>
                      <div
                        className="text-base text-ink font-sans ml-3 rtl:mr-3 rtl:ml-0 select-none transition-transform duration-300 ease-[0.16,1,0.3,1] shrink-0"
                        style={{
                          transform: selectedMethod === 'alert' ? (isRtl ? 'rotate(-90deg)' : 'rotate(90deg)') : (isRtl ? 'scaleX(-1)' : 'none'),
                        }}
                      >
                        →
                      </div>
                    </button>

                    {/* Expanded Controls for Quick Alert */}
                    <AnimatePresence initial={false}>
                      {selectedMethod === 'alert' && (
                        <motion.div
                          key="alert-controls"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                            transition: {
                              height: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.28, delay: 0.06, ease: 'easeOut' },
                            },
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                            transition: {
                              height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.18, ease: 'easeIn' },
                            },
                          }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="px-4 sm:px-5 pb-5 pt-1">
                            <form onSubmit={handleAlertSubmit} className="space-y-4 mt-3">
                              <label className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted mb-2 text-start">
                                {t.choose_an_issue}
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {alertOptions.map((item) => {
                                  const isSelected = selectedAlertId === item.id;
                                  return (
                                    <button
                                      type="button"
                                      key={item.id}
                                      onClick={() => setSelectedAlertId(item.id)}
                                      className={`p-3 rounded-sm border text-start cursor-pointer transition-all ${
                                        isSelected
                                          ? 'border-ink bg-white shadow-xs ring-1 ring-ink'
                                          : 'border-border bg-bg/60 hover:bg-bg hover:border-border-strong'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-sans font-medium text-ink">
                                          {item.label}
                                        </span>
                                      </div>
                                      <p className="text-[11px] font-sans text-muted truncate">
                                        {item.description}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="pt-2 max-w-lg">
                                <label
                                  htmlFor="alert-note"
                                  className="block text-[11px] font-sans font-medium tracking-wider uppercase text-muted mb-1.5 text-start"
                                >
                                  {t.add_note_optional}
                                </label>
                                <input
                                  id="alert-note"
                                  type="text"
                                  value={alertNote}
                                  onChange={(e) => setAlertNote(e.target.value)}
                                  placeholder={t.note_placeholder}
                                  className="w-full h-10 px-3 text-xs bg-bg border border-border rounded-sm focus:border-ink focus:bg-white outline-none font-sans text-start"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto h-12 px-6 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm transition-colors text-xs font-sans font-semibold tracking-widest uppercase flex items-center justify-between sm:justify-center gap-4 cursor-pointer disabled:opacity-50"
                              >
                                <span>
                                  {isSubmitting ? t.sending : t.btn_send_alert}
                                </span>
                                <span className={`text-base text-accent ${isRtl ? 'scale-x-[-1]' : ''}`}>→</span>
                              </button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </section>

            <div className="h-[1px] bg-border w-full" />

            {/* 4. PRIVACY ASSURANCE & FAIR USE DISCLAIMER */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-1">

              {/* Fair Use / Blacklist Disclaimer */}
              <div className="space-y-1.5 md:border-l md:border-border md:pl-8 rtl:md:border-l-0 rtl:md:border-r rtl:md:border-border rtl:md:pr-8 rtl:md:pl-0 text-start">
                <h3 className="text-xs font-sans font-semibold text-ink">
                  {t.fair_use_title}
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[#55524A] leading-relaxed">
                  {t.fair_use_desc}
                </p>
              </div>
            </section>

            {/* 5. HIGHLIGHTED GET YOUR OWN TAG PROMO */}
            <div className="p-5 sm:p-6 rounded-sm bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1 max-w-md text-start">
                <h3 className="font-display font-medium text-lg sm:text-xl text-ink">
                  {t.promo_title}
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[#55524A] leading-relaxed">
                  {t.promo_desc}
                </p>
              </div>
              <Link
                to="/shop"
                className="h-11 px-5 bg-surface-dark hover:bg-black text-[#F5F4EE] rounded-sm text-xs font-sans font-semibold tracking-widest uppercase inline-flex items-center justify-center gap-2.5 shrink-0 transition-all shadow-xs group cursor-pointer"
              >
                <span>{t.btn_get_tag}</span>
                <span className={`text-accent group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform ${isRtl ? 'scale-x-[-1]' : ''}`}>→</span>
              </Link>
            </div>
          </motion.div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-4xl w-full mx-auto pt-6 pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="h-[1px] bg-border w-full mb-6" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans text-[#55524A]">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity" aria-label="Kauntact">
              <PingInSvgLogo height={12} className="text-ink" />
            </Link>
            <Link
              to="/privacy"
              className="text-[#55524A] hover:text-ink transition-colors"
            >
              {t.footer_privacy}
            </Link>
          </div>
          <span dir="ltr">© {new Date().getFullYear()} Kauntact</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicContactPage;
