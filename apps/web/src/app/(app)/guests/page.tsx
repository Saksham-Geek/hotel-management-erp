import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, EmptyState, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { GuestDirectory, type GuestProfile } from './guest-directory';
import { RegisterGuestForm } from './register-guest-form';

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [me, { error, ok }, ent, guests] = await Promise.all([
    getMe(),
    searchParams,
    requireFeature(FEATURES.HOTEL_RESERVATIONS),
    api<GuestProfile[]>('/hotel/guests'),
  ]);

  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Guests directory is reserved for Front Desk and Management.',
        ),
    );
  }

  return (
    <>
      <PageHeader title="Guest directory" eyebrow="Guest profiles" description="Keep reusable guest details in one place and find returning guests quickly." />
      <Banner error={error} ok={ok} />

      {!ent.readOnly ? (
        <RegisterGuestForm />
      ) : (
        <EmptyState title="Guest profiles are read-only" description="Your property’s subscription needs attention before changes can be made." />
      )}

      <GuestDirectory guests={guests} readOnly={ent.readOnly} currentUser={{ fullName: me.fullName, email: me.email, role: me.role }} />
    </>
  );
}
