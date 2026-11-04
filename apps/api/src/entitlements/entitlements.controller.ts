import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import {
  HOSPITALITY_PLAN_TIERS,
  switchPlanSchema,
  SwitchPlanInput,
} from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, AuthUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from './entitlements.service';

@Controller('entitlements')
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.entitlements.resolve(user.tenantId, user.propertyId);
  }

  @Get('plans')
  async plans(@CurrentUser() user: AuthUser) {
    const current = await this.entitlements.resolve(user.tenantId, user.propertyId);
    return {
      currentPlan: current.plan,
      tiers: HOSPITALITY_PLAN_TIERS,
    };
  }

  @Post('switch-plan')
  @Roles('owner')
  async switchPlan(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(switchPlanSchema)) body: SwitchPlanInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Validate plan exists in database catalogue
      const planRow = (
        await c.query(`select key, name from plans where key = $1`, [body.planKey])
      ).rows[0];

      if (!planRow) {
        throw new BadRequestException({
          code: 'INVALID_PLAN',
          message: `Plan '${body.planKey}' does not exist in catalogue`,
        });
      }

      // Read current plan for audit logging
      const currentSub = (
        await c.query(
          `select plan_key from property_subscriptions where tenant_id = $1 and property_id = $2`,
          [user.tenantId, user.propertyId],
        )
      ).rows[0];

      // Update property subscription
      await c.query(
        `update property_subscriptions
         set plan_key = $3, status = 'active'
         where tenant_id = $1 and property_id = $2`,
        [user.tenantId, user.propertyId, body.planKey],
      );

      // Audit log the tier change
      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'subscription.plan_switched',
        entity: 'property_subscription',
        entityId: user.propertyId,
        meta: {
          previousPlan: currentSub?.plan_key ?? null,
          newPlan: body.planKey,
        },
      });

      // Clear cached entitlements
      this.entitlements.invalidate(user.propertyId);

      const resolved = await this.entitlements.resolve(user.tenantId, user.propertyId);
      return {
        success: true,
        message: `Subscription successfully switched to ${planRow.name}`,
        plan: body.planKey,
        entitlements: resolved,
      };
    });
  }
}
