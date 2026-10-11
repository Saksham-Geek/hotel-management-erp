import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CustomFieldDefinitionInput, FEATURES, customFieldDefinitionSchema } from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('custom-fields')
@RequireFeature(FEATURES.CORE_CUSTOM_FIELDS)
export class CustomFieldsController {
  constructor(private readonly db: DbService) {}

  @Get(':entity')
  list(@CurrentUser() user: AuthUser, @Param('entity') entity: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (
        await c.query(
          `select id, entity, key, label, field_type as "fieldType", required, options, sort_order as "sortOrder"
           from custom_field_definitions where entity = $1 order by sort_order, label`,
          [entity],
        )
      ).rows,
    );
  }

  @Post()
  @Roles('owner', 'manager')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(customFieldDefinitionSchema)) b: CustomFieldDefinitionInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (
        await c.query(
          `insert into custom_field_definitions (tenant_id, entity, key, label, field_type, required, options, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           returning id, entity, key, label, field_type as "fieldType", required, options`,
          [user.tenantId, b.entity, b.key, b.label, b.fieldType, b.required, b.options ? JSON.stringify(b.options) : null, b.sortOrder],
        )
      ).rows[0],
    );
  }
}
