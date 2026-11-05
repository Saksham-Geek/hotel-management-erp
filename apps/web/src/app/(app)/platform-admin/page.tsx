import { redirect } from 'next/navigation';
import { api, getMe } from '@/lib/api';
import { PlatformAdminView, type PlatformOverviewDto } from './platform-admin-view';

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, me] = await Promise.all([searchParams, getMe()]);

  // Restrict strictly to SaaS Platform Founders and Cloud HQ internal staff
  const isPlatformFounder =
    me.tenant.slug === 'platform-hq' ||
    me.email === 'founder@antigravity-erp.com' ||
    me.email === 'ops@antigravity-erp.com';

  if (!isPlatformFounder) {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent('Access denied: SaaS Founder HQ is confidential and reserved exclusively for the platform founder and operations staff.'),
    );
  }

  const overview = await api<PlatformOverviewDto>('/platform/overview').catch((err) => {
    console.error('Failed to load platform overview:', err);
    return null;
  });

  if (!overview) {
    redirect('/dashboard?error=' + encodeURIComponent('Could not load Platform HQ data. Ensure backend is running.'));
  }

  return (
    <PlatformAdminView
      data={overview}
      currentEmail={me.email}
      error={error}
      ok={ok}
    />
  );
}
