import { redirect } from 'next/navigation';
import { requireFeature, api, getMe } from '@/lib/api';
import { FEATURES } from '@erp/shared';
import { MarketingView } from './marketing-view';

export default async function MarketingPage() {
  const [me, ent, data] = await Promise.all([
    getMe(),
    requireFeature(FEATURES.HOTEL_LOYALTY),
    api<any>('/hotel/marketing/overview'),
  ]);

  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Marketing & Loyalty Campaigns are reserved for General Managers and Property Owners.',
        ),
    );
  }

  return <MarketingView initialData={data} />;
}
