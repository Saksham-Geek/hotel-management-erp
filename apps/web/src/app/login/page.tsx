import { Banner } from '@/components/ui';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8fafc] dark:bg-slate-950 px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 lg:min-h-[620px] lg:grid-cols-[1fr_1.1fr]">
        
        {/* Left Luxury Showcase Panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0c1427] via-[#111c38] to-[#070c18] p-10 text-white lg:flex xl:p-14">
          <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-teal-500/20 blur-2xl" />
          <div aria-hidden className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full border border-teal-500/10 blur-3xl" />
          
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20">
              <HotelMark />
            </span>
            <div>
              <p className="text-base font-extrabold tracking-tight text-white font-display">
                Antigravity ERP
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-300">
                Hospitality Cloud OS
              </p>
            </div>
          </div>

          <div className="relative max-w-sm py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
              Tailored for Taj, Oberoi & Boutique Hotels
            </div>
            
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-white xl:text-[44px]">
              Elevate every stay. Automate statutory compliance.
            </h1>
            
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Real-time Tape Chart, Indian GST 12%/18% tax calculation, Section 269ST ₹2L cash guard, BoI Form C foreigner portal & daily police registers in one unified suite.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xs">
                <p className="font-bold text-teal-300 text-sm">3 Subscriptions</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Starter, Growth & Taj Chain</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xs">
                <p className="font-bold text-teal-300 text-sm">100% Compliant</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Dual GST Slabs & Aadhaar Vault</p>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/10 pt-5 flex items-center justify-between text-xs text-slate-400">
            <span>© 2026 Hotel ERP Platform</span>
            <span className="font-mono text-[11px] text-teal-400/80">v2.4.0 High-Performance</span>
          </div>
        </section>

        {/* Right Authentication Form */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-6 lg:hidden flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white">
                <HotelMark />
              </span>
              <div>
                <p className="text-base font-bold text-ink">Antigravity ERP</p>
                <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Hospitality Cloud</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-600 dark:text-teal-400">
                Staff & Management Portal
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
                Sign in to your property
              </h2>
              <p className="mt-1.5 text-xs text-muted">
                Enter your hotel organization code and registered credentials.
              </p>
            </div>

            <div className="mb-4">
              <Banner error={error} ok={ok} />
            </div>

            <LoginForm />

            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
              <p className="text-[11px] text-muted">
                Protected by PostgreSQL Row Level Security (RLS) & AES-256-GCM Vault.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

function HotelMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V6.5L12 3l8 3.5V20M2.5 20h19M8 8v2M12 8v2M16 8v2M8 13v2M12 13v7M16 13v2" />
    </svg>
  );
}
