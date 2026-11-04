import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { CreateStaffInput, FEATURES, createStaffSchema } from '@erp/shared';
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
  async list(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const { rows } = await c.query(
        `select u.id, u.email, u.full_name as "fullName", pu.role,
                coalesce(pu.department, 'Operations') as "department",
                coalesce(pu.shift, 'General') as "shift",
                u.is_active as "isActive",
                pu.created_at as "assignedAt",
                inv.full_name as "invitedByName"
         from users u
         join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id
         left join users inv on inv.id = pu.invited_by
         where pu.property_id = $1
         order by
           case pu.role
             when 'owner' then 1
             when 'manager' then 2
             when 'frontdesk' then 3
             when 'housekeeping' then 4
             else 5
           end,
           u.full_name asc`,
        [user.propertyId],
      );

      // Caller permissions and allowed delegation roles
      const allowedRoles =
        user.role === 'owner'
          ? ['owner', 'manager', 'frontdesk', 'housekeeping']
          : user.role === 'manager'
          ? ['frontdesk', 'housekeeping']
          : [];

      // Hierarchy Breakdown
      const hierarchy = {
        owners: rows.filter((r) => r.role === 'owner'),
        managers: rows.filter((r) => r.role === 'manager'),
        frontdesk: rows.filter((r) => r.role === 'frontdesk'),
        housekeeping: rows.filter((r) => r.role === 'housekeeping'),
      };

      return {
        staff: rows,
        hierarchy,
        callerRole: user.role,
        allowedRoles,
        summary: {
          total: rows.length,
          active: rows.filter((r) => r.isActive).length,
          inactive: rows.filter((r) => !r.isActive).length,
        },
      };
    });
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createStaffSchema)) body: CreateStaffInput,
  ) {
    // 1. Strict Role Delegation Hierarchy Check
    if (user.role === 'manager' && (body.role === 'owner' || body.role === 'manager')) {
      throw new ForbiddenException(
        'General Managers are strictly permitted to provision Front Desk and Housekeeping staff only. Contact the Property Owner to appoint Managers or Owners.',
      );
    }

    if (user.role !== 'owner' && user.role !== 'manager') {
      throw new ForbiddenException('You do not have authorization to provision hotel staff.');
    }

    const email = body.email.toLowerCase().trim();
    const passwordHash = await hash(body.password, 10);

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // 2. Check user seat limit against subscription plan
      const {
        rows: [{ n }],
      } = await c.query(
        `select count(*)::int as n
         from property_users pu
         join users u on u.id = pu.user_id and u.tenant_id = pu.tenant_id
         where pu.property_id = $1 and u.is_active`,
        [user.propertyId],
      );
      await this.entitlements.assertWithinLimit(user.tenantId, user.propertyId, FEATURES.CORE_USERS, n);

      // 3. Check if user already exists in this tenant
      let targetUserId: string;
      const existingUser = (
        await c.query(`select id from users where tenant_id = $1 and email = $2`, [
          user.tenantId,
          email,
        ])
      ).rows[0];

      if (existingUser) {
        targetUserId = existingUser.id;
        // Update full name if needed
        await c.query(`update users set full_name = $1 where id = $2`, [
          body.fullName.trim(),
          targetUserId,
        ]);
      } else {
        const { rows } = await c.query(
          `insert into users (tenant_id, email, password_hash, full_name, role)
           values ($1, $2, $3, $4, $5)
           returning id`,
          [user.tenantId, email, passwordHash, body.fullName.trim(), body.role],
        );
        targetUserId = rows[0].id;
      }

      // 4. Attach to current property with department, shift, and invited_by
      await c.query(
        `insert into property_users (tenant_id, property_id, user_id, role, department, shift, invited_by)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (tenant_id, property_id, user_id)
         do update set role = excluded.role, department = excluded.department, shift = excluded.shift`,
        [
          user.tenantId,
          user.propertyId,
          targetUserId,
          body.role,
          body.department || 'Front Office',
          body.shift || 'General',
          user.id,
        ],
      );

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'user.provision',
        entity: 'user',
        entityId: targetUserId,
        meta: {
          role: body.role,
          department: body.department,
          shift: body.shift,
          delegatedByUserId: user.id,
        },
      });

      return {
        id: targetUserId,
        email,
        fullName: body.fullName,
        role: body.role,
        department: body.department,
        shift: body.shift,
      };
    });
  }

  @Patch(':id/status')
  async toggleStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') targetUserId: string,
  ) {
    if (user.id === targetUserId) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Check target user's role in this property
      const targetStaff = (
        await c.query(
          `select pu.role, u.is_active as "isActive", u.full_name as "fullName"
           from property_users pu
           join users u on u.id = pu.user_id
           where pu.property_id = $1 and pu.user_id = $2`,
          [user.propertyId, targetUserId],
        )
      ).rows[0];

      if (!targetStaff) {
        throw new NotFoundException('Staff member not found in this property.');
      }

      // Role delegation protection:
      if (user.role === 'manager' && (targetStaff.role === 'owner' || targetStaff.role === 'manager')) {
        throw new ForbiddenException(
          'General Managers cannot deactivate Property Owners or fellow Managers.',
        );
      }

      const newStatus = !targetStaff.isActive;
      await c.query(`update users set is_active = $1 where id = $2`, [newStatus, targetUserId]);

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: newStatus ? 'user.activate' : 'user.deactivate',
        entity: 'user',
        entityId: targetUserId,
        meta: { previousStatus: targetStaff.isActive, newStatus },
      });

      return { id: targetUserId, isActive: newStatus, fullName: targetStaff.fullName };
    });
  }

  @Delete(':id')
  async removeStaff(
    @CurrentUser() user: AuthUser,
    @Param('id') targetUserId: string,
  ) {
    if (user.id === targetUserId) {
      throw new BadRequestException('You cannot remove yourself from the property staff.');
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const targetStaff = (
        await c.query(
          `select pu.role, u.full_name as "fullName"
           from property_users pu
           join users u on u.id = pu.user_id
           where pu.property_id = $1 and pu.user_id = $2`,
          [user.propertyId, targetUserId],
        )
      ).rows[0];

      if (!targetStaff) {
        throw new NotFoundException('Staff member not found in this property.');
      }

      if (user.role === 'manager' && (targetStaff.role === 'owner' || targetStaff.role === 'manager')) {
        throw new ForbiddenException(
          'General Managers cannot remove Property Owners or fellow Managers from the property.',
        );
      }

      await c.query(
        `delete from property_users where tenant_id = $1 and property_id = $2 and user_id = $3`,
        [user.tenantId, user.propertyId, targetUserId],
      );

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'user.unassign',
        entity: 'user',
        entityId: targetUserId,
        meta: { removedStaffRole: targetStaff.role, removedStaffName: targetStaff.fullName },
      });

      return { success: true, removedUserId: targetUserId };
    });
  }
}
