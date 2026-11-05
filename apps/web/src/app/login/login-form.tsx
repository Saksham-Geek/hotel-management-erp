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
      {/* Client Showcase & Demo Persona Quick-Fills */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Client Showcase &amp; Demo Portfolios (1-Click Fill)</span>
          </div>
          <Link
            href="/showcase"
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View Presentation Deck →
          </Link>
        </div>

        <p className="text-[11px] text-slate-500 leading-tight">
          Select any hospitality tier to preview live properties, multi-property switching, folios, and tape chart:
        </p>

        {/* Showcase Persona Chips */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => fillDemo('taj-hotels', 'director@tajhotels.com', 'TajPalace2026!')}
            className="group flex flex-col items-start rounded-xl border border-amber-200/90 bg-[#fffcf4] dark:bg-amber-950/20 p-2 text-left shadow-2xs hover:border-amber-400 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="font-bold text-[11px] text-amber-950 dark:text-amber-200 flex items-center gap-1">
              <span>👑</span>
              <span>Taj Hotels IHCL</span>
            </span>
            <span className="text-[9px] text-amber-800 dark:text-amber-400 font-medium mt-0.5">
              Palace Mumbai &amp; Ganges
            </span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('itc-hotels', 'owner@itchotels.com', 'ItcLuxury2026!')}
            className="group flex flex-col items-start rounded-xl border border-purple-200/90 bg-[#faf8ff] dark:bg-purple-950/20 p-2 text-left shadow-2xs hover:border-purple-400 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="font-bold text-[11px] text-purple-950 dark:text-purple-200 flex items-center gap-1">
              <span>🏛️</span>
              <span>ITC Hotels Group</span>
            </span>
            <span className="text-[9px] text-purple-800 dark:text-purple-400 font-medium mt-0.5">
              ITC Maurya &amp; Mughal
            </span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('sayaji-hotels', 'owner@sayajihotels.com', 'SayajiGrowth2026!')}
            className="group flex flex-col items-start rounded-xl border border-blue-200/90 bg-[#f4faff] dark:bg-blue-950/20 p-2 text-left shadow-2xs hover:border-blue-400 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="font-bold text-[11px] text-blue-950 dark:text-blue-200 flex items-center gap-1">
              <span>🏢</span>
              <span>Sayaji Hotels</span>
            </span>
            <span className="text-[9px] text-blue-800 dark:text-blue-400 font-medium mt-0.5">
              Indore &amp; Pune Business
            </span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('radisson-india', 'franchise@radissonhotels.com', 'Radisson2026!')}
            className="group flex flex-col items-start rounded-xl border border-teal-200/90 bg-[#f4fbf7] dark:bg-teal-950/20 p-2 text-left shadow-2xs hover:border-teal-400 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="font-bold text-[11px] text-teal-950 dark:text-teal-200 flex items-center gap-1">
              <span>🌐</span>
              <span>Radisson Blu</span>
            </span>
            <span className="text-[9px] text-teal-800 dark:text-teal-400 font-medium mt-0.5">
              Mumbai &amp; Udaipur Palace
            </span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('city-boutique', 'owner@singhaniahotels.com', 'Boutique2026!')}
            className="group flex flex-col items-start rounded-xl border border-rose-200/90 bg-[#fff5f5] dark:bg-rose-950/20 p-2 text-left shadow-2xs hover:border-rose-400 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span className="font-bold text-[11px] text-rose-950 dark:text-rose-200 flex items-center gap-1">
              <span>🏰</span>
              <span>Local Multi-Hotel</span>
            </span>
            <span className="text-[9px] text-rose-800 dark:text-rose-400 font-medium mt-0.5">
              Haveli Jaipur &amp; Lakeview
            </span>
          </button>

          <button
            type="button"
            onClick={() => fillDemo('grand-azure', 'owner@grandazure.test', 'ChangeMe-123!')}
            className="group flex flex-col items-start rounded-xl border border-emerald-200/90 bg-[#f0fdf4] dark:bg-emerald-950/20 p-2 text-left shadow-2xs hover:border-emerald-400 hover:scale-[1.02] transition-all cursor-pointer ring-1 ring-emerald-500/20"
          >
            <span className="font-bold text-[11px] text-emerald-950 dark:text-emerald-200 flex items-center gap-1">
              <span>🧪</span>
              <span>Test Sandbox</span>
            </span>
            <span className="text-[9px] text-emerald-800 dark:text-emerald-400 font-medium mt-0.5">
              Grand Azure (365d stays)
            </span>
          </button>
        </div>

        {/* Platform Founder HQ Link */}
        <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2.5">
          <span className="text-[10px] text-slate-500">SaaS Business Ops:</span>
          <button
            type="button"
            onClick={() => fillDemo('platform-hq', 'founder@antigravity-erp.com', 'FounderCloud2026!')}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-2.5 py-1 text-[10px] font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>⚡ Founder &amp; Staff HQ</span>
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

        {/* New Hotel Owner Onboarding CTA */}
        <div className="pt-2">
          <Link
            href="/onboard"
            className="flex items-center justify-between rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-3 text-xs hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
          >
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-200 text-emerald-900 text-xs">
                ✦
              </span>
              <span>New Hotel Owner? Start Free 14-Day Trial</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 group-hover:translate-x-0.5 transition-transform">
              Register Hotel →
            </span>
          </Link>
        </div>
      </form>
    </div>
  );
}
