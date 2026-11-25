'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  href: string;
  actionText: string;
  icon: string;
  isDone: boolean;
}

export function QuickStartChecklist({
  roomCount = 0,
  hasUpiConfigured = false,
  reservationCount = 0,
  kotCount = 0,
}: {
  roomCount?: number;
  hasUpiConfigured?: boolean;
  reservationCount?: number;
  kotCount?: number;
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  const steps: ChecklistStep[] = [
    {
      id: 'rooms',
      title: '1. Configure Rooms & Tariffs',
      description: 'Setup your physical rooms, floors, and base nightly rates.',
      href: '/settings?tab=rooms',
      actionText: roomCount > 0 ? '✓ Configured' : 'Setup Rooms',
      icon: '🏨',
      isDone: roomCount > 0,
    },
    {
      id: 'banking',
      title: '2. Lock Receiving Bank UPI ID',
      description: 'Set your hotel receiving UPI ID for dynamic counter QR codes.',
      href: '/billing',
      actionText: hasUpiConfigured ? '✓ Connected' : 'Connect Bank',
      icon: '🏦',
      isDone: hasUpiConfigured,
    },
    {
      id: 'checkin',
      title: '3. Punch First Test Walk-In',
      description: 'Drag-to-select dates on the room rack or click New Walk-In.',
      href: '/tape-chart',
      actionText: reservationCount > 0 ? '✓ Practiced' : 'Try Walk-In',
      icon: '🛎️',
      isDone: reservationCount > 0,
    },
    {
      id: 'kot',
      title: '4. Fire First Kitchen KOT Order',
      description: 'Select a dining table and test punch food to the kitchen printer.',
      href: '/restaurant',
      actionText: kotCount > 0 ? '✓ Fired' : 'Try Dining POS',
      icon: '🍽️',
      isDone: kotCount > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  if (isDismissed) return null;

  return (
    <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 dark:border-indigo-900/60 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/40 p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h3 className="text-base font-black text-slate-900 dark:text-white font-display">
              Day 1 Hotel Launch &amp; Operational Checklist
            </h3>
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              {completedCount} / {steps.length} Steps
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            Complete these 4 simple steps to get your property fully operational in under 10 minutes.
          </p>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1"
          aria-label="Dismiss checklist"
        >
          ✕
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Step Cards Grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
              step.isDone
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xl">{step.icon}</span>
                {step.isDone ? (
                  <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                    ✓ Done
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold text-[10px] uppercase">Pending</span>
                )}
              </div>
              <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{step.title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {step.description}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={step.href}
                className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold text-center block transition-all ${
                  step.isDone
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                }`}
              >
                {step.actionText}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
