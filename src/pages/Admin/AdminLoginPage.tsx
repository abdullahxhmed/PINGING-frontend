import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { authStorage } from '../../lib/auth';
import { authApi } from '../../lib/api';
import { KauntactLogo } from '../../components/brand/KauntactLogo';
import { Lock, Phone, ArrowRight, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { loginWithPassword, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated with admin privileges, navigate straight to admin
  useEffect(() => {
    if (isAdmin) {
      const from = (location.state as any)?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAdmin, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber.trim() || !password) {
      setError('Please provide phone number and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    const cleanInput = mobileNumber.trim();
    let authUser: any = null;

    try {
      try {
        authUser = await loginWithPassword(cleanInput, password);
      } catch (firstErr: any) {
        // Fallback: if 10 digits provided, retry with +91; if +91 provided, retry without
        if (!cleanInput.startsWith('+') && cleanInput.length === 10) {
          authUser = await loginWithPassword(`+91${cleanInput}`, password);
        } else if (cleanInput.startsWith('+91')) {
          authUser = await loginWithPassword(cleanInput.replace(/^\+91/, ''), password);
        } else {
          throw firstErr;
        }
      }

      // Check role
      let role = authUser?.role || authStorage.getCurrentUser()?.role;
      if (role !== 'ADMIN') {
        try {
          const profile: any = await authApi.getMe(true);
          role = profile?.role || profile?.user?.role || profile?.data?.role;
          if (role === 'ADMIN') {
            const current = authStorage.getCurrentUser();
            authStorage.setCurrentUser({ ...(current || {}), role: 'ADMIN' } as any);
          }
        } catch {
          // Profile check error
        }
      }

      if (role === 'ADMIN') {
        const from = (location.state as any)?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      } else {
        logout();
        setError('Access denied: This account does not possess administrator privileges.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between font-sans antialiased">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-5 py-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors uppercase tracking-wider font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Store</span>
        </Link>
      </header>

      {/* Main Single Admission Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[380px]">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link to="/" className="inline-block hover:opacity-85 transition-opacity mb-4">
              <KauntactLogo height={20} />
            </Link>
            <h1 className="text-lg font-medium text-ink">Admin</h1>
          </div>

          {/* Admission Form Card */}
          <div className="bg-surface border border-border rounded-lg p-6 sm:p-7 shadow-xs">
            {error && (
              <div className="mb-4 p-3 rounded bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium uppercase tracking-wider text-muted mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="9876543210"
                    autoComplete="tel"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium uppercase tracking-wider text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-9 pr-9 py-2 bg-bg border border-border rounded text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-ink transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-ink text-surface text-xs font-mono font-semibold uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-5 py-6 text-center text-xs text-muted/60 font-sans">
        © {new Date().getFullYear()} Kauntact. All rights reserved.
      </footer>
    </div>
  );
};

export default AdminLoginPage;
