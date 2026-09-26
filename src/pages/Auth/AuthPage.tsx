import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { authApi } from '../../lib/api';
import {
  Button,
  Input,
  PhoneInput,
  validatePhoneNumber,
  Divider,
  ConnectionMotif,
  useToast,
} from '../../components/ui';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { PingInLogo } from '../../components/brand/PingInLogo';

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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setHasError(false);
    setErrorMessage(null);
  }, [step, mode, loginMethod]);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

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
    setHasError(false);
    setErrorMessage(null);
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
      setHasError(true);
      const msg = 'Please enter your full name';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    const validation = validatePhoneNumber(mobileNumber);
    if (!validation.isValid) {
      setHasError(true);
      const msg = validation.error || 'Please enter a valid 10-digit mobile number';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    // Password validation for signup or password login
    if ((mode === 'signup' || (mode === 'login' && loginMethod === 'password')) && !password) {
      setHasError(true);
      const msg = 'Please enter your password';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setHasError(true);
      const msg = 'Password must be at least 6 characters';
      setErrorMessage(msg);
      toast.error(msg);
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
      setHasError(true);
      const msg = 'Maximum attempts reached. Please request after 1 hr.';
      setErrorMessage(msg);
      toast.error(msg);
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
    setHasError(false);
    setErrorMessage(null);

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
      setHasError(true);
      const context =
        mode === 'signup'
          ? 'signup'
          : loginMethod === 'password'
          ? 'login-password'
          : 'login-otp';
      const friendlyMessage = translateAuthError(err, context);
      setErrorMessage(friendlyMessage);
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
      setHasError(true);
      const msg = 'Please enter the 6-digit code sent to your phone';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);

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
      setHasError(true);
      const friendlyMessage = translateAuthError(err, 'otp-verify');
      setErrorMessage(friendlyMessage);
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
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between p-6 sm:p-10 lg:p-12 select-none font-sans">
      <div className="max-w-6xl mx-auto w-full flex flex-col justify-between flex-1">
        {/* Top Bar: Brand Identity & Metadata */}
        <header>
          <div className="flex items-center justify-between pb-5">
            <Link to="/" className="flex items-center gap-2 group">
              <PingInLogo height={32} width={136} />
            </Link>
            <div className="flex items-center gap-3">
              <span className="label text-[10px] text-muted tracking-widest uppercase">
                2026
              </span>
            </div>
          </div>
          <Divider />
        </header>

        {/* Main Balanced Two-Zone Canvas */}
        <main className="my-auto py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Zone: Static Anchored Brand Statement */}
          <div className="lg:col-span-7 space-y-6 pr-0 lg:pr-6">
            <h1 className="font-display font-medium text-4xl sm:text-6xl lg:text-7xl leading-[1.1] text-ink uppercase">
              TAG <span className="inline-block ml-2 sm:ml-1">IT</span><br />
              SCAN <span className="inline-block ml-2 sm:ml-1">IT</span><br />
              PING <span className="inline-block ml-2 sm:ml-1">IT.</span>
            </h1>
            <div className="pt-1 pb-1">
              <ConnectionMotif className="w-24 sm:w-32" active />
            </div>
            <p className="body text-muted max-w-md text-base sm:text-lg leading-relaxed">
              A direct, private way to reach vehicle owners without sharing phone numbers.
            </p>
          </div>

          {/* Right Zone: Graceful Interaction Pane */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:ml-auto">
            <div key={step}>
            {/* Header with Title and Dynamic Subtext */}
            <div className="mb-7 animate-fall">
              <div className="border-b-2 border-ink inline-block pb-1.5 transition-all duration-300">
                <h2 className="label text-xs tracking-[0.14em] font-semibold text-ink uppercase">
                  {step === 'OTP'
                    ? mode === 'signup'
                      ? 'VERIFY PHONE'
                      : 'VERIFY CODE'
                    : mode === 'signup'
                    ? 'CREATE ACCOUNT'
                    : loginMethod === 'password'
                    ? 'SIGN IN'
                    : 'SIGN IN WITH OTP'}
                </h2>
              </div>
              <p className="body-sm text-muted mt-2 min-h-[38px] transition-all duration-300 leading-relaxed">
                {step === 'OTP'
                  ? `Enter the 6-digit code sent to +91 ${mobileNumber}`
                  : mode === 'signup'
                  ? 'Register your profile and set a password to manage private contact links.'
                  : loginMethod === 'password'
                  ? 'Enter your mobile number and password to access your account.'
                  : 'Enter your mobile number to receive a one-time passcode.'}
              </p>
            </div>

            {/* Error Banner when present */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-sm border border-danger/40 bg-danger/10 text-danger text-xs font-sans leading-relaxed animate-fall">
                {errorMessage}
              </div>
            )}

            {step === 'DETAILS' ? (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                {/* Full Name Field: Smoothly expands in signup, collapses in login */}
                <div
                  className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    mode === 'signup'
                      ? 'max-h-24 opacity-100 translate-y-0 mb-4'
                      : 'max-h-0 opacity-0 -translate-y-2 mb-0 pointer-events-none'
                  }`}
                  style={{
                    transitionProperty: 'max-height, opacity, transform, margin-bottom',
                  }}
                >
                  <Input
                    label="Full name"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (hasError) {
                        setHasError(false);
                        setErrorMessage(null);
                      }
                    }}
                    tabIndex={mode === 'signup' ? 0 : -1}
                  />
                </div>

                {/* Mobile Phone Number */}
                <div className="animate-fall-d1">
                  <PhoneInput
                    label="Mobile number"
                    value={mobileNumber}
                    onChange={(val) => {
                      setMobileNumber(val);
                      if (hasError) {
                        setHasError(false);
                        setErrorMessage(null);
                      }
                    }}
                    error={hasError && !mobileNumber ? ' ' : undefined}
                    autoFocus={mode === 'login'}
                  />
                </div>

                {/* Password Field: Displayed on Signup AND on Password Login */}
                <div
                  className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    mode === 'signup' || (mode === 'login' && loginMethod === 'password')
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (hasError) {
                        setHasError(false);
                        setErrorMessage(null);
                      }
                    }}
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
                          setHasError(false);
                          setErrorMessage(null);
                        }}
                        className="text-xs font-sans text-muted hover:text-ink underline transition-colors cursor-pointer"
                      >
                        Log in with OTP instead
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod('password');
                          setHasError(false);
                          setErrorMessage(null);
                        }}
                        className="text-xs font-sans text-muted hover:text-ink underline transition-colors cursor-pointer"
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
                    className="w-full !h-12 text-sm tracking-wider uppercase font-semibold"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {mode === 'signup'
                      ? 'CONTINUE'
                      : loginMethod === 'password'
                      ? 'SIGN IN'
                      : 'SEND CODE'}
                  </Button>
                </div>
              </form>
            ) : (
              /* OTP VERIFICATION STEP */
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* User Credentials Summary (for signup: includes name & mobile) */}
                <div className="p-3.5 rounded-sm border border-border bg-surface/60 flex items-center justify-between text-xs animate-fall">
                  <div>
                    {mode === 'signup' && name ? (
                      <div className="font-semibold text-ink text-sm mb-0.5">
                        {name}
                      </div>
                    ) : null}
                    <div className="text-muted font-sans font-medium">
                      +91 {mobileNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('DETAILS');
                      setOtp('');
                      setHasError(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-semibold text-ink hover:text-muted underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* 6-digit Code Input */}
                <div className="animate-fall-d1">
                  <label className="block text-xs font-medium text-muted mb-2">
                    Verification code
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(raw);
                      if (hasError) {
                        setHasError(false);
                        setErrorMessage(null);
                      }
                    }}
                    error={hasError ? ' ' : undefined}
                    maxLength={6}
                    className="text-center font-sans font-medium text-2xl tracking-[0.3em] !h-14"
                    autoFocus
                  />
                </div>

                {/* Submit Verification */}
                <div className="animate-fall-d2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full !h-12 text-sm tracking-wider uppercase font-semibold"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {mode === 'signup' ? 'VERIFY & REGISTER' : 'VERIFY & SIGN IN'}
                  </Button>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between pt-1 animate-fall-d3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('DETAILS');
                      setOtp('');
                      setHasError(false);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to details
                  </button>

                  {otpAttempts >= MAX_OTP_ATTEMPTS && otpCooldown === 0 && !isDelayingTimer ? (
                    <span className="text-xs font-medium text-muted select-none">
                      Request after 1 hr
                    </span>
                  ) : isDelayingTimer || otpCooldown > 0 ? (
                    <span className="text-xs text-muted select-none">
                      Resend code in {otpCooldown > 0 ? `${otpCooldown}s` : '60s'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-xs font-semibold text-ink underline hover:text-muted cursor-pointer transition-colors"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Bottom Form Switcher between Sign In and Sign Up */}
            {step === 'DETAILS' && (
              <div className="mt-8">
                <Divider className="mb-5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {mode === 'signup' ? 'Already registered?' : 'No account yet?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => switchToMode(mode === 'signup' ? 'login' : 'signup')}
                    className="font-semibold text-ink hover:text-muted uppercase tracking-wider underline transition-colors cursor-pointer"
                  >
                    {mode === 'signup' ? 'SIGN IN →' : 'CREATE AN ACCOUNT →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Bar: Protocol & Privacy Metadata */}
      <footer>
        <Divider className="mb-5" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-sans text-muted tracking-wider uppercase">
          {/* <span>PINGIN IDENTITY</span> */}
          <span>PRIVACY FIRST COMMUNICATION</span>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default AuthPage;
