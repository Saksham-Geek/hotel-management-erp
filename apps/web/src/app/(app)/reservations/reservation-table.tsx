'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Banner, btnGhostCls, EmptyState, inputCls, StatusBadge } from '@/components/ui';
import { formatStayDates } from '@/lib/format';
import { changeReservation } from './actions';

export interface ReservationRow {
  id: string;
  status: 'reserved' | 'checked_in' | 'checked_out' | 'cancelled';
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  roomNumber: string;
  guestName: string;
  guestPhone: string | null;
  guests?: { id: string; name: string }[] | null;
}

const transitions: Record<ReservationRow['status'], { action: string; label: string }[]> = {
  reserved: [{ action: 'check-in', label: 'Check in' }, { action: 'cancel', label: 'Cancel' }],
  checked_in: [{ action: 'check-out', label: 'Check out' }],
  checked_out: [],
  cancelled: [],
};

export function ReservationTable({
  reservations,
  currency,
  readOnly,
}: {
  reservations: ReservationRow[];
  currency: string;
  readOnly: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return reservations
      .filter((reservation) => status === 'all' || reservation.status === status)
      .filter((reservation) => !term || [
        reservation.guestName,
        reservation.guestPhone ?? '',
        reservation.roomNumber,
      ].some((value) => value.toLocaleLowerCase().includes(term)))
      .sort((a, b) => sort === 'newest'
        ? b.checkIn.localeCompare(a.checkIn)
        : a.checkIn.localeCompare(b.checkIn));
  }, [reservations, query, status, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function changePage(next: number) {
    setPage(next);
  }

  return (
    <section aria-labelledby="reservation-list-title" className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="reservation-list-title" className="font-display text-lg font-bold tracking-tight text-ink">Reservations</h2>
          <p className="mt-1 text-xs text-muted">Showing {filtered.length} of {reservations.length} recent stays</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(210px,1fr)_150px_145px]">
          <label className="sr-only" htmlFor="reservation-search">Search reservations</label>
          <input id="reservation-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search guest, phone or room" className={inputCls} />
          <label className="sr-only" htmlFor="reservation-status">Filter reservation status</label>
          <select id="reservation-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputCls}>
            <option value="all">All statuses</option>
            <option value="reserved">Booked</option>
            <option value="checked_in">In house</option>
            <option value="checked_out">Checked out</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label className="sr-only" htmlFor="reservation-sort">Sort reservations</label>
          <select id="reservation-sort" value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} className={inputCls}>
            <option value="newest">Check-in: newest</option>
            <option value="oldest">Check-in: oldest</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={reservations.length === 0 ? 'No reservations yet' : 'No matching reservations'} description={reservations.length === 0 ? 'Create a reservation to add the first stay.' : 'Try a different guest, room, or status filter.'} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b border-line bg-slate-100/90 text-xs font-black uppercase tracking-wider text-slate-800">
                  <tr>
                    <th scope="col" className="px-5 py-4">Guest</th>
                    <th scope="col" className="px-5 py-4">Room</th>
                    <th scope="col" className="px-5 py-4">Stay Duration</th>
                    <th scope="col" className="px-5 py-4">Total Amount</th>
                    <th scope="col" className="px-5 py-4">Status</th>
                    <th scope="col" className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm sm:text-[15px]">
                  {visible.map((reservation) => (
                    <tr key={reservation.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{reservation.guestName}</p>
                        {reservation.guestPhone && <p className="mt-0.5 text-xs text-slate-600 font-medium">{reservation.guestPhone}</p>}
                        {(reservation.guests?.length ?? 0) > 1 && (
                          <p className="mt-1 text-xs text-slate-500 font-semibold">
                            + {(reservation.guests?.length ?? 1) - 1} companion{reservation.guests?.length === 2 ? '' : 's'}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-black font-mono text-slate-950">Room {reservation.roomNumber}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{formatStayDates(reservation.checkIn, reservation.checkOut)}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-black text-slate-950">{money(reservation.totalAmount, currency)}</td>
                      <td className="px-5 py-4"><StatusBadge status={reservation.status} /></td>
                      <td className="px-5 py-4"><Actions reservation={reservation} readOnly={readOnly} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 md:hidden">
            {visible.map((reservation) => (
              <article key={reservation.id} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-950">{reservation.guestName}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">Room {reservation.roomNumber}{reservation.guestPhone ? ` · ${reservation.guestPhone}` : ''}</p>
                  </div>
                  <StatusBadge status={reservation.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">{formatStayDates(reservation.checkIn, reservation.checkOut)}</p>
                  <p className="text-sm sm:text-base font-black text-slate-950">{money(reservation.totalAmount, currency)}</p>
                </div>
                {!readOnly && <div className="mt-3"><Actions reservation={reservation} readOnly={readOnly} /></div>}
              </article>
            ))}
          </div>

          {filtered.length > pageSize && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
              <p className="text-xs text-muted">Page {safePage} of {pageCount}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => changePage(Math.max(1, safePage - 1))} disabled={safePage === 1} className={btnGhostCls}>Previous</button>
                <button type="button" onClick={() => changePage(Math.min(pageCount, safePage + 1))} disabled={safePage === pageCount} className={btnGhostCls}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Actions({ reservation, readOnly }: { reservation: ReservationRow; readOnly: boolean }) {
  const actions = readOnly ? [] : transitions[reservation.status];
  return (
    <div className="flex flex-wrap justify-end items-center gap-2">
      <Link
        href={`/billing?reservationId=${reservation.id}`}
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-lagoon-dark hover:bg-ground transition-colors"
      >
        Folio / Bill
      </Link>
      {actions.map((item) => (
        <form
          key={item.action}
          action={changeReservation}
          onSubmit={(event) => {
            if (item.action === 'cancel' && !window.confirm(`Cancel the reservation for ${reservation.guestName}?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={reservation.id} />
          <input type="hidden" name="action" value={item.action} />
          <ActionButton action={item.action}>{item.label}</ActionButton>
        </form>
      ))}
    </div>
  );
}

function ActionButton({ action, children }: { action: string; children: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={action === 'cancel' ? 'inline-flex min-h-9 items-center justify-center rounded-lg border border-danger/20 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50' : btnGhostCls}>{pending ? 'Saving…' : children}</button>;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
