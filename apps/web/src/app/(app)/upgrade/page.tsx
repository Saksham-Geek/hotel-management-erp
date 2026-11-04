import { HOSPITALITY_PLAN_TIERS, type FeatureKey } from '@erp/shared';
import { PageHeader } from '@/components/ui';
import { getEntitlements, getMe, getPlans } from '@/lib/api';
import { FEATURE_LABELS } from '@/lib/features';
import { PlanCards } from './plan-cards';

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const [{ feature }, me, ent, plansData] = await Promise.all([
    searchParams,
    getMe(),
    getEntitlements(),
    getPlans().catch(() => ({ currentPlan: null, tiers: HOSPITALITY_PLAN_TIERS })),
  ]);

  const activeTiers = plansData.tiers && plansData.tiers.length > 0 ? plansData.tiers : HOSPITALITY_PLAN_TIERS;
  const lockedFeatureName = feature ? FEATURE_LABELS[feature as FeatureKey] ?? feature : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Subscription Plans & Editions"
        eyebrow="Tier Management"
        description="Choose the right edition for your property: from small homestays & boutique B&Bs to luxury hotel chains like Taj, Oberoi, and ITC."
      />

      {lockedFeatureName && (
        <div className="rounded-2xl border border-amber-300/80 bg-amber-500/10 p-5 backdrop-blur-sm dark:border-amber-500/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-700 dark:text-amber-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-ink">
                Unlock {lockedFeatureName}
              </h3>
              <p className="mt-1 text-xs text-muted">
                Your current plan (<strong>{ent.plan ?? 'Basic'}</strong>) does not include access to <em>{lockedFeatureName}</em>. Switch to <strong>Growth</strong> or <strong>Enterprise Chain</strong> below to activate this capability immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      <PlanCards
        tiers={activeTiers}
        currentPlan={ent.plan}
        isOwner={me.role === 'owner'}
        highlightFeature={feature}
      />
    </div>
  );
}
