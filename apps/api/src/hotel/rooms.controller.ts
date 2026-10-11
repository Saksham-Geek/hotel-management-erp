import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  CreateRoomInput, CreateRoomTypeInput, FEATURES, createRoomSchema, createRoomTypeSchema, updateRoomSchema, updateRoomTypeSchema, updateRoomStatusSchema, RoomStatus, UpdateRoomInput, UpdateRoomTypeInput,
} from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('hotel')
@RequireFeature(FEATURES.HOTEL_ROOMS)
export class RoomsController {
  constructor(private readonly db: DbService, private readonly audit: AuditService) {}

  @Get('room-types')
  roomTypes(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (await c.query(`select id, name, base_rate::float8 as "baseRate", hourly_rate::float8 as "hourlyRate", capacity, description from room_types order by base_rate`)).rows,
    );
  }

  @Post('room-types')
  @Roles('owner', 'manager')
  createRoomType(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createRoomTypeSchema)) b: CreateRoomTypeInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `insert into room_types (tenant_id, name, base_rate, hourly_rate, capacity, description) values ($1,$2,$3,$4,$5,$6)
           returning id, name, base_rate::float8 as "baseRate", hourly_rate::float8 as "hourlyRate", capacity, description`,
          [user.tenantId, b.name, b.baseRate, b.hourlyRate ?? null, b.capacity, b.description ?? null],
        )
      ).rows[0];
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room_type.create', entity: 'room_type', entityId: row.id });
      return row;
    });
  }

  @Patch('room-types/:id')
  @Roles('owner', 'manager')
  updateRoomType(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateRoomTypeSchema)) b: UpdateRoomTypeInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (await c.query(
        `update room_types set
           name = coalesce($3, name),
           base_rate = coalesce($4, base_rate),
           hourly_rate = case when $5 then $6::numeric else hourly_rate end,
           capacity = coalesce($7, capacity),
           description = case when $8 then $9::text else description end
         where id = $1 and tenant_id = $2
         returning id, name, base_rate::float8 as "baseRate", hourly_rate::float8 as "hourlyRate", capacity, description`,
        [id, user.tenantId, b.name ?? null, b.baseRate ?? null,
          b.hourlyRate !== undefined, b.hourlyRate ?? null, b.capacity ?? null,
          b.description !== undefined, b.description ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Room type not found' });
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room_type.update', entity: 'room_type', entityId: id });
      return row;
    });
  }

  @Get('rooms')
  rooms(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (
        await c.query(
          `select r.id, r.number, r.floor, r.status, r.room_type_id as "roomTypeId", rt.name as "roomType", coalesce(r.hourly_rate, rt.hourly_rate, rt.base_rate / 24.0)::float8 as "hourlyRate", r.hourly_rate::float8 as "hourlyRateOverride", coalesce(r.base_rate, rt.base_rate)::float8 as "baseRate", r.base_rate::float8 as "baseRateOverride"
           from rooms r join room_types rt on rt.id = r.room_type_id order by r.floor, r.number`,
        )
      ).rows,
    );
  }

  @Post('rooms')
  @Roles('owner', 'manager')
  createRoom(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createRoomSchema)) b: CreateRoomInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `insert into rooms (tenant_id, room_type_id, number, floor, base_rate, hourly_rate) values ($1,$2,$3,$4,$5,$6) returning id, number, floor, status`,
          [user.tenantId, b.roomTypeId, b.number, b.floor, b.baseRate ?? null, b.hourlyRate ?? null],
        )
      ).rows[0];
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room.create', entity: 'room', entityId: row.id });
      return row;
    });
  }

  @Patch('rooms/:id')
  @Roles('owner', 'manager')
  updateRoom(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateRoomSchema)) b: UpdateRoomInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (await c.query(
        `update rooms set
           room_type_id = coalesce($3, room_type_id),
           number = coalesce($4, number),
           floor = coalesce($5, floor),
           base_rate = case when $6 then $7::numeric else base_rate end,
           hourly_rate = case when $8 then $9::numeric else hourly_rate end
         where id = $1 and tenant_id = $2
         returning id, number, floor, status, room_type_id as "roomTypeId", base_rate::float8 as "baseRateOverride", hourly_rate::float8 as "hourlyRateOverride"`,
        [id, user.tenantId, b.roomTypeId ?? null, b.number ?? null, b.floor ?? null,
          b.baseRate !== undefined, b.baseRate ?? null,
          b.hourlyRate !== undefined, b.hourlyRate ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Room not found' });
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room.update', entity: 'room', entityId: id });
      return row;
    });
  }

  @Patch('rooms/:id/status')
  @Roles('owner', 'manager', 'frontdesk', 'housekeeping')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateRoomStatusSchema)) b: { status: RoomStatus },
  ) {
    const canManageRooms = user.role === 'owner' || user.role === 'manager';
    if (b.status === 'occupied') throw new BadRequestException({ code: 'LIFECYCLE_MANAGED', message: 'Room occupancy is controlled by reservation check-in/check-out.' });
    if (user.role === 'housekeeping' && !['available', 'cleaning'].includes(b.status)) throw new ForbiddenException({ code: 'ROLE_FORBIDDEN', message: 'Housekeeping can only mark rooms as cleaning or ready.' });
    if (b.status === 'maintenance' && !canManageRooms) throw new ForbiddenException({ code: 'ROLE_FORBIDDEN', message: 'Only an owner or manager can mark a room for maintenance.' });
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const current = (await c.query(`select status from rooms where id = $1 for update`, [id])).rows[0];
      if (!current) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Room not found' });
      if (current.status === 'maintenance' && !canManageRooms) throw new ForbiddenException({ code: 'ROLE_FORBIDDEN', message: 'Only an owner or manager can change a room out of maintenance.' });
      const active = (await c.query(`select 1 from reservations where room_id = $1 and status = 'checked_in' limit 1`, [id])).rowCount;
      if (active) throw new BadRequestException({ code: 'ROOM_IN_HOUSE', message: 'This room has an active checked-in stay.' });
      const row = (await c.query(`update rooms set status = $2 where id = $1 returning id, number, status`, [id, b.status])).rows[0];
      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Room not found' });
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room.status', entity: 'room', entityId: id, meta: { status: b.status } });
      return row;
    });
  }
}
