'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Banner, btnCls, btnGhostCls, inputCls } from '@/components/ui';
import { selfOnboardAction } from './actions';

interface OnboardFormProps {
  initialError?: string;
}

export function OnboardForm({ initialError }: OnboardFormProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(initialError ?? null);

  // Form Fields State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [city, setCity] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [planKey, setPlanKey] = useState<'starter' | 'growth' | 'enterprise'>('growth');

  const [ownerName, setOwnerName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('OwnerPass123!');
  const [showPassword, setShowPassword] = useState(false);

  const [seedInitialRooms, setSeedInitialRooms] = useState(false); // Default to clean fresh blank slate!
  const [initialFloors, setInitialFloors] = useState(3);
  const [roomsPerFloor, setRoomsPerFloor] = useState(4);

  // Auto-generate slug when name changes if user hasn't manually tweaked it
  function handleNameChange(val: string) {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
      setSlug(generated);
    }
  }

  function validateStep(currStep: number): boolean {
    setLocalError(null);
    if (currStep === 1) {
      if (!name.trim()) {
        setLocalError('Please enter your hotel or resort name.');
        return false;
      }
      if (!slug.trim() || slug.length < 2) {
        setLocalError('Hotel organization code must be at least 2 characters.');
        return false;
      }
      if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) {
        setLocalError('Hotel code must contain lowercase letters, numbers, and hyphens only.');
        return false;
      }
      if (!contactPhone.trim()) {
        setLocalError('Please provide a contact phone or WhatsApp number.');
        return false;
      }
    } else if (currStep === 2) {
      if (!planKey) {
        setLocalError('Please select a hospitality plan tier.');
        return false;
      }
    } else if (currStep === 3) {
      if (!ownerName.trim()) {
        setLocalError('Please provide the owner or general manager name.');
        return false;
      }
      if (!contactEmail.trim() || !contactEmail.includes('@')) {
        setLocalError('Please provide a valid official work email address.');
        return false;
      }
      if (ownerPassword.length < 8) {
        setLocalError('Master password must be at least 8 characters long.');
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (validateStep(step)) {
      setStep((prev) => (Math.min(prev + 1, 4) as 1 | 2 | 3 | 4));
    }
  }

  function goBack() {
    setLocalError(null);
    setStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3 | 4));
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/90 pb-4">
        {[
          { num: 1, label: 'Hotel Profile' },
          { num: 2, label: 'Choose Plan' },
          { num: 3, label: 'Owner Account' },
          { num: 4, label: 'Inventory & Launch' },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => {
              if (s.num < step || validateStep(step)) {
                setStep(s.num as any);
              }
            }}
            className={`flex items-center gap-2 text-xs font-bold transition-all ${
              step === s.num
                ? 'text-slate-950 font-black'
                : step > s.num
                ? 'text-emerald-700'
                : 'text-slate-400 opacity-60'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s.num
                  ? 'bg-slate-900 text-white shadow-sm'
                  : step > s.num
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {localError && <Banner error={localError} />}

      <form
        action={selfOnboardAction}
        onSubmit={(e) => {
          if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            e.preventDefault();
            return;
          }
          setIsSubmitting(true);
        }}
        className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm space-y-8"
      >
        {/* Hidden inputs to preserve all state across wizard steps */}
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="contactPhone" value={contactPhone} />
        <input type="hidden" name="planKey" value={planKey} />
        <input type="hidden" name="ownerName" value={ownerName} />
        <input type="hidden" name="contactEmail" value={contactEmail} />
        <input type="hidden" name="ownerPassword" value={ownerPassword} />
        <input type="hidden" name="seedInitialRooms" value={seedInitialRooms ? 'true' : 'false'} />
        <input type="hidden" name="initialFloors" value={initialFloors} />
        <input type="hidden" name="roomsPerFloor" value={roomsPerFloor} />

        {/* ========================================================= */}
        {/* STEP 1: HOTEL & PROPERTY INFO */}
        {/* ========================================================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <span>Step 1 of 4</span>
              </span>
              <h2 className="text-2xl font-black text-slate-950 font-display">
                Tell us about your property
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Enter your property details. This will configure your front desk, guest folios, and tape chart.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Hotel / Resort Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Orchid Resort &amp; Spa"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`${inputCls} text-base font-semibold`}
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Appears on guest registration cards, tax invoices, and tape chart headers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Hotel Code / Subdomain *
                </label>
                <div className="flex rounded-xl shadow-2xs">
                  <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-500">
                    app/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="royal-orchid"
                    value={slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    className={`${inputCls} rounded-l-none font-mono text-sm`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Unique identifier used by your team to log in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jaipur, Rajasthan"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Contact Phone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Used for account security alerts and platform subscription notifications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: CHOOSE PLAN */}
        {/* ========================================================= */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
                <span>Step 2 of 4</span>
              </span>
              <h2 className="text-2xl font-black text-slate-950 font-display">
                Select your hospitality tier
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Every tier includes a <strong>14-Day Free Trial</strong> with zero setup fees. Upgrade or cancel anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Starter Tier */}
              <div
                onClick={() => setPlanKey('starter')}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                  planKey === 'starter'
                    ? 'border-slate-950 bg-slate-900 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">Starter</span>
                    <span className="text-xl">🛎️</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black">₹1,999</span>
                    <span className={`text-xs ml-1 ${planKey === 'starter' ? 'text-slate-300' : 'text-slate-500'}`}>
                      / mo
                    </span>
                  </div>
                  <p className={`text-xs ${planKey === 'starter' ? 'text-slate-200' : 'text-slate-600'}`}>
                    Ideal for small independent boutique stays and B&amp;Bs up to 15 rooms.
                  </p>
                  <ul className="text-xs space-y-1.5 pt-2 border-t border-slate-200/20">
                    <li>✓ Up to 15 Rooms</li>
                    <li>✓ Frontdesk Check-in/out</li>
                    <li>✓ Quick Guest Folios</li>
                    <li>✓ GST Invoicing</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3">
                  <span
                    className={`inline-block w-full py-1.5 rounded-xl text-center text-xs font-bold ${
                      planKey === 'starter'
                        ? 'bg-white text-slate-950'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {planKey === 'starter' ? 'Selected' : 'Select Starter'}
                  </span>
                </div>
              </div>

              {/* Growth Tier (Recommended) */}
              <div
                onClick={() => setPlanKey('growth')}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                  planKey === 'growth'
                    ? 'border-indigo-600 bg-indigo-950 text-white shadow-lg ring-2 ring-indigo-500 scale-[1.03]'
                    : 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-400'
                }`}
              >
                <div className="absolute -top-3 right-4">
                  <span className="rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                    Most Popular
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Growth
                    </span>
                    <span className="text-xl">🏢</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black">₹5,999</span>
                    <span className={`text-xs ml-1 ${planKey === 'growth' ? 'text-indigo-200' : 'text-slate-500'}`}>
                      / mo
                    </span>
                  </div>
                  <p className={`text-xs ${planKey === 'growth' ? 'text-indigo-100' : 'text-slate-600'}`}>
                    For bustling hotels, multi-floor properties, and growing hotel businesses.
                  </p>
                  <ul className="text-xs space-y-1.5 pt-2 border-t border-white/20">
                    <li>✓ Up to 60 Rooms</li>
                    <li>✓ Visual Drag &amp; Drop Tape Chart</li>
                    <li>✓ Dynamic Seasonal Rates</li>
                    <li>✓ Housekeeping Room Rack</li>
                    <li>✓ Multi-Room Bulk Bookings</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3">
                  <span
                    className={`inline-block w-full py-1.5 rounded-xl text-center text-xs font-bold ${
                      planKey === 'growth'
                        ? 'bg-white text-indigo-950'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {planKey === 'growth' ? 'Selected' : 'Select Growth'}
                  </span>
                </div>
              </div>

              {/* Enterprise Tier */}
              <div
                onClick={() => setPlanKey('enterprise')}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                  planKey === 'enterprise'
                    ? 'border-amber-600 bg-amber-950 text-white shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Enterprise Chain
                    </span>
                    <span className="text-xl">👑</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black">₹19,999</span>
                    <span className={`text-xs ml-1 ${planKey === 'enterprise' ? 'text-amber-200' : 'text-slate-500'}`}>
                      / mo
                    </span>
                  </div>
                  <p className={`text-xs ${planKey === 'enterprise' ? 'text-amber-100' : 'text-slate-600'}`}>
                    5-Star luxury chains, multi-property portfolios, and bespoke hospitality groups.
                  </p>
                  <ul className="text-xs space-y-1.5 pt-2 border-t border-white/20">
                    <li>✓ Unlimited Rooms &amp; Properties</li>
                    <li>✓ Multi-Property Cluster Switcher</li>
                    <li>✓ VIP Guest Profiles &amp; Amenities</li>
                    <li>✓ Platform Founder REST API &amp; Webhooks</li>
                    <li>✓ Dedicated Account Manager</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3">
                  <span
                    className={`inline-block w-full py-1.5 rounded-xl text-center text-xs font-bold ${
                      planKey === 'enterprise'
                        ? 'bg-white text-amber-950'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {planKey === 'enterprise' ? 'Selected' : 'Select Enterprise'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-950 font-black text-sm">
                ✦
              </span>
              <p className="text-xs font-semibold text-emerald-950 leading-relaxed">
                <strong>14-Day Full Access Trial Activated:</strong> You will not be charged today. Experience all PMS features risk-free with live check-in, billing, and tape chart.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: OWNER ACCOUNT */}
        {/* ========================================================= */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <span>Step 3 of 4</span>
              </span>
              <h2 className="text-2xl font-black text-slate-950 font-display">
                Create owner master account
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                This account has master administrative control over properties, rates, staff permissions, and reports.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Full Name (Owner / General Manager) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singhania"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Official Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@hotel.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This will be your primary login ID.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Master Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Minimum 8 characters. You can change this anytime.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: ROOM SETUP & LAUNCH */}
        {/* ========================================================= */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                <span>Step 4 of 4</span>
              </span>
              <h2 className="text-2xl font-black text-slate-950 font-display">
                Room inventory configuration
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Choose how you want to start: with a completely clean blank slate, or pre-seeded standard rooms.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Option A: Clean Blank Slate (Requested by user) */}
              <div
                onClick={() => setSeedInitialRooms(false)}
                className={`flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                  !seedInitialRooms
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">
                      Clean Blank Slate (0 Rooms)
                    </span>
                    <span className="text-xl">✨</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Start with a fresh empty hotel. You will manually add your exact room numbers, suites, and customized floor layouts later in Settings.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mt-1">
                    Recommended for real hotels &amp; custom builds
                  </span>
                </div>
                <div className="mt-4 pt-2">
                  <span
                    className={`inline-block w-full py-1.5 rounded-xl text-center text-xs font-bold ${
                      !seedInitialRooms
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {!seedInitialRooms ? '✓ Selected: Blank Slate' : 'Choose Blank Slate'}
                  </span>
                </div>
              </div>

              {/* Option B: Quick Starter Inventory */}
              <div
                onClick={() => setSeedInitialRooms(true)}
                className={`flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                  seedInitialRooms
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">
                      Quick Starter Inventory
                    </span>
                    <span className="text-xl">⚡</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Auto-creates standard Deluxe Rooms &amp; Executive Suites across your chosen floors so you can immediately test check-ins on the Tape Chart.
                  </p>
                  <span className="inline-block text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md mt-1">
                    Instant Ready-to-Operate Setup
                  </span>
                </div>
                <div className="mt-4 pt-2">
                  <span
                    className={`inline-block w-full py-1.5 rounded-xl text-center text-xs font-bold ${
                      seedInitialRooms
                        ? 'bg-indigo-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {seedInitialRooms ? '✓ Selected: Starter Inventory' : 'Choose Starter Inventory'}
                  </span>
                </div>
              </div>
            </div>

            {/* If Starter Inventory Selected: configure floors & rooms */}
            {seedInitialRooms && (
              <div className="rounded-2xl border border-indigo-200 bg-white p-5 space-y-4 animate-in fade-in-50 duration-150">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                  Starter Inventory Dimensions
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Floors ({initialFloors})
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={initialFloors}
                      onChange={(e) => setInitialFloors(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>1 Floor</span>
                      <span>6 Floors</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rooms per Floor ({roomsPerFloor})
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={roomsPerFloor}
                      onChange={(e) => setRoomsPerFloor(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>2 Rooms</span>
                      <span>10 Rooms</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 flex items-center justify-between">
                  <span>Total Rooms Generated:</span>
                  <span className="font-black text-indigo-950 text-sm">
                    {initialFloors * roomsPerFloor} Rooms (Standard Deluxe &amp; Executive Suites)
                  </span>
                </div>
              </div>
            )}

            {/* Launch Summary Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Setup Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Property:</span>
                  <strong className="text-slate-950 font-bold">{name || 'Your Hotel'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Organization:</span>
                  <strong className="font-mono text-slate-950 font-bold">{slug || 'code'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Plan:</span>
                  <strong className="text-slate-950 font-bold capitalize">
                    {planKey} (14d Free Trial)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Master Admin:</span>
                  <strong className="text-slate-950 font-bold">{contactEmail || 'email'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={isSubmitting}
              className={`${btnGhostCls} text-xs font-bold`}
            >
              ← Back
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Cancel &amp; Return to Login
            </Link>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className={`${btnCls} bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-6`}
            >
              Continue to Step {step + 1} →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${btnCls} bg-emerald-700 text-white hover:bg-emerald-600 text-sm font-black px-8 py-3 shadow-md flex items-center gap-2`}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Provisioning Hotel…</span>
                </>
              ) : (
                <>
                  <span>🚀 Launch Hotel &amp; Start Free Trial</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
