import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

const createHotelSchema = z.object({
  name: z.string().trim().min(2).max(120),
  timezone: z.string().default('Asia/Kolkata'),
  currency: z.string().default('INR'),
  planKey: z.enum(['starter', 'growth', 'enterprise']).default('growth'),
  manager: z
    .object({
      fullName: z.string().trim().min(2).max(120),
      email: z.string().email(),
      password: z.string().min(8).max(100).default('HotelStaff123!'),
    })
    .optional(),
  seedRooms: z.boolean().default(true),
  initialFloors: z.number().int().min(1).max(10).default(3),
  roomsPerFloor: z.number().int().min(1).max(20).default(4),
});

const assignStaffSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['owner', 'manager', 'frontdesk', 'housekeeping']).default('manager'),
  password: z.string().min(8).max(100).optional(),
});

const quickSeedRoomsSchema = z.object({
  floors: z.number().int().min(1).max(20).default(3),
  roomsPerFloor: z.number().int().min(1).max(30).default(4),
  startFloor: z.number().int().min(1).max(100).default(1),
  typeName: z.string().trim().min(2).max(80).default('Deluxe Room'),
  baseRate: z.number().min(0).default(4500),
  capacity: z.number().int().min(1).max(10).default(2),
});

@Controller('super-admin')
@Roles('owner')
export class SuperAdminController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      // 1. All properties for this organization
      const propertiesResult = await c.query(
        `select p.id, p.name, p.timezone, p.currency, p.is_default as "isDefault", p.status, p.created_at as "createdAt",
                ps.plan_key as "planKey",
                coalesce(u.total_staff, 0)::int as "totalStaff"
         from properties p
         left join property_subscriptions ps on ps.tenant_id = p.tenant_id and ps.property_id = p.id
         left join (
           select property_id, count(*)::int as total_staff
           from property_users
           group by property_id
         ) u on u.property_id = p.id
         where p.tenant_id = $1
         order by p.is_default desc, p.created_at asc`,
        [user.tenantId],
      );

      // Query room counts per property with explicit property context
      const roomCountsByProp: Record<string, { total: number; ready: number; occupied: number; cleaning: number }> = {};
      for (const prop of propertiesResult.rows) {
        await c.query("select set_config('app.property_id', $1, true)", [prop.id]);
        const counts = (
          await c.query(
            `select count(*)::int as total,
                    count(*) filter (where status = 'available')::int as ready,
                    count(*) filter (where status = 'occupied')::int as occupied,
                    count(*) filter (where status = 'cleaning')::int as cleaning
             from rooms`,
          )
        ).rows[0];
        roomCountsByProp[prop.id] = {
          total: counts?.total ?? 0,
          ready: counts?.ready ?? 0,
          occupied: counts?.occupied ?? 0,
          cleaning: counts?.cleaning ?? 0,
        };
      }

      // 2. Staff assigned to each property
      const staffResult = await c.query(
        `select pu.property_id as "propertyId", u.id as "userId", u.email, u.full_name as "fullName",
                pu.role, u.is_active as "isActive", pu.created_at as "assignedAt"
         from property_users pu
         join users u on u.tenant_id = pu.tenant_id and u.id = pu.user_id
         where pu.tenant_id = $1
         order by pu.role = 'owner' desc, pu.role = 'manager' desc, u.full_name asc`,
        [user.tenantId],
      );

      // 3. All users in tenant for assignment dropdowns
      const allUsersResult = await c.query(
        `select u.id, u.email, u.full_name as "fullName", u.role as "baseRole", u.is_active as "isActive",
                count(pu.property_id)::int as "assignedPropertiesCount"
         from users u
         left join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id
         where u.tenant_id = $1
         group by u.id, u.email, u.full_name, u.role, u.is_active
         order by u.full_name asc`,
        [user.tenantId],
      );

      // 4. Tenant metadata
      const tenantRow = (
        await c.query(`select id, slug, name, timezone, currency from tenants where id = $1`, [
          user.tenantId,
        ])
      ).rows[0];

      // Map staff and exact room counts by property
      const properties = propertiesResult.rows.map((prop) => {
        const counts = roomCountsByProp[prop.id] || { total: 0, ready: 0, occupied: 0, cleaning: 0 };
        return {
          ...prop,
          totalRooms: counts.total,
          readyRooms: counts.ready,
          occupiedRooms: counts.occupied,
          cleaningRooms: counts.cleaning,
          staff: staffResult.rows.filter((s) => s.propertyId === prop.id),
        };
      });

      // Portfolio Aggregates
      const totalRooms = properties.reduce((acc, p) => acc + p.totalRooms, 0);
      const totalOccupied = properties.reduce((acc, p) => acc + p.occupiedRooms, 0);
      const totalReady = properties.reduce((acc, p) => acc + p.readyRooms, 0);
      const totalStaff = allUsersResult.rows.length;

      return {
        tenant: tenantRow,
        activePropertyId: user.propertyId,
        properties,
        users: allUsersResult.rows,
        metrics: {
          totalHotels: properties.length,
          activeHotels: properties.filter((p) => p.status === 'active').length,
          totalRooms,
          totalOccupied,
          totalReady,
          totalStaff,
          occupancyRate: totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0,
        },
      };
    });
  }

  @Post('properties')
  async createProperty(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createHotelSchema)) body: z.infer<typeof createHotelSchema>,
  ) {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      // 1. Create Property
      const propResult = await c.query(
        `insert into properties (tenant_id, name, timezone, currency)
         values ($1, $2, $3, $4)
         returning id, name, timezone, currency, status, created_at as "createdAt"`,
        [user.tenantId, body.name, body.timezone, body.currency],
      );
      const property = propResult.rows[0];

      // Set property context for RLS policies
      await c.query("select set_config('app.property_id', $1, true)", [property.id]);

      // 2. Set Property Subscription Tier
      await c.query(
        `insert into property_subscriptions (tenant_id, property_id, plan_key, status)
         values ($1, $2, $3, 'active')`,
        [user.tenantId, property.id, body.planKey],
      );

      // 3. Super Admin is always added as 'owner' for governance and switching
      await c.query(
        `insert into property_users (tenant_id, property_id, user_id, role)
         values ($1, $2, $3, 'owner')
         on conflict do nothing`,
        [user.tenantId, property.id, user.id],
      );

      let createdManager = null;

      // 4. Provision Initial Manager if provided
      if (body.manager) {
        const mgrEmail = body.manager.email.toLowerCase().trim();
        const existingUser = (
          await c.query(
            `select id, email, full_name as "fullName" from users where tenant_id = $1 and email = $2`,
            [user.tenantId, mgrEmail],
          )
        ).rows[0];

        let managerUserId: string;

        if (existingUser) {
          managerUserId = existingUser.id;
          createdManager = {
            id: existingUser.id,
            email: existingUser.email,
            fullName: existingUser.fullName,
            isNew: false,
          };
        } else {
          const passHash = await hash(body.manager.password || 'HotelStaff123!', 10);
          const newUserRow = (
            await c.query(
              `insert into users (tenant_id, email, password_hash, full_name, role)
               values ($1, $2, $3, $4, 'manager')
               returning id, email, full_name as "fullName"`,
              [user.tenantId, mgrEmail, passHash, body.manager.fullName.trim()],
            )
          ).rows[0];

          managerUserId = newUserRow.id;
          createdManager = {
            id: newUserRow.id,
            email: newUserRow.email,
            fullName: newUserRow.fullName,
            temporaryPassword: body.manager.password || 'HotelStaff123!',
            isNew: true,
          };
        }

        await c.query(
          `insert into property_users (tenant_id, property_id, user_id, role)
           values ($1, $2, $3, 'manager')
           on conflict (tenant_id, property_id, user_id) do update set role = 'manager'`,
          [user.tenantId, property.id, managerUserId],
        );
      }

      // 5. Seed Starter Inventory (Floors & Rooms)
      let seededRoomsCount = 0;
      if (body.seedRooms) {
        // Set session property_id to allow property_isolation insert on room_types & rooms
        await c.query("select set_config('app.property_id', $1, true)", [property.id]);

        // Create 3 standard hospitality room types
        const type1 = (
          await c.query(
            `insert into room_types (tenant_id, property_id, name, base_rate, capacity, description)
             values ($1, $2, 'Deluxe Heritage Room', 4500, 2, 'Spacious AC room with king bed & luxury bath')
             returning id`,
            [user.tenantId, property.id],
          )
        ).rows[0];

        const type2 = (
          await c.query(
            `insert into room_types (tenant_id, property_id, name, base_rate, capacity, description)
             values ($1, $2, 'Executive Royal Suite', 8500, 3, 'Living room, king bed, city view & balcony')
             returning id`,
            [user.tenantId, property.id],
          )
        ).rows[0];

        const type3 = (
          await c.query(
            `insert into room_types (tenant_id, property_id, name, base_rate, capacity, description)
             values ($1, $2, 'Presidential Palace Suite', 18000, 4, 'Panoramic luxury suite with dining area & jacuzzi')
             returning id`,
            [user.tenantId, property.id],
          )
        ).rows[0];

        const roomTypes = [type1.id, type2.id, type3.id];
        const numFloors = Math.min(10, Math.max(1, body.initialFloors || 3));
        const numPerFloor = Math.min(20, Math.max(1, body.roomsPerFloor || 4));

        for (let f = 1; f <= numFloors; f++) {
          for (let r = 1; r <= numPerFloor; r++) {
            const roomNum = `${f}${r.toString().padStart(2, '0')}`;
            const typeIdx = (f - 1 + r - 1) % roomTypes.length;
            const selectedTypeId = roomTypes[typeIdx];

            await c.query(
              `insert into rooms (tenant_id, property_id, room_type_id, number, floor, status)
               values ($1, $2, $3, $4, $5, 'available')
               on conflict do nothing`,
              [user.tenantId, property.id, selectedTypeId, roomNum, f],
            );
            seededRoomsCount++;
          }
        }
      }

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'property.create',
        entity: 'property',
        entityId: property.id,
        meta: {
          name: property.name,
          plan: body.planKey,
          manager: createdManager?.email,
          seededRooms: seededRoomsCount,
        },
      });

      return {
        success: true,
        property: {
          ...property,
          planKey: body.planKey,
          totalRooms: seededRoomsCount,
          manager: createdManager,
        },
      };
    });
  }

  @Post('properties/:id/assign-staff')
  async assignStaff(
    @CurrentUser() user: AuthUser,
    @Param('id') propertyId: string,
    @Body(new ZodPipe(assignStaffSchema)) body: z.infer<typeof assignStaffSchema>,
  ) {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      // Verify property exists in tenant
      const prop = (
        await c.query(`select id, name from properties where tenant_id = $1 and id = $2`, [
          user.tenantId,
          propertyId,
        ])
      ).rows[0];
      if (!prop) {
        throw new BadRequestException({
          code: 'PROPERTY_NOT_FOUND',
          message: 'Target hotel property does not exist in your organization.',
        });
      }

      const email = body.email.toLowerCase().trim();
      let targetUserId = body.userId;
      let isNewAccount = false;
      let temporaryPassword = body.password;

      if (!targetUserId) {
        // Look up by email
        const existing = (
          await c.query(
            `select id, email, full_name as "fullName" from users where tenant_id = $1 and email = $2`,
            [user.tenantId, email],
          )
        ).rows[0];

        if (existing) {
          targetUserId = existing.id;
        } else {
          // Create new user account
          if (!body.fullName) {
            throw new BadRequestException({
              code: 'NAME_REQUIRED',
              message: 'Full name is required when creating a new staff account.',
            });
          }
          temporaryPassword = body.password || 'HotelStaff123!';
          const passHash = await hash(temporaryPassword, 10);

          const newUser = (
            await c.query(
              `insert into users (tenant_id, email, password_hash, full_name, role)
               values ($1, $2, $3, $4, $5)
               returning id, email, full_name as "fullName"`,
              [user.tenantId, email, passHash, body.fullName.trim(), body.role],
            )
          ).rows[0];

          targetUserId = newUser.id;
          isNewAccount = true;
        }
      }

      // Link to property
      await c.query(
        `insert into property_users (tenant_id, property_id, user_id, role)
         values ($1, $2, $3, $4)
         on conflict (tenant_id, property_id, user_id) do update set role = excluded.role`,
        [user.tenantId, propertyId, targetUserId, body.role],
      );

      const assignedUser = (
        await c.query(
          `select u.id, u.email, u.full_name as "fullName", pu.role
           from property_users pu
           join users u on u.tenant_id = pu.tenant_id and u.id = pu.user_id
           where pu.tenant_id = $1 and pu.property_id = $2 and pu.user_id = $3`,
          [user.tenantId, propertyId, targetUserId],
        )
      ).rows[0];

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'staff.assign',
        entity: 'property_users',
        entityId: targetUserId,
        meta: { propertyId, propertyName: prop.name, role: body.role, isNewAccount },
      });

      return {
        success: true,
        message: `${assignedUser.fullName} is now assigned as ${assignedUser.role} for ${prop.name}`,
        member: {
          ...assignedUser,
          isNewAccount,
          temporaryPassword: isNewAccount ? temporaryPassword : null,
        },
      };
    });
  }

  @Post('properties/:id/seed-inventory')
  async seedInventory(
    @CurrentUser() user: AuthUser,
    @Param('id') propertyId: string,
    @Body(new ZodPipe(quickSeedRoomsSchema)) body: z.infer<typeof quickSeedRoomsSchema>,
  ) {
    return this.db.withTenant(user.tenantId, propertyId, async (c) => {
      // 1. Ensure room type exists or create it
      let typeRow = (
        await c.query(
          `select id from room_types where tenant_id = $1 and property_id = $2 and name = $3`,
          [user.tenantId, propertyId, body.typeName],
        )
      ).rows[0];

      if (!typeRow) {
        typeRow = (
          await c.query(
            `insert into room_types (tenant_id, property_id, name, base_rate, capacity)
             values ($1, $2, $3, $4, $5)
             returning id`,
            [user.tenantId, propertyId, body.typeName, body.baseRate, body.capacity],
          )
        ).rows[0];
      }

      let createdCount = 0;
      for (let f = body.startFloor; f < body.startFloor + body.floors; f++) {
        for (let r = 1; r <= body.roomsPerFloor; r++) {
          const roomNum = `${f}${r.toString().padStart(2, '0')}`;
          const res = await c.query(
            `insert into rooms (tenant_id, property_id, room_type_id, number, floor, status)
             values ($1, $2, $3, $4, $5, 'available')
             on conflict (tenant_id, property_id, number) do nothing
             returning id`,
            [user.tenantId, propertyId, typeRow.id, roomNum, f],
          );
          if (res.rowCount && res.rowCount > 0) createdCount++;
        }
      }

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'rooms.batch_create',
        entity: 'property',
        entityId: propertyId,
        meta: { floors: body.floors, roomsPerFloor: body.roomsPerFloor, createdCount },
      });

      return {
        success: true,
        createdCount,
        message: `Successfully provisioned ${createdCount} rooms across ${body.floors} floors.`,
      };
    });
  }

  @Patch('properties/:id/status')
  async togglePropertyStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') propertyId: string,
    @Body(new ZodPipe(z.object({ status: z.enum(['active', 'suspended']) })))
    body: { status: 'active' | 'suspended' },
  ) {
    return this.db.withTenant(user.tenantId, null, async (c) => {
      const res = await c.query(
        `update properties set status = $3
         where tenant_id = $1 and id = $2 and is_default = false
         returning id, name, status`,
        [user.tenantId, propertyId, body.status],
      );
      if (res.rowCount === 0) {
        throw new ConflictException({
          code: 'CANNOT_MODIFY',
          message: 'Default property cannot be suspended, or property was not found.',
        });
      }
      return { success: true, property: res.rows[0] };
    });
  }
}
