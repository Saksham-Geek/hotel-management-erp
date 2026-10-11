import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CreateReservationInput, FEATURES, ReservationStatus, createGuestSchema, createReservationSchema } from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { encryptSensitiveField } from '../common/field-encryption';
import { RequireFeature } from '../entitlements/require-feature';

/** Allowed status changes. Anything else is rejected, so records can't jump around. */
const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  reserved: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
};
const ROOM_STATUS_AFTER: Partial<Record<ReservationStatus, string>> = { checked_in: 'occupied', checked_out: 'cleaning' };

@Controller('hotel/reservations')
@RequireFeature(FEATURES.HOTEL_RESERVATIONS)
export class ReservationsController {
  constructor(private readonly db: DbService, private readonly audit: AuditService) {}

  @Get()
  @Roles('owner','manager','frontdesk')
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (
        await c.query(
          `select rs.id, rs.status, rs.check_in::text as "checkIn", rs.check_out::text as "checkOut",
                  rs.total_amount::float8 as "totalAmount", ro.number as "roomNumber", p.full_name as "guestName", p.phone as "guestPhone",
                  (select json_agg(json_build_object('id', gp.id, 'name', pp.full_name) order by rg.is_primary desc, pp.full_name) from reservation_guests rg join guests gp on gp.id = rg.guest_id join parties pp on pp.id = gp.party_id where rg.reservation_id = rs.id) as "guests"
           from reservations rs
           join rooms ro on ro.id = rs.room_id
           join guests g on g.id = rs.guest_id
           join parties p on p.id = g.party_id
           where ($1::text is null or rs.status = $1)
           order by rs.check_in desc, rs.created_at desc limit 200`,
          [status ?? null],
        )
      ).rows,
    );
  }

  @Post()
  @Roles('owner','manager','frontdesk')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createReservationSchema)) b: CreateReservationInput) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let guestId = b.guestId;
      if (b.newGuest) {
        const g = createGuestSchema.parse(b.newGuest);
        const duplicate = (await c.query(
          `select g.id, p.full_name as "fullName" from guests g join parties p on p.id = g.party_id
           where lower(trim(p.full_name)) = lower(trim($1)) and (
             ($2::text is not null and regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g'))
             or ($3::text is not null and lower(trim(p.email)) = lower(trim($3)))
           ) limit 1`, [g.fullName, g.phone ?? null, g.email ?? null],
        )).rows[0];
        if (duplicate) throw new ConflictException({ code: 'POSSIBLE_DUPLICATE_GUEST', guestId: duplicate.id, message: `A matching guest profile already exists for ${duplicate.fullName}. Search and select the existing guest.` });
        const identity = encryptSensitiveField(g.idNumber);
        const party = (await c.query(`insert into parties (tenant_id, full_name, phone, email, custom_fields) values ($1,$2,$3,$4,$5) returning id`, [user.tenantId, g.fullName, g.phone ?? null, g.email ?? null, JSON.stringify(g.customFields ?? {})])).rows[0];
        const guest = (await c.query(`insert into guests (tenant_id, party_id, nationality, id_type, id_number, id_number_ciphertext, id_number_iv, id_number_auth_tag, vip, notes) values ($1,$2,$3,$4,null,$5,$6,$7,$8,$9) returning id`, [user.tenantId, party.id, g.nationality ?? null, g.idType ?? null, identity.ciphertext, identity.iv, identity.authTag, g.vip ?? false, g.notes ?? null])).rows[0];
        guestId = guest.id;
      }
      if (!guestId) throw new BadRequestException({ code: 'INVALID_GUEST', message: 'Select or create a guest.' });
      const checkInTime = b.checkInTime ?? '12:00';
      const checkOutTime = b.checkOutTime ?? '11:00';
      if (b.rateMode === 'hourly' && b.checkOut === b.checkIn && checkOutTime <= checkInTime) {
        throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'Hourly check-out must be after check-in.' });
      }
      if ((b.priceOverride !== undefined || b.hourlyRateOverride !== undefined || b.unitRateOverride !== undefined) && !['owner', 'manager'].includes(user.role)) {
        throw new ForbiddenException({ code: 'PRICE_OVERRIDE_FORBIDDEN', message: 'Only an owner or manager can override reservation pricing.' });
      }
      const row = (await c.query(
        `with room_rate as (
           select r.id, coalesce(r.hourly_rate, rt.hourly_rate) as hourly_rate,
                  coalesce(r.base_rate, rt.base_rate) as base_rate, prop.timezone
           from rooms r
           join room_types rt on rt.id = r.room_type_id
           join properties prop on prop.id = $13 and prop.tenant_id = r.tenant_id
           where r.id = $3
         ), price as (
           select id,
             case when $7 = 'hourly'
                    then coalesce($14::numeric, $12::numeric, hourly_rate, base_rate / 24.0)
                    else coalesce($14::numeric, base_rate)
             end as unit_rate,
             (case when $7 = 'hourly' then
                    coalesce($14::numeric, $12::numeric, hourly_rate, base_rate / 24.0) *
                    greatest(2, ceil((extract(epoch from (
                      (($5::date + $9::time) at time zone timezone) -
                      (($4::date + $8::time) at time zone timezone)
                    )) / 60.0 - 30.0) / 60.0))
                  else coalesce($14::numeric, base_rate) * greatest(1, ($5::date - $4::date)) end) as calculated
           from room_rate
         )
         insert into reservations (tenant_id, guest_id, room_id, check_in, check_out, check_in_at, check_out_at, rate_mode, unit_rate, price_override, override_reason, total_amount, created_by)
         select $1, $2, p.id, $4::date, $5::date,
                (($4::date + $8::time) at time zone rr.timezone),
                (($5::date + $9::time) at time zone rr.timezone), $7,
                p.unit_rate,
                $10, $11, coalesce($10, p.calculated), $6
         from price p join room_rate rr on rr.id = p.id
         returning id, status, check_in::text as "checkIn", check_out::text as "checkOut", check_in_at as "checkInAt", check_out_at as "checkOutAt", rate_mode as "rateMode", unit_rate::float8 as "unitRate", total_amount::float8 as "totalAmount"`,
        [user.tenantId, guestId, b.roomId, b.checkIn, b.checkOut, user.id, b.rateMode, checkInTime, checkOutTime, b.priceOverride ?? null, b.overrideReason?.trim() || null, b.hourlyRateOverride ?? null, user.propertyId, b.unitRateOverride ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Room not found' });

      const newCompanionIds: string[] = [];
      for (const input of b.newCompanions) {
        const companion = createGuestSchema.parse(input);
        const fullName = companion.fullName.trim();
        if (!fullName) throw new BadRequestException({ code: 'INVALID_GUEST', message: 'A new companion needs a full name.' });

        const duplicate = (await c.query(
          `select g.id, p.full_name as "fullName" from guests g join parties p on p.id = g.party_id
           where lower(trim(p.full_name)) = lower(trim($1)) and (
             ($2::text is not null and regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g'))
             or ($3::text is not null and lower(trim(p.email)) = lower(trim($3)))
           ) limit 1`,
          [fullName, companion.phone ?? null, companion.email ?? null],
        )).rows[0];
        if (duplicate) {
          throw new ConflictException({
            code: 'POSSIBLE_DUPLICATE_GUEST',
            guestId: duplicate.id,
            message: `A guest profile already matches ${duplicate.fullName}. Search and add that existing profile instead.`,
          });
        }

        const identity = encryptSensitiveField(companion.idNumber);
        const party = (await c.query(
          `insert into parties (tenant_id, full_name, phone, email, custom_fields)
           values ($1,$2,$3,$4,$5) returning id`,
          [user.tenantId, fullName, companion.phone?.trim() || null, companion.email?.trim() || null, JSON.stringify(companion.customFields ?? {})],
        )).rows[0];
        const guest = (await c.query(
          `insert into guests (tenant_id, party_id, nationality, id_type, id_number, id_number_ciphertext, id_number_iv, id_number_auth_tag, vip, notes)
           values ($1,$2,$3,$4,null,$5,$6,$7,$8,$9) returning id`,
          [user.tenantId, party.id, companion.nationality ?? null, companion.idType ?? null,
            identity.ciphertext, identity.iv, identity.authTag, companion.vip, companion.notes ?? null],
        )).rows[0];
        newCompanionIds.push(guest.id);
        await this.audit.log(c, {
          tenantId: user.tenantId, userId: user.id, action: 'guest.create',
          entity: 'guest', entityId: guest.id, meta: { source: 'reservation_companion' },
        });
      }

      const guestIds = [...new Set([guestId, ...(b.guestIds ?? []), ...newCompanionIds])];
      const guestCheck = await c.query(`select id from guests where id = any($1::uuid[])`, [guestIds]);
      if (guestCheck.rowCount !== guestIds.length) throw new BadRequestException({ code: 'INVALID_GUEST', message: 'One or more selected guests were not found in this hotel.' });
      for (const linkedGuestId of guestIds) {
        await c.query(`insert into reservation_guests (tenant_id, reservation_id, guest_id, is_primary) values ($1,$2,$3,$4) on conflict do nothing`, [user.tenantId, row.id, linkedGuestId, linkedGuestId === guestId]);
      }
      await c.query(
        `insert into reservation_folios (tenant_id, reservation_id, currency, subtotal, total, status)
         select $1, $2, t.currency, $3, $3, 'open' from tenants t where t.id = $1 on conflict (tenant_id, reservation_id) do nothing`,
        [user.tenantId, row.id, row.totalAmount],
      );
      await c.query(`insert into folio_items (tenant_id, folio_id, description, quantity, unit_price, line_total)
                     select $1, f.id, case when $3 = 'hourly' then 'Hourly room charge' else 'Room charge' end, 1, $4, $4
                     from reservation_folios f where f.tenant_id = $1 and f.reservation_id = $2`,
        [user.tenantId, row.id, b.rateMode, row.totalAmount]);
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'reservation.create', entity: 'reservation', entityId: row.id, meta: { roomId: b.roomId, guestIds, checkIn: b.checkIn, checkOut: b.checkOut, rateMode: b.rateMode, priceOverride: b.priceOverride ?? null, hourlyRateOverride: b.hourlyRateOverride ?? null, unitRateOverride: b.unitRateOverride ?? null, overrideReason: b.overrideReason ?? null } });
      return { ...row, guestIds };
    });
  }

  @Post(':id/:action')
  @Roles('owner','manager','frontdesk')
  transition(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action') action: string,
  ) {
    const target = ({ 'check-in': 'checked_in', 'check-out': 'checked_out', cancel: 'cancelled' } as Record<string, ReservationStatus>)[action];
    if (!target) throw new NotFoundException();

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const cur = (await c.query(`select status, room_id from reservations where id = $1 for update`, [id])).rows[0];
      if (!cur) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Reservation not found' });
      if (!TRANSITIONS[cur.status as ReservationStatus].includes(target)) {
        throw new BadRequestException({ code: 'BAD_TRANSITION', message: `A ${cur.status.replace('_', ' ')} reservation cannot be changed to ${target.replace('_', ' ')}` });
      }
      await c.query(`update reservations set status = $2 where id = $1`, [id, target]);
      const roomStatus = ROOM_STATUS_AFTER[target];
      if (roomStatus) {
        if (target === 'checked_out') {
          await c.query(`update rooms set status = 'cleaning' where id = $1 and not exists (select 1 from reservations where room_id = $1 and status = 'checked_in')`, [cur.room_id]);
        } else { await c.query(`update rooms set status = $2 where id = $1`, [cur.room_id, roomStatus]); }
      }
      await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: `reservation.${target}`, entity: 'reservation', entityId: id });
      return { id, status: target };
    });
  }
}
