'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { btnGhostCls, inputCls } from '@/components/ui';

export interface RoomTape {
  id: string;
  number: string;
  floor: number;
  status: string;
  roomType: string;
  baseRate: number;
}

export interface ReservationTape {
  id: string;
  roomId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  rateMode: string;
  bookingSource?: string;
  otaBookingId?: string;
  totalAmount: number;
  guestName: string;
  guestPhone: string | null;
  vip: boolean;
  folioId?: string;
  folioStatus?: string;
  paidAmount: number;
}

function cleanGuestName(name: string): string {
  if (!name) return 'Guest';
  // Strip any bracketed debugging tags like [Walk-In...] or [OTA...]
  return name.replace(/^\[.*?\]\s*/, '').trim();
}

function getChannelTag(res: ReservationTape): { label: string; badgeCls: string } {
  if (res.bookingSource === 'makemytrip') {
    return { label: 'MMT', badgeCls: 'bg-orange-500 text-white' };
  }
  if (res.bookingSource === 'booking_com') {
    return { label: 'Booking', badgeCls: 'bg-sky-600 text-white' };
  }
  if (res.bookingSource === 'agoda') {
    return { label: 'Agoda', badgeCls: 'bg-emerald-600 text-white' };
  }
  if (res.bookingSource === 'expedia') {
    return { label: 'Expedia', badgeCls: 'bg-amber-600 text-white' };
  }
  if (res.bookingSource === 'corporate') {
    return { label: 'Corporate', badgeCls: 'bg-indigo-600 text-white' };
  }
  if (res.bookingSource === 'walk_in') {
    return { label: 'Walk-In', badgeCls: 'bg-teal-600 text-white' };
  }
  if (res.vip) {
    return { label: 'VIP', badgeCls: 'bg-amber-400 text-amber-950 font-black' };
  }
  if (res.rateMode === 'hourly') {
    return { label: 'Layover', badgeCls: 'bg-purple-600 text-white' };
  }
  return { label: 'Direct', badgeCls: 'bg-slate-700 text-white' };
}

