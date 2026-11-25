'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { btnCls, inputCls } from '@/components/ui';

export function LoginForm() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [tenant, setTenant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // OTP workflow state
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus OTP input when transitioning to verify step
  useEffect(() => {
    if (otpStep === 'verify') {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [otpStep]);

  const handleSendOtp = () => {
    setOtpError(null);
    setOtpSuccess(null);

    const cleanTenant = tenant.trim();
    const cleanEmail = email.trim();

    if (!cleanTenant) {
      setOtpError('Please enter your property organization code (e.g. saksham-hotel).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setOtpError('Please enter a valid work email address.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: cleanTenant, email: cleanEmail }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setOtpError(data.error || 'Failed to send verification code.');
          return;
        }
        setOtpSuccess(data.message || 'Verification code sent to your email.');
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setOtpStep('verify');
        setCooldown(60);
      } catch {
        setOtpError('API server is unreachable. Check your connection.');
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setOtpError('Please enter the 6-digit code sent to your email.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: tenant.trim(), email: email.trim(), otp: cleanOtp }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setOtpError(data.error || 'Invalid or expired code.');
          return;
        }
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          router.push('/dashboard');
        }
      } catch {
        setOtpError('Unable to connect to authentication service. Please check your connection.');
      }
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setIsSubmittingPassword(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenant.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setPasswordError(data.error || 'Invalid organization code, email, or password.');
        setIsSubmittingPassword(false);
        return;
      }

      window.location.href = data.redirectUrl || '/dashboard';
    } catch {
      setPasswordError('Unable to connect to authentication service. Please check your connection.');
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Auth Method Switcher Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            setAuthMode('otp');
            setOtpError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
            authMode === 'otp'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <MailCheckIcon />
          <span>Email Code (OTP)</span>
          <span className="rounded-md bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold text-teal-600 dark:text-teal-400">
            Secure
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode('password');
            setOtpError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
            authMode === 'password'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <LockIcon />
          <span>Password</span>
        </button>
      </div>

      {/* OTP Error Banner */}
      {otpError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
          <span className="text-sm shrink-0">⚠️</span>
          <span className="font-medium leading-relaxed">{otpError}</span>
        </div>
      )}

      {/* OTP Success Notice */}
      {otpSuccess && otpStep === 'verify' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start gap-2">
          <span className="text-sm shrink-0">✉️</span>
          <span className="font-medium leading-relaxed">{otpSuccess}</span>
        </div>
      )}

      {/* Dev helper banner for local testing */}
      {devOtp && otpStep === 'verify' && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/90 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300">
              Dev Mode Auto-Fill
            </span>
            <button
              type="button"
              onClick={() => setOtp(devOtp)}
              className="text-[11px] underline font-bold hover:text-amber-950 dark:hover:text-amber-100"
            >
              Fill Code
            </button>
          </div>
          <p className="mt-1 font-mono text-sm font-extrabold tracking-widest text-slate-900 dark:text-amber-100">
            {devOtp}
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5">
            (Resend API key not configured or in local dev; production dispatches real emails)
          </p>
        </div>
      )}

      {/* ======================= EMAIL OTP MODE ======================= */}
      {authMode === 'otp' && (
        <div className="space-y-4">
          {otpStep === 'request' ? (
            <div className="space-y-4">
              {/* Property Organization Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Property Organization Code
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <BuildingIcon />
                  </div>
                  <input
                    name="tenant"
                    required
                    autoComplete="organization"
                    placeholder="e.g. saksham-hotel"
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    className={`${inputCls} pl-10 font-mono text-sm`}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  The unique code of your hotel workspace.
                </p>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Work Email Address
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <MailIcon />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="name@yourhotel.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputCls} pl-10 text-sm`}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  We will send a 6-digit one-time code to verify your identity.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSendOtp}
                  className={`${btnCls} w-full bg-slate-900 py-3 text-sm text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-md transition-all active:scale-[0.99] disabled:opacity-50`}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner /> Sending Code…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Send 6-Digit Code
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Recipient summary & change link */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Signing into</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {tenant} · <span className="text-slate-600 dark:text-slate-400 font-normal">{email}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('request');
                    setOtp('');
                    setOtpError(null);
                  }}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline"
                >
                  Change
                </button>
              </div>

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Enter 6-Digit Code
                </label>
                <div className="relative mt-1.5">
                  <input
                    ref={otpInputRef}
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                    }}
                    className={`${inputCls} text-center font-mono text-xl tracking-[0.4em] font-bold py-3.5`}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Code valid for 10 minutes
                  </span>
                  {cooldown > 0 ? (
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      Resend in {cooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSendOtp}
                      className="font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || otp.length !== 6}
                  className={`${btnCls} w-full bg-slate-900 py-3 text-sm text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-md transition-all active:scale-[0.99] disabled:opacity-50`}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner /> Verifying…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Verify &amp; Sign In
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ===================== PASSWORD MODE ===================== */}
      {authMode === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
              <span className="text-sm shrink-0">⚠️</span>
              <span className="font-medium leading-relaxed">{passwordError}</span>
            </div>
          )}

          {/* Property Organization Code */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Property Organization Code
            </label>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <BuildingIcon />
              </div>
              <input
                name="tenant"
                required
                autoComplete="organization"
                placeholder="e.g. your-property-slug"
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                className={`${inputCls} pl-10 font-mono text-sm`}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              The unique identifier assigned to your hotel organization.
            </p>
          </div>

          {/* Work Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
              Work Email Address
            </label>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <MailIcon />
              </div>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="name@yourhotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputCls} pl-10 text-sm`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <LockIcon />
              </div>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-10 text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className={`${btnCls} w-full bg-slate-900 py-3 text-sm text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isSubmittingPassword ? (
                <>
                  <Spinner />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In with Password</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Clean Onboarding Link for New Hoteliers */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2.5">
        <Link
          href="/onboard"
          className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-3 text-xs hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all group"
        >
          <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs">
              ✦
            </span>
            <span>New property? Register for a fresh workspace</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 group-hover:translate-x-0.5 transition-transform">
            Register Hotel →
          </span>
        </Link>

        {/* Discreet Client Showcase Link for Evaluators */}
        <div className="text-center pt-1">
          <Link
            href="/showcase"
            className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Need to preview showcase environments? Explore Client Showcase →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function MailCheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
