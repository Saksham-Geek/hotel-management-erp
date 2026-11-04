'use client';

import { useState } from 'react';
import Link from 'next/link';
import { btnCls, inputCls } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { login } from './actions';

export function LoginForm() {
  const [tenant, setTenant] = useState('grand-azure');
  const [email, setEmail] = useState('owner@grandazure.test');
  const [password, setPassword] = useState('ChangeMe-123!');

  function fillDemo(t: string, e: string, p: string) {
    setTenant(t);
    setEmail(e);
    setPassword(p);
  }

  return (
    <div className="space-y-5">
      {/* Quick Demo Pre-fills */}
      <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.04] p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
          <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          <span>Quick Demo Access (1-Click Fill)</span>
        </div>
        <p className="mt-1 text-[11px] text-muted leading-tight">
          Click any role below to pre-fill live seeded credentials:
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => fillDemo('grand-azure', 'owner@grandazure.test', 'ChangeMe-123!')}
            className="rounded-lg border border-teal-200 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-teal-800 dark:text-teal-200 shadow-xs hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all cursor-pointer"
          >
            👑 Owner (Asha)
          </button>
          <button
            type="button"
            onClick={() => fillDemo('grand-azure', 'desk@grandazure.test', 'ChangeMe-123!')}
            className="rounded-lg border border-teal-200 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:text-teal-200 shadow-xs hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all cursor-pointer"
          >
            🛎 Front Desk (Meera)
          </button>
          <button
            type="button"
            onClick={() => fillDemo('grand-azure', 'manager@grandazure.test', 'ChangeMe-123!')}
            className="rounded-lg border border-teal-200 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:text-teal-200 shadow-xs hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all cursor-pointer"
          >
            👔 Manager (Rohan)
          </button>
        </div>
      </div>

      <form action={login} className="space-y-4">
        <label className="block text-xs font-semibold text-ink">
          Hotel Organization Code
          <input
            name="tenant"
            required
            autoComplete="organization"
            placeholder="e.g. grand-azure"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className={`${inputCls} mt-1.5 font-mono text-sm`}
          />
        </label>

        <label className="block text-xs font-semibold text-ink">
          Work Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="name@hotel.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputCls} mt-1.5 text-sm`}
          />
        </label>

        <label className="block text-xs font-semibold text-ink">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} mt-1.5 text-sm`}
          />
        </label>

        <div className="-mt-1 text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline dark:text-teal-400"
          >
            Forgot password?
          </Link>
        </div>

        <FormSubmit
          className={`${btnCls} mt-2 w-full bg-slate-900 py-3 text-sm text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 font-semibold cursor-pointer shadow-md`}
          pendingLabel="Authenticating…"
        >
          Sign In to Property
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 ml-1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </FormSubmit>
      </form>
    </div>
  );
}
