import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TOKEN_COOKIE } from '@/lib/api';

export default async function Home() {
  const hasToken = (await cookies()).has(TOKEN_COOKIE);
  if (!hasToken) {
    redirect('/login');
  }
  redirect('/dashboard');
}
