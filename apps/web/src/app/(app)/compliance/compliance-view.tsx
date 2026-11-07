'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner, btnCls, btnGhostCls, EmptyState, inputCls, StatCard } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { formatDate } from '@/lib/format';
import { createFormC, submitFormC } from './actions';

export interface PoliceGuestEntry {
  roomNumber: string;
  floor?: number;
  guestName: string;
  guestPhone: string | null;
  nationality: string | null;
  idType?: string | null;
  checkIn?: string;
  checkOut?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  isPrimary?: boolean;
}

export interface PoliceReportData {
  property: {
    name: string;
    timezone: string;
    currency: string;
  };
  reportDate: string;
  generatedAt: string;
  isHistorical?: boolean;
  summary: {
    totalInHouse: number;
    arrivalsToday: number;
    departuresToday: number;
  };
  inHouse: PoliceGuestEntry[];
  arrivals: PoliceGuestEntry[];
  departures: PoliceGuestEntry[];
}

export interface FormCRecord {
  id: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiryDate: string;
  visaNumber: string;
  visaType: string;
  visaValidUntil: string;
  arrivalDateInIndia: string;
  arrivedFrom: string;
  nextDestination: string;
  purposeOfVisit: string;
  submissionStatus: string;
  boiApplicationId: string;
  submittedAt: string | null;
  guestName: string;
  guestPhone: string | null;
  nationality: string | null;
  reservationId: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
}

