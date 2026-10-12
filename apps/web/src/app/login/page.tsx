import { Banner, btnCls, inputCls } from '@/components/ui';
import { login } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-slate-900/[.06] lg:min-h-[570px] lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-9 text-sidebar-foreground lg:flex xl:p-12">
          <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/[.07]" />
          <div aria-hidden className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-white/[.07]" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sidebar-accent/15 text-sidebar-accent"><HotelMark /></span>
            <div><p className="text-sm font-semibold tracking-tight">Hotel operations</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[.17em] text-white/45">Front desk workspace</p></div>
          </div>

          <div className="relative max-w-sm py-12">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-sidebar-accent">Welcome back</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight xl:text-[42px]">Run today’s stay with clarity.</h1>
            <p className="mt-4 text-sm leading-6 text-white/65">A clear view of rooms, reservations and the people who make each stay matter.</p>
          </div>

          <div className="relative border-t border-white/10 pt-5 text-xs text-white/45">
            Secure access for your hotel team
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-9 sm:px-10 lg:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-lagoon-dark"><HotelMark /></span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-lagoon-dark">Sign in</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Welcome back</h2>
            <p className="mt-2 text-sm leading-5 text-muted">Use your hotel code and work account to continue.</p>

            <div className="mt-6"><Banner error={error} /></div>

            <form action={login} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-ink">
                Hotel code
                <input name="tenant" required autoComplete="organization" placeholder="Your hotel code" className={`${inputCls} mt-1.5`} />
              </label>
              <label className="block text-sm font-medium text-ink">
                Work email
                <input name="email" type="email" required autoComplete="username" placeholder="name@hotel.com" className={`${inputCls} mt-1.5`} />
              </label>
              <label className="block text-sm font-medium text-ink">
                Password
                <input name="password" type="password" required autoComplete="current-password" className={`${inputCls} mt-1.5`} />
              </label>
              <button className={`${btnCls} mt-2 w-full`}>
                Sign in
                <ArrowIcon />
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-muted">Access is protected by your hotel’s account and role.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function HotelMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V6.5L12 3l8 3.5V20M2.5 20h19M8 8v2M12 8v2M16 8v2M8 13v2M12 13v7M16 13v2" /></svg>;
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
