import { redirect } from 'next/navigation';
import { api, getMe } from '@/lib/api';
import { PlatformAdminView, type PlatformOverviewDto } from './platform-admin-view';

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, me] = await Promise.all([searchParams, getMe()]);

  // Restrict to platform owners/founders
  if (me.role !== 'owner') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent('Access denied: Platform Admin console is restricted to the SaaS Founder and executive directors.'),
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
