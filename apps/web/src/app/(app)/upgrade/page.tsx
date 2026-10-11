import Link from 'next/link';
import type { FeatureKey } from '@erp/shared';
import { PageHeader } from '@/components/ui';
import { getEntitlements } from '@/lib/api';
import { FEATURE_LABELS } from '@/lib/features';

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const { feature } = await searchParams;
  const ent = await getEntitlements();
  const name = FEATURE_LABELS[feature as FeatureKey] ?? 'This feature';
  return (
    <div className="max-w-xl">
      <PageHeader title={`${name} is not in your plan`} />
      <p className="leading-relaxed text-muted">
        Your hotel is on the {ent.plan ?? 'current'} plan. Ask your account owner to move to a plan that includes {name.toLowerCase()}, and it will appear here as soon as the change is made.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-lagoon underline underline-offset-4">Back to today</Link>
    </div>
  );
}
