import { FEATURES } from '@erp/shared';
import {
  Banner,
  btnCls,
  btnGhostCls,
  inputCls,
  PageHeader,
} from '@/components/ui';
import {
  api,
  getMe,
  money,
  requireFeature,
} from '@/lib/api';
import {
  changeReservation,
  createReservation,
} from './actions';
import { GuestPicker } from './guest-picker';
import { ReservationPricingFields } from './pricing-overrides';

interface Reservation {
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

interface Room {
  id: string;
  number: string;
  roomType: string;
  baseRate?: number;
  hourlyRate?: number | null;
}

const STATUS_LABEL = {
  reserved: 'Booked',
  checked_in: 'In house',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
} as const;

const NEXT: Record<
  Reservation['status'],
  { action: string; label: string }[]
> = {
  reserved: [
    { action: 'check-in', label: 'Check in' },
    { action: 'cancel', label: 'Cancel' },
  ],
  checked_in: [
    { action: 'check-out', label: 'Check out' },
  ],
  checked_out: [],
  cancelled: [],
};

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
    api<Reservation[]>('/hotel/reservations'),
    api<Room[]>('/hotel/rooms'),
  ]);

  const cur = me.property.currency;

  return (
    <>
      <PageHeader title="Reservations" />

      <Banner error={error} ok={ok} />

      {!ent.readOnly && (
        <form
          action={createReservation}
          className="mb-8 space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lagoon">
                Front desk
              </p>

              <h2 className="mt-1 font-display text-xl font-bold">
                Create reservation
              </h2>

              <p className="mt-1 text-sm text-muted">
                Reuse guest profiles. One reservation creates one
                consolidated bill by default.
              </p>
            </div>

            <span className="rounded-full bg-lagoon-tint px-3 py-1 text-xs font-semibold text-lagoon-dark">
              New stay
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-xl bg-ground/60 p-4">
              <GuestPicker />
            </section>

            <section className="space-y-3 rounded-xl bg-ground/60 p-4">
              <h3 className="text-sm font-semibold">
                2. Stay and pricing
              </h3>

              <ReservationPricingFields rooms={rooms} currency={cur} />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-muted">
                  Check-in date

                  <input
                    name="checkIn"
                    type="date"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>

                <label className="text-xs font-medium text-muted">
                  Check-out date

                  <input
                    name="checkOut"
                    type="date"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-muted">
                    Check-in time

                    <input
                      name="checkInTime"
                      type="time"
                      defaultValue="12:00"
                      className={`${inputCls} mt-1`}
                    />
                  </label>

                  <label className="text-xs font-medium text-muted">
                    Check-out time

                    <input
                      name="checkOutTime"
                      type="time"
                      defaultValue="11:00"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                </div>
              </div>

              <p className="text-xs text-muted">
                The configured room rate is the default. A manual rate replaces
                it and is multiplied by the stay length. Hourly stays have a
                two-hour minimum; the first 30 minutes after each completed hour
                are free. Manual rates require a reason and are audit logged.
              </p>
            </section>
          </div>

          <div className="flex justify-end">
            <button className={`${btnCls} w-full sm:w-auto`}>
              Create reservation &amp; bill
            </button>
          </div>
        </form>
      )}

      {reservations.length === 0 ? (
        <p className="text-muted">
          No reservations yet. Create the first one above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Stay</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {reservations.map((reservation) => (
                <tr
                  key={reservation.id}
                  className="border-b border-line transition-colors hover:bg-ground/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {reservation.guestName}
                    </p>

                    {reservation.guestPhone && (
                      <p className="text-xs text-muted">
                        {reservation.guestPhone}
                      </p>
                    )}

                    {(reservation.guests?.length ?? 0) > 1 && (
                      <p className="mt-1 text-xs text-muted">
                        + {(reservation.guests?.length ?? 1) - 1}{' '}
                        companion
                        {(reservation.guests?.length ?? 1) === 2
                          ? ''
                          : 's'}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {reservation.roomNumber}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {reservation.checkIn} to {reservation.checkOut}
                  </td>

                  <td className="px-4 py-3">
                    {money(reservation.totalAmount, cur)}
                  </td>

                  <td className="px-4 py-3">
                    {STATUS_LABEL[reservation.status]}
                  </td>

                  <td className="px-4 py-3">
                    {!ent.readOnly && (
                      <div className="flex justify-end gap-2">
                        {NEXT[reservation.status].map((next) => (
                          <form
                            key={next.action}
                            action={changeReservation}
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={reservation.id}
                            />

                            <input
                              type="hidden"
                              name="action"
                              value={next.action}
                            />

                            <button className={btnGhostCls}>
                              {next.label}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
