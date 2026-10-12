import { Banner, btnCls } from '@/components/ui';
import { verifyEmailChange } from './actions';

export default async function VerifyEmailPage({
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
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">Verify your new email</h1>
        <div className="mt-5"><Banner error={error} /></div>
        {validTokenShape ? (
          <>
            <p className="mt-4 text-sm leading-6 text-muted">Confirm that you want to use this address for signing in. This link can be used only once.</p>
            <form action={verifyEmailChange} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button className={`${btnCls} w-full`}>Verify email address</button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">This link is missing or invalid. Request a new verification email from your profile page.</p>
        )}
      </section>
    </main>
  );
}
