import { Body, Controller, Get, Post } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { CreateUserInput, FEATURES, createUserSchema } from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('users')
@RequireFeature(FEATURES.CORE_USERS)
@Roles('owner', 'manager')
export class UsersController {
  constructor(
    private readonly db: DbService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (await c.query(
        `select u.id, u.email, u.full_name as "fullName", pu.role, u.is_active as "isActive"
         from users u join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id
         where pu.property_id = $1 order by u.created_at`, [user.propertyId],
      )).rows,
    );
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createUserSchema)) body: CreateUserInput) {
    const passwordHash = await hash(body.password, 10);
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const { rows: [{ n }] } = await c.query(
        `select count(*)::int as n from property_users pu join users u on u.id = pu.user_id and u.tenant_id = pu.tenant_id
         where pu.property_id = $1 and u.is_active`, [user.propertyId],
      );
      await this.entitlements.assertWithinLimit(user.tenantId, user.propertyId, FEATURES.CORE_USERS, n);
      const { rows } = await c.query(
        `insert into users (tenant_id, email, password_hash, full_name, role)
         values ($1, lower($2), $3, $4, $5) returning id, email, full_name as "fullName", role`,
        [user.tenantId, body.email, passwordHash, body.fullName, body.role],
      );
      await c.query(
        `insert into property_users (tenant_id, property_id, user_id, role) values ($1,$2,$3,$4)`,
        [user.tenantId, user.propertyId, rows[0].id, body.role],
      );
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'user.create', entity: 'user', entityId: rows[0].id, meta: { role: body.role } });
      return rows[0];
    });
  }
}
