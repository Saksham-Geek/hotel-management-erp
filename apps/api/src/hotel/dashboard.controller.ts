import { Controller, Get } from '@nestjs/common';
import { FEATURES } from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('hotel/dashboard')
@RequireFeature(FEATURES.HOTEL_ROOMS)
export class DashboardController {
  constructor(private readonly db: DbService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const rooms = (await c.query(`select status, count(*)::int as n from rooms group by status`)).rows;
      const byStatus = Object.fromEntries(rooms.map((r) => [r.status, r.n])) as Record<string, number>;
      // "Today" is the hotel's own date (tenant timezone), not the server's.
      const arrivals = (await c.query(`select count(*)::int as n from reservations where status = 'reserved' and check_in = tenant_today()`)).rows[0].n;
      const departures = (await c.query(`select count(*)::int as n from reservations where status = 'checked_in' and check_out = tenant_today()`)).rows[0].n;
      const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
      return { totalRooms: total, byStatus, arrivalsToday: arrivals, departuresToday: departures };
    });
  }

  @Get('contingency-sheet')
  getContingencySheet(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // 1. Property Name and Hotel Today
      const prop = (
        await c.query(`SELECT name, timezone FROM properties WHERE id = $1`, [user.propertyId])
      ).rows[0];

      // 2. In-House Guests Master
      const inHouseRes = await c.query(
        `SELECT
           r.id AS "reservationId",
           rm.number AS "roomNumber",
           rm.floor,
           rt.name AS "roomType",
           p.full_name AS "guestName",
           p.phone,
           r.check_in AS "checkIn",
           r.check_out AS "checkOut",
           g.vip,
           g.nationality,
           COALESCE((
             SELECT SUM(fi.amount) - COALESCE(SUM(fp.amount), 0)
             FROM reservation_folios rf
             LEFT JOIN folio_items fi ON fi.folio_id = rf.id
             LEFT JOIN folio_payments fp ON fp.folio_id = rf.id
             WHERE rf.reservation_id = r.id
           ), 0)::numeric AS "balance"
         FROM reservations r
         JOIN rooms rm ON rm.id = r.room_id
         JOIN room_types rt ON rt.id = rm.room_type_id
         JOIN guests g ON g.id = r.guest_id
         JOIN parties p ON p.id = g.party_id
         WHERE r.status = 'checked_in'
         ORDER BY rm.number ASC`,
      );

      // 3. Expected Arrivals for Today
      const arrivalsRes = await c.query(
        `SELECT
           r.id AS "reservationId",
           rm.number AS "assignedRoom",
           rt.name AS "roomType",
           p.full_name AS "guestName",
           p.phone,
           r.check_in AS "checkIn",
           r.check_out AS "checkOut",
           g.vip
         FROM reservations r
         JOIN rooms rm ON rm.id = r.room_id
         JOIN room_types rt ON rt.id = rm.room_type_id
         JOIN guests g ON g.id = r.guest_id
         JOIN parties p ON p.id = g.party_id
         WHERE r.status = 'reserved' AND r.check_in = tenant_today()
         ORDER BY rm.number ASC, p.full_name ASC`,
      );

      // 4. Expected Departures for Today
      const departuresRes = await c.query(
        `SELECT
           r.id AS "reservationId",
           rm.number AS "roomNumber",
           p.full_name AS "guestName",
           p.phone,
           r.check_in AS "checkIn",
           r.check_out AS "checkOut",
           COALESCE((
             SELECT SUM(fi.amount) - COALESCE(SUM(fp.amount), 0)
             FROM reservation_folios rf
             LEFT JOIN folio_items fi ON fi.folio_id = rf.id
             LEFT JOIN folio_payments fp ON fp.folio_id = rf.id
             WHERE rf.reservation_id = r.id
           ), 0)::numeric AS "balance"
         FROM reservations r
         JOIN rooms rm ON rm.id = r.room_id
         JOIN guests g ON g.id = r.guest_id
         JOIN parties p ON p.id = g.party_id
         WHERE r.status = 'checked_in' AND r.check_out = tenant_today()
         ORDER BY rm.number ASC`,
      );

      // 5. Vacant Clean Ready Rooms (for emergency walk-in assignment during offline hours)
      const vacantRes = await c.query(
        `SELECT
           rm.number AS "roomNumber",
           rm.floor,
           rt.name AS "roomType",
           rm.base_rate AS "rate"
         FROM rooms rm
         JOIN room_types rt ON rt.id = rm.room_type_id
         WHERE rm.status = 'available'
         ORDER BY rm.number ASC`,
      );

      return {
        hotelName: prop?.name || 'Hotel Property',
        generatedAt: new Date().toISOString(),
        inHouse: inHouseRes.rows,
        arrivals: arrivalsRes.rows,
        departures: departuresRes.rows,
        vacantReady: vacantRes.rows,
      };
    });
  }
}
