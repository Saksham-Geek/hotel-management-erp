import Link from 'next/link';
import { Banner, btnCls, inputCls } from '@/components/ui';
import { sendPasswordReset } from './actions';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-slate-900/[.06] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-lagoon-dark">Account security</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Enter your hotel code and account email. If an active account matches, we’ll send a one-time reset link.</p>
        <div className="mt-5"><Banner error={error} ok={sent ? 'If an active account matches those details, a password reset link has been sent.' : undefined} /></div>
        <form action={sendPasswordReset} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-ink">
            Hotel code
            <input name="tenant" required minLength={2} maxLength={41} autoComplete="organization" placeholder="Your hotel code" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Account email
            <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="name@hotel.com" className={`${inputCls} mt-1.5`} />
          </label>
          <button className={`${btnCls} w-full`}>Send reset link</button>
        </form>
        <p className="mt-5 text-center text-sm"><Link href="/login" className="font-medium text-lagoon-dark underline">Back to sign in</Link></p>
      </section>
    </main>
  );
}
