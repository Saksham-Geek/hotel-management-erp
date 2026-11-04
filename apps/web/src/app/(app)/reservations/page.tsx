import Link from 'next/link';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, EmptyState, inputCls, PageHeader } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { api, getMe, requireFeature } from '@/lib/api';
import { createReservation } from './actions';
import { GuestPicker } from './guest-picker';
import { ReservationPricingFields } from './pricing-overrides';
import { ReservationTable, type ReservationRow } from './reservation-table';

interface Room {
  id: string;
  number: string;
  roomType: string;
  baseRate?: number;
  hourlyRate?: number | null;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    roomId?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
}) {
  const [{ error, ok, roomId, checkIn, checkOut }, ent, me] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_RESERVATIONS),
    getMe(),
  ]);
  const [reservations, rooms] = await Promise.all([
    api<ReservationRow[]>('/hotel/reservations'),
    api<Room[]>('/hotel/rooms'),
  ]);
  const currency = me.property.currency;

  return (
    <>
      <PageHeader title="Reservations" eyebrow="Front desk" description="Manage guest stays, room assignment, check-in and check-out.">
        {!ent.readOnly && <Link href="#new-reservation" className={`${btnCls} w-full sm:w-auto`}><span aria-hidden className="text-base leading-none">+</span> New reservation</Link>}
      </PageHeader>
      <Banner error={error} ok={ok} />

      {!ent.readOnly ? (
        <form id="new-reservation" action={createReservation} className="scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-6 py-5 bg-slate-50/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-6 rounded-full bg-slate-900" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">New stay</p>
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-slate-950">Create reservation</h2>
              <p className="mt-0.5 text-xs text-slate-500 font-normal">Select each guest sharing the room. They’ll share one consolidated bill.</p>
            </div>
            <span className="rounded-full bg-white border border-slate-200 px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">Front desk</span>
          </div>

          <div className="grid gap-6 p-6 sm:p-7 xl:grid-cols-[1.05fr_.95fr]">
            <section aria-labelledby="reservation-guests-title" className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-2xs">1</span>
                <div><h3 id="reservation-guests-title" className="text-sm font-bold text-slate-950">Guests</h3><p className="text-xs text-slate-500 font-normal">Search existing profiles or register new guests.</p></div>
              </div>
              <GuestPicker />
            </section>

            <section aria-labelledby="reservation-stay-title" className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-2xs">2</span>
                <div><h3 id="reservation-stay-title" className="text-sm font-bold text-slate-950">Stay and pricing</h3><p className="text-xs text-slate-500 font-normal">Choose the room, dates and rate basis.</p></div>
              </div>
              <div className="space-y-4">
                <ReservationPricingFields rooms={rooms} currency={currency} defaultRoomId={roomId} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-700">Check-in date<input name="checkIn" type="date" defaultValue={checkIn} required className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-semibold text-slate-700">Check-out date<input name="checkOut" type="date" defaultValue={checkOut} required className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-semibold text-slate-700">Check-in time<input name="checkInTime" type="time" defaultValue="12:00" className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-semibold text-slate-700">Check-out time<input name="checkOutTime" type="time" defaultValue="11:00" className={`${inputCls} mt-1.5`} /></label>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs leading-relaxed text-slate-500 shadow-2xs">
                  The configured room rate is the default. A manual rate replaces it and is multiplied by nights or billable hours. Hourly stays have a two-hour minimum; the first 30 minutes after each completed hour are free. Manual rates require a reason and are audit logged.
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line bg-ground/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-muted">Room availability and final pricing are verified by the server.</p>
            <FormSubmit className={`${btnCls} w-full sm:w-auto`} pendingLabel="Creating reservation…">Create reservation &amp; bill</FormSubmit>
          </div>
        </form>
      ) : (
        <EmptyState title="Reservations are read-only" description="Your property’s subscription needs attention before staff can create or change reservations." />
      )}

      <ReservationTable reservations={reservations} currency={currency} readOnly={ent.readOnly} />
    </>
  );
}
