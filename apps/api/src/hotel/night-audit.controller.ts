import {
  BadRequestException,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FEATURES, PERMISSIONS } from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';
import { calculateGstTax } from './tax-calculator';

@Controller('hotel/night-audit')
@RequireFeature(FEATURES.HOTEL_NIGHT_AUDIT)
export class NightAuditController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  @Get('status')
  @RequirePermission(PERMISSIONS.NIGHT_AUDIT_EXECUTE)
  async getStatus(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let bDate = (
        await c.query(
          `SELECT current_business_date::text AS "currentBusinessDate", is_audit_in_progress AS "isAuditInProgress",
                  last_audited_at AS "lastAuditedAt"
           FROM hotel_business_dates WHERE tenant_id = $1 AND property_id = $2`,
          [user.tenantId, user.propertyId],
        )
      ).rows[0];

      if (!bDate) {
        await c.query(
          `INSERT INTO hotel_business_dates (tenant_id, property_id, current_business_date)
           VALUES ($1, $2, current_date) ON CONFLICT DO NOTHING`,
          [user.tenantId, user.propertyId],
        );
        bDate = { currentBusinessDate: new Date().toISOString().slice(0, 10), isAuditInProgress: false, lastAuditedAt: null };
      }

      const totalRooms = Number((await c.query(`SELECT count(*)::int AS n FROM rooms WHERE tenant_id = $1 AND property_id = $2`, [user.tenantId, user.propertyId])).rows[0]?.n ?? 0);
      const inHouseRooms = Number(
        (await c.query(`SELECT count(*)::int AS n FROM reservations WHERE tenant_id = $1 AND property_id = $2 AND status = 'checked_in'`, [user.tenantId, user.propertyId])).rows[0]?.n ?? 0,
      );
      const pendingArrivals = Number(
        (
          await c.query(
            `SELECT count(*)::int AS n FROM reservations WHERE tenant_id = $1 AND property_id = $2 AND status = 'reserved' AND check_in <= $3::date`,
            [user.tenantId, user.propertyId, bDate.currentBusinessDate],
          )
        ).rows[0]?.n ?? 0,
      );
      const pendingDepartures = Number(
        (
          await c.query(
            `SELECT count(*)::int AS n FROM reservations WHERE tenant_id = $1 AND property_id = $2 AND status = 'checked_in' AND check_out <= $3::date`,
            [user.tenantId, user.propertyId, bDate.currentBusinessDate],
          )
        ).rows[0]?.n ?? 0,
      );

      const occupancyRate = totalRooms > 0 ? Math.round((inHouseRooms / totalRooms) * 1000) / 10 : 0;

      return {
        ...bDate,
        totalRooms,
        inHouseRooms,
        pendingArrivals,
        pendingDepartures,
        occupancyRate,
        overdueNoShowsCount: pendingArrivals,
      };
    });
  }

  @Post('execute')
  @RequirePermission(PERMISSIONS.NIGHT_AUDIT_EXECUTE)
  async executeAudit(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let bDateRow = (
        await c.query(
          `SELECT current_business_date::text AS "currentBusinessDate", is_audit_in_progress AS "isAuditInProgress"
           FROM hotel_business_dates WHERE tenant_id = $1 AND property_id = $2 FOR UPDATE`,
          [user.tenantId, user.propertyId],
        )
      ).rows[0];

      if (!bDateRow) {
        await c.query(
          `INSERT INTO hotel_business_dates (tenant_id, property_id, current_business_date)
           VALUES ($1, $2, current_date) ON CONFLICT DO NOTHING`,
          [user.tenantId, user.propertyId],
        );
        bDateRow = (
          await c.query(
            `SELECT current_business_date::text AS "currentBusinessDate", is_audit_in_progress AS "isAuditInProgress"
             FROM hotel_business_dates WHERE tenant_id = $1 AND property_id = $2 FOR UPDATE`,
            [user.tenantId, user.propertyId],
          )
        ).rows[0];
      }
      if (bDateRow.isAuditInProgress) {
        throw new BadRequestException({ code: 'AUDIT_IN_PROGRESS', message: 'Night audit is already running' });
      }

      const businessDate = bDateRow.currentBusinessDate;
      await c.query(`UPDATE hotel_business_dates SET is_audit_in_progress = true, audit_started_at = now() WHERE tenant_id = $1 AND property_id = $2`, [
        user.tenantId,
        user.propertyId,
      ]);

      // 1. Find all in-house checked_in reservations
      const checkedInReservations = (
        await c.query(
          `SELECT r.id, coalesce(r.unit_rate, ro.base_rate, 1000)::float8 AS "unitRate", r.rate_mode AS "rateMode", f.id AS "folioId"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           LEFT JOIN reservation_folios f ON f.reservation_id = r.id
           WHERE r.tenant_id = $1 AND r.property_id = $2 AND r.status = 'checked_in'`,
          [user.tenantId, user.propertyId],
        )
      ).rows;

      let roomRevenuePosted = 0;
      let taxPosted = 0;

      for (const res of checkedInReservations) {
        let targetFolioId = res.folioId;
        if (!targetFolioId) {
          const newFolio = (
            await c.query(
              `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, subtotal, tax_total, total)
               VALUES ($1, $2, $3, 0, 0, 0) RETURNING id`,
              [user.tenantId, user.propertyId, res.id],
            )
          ).rows[0];
          targetFolioId = newFolio.id;
        }

        const rate = res.unitRate > 0 ? res.unitRate : 1000;
        const tax = calculateGstTax('ACCOMMODATION', rate, 1, false);

        await c.query(
          `INSERT INTO folio_items (
             tenant_id, folio_id, description, quantity, unit_price, tax_rate, line_total,
             tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
           )
           VALUES ($1, $2, $3, 1, $4, $5, $6, 'ACCOMMODATION', '996311', $7, $8, $9)`,
          [
            user.tenantId,
            targetFolioId,
            `Daily room charge (${businessDate})`,
            rate,
            tax.cgstRate + tax.sgstRate,
            tax.lineTotal,
            tax.cgstAmount,
            tax.sgstAmount,
            tax.igstAmount,
          ],
        );

        // Update folio total
        await c.query(
          `UPDATE reservation_folios
           SET subtotal = subtotal + $2, tax_total = tax_total + $3, total = total + $4, updated_at = now()
           WHERE id = $1`,
          [targetFolioId, rate, tax.taxTotal, tax.lineTotal],
        );

        roomRevenuePosted += rate;
        taxPosted += tax.taxTotal;
      }

      // 1.5 Automated No-Show Auto-Release: Room Lifecycle Guard
      // Identifies unarrived reservations for today or earlier that were never checked in,
      // marks them as cancelled with audit rationale, releases room keys, and restores rooms to available inventory.
      const overdueReservations = (
        await c.query(
          `SELECT r.id, r.room_id AS "roomId", r.check_in::text AS "checkIn",
                  ro.number AS "roomNumber", p.full_name AS "guestName"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           JOIN guests g ON g.id = r.guest_id
           JOIN parties p ON p.id = g.party_id
           WHERE r.tenant_id = $1 AND r.property_id = $2
             AND r.status = 'reserved'
             AND r.check_in <= $3::date`,
          [user.tenantId, user.propertyId, businessDate],
        )
      ).rows;

      const releasedRooms: string[] = [];
      for (const noShow of overdueReservations) {
        await c.query(
          `UPDATE reservations
           SET status = 'cancelled'
           WHERE id = $1`,
          [noShow.id],
        );

        await c.query(
          `UPDATE room_keys
           SET status = 'in_slot',
               issued_to_reservation_id = null,
               issued_to_guest_name = null,
               returned_at = now(),
               updated_at = now()
           WHERE issued_to_reservation_id = $1`,
          [noShow.id],
        );

        const activeStays = (
          await c.query(
            `SELECT 1 FROM reservations WHERE room_id = $1 AND status = 'checked_in' LIMIT 1`,
            [noShow.roomId],
          )
        ).rowCount;

        if (!activeStays) {
          await c.query(
            `UPDATE rooms SET status = 'available' WHERE id = $1`,
            [noShow.roomId],
          );
          releasedRooms.push(noShow.roomNumber);
        }

        await this.audit.log(c, {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'reservation.no_show_auto_release',
          entity: 'reservation',
          entityId: noShow.id,
          meta: {
            guestName: noShow.guestName,
            roomNumber: noShow.roomNumber,
            businessDate,
          },
        });
      }

      // 1.6 Snapshot Police Beat Sheet into 6-Year Partitioned Statutory Archive
      const beatSheetGuests = (
        await c.query(
          `SELECT ro.number AS "roomNumber", r.id AS "reservationId", coalesce(rg.guest_id, r.guest_id) AS "guestId",
                  p.full_name AS "guestName", p.phone AS "guestPhone", p.email AS "guestEmail",
                  coalesce(g.nationality, 'Indian') AS "nationality", coalesce(g.id_type, 'AADHAAR') AS "idType",
                  coalesce(g.id_number, 'XXXX') AS "maskedIdNumber",
                  r.check_in AS "checkIn", r.check_out AS "checkOut",
                  not coalesce(rg.is_primary, true) AS "isCompanion",
                  (SELECT p2.full_name FROM guests g2 JOIN parties p2 ON p2.id = g2.party_id WHERE g2.id = r.guest_id) AS "primaryGuestName"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id AND rg.tenant_id = r.tenant_id
           JOIN guests g ON g.id = coalesce(rg.guest_id, r.guest_id)
           JOIN parties p ON p.id = g.party_id
           WHERE r.tenant_id = $1 AND r.property_id = $2
             AND r.status = 'checked_in'`,
          [user.tenantId, user.propertyId],
        )
      ).rows;

      for (const bg of beatSheetGuests) {
        const recordStr = `${user.tenantId}:${user.propertyId}:${businessDate}:${bg.roomNumber}:${bg.guestName}:${bg.checkIn}:${bg.checkOut}`;
        const sha256 = createHash('sha256').update(recordStr).digest('hex');
        await c.query(
          `INSERT INTO statutory_police_beat_archives (
             tenant_id, property_id, report_date, room_number, reservation_id, guest_id,
             full_name, phone, email, nationality, id_proof_type, masked_id_number,
             check_in, expected_check_out, is_companion, primary_guest_name, record_sha256
           )
           VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT DO NOTHING`,
          [
            user.tenantId,
            user.propertyId,
            businessDate,
            bg.roomNumber,
            bg.reservationId,
            bg.guestId,
            bg.guestName,
            bg.guestPhone || null,
            bg.guestEmail || null,
            bg.nationality,
            bg.idType,
            bg.maskedIdNumber,
            bg.checkIn,
            bg.checkOut,
            bg.isCompanion,
            bg.primaryGuestName,
            sha256,
          ],
        );
      }

      // 2. Compute summary KPIs
      const totalRooms = Number((await c.query(`SELECT count(*)::int AS n FROM rooms WHERE tenant_id = $1 AND property_id = $2`, [user.tenantId, user.propertyId])).rows[0]?.n ?? 0);
      const roomsOccupied = checkedInReservations.length;
      const occupancyRate = totalRooms > 0 ? Math.round((roomsOccupied / totalRooms) * 10000) / 100 : 0;
      const adr = roomsOccupied > 0 ? Math.round((roomRevenuePosted / roomsOccupied) * 100) / 100 : 0;
      const revpar = totalRooms > 0 ? Math.round((roomRevenuePosted / totalRooms) * 100) / 100 : 0;

      // 3. Insert into night_audit_logs
      const log = (
        await c.query(
          `INSERT INTO night_audit_logs (
             tenant_id, property_id, business_date, rooms_total, rooms_occupied, occupancy_rate,
             total_room_revenue, total_fnb_revenue, total_tax_collected, adr, revpar, executed_by
           )
           VALUES ($1, $2, $3::date, $4, $5, $6, $7, 0, $8, $9, $10, $11)
           ON CONFLICT (tenant_id, property_id, business_date) DO UPDATE
           SET rooms_occupied = excluded.rooms_occupied, total_room_revenue = excluded.total_room_revenue,
               adr = excluded.adr, revpar = excluded.revpar
           RETURNING id, business_date::text AS "businessDate", rooms_occupied AS "roomsOccupied",
                     total_room_revenue::float8 AS "totalRoomRevenue", adr::float8, revpar::float8`,
          [
            user.tenantId,
            user.propertyId,
            businessDate,
            totalRooms,
            roomsOccupied,
            occupancyRate,
            roomRevenuePosted,
            taxPosted,
            adr,
            revpar,
            user.id,
          ],
        )
      ).rows[0];

      // 4. Roll current business date to next day
      const nextDate = (
        await c.query(
          `UPDATE hotel_business_dates
           SET current_business_date = current_business_date + interval '1 day',
               is_audit_in_progress = false,
               last_audited_by = $3,
               last_audited_at = now()
           WHERE tenant_id = $1 AND property_id = $2
           RETURNING current_business_date::text AS "newBusinessDate"`,
          [user.tenantId, user.propertyId, user.id],
        )
      ).rows[0].newBusinessDate;

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'night_audit.execute',
        entity: 'night_audit',
        entityId: log.id,
        meta: { closedBusinessDate: businessDate, newBusinessDate: nextDate, roomsOccupied, adr, revpar },
      });

      return {
        message: `Night audit completed for ${businessDate}. Business date rolled to ${nextDate}.${overdueReservations.length > 0 ? ` ${overdueReservations.length} unarrived reservation(s) auto-released as No-Show and returned to inventory.` : ''}`,
        closedBusinessDate: businessDate,
        newBusinessDate: nextDate,
        noShowsAutoReleased: overdueReservations.length,
        releasedRooms,
        kpis: {
          roomsTotal: totalRooms,
          roomsOccupied,
          occupancyRate,
          roomRevenue: roomRevenuePosted,
          taxCollected: taxPosted,
          adr,
          revpar,
        },
      };
    });
  }

  @Get('history')
  @RequirePermission(PERMISSIONS.NIGHT_AUDIT_EXECUTE)
  async getHistory(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      return (
        await c.query(
          `SELECT nal.id, nal.business_date::text AS "businessDate", nal.rooms_total AS "roomsTotal",
                  nal.rooms_occupied AS "roomsOccupied", nal.occupancy_rate::float8 AS "occupancyRate",
                  nal.total_room_revenue::float8 AS "totalRoomRevenue", nal.total_tax_collected::float8 AS "totalTaxCollected",
                  nal.adr::float8, nal.revpar::float8, nal.created_at AS "completedAt",
                  u.full_name AS "auditorName"
           FROM night_audit_logs nal
           LEFT JOIN users u ON u.id = nal.executed_by
           ORDER BY nal.business_date DESC LIMIT 30`,
        )
      ).rows;
    });
  }
}
