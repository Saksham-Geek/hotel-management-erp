import { redirect } from 'next/navigation';
import { requireFeature, api, getMe } from '@/lib/api';
import { FEATURES } from '@erp/shared';
import { StaffView } from './staff-view';

export default async function StaffPage() {
  const me = await getMe();
  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Staff Directory and permissions are restricted to General Managers and Property Owners.',
        ),
    );
  }

  await requireFeature(FEATURES.CORE_USERS);
  const data = await api<any>('/users');

  return <StaffView initialData={data} />;
}
