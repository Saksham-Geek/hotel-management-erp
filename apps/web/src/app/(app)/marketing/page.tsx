import { requireFeature, api } from '@/lib/api';
import { FEATURES } from '@erp/shared';
import { MarketingView } from './marketing-view';

export default async function MarketingPage() {
  await requireFeature(FEATURES.HOTEL_LOYALTY);
  const data = await api<any>('/hotel/marketing/overview');

  return <MarketingView initialData={data} />;
}
