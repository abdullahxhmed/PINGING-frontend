import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { authApi, resourcesApi, qrApi, extractResourceTag, uncacheResourceTag } from '../../lib/api';
import type { UserProfile, Resource, QrTagLookupResponse } from '../../types/api';
import {
  ArrowLeft,
  Lock,
  Check,
  Copy,
  AlertCircle,
  X,
  Shield,
  PhoneCall,
  QrCode,
  Search,
  Loader2,
  Unlink,
  Car,
  Building2,
  Wrench,
  Layers,
} from 'lucide-react';
import { DelayedSpinner, Button } from '../../components/ui';
import { PingInSvgLogo } from '../../components/brand/PingInLogo';
import { PairQrModal, UnpairQrModal } from '../../components/resources';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Resources state for QR tag management
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  // Modals state
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [unpairTarget, setUnpairTarget] = useState<{
    resourceId: string;
    resourceName: string;
    tagNumber?: string;
  } | null>(null);

  // Tag Lookup Tool state
  const [lookupInput, setLookupInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<QrTagLookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setIsLoadingResources(true);
    try {
      const data = await resourcesApi.list();
      setResources(Array.isArray(data) ? data : []);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchMe() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await authApi.getMe();
        if (isMounted) {
          setProfile(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load profile details');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMe();
    fetchResources();

    return () => {
      isMounted = false;
    };
  }, [fetchResources]);

  const handleCopyId = () => {
    if (!profile?.id) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupInput.trim();
    if (!trimmed) return;

    setIsLookingUp(true);
    setLookupError(null);
    setLookupResult(null);

    // Clean code if a full URL was pasted
    const match = trimmed.match(/\/qr\/([a-zA-Z0-9_-]+)/i);
    const identifier = match ? match[1] : trimmed;

    try {
      const res = await qrApi.lookup(identifier);
      setLookupResult(res);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'QR tag not found';
      setLookupError(msg);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Find paired resources using multi-source tag resolution
  const pairedResources = resources.filter((r) => Boolean(extractResourceTag(r)));

  return (
    <Layout>
      {/* Refined Working Interface Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-xs text-muted hover:text-ink tracking-wider uppercase mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>BACK TO RESOURCES</span>
          </Link>
          <h1 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl leading-[0.96] tracking-[-0.03em] text-ink uppercase">
            PROFILE &amp; SETTINGS
          </h1>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 self-start md:self-end">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-accent/10 border border-accent/20 font-sans text-[11px] font-semibold text-ink uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            ACTIVE ACCOUNT
          </span>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <DelayedSpinner delay={180}>
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-4" />
            <p className="font-sans text-xs text-muted tracking-widest uppercase">
              Loading settings...
            </p>
          </div>
        </DelayedSpinner>
      ) : error ? (
        <div className="py-16 text-center max-w-md mx-auto animate-fade-in">
          <AlertCircle className="h-8 w-8 text-danger mx-auto mb-3" />
          <h3 className="font-display font-medium text-lg uppercase text-danger">
            Settings Unavailable
          </h3>
          <p className="font-sans text-xs text-danger/80 mt-1 max-w-md mx-auto mb-6">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-surface border border-border hover:border-ink font-sans text-xs font-semibold tracking-wider uppercase text-ink transition-colors cursor-pointer"
          >
            TRY AGAIN
          </button>
        </div>
      ) : profile ? (
        <div className="py-8 space-y-10 max-w-3xl animate-fade-in">
          {/* SECTION 01: ACCOUNT */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-2.5">
              <span className="font-display text-sm font-medium text-subtle select-none">
                01
              </span>
              <h2 className="font-display font-medium text-lg sm:text-xl text-ink uppercase tracking-tight">
                ACCOUNT
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="p-4 border border-border bg-surface/40 rounded-sm space-y-1">
                <span className="text-muted font-sans text-[11px] tracking-wider uppercase block font-medium">
                  Name
                </span>
                <div className="font-display font-medium text-lg text-ink uppercase tracking-tight">
                  {profile.name}
                </div>
              </div>

              {/* Login Mobile */}
              <div className="p-4 border border-border bg-surface/40 rounded-sm space-y-1">
                <span className="text-muted font-sans text-[11px] tracking-wider uppercase block font-medium">
                  Login Mobile
                </span>
                <div className="font-display font-medium text-lg text-ink uppercase tracking-tight">
                  {profile.mobileNumber}
                </div>
              </div>
            </div>

            {/* Account ID Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 border border-border/70 bg-surface/20 rounded-sm text-xs font-sans">
              <div className="flex items-center gap-2 text-muted min-w-0">
                <span className="uppercase text-[11px] tracking-wider shrink-0 font-medium">Account ID</span>
                <span className="text-ink/80 truncate select-all">
                  {profile.id}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted hover:text-ink transition-colors cursor-pointer ml-3 shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="h-3 w-3 text-accent" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>COPY</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* SECTION 02: CONTACT NUMBER */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-2.5">
              <span className="font-display text-sm font-medium text-subtle select-none">
                02
              </span>
              <h2 className="font-display font-medium text-lg sm:text-xl text-ink uppercase tracking-tight">
                CONTACT NUMBER
              </h2>
            </div>

            <p className="font-sans text-xs text-muted">
              Your Kauntact calls are forwarded to this number.
            </p>

            {/* Contact Number Card */}
            <div className="p-5 border border-border bg-surface/50 rounded-sm space-y-3">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={profile.contactEndpoint?.phoneNumber || profile.mobileNumber}
                  className="w-full h-12 px-4 pr-12 rounded-sm bg-bg border border-border text-ink font-display font-medium text-xl tracking-tight uppercase cursor-not-allowed select-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none select-none">
                  <Lock className="h-4 w-4" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                <span className="font-sans text-xs text-muted flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Locked to your login number
                </span>

                <span className="font-sans text-[11px] text-muted/60 uppercase tracking-wider">
                  Change contact number (Coming soon)
                </span>
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="p-4 border border-border/80 bg-surface/20 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans text-xs">
              <p className="text-muted leading-relaxed">
                <span className="font-medium text-ink">Your contact number is private.</span>{' '}
                <PingInSvgLogo inline className="mr-1 text-ink" /> connects visitors to you without revealing your number.
              </p>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="font-medium text-ink hover:text-muted tracking-wider uppercase shrink-0 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>How private calling works</span>
                <span>→</span>
              </button>
            </div>
          </section>

          {/* SECTION 03: PRIVACY & SECURITY */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-2.5">
              <span className="font-display text-sm font-medium text-subtle select-none">
                03
              </span>
              <h2 className="font-display font-medium text-lg sm:text-xl text-ink uppercase tracking-tight">
                PRIVACY &amp; SECURITY
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
              <div className="p-4 border border-border bg-surface/30 rounded-sm space-y-1">
                <span className="text-muted text-[10px] tracking-widest uppercase block font-medium">
                  Phone Visibility
                </span>
                <span className="font-medium text-ink text-sm">Never exposed</span>
              </div>

              <div className="p-4 border border-border bg-surface/30 rounded-sm space-y-1">
                <span className="text-muted text-[10px] tracking-widest uppercase block font-medium">
                  Contact Method
                </span>
                <span className="font-medium text-ink text-sm">Phone call</span>
              </div>

              <div className="p-4 border border-border bg-surface/30 rounded-sm space-y-1">
                <span className="text-muted text-[10px] tracking-widest uppercase block font-medium">
                  Kauntact Status
                </span>
                <span className="font-medium text-accent text-sm flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Active
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 04: QR & PHYSICAL TAGS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-medium text-subtle select-none">
                  04
                </span>
                <h2 className="font-display font-medium text-lg sm:text-xl text-ink uppercase tracking-tight">
                  QR &amp; PHYSICAL TAGS
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/pair">
                  <Button variant="secondary" className="!h-8 text-xs font-semibold uppercase">
                    Pairing Suite →
                  </Button>
                </Link>
              </div>
            </div>

            <p className="font-sans text-xs text-muted leading-relaxed">
              Manage your physical windshield stickers, inspect preprinted inventory, and generate digital tags.
            </p>

            {/* Pair Physical Sticker Banner */}
            <div className="p-4 sm:p-5 border border-border bg-surface/40 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
              <div className="space-y-1">
                <h4 className="font-semibold text-ink text-sm flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <span>Pair Physical Sticker</span>
                </h4>
                <p className="text-muted text-xs leading-relaxed max-w-lg">
                  Have a Kauntact sticker with you? Link its 7-character code to any existing vehicle or space, or create a new one.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsPairModalOpen(true)}
                className="!h-10 text-xs shrink-0 uppercase tracking-wider font-semibold px-5"
              >
                Pair Sticker
              </Button>
            </div>

            {/* Tag Lookup & Inspection Tool */}
            <div className="p-4 sm:p-5 border border-border bg-surface/30 rounded-sm space-y-3 font-sans text-xs">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-ink" />
                <h4 className="font-semibold text-ink text-xs uppercase tracking-wider">
                  Live Tag Lookup &amp; Verification
                </h4>
              </div>
              <p className="text-muted leading-relaxed">
                Enter any 7-character code or scanned token to inspect its assignment status in Kauntact registry.
              </p>

              <form onSubmit={handleLookupSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. KT83B45 or twr1IOXDf..."
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  className="input !h-10 text-xs font-mono uppercase tracking-wider flex-1"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={isLookingUp}
                  disabled={!lookupInput.trim()}
                  className="!h-10 text-xs uppercase tracking-wider shrink-0"
                >
                  Check Status
                </Button>
              </form>

              {lookupResult && (
                <div className="p-3.5 bg-bg border border-border rounded-sm space-y-2 animate-fade-in mt-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted text-[11px] uppercase tracking-wider">Tag Code</span>
                    <span className="font-mono font-bold text-ink text-sm">
                      #{lookupResult.tagNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted text-[11px] uppercase tracking-wider">Status</span>
                    <span
                      className={`font-semibold uppercase text-xs ${
                        lookupResult.isAssigned ? 'text-accent' : 'text-success'
                      }`}
                    >
                      {lookupResult.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted text-[11px] uppercase tracking-wider">Origin</span>
                    <span className="text-ink font-medium">
                      {lookupResult.origin === 'PREPRINTED_INVENTORY' ? 'Physical Preprinted Sticker' : 'Digital QR'}
                    </span>
                  </div>
                  {lookupResult.pairedResource && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted text-[11px] uppercase tracking-wider">Paired Resource</span>
                      <span className="font-medium text-ink">
                        {lookupResult.pairedResource.name}
                        {lookupResult.pairedResource.registrationNum ? ` • Plate: ${lookupResult.pairedResource.registrationNum}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {lookupError && (
                <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-sm text-xs text-danger mt-2">
                  {lookupError}
                </div>
              )}
            </div>

            {/* List of currently paired tags in account */}
            <div className="space-y-2 font-sans pt-2">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                PAIRED TAGS IN YOUR ACCOUNT ({pairedResources.length})
              </span>

              {isLoadingResources ? (
                <div className="py-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading paired tags...</span>
                </div>
              ) : pairedResources.length === 0 ? (
                <div className="p-4 border border-border/70 bg-surface/20 rounded-sm text-center text-xs text-muted">
                  No physical or digital tags currently paired to your resources.
                </div>
              ) : (
                <div className="space-y-2">
                  {pairedResources.map((res) => {
                    const tag = extractResourceTag(res);
                    const resId = res.id || (res as any)._id;

                    return (
                      <div
                        key={resId}
                        className="p-3.5 border border-border bg-surface/40 rounded-sm flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-xs bg-ink text-surface flex items-center justify-center shrink-0">
                            {res.type === 'VEHICLE' && <Car className="h-4 w-4" />}
                            {res.type === 'PROPERTY' && <Building2 className="h-4 w-4" />}
                            {res.type === 'EQUIPMENT' && <Wrench className="h-4 w-4" />}
                            {(!res.type || res.type === 'OTHER') && <Layers className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink block truncate">
                              {res.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-bold text-ink">
                                #{tag}
                              </span>
                              <span className="text-[10px] text-accent uppercase tracking-wider">
                                ● ASSIGNED
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link to={`/resources/${resId}`}>
                            <Button variant="secondary" className="!h-8 text-xs">
                              Manage
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            onClick={() =>
                              setUnpairTarget({
                                resourceId: resId,
                                resourceName: res.name,
                                tagNumber: tag,
                              })
                            }
                            className="!h-8 text-xs"
                            leftIcon={<Unlink className="h-3 w-3" />}
                          >
                            Unpair
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {/* Progressive Disclosure Modal: How Private Calling Works */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="w-full max-w-lg bg-surface border border-border rounded-sm p-6 sm:p-8 space-y-6 shadow-xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="font-sans text-[10px] font-semibold tracking-widest text-muted uppercase">
                  Privacy
                </span>
                <h3 className="font-display font-medium text-xl text-ink uppercase tracking-tight mt-0.5">
                  How Private Calling Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-muted hover:text-ink transition-colors p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step-by-step Flow */}
            <div className="space-y-4 font-sans text-xs">
              <div className="flex items-start gap-3.5">
                <div className="h-7 w-7 rounded-sm bg-surface border border-border flex items-center justify-center shrink-0 text-ink font-semibold">
                  <QrCode className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                    1. Visitor Scans QR
                  </div>
                  <p className="text-muted leading-relaxed">
                    A person scans the sticker on your car, bike, or space and opens the contact page.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-7 w-7 rounded-sm bg-surface border border-border flex items-center justify-center shrink-0 text-ink font-semibold">
                  <PhoneCall className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                    2. Connecting the Call
                  </div>
                  <p className="text-muted leading-relaxed">
                    When someone calls, <PingInSvgLogo inline className="mx-1 text-ink" /> connects both phones without revealing your personal number.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-7 w-7 rounded-sm bg-surface border border-border flex items-center justify-center shrink-0 text-accent font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                    3. Numbers Stay Hidden
                  </div>
                  <p className="text-muted leading-relaxed">
                    You talk in real time, but neither person ever sees the other’s phone number.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 bg-ink text-surface font-sans text-xs font-semibold tracking-wider uppercase hover:bg-ink/90 transition-colors cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modals */}
      <PairQrModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onSuccess={() => {
          setIsPairModalOpen(false);
          fetchResources();
        }}
      />

      {unpairTarget && (
        <UnpairQrModal
          isOpen={Boolean(unpairTarget)}
          onClose={() => setUnpairTarget(null)}
          resourceId={unpairTarget.resourceId}
          resourceName={unpairTarget.resourceName}
          tagNumber={unpairTarget.tagNumber}
          onUnpaired={() => {
            if (unpairTarget?.resourceId) {
              uncacheResourceTag(unpairTarget.resourceId);
            }
            setUnpairTarget(null);
            fetchResources();
          }}
        />
      )}
    </Layout>
  );
};

export default SettingsPage;
