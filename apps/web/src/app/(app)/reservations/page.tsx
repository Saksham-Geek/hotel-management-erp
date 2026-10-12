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
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, ent, me] = await Promise.all([
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
        <form id="new-reservation" action={createReservation} className="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-lagoon-dark">New stay</p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">Create reservation</h2>
              <p className="mt-1 text-sm text-muted">Select each guest sharing the room. They’ll share one consolidated bill.</p>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-semibold text-lagoon-dark">Front desk</span>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[1.05fr_.95fr]">
            <section aria-labelledby="reservation-guests-title" className="min-w-0 rounded-xl border border-line bg-ground/55 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <div><h3 id="reservation-guests-title" className="text-sm font-semibold text-ink">Guests</h3><p className="text-xs text-muted">Search existing profiles or register new guests.</p></div>
              </div>
              <GuestPicker />
            </section>

            <section aria-labelledby="reservation-stay-title" className="min-w-0 rounded-xl border border-line bg-ground/55 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <div><h3 id="reservation-stay-title" className="text-sm font-semibold text-ink">Stay and pricing</h3><p className="text-xs text-muted">Choose the room, dates and rate basis.</p></div>
              </div>
              <div className="space-y-4">
                <ReservationPricingFields rooms={rooms} currency={currency} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-ink">Check-in date<input name="checkIn" type="date" required className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-medium text-ink">Check-out date<input name="checkOut" type="date" required className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-medium text-ink">Check-in time<input name="checkInTime" type="time" defaultValue="12:00" className={`${inputCls} mt-1.5`} /></label>
                  <label className="block text-xs font-medium text-ink">Check-out time<input name="checkOutTime" type="time" defaultValue="11:00" className={`${inputCls} mt-1.5`} /></label>
                </div>
                <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs leading-5 text-muted">
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
