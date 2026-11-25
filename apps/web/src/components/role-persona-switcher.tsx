'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RolePersonaSwitcherProps {
  currentRole: string;
  actualRole?: string;
  switchAction: (role: string) => Promise<void>;
}

const ROLES_LIST = [
  {
    key: 'owner',
    title: 'Property Owner',
    icon: '👑',
    desc: 'Full P&L, RevPAR, Owner Income, Staff Governance & Multi-Branch',
    badge: 'Executive',
  },
  {
    key: 'manager',
    title: 'General Manager',
    icon: '👔',
    desc: 'Front Desk operations, Day-End Night Audit, Staff Management & OTAs',
    badge: 'Operations',
  },
  {
    key: 'frontdesk',
    title: 'Front Desk / Receptionist',
    icon: '🛎️',
    desc: 'Tape Chart, Check-in/out, Guest KYC, Billing & Restaurant POS',
    badge: 'Front Desk',
  },
  {
    key: 'housekeeping',
    title: 'Housekeeping Staff',
    icon: '🧹',
    desc: 'Rooms queue, Dirty ⇄ Clean ⇄ Ready toggles & Maintenance logs',
    badge: 'Mobile View',
  },
] as const;

export function RolePersonaSwitcher({
  currentRole,
  actualRole = 'owner',
  switchAction,
}: RolePersonaSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPreview = currentRole !== actualRole;
  const currentMeta = ROLES_LIST.find((r) => r.key === currentRole) || {
    key: currentRole,
    title: currentRole,
    icon: '👤',
    desc: '',
    badge: 'Staff',
  };

  const handleSelectRole = async (targetRole: string) => {
    setIsSwitching(true);
    setIsOpen(false);
    try {
      await switchAction(targetRole);
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Role Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isSwitching}
        aria-expanded={isOpen}
        aria-label={`Role: ${currentMeta.title}. Click to switch role preview.`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1 text-xs font-semibold shadow-2xs transition cursor-pointer select-none ${
          isPreview
            ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200'
            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-white'
        }`}
        title="Role-Based Access Control: Click to preview different staff roles"
      >
        <span>{currentMeta.icon}</span>
        <span className="capitalize">{currentMeta.title}</span>
        {isPreview && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Preview
          </span>
        )}
        <svg
          className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 dark:border-white/10 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-2.5 mb-2 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Role-Based Access Control</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                Live Preview
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
              Switch roles to experience what staff members see and verify that restricted pages are protected.
            </p>
          </div>

          <div className="space-y-1.5">
            {ROLES_LIST.map((r) => {
              const isSelected = r.key === currentRole;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleSelectRole(r.key)}
                  className={`w-full rounded-xl p-2.5 text-left transition flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                      : 'border border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl mt-0.5">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {r.title}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                        {r.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      {r.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-1">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isPreview && (
            <div className="border-t border-slate-100 pt-2.5 mt-2 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleSelectRole('owner')}
                className="w-full py-1.5 text-center text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer dark:bg-rose-950/30 dark:text-rose-400"
              >
                ✕ Exit Staff Preview (Return to Owner)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
