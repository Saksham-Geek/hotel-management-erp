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
                res.check_in as "guestCheckIn", res.check_out as "guestCheckOut",
                (select coalesce(json_agg(json_build_object(
                  'id', l.id,
                  'action', l.action,
                  'recipientName', l.recipient_name,
                  'recipientType', l.recipient_type,
                  'notes', l.notes,
                  'loggedAt', l.logged_at::text
                ) order by l.logged_at desc), '[]'::json)
                 from room_key_logs l
                 where l.key_id = k.id) as "custodyLogs"
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
      // 1. Fetch key and associated room
      const keyRes = await c.query(
        `select k.id, k.room_id as "roomId", r.number as "roomNumber",
                k.issued_to_reservation_id as "currentResId",
                k.issued_to_guest_name as "currentGuestName"
         from room_keys k
         join rooms r on r.id = k.room_id
         where k.id = $1 and k.property_id = $2`,
        [id, user.propertyId]
      );
      if (!keyRes.rows[0]) throw new NotFoundException('Key record not found');
      const keyRoom = keyRes.rows[0];

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

        // Record key return in custody audit log
        await c.query(
          `insert into room_key_logs (tenant_id, property_id, key_id, reservation_id, room_number, action, recipient_name, recipient_type, notes)
           values ($1, $2, $3, $4, $5, 'returned_to_slot', 'Front Desk Key Slot', 'front_desk', $6)`,
          [user.tenantId, user.propertyId, id, keyRoom.currentResId, keyRoom.roomNumber, input.notes || (keyRoom.currentGuestName ? `Returned by ${keyRoom.currentGuestName}` : 'Returned to key slot')]
        );

        return res.rows[0];
      }

      let reservationId = input.issuedToReservationId ?? null;
      let guestName = input.issuedToGuestName ?? null;
      let recipientType = 'primary_guest';

      if (input.status === 'issued_to_guest') {
        // Enforce room-to-guest integrity: keys can ONLY be issued to guests registered in this room
        if (reservationId) {
          const resCheck = await c.query(
            `select res.id, res.room_id as "roomId", r.number as "roomNumber", res.status, p.full_name as "guestName"
             from reservations res
             join rooms r on r.id = res.room_id
             join guests g on g.id = res.guest_id
             join parties p on p.id = g.party_id
             where res.id = $1 and res.property_id = $2`,
            [reservationId, user.propertyId]
          );
          if (!resCheck.rows[0]) {
            throw new BadRequestException('Reservation not found for this property.');
          }
          const reservation = resCheck.rows[0];
          if (reservation.roomId !== keyRoom.roomId) {
            throw new BadRequestException(
              `Security Restriction: Room ${keyRoom.roomNumber} key cannot be issued to guest staying in Room ${reservation.roomNumber}. Keys can only be handed to occupants of Room ${keyRoom.roomNumber}.`
            );
          }
          if (reservation.status !== 'checked_in') {
            throw new BadRequestException(
              `Cannot issue room key: Reservation is in status '${reservation.status}'. Only checked-in guests can receive room keys.`
            );
          }
          if (!guestName) {
            guestName = reservation.guestName;
          }

          // Check if recipient is a companion
          const compCheck = await c.query(
            `select rg.is_primary from reservation_guests rg
             join guests g on g.id = rg.guest_id
             join parties p on p.id = g.party_id
             where rg.reservation_id = $1 and lower(trim(p.full_name)) = lower(trim($2)) limit 1`,
            [reservationId, guestName]
          );
          if (compCheck.rows[0] && !compCheck.rows[0].is_primary) {
            recipientType = 'companion';
          }
        } else {
          // If no reservationId explicitly passed, lookup active checked-in stay for this room
          const activeRes = await c.query(
            `select res.id, p.full_name as "guestName"
             from reservations res
             join guests g on g.id = res.guest_id
             join parties p on p.id = g.party_id
             where res.room_id = $1 and res.property_id = $2 and res.status = 'checked_in'
             order by res.check_in desc
             limit 1`,
            [keyRoom.roomId, user.propertyId]
          );
          if (!activeRes.rows[0]) {
            throw new BadRequestException(
              `Security Restriction: Room ${keyRoom.roomNumber} is currently vacant. Key cannot be issued to a guest because there is no active checked-in reservation for this room.`
            );
          }
          reservationId = activeRes.rows[0].id;
          if (!guestName) {
            guestName = activeRes.rows[0].guestName;
          }
        }

        // Record key issuance in custody audit log
        await c.query(
          `insert into room_key_logs (tenant_id, property_id, key_id, reservation_id, room_number, action, recipient_name, recipient_type, notes)
           values ($1, $2, $3, $4, $5, 'issued_to_guest', $6, $7, $8)`,
          [user.tenantId, user.propertyId, id, reservationId, keyRoom.roomNumber, guestName, recipientType, input.notes || `Handed to ${recipientType === 'companion' ? 'companion' : 'primary occupant'}`]
        );

      } else if (input.status === 'with_housekeeping') {
        reservationId = keyRoom.currentResId ?? null;
        guestName = guestName || 'Housekeeping Staff';
        recipientType = 'housekeeping';

        // Record housekeeping handover in custody audit log
        await c.query(
          `insert into room_key_logs (tenant_id, property_id, key_id, reservation_id, room_number, action, recipient_name, recipient_type, notes)
           values ($1, $2, $3, $4, $5, 'with_housekeeping', $6, 'housekeeping', $7)`,
          [user.tenantId, user.propertyId, id, reservationId, keyRoom.roomNumber, guestName, input.notes || 'Taken for housekeeping / room cleaning']
        );

      } else if (input.status === 'lost') {
        const lastHolder = keyRoom.currentGuestName || 'Unknown Occupant';
        // Record lost event in custody audit log
        await c.query(
          `insert into room_key_logs (tenant_id, property_id, key_id, reservation_id, room_number, action, recipient_name, recipient_type, notes)
           values ($1, $2, $3, $4, $5, 'lost', $6, 'front_desk', $7)`,
          [user.tenantId, user.propertyId, id, keyRoom.currentResId, keyRoom.roomNumber, lastHolder, input.notes || `Reported lost. Last known holder in possession: ${lastHolder}`]
        );
      }

      const res = await c.query(
        `update room_keys
         set status = $1,
             issued_to_reservation_id = $2,
             issued_to_guest_name = $3,
             notes = coalesce($4, notes),
             issued_at = case when $1 = 'issued_to_guest' then now() else issued_at end,
             returned_at = case when $1 = 'in_slot' then now() else returned_at end,
             updated_at = now()
         where id = $5 and property_id = $6
         returning id, key_number as "keyNumber", status`,
        [input.status, reservationId, guestName, input.notes ?? null, id, user.propertyId]
      );

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
      // 1. Fetch key and associated room
      const keyRes = await c.query(
        `select k.id, k.room_id as "roomId", r.number as "roomNumber"
         from room_keys k
         join rooms r on r.id = k.room_id
         where k.id = $1 and k.property_id = $2`,
        [id, user.propertyId]
      );
      if (!keyRes.rows[0]) throw new NotFoundException('Key record not found');
      const keyRoom = keyRes.rows[0];

      if (String(keyRoom.roomNumber).trim() !== String(input.roomNumber).trim()) {
        throw new BadRequestException(
          `Security Restriction: Room ${keyRoom.roomNumber} keycard cannot be encoded for Room ${input.roomNumber}. Keycards can only be encoded for their assigned room.`
        );
      }

      // 2. Verify that room has an active checked-in reservation
      const activeRes = await c.query(
        `select res.id, p.full_name as "guestName"
         from reservations res
         join guests g on g.id = res.guest_id
         join parties p on p.id = g.party_id
         where res.room_id = $1 and res.property_id = $2 and res.status = 'checked_in'
         order by res.check_in desc
         limit 1`,
        [keyRoom.roomId, user.propertyId]
      );
      if (!activeRes.rows[0]) {
        throw new BadRequestException(
          `Security Restriction: Room ${keyRoom.roomNumber} is currently vacant. Keycards can only be encoded for active in-house guests.`
        );
      }

      // Generate simulated NFC / MIFARE Sector 1 data payload
      const sectorPayload = `ROOM=${input.roomNumber}|GUEST=${encodeURIComponent(input.guestName)}|EXP=${new Date(input.checkOut).getTime()}|PROP=${user.propertyId}`;
      const cardUid = input.cardUid || `04:${Math.random().toString(16).substring(2, 10).toUpperCase()}`;

      await c.query(
        `update room_keys
         set status = 'issued_to_guest',
             card_uid = $1,
             issued_to_reservation_id = $2,
             issued_to_guest_name = $3,
             issued_at = now(),
             notes = $4,
             updated_at = now()
         where id = $5 and property_id = $6`,
        [cardUid, activeRes.rows[0].id, input.guestName, `Encoded via ${input.protocol.toUpperCase()}`, id, user.propertyId]
      );

      // Record card encoding in custody audit log
      await c.query(
        `insert into room_key_logs (tenant_id, property_id, key_id, reservation_id, room_number, action, recipient_name, recipient_type, notes)
         values ($1, $2, $3, $4, $5, 'issued_to_guest', $6, 'primary_guest', $7)`,
        [user.tenantId, user.propertyId, id, activeRes.rows[0].id, input.roomNumber, input.guestName, `Encoded via ${input.protocol.toUpperCase()}`]
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
