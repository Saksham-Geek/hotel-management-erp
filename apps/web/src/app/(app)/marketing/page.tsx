import { redirect } from 'next/navigation';
import { requireFeature, api, getMe } from '@/lib/api';
import { FEATURES } from '@erp/shared';
import { MarketingView } from './marketing-view';

export default async function MarketingPage() {
  const me = await getMe();
  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Marketing & Loyalty Campaigns are reserved for General Managers and Property Owners.',
        ),
    );
  }

  await requireFeature(FEATURES.HOTEL_LOYALTY);
  const data = await api<any>('/hotel/marketing/overview');

  return <MarketingView initialData={data} />;
}
