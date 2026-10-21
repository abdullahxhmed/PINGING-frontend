import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { adminStorage } from '../../lib/adminApi';
import { ShieldAlert, Key, ArrowRight, ArrowLeft, RefreshCw, LogOut } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactElement;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, isAdmin, refreshUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState<boolean>(false);

  // Automatically sync profile and role from server on mount if not currently flagged as admin
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && !isAdmin && !hasCheckedOnMount) {
      setIsSyncing(true);
      refreshUser()
        .catch(() => {})
        .finally(() => {
          if (isMounted) {
            setIsSyncing(false);
            setHasCheckedOnMount(true);
          }
        });
    } else {
      setHasCheckedOnMount(true);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAdmin, hasCheckedOnMount, refreshUser]);

  const handleManualRecheck = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      await refreshUser();
    } catch {
      setErrorMsg('Could not verify with server. Please check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRelogin = () => {
    logout();
    navigate('/admin/login', { state: { from: location } });
  };

  if (isLoading || (isSyncing && !hasCheckedOnMount)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="font-sans text-xs font-semibold tracking-widest text-muted uppercase">
            Verifying Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !adminStorage.getAdminKey()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // If authenticated but not flagged as admin in DB and no admin key set
  if (!isAdmin) {
    const handleSaveAdminKey = (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminKeyInput.trim()) {
        setErrorMsg('Please enter an admin key');
        return;
      }
      adminStorage.setAdminKey(adminKeyInput.trim());
      setErrorMsg(null);
      window.location.reload();
    };

    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-ink">
        <div className="w-full max-w-md bg-surface border border-border p-8 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-danger uppercase font-semibold block">
                Access Restricted
              </span>
              <h2 className="font-display text-xl font-medium uppercase tracking-tight text-ink">
                Admin Authorization Required
              </h2>
            </div>
          </div>

          <p className="text-sm text-muted mb-4 leading-relaxed">
            Signed in as <strong className="text-ink">{user?.name}</strong> ({user?.mobileNumber}).
            Your user account currently has role <code className="bg-bg px-1.5 py-0.5 rounded text-xs font-mono font-bold text-ink">{user?.role || 'USER'}</code>.
          </p>

          {/* Role Sync Helper */}
          <div className="mb-6 p-3 bg-bg border border-border rounded flex items-center justify-between gap-3">
            <div className="text-xs text-muted">
              <span>Changed your role in the DB?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRecheck}
                disabled={isSyncing}
                className="px-2.5 py-1.5 bg-surface border border-border hover:border-ink rounded text-xs font-mono font-semibold uppercase tracking-wider text-ink transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Checking...' : 'Re-check Role'}</span>
              </button>

              <button
                type="button"
                onClick={handleRelogin}
                className="px-2.5 py-1.5 bg-surface border border-border hover:border-danger hover:text-danger rounded text-xs font-mono font-semibold uppercase tracking-wider text-muted transition-colors flex items-center gap-1 cursor-pointer"
                title="Log out and log in again to renew your session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-login</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-bg border border-border rounded-md mb-6">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Enter Admin Key
            </h3>
            <p className="text-xs text-muted mb-3">
              If your database role has not been updated yet, enter your server <code className="font-mono text-ink">ADMIN_KEY</code> below to bypass.
            </p>
            <form onSubmit={handleSaveAdminKey} className="space-y-3">
              <input
                type="password"
                placeholder="Paste ADMIN_KEY..."
                value={adminKeyInput}
                onChange={(e) => {
                  setAdminKeyInput(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded text-ink focus:outline-none focus:border-ink font-mono"
              />
              {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}
              <button
                type="submit"
                className="w-full py-2 bg-ink text-surface text-xs font-semibold uppercase tracking-widest rounded hover:opacity-90 transition-opacity cursor-pointer"
              >
                Authenticate with Key
              </button>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-muted hover:text-ink transition-colors uppercase tracking-wider flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
            </Link>
            <Link
              to="/admin/login"
              className="text-xs font-semibold text-ink hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              Switch Account <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
