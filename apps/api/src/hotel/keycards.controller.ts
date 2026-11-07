import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  FEATURES,
  PERMISSIONS,
  updateRoomKeyStatusSchema,
  encodeKeycardSchema,
  type UpdateRoomKeyStatusInput,
  type EncodeKeycardInput,
} from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { RequireFeature } from '../entitlements/require-feature';
import { DbService } from '../db/db.service';

@Controller('hotel/keycards')
@RequireFeature(FEATURES.HOTEL_KEYCARDS)
export class KeycardsController {
  constructor(private readonly db: DbService) {}

  @Get('keys')
  @RequirePermission(PERMISSIONS.KEYCARD_MANAGE)
  async getKeys(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select k.id, k.room_id as "roomId", k.key_number as "keyNumber",
                k.key_type as "keyType", k.card_uid as "cardUid", k.status,
                k.issued_to_reservation_id as "issuedToReservationId",
                k.issued_to_guest_name as "issuedToGuestName",
                k.issued_at as "issuedAt", k.returned_at as "returnedAt",
                k.notes,
                r.number as "roomNumber", r.floor,
                rt.name as "roomTypeName",
                res.check_in as "guestCheckIn", res.check_out as "guestCheckOut"
         from room_keys k
         join rooms r on r.id = k.room_id
         left join room_types rt on rt.id = r.room_type_id
         left join reservations res on res.id = k.issued_to_reservation_id
         where k.property_id = $1
         order by r.number asc, k.key_type asc`,
        [user.propertyId]
      );
      return res.rows;
    });
  }

  @Patch('keys/:id/status')
  @RequirePermission(PERMISSIONS.KEYCARD_MANAGE)
  async updateKeyStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = updateRoomKeyStatusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const input: UpdateRoomKeyStatusInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      if (input.status === 'in_slot') {
        const res = await c.query(
          `update room_keys
           set status = 'in_slot',
               returned_at = now(),
               issued_to_reservation_id = null,
               issued_to_guest_name = null,
               notes = coalesce($1, notes),
               updated_at = now()
           where id = $2 and property_id = $3
           returning id, key_number as "keyNumber", status`,
          [input.notes ?? null, id, user.propertyId]
        );
        if (!res.rows[0]) throw new NotFoundException('Key record not found');
        return res.rows[0];
      }

      const res = await c.query(
        `update room_keys
         set status = $1,
             issued_to_reservation_id = case when $1 = 'issued_to_guest' then coalesce($2, issued_to_reservation_id) else null end,
             issued_to_guest_name = case when $1 = 'issued_to_guest' then coalesce($3, issued_to_guest_name) else null end,
             notes = coalesce($4, notes),
             issued_at = case when $1 = 'issued_to_guest' then now() else issued_at end,
             returned_at = case when $1 = 'in_slot' then now() else returned_at end,
             updated_at = now()
         where id = $5 and property_id = $6
         returning id, key_number as "keyNumber", status`,
        [input.status, input.issuedToReservationId ?? null, input.issuedToGuestName ?? null, input.notes ?? null, id, user.propertyId]
      );

      if (!res.rows[0]) throw new NotFoundException('Key record not found');
      return res.rows[0];
    });
  }

  @Post('keys/:id/encode')
  @RequirePermission(PERMISSIONS.KEYCARD_MANAGE)
  async encodeKeycard(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = encodeKeycardSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ issues: parsed.error.flatten() });
    const input: EncodeKeycardInput = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Generate simulated NFC / MIFARE Sector 1 data payload
      const sectorPayload = `ROOM=${input.roomNumber}|GUEST=${encodeURIComponent(input.guestName)}|EXP=${new Date(input.checkOut).getTime()}|PROP=${user.propertyId}`;
      const cardUid = input.cardUid || `04:${Math.random().toString(16).substring(2, 10).toUpperCase()}`;

      await c.query(
        `update room_keys
         set status = 'issued_to_guest',
             card_uid = $1,
             issued_to_guest_name = $2,
             issued_at = now(),
             notes = $3,
             updated_at = now()
         where id = $4 and property_id = $5`,
        [cardUid, input.guestName, `Encoded via ${input.protocol.toUpperCase()}`, id, user.propertyId]
      );

      return {
        success: true,
        protocol: input.protocol,
        cardUid,
        sectorPayload,
        roomNumber: input.roomNumber,
        guestName: input.guestName,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        encodedAt: new Date().toISOString(),
      };
    });
  }
}
