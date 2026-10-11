import { Body, ConflictException, Controller, Get, HttpException, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

const createPropertySchema = z.object({ name: z.string().trim().min(2).max(120) });

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => (
      await c.query(
        `select p.id, p.name, pu.role
         from property_users pu join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where pu.user_id = $1 and p.status = 'active' order by p.is_default desc, p.name`,
        [user.id],
      )
    ).rows);
  }

  @Post()
  @Roles('owner')
  async create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createPropertySchema)) body: { name: string }) {
    const subscription = await this.entitlements.resolve(user.tenantId, user.propertyId);
    if (subscription.readOnly) {
      throw new HttpException(
        { statusCode: 402, code: 'SUBSCRIPTION_INACTIVE', message: 'Your subscription needs attention. You can view data but not change it.' },
        402,
      );
    }
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const current = (await c.query(
        `select timezone, currency from properties where id = $1`, [user.propertyId],
      )).rows[0];
      if (!current) throw new ConflictException({ code: 'PROPERTY_UNAVAILABLE', message: 'The active property is unavailable.' });

      const property = (await c.query(
        `insert into properties (tenant_id, name, timezone, currency) values ($1,$2,$3,$4) returning id, name`,
        [user.tenantId, body.name, current.timezone, current.currency],
      )).rows[0];

      await c.query(
        `insert into property_users (tenant_id, property_id, user_id, role) values ($1,$2,$3,'owner')`,
        [user.tenantId, property.id, user.id],
      );
      const subscription = (await c.query(
        `select plan_key, status, trial_ends_at, current_period_end
         from property_subscriptions where tenant_id = $1 and property_id = $2`,
        [user.tenantId, user.propertyId],
      )).rows[0];
      await c.query("select set_config('app.property_id', $1, true)", [property.id]);
      if (subscription) {
        await c.query(
          `insert into property_subscriptions (tenant_id, property_id, plan_key, status, trial_ends_at, current_period_end)
           values ($1,$2,$3,$4,$5,$6)`,
          [user.tenantId, property.id, subscription.plan_key, subscription.status, subscription.trial_ends_at, subscription.current_period_end],
        );
      }
      await this.audit.log(c, {
        tenantId: user.tenantId, userId: user.id, action: 'property.create',
        entity: 'property', entityId: property.id, meta: { name: property.name },
      });
      return property;
    });
  }
}
