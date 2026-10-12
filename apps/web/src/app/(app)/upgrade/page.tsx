import Link from 'next/link';
import type { FeatureKey } from '@erp/shared';
import { btnCls, PageHeader } from '@/components/ui';
import { getEntitlements } from '@/lib/api';
import { FEATURE_LABELS } from '@/lib/features';

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const [{ feature }, ent] = await Promise.all([searchParams, getEntitlements()]);
  const name = FEATURE_LABELS[feature as FeatureKey] ?? 'This feature';
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Plan access" eyebrow="Subscription" description="Feature access follows the subscription assigned to this property." />
      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line bg-ground/45 px-5 py-5 sm:px-7">
          <span className="inline-flex rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-warning">{ent.plan ?? 'No active'} plan</span>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">{name} isn’t included in this plan</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Ask your account owner to review the subscription for this property. Once its entitlements change, access updates automatically.</p>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs text-muted">Current property access is verified by the server.</p>
          <Link href="/dashboard" className={`${btnCls} w-full sm:w-auto`}>Return to today</Link>
        </div>
      </section>
    </div>
  );
}
