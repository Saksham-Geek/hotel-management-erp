import Link from 'next/link';
import { OnboardForm } from './onboard-form';

interface OnboardPageProps {
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
}

export default async function OnboardPage(props: OnboardPageProps) {
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Top Navigation & Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <Link href="/login" className="flex items-center gap-2 group">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-950 text-white font-black text-sm shadow-sm group-hover:scale-105 transition-all">
              ⚡
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-slate-950 font-display">
                Antigravity ERP
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Hospitality Cloud
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/showcase"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
            >
              <span>🏛️ View Live Showcase Hub</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 transition-all"
            >
              <span>Already registered? Sign In →</span>
            </Link>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-950 uppercase tracking-wider shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Instant Self-Service Setup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight font-display">
            Launch Your Hotel in 60 Seconds
          </h1>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Get your multi-floor room rack, interactive tape chart, guest check-in folios, and GST tax billing live today. No setup fees, no credit card required.
          </p>
        </div>

        {/* Onboarding Wizard Card */}
        <OnboardForm initialError={searchParams.error} />

        {/* Footer Guarantee */}
        <div className="text-center text-xs text-slate-500 space-y-1 pt-4 pb-12">
          <p className="font-semibold text-slate-600">
            🔒 Bank-grade SSL encryption · Multi-tenant PostgreSQL RLS isolation · 99.99% Uptime Guarantee
          </p>
          <p>
            Looking to explore luxury chain prototypes like Taj &amp; ITC?{' '}
            <Link href="/showcase" className="font-bold text-indigo-600 hover:underline">
              Explore Demo Portfolio Hub →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
