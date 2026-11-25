import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api';

export default async function RoomsRedirectPage() {
  const me = await getMe().catch(() => null);
  if (me && (me.role === 'owner' || me.role === 'manager')) {
    redirect('/settings?tab=rooms');
  }
  redirect('/dashboard');
}
