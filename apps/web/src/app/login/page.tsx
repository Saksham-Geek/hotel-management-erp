import { Banner } from '@/components/ui';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8fafc] dark:bg-[#060913] px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] shadow-[0_30px_90px_rgba(2,6,23,0.08)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.5)] lg:min-h-[640px] lg:grid-cols-[1.05fr_1.1fr]">
        
        {/* Left Timeless Luxury Brand & Architecture Panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#080d1a] via-[#0d162b] to-[#050811] p-10 text-white lg:flex xl:p-12">
          {/* Subtle architectural ambient lights */}
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
          
          {/* Brand Monogram & Name */}
          <div className="relative flex items-center gap-3.5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-md shadow-lg shadow-black/20">
              <AuraEmblem />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-white font-display">
                Aura PMS
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-300">
                Enterprise Property Management
              </p>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="relative my-auto max-w-md py-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Unified Cloud Operations Platform
            </div>
            
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.18] tracking-tight text-white xl:text-[38px]">
              The Operating System for World-Class Hospitality.
            </h1>
            
            <p className="mt-4 text-[13px] leading-relaxed text-slate-300">
              Engineered for independent resorts, luxury boutique hotels, and multi-property chains. Zero-latency front desk operations, precision cashiering, and automated statutory governance.
            </p>

            {/* Timeless Feature Pillars */}
            <div className="mt-7 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xs">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-slate-200">
                  <GridIcon />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Unified Front Desk &amp; Room Rack</p>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Multi-day visual tape chart, instant stay allocation, and real-time room status transitions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xs">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-slate-200">
                  <ReceiptIcon />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Integrated Cashiering &amp; Dual GST</p>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Multi-item folios, dynamic NPCI UPI QR settlements, hardware POS integration, and automated Indian tax compliance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xs">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-slate-200">
                  <ShieldLockIcon />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Enterprise Multi-Tenant Security</p>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Cryptographic PostgreSQL Row-Level Security (RLS) isolation and AES-256-GCM encrypted guest identity vault.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeless Footer */}
          <div className="relative border-t border-white/10 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Enterprise Hospitality PMS</span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              SOC-2 Ready · 256-Bit SSL
            </span>
          </div>
        </section>

        {/* Right Authentication Form */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile Header (Hidden on Large Screens) */}
            <div className="mb-7 lg:hidden flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md">
                <AuraEmblem />
              </span>
              <div>
                <p className="text-base font-bold text-ink">Aura PMS</p>
                <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Enterprise Property Management</p>
              </div>
            </div>

            {/* Header Text */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500 dark:text-slate-400">
                Staff &amp; Management Portal
              </p>
              <h2 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink">
                Sign in to your property
              </h2>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Enter your property organization code and registered staff credentials to access your PMS workspace.
              </p>
            </div>

            {/* Error / Status Alert */}
            <div className="mb-4">
              <Banner error={error} ok={ok} />
            </div>

            {/* Login Form */}
            <LoginForm />

            {/* Timeless Security Footnote */}
            <div className="mt-8 border-t border-slate-100 dark:border-white/10 pt-4 text-center">
              <p className="text-[11px] text-muted">
                Protected by PostgreSQL Row-Level Security (RLS) &amp; AES-256-GCM Vault.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

function AuraEmblem() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V6.5L12 3l8 3.5V20M2.5 20h19M8 8v2M12 8v2M16 8v2M8 13v2M12 13v7M16 13v2" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function ShieldLockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="11" r="1.5" />
      <path d="M12 12.5V15" />
    </svg>
  );
}