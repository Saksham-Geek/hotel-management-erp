'use client';

import { useState } from 'react';
import { Banner, btnCls, btnGhostCls, EmptyState, inputCls, StatCard } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { formatDate } from '@/lib/format';
import { createFormC, submitFormC } from './actions';

export interface PoliceReportData {
  property: {
    name: string;
    timezone: string;
    currency: string;
  };
  reportDate: string;
  generatedAt: string;
  summary: {
    totalInHouse: number;
    arrivalsToday: number;
    departuresToday: number;
  };
  inHouse: {
    roomNumber: string;
    floor: number;
    guestName: string;
    guestPhone: string | null;
    nationality: string | null;
    idType: string | null;
    checkIn: string;
    checkOut: string;
    checkInAt: string | null;
    status: string;
  }[];
  arrivals: {
    roomNumber: string;
    guestName: string;
    guestPhone: string | null;
    nationality: string | null;
    idType: string | null;
    checkInAt: string | null;
    status: string;
  }[];
  departures: {
    roomNumber: string;
    guestName: string;
    guestPhone: string | null;
    nationality: string | null;
    checkOutAt: string | null;
    status: string;
  }[];
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
}: {
  policeData: PoliceReportData;
  formCList: FormCRecord[];
  readOnly: boolean;
}) {
  const [tab, setTab] = useState<'police' | 'formC'>('police');

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
        <button
          type="button"
          onClick={() => setTab('police')}
          className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
            tab === 'police'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Daily Police Station Beat Book Report
        </button>
        <button
          type="button"
          onClick={() => setTab('formC')}
          className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
            tab === 'formC'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Foreign Guest Form C (Bureau of Immigration)
        </button>
      </div>

      {tab === 'police' && (
        <section aria-labelledby="police-report-title" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Statutory Police Reporting</p>
              <h2 id="police-report-title" className="mt-1 font-display text-xl sm:text-2xl font-black text-slate-950">
                Midnight Beat Book Summary ({policeData.reportDate})
              </h2>
              <p className="mt-1 text-sm text-slate-500 font-normal">
                Mandatory daily arrival &amp; in-house guest roster for local jurisdiction police station
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${btnCls} min-h-[42px] px-5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs`}
            >
              Print Police Station Beat Sheet 🖨️
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total In-House Guests" value={policeData.summary.totalInHouse} detail="Occupied rooms" />
            <StatCard label="Arrivals Today" value={policeData.summary.arrivalsToday} detail="Checked in" />
            <StatCard label="Departures Today" value={policeData.summary.departuresToday} detail="Checked out" />
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="border-b border-slate-200/80 px-6 py-4 bg-slate-50/60">
              <h3 className="text-base font-bold text-slate-950">In-House Guest Registry</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 text-xs">
                  <tr>
                    <th className="px-5 py-4">Room</th>
                    <th className="px-5 py-4">Guest Full Name</th>
                    <th className="px-5 py-4">Phone</th>
                    <th className="px-5 py-4">Nationality</th>
                    <th className="px-5 py-4">ID Proof Type</th>
                    <th className="px-5 py-4">Check-In</th>
                    <th className="px-5 py-4">Expected Check-Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm sm:text-[15px]">
                  {policeData.inHouse.map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-lg bg-slate-100 border border-slate-200/80 px-2.5 py-1 font-mono text-xs font-bold text-slate-900">
                          Room {g.roomNumber}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {g.guestName}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-normal">
                        {g.guestPhone ?? '—'}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {g.nationality ?? 'Indian'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 text-xs font-mono font-medium uppercase text-slate-700">
                          {g.idType ?? 'Aadhaar'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(g.checkIn)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(g.checkOut)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'formC' && (
        <section aria-labelledby="formc-title" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">BoI Compliance</p>
              <h2 id="formc-title" className="mt-1 font-display text-xl sm:text-2xl font-black text-slate-950">
                Foreigners Regional Registration (Form C)
              </h2>
              <p className="mt-1 text-sm text-slate-500 font-normal">
                Under the Foreigners Act 1946, foreign guest details must be submitted to BoI within 24 hours of arrival.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
              {formCList.length} foreign guests registered
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 text-xs">
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
                <tbody className="divide-y divide-slate-100 text-sm sm:text-[15px]">
                  {formCList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-slate-500 font-medium">
                        No foreign guest Form C records registered yet.
                      </td>
                    </tr>
                  ) : (
                    formCList.map((fc) => (
                      <tr key={fc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{fc.guestName}</p>
                          <p className="text-xs text-slate-500 font-normal mt-0.5">Room {fc.roomNumber}</p>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          {fc.passportNumber} <span className="font-sans text-xs text-slate-500">({fc.passportCountry})</span>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          <p className="font-medium">{fc.visaNumber} ({fc.visaType})</p>
                          <p className="text-xs text-slate-400 mt-0.5">Valid till {formatDate(fc.visaValidUntil)}</p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          {formatDate(fc.arrivalDateInIndia)}
                        </td>
                        <td className="px-5 py-4 capitalize font-medium text-slate-800">
                          {fc.purposeOfVisit}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          {fc.boiApplicationId}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                              fc.submissionStatus === 'submitted_online'
                                ? 'bg-emerald-100 border border-emerald-300 text-emerald-950'
                                : 'bg-amber-100 border border-amber-300 text-amber-950'
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
