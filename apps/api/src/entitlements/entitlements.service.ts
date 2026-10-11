import { ForbiddenException, Injectable } from '@nestjs/common';
import type { EntitlementsDto, FeatureKey, PlanKey } from '@erp/shared';
import { DbService } from '../db/db.service';

const TTL_MS = 60_000;

@Injectable()
export class EntitlementsService {
  private cache = new Map<string, { at: number; value: EntitlementsDto }>();
  constructor(private readonly db: DbService) {}

  /** Call after a subscription or override changes (billing webhook, admin console). */
  invalidate(propertyId: string) {
    this.cache.delete(propertyId);
  }

  /** plan features + per-tenant overrides, honouring subscription state. */
  async resolve(tenantId: string, propertyId: string): Promise<EntitlementsDto> {
    const hit = this.cache.get(propertyId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    const value = await this.db.withTenant(tenantId, propertyId, async (c) => {
      const sub = (
        await c.query(
          `select plan_key, status, trial_ends_at, current_period_end from property_subscriptions where tenant_id = $1 and property_id = $2`,
          [tenantId, propertyId],
        )
      ).rows[0];

      if (!sub || sub.status === 'canceled') {
        return { plan: (sub?.plan_key ?? null) as PlanKey | null, status: sub ? 'canceled' : 'none', readOnly: true, features: {} } as EntitlementsDto;
      }

      const planRows = (await c.query(`select feature_key, limit_value from plan_features where plan_key = $1`, [sub.plan_key])).rows;
      const overrides = (await c.query(`select feature_key, enabled, limit_value from property_feature_overrides where tenant_id = $1 and property_id = $2`, [tenantId, propertyId])).rows;

      const features: EntitlementsDto['features'] = {};
      for (const r of planRows) features[r.feature_key as FeatureKey] = { limit: r.limit_value };
      for (const o of overrides) {
        if (!o.enabled) delete features[o.feature_key as FeatureKey];
        else features[o.feature_key as FeatureKey] = { limit: o.limit_value };
      }

      const now = new Date();
      const trialExpired = sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at) <= now;
      const periodExpired = sub.current_period_end && new Date(sub.current_period_end) <= now;
      const readOnly = sub.status === 'past_due' || !!trialExpired || !!periodExpired;
      return { plan: sub.plan_key, status: sub.status, readOnly, features } as EntitlementsDto;
    });

    this.cache.set(propertyId, { at: Date.now(), value });
    return value;
  }

  /** Throws if the tenant is at or over the plan limit for a feature (e.g. max users). */
  async assertWithinLimit(tenantId: string, propertyId: string, feature: FeatureKey, currentCount: number) {
    const ent = await this.resolve(tenantId, propertyId);
    const f = ent.features[feature];
    if (!f) throw new ForbiddenException({ code: 'FEATURE_NOT_IN_PLAN', feature, message: 'Your plan does not include this feature' });
    if (f.limit !== null && currentCount >= f.limit) {
      throw new ForbiddenException({
        code: 'LIMIT_REACHED', feature, limit: f.limit,
        message: `Your plan allows up to ${f.limit}. Upgrade to add more.`,
      });
    }
  }
}
