'use client';

import React, { useEffect, useState } from 'react';
import { btnCls, btnGhostCls } from '@/components/ui';

interface ContingencyData {
  hotelName: string;
  generatedAt: string;
  inHouse: Array<{
    reservationId: string;
    roomNumber: string;
    floor: number;
    roomType: string;
    guestName: string;
    phone: string | null;
    checkIn: string;
    checkOut: string;
    vip: boolean;
    nationality: string | null;
    balance: number;
  }>;
  arrivals: Array<{
    reservationId: string;
    assignedRoom: string | null;
    roomType: string;
    guestName: string;
    phone: string | null;
    checkIn: string;
    checkOut: string;
    vip: boolean;
  }>;
  departures: Array<{
    reservationId: string;
    roomNumber: string;
    guestName: string;
    phone: string | null;
    checkIn: string;
    checkOut: string;
    balance: number;
  }>;
  vacantReady: Array<{
    roomNumber: string;
    floor: number;
    roomType: string;
    rate: number;
  }>;
}

export function FrontDeskContingencyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<ContingencyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch('/api/hotel/contingency-sheet')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load contingency register');
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150 print:bg-white print:p-0">
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-8 print:border-none print:shadow-none print:p-0">
        {/* Modal Controls - Hidden during print */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10 print:hidden">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-lg font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-400">
              📋
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Front Desk Emergency Contingency Register
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print or PDF export for offline front desk continuity in case of Wi-Fi or power outage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={!data || loading}
              type="button"
              className={`${btnCls} bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3.5`}
            >
              🖨️ Print Sheet
            </button>
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Register Body */}
        {loading ? (
          <div className="py-16 text-center">
            <span className="h-6 w-6 inline-block animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            <p className="mt-2 text-xs text-slate-500">Compiling live in-house guest ledger & arrivals...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-rose-600">
            {error}
          </div>
        ) : data ? (
          <div className="pt-4 font-sans text-slate-900 dark:text-white print:pt-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 dark:border-white">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  {data.hotelName} — FRONT DESK CONTINGENCY MASTER
                </h1>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                  CRITICAL INCIDENT & OFFLINE CONTINUITY REGISTER (RULE 8 OPERATIONAL STANDARD)
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-slate-900 dark:text-white">
                  Generated: {new Date(data.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
                <p className="text-[11px] text-slate-500">Live Snapshot from Server</p>
              </div>
            </div>

            {/* 1. In-House Guests */}
            <div className="mt-5">
              <div className="flex items-center justify-between bg-slate-100 p-2 text-xs font-bold uppercase tracking-wider dark:bg-slate-800">
                <span>1. In-House Occupied Rooms ({data.inHouse.length} Stays)</span>
                <span className="text-[11px] font-normal lowercase">sort: room # asc</span>
              </div>
              <table className="w-full text-left text-xs mt-1 border border-slate-200 dark:border-white/10">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="p-1.5 w-16">Room #</th>
                    <th className="p-1.5">Guest Full Name</th>
                    <th className="p-1.5">Contact Phone</th>
                    <th className="p-1.5">Category</th>
                    <th className="p-1.5">Check-In</th>
                    <th className="p-1.5">Check-Out</th>
                    <th className="p-1.5 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {data.inHouse.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-2 text-center text-slate-400">No rooms currently occupied</td>
                    </tr>
                  ) : (
                    data.inHouse.map((g) => (
                      <tr key={g.reservationId} className="hover:bg-slate-50/50">
                        <td className="p-1.5 font-bold text-slate-900 dark:text-white">{g.roomNumber}</td>
                        <td className="p-1.5 font-semibold text-slate-900 dark:text-white">
                          {g.guestName} {g.vip ? '⭐ (VIP)' : ''}
                        </td>
                        <td className="p-1.5 text-slate-600 dark:text-slate-300">{g.phone || '—'}</td>
                        <td className="p-1.5 text-slate-500 text-[11px]">{g.roomType}</td>
                        <td className="p-1.5 text-slate-600 dark:text-slate-300">{g.checkIn}</td>
                        <td className="p-1.5 font-semibold text-slate-900 dark:text-white">{g.checkOut}</td>
                        <td className={`p-1.5 text-right font-bold ${Number(g.balance) > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          ₹{Number(g.balance).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 2-Column: Expected Arrivals & Departures Today */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expected Arrivals */}
              <div>
                <div className="bg-slate-100 p-2 text-xs font-bold uppercase tracking-wider dark:bg-slate-800">
                  <span>2. Expected Arrivals Today ({data.arrivals.length})</span>
                </div>
                <table className="w-full text-left text-xs mt-1 border border-slate-200 dark:border-white/10">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="p-1.5">Guest Name</th>
                      <th className="p-1.5">Assigned Room</th>
                      <th className="p-1.5">Type</th>
                      <th className="p-1.5">Nights</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {data.arrivals.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-slate-400">No arrivals scheduled for today</td>
                      </tr>
                    ) : (
                      data.arrivals.map((a) => (
                        <tr key={a.reservationId}>
                          <td className="p-1.5 font-semibold text-slate-900 dark:text-white">
                            {a.guestName} {a.phone ? `(${a.phone})` : ''}
                          </td>
                          <td className="p-1.5 font-bold text-slate-900 dark:text-white">{a.assignedRoom || 'Unassigned'}</td>
                          <td className="p-1.5 text-slate-500 text-[11px]">{a.roomType}</td>
                          <td className="p-1.5 text-slate-600 dark:text-slate-300">{a.checkIn} to {a.checkOut}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Expected Departures */}
              <div>
                <div className="bg-slate-100 p-2 text-xs font-bold uppercase tracking-wider dark:bg-slate-800">
                  <span>3. Expected Departures Today ({data.departures.length})</span>
                </div>
                <table className="w-full text-left text-xs mt-1 border border-slate-200 dark:border-white/10">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-bold text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="p-1.5">Room #</th>
                      <th className="p-1.5">Guest Name</th>
                      <th className="p-1.5 text-right">Settlement Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {data.departures.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-2 text-center text-slate-400">No checkouts scheduled for today</td>
                      </tr>
                    ) : (
                      data.departures.map((d) => (
                        <tr key={d.reservationId}>
                          <td className="p-1.5 font-bold text-slate-900 dark:text-white">{d.roomNumber}</td>
                          <td className="p-1.5 text-slate-800 dark:text-slate-200">{d.guestName}</td>
                          <td className={`p-1.5 text-right font-bold ${Number(d.balance) > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            ₹{Number(d.balance).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Available Clean Ready Rooms */}
            <div className="mt-5">
              <div className="bg-slate-100 p-2 text-xs font-bold uppercase tracking-wider dark:bg-slate-800">
                <span>4. Vacant Clean Ready Rooms for Emergency Walk-Ins ({data.vacantReady.length} Available)</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {data.vacantReady.length === 0 ? (
                  <p className="text-slate-400 text-xs">Hotel is 100% full or no rooms are in 'available' status.</p>
                ) : (
                  data.vacantReady.map((r) => (
                    <div
                      key={r.roomNumber}
                      className="rounded-lg border border-emerald-300 bg-emerald-50/60 px-2.5 py-1 text-slate-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-white"
                    >
                      <strong className="text-sm">#{r.roomNumber}</strong>{' '}
                      <span className="text-[11px] text-slate-500">({r.roomType} · Floor {r.floor} · ₹{r.rate})</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 border-t border-slate-200 pt-3 text-[10px] text-slate-500 dark:border-white/10 print:mt-4">
              <p>Confidential Guest Information · Protected under Digital Personal Data Protection (DPDP) Act, 2023.</p>
              <p>Do not discard in common waste bins. Shred after operations are restored.</p>
            </div>
          </div>
        ) : null}

        {/* Modal Close */}
        <div className="mt-6 flex justify-end print:hidden">
          <button type="button" onClick={onClose} className={btnGhostCls}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
