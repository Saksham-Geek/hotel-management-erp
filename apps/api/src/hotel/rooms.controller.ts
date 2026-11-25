import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  CreateRoomInput, CreateRoomTypeInput, FEATURES, PERMISSIONS, createRoomSchema, createRoomTypeSchema, updateRoomSchema, updateRoomTypeSchema, updateRoomStatusSchema, RoomStatus, UpdateRoomInput, UpdateRoomTypeInput,
} from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { hasPermission } from '../common/permissions';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('hotel')
@RequireFeature(FEATURES.HOTEL_ROOMS)
export class RoomsController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get(['room-types', 'rooms/types'])
  roomTypes(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (await c.query(`select id, name, base_rate::float8 as "baseRate", hourly_rate::float8 as "hourlyRate", capacity, description from room_types order by base_rate`)).rows,
    );
  }

  @Post('room-types')
  @RequirePermission(PERMISSIONS.ROOM_CONFIGURATION_WRITE)
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
  @RequirePermission(PERMISSIONS.ROOM_CONFIGURATION_WRITE)
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
          `select r.id, r.number, r.floor, r.status, coalesce(r.lock_type, 'both') as "lockType", r.room_type_id as "roomTypeId", rt.name as "roomType", coalesce(r.hourly_rate, rt.hourly_rate, rt.base_rate / 24.0)::float8 as "hourlyRate", r.hourly_rate::float8 as "hourlyRateOverride", coalesce(r.base_rate, rt.base_rate)::float8 as "baseRate", r.base_rate::float8 as "baseRateOverride"
           from rooms r join room_types rt on rt.id = r.room_type_id order by r.floor, r.number`,
        )
      ).rows,
    );
  }

  @Post('rooms')
  @RequirePermission(PERMISSIONS.ROOM_CONFIGURATION_WRITE)
  createRoom(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createRoomSchema)) b: CreateRoomInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const countRes = await c.query(`select count(*)::int as count from rooms where tenant_id = $1 and property_id = $2`, [user.tenantId, user.propertyId]);
      const currentRooms = Number(countRes.rows[0]?.count ?? 0);
      await this.entitlements.assertWithinLimit(user.tenantId, user.propertyId, FEATURES.HOTEL_ROOMS, currentRooms);

      const row = (
        await c.query(
          `insert into rooms (tenant_id, property_id, room_type_id, number, floor, base_rate, hourly_rate, lock_type) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, number, floor, status, lock_type as "lockType"`,
          [user.tenantId, user.propertyId, b.roomTypeId, b.number, b.floor, b.baseRate ?? null, b.hourlyRate ?? null, b.lockType ?? 'both'],
        )
      ).rows[0];
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room.create', entity: 'room', entityId: row.id });
      return row;
    });
  }

  @Post('rooms/bulk-import')
  @RequirePermission(PERMISSIONS.ROOM_CONFIGURATION_WRITE)
  async bulkImportRooms(
    @CurrentUser() user: AuthUser,
    @Body() body: { rooms: Array<{ number: string | number; floor?: number; roomType?: string; baseRate?: number; hourlyRate?: number }> },
  ) {
    if (!body?.rooms || !Array.isArray(body.rooms) || body.rooms.length === 0) {
      throw new BadRequestException('Invalid payload. Expected a non-empty array of rooms.');
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // 1. Fetch room types
      const rtRes = await c.query(
        `select id, lower(trim(name)) as norm_name, name from room_types where tenant_id = $1`,
        [user.tenantId]
      );
      const rtMap = new Map<string, string>();
      for (const rt of rtRes.rows) {
        rtMap.set(rt.norm_name, rt.id);
      }

      let createdRoomTypes = 0;
      for (const r of body.rooms) {
        const typeName = (r.roomType || 'Standard').trim();
        const norm = typeName.toLowerCase();
        if (!rtMap.has(norm)) {
          const insertRt = await c.query(
            `insert into room_types (tenant_id, property_id, name, base_rate, hourly_rate, capacity, description)
             values ($1, $2, $3, $4, $5, 2, 'Auto-provisioned via Bulk CSV Import')
             returning id`,
            [user.tenantId, user.propertyId, typeName, r.baseRate || 2500, r.hourlyRate || 350]
          );
          const newId = insertRt.rows[0].id;
          rtMap.set(norm, newId);
          createdRoomTypes++;
        }
      }

      // 2. Limit check
      const countRes = await c.query(
        `select count(*)::int as count from rooms where tenant_id = $1 and property_id = $2`,
        [user.tenantId, user.propertyId]
      );
      const currentRooms = Number(countRes.rows[0]?.count ?? 0);
      await this.entitlements.assertWithinLimit(user.tenantId, user.propertyId, FEATURES.HOTEL_ROOMS, currentRooms + body.rooms.length);

      // 3. Upsert rooms
      const imported: any[] = [];
      for (const r of body.rooms) {
        const roomNum = String(r.number).trim();
        if (!roomNum) continue;
        const norm = (r.roomType || 'Standard').trim().toLowerCase();
        const rtId = rtMap.get(norm)!;
        const floorNum = r.floor != null ? Number(r.floor) : (parseInt(roomNum.charAt(0), 10) || 1);
        const baseRate = r.baseRate != null ? Number(r.baseRate) : null;
        const hourlyRate = r.hourlyRate != null ? Number(r.hourlyRate) : null;

        const row = (
          await c.query(
            `insert into rooms (tenant_id, property_id, room_type_id, number, floor, base_rate, hourly_rate, status)
             values ($1, $2, $3, $4, $5, $6, $7, 'available')
             on conflict (tenant_id, property_id, number)
             do update set
               room_type_id = excluded.room_type_id,
               floor = excluded.floor,
               base_rate = coalesce(excluded.base_rate, rooms.base_rate),
               hourly_rate = coalesce(excluded.hourly_rate, rooms.hourly_rate)
             returning id, number, floor, status`,
            [user.tenantId, user.propertyId, rtId, roomNum, floorNum, baseRate, hourlyRate]
          )
        ).rows[0];

        imported.push(row);
      }

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'room.bulk_import',
        entity: 'room',
        entityId: user.propertyId,
        meta: { count: imported.length, createdRoomTypes },
      });

      return {
        success: true,
        count: imported.length,
        createdRoomTypes,
        rooms: imported,
        message: `Successfully imported ${imported.length} rooms (${createdRoomTypes} new room categories provisioned).`,
      };
    });
  }

  @Patch('rooms/:id')
  @RequirePermission(PERMISSIONS.ROOM_CONFIGURATION_WRITE)
  updateRoom(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateRoomSchema)) b: UpdateRoomInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (await c.query(
        `update rooms set
           room_type_id = coalesce($3, room_type_id),
           number = coalesce($4, number),
           floor = coalesce($5, floor),
           base_rate = case when $6 then $7::numeric else base_rate end,
           hourly_rate = case when $8 then $9::numeric else hourly_rate end,
           lock_type = coalesce($10, lock_type)
         where id = $1 and tenant_id = $2
         returning id, number, floor, status, lock_type as "lockType", room_type_id as "roomTypeId", base_rate::float8 as "baseRateOverride", hourly_rate::float8 as "hourlyRateOverride"`,
        [id, user.tenantId, b.roomTypeId ?? null, b.number ?? null, b.floor ?? null,
          b.baseRate !== undefined, b.baseRate ?? null,
          b.hourlyRate !== undefined, b.hourlyRate ?? null,
          b.lockType ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Room not found' });
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'room.update', entity: 'room', entityId: id });
      return row;
    });
  }

  @Patch('rooms/:id/status')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateRoomStatusSchema)) b: { status: RoomStatus },
  ) {
    const canManageRooms = hasPermission(user.role, PERMISSIONS.ROOM_MAINTENANCE_MANAGE);
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

  // -------------------------------------------------------------
  // Housekeeping Turnaround & Inspection Logs
  // -------------------------------------------------------------
  @Get('housekeeping/logs')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async getHousekeepingLogs(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rows = (
        await c.query(
          `SELECT l.id, l.room_id AS "roomId", r.number AS "roomNumber",
                  l.attendant_name AS "attendantName", l.from_status AS "fromStatus",
                  l.to_status AS "toStatus", l.inspection_notes AS "inspectionNotes",
                  l.maintenance_issue AS "maintenanceIssue", l.logged_at AS "loggedAt"
           FROM housekeeping_logs l
           JOIN rooms r ON r.id = l.room_id
           WHERE l.property_id = $1
           ORDER BY l.logged_at DESC
           LIMIT 50`,
          [user.propertyId],
        )
      ).rows;
      return rows;
    });
  }

  @Post('housekeeping/turnaround')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async logHousekeepingTurnaround(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      roomId: string;
      toStatus: string;
      attendantName?: string;
      inspectionNotes?: string;
      maintenanceIssue?: string;
    },
  ) {
    if (!body.roomId || !body.toStatus) {
      throw new BadRequestException('Room and target status are required');
    }
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const room = (await c.query(`SELECT status, number FROM rooms WHERE id = $1 AND property_id = $2`, [body.roomId, user.propertyId])).rows[0];
      if (!room) throw new NotFoundException('Room not found');

      const fromStatus = room.status;
      const attendantName = body.attendantName?.trim() || user.id;

      await c.query(
        `INSERT INTO housekeeping_logs (tenant_id, property_id, room_id, attendant_name, from_status, to_status, inspection_notes, maintenance_issue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.tenantId, user.propertyId, body.roomId, attendantName, fromStatus, body.toStatus, body.inspectionNotes || null, body.maintenanceIssue || null],
      );

      await c.query(`UPDATE rooms SET status = $1 WHERE id = $2 AND property_id = $3`, [body.toStatus, body.roomId, user.propertyId]);

      return { success: true, roomNumber: room.number, fromStatus, toStatus: body.toStatus };
    });
  }

  // -------------------------------------------------------------
  // Lost & Found Register for Housekeeping
  // -------------------------------------------------------------
  @Get('housekeeping/lost-and-found')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async getLostAndFound(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rows = (
        await c.query(
          `SELECT id, room_id AS "roomId", room_number AS "roomNumber", item_name AS "itemName",
                  description, category, storage_location AS "storageLocation", status,
                  finder_name AS "finderName", guest_name AS "guestName", guest_contact AS "guestContact",
                  found_at AS "foundAt", claimed_at AS "claimedAt"
           FROM lost_and_found_items
           WHERE property_id = $1
           ORDER BY found_at DESC
           LIMIT 100`,
          [user.propertyId],
        )
      ).rows;
      return rows;
    });
  }

  @Post('housekeeping/lost-and-found')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async createLostAndFoundItem(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      roomNumber: string;
      itemName: string;
      category?: string;
      description?: string;
      storageLocation?: string;
      finderName?: string;
      guestName?: string;
      guestContact?: string;
    },
  ) {
    if (!body.roomNumber || !body.itemName) {
      throw new BadRequestException('Room number and item name are required');
    }
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `INSERT INTO lost_and_found_items (
             tenant_id, property_id, room_number, item_name, description, category,
             storage_location, finder_name, guest_name, guest_contact
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, room_number AS "roomNumber", item_name AS "itemName"`,
          [
            user.tenantId,
            user.propertyId,
            body.roomNumber,
            body.itemName,
            body.description || null,
            body.category || 'electronics',
            body.storageLocation || 'Housekeeping Locker A',
            body.finderName || 'Floor Attendant',
            body.guestName || null,
            body.guestContact || null,
          ],
        )
      ).rows[0];
      return row;
    });
  }

  @Post('housekeeping/lost-and-found/:id/claim')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async claimLostAndFoundItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { guestName: string; guestContact?: string },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      await c.query(
        `UPDATE lost_and_found_items
         SET status = 'claimed',
             guest_name = coalesce($3, guest_name),
             guest_contact = coalesce($4, guest_contact),
             claimed_at = now()
         WHERE id = $1 AND property_id = $2`,
        [id, user.propertyId, body.guestName || null, body.guestContact || null],
      );
      return { success: true, id };
    });
  }

  @Post(':id/toggle-dnd')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async toggleRoomDnd(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `UPDATE rooms SET dnd_status = NOT coalesce(dnd_status, false)
           WHERE id = $1 AND property_id = $2
           RETURNING id, number, dnd_status AS "dndStatus"`,
          [id, user.propertyId],
        )
      ).rows[0];
      if (!row) throw new NotFoundException('Room not found');
      return row;
    });
  }

  // -------------------------------------------------------------
  // Minibar Catalog & Folio Billing
  // -------------------------------------------------------------
  @Get('minibar/catalog')
  @RequirePermission(PERMISSIONS.ROOM_READ)
  async getMinibarCatalog(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rows = (
        await c.query(
          `SELECT id, item_name AS "itemName", category, unit_price::float8 AS "unitPrice",
                  is_active AS "isActive", created_at AS "createdAt"
           FROM minibar_items
           WHERE property_id = $1
           ORDER BY category ASC, item_name ASC`,
          [user.propertyId],
        )
      ).rows;
      return rows;
    });
  }

  @Post('minibar/catalog')
  @RequirePermission(PERMISSIONS.ROOM_MAINTENANCE_MANAGE)
  async addMinibarItem(
    @CurrentUser() user: AuthUser,
    @Body() body: { itemName: string; category: string; unitPrice: number },
  ) {
    if (!body.itemName || !body.unitPrice) throw new BadRequestException('Item name and unit price are required');
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `INSERT INTO minibar_items (tenant_id, property_id, item_name, category, unit_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, item_name AS "itemName", category, unit_price::float8 AS "unitPrice"`,
          [user.tenantId, user.propertyId, body.itemName.trim(), body.category || 'BEVERAGE', body.unitPrice],
        )
      ).rows[0];
      return row;
    });
  }

  @Patch('minibar/catalog/:id')
  @RequirePermission(PERMISSIONS.ROOM_MAINTENANCE_MANAGE)
  async updateMinibarItem(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { itemName?: string; category?: string; unitPrice?: number; isActive?: boolean },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `UPDATE minibar_items
           SET item_name = coalesce($3, item_name),
               category = coalesce($4, category),
               unit_price = coalesce($5, unit_price),
               is_active = coalesce($6, is_active)
           WHERE id = $1 AND property_id = $2
           RETURNING id, item_name AS "itemName", category, unit_price::float8 AS "unitPrice", is_active AS "isActive"`,
          [id, user.propertyId, body.itemName?.trim() || null, body.category || null, body.unitPrice, body.isActive],
        )
      ).rows[0];
      if (!row) throw new NotFoundException('Minibar item not found');
      return row;
    });
  }

  @Delete('minibar/catalog/:id')
  @RequirePermission(PERMISSIONS.ROOM_MAINTENANCE_MANAGE)
  async deleteMinibarItem(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      await c.query(`DELETE FROM minibar_items WHERE id = $1 AND property_id = $2`, [id, user.propertyId]);
      return { success: true };
    });
  }

  @Post('minibar/post-charge')
  @RequirePermission(PERMISSIONS.ROOM_STATUS_UPDATE)
  async postMinibarCharge(
    @CurrentUser() user: AuthUser,
    @Body() body: { roomId: string; minibarItemId: string; quantity: number },
  ) {
    if (!body.roomId || !body.minibarItemId || !body.quantity || body.quantity <= 0) {
      throw new BadRequestException('Room, minibar item, and quantity are required');
    }
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Find active checked-in reservation for room
      const res = (
        await c.query(
          `SELECT r.id, f.id AS "folioId"
           FROM reservations r
           LEFT JOIN reservation_folios f ON f.reservation_id = r.id
           WHERE r.room_id = $1 AND r.property_id = $2 AND r.status = 'checked_in'`,
          [body.roomId, user.propertyId],
        )
      ).rows[0];
      if (!res) throw new BadRequestException('No active checked-in guest found in this room to bill');

      const item = (
        await c.query(`SELECT item_name, unit_price FROM minibar_items WHERE id = $1 AND property_id = $2`, [
          body.minibarItemId,
          user.propertyId,
        ])
      ).rows[0];
      if (!item) throw new NotFoundException('Minibar item not found');

      let folioId = res.folioId;
      if (!folioId) {
        const nf = (
          await c.query(
            `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, subtotal, tax_total, total)
             VALUES ($1, $2, $3, 0, 0, 0) RETURNING id`,
            [user.tenantId, user.propertyId, res.id],
          )
        ).rows[0];
        folioId = nf.id;
      }

      const unitPrice = parseFloat(item.unit_price);
      const lineTotal = unitPrice * body.quantity;
      const gstRate = 18.0; // 18% on sundry snacks/beverages
      const cgst = (lineTotal * 0.09);
      const sgst = (lineTotal * 0.09);

      await c.query(
        `INSERT INTO folio_items (
           tenant_id, folio_id, description, quantity, unit_price, tax_rate, line_total,
           tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'FOOD_BEVERAGE', '996331', $8, $9, 0)`,
        [
          user.tenantId,
          folioId,
          `Minibar: ${body.quantity}x ${item.item_name}`,
          body.quantity,
          unitPrice,
          gstRate,
          lineTotal + cgst + sgst,
          cgst,
          sgst,
        ],
      );

      // Update folio total
      await c.query(
        `UPDATE reservation_folios
         SET subtotal = subtotal + $2,
             tax_total = tax_total + $3 + $4,
             total = total + $2 + $3 + $4,
             updated_at = now()
         WHERE id = $1`,
        [folioId, lineTotal, cgst, sgst],
      );

      return { success: true, item: item.item_name, quantity: body.quantity, totalBilled: lineTotal + cgst + sgst };
    });
  }

  // -------------------------------------------------------------
  // Dynamic Pricing Rules (RMS Engine)
  // -------------------------------------------------------------
  @Get('pricing-rules')
  @RequirePermission(PERMISSIONS.ROOM_READ)
  async getPricingRules(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rows = (
        await c.query(
          `SELECT id, rule_name AS "ruleName", rule_type AS "ruleType",
                  condition_min_occupancy::float8 AS "conditionMinOccupancy",
                  condition_max_occupancy::float8 AS "conditionMaxOccupancy",
                  price_multiplier::float8 AS "priceMultiplier",
                  is_active AS "isActive", created_at AS "createdAt"
           FROM dynamic_pricing_rules
           WHERE property_id = $1
           ORDER BY created_at ASC`,
          [user.propertyId],
        )
      ).rows;
      return rows;
    });
  }

  @Post('pricing-rules')
  @RequirePermission(PERMISSIONS.ROOM_MAINTENANCE_MANAGE)
  async createPricingRule(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      ruleName: string;
      ruleType: string;
      conditionMinOccupancy?: number;
      conditionMaxOccupancy?: number;
      priceMultiplier: number;
    },
  ) {
    if (!body.ruleName || !body.priceMultiplier) {
      throw new BadRequestException('Rule name and price multiplier are required');
    }
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `INSERT INTO dynamic_pricing_rules (
             tenant_id, property_id, rule_name, rule_type, condition_min_occupancy, condition_max_occupancy, price_multiplier
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, rule_name AS "ruleName", rule_type AS "ruleType",
                     condition_min_occupancy::float8 AS "conditionMinOccupancy",
                     condition_max_occupancy::float8 AS "conditionMaxOccupancy",
                     price_multiplier::float8 AS "priceMultiplier",
                     is_active AS "isActive"`,
          [
            user.tenantId,
            user.propertyId,
            body.ruleName.trim(),
            body.ruleType || 'OCCUPANCY_SURGE',
            body.conditionMinOccupancy ?? null,
            body.conditionMaxOccupancy ?? null,
            body.priceMultiplier,
          ],
        )
      ).rows[0];
      return row;
    });
  }

  @Patch('pricing-rules/:id')
  @RequirePermission(PERMISSIONS.ROOM_MAINTENANCE_MANAGE)
  async updatePricingRule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      ruleName?: string;
      priceMultiplier?: number;
      conditionMinOccupancy?: number;
      conditionMaxOccupancy?: number;
      isActive?: boolean;
    },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `UPDATE dynamic_pricing_rules
           SET rule_name = coalesce($3, rule_name),
               price_multiplier = coalesce($4, price_multiplier),
               condition_min_occupancy = coalesce($5, condition_min_occupancy),
               condition_max_occupancy = coalesce($6, condition_max_occupancy),
               is_active = coalesce($7, is_active)
           WHERE id = $1 AND property_id = $2
           RETURNING id, rule_name AS "ruleName", rule_type AS "ruleType",
                     price_multiplier::float8 AS "priceMultiplier",
                     is_active AS "isActive"`,
          [id, user.propertyId, body.ruleName?.trim() || null, body.priceMultiplier, body.conditionMinOccupancy, body.conditionMaxOccupancy, body.isActive],
        )
      ).rows[0];
      if (!row) throw new NotFoundException('Pricing rule not found');
      return row;
    });
  }

  @Delete('pricing-rules/:id')
  @RequirePermission(PERMISSIONS.ROOM_MAINTENANCE_MANAGE)
  async deletePricingRule(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      await c.query(`DELETE FROM dynamic_pricing_rules WHERE id = $1 AND property_id = $2`, [id, user.propertyId]);
      return { success: true };
    });
  }

  @Post('pricing-rules/calculate')
  @RequirePermission(PERMISSIONS.ROOM_READ)
  async calculateDynamicRate(
    @CurrentUser() user: AuthUser,
    @Body() body: { baseRate: number; checkInDate?: string },
  ) {
    const baseRate = body.baseRate || 1000;
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Calculate current occupancy
      const total = Number((await c.query(`SELECT count(*)::int AS n FROM rooms WHERE property_id = $1`, [user.propertyId])).rows[0]?.n || 0);
      const occupied = Number(
        (await c.query(`SELECT count(*)::int AS n FROM reservations WHERE property_id = $1 AND status = 'checked_in'`, [user.propertyId])).rows[0]?.n || 0,
      );
      const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

      // Check active rules
      const rules = (
        await c.query(
          `SELECT rule_name AS "ruleName", rule_type AS "ruleType",
                  condition_min_occupancy::float8 AS "minOcc",
                  condition_max_occupancy::float8 AS "maxOcc",
                  price_multiplier::float8 AS "multiplier"
           FROM dynamic_pricing_rules
           WHERE property_id = $1 AND is_active = true`,
          [user.propertyId],
        )
      ).rows;

      let appliedMultiplier = 1.0;
      let matchedRule: string | null = null;

      for (const r of rules) {
        if (r.ruleType === 'OCCUPANCY_SURGE' && r.minOcc !== null && occupancyRate >= r.minOcc) {
          appliedMultiplier = r.multiplier;
          matchedRule = r.ruleName;
          break;
        } else if (r.ruleType === 'LAST_MINUTE_DISCOUNT' && r.maxOcc !== null && occupancyRate <= r.maxOcc) {
          appliedMultiplier = r.multiplier;
          matchedRule = r.ruleName;
          break;
        }
      }

      const calculatedRate = Math.round(baseRate * appliedMultiplier);
      return {
        baseRate,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        appliedMultiplier,
        matchedRule,
        calculatedRate,
      };
    });
  }
}
