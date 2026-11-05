import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { FEATURES, PERMISSIONS } from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('hotel/tape-chart')
@RequireFeature(FEATURES.HOTEL_TAPE_CHART)
export class TapeChartController {
  constructor(private readonly db: DbService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ROOM_READ)
  async getTapeChart(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDateQuery?: string,
    @Query('days') daysQuery?: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const startDate = startDateQuery && dateRegex.test(startDateQuery) ? startDateQuery : new Date().toISOString().slice(0, 10);
      const parsedDays = parseInt(daysQuery ?? '14', 10);
      const days = Number.isFinite(parsedDays) ? Math.min(60, Math.max(7, parsedDays)) : 14;

      // 1. All rooms grouped by floor and type
      const rooms = (
        await c.query(
          `SELECT r.id, r.number, r.floor, r.status, rt.name AS "roomType", rt.id AS "roomTypeId",
                  coalesce(r.base_rate, rt.base_rate)::float8 AS "baseRate"
           FROM rooms r
           JOIN room_types rt ON rt.id = r.room_type_id
           WHERE r.tenant_id = $1 AND r.property_id = $2
           ORDER BY r.floor ASC, r.number ASC`,
          [user.tenantId, user.propertyId],
        )
      ).rows;

      // 2. Overlapping reservations in date range with efficient aggregated payments
      const reservations = (
        await c.query(
          `SELECT r.id, r.room_id AS "roomId", r.status, r.check_in::text AS "checkIn", r.check_out::text AS "checkOut",
                  r.check_in_at AS "checkInAt", r.check_out_at AS "checkOutAt", r.rate_mode AS "rateMode",
                  r.booking_source AS "bookingSource", r.ota_booking_id AS "otaBookingId",
                  r.total_amount::float8 AS "totalAmount", p.full_name AS "guestName", p.phone AS "guestPhone",
                  g.vip, f.id AS "folioId", f.status AS "folioStatus",
                  coalesce(pm.paid_total, 0)::float8 AS "paidAmount"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           JOIN guests g ON g.id = r.guest_id
           JOIN parties p ON p.id = g.party_id
           LEFT JOIN reservation_folios f ON f.reservation_id = r.id
           LEFT JOIN (
             SELECT folio_id, sum(amount) AS paid_total
             FROM folio_payments
             WHERE status = 'captured'
             GROUP BY folio_id
           ) pm ON pm.folio_id = f.id
           WHERE r.tenant_id = $1 AND r.property_id = $2
             AND r.status IN ('reserved', 'checked_in', 'checked_out')
             AND (
               (r.check_in < ($3::date + ($4 || ' days')::interval) AND r.check_out > $3::date)
               OR (r.check_in >= $3::date AND r.check_in < ($3::date + ($4 || ' days')::interval))
             )
           ORDER BY r.check_in ASC`,
          [user.tenantId, user.propertyId, startDate, days],
        )
      ).rows;

      return {
        startDate,
        days,
        rooms,
        reservations,
      };
    });
  }
}
