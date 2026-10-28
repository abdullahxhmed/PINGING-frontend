import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { authStorage } from '../../lib/auth';
import { authApi } from '../../lib/api';
import {
  Button,
  Input,
  PhoneInput,
  validatePhoneNumber,
  useToast,
} from '../../components/ui';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { KauntactLogo } from '../../components/brand/PingInLogo';

export interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

const OTP_COOLDOWN_SECONDS = 60;
const OTP_DELAY_MS = 2000;
const OTP_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour lockout after 3 attempts
const MAX_OTP_ATTEMPTS = 3;

interface OtpRateRecord {
  attempts: number;
  delayUntil: number;
  cooldownEnd: number;
  lockoutEnd: number;
}

function getOtpStorageKey(mobile: string): string {
  const clean = mobile.replace(/\D/g, '');
  return `pingin_otp_rate_${clean}`;
}

function getStoredOtpState(mobile: string): OtpRateRecord | null {
  if (!mobile) return null;
  try {
    const raw = localStorage.getItem(getOtpStorageKey(mobile));
    if (!raw) return null;
    const data: OtpRateRecord = JSON.parse(raw);
    const now = Date.now();
    // If 1-hour lockout has expired, reset state
    if (data.lockoutEnd && now >= data.lockoutEnd) {
      localStorage.removeItem(getOtpStorageKey(mobile));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveStoredOtpState(mobile: string, state: OtpRateRecord): void {
  if (!mobile) return;
  try {
    localStorage.setItem(getOtpStorageKey(mobile), JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

function clearStoredOtpState(mobile: string): void {
  if (!mobile) return;
  try {
    localStorage.removeItem(getOtpStorageKey(mobile));
  } catch {
    // Ignore
  }
}


/**
 * Translates backend API errors into clear, human-readable user guidance.
 */
function translateAuthError(
  err: any,
  context: 'login-password' | 'login-otp' | 'signup' | 'otp-verify'
): string {
  const status =
    err?.statusCode ||
    err?.status ||
    err?.data?.statusCode ||
    err?.data?.status;

  const rawMessage = (
    Array.isArray(err?.data?.message)
      ? err.data.message.join('. ')
      : err?.data?.message || err?.message || ''
  ).toLowerCase();

  // 401 Unauthorized / Invalid Credentials
  if (
    status === 401 ||
    rawMessage.includes('unauthorized') ||
    rawMessage.includes('invalid credentials') ||
    rawMessage.includes('wrong password') ||
    rawMessage.includes('incorrect password') ||
    rawMessage.includes('invalid password')
  ) {
    if (context === 'login-password') {
      return 'Mobile number or password is invalid, please try again.';
    }
    if (context === 'otp-verify') {
      return 'Invalid or expired verification code, please try again.';
    }
    return 'Mobile number or password is invalid, please try again.';
  }

  // 404 Not Found (User does not exist during login)
  if (
    status === 404 ||
    rawMessage.includes('user not found') ||
    rawMessage.includes('account not found') ||
    rawMessage.includes('does not exist')
  ) {
    if (context === 'login-password') {
      return 'Mobile number or password is invalid, please try again.';
    }
    if (context === 'login-otp') {
      return 'No account found with this mobile number. Please sign up first.';
    }
    return 'Requested service or account was not found. Please try again.';
  }

  // 409 Conflict (User already exists during signup)
  if (
    status === 409 ||
    rawMessage.includes('already exists') ||
    rawMessage.includes('duplicate')
  ) {
    return 'An account with this mobile number already exists. Please sign in instead.';
  }

  // 400 Bad Request with validation errors
  if (Array.isArray(err?.data?.message) && err.data.message.length > 0) {
    return err.data.message[0];
  }

  // 429 Rate Limited
  if (status === 429 || rawMessage.includes('too many') || rawMessage.includes('rate limit')) {
    return 'Maximum attempts reached. Please request after 1 hr.';
  }

  // Generic fallback if server sent a human string
  if (
    err?.data?.message &&
    typeof err.data.message === 'string' &&
    !rawMessage.includes('unauthorized') &&
    !rawMessage.includes('internal')
  ) {
    return err.data.message;
  }

  if (
    err?.message &&
    typeof err.message === 'string' &&
    !rawMessage.includes('unauthorized') &&
    !rawMessage.includes('fetch failed') &&
    !rawMessage.includes('failed to fetch')
  ) {
    return err.message;
  }

  return 'Authentication request failed. Please check your details and try again.';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithPassword, loginWithOtp, signup, isAuthenticated } = useAuth();

  const rawFrom = (location.state as any)?.from?.pathname;
  const from = rawFrom && rawFrom !== '/login' && rawFrom !== '/signup' ? rawFrom : '/dashboard';

  useEffect(() => {
    if (isAuthenticated || authStorage.isAuthenticated()) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  // Determine mode from prop or URL
  const isSignupRoute = location.pathname.startsWith('/signup') || initialMode === 'signup';
  const mode = isSignupRoute ? 'signup' : 'login';

  // Primary login is password, secondary is OTP
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isDelayingTimer, setIsDelayingTimer] = useState(false);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Starts the 60-second cooldown timer exactly 2 seconds AFTER receiving 200 OK.
   * This grace delay avoids race conditions with server rate-limiting windows.
   */
  const triggerOtpCooldown = (phone: string) => {
    const cleanPhone = phone.trim();
    const existing = getStoredOtpState(cleanPhone);
    const currentAttempts = (existing?.attempts || 0) + 1;
    const now = Date.now();
    const delayUntil = now + OTP_DELAY_MS;
    const cooldownEnd = delayUntil + OTP_COOLDOWN_SECONDS * 1000;
    const lockoutEnd =
      currentAttempts >= MAX_OTP_ATTEMPTS
        ? now + OTP_LOCKOUT_MS
        : existing?.lockoutEnd || 0;

    const record: OtpRateRecord = {
      attempts: currentAttempts,
      delayUntil,
      cooldownEnd,
      lockoutEnd,
    };
    saveStoredOtpState(cleanPhone, record);

    setOtpAttempts(currentAttempts);
    setIsDelayingTimer(true);
    setOtpCooldown(OTP_COOLDOWN_SECONDS);

    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    delayTimeoutRef.current = setTimeout(() => {
      setIsDelayingTimer(false);
    }, OTP_DELAY_MS);
  };

  /**
   * Periodically synchronizes cooldown seconds and lockout state with real-time timestamps
   */
  useEffect(() => {
    const updateCooldown = () => {
      const cleanPhone = mobileNumber.trim();
      if (!cleanPhone) {
        setOtpCooldown(0);
        setIsDelayingTimer(false);
        setOtpAttempts(0);
        return;
      }

      const stored = getStoredOtpState(cleanPhone);
      if (!stored) {
        setOtpCooldown(0);
        setIsDelayingTimer(false);
        setOtpAttempts(0);
        return;
      }

      const now = Date.now();
      setOtpAttempts(stored.attempts);

      // Check if within 2-second grace delay after 200 response
      if (now < stored.delayUntil) {
        setIsDelayingTimer(true);
        setOtpCooldown(OTP_COOLDOWN_SECONDS);
        return;
      }

      setIsDelayingTimer(false);

      if (now < stored.cooldownEnd) {
        const remaining = Math.max(0, Math.ceil((stored.cooldownEnd - now) / 1000));
        setOtpCooldown(remaining);
      } else {
        setOtpCooldown(0);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 500);

    return () => {
      clearInterval(interval);
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [mobileNumber]);

  // Switch between Login and Signup modes
  const switchToMode = (newMode: 'login' | 'signup') => {
    setStep('DETAILS');
    setOtp('');
    setLoginMethod('password');
    navigate(newMode === 'signup' ? '/signup' : '/login');
  };

  /**
   * Handles submission of credentials from DETAILS step:
   * - Signup: Validates name, phone, password -> requests signup OTP -> moves to OTP step
   * - Login (Password): Validates phone, password -> hits loginWithPassword (/api/auth/login/verify) -> dashboard
   * - Login (OTP): Validates phone -> requests login OTP -> moves to OTP step
   */
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    const validation = validatePhoneNumber(mobileNumber);
    if (!validation.isValid) {
      toast.error(validation.error || 'Please enter a valid 10-digit mobile number');
      return;
    }

    // Password validation for signup or password login
    if ((mode === 'signup' || (mode === 'login' && loginMethod === 'password')) && !password) {
      toast.error('Please enter your password');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const cleanPhone = mobileNumber.trim();
    const existingRate = getStoredOtpState(cleanPhone);
    const now = Date.now();

    // 1-hour lockout check for 3 attempts
    if (
      (mode === 'signup' || (mode === 'login' && loginMethod === 'otp')) &&
      existingRate &&
      existingRate.attempts >= MAX_OTP_ATTEMPTS &&
      existingRate.lockoutEnd &&
      now < existingRate.lockoutEnd
    ) {
      toast.error('Maximum attempts reached. Please request after 1 hr.');
      return;
    }

    // If cooldown is actively running for this phone number, navigate to OTP step without sending duplicate request
    if (
      (mode === 'signup' || (mode === 'login' && loginMethod === 'otp')) &&
      existingRate &&
      now < existingRate.cooldownEnd
    ) {
      setStep('OTP');
      toast.info('Please enter the verification code already sent to your phone');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // Request OTP for signup
        await authApi.requestSignupOtp(cleanPhone);
        toast.info(`Verification code sent to +91 ${cleanPhone}`);
        triggerOtpCooldown(cleanPhone);
        setStep('OTP');
      } else if (loginMethod === 'password') {
        // Primary Login with Password -> hits /api/auth/login/verify
        await loginWithPassword(cleanPhone, password);
        clearStoredOtpState(cleanPhone);
        toast.success('Signed in successfully');
        navigate(from, { replace: true });
      } else {
        // Secondary Login with OTP -> requests login OTP
        await authApi.requestLoginOtp(cleanPhone);
        toast.info(`One-time passcode sent to +91 ${cleanPhone}`);
        triggerOtpCooldown(cleanPhone);
        setStep('OTP');
      }
    } catch (err: any) {
      const context =
        mode === 'signup'
          ? 'signup'
          : loginMethod === 'password'
            ? 'login-password'
            : 'login-otp';
      const friendlyMessage = translateAuthError(err, context);
      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles verification on OTP step:
   * - Signup: sends { name, mobileNumber, otp, password } to verify signup route -> dashboard
   * - Login: sends { mobileNumber, otp } to verify login route -> dashboard
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the 6-digit code sent to your phone');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // Verify signup OTP with name, mobile, otp, and password
        await signup(name.trim(), mobileNumber.trim(), otp.trim(), password);
        clearStoredOtpState(mobileNumber.trim());
        toast.success('Account created successfully');
      } else {
        // Verify login OTP
        await loginWithOtp(mobileNumber.trim(), otp.trim());
        clearStoredOtpState(mobileNumber.trim());
        toast.success('Signed in successfully');
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      const friendlyMessage = translateAuthError(err, 'otp-verify');
      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (isLoading || isDelayingTimer || otpCooldown > 0) return;

    const cleanPhone = mobileNumber.trim();
    const existingRate = getStoredOtpState(cleanPhone);
    const now = Date.now();

    if (
      existingRate &&
      existingRate.attempts >= MAX_OTP_ATTEMPTS &&
      existingRate.lockoutEnd &&
      now < existingRate.lockoutEnd
    ) {
      toast.error('Maximum attempts reached. Please request after 1 hr.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        await authApi.requestSignupOtp(cleanPhone);
      } else {
        await authApi.requestLoginOtp(cleanPhone);
      }
      toast.info(`Verification code resent to +91 ${cleanPhone}`);
      triggerOtpCooldown(cleanPhone);
    } catch (err: any) {
      const friendlyMessage = translateAuthError(err, mode === 'signup' ? 'signup' : 'login-otp');
      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between font-sans selection:bg-ink selection:text-surface select-none">
      {/* Navbar: Brand on left, <- Home on right */}
      <header className="w-full border-b border-border bg-bg/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-14 sm:h-16 flex items-center justify-between">
          <Link
            to="/"
            aria-label="Kauntact Home"
            className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          >
            <KauntactLogo height={18} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-muted hover:text-ink uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Canvas — Cardless */}
      <main className="my-auto py-10 sm:py-16 px-6 sm:px-10 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-[360px] sm:max-w-[380px] mx-auto" key={step}>
          {/* Headline & Subtext (Centered) */}
          <div className="space-y-2 mb-8 text-center">
            <h1 className="font-display font-medium text-4xl sm:text-5xl text-ink uppercase tracking-tight leading-none">
              {step === 'OTP'
                ? 'VERIFY CODE.'
                : mode === 'signup'
                  ? 'GET STARTED.'
                  : 'SIGN IN.'}
            </h1>
            <p className="font-sans text-xs sm:text-sm text-muted max-w-[320px] mx-auto leading-relaxed">
              {step === 'OTP'
                ? `Enter the 6-digit passcode sent to +91 ${mobileNumber}.`
                : mode === 'signup'
                  ? 'Set up your stickers and private relay in under a minute.'
                  : loginMethod === 'password'
                    ? 'Sign in to manage your tags and account.'
                    : 'Enter your registered mobile number to receive a verification code.'}
            </p>
          </div>

          {step === 'DETAILS' ? (
            <form onSubmit={handleDetailsSubmit} className="space-y-4 text-left">
              {/* Full Name Field: Smoothly expands in signup, collapses in login */}
              <div
                className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${mode === 'signup'
                    ? 'max-h-24 opacity-100 translate-y-0 mb-4'
                    : 'max-h-0 opacity-0 -translate-y-2 mb-0 pointer-events-none'
                  }`}
                style={{
                  transitionProperty: 'max-height, opacity, transform, margin-bottom',
                }}
              >
                <Input
                  label="Full name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  tabIndex={mode === 'signup' ? 0 : -1}
                />
              </div>

              {/* Mobile Phone Number */}
              <div className="animate-fall-d1">
                <PhoneInput
                  label="Mobile number"
                  value={mobileNumber}
                  onChange={(val) => setMobileNumber(val)}
                  autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768 && mode === 'login'}
                />
              </div>

              {/* Password Field: Displayed on Signup AND on Password Login */}
              <div
                className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${mode === 'signup' || (mode === 'login' && loginMethod === 'password')
                    ? 'max-h-28 opacity-100 translate-y-0'
                    : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                style={{
                  transitionProperty: 'max-height, opacity, transform',
                }}
              >
                <Input
                  label={mode === 'signup' ? 'Create password' : 'Password'}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText={
                    mode === 'signup'
                      ? 'Must be at least 6 characters'
                      : undefined
                  }
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted hover:text-ink transition-colors cursor-pointer p-1"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              </div>

              {/* Login Method Toggle: Switch between Password and OTP */}
              {mode === 'login' && (
                <div className="flex justify-end pt-0.5">
                  {loginMethod === 'password' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('otp');
                      }}
                      className="text-xs font-sans text-muted hover:text-ink underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Log in with OTP instead
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('password');
                      }}
                      className="text-xs font-sans text-muted hover:text-ink underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Log in with password instead
                    </button>
                  )}
                </div>
              )}

              {/* Submit Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full !h-12 text-xs font-mono tracking-wider uppercase font-semibold !bg-ink !text-surface hover:opacity-90 transition-opacity rounded-sm cursor-pointer"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {mode === 'signup'
                    ? 'GET STARTED'
                    : loginMethod === 'password'
                      ? 'SIGN IN'
                      : 'SEND CODE'}
                </Button>
              </div>

              {/* Text link below Sign In / Continue button */}
              <div className="pt-4 text-center">
                <p className="text-xs font-sans text-muted">
                  {mode === 'signup' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchToMode('login')}
                        className="font-medium text-ink underline underline-offset-4 hover:text-muted transition-colors cursor-pointer"
                      >
                        Sign in →
                      </button>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => switchToMode('signup')}
                        className="font-medium text-ink underline underline-offset-4 hover:text-muted transition-colors cursor-pointer"
                      >
                        Get started →
                      </button>
                    </>
                  )}
                </p>
              </div>
            </form>
          ) : (
            /* OTP VERIFICATION STEP — Cardless, Symmetrical, Editorial */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* Clean inline number summary (cardless) */}
              <div className="text-center pb-1">
                <span className="text-xs font-mono font-medium text-muted">
                  +91 {mobileNumber}
                </span>
                <span className="mx-2 text-muted/40">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('DETAILS');
                    setOtp('');
                  }}
                  className="text-xs font-sans text-ink underline underline-offset-2 hover:text-muted cursor-pointer transition-colors"
                >
                  Edit
                </button>
              </div>

              {/* 6-digit Code Input */}
              <div className="animate-fall-d1 text-center">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-2 text-center">
                  6-DIGIT PASSCODE
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(raw);
                  }}
                  maxLength={6}
                  className="text-center font-mono font-medium text-2xl tracking-[0.35em] !h-14 !rounded-sm"
                  autoFocus={typeof window !== 'undefined' && window.innerWidth >= 768}
                />
              </div>

              {/* Submit Verification Button */}
              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full !h-12 text-xs font-mono tracking-wider uppercase font-semibold !bg-ink !text-surface hover:opacity-90 transition-opacity rounded-sm cursor-pointer"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {mode === 'signup' ? 'VERIFY & REGISTER' : 'VERIFY & ENTER'}
                </Button>
              </div>

              {/* Symmetrical Secondary Actions */}
              <div className="pt-3 flex flex-col items-center gap-3 text-center">
                {otpAttempts >= MAX_OTP_ATTEMPTS && otpCooldown === 0 && !isDelayingTimer ? (
                  <span className="text-xs font-mono text-muted select-none">
                    Maximum attempts reached. Please request after 1 hr.
                  </span>
                ) : isDelayingTimer || otpCooldown > 0 ? (
                  <span className="text-xs font-mono text-muted select-none">
                    Resend code in {otpCooldown > 0 ? `${otpCooldown}s` : '60s'}
                  </span>
                ) : (
                  <p className="text-xs font-sans text-muted">
                    Didn&apos;t receive it?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="font-medium text-ink underline underline-offset-4 hover:text-muted cursor-pointer transition-colors"
                    >
                      Resend code →
                    </button>
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('DETAILS');
                    setOtp('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink cursor-pointer transition-colors font-mono uppercase tracking-wider"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to {mode === 'signup' ? 'Details' : 'Sign in'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="w-full max-w-4xl mx-auto py-6 text-center text-xs text-muted/60 font-sans">
        © {new Date().getFullYear()} Kauntact. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthPage;


