import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, CustomDropdown, EmptyState, inputCls, selectCls, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { FolioView, type FolioData } from './folio-view';
import { UpiReceiverBanner } from './upi-receiver-banner';

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
  const me = await getMe();
  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Billing & Folio Cashiering is restricted to Front Desk and Management.',
        ),
    );
  }

  const [{ reservationId, error, ok }, ent, upiSettings] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_BILLING),
    api<{ upiId: string; upiMerchantName: string; propertyName: string; isOwner: boolean }>('/hotel/upi-settings').catch(() => null),
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

      {/* Receiver UPI Configuration Bar */}
      <UpiReceiverBanner
        upiSettings={upiSettings}
        isOwner={me.role === 'owner'}
        propertyName={me.property?.name ?? 'Hotel'}
        reservationId={reservationId}
      />

      {/* Reservation Picker Bar */}
      <section className="mb-6 rounded-xl border border-line bg-surface p-4 shadow-sm">
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label htmlFor="res-selector" className="text-xs font-semibold text-ink shrink-0">
            Select Reservation / Room:
          </label>
          <div className="max-w-md flex-1">
            <CustomDropdown
              id="res-selector"
              name="reservationId"
              defaultValue={reservationId ?? ''}
              placeholder="Choose an active stay to open folio…"
              size="sm"
              options={reservations.map((r) => ({
                value: r.id,
                label: `Room ${r.roomNumber} · ${r.guestName} (${r.checkIn} → ${r.checkOut}) [${r.status}]`,
                badge: `Rm ${r.roomNumber}`,
              }))}
              aria-label="Select Reservation"
            />
          </div>
          <button type="submit" className={btnCls}>
            Open Folio
          </button>
        </form>
      </section>

      {folioData ? (
        <FolioView
          folioData={folioData}
          currency={currency}
          readOnly={ent.readOnly}
          userRole={me.role}
          propertyUpi={
            upiSettings
              ? {
                  upiId: upiSettings.upiId,
                  upiMerchantName: upiSettings.upiMerchantName,
                  propertyName: me.property?.name ?? 'Hotel',
                }
              : undefined
          }
        />
      ) : (
        <EmptyState
          title="Select a reservation to view its folio"
          description="Use the dropdown above to choose a stay or click 'Folio / Bill' from the Reservations list."
        />
      )}
    </>
  );
}
