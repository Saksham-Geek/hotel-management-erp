'use client';

import { useState } from 'react';
import Link from 'next/link';
import { btnCls, inputCls } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { login } from './actions';

export function LoginForm() {
  const [tenant, setTenant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      <form action={login} className="space-y-4">
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
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <FormSubmit
            className={`${btnCls} w-full bg-slate-900 py-3 text-sm text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-md transition-all active:scale-[0.99]`}
            pendingLabel="Authenticating…"
          >
            Sign In to Property
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 ml-1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </FormSubmit>
        </div>

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
      </form>
    </div>
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
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
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
    </svg>
  );
}