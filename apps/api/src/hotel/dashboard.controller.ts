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
}
