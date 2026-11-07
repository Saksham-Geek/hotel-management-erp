import { redirect } from 'next/navigation';
import { requireFeature, api, getMe } from '@/lib/api';
import { FEATURES } from '@erp/shared';
import { StaffView } from './staff-view';

export default async function StaffPage() {
  const [me, ent, data] = await Promise.all([
    getMe(),
    requireFeature(FEATURES.CORE_USERS),
    api<any>('/users'),
  ]);

  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Staff Directory and permissions are restricted to General Managers and Property Owners.',
        ),
    );
  }

  return <StaffView initialData={data} />;
}