export function ComplianceView({
  policeData,
  formCList,
  readOnly,
  selectedDate,
  initialTab = 'police',
}: {
  policeData: PoliceReportData;
  formCList: FormCRecord[];
  readOnly: boolean;
  selectedDate?: string;
  initialTab?: 'police' | 'formC';
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'police' | 'formC'>(initialTab);
  const [rosterView, setRosterView] = useState<'inHouse' | 'arrivals' | 'departures'>('inHouse');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateInput, setDateInput] = useState(selectedDate || policeData.reportDate);
  const [showLegalGuide, setShowLegalGuide] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = policeData.reportDate === todayStr;

  // Calculate preset dates
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setDateInput(newDate);
    router.push(`/compliance?date=${newDate}&tab=${tab}`);
  };

  // CSV Export for Police Beat Sheet / CCTNS Portal
  const exportBeatSheetCSV = () => {
    const headers = [
      'S.No',
      'Room Number',
      'Occupant Role',
      'Guest Full Name',
      'Contact Phone',
      'Nationality',
      'ID Proof Type',
      'Check-In Date',
      'Expected Check-Out',
      'Stay Status',
    ];

    const currentRows = rosterView === 'inHouse'
      ? policeData.inHouse
      : rosterView === 'arrivals'
      ? policeData.arrivals
      : policeData.departures;

    const csvRows = [
      [`# POLICE STATION BEAT SHEET - ${policeData.property.name}`],
      [`# Report Date: ${policeData.reportDate} | Generated At: ${new Date(policeData.generatedAt).toLocaleString('en-IN')}`],
      [`# Category: ${rosterView.toUpperCase()} ROSTER | Jurisdiction: Local Police Station Chowki`],
      [],
      headers,
      ...currentRows.map((g, idx) => [
        idx + 1,
        `Room ${g.roomNumber}`,
        g.isPrimary === false ? 'Room Companion' : 'Lead Guest',
        `"${g.guestName.replace(/"/g, '""')}"`,
        g.guestPhone || 'N/A',
        g.nationality || 'Indian',
        g.idType || 'Aadhaar (masked)',
        'checkIn' in g ? (g as any).checkIn : 'N/A',
        'checkOut' in g ? (g as any).checkOut : 'N/A',
        g.status || 'Active',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Police_Beat_Sheet_${policeData.reportDate}_${rosterView}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter in-house / arrivals / departures by search query
  const filteredList = (
    rosterView === 'inHouse'
      ? policeData.inHouse
      : rosterView === 'arrivals'
      ? policeData.arrivals
      : policeData.departures
  ).filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      g.guestName.toLowerCase().includes(q) ||
      g.roomNumber.toLowerCase().includes(q) ||
      (g.guestPhone && g.guestPhone.includes(q)) ||
      (g.nationality && g.nationality.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-white/10 rounded-2xl border border-slate-200/80 dark:border-white/10 gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setTab('police')}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'police'
                ? 'bg-white dark:bg-[#0c1222] text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Daily Police Station Beat Book
          </button>
          <button
            type="button"
            onClick={() => setTab('formC')}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'formC'
                ? 'bg-white dark:bg-[#0c1222] text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Foreign Guest Form C (BoI Bureau)
          </button>
        </div>

        {/* Legal & Taj/ITC Standards Toggle Button */}
        <button
          type="button"
          onClick={() => setShowLegalGuide(!showLegalGuide)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
        >
          <span>⚖️</span>
          <span>{showLegalGuide ? 'Hide Statutory Standards' : 'How Taj, ITC & Radisson Handle This (Legal SOP)'}</span>
        </button>
      </div>

      {/* Explanatory Statutory Retention & Taj/ITC/Radisson SOP Card */}
      {showLegalGuide && (
        <div className="rounded-3xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 p-6 sm:p-7 shadow-xs animate-in fade-in-50 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-2xs">
                  🏛️
                </span>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Indian Hospitality Legal Mandate &amp; Enterprise Luxury Hotel Retention Standards
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="space-y-2 rounded-2xl bg-white/80 dark:bg-white/[0.03] p-4 border border-blue-100 dark:border-white/10">
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
                    1. Mandatory Statutory Retention Periods (Indian Law)
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Police Beat Register (Sarais Act 1867 &amp; State Police Acts):</strong> Mandates keeping a permanent register of all guests for a <strong>minimum of 3 to 5 years</strong>. A 1-year window is legally insufficient because criminal, missing person, and CID inquiries routinely investigate events 18–36 months prior.
                    </li>
                    <li>
                      <strong>Bureau of Immigration (BoI) Form C (Rule 14 Foreigners Order):</strong> Must be filed within 24 hours of arrival; passport/visa archives must be retained for <strong>at least 3 years</strong> for FRRO inspection.
                    </li>
                    <li>
                      <strong>GST &amp; Income Tax Acts (Section 36 CGST / Sec 44AA IT):</strong> Mandates maintaining all guest stay ledgers and folio bills for <strong>72 months (6 full years)</strong>.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 rounded-2xl bg-white/80 dark:bg-white/[0.03] p-4 border border-blue-100 dark:border-white/10">
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px]">
                    2. How Taj (IHCL), ITC, Radisson &amp; Marriott Handle This
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Continuous Hot Online History (5–7 Years):</strong> Enterprise PMS databases (Opera Cloud, IDS Next) never purge stay records after 1 year. The database retains 5–7 years of live queryable history so any police subpoena can be answered in under 5 seconds.
                    </li>
                    <li>
                      <strong>Automated Night Audit Snapshot (EOD Roll at 02:00 AM):</strong> At midnight, the PMS automatically creates an immutable, timestamped snapshot of the in-house roster, arrivals, and departures.
                    </li>
                    <li>
                      <strong>All Occupants Logged:</strong> Indian police beat sheets require registering <em>every</em> adult staying in the room, including spouses, family members, and companions with masked Aadhaar / ID.
                    </li>
                    <li>
                      <strong>Daily Beat Handover:</strong> A physical copy is signed nightly by the Duty Manager for the visiting beat constable, and a digital CSV/PDF is uploaded to state police web portals.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLegalGuide(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 text-sm font-bold"
              title="Close guide"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Police Station Beat Book Tab */}
      {tab === 'police' && (
        <section aria-labelledby="police-report-title" className="space-y-6">
          {/* Main Card Header with Interactive Date Picker & Jump Controls */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1222] p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {isToday ? 'Statutory Police Reporting · Live Today' : 'Statutory Police Archive · Historical Verified Record'}
                  </p>
                </div>
                <h2 id="police-report-title" className="mt-1 font-display text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
                  Midnight Beat Book Summary ({policeData.reportDate})
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
                  Mandatory daily arrival, in-house &amp; departure roster for local jurisdiction police station (Sarais Act 1867 &amp; State Police Beat Book).
                </p>
              </div>

              {/* Action Buttons: Print Beat Sheet & Export CSV */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportBeatSheetCSV}
                  className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1222] text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Export official CSV file for police portal upload"
                >
                  <span>📥</span>
                  <span>Export Beat Sheet (.CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`${btnCls} min-h-[42px] px-5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 shadow-xs cursor-pointer flex items-center gap-1.5`}
                >
                  <span>🖨️</span>
                  <span>Print Police Beat Sheet</span>
                </button>
              </div>
            </div>

            {/* Historical Date Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => handleDateChange(todayStr)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isToday
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Today (Live)
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getPastDateStr(1))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    policeData.reportDate === getPastDateStr(1)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getPastDateStr(7))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    policeData.reportDate === getPastDateStr(7)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  7 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getPastDateStr(30))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    policeData.reportDate === getPastDateStr(30)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  30 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getPastDateStr(90))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    policeData.reportDate === getPastDateStr(90)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  90 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(getPastDateStr(365))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    policeData.reportDate === getPastDateStr(365)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  1 Year Ago
                </button>
              </div>

              {/* Exact Date Picker Input */}
              <div className="flex items-center gap-2">
                <label htmlFor="police-beat-date-picker" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Select Date:
                </label>
                <input
                  id="police-beat-date-picker"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1222] px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleDateChange(dateInput)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs cursor-pointer transition-all"
                >
                  Go
                </button>
              </div>
            </div>
          </div>

          {/* Metric Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total In-House Occupants"
              value={policeData.summary.totalInHouse}
              detail={isToday ? 'Currently in-house (lead + companions)' : `Occupants on ${policeData.reportDate}`}
            />
            <StatCard
              label="Arrivals On Date"
              value={policeData.summary.arrivalsToday}
              detail={`Check-ins on ${policeData.reportDate}`}
            />
            <StatCard
              label="Departures On Date"
              value={policeData.summary.departuresToday}
              detail={`Check-outs on ${policeData.reportDate}`}
            />
          </div>

          {/* Roster Category Switcher & Search Bar */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRosterView('inHouse')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    rosterView === 'inHouse'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10'
                  }`}
                >
                  In-House Registry ({policeData.summary.totalInHouse})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterView('arrivals')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    rosterView === 'arrivals'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10'
                  }`}
                >
                  Arrivals ({policeData.summary.arrivalsToday})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterView('departures')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    rosterView === 'departures'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/10'
                  }`}
                >
                  Departures ({policeData.summary.departuresToday})
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="w-full sm:w-64">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter guest, room or phone…"
                  className={`${inputCls} text-xs py-1.5`}
                />
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] font-bold uppercase tracking-wider text-slate-500 text-xs">
                  <tr>
                    <th className="px-5 py-4">Room</th>
                    <th className="px-5 py-4">Occupant &amp; Role</th>
                    <th className="px-5 py-4">Phone</th>
                    <th className="px-5 py-4">Nationality</th>
                    <th className="px-5 py-4">ID Proof Type</th>
                    <th className="px-5 py-4">Check-In</th>
                    <th className="px-5 py-4">Expected Check-Out</th>
                    <th className="px-5 py-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm sm:text-[15px]">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-slate-500 font-medium">
                        {searchQuery
                          ? 'No occupants matching your search filter.'
                          : `No recorded ${rosterView} on ${policeData.reportDate}.`}
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <span className="inline-block rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
                            Room {g.roomNumber}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {g.guestName}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                g.isPrimary === false
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                                  : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'
                              }`}
                            >
                              {g.isPrimary === false ? 'Room Companion' : 'Lead Guest'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-normal">
                          {g.guestPhone ?? '—'}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
                          {g.nationality ?? 'Indian'}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 px-2.5 py-0.5 text-xs font-mono font-medium uppercase text-slate-700 dark:text-slate-300">
                            {g.idType ?? 'Aadhaar (masked)'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {'checkIn' in g ? formatDate((g as any).checkIn) : '—'}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {'checkOut' in g ? formatDate((g as any).checkOut) : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-semibold">
                            <span>✓</span> Verified KYC
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Police Handover Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 dark:border-white/10 px-6 py-4 bg-slate-50/40 dark:bg-white/[0.01] text-xs text-slate-500">
              <div>
                <p>
                  <strong>Hotel:</strong> {policeData.property.name} · <strong>Jurisdiction:</strong> Local Police Station Beat Chowki
                </p>
                <p className="text-[11px] text-muted">
                  Under the Sarais Act 1867 and State Police Regulations, this report must be maintained for inspection by the local SHO / Beat Constable.
                </p>
              </div>

              <div className="flex items-center gap-6 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <div className="border-t border-slate-400 dark:border-white/20 pt-1 text-center w-36">
                  Duty Manager Signature
                </div>
                <div className="border-t border-slate-400 dark:border-white/20 pt-1 text-center w-36">
                  Beat Constable Receiving Stamp
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Foreigners Form C Tab */}
      {tab === 'formC' && (
        <section aria-labelledby="formc-title" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1222] p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bureau of Immigration (BoI) Compliance</p>
              <h2 id="formc-title" className="mt-1 font-display text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
                Foreigners Regional Registration (Form C)
              </h2>
              <p className="mt-1 text-sm text-slate-500 font-normal">
                Under the Foreigners Act 1946 &amp; Registration of Foreigners Rules (Rule 14), all foreign national details must be submitted to the BoI portal within 24 hours of arrival and retained for 3 years.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
              {formCList.length} foreign guests registered
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] font-bold uppercase tracking-wider text-slate-500 text-xs">
                  <tr>
                    <th className="px-5 py-4">Guest Name &amp; Room</th>
                    <th className="px-5 py-4">Passport &amp; Country</th>
                    <th className="px-5 py-4">Visa Details</th>
                    <th className="px-5 py-4">Arrival in India</th>
                    <th className="px-5 py-4">Purpose</th>
                    <th className="px-5 py-4">BoI App ID</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm sm:text-[15px]">
                  {formCList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-slate-500 font-medium">
                        No foreign guest Form C records registered yet.
                      </td>
                    </tr>
                  ) : (
                    formCList.map((fc) => (
                      <tr key={fc.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">{fc.guestName}</p>
                          <p className="text-xs text-slate-500 font-normal mt-0.5">Room {fc.roomNumber}</p>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                          {fc.passportNumber} <span className="font-sans text-xs text-slate-500">({fc.passportCountry})</span>
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                          <p className="font-medium">{fc.visaNumber} ({fc.visaType})</p>
                          <p className="text-xs text-slate-400 mt-0.5">Valid till {formatDate(fc.visaValidUntil)}</p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatDate(fc.arrivalDateInIndia)}
                        </td>
                        <td className="px-5 py-4 capitalize font-medium text-slate-800 dark:text-slate-200">
                          {fc.purposeOfVisit}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                          {fc.boiApplicationId}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                              fc.submissionStatus === 'submitted_online'
                                ? 'bg-emerald-100 border border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 border border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {fc.submissionStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {fc.submissionStatus !== 'submitted_online' && !readOnly && (
                            <form action={submitFormC}>
                              <input type="hidden" name="id" value={fc.id} />
                              <FormSubmit className={`${btnGhostCls} min-h-[38px] px-3.5 text-xs font-bold`} pendingLabel="Submitting…">
                                Submit to BoI
                              </FormSubmit>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
