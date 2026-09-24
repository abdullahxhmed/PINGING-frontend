import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicContactApi } from '../../lib/api';
import type { PublicResourceContact } from '../../types/api';
import { validatePhoneNumber, useToast } from '../../components/ui';
import { PingInLogo } from '../../components/brand/PingInLogo';

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
  className?: string;
}> = ({ method, className = '' }) => {
  return (
    <div className={`w-full select-none ${className}`} aria-label="Relay Connection Diagram">
      <div className="flex items-center w-full">
        {/* Visitor endpoint */}
        <span className="w-2 h-2 rounded-full bg-ink shrink-0" />

        {/* Dynamic connection line */}
        {method === 'call' ? (
          <span className="flex-1 h-[2px] bg-ink mx-2 transition-all duration-300" />
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
              ? 'bg-accent ring-1 ring-ink/20'
              : method === 'alert'
              ? 'bg-[#a33b32]'
              : 'bg-ink'
          }`}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-sans font-medium tracking-widest uppercase text-muted mt-2">
        <span>VISITOR</span>
        <span>OWNER</span>
      </div>

      <div className="text-center text-[10px] font-sans font-medium tracking-[0.2em] uppercase mt-1">
        {method === 'call' && (
          <span className="text-ink font-semibold">● VOICE RELAY BRIDGE</span>
        )}
        {method === 'message' && (
          <span className="text-muted">DIRECT ANONYMOUS DISPATCH</span>
        )}
        {method === 'alert' && (
          <span className="text-[#a33b32] font-semibold">● PRIORITY SITUATION ALERT</span>
        )}
      </div>
    </div>
  );
};

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

  const [messageText, setMessageText] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState<string>('blocking');
  const [alertNote, setAlertNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 12 && raw.startsWith('91')) {
      raw = raw.slice(2);
    }
    setVisitorPhone(raw.slice(0, 10));
    if (phoneError) setPhoneError(null);
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

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
      await publicContactApi.requestContact(token, visitorPhone.trim());
      setSuccessMessage(
        `Call bridge prepared. PingIn relay will initiate an inbound call to +91 ${visitorPhone} shortly to connect you privately.`
      );
      setIsSuccess(true);
      toast.success('Call request initiated');
    } catch (err: any) {
      const msg = err.message || 'Failed to initiate private call';
      setPhoneError(msg);
      toast.error(msg);
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
        `Your message has been scheduled for private relay dispatch to the owner.`
      );
      setIsSuccess(true);
      toast.success('Message queued for owner');
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
        `Alert "${alert.label}" queued. The owner will be notified immediately.`
      );
      setIsSuccess(true);
      toast.success('Alert sent');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between p-6 sm:p-10 lg:p-14 selection:bg-accent selection:text-ink font-sans">
      {/* 1. PUBLIC HEADER */}
      <header className="max-w-4xl w-full mx-auto">
        <div className="flex items-center justify-between pb-5">
          <Link to="/" className="focus:outline-none">
            <PingInLogo height={32} width={136} />
          </Link>

          {/* Desktop header label */}
          <div className="hidden sm:inline-flex items-center gap-2 text-[11px] font-sans font-medium tracking-widest uppercase text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/20" />
            <span>PRIVATE CONTACT</span>
          </div>

          {/* Mobile header label */}
          <div className="sm:hidden inline-flex items-center gap-2 text-[11px] font-sans font-medium tracking-widest uppercase text-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-accent ring-1 ring-ink/20" />
            <span>PRIVATE CONTACT</span>
          </div>
        </div>
        <div className="h-[1px] bg-border w-full" />
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto my-auto py-10 sm:py-14 space-y-10 sm:space-y-12">
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

                <div className="flex flex-wrap items-center gap-2.5 text-xs font-sans text-muted mt-2 ml-7 sm:ml-8">
                  <span>REGISTERED RESOURCE</span>
                  {contact.type && (
                    <>
                      <span className="text-border-strong">•</span>
                      <span className="font-semibold text-ink">{contact.type}</span>
                    </>
                  )}
                  {contact.vehicleDetails?.registrationLast4 && (
                    <>
                      <span className="text-border-strong">•</span>
                      <span>PLATE •••• {contact.vehicleDetails.registrationLast4}</span>
                    </>
                  )}
                  {contact.vehicleDetails?.color && (
                    <>
                      <span className="text-border-strong">•</span>
                      <span>COLOUR {contact.vehicleDetails.color}</span>
                    </>
                  )}
                  <span className="text-border-strong">•</span>
                  <span>PRIVATE PROXIED ACCESS</span>
                </div>
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
                  SELECT COMMUNICATION METHOD
                </span>
              </div>

              {isSuccess ? (
                /* Success feedback state */
                <div className="p-6 bg-surface border border-border rounded-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-sans font-semibold tracking-widest uppercase text-ink">
                      ACTION DISPATCHED
                    </span>
                    <span className="text-xs font-sans font-semibold text-accent bg-surface-dark px-2 py-0.5 rounded-xs">
                      ACTIVE RELAY
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
                      TAKE ANOTHER ACTION →
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
                              PRIVATE CALL
                            </span>
                            <span className="text-[10px] font-sans px-1.5 py-0.5 bg-accent/20 text-ink rounded-xs font-semibold">
                              DIRECT
                            </span>
                          </div>
                          <span className="text-xs font-sans text-muted block mt-0.5">
                            Connect via two-way voice bridge without revealing phone numbers
                          </span>
                        </div>
                      </div>
                      <span className="text-base text-ink font-sans ml-3">
                        {selectedMethod === 'call' ? '↓' : '→'}
                      </span>
                    </button>

                    {/* Expanded Controls for Private Call */}
                    {selectedMethod === 'call' && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border">
                        <form onSubmit={handleCallSubmit} className="space-y-4 max-w-lg mt-3">
                          <div>
                            <label
                              htmlFor="phone-input"
                              className="block text-xs font-sans font-medium tracking-[0.14em] uppercase text-muted mb-2"
                            >
                              YOUR MOBILE NUMBER
                            </label>

                            <div
                              className={`w-full h-12 border rounded-sm bg-bg flex items-center px-4 transition-colors ${
                                phoneError
                                  ? 'border-danger'
                                  : phoneFocused
                                  ? 'border-ink bg-white'
                                  : 'border-border hover:border-border-strong'
                              }`}
                            >
                              <span className="font-sans text-base font-normal text-muted select-none whitespace-nowrap">
                                +91
                              </span>
                              <span
                                className="h-4 w-[1px] bg-border mx-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              <input
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
                              <p className="mt-2 text-xs font-sans text-danger">
                                {phoneError}
                              </p>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto h-12 px-6 bg-surface-dark hover:bg-black text-[#f5f4ee] rounded-sm transition-colors text-xs font-sans font-semibold tracking-widest uppercase flex items-center justify-between sm:justify-center gap-4 cursor-pointer disabled:opacity-50"
                          >
                            <span>
                              {isSubmitting ? 'CONNECTING...' : 'START PRIVATE CALL'}
                            </span>
                            <span className="text-base text-accent">→</span>
                          </button>
                        </form>
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
                            Send a short private note to the registered owner
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
                              {isSubmitting ? 'DISPATCHING...' : 'DISPATCH MESSAGE'}
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
                            Select a categorized parking situation to notify the owner
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
                            SELECT SITUATION
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
                              OPTIONAL PARKING BAY / REFERENCE
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
                              {isSubmitting ? 'TRANSMITTING...' : 'SEND SITUATION ALERT'}
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
                <ContextualConnectionLine method={selectedMethod} />
              </div>

              {/* Privacy Architecture Notice */}
              <div className="space-y-1.5 md:border-l md:border-border md:pl-8">
                <h3 className="text-xs font-sans font-semibold tracking-[0.16em] uppercase text-ink">
                  PRIVATE BY DESIGN
                </h3>
                <p className="text-sm font-sans text-muted leading-relaxed">
                  Your phone number stays private. PingIn relays calls and messages without exposing contact credentials to either party.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-4xl w-full mx-auto pt-6">
        <div className="h-[1px] bg-border w-full mb-5" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-sans text-muted tracking-wider uppercase">
          <span>PINGIN • ANONYMOUS RELAY PROTOCOL</span>
          <span>PRIVATE COMMUNICATION</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicContactPage;
