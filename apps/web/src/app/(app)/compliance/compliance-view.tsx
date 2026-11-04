'use client';

import { useState } from 'react';
import { Banner, btnCls, btnGhostCls, EmptyState, inputCls, StatCard } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
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
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setTab('police')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'police'
              ? 'border-lagoon-dark text-lagoon-dark'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Daily Police Station Beat Book Report
        </button>
        <button
          onClick={() => setTab('formC')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'formC'
              ? 'border-lagoon-dark text-lagoon-dark'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Foreign Guest Form C (Bureau of Immigration)
        </button>
      </div>

      {tab === 'police' && (
        <section aria-labelledby="police-report-title" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-lagoon-dark">Statutory Police Reporting</p>
              <h2 id="police-report-title" className="font-display text-lg font-bold text-ink">
                Midnight Beat Book Summary ({policeData.reportDate})
              </h2>
              <p className="text-xs text-muted">
                Mandatory daily arrival &amp; in-house guest roster for local jurisdiction police station
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${btnCls} bg-slate-800 hover:bg-slate-700`}
            >
              Print Police Station Beat Sheet 🖨️
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total In-House Guests" value={policeData.summary.totalInHouse} detail="Occupied rooms" />
            <StatCard label="Arrivals Today" value={policeData.summary.arrivalsToday} detail="Checked in" />
            <StatCard label="Departures Today" value={policeData.summary.departuresToday} detail="Checked out" />
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="border-b border-line px-5 py-3.5 bg-ground/50">
              <h3 className="text-sm font-semibold text-ink">In-House Guest Registry</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="border-b border-line bg-ground/70 font-semibold uppercase tracking-wider text-muted text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Guest Full Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Nationality</th>
                    <th className="px-4 py-3">ID Proof Type</th>
                    <th className="px-4 py-3">Check-In</th>
                    <th className="px-4 py-3">Expected Check-Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {policeData.inHouse.map((g, idx) => (
                    <tr key={idx} className="hover:bg-ground/40">
                      <td className="px-4 py-3 font-bold font-mono text-ink">Room {g.roomNumber}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{g.guestName}</td>
                      <td className="px-4 py-3 text-muted">{g.guestPhone ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{g.nationality ?? 'Indian'}</td>
                      <td className="px-4 py-3 uppercase text-[11px] font-mono text-muted">{g.idType ?? 'Aadhaar'}</td>
                      <td className="px-4 py-3">{g.checkIn}</td>
                      <td className="px-4 py-3">{g.checkOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'formC' && (
        <section aria-labelledby="formc-title" className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-lagoon-dark">BoI Compliance</p>
              <h2 id="formc-title" className="font-display text-lg font-bold text-ink">
                Foreigners Regional Registration (Form C)
              </h2>
              <p className="text-xs text-muted">
                Under the Foreigners Act 1946, foreign guest details must be submitted to BoI within 24 hours of arrival.
              </p>
            </div>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-lagoon-dark">
              {formCList.length} foreign guests registered
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="border-b border-line bg-ground/70 font-semibold uppercase tracking-wider text-muted text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Guest Name &amp; Room</th>
                    <th className="px-4 py-3">Passport &amp; Country</th>
                    <th className="px-4 py-3">Visa Details</th>
                    <th className="px-4 py-3">Arrival in India</th>
                    <th className="px-4 py-3">Purpose</th>
                    <th className="px-4 py-3">BoI App ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {formCList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-xs text-muted">
                        No foreign guest Form C records registered yet.
                      </td>
                    </tr>
                  ) : (
                    formCList.map((fc) => (
                      <tr key={fc.id} className="hover:bg-ground/40">
                        <td className="px-4 py-3 font-semibold text-ink">
                          {fc.guestName}
                          <p className="font-normal text-muted text-[11px]">Room {fc.roomNumber}</p>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {fc.passportNumber} ({fc.passportCountry})
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {fc.visaNumber} ({fc.visaType}) · Valid till {fc.visaValidUntil}
                        </td>
                        <td className="px-4 py-3">{fc.arrivalDateInIndia}</td>
                        <td className="px-4 py-3 capitalize">{fc.purposeOfVisit}</td>
                        <td className="px-4 py-3 font-mono font-bold text-lagoon-dark">{fc.boiApplicationId}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              fc.submissionStatus === 'submitted_online'
                                ? 'bg-success/15 text-emerald-800'
                                : 'bg-warning/15 text-amber-900'
                            }`}
                          >
                            {fc.submissionStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fc.submissionStatus !== 'submitted_online' && !readOnly && (
                            <form action={submitFormC}>
                              <input type="hidden" name="id" value={fc.id} />
                              <FormSubmit className={`${btnGhostCls} text-[11px]`} pendingLabel="Submitting…">
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
