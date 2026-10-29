import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactElement;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, isAdmin, refreshUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [hasCheckedOnMount, setHasCheckedOnMount] = useState<boolean>(false);

  // Sync profile on mount if authenticated but not yet flagged as admin
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && !isAdmin && !hasCheckedOnMount) {
      setIsVerifying(true);
      refreshUser()
        .catch(() => {})
        .finally(() => {
          if (isMounted) {
            setIsVerifying(false);
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

  if (isLoading || (isVerifying && !hasCheckedOnMount)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg text-ink">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="font-mono text-xs tracking-widest text-muted uppercase">
            Verifying Admin Authorization...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect straight to admin login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Authenticated as standard customer / non-admin user
  if (!isAdmin) {
    const handleSwitchToAdmin = () => {
      logout();
      navigate('/admin/login', { state: { from: location } });
    };

    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-surface border border-border p-6 sm:p-8 rounded-lg shadow-xs">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-danger uppercase font-semibold block">
                Access Restricted
              </span>
              <h2 className="font-medium text-lg text-ink tracking-tight">
                Admin Authorization Required
              </h2>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed mb-6">
            Signed in as <strong className="text-ink">{user?.name || 'User'}</strong> ({user?.mobileNumber || 'No phone'}).
            This account does not have administrator privileges.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              className="w-full py-2.5 bg-ink text-surface hover:opacity-90 text-xs font-mono font-semibold uppercase tracking-wider rounded transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign In with Admin Account</span>
            </button>

            <Link
              to="/"
              className="w-full py-2.5 bg-transparent border border-border hover:border-ink text-muted hover:text-ink text-xs font-mono font-semibold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Store</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
