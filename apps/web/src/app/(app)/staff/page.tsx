import { requireFeature, api } from '@/lib/api';
import { FEATURES } from '@erp/shared';
import { StaffView } from './staff-view';

export default async function StaffPage() {
  await requireFeature(FEATURES.CORE_USERS);
  const data = await api<any>('/users');

  return <StaffView initialData={data} />;
}
