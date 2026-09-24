import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { authApi } from '../../lib/api';
import type { UserProfile } from '../../types/api';
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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyId = () => {
    if (!profile?.id) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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

        {/* Single clear status indicator */}
        <div className="flex items-center gap-2 self-start md:self-end">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-accent/10 border border-accent/20 font-sans text-[11px] font-semibold text-ink uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            ACTIVE ACCOUNT
          </span>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent mb-4" />
          <p className="font-sans text-xs text-muted tracking-widest uppercase">
            Loading settings...
          </p>
        </div>
      ) : error ? (
        <div className="py-16 text-center max-w-md mx-auto">
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
        <div className="py-8 space-y-10 max-w-3xl">
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

            {/* Secondary Account ID Bar */}
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
              Your PingIn calls are forwarded to this number.
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

            {/* Concise Privacy Guarantee with Progressive Disclosure */}
            <div className="p-4 border border-border/80 bg-surface/20 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans text-xs">
              <p className="text-muted leading-relaxed">
                <span className="font-medium text-ink">Your contact number is private.</span>{' '}
                PingIn connects visitors to you without revealing your number.
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
                <span className="font-medium text-ink text-sm">Private voice relay</span>
              </div>

              <div className="p-4 border border-border bg-surface/30 rounded-sm space-y-1">
                <span className="text-muted text-[10px] tracking-widest uppercase block font-medium">
                  PingIn Status
                </span>
                <span className="font-medium text-accent text-sm flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Active
                </span>
              </div>
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
                  Privacy Architecture
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
                    2. Private Voice Bridge
                  </div>
                  <p className="text-muted leading-relaxed">
                    When they request contact, PingIn connects both phones through a masked relay bridge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="h-7 w-7 rounded-sm bg-surface border border-border flex items-center justify-center shrink-0 text-accent font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink uppercase tracking-wider text-[11px]">
                    3. Zero Number Exposure
                  </div>
                  <p className="text-muted leading-relaxed">
                    You talk in real time, but neither you nor the caller ever sees each other’s personal phone number.
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
    </Layout>
  );
};

export default SettingsPage;
