import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { adminStorage } from '../../lib/adminApi';
import { authStorage } from '../../lib/auth';
import { authApi } from '../../lib/api';
import { PingInLogo } from '../../components/brand/PingInLogo';
import { Shield, Key, Lock, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { loginWithPassword, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'password' | 'adminkey'>('password');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // If already logged in and is admin, redirect immediately
  React.useEffect(() => {
    if (isAdmin) {
      const from = (location.state as any)?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAdmin, navigate, location]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber.trim() || !password) {
      setError('Please provide both mobile number and password');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const cleanPhone = mobileNumber.trim();
      
      try {
        await loginWithPassword(cleanPhone, password);
      } catch (firstErr: any) {
        // Fallback: If 10-digit number failed, try with +91; if +91 failed, try without +91
        if (cleanPhone.startsWith('+91')) {
          await loginWithPassword(cleanPhone.replace(/^\+91/, ''), password);
        } else if (!cleanPhone.startsWith('+') && cleanPhone.length === 10) {
          await loginWithPassword(`+91${cleanPhone}`, password);
        } else {
          throw firstErr;
        }
      }

      // Check current user role after login
      const currentUser = authStorage.getCurrentUser();
      if (currentUser?.role === 'ADMIN') {
        const from = (location.state as any)?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      } else {
        // Double check profile in case role wasn't updated on login payload
        try {
          const profile: any = await authApi.getMe();
          const role = profile?.role || profile?.user?.role;
          if (role === 'ADMIN') {
            const updated = { ...(currentUser || {}), role: 'ADMIN' };
            authStorage.setCurrentUser(updated as any);
            const from = (location.state as any)?.from?.pathname || '/admin';
            navigate(from, { replace: true });
            return;
          }
        } catch {
          // ignore
        }

        setNotice(
          `Logged in as ${currentUser?.name || cleanPhone}, but this account has role "${currentUser?.role || 'USER'}". Enter an Admin Key below or update the role in DB.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminKeyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('Please enter your server ADMIN_KEY');
      return;
    }
    adminStorage.setAdminKey(adminKey.trim());
    const from = (location.state as any)?.from?.pathname || '/admin';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4 sm:p-6 text-ink selection:bg-accent selection:text-ink">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" className="inline-block mb-3">
            <PingInLogo height={24} className="w-auto h-6" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider bg-ink text-surface mb-2">
            <Shield className="w-3.5 h-3.5 text-accent" />
            Admin Console
          </div>
          <p className="text-xs text-muted">
            Secure administrative control & inventory management
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-border bg-bg/50">
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setError(null);
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                mode === 'password'
                  ? 'border-ink text-ink bg-surface'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Mobile & Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('adminkey');
                setError(null);
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                mode === 'adminkey'
                  ? 'border-ink text-ink bg-surface'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Admin Key</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 p-3 rounded bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
                {error}
              </div>
            )}

            {notice && (
              <div className="mb-5 p-3.5 rounded bg-accent/20 border border-border text-xs text-ink leading-relaxed">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Account Authenticated
                </p>
                <p className="text-muted">{notice}</p>
                <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMode('adminkey')}
                    className="text-[11px] font-mono font-bold uppercase underline hover:text-muted"
                  >
                    Enter Admin Key →
                  </button>
                  <Link
                    to="/dashboard"
                    className="text-[11px] font-mono text-muted hover:text-ink"
                  >
                    Go to User Dashboard
                  </Link>
                </div>
              </div>
            )}

            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+919876543210 or 9876543210"
                      className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border rounded text-sm text-ink placeholder:text-subtle font-mono focus:outline-none focus:border-ink transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border rounded text-sm text-ink placeholder:text-subtle font-mono focus:outline-none focus:border-ink transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 bg-ink text-surface text-xs font-semibold uppercase tracking-widest rounded hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Admin</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminKeyLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Server ADMIN_KEY
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="Paste secret x-admin-key"
                      className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border rounded text-sm text-ink placeholder:text-subtle font-mono focus:outline-none focus:border-ink transition-colors"
                      required
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted leading-tight">
                    Authorizes using the direct server-level header override.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-ink text-surface text-xs font-semibold uppercase tracking-widest rounded hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Authenticate with Key</span>
                </button>
              </form>
            )}
          </div>

          <div className="px-6 py-4 bg-bg border-t border-border flex items-center justify-between text-xs text-muted">
            <Link to="/login" className="hover:text-ink transition-colors font-medium">
              ← Standard Login
            </Link>
            <Link to="/" className="hover:text-ink transition-colors font-medium">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
