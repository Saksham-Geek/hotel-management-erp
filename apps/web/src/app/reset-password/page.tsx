import Link from 'next/link';
import { Banner, btnCls, inputCls } from '@/components/ui';
import { completePasswordReset } from './actions';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const validTokenShape = !!token && /^[A-Za-z0-9_-]{40,60}$/.test(token);
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-slate-900/[.06] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-lagoon-dark">Account security</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">Choose a new password</h1>
        <div className="mt-5"><Banner error={error} /></div>
        {validTokenShape ? (
          <form action={completePasswordReset} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />
            <label className="block text-sm font-medium text-ink">
              New password
              <input name="newPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={`${inputCls} mt-1.5`} />
              <span className="mt-1 block text-xs font-normal text-muted">Use at least 10 characters.</span>
            </label>
            <label className="block text-sm font-medium text-ink">
              Confirm new password
              <input name="confirmPassword" type="password" required minLength={10} maxLength={200} autoComplete="new-password" className={`${inputCls} mt-1.5`} />
            </label>
            <button className={`${btnCls} w-full`}>Reset password</button>
          </form>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">This reset link is missing or invalid. Request a new link from the forgot password page.</p>
        )}
        <p className="mt-5 text-center text-sm"><Link href="/forgot-password" className="font-medium text-lagoon-dark underline">Request another link</Link></p>
      </section>
    </main>
  );
}
