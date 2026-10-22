import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { qrApi } from '../../lib/api';
import { authStorage } from '../../lib/auth';
import type { QrResolveResponse, QrTagLookupResponse } from '../../types/api';
import { PingInSvgLogo } from '../../components/brand/PingInLogo';

export const QrResolverPage: React.FC = () => {
  const { identifier: paramIdentifier } = useParams<{ identifier: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const identifier = paramIdentifier || searchParams.get('tag') || searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [resolveData, setResolveData] = useState<QrResolveResponse | null>(null);
  const [lookupData, setLookupData] = useState<QrTagLookupResponse | null>(null);
  const [isRevokedPath, setIsRevokedPath] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(authStorage.getAccessToken());

  useEffect(() => {
    // Check if directly loaded on a status path
    if (location.pathname.includes('/tag/revoked') || location.pathname.includes('/tag-inactive')) {
      setIsRevokedPath(true);
      setIsLoading(false);
      return;
    }

    if (!identifier) {
      setError('No tag identifier provided in URL.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function resolveTag() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Try smart resolver endpoint
        const res = await qrApi.resolve(identifier);

        if (!isMounted) return;
        setResolveData(res);

        // Case A: Assigned -> Forward directly to public contact page with qr_scan source
        if (res.action === 'CONTACT' && res.contactToken) {
          navigate(`/contact/${res.contactToken}?src=qr_scan`, { replace: true });
          return;
        }
      } catch (err: any) {
        // Fallback: try lookup endpoint if resolve fails
        try {
          const fallback = await qrApi.lookup(identifier);
          if (!isMounted) return;
          setLookupData(fallback);

          if (fallback.isAssigned) {
            navigate(`/contact/${identifier}?src=qr_scan`, { replace: true });
            return;
          }
        } catch (fallbackErr: any) {
          if (!isMounted) return;
          const msg =
            err?.data?.message ||
            err?.message ||
            "We couldn't verify this tag. Please check the URL or QR code and try again.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    resolveTag();

    return () => {
      isMounted = false;
    };
  }, [identifier, location.pathname, navigate]);

  // Derived attributes
  const isAssigned = resolveData?.action === 'CONTACT' || lookupData?.isAssigned;
  const isUnassigned = resolveData?.action === 'PAIR' || (lookupData && !lookupData.isAssigned);
  const isRevoked = isRevokedPath || resolveData?.action === 'REVOKED' || lookupData?.status === 'REVOKED';
  const tagNumber = resolveData?.tagNumber || lookupData?.tagNumber || identifier;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col p-6 sm:p-12 md:p-16 lg:p-24 font-sans selection:bg-ink selection:text-surface">
      {/* Top Header */}
      <header className="max-w-xl md:max-w-2xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border/70">
        <Link to="/" className="inline-flex items-center gap-2">
          <PingInSvgLogo height={22} className="text-ink" />
        </Link>
      </header>

      {/* Main Resolution Column - Optimized for desktop and mobile */}
      <main className="max-w-xl md:max-w-2xl w-full mx-auto my-auto py-12 md:py-20 animate-fade-in">
        {isLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-4 w-4 rounded-full border-2 border-ink border-t-transparent animate-spin" />
            <p className="text-xs text-muted font-mono">
              Verifying tag...
            </p>
          </div>
        ) : isRevoked ? (
          /* Case: REVOKED OR INACTIVE TAG */
          <div className="space-y-6">
            <div>
              <span className="font-mono text-[11px] font-semibold text-muted tracking-widest uppercase block mb-2">
                TAG UNAVAILABLE
              </span>
              <h1 className="font-display font-medium text-2xl sm:text-3xl md:text-4xl text-ink tracking-tight">
                This tag is not active.
              </h1>
            </div>

            <div className="space-y-3 text-sm md:text-base text-muted leading-relaxed max-w-lg">
              <p>
                This contact tag has been deactivated or is no longer in service.
              </p>
              <p>
                Its private contact forwarding service is not currently available.
              </p>
            </div>

            {tagNumber && (
              <div className="pt-1">
                <span className="font-mono text-xs text-muted/70">
                  Tag #{tagNumber}
                </span>
              </div>
            )}

            <div className="pt-6 border-t border-border/70 space-y-3">
              <div>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-ink hover:text-muted transition-colors"
                >
                  <span>Need help with this tag?</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <div>
                <Link to="/" className="text-xs md:text-sm text-muted hover:text-ink transition-colors">
                  How Kauntact works
                </Link>
              </div>
            </div>
          </div>
        ) : error ? (
          /* Case: NOT FOUND / ERROR */
          <div className="space-y-6">
            <div>
              <span className="font-mono text-[11px] font-semibold text-muted tracking-widest uppercase block mb-2">
                TAG NOT RECOGNIZED
              </span>
              <h1 className="font-display font-medium text-2xl sm:text-3xl md:text-4xl text-ink tracking-tight">
                We couldn't find this tag.
              </h1>
            </div>

            <div className="space-y-3 text-sm md:text-base text-muted leading-relaxed max-w-lg">
              <p>
                The identifier in this link doesn't match an active Kauntact tag. Please check the QR code or URL and try again.
              </p>
            </div>

            <div className="pt-6 border-t border-border/70 flex items-center gap-4 text-xs md:text-sm">
              <Link
                to="/contact"
                className="font-semibold text-ink hover:text-muted transition-colors inline-flex items-center gap-1"
              >
                <span>Need help with this tag?</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <span className="text-border">&bull;</span>
              <Link to="/" className="text-muted hover:text-ink transition-colors">
                Return home
              </Link>
            </div>
          </div>
        ) : isAssigned ? (
          /* Case: ASSIGNED -> Connecting directly */
          <div className="space-y-3 py-6">
            <div className="h-4 w-4 rounded-full border-2 border-ink border-t-transparent animate-spin" />
            <p className="text-xs text-muted font-mono">
              Connecting to owner...
            </p>
          </div>
        ) : isUnassigned ? (
          /* Case: UNASSIGNED -> Restrained, visitor-oriented message */
          <div className="space-y-6">
            <div>
              <span className="font-mono text-[11px] font-semibold text-muted tracking-widest uppercase block mb-2">
                TAG NOT ACTIVATED
              </span>
              <h1 className="font-display font-medium text-2xl sm:text-3xl md:text-4xl text-ink tracking-tight">
                This tag isn't activated yet.
              </h1>
            </div>

            <div className="space-y-3 text-sm md:text-base text-muted leading-relaxed max-w-lg">
              <p>
                This Kauntact tag hasn't been linked to an owner, so its private contact service isn't available yet.
              </p>
              <p>
                If you found this tag on a vehicle or belonging, you can let its owner know that it may need activation.
              </p>
            </div>

            {tagNumber && (
              <div className="pt-1">
                <span className="font-mono text-xs text-muted/70">
                  Tag #{tagNumber}
                </span>
              </div>
            )}

            <div className="pt-6 border-t border-border/70 space-y-3">
              <div>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-ink hover:text-muted transition-colors"
                >
                  <span>Need help with this tag?</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>

              {/* Secondary links: product discovery & discreet owner entry */}
              <div className="flex items-center gap-3 text-xs md:text-sm text-muted pt-1">
                <Link to="/" className="hover:text-ink transition-colors">
                  How Kauntact works
                </Link>
                <span className="text-border">&bull;</span>
                <Link
                  to={isAuthenticated ? `/pair?tag=${tagNumber}` : `/login?redirect=${encodeURIComponent(`/pair?tag=${tagNumber}`)}`}
                  className="hover:text-ink transition-colors"
                >
                  {isAuthenticated ? 'Pair this to your belonging' : 'Owner sign in'}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default QrResolverPage;
