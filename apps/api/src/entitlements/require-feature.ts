import { CanActivate, ExecutionContext, ForbiddenException, HttpException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FeatureKey } from '@erp/shared';
import { EntitlementsService } from './entitlements.service';

const FEATURE_KEY = 'required_feature';
/** Gate a controller or route behind a plan feature. Enforced on the server, never only in the UI. */
export const RequireFeature = (feature: FeatureKey) => SetMetadata(FEATURE_KEY, feature);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly entitlements: EntitlementsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureKey | undefined>(FEATURE_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!feature) return true;

    const req = ctx.switchToHttp().getRequest();
    if (!req.user) return false;
    const ent = await this.entitlements.resolve(req.user.tenantId, req.user.propertyId);

    if (!ent.features[feature]) {
      throw new ForbiddenException({ code: 'FEATURE_NOT_IN_PLAN', feature, message: 'Your plan does not include this feature' });
    }
    if (ent.readOnly && req.method !== 'GET') {
      throw new HttpException(
        { statusCode: 402, code: 'SUBSCRIPTION_INACTIVE', message: 'Your subscription needs attention. You can view data but not change it.' },
        402,
      );
    }
    return true;
  }
}
