'use client';

import { useEffect, useRef, useState } from 'react';
import { Banner, btnCls, CustomDatePicker, EmptyState, inputCls, PageHeader } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { createReservation } from './actions';
import { GuestPicker } from './guest-picker';
import { ReservationPricingFields } from './pricing-overrides';
import { ReservationTable, type ReservationRow } from './reservation-table';

export interface Room {
  id: string;
  number: string;
  roomType: string;
  baseRate?: number;
  hourlyRate?: number | null;
}

interface ReservationsViewProps {
  reservations: ReservationRow[];
  rooms: Room[];
  currency: string;
  readOnly: boolean;
  error?: string;
  ok?: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
}

export function ReservationsView({
  reservations,
  rooms,
  currency,
  readOnly,
  error,
  ok,
  roomId,
  checkIn,
  checkOut,
}: ReservationsViewProps) {
  // Auto-open if query params pre-fill a room/stay or if there's a submission error
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return Boolean(roomId || checkIn || checkOut || error);
  });

  const formRef = useRef<HTMLFormElement>(null);

  // Focus input and scroll to form
  const focusAndScroll = () => {
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const searchInput = document.getElementById(
        'reservation-guest-search-input',
      ) as HTMLInputElement | null;
      searchInput?.focus();
    }, 150);
  };

  // Check URL hash (#new-reservation) on mount and on hash changes
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#new-reservation') {
        setIsOpen(true);
        focusAndScroll();
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      focusAndScroll();
    } else {
      if (window.location.hash === '#new-reservation') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reservations"
        eyebrow="Front desk"
        description="Manage guest stays, room assignment, check-in and check-out."
      >
        {!readOnly && (
          <div className="flex items-center gap-2">
            {isOpen ? (
              <button
                type="button"
                onClick={() => handleToggle(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/15 transition-all cursor-pointer shadow-xs"
              >
                <span>✕</span>
                <span>Close form</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggle(true)}
                className={`${btnCls} w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-xs`}
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>New reservation</span>
              </button>
            )}
          </div>
        )}
      </PageHeader>

      <Banner error={error} ok={ok} />

      {/* Collapsible New Reservation Form */}
      {!readOnly ? (
        isOpen && (
          <form
            id="new-reservation"
            ref={formRef}
            action={createReservation}
            className="scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-[0_1px_3px_rgba(0,0,0,0.03)] animate-in fade-in-50 slide-in-from-top-3 duration-200"
          >
            {/* Card Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 px-6 py-5 bg-slate-50/60 dark:bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-6 rounded-full bg-slate-900 dark:bg-amber-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    New stay
                  </p>
                </div>
                <h2 className="mt-1 font-display text-xl font-bold text-slate-950 dark:text-white">
                  Create reservation
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 font-normal">
                  Select each guest sharing the room. They’ll share one consolidated bill.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                  Front desk
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close form"
                  aria-label="Close form"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Form Fields: Two Columns */}
            <div className="grid gap-6 p-6 sm:p-7 xl:grid-cols-[1.05fr_.95fr]">
              {/* Section 1: Guests */}
              <section
                aria-labelledby="reservation-guests-title"
                className="min-w-0 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-5 sm:p-6 shadow-2xs"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-2xs">
                    1
                  </span>
                  <div>
                    <h3
                      id="reservation-guests-title"
                      className="text-sm font-bold text-slate-950 dark:text-white"
                    >
                      Guests
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Search existing profiles or register new guests.
                    </p>
                  </div>
                </div>
                <GuestPicker />
              </section>

              {/* Section 2: Stay & Pricing */}
              <section
                aria-labelledby="reservation-stay-title"
                className="min-w-0 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-5 sm:p-6 shadow-2xs"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-2xs">
                    2
                  </span>
                  <div>
                    <h3
                      id="reservation-stay-title"
                      className="text-sm font-bold text-slate-950 dark:text-white"
                    >
                      Stay and pricing
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Choose the room, dates and rate basis.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <ReservationPricingFields
                    rooms={rooms}
                    currency={currency}
                    defaultRoomId={roomId}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Check-in date
                      </label>
                      <CustomDatePicker
                        name="checkIn"
                        defaultValue={checkIn}
                        required
                        aria-label="Check-in date"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Check-out date
                      </label>
                      <CustomDatePicker
                        name="checkOut"
                        defaultValue={checkOut}
                        required
                        aria-label="Check-out date"
                      />
                    </div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Check-in time
                      <input
                        name="checkInTime"
                        type="time"
                        defaultValue="12:00"
                        className={`${inputCls} mt-1.5`}
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Check-out time
                      <input
                        name="checkOutTime"
                        type="time"
                        defaultValue="11:00"
                        className={`${inputCls} mt-1.5`}
                      />
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 shadow-2xs">
                    The configured room rate is the default. A manual rate replaces it and is multiplied by nights or billable hours. Hourly stays have a two-hour minimum; the first 30 minutes after each completed hour are free. Manual rates require a reason and are audit logged.
                  </div>
                </div>
              </section>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle(false)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <p className="text-xs text-muted">
                  Room availability and final pricing are verified by the server.
                </p>
              </div>
              <FormSubmit
                className={`${btnCls} w-full sm:w-auto`}
                pendingLabel="Creating reservation…"
              >
                Create reservation &amp; bill
              </FormSubmit>
            </div>
          </form>
        )
      ) : (
        <EmptyState
          title="Reservations are read-only"
          description="Your property’s subscription needs attention before staff can create or change reservations."
        />
      )}

      {/* Main Operational View: Reservations Table */}
      <ReservationTable
        reservations={reservations}
        currency={currency}
        readOnly={readOnly}
      />
    </div>
  );
}
