import Link from 'next/link';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, EmptyState, inputCls, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { FolioView, type FolioData } from './folio-view';

interface ReservationQuickPick {
  id: string;
  roomNumber: string;
  guestName: string;
  status: string;
  checkIn: string;
  checkOut: string;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reservationId?: string; error?: string; ok?: string }>;
}) {
  const [{ reservationId, error, ok }, ent, me] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_BILLING),
    getMe(),
  ]);

  let folioData: FolioData | null = null;
  if (reservationId) {
    try {
      folioData = await api<FolioData>(`/hotel/folios/reservation/${reservationId}`);
    } catch {
      folioData = null;
    }
  }

  // Fetch active reservations for the quick-picker dropdown
  const reservations = (await api<ReservationQuickPick[]>('/hotel/reservations').catch(() => [])) ?? [];
  const currency = me.property?.currency ?? 'INR';

  return (
    <>
      <PageHeader
        title="Billing &amp; Cashiering"
        eyebrow="Financial Operations"
        description="Indian GST invoicing, multi-folio management, payment collection, and cashier settlements."
      />
      <Banner error={error} ok={ok} />

      {/* Reservation Picker Bar */}
      <section className="mb-6 rounded-xl border border-line bg-surface p-4 shadow-sm">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label htmlFor="res-selector" className="text-xs font-semibold text-ink shrink-0">
            Select Reservation / Room:
          </label>
          <select
            id="res-selector"
            name="reservationId"
            defaultValue={reservationId ?? ''}
            className={`${inputCls} max-w-md flex-1 text-xs`}
          >
            <option value="" disabled>
              Choose an active stay to open folio…
            </option>
            {reservations.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.roomNumber} · {r.guestName} ({r.checkIn} → {r.checkOut}) [{r.status}]
              </option>
            ))}
          </select>
          <button type="submit" className={btnCls}>
            Open Folio
          </button>
        </form>
      </section>

      {folioData ? (
        <FolioView folioData={folioData} currency={currency} readOnly={ent.readOnly} />
      ) : (
        <EmptyState
          title="Select a reservation to view its folio"
          description="Use the dropdown above to choose a stay or click 'Folio / Bill' from the Reservations list."
        />
      )}
    </>
  );
}
