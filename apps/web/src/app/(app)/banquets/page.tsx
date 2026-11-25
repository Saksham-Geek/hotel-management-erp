import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import { BanquetClient } from './banquet-client';

export const metadata = {
  title: 'Banquets, Events & Lawns Management | Hotel ERP',
  description: 'Manage wedding lawns, banquet halls, conference bookings, and Function Prospectus (BEO).',
};

export default async function BanquetsPage() {
  const [, [venues, bookings]] = await Promise.all([
    requireFeature(FEATURES.HOTEL_BANQUETS),
    Promise.all([
      api<any[]>('/hotel/banquets/venues').catch(() => []),
      api<any[]>('/hotel/banquets/bookings').catch(() => []),
    ]),
  ]);

  return <BanquetClient initialVenues={venues} initialBookings={bookings} />;
}