export function TapeChartView({
  initialStartDate,
  rooms,
  reservations,
  currency,
}: {
  initialStartDate: string;
  rooms: RoomTape[];
  reservations: ReservationTape[];
  currency: string;
}) {
  const [startDateStr, setStartDateStr] = useState(initialStartDate);
  const [daysCount, setDaysCount] = useState(7);
  const [filterType, setFilterType] = useState('all');

  const dates = useMemo(() => {
    const list: string[] = [];
    const base = new Date(startDateStr);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, [startDateStr, daysCount]);

  const filteredRooms = useMemo(() => {
    if (filterType === 'all') return rooms;
    return rooms.filter((r) => r.roomType === filterType);
  }, [rooms, filterType]);

  const roomTypes = useMemo(() => Array.from(new Set(rooms.map((r) => r.roomType))), [rooms]);

  function shiftDays(n: number) {
    const current = new Date(startDateStr);
    const next = new Date(current.getTime() + n * 24 * 60 * 60 * 1000);
    setStartDateStr(next.toISOString().slice(0, 10));
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inHouse = reservations.filter(
      (r) => r.status === 'checked_in' && r.checkIn <= todayStr && (r.checkOut > todayStr || r.checkIn === r.checkOut),
    ).length;
    const upcoming = reservations.filter((r) => r.status === 'reserved').length;
    const occPct = rooms.length > 0 ? Math.round((inHouse / rooms.length) * 100) : 0;
    return { inHouse, upcoming, occPct };
  }, [reservations, rooms]);

  return (
    <div className="space-y-4">
      {/* Refined Hotel Performance Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Inventory</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-950">{rooms.length} Rooms</span>
            <span className="text-xs font-semibold text-muted">Across 3 Floors</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">In-House Stays</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-blue-900">{metrics.inHouse}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-950 border border-blue-300">
              {metrics.occPct}% Occupied
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Upcoming Bookings</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-emerald-900">{metrics.upcoming}</span>
            <span className="text-xs font-semibold text-muted">Confirmed Arrivals</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Active Channels</p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-950 border border-orange-300">MMT</span>
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-black text-sky-950 border border-sky-300">Booking</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-950 border border-emerald-300">Agoda</span>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black text-indigo-950 border border-indigo-300">Corporate</span>
          </div>
        </div>
      </div>

      {/* Date Navigation & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDays(-daysCount)}
            className={`${btnGhostCls} text-xs font-bold`}
            title={`Previous ${daysCount} Days`}
          >
            ← Previous {daysCount}d
          </button>
          <button
            type="button"
            onClick={() => setStartDateStr(new Date().toISOString().slice(0, 10))}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-1.5 text-xs font-black text-teal-950 shadow-2xs hover:bg-teal-100 transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftDays(daysCount)}
            className={`${btnGhostCls} text-xs font-bold`}
            title={`Next ${daysCount} Days`}
          >
            Next {daysCount}d →
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
            Date:
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className={`${inputCls} min-h-9 w-auto text-xs font-semibold`}
            />
          </label>

          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
            View:
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(parseInt(e.target.value, 10))}
              className={`${inputCls} min-h-9 w-auto text-xs font-semibold`}
            >
              <option value={7}>7 Days (1 Week · Fit Screen)</option>
              <option value={5}>5 Days (Work Week)</option>
              <option value={10}>10 Days</option>
              <option value={14}>14 Days (2 Weeks)</option>
            </select>
          </label>

          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
            Room Type:
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`${inputCls} min-h-9 w-auto text-xs font-semibold`}
            >
              <option value="all">All Room Types</option>
              {roomTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Main Gantt Grid - Ultra Clean, Zero Mess */}
      <div className="overflow-hidden rounded-2xl border border-line/90 bg-surface shadow-sm">
        <table className="w-full table-fixed border-collapse text-left text-xs select-none">
          <thead>
            <tr className="border-b border-line bg-slate-50">
              <th className="w-44 border-r border-line bg-slate-100/90 px-4 py-3 font-black text-slate-950 uppercase text-[11px] tracking-wider">
                Room
              </th>
              {dates.map((dateStr) => {
                const date = new Date(dateStr);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = date.getDate();
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                return (
                  <th
                    key={dateStr}
                    className={`px-1 py-2 text-center border-r border-line transition-colors ${
                      isToday
                        ? 'bg-teal-50 border-b-2 border-b-teal-600'
                        : 'text-slate-800'
                    }`}
                  >
                    <div
                      className={`text-[11px] uppercase tracking-wider ${
                        isToday ? 'font-black text-teal-950' : 'font-bold text-slate-600'
                      }`}
                    >
                      {dayName}
                    </div>
                    <div
                      className={`text-base font-black leading-none mt-1 ${
                        isToday ? 'text-teal-950' : 'text-slate-950'
                      }`}
                    >
                      {dayNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredRooms.map((room) => {
              const roomReservations = reservations.filter((r) => r.roomId === room.id);

              return (
                <tr key={room.id} className="hover:bg-slate-50 transition-colors h-14">
                  {/* Clean Room Identification Cell */}
                  <td className="w-44 border-r border-line bg-surface px-4 py-2 font-medium">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-black text-sm font-mono text-slate-950 select-all"
                        style={{ color: '#020617' }}
                      >
                        Room {room.number}
                      </span>
                      <span
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-2xs ${
                          room.status === 'available'
                            ? 'bg-emerald-600'
                            : room.status === 'occupied'
                            ? 'bg-blue-600'
                            : room.status === 'cleaning'
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                        title={`Status: ${room.status}`}
                      />
                    </div>
                    <p className="truncate text-[11px] font-bold text-slate-600">
                      {room.roomType} · Fl {room.floor}
                    </p>
                  </td>

                  {/* Day Timeline Cells */}
                  {dates.map((dStr, dayIdx) => {
                    const activeRes = roomReservations.find((r) => {
                      if (r.rateMode === 'hourly' || r.checkIn === r.checkOut) {
                        return r.checkIn === dStr;
                      }
                      return r.checkIn <= dStr && r.checkOut > dStr;
                    });

                    // Empty cell
                    if (!activeRes) {
                      return (
                        <td
                          key={dStr}
                          className="border-r border-line/60 p-0 text-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <span className="text-[10px] text-slate-300 dark:text-slate-700 select-none">·</span>
                        </td>
                      );
                    }

                    const isCheckedIn = activeRes.status === 'checked_in';
                    const isHourly = activeRes.rateMode === 'hourly' || activeRes.checkIn === activeRes.checkOut;
                    const isStartOfBooking = activeRes.checkIn === dStr;
                    const isFirstVisibleDay = !isStartOfBooking && dayIdx === 0;
                    const showCapsuleCard = isStartOfBooking || isFirstVisibleDay;
                    
                    const channel = getChannelTag(activeRes);
                    const displayName = cleanGuestName(activeRes.guestName);

                    // Multi-day edge calculations for smooth seamless ribbons
                    const nextDateStr = dates[dayIdx + 1];
                    const isLastDayOfStay = nextDateStr && activeRes.checkOut === nextDateStr;
                    const continuesToNext = !isHourly && activeRes.checkOut > (nextDateStr ?? dStr);
                    const continuesFromPrev = !isStartOfBooking;

                    // Unified theme colors
                    const themeCls = isHourly
                      ? {
                          card: 'bg-purple-600 text-white hover:bg-purple-700 border-purple-700',
                          ribbon: 'bg-purple-600/90 hover:bg-purple-700',
                          cellBg: 'bg-purple-50/60',
                        }
                      : isCheckedIn
                      ? {
                          card: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700',
                          ribbon: 'bg-blue-600/90 hover:bg-blue-700',
                          cellBg: 'bg-blue-50/60',
                        }
                      : {
                          card: 'bg-teal-600 text-white hover:bg-teal-700 border-teal-700',
                          ribbon: 'bg-teal-600/90 hover:bg-teal-700',
                          cellBg: 'bg-teal-50/60',
                        };

                    return (
                      <td key={dStr} className={`border-r border-line/60 p-1 transition-all ${themeCls.cellBg}`}>
                        {showCapsuleCard ? (
                          // Main Guest Card (Rendered on check-in day or first visible day)
                          <Link
                            href={`/billing?reservationId=${activeRes.id}`}
                            className={`block h-10 px-2 py-1 shadow-2xs hover:scale-[1.01] transition-transform ${
                              themeCls.card
                            } ${
                              continuesToNext ? 'rounded-l-xl rounded-r-none' : 'rounded-xl'
                            } border`}
                            title={`${displayName} (${activeRes.checkIn} → ${activeRes.checkOut}) · Total: ${currency} ${activeRes.totalAmount.toLocaleString()} · Click to open Folio`}
                          >
                            <div className="flex items-center gap-1.5 truncate leading-tight">
                              <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase shrink-0 ${channel.badgeCls}`}>
                                {isFirstVisibleDay ? `◂ ${channel.label}` : channel.label}
                              </span>
                              <span className="truncate text-xs font-black tracking-tight">{displayName}</span>
                            </div>
                            <div className="text-[10px] font-semibold opacity-90 truncate mt-0.5">
                              {isCheckedIn ? '● In House' : '○ Confirmed'} · {currency} {Math.round(activeRes.totalAmount).toLocaleString()}
                            </div>
                          </Link>
                        ) : (
                          // Continuous Clean Ribbon (No messy tiny text inside)
                          <Link
                            href={`/billing?reservationId=${activeRes.id}`}
                            className="flex items-center justify-center w-full h-10 group"
                            title={`Continuing: ${displayName} (${activeRes.checkIn} → ${activeRes.checkOut}) · Click to open Folio`}
                          >
                            <div
                              className={`w-full h-7 transition-all group-hover:opacity-100 ${
                                themeCls.ribbon
                              } ${
                                continuesToNext ? 'rounded-none' : 'rounded-r-xl'
                              } ${
                                continuesFromPrev && !continuesToNext ? 'rounded-r-xl' : ''
                              } opacity-85 shadow-2xs`}
                            />
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* High-Contrast Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-extrabold text-slate-950 mr-1">Status Legend:</span>
          
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
            Ready / Available
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-black text-blue-950 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
            Occupied (In House)
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-100 px-3 py-1 text-xs font-black text-teal-950 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-600 shrink-0" />
            Upcoming Confirmed
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600 shrink-0" />
            Needs Cleaning
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-black text-rose-950 shadow-2xs">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0" />
            Maintenance
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-black text-slate-950">
            💡 Click any reservation bar to jump directly into Live Billing & Folio
          </span>
        </div>
      </div>
    </div>
  );
}
