import { redirect } from 'next/navigation';
import { api, getMe } from '@/lib/api';
import { SuperAdminView, type SuperAdminOverviewDto } from './super-admin-view';

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, me] = await Promise.all([searchParams, getMe()]);

  if (me.role !== 'owner') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent('Access denied: Super Admin console is restricted to organization owners and directors.'),
    );
  }

  const overview = await api<SuperAdminOverviewDto>('/super-admin/overview');

  return <SuperAdminView data={overview} error={error} ok={ok} />;
}
