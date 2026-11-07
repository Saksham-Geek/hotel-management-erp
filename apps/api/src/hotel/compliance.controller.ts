import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateFormCInput, FEATURES, PERMISSIONS, createFormCSchema } from '@erp/shared';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { ZodPipe } from '../common/zod.pipe';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';
import { randomBytes } from 'node:crypto';

@Controller('hotel/compliance')
@RequireFeature(FEATURES.HOTEL_COMPLIANCE)
export class ComplianceController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  @Get('form-c')
  @RequirePermission(PERMISSIONS.FORM_C_MANAGE)
  async listFormC(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      return (
        await c.query(
          `SELECT fc.id, fc.passport_number AS "passportNumber", fc.passport_country AS "passportCountry",
                  fc.passport_expiry_date AS "passportExpiryDate", fc.visa_number AS "visaNumber",
                  fc.visa_type AS "visaType", fc.visa_valid_until AS "visaValidUntil",
                  fc.arrival_date_in_india AS "arrivalDateInIndia", fc.arrived_from_city_country AS "arrivedFrom",
                  fc.next_destination_city_country AS "nextDestination", fc.purpose_of_visit AS "purposeOfVisit",
                  fc.submission_status AS "submissionStatus", fc.boi_application_id AS "boiApplicationId",
                  fc.submitted_at AS "submittedAt", fc.created_at AS "createdAt",
                  p.full_name AS "guestName", p.phone AS "guestPhone", g.nationality,
                  r.id AS "reservationId", r.check_in AS "checkIn", r.check_out AS "checkOut", ro.number AS "roomNumber"
           FROM guest_form_c fc
           JOIN guests g ON g.id = fc.guest_id
           JOIN parties p ON p.id = g.party_id
           JOIN reservations r ON r.id = fc.reservation_id
           JOIN rooms ro ON ro.id = r.room_id
           WHERE fc.tenant_id = $1 AND fc.property_id = $2
             AND ($3::text IS NULL OR fc.submission_status = $3)
           ORDER BY fc.created_at DESC LIMIT 100`,
          [user.tenantId, user.propertyId, status ?? null],
        )
      ).rows;
    });
  }

  @Post('form-c')
  @RequirePermission(PERMISSIONS.FORM_C_MANAGE)
  async createFormC(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createFormCSchema)) b: CreateFormCInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const boiAppId = `BOI/${new Date().getFullYear()}/${randomBytes(3).toString('hex').toUpperCase()}`;

      const row = (
        await c.query(
          `INSERT INTO guest_form_c (
             tenant_id, guest_id, reservation_id, passport_number, passport_country,
             passport_issue_date, passport_expiry_date, visa_number, visa_type, visa_valid_until,
             visa_issue_place, arrival_date_in_india, arrived_from_city_country, next_destination_city_country,
             purpose_of_visit, employed_in_india, submission_status, boi_application_id, submitted_by
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'draft', $17, $18)
           RETURNING id, passport_number AS "passportNumber", submission_status AS "submissionStatus",
                     boi_application_id AS "boiApplicationId", created_at AS "createdAt"`,
          [
            user.tenantId,
            b.guestId,
            b.reservationId,
            b.passportNumber,
            b.passportCountry,
            b.passportIssueDate,
            b.passportExpiryDate,
            b.visaNumber,
            b.visaType,
            b.visaValidUntil,
            b.visaIssuePlace,
            b.arrivalDateInIndia,
            b.arrivedFromCityCountry,
            b.nextDestinationCityCountry,
            b.purposeOfVisit,
            b.employedInIndia,
            boiAppId,
            user.id,
          ],
        )
      ).rows[0];

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'form_c.create',
        entity: 'form_c',
        entityId: row.id,
        meta: { boiApplicationId: row.boiApplicationId, passportCountry: b.passportCountry },
      });

      return row;
    });
  }

  @Post('form-c/:id/submit')
  @RequirePermission(PERMISSIONS.FORM_C_MANAGE)
  async submitFormC(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `UPDATE guest_form_c
           SET submission_status = 'submitted_online', submitted_at = now(), submitted_by = $3
           WHERE id = $1 AND tenant_id = $2 AND property_id = $4
           RETURNING id, boi_application_id AS "boiApplicationId", submission_status AS "submissionStatus", submitted_at AS "submittedAt"`,
          [id, user.tenantId, user.id, user.propertyId],
        )
      ).rows[0];

      if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Form C record not found' });

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'form_c.submit',
        entity: 'form_c',
        entityId: id,
        meta: { boiApplicationId: row.boiApplicationId },
      });

      return row;
    });
  }

  @Get('police-report')
  @RequirePermission(PERMISSIONS.POLICE_REPORT_EXPORT)
  async getPoliceReport(
    @CurrentUser() user: AuthUser,
    @Query('date') reportDate?: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const targetDate = reportDate && dateRegex.test(reportDate) ? reportDate : new Date().toISOString().slice(0, 10);

      // In-house guests as of the report date (both primary guests and registered room companions)
      const inHouse = (
        await c.query(
          `SELECT ro.number AS "roomNumber", ro.floor, p.full_name AS "guestName", p.phone AS "guestPhone",
                  p.email AS "guestEmail", g.nationality, g.id_type AS "idType",
                  r.check_in AS "checkIn", r.check_out AS "checkOut", r.check_in_at AS "checkInAt",
                  r.status, p.address,
                  coalesce(rg.is_primary, true) AS "isPrimary"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id AND rg.tenant_id = r.tenant_id
           JOIN guests g ON g.id = coalesce(rg.guest_id, r.guest_id)
           JOIN parties p ON p.id = g.party_id
           WHERE r.tenant_id = $1 AND r.property_id = $2
             AND (
               ($3::date = current_date AND r.status = 'checked_in')
               OR ($3::date <> current_date AND r.check_in <= $3::date AND r.check_out >= $3::date AND r.status IN ('checked_in', 'checked_out'))
             )
           ORDER BY ro.number ASC, coalesce(rg.is_primary, true) DESC, p.full_name ASC`,
          [user.tenantId, user.propertyId, targetDate],
        )
      ).rows;

      // Arrivals on targetDate
      const arrivals = (
        await c.query(
          `SELECT DISTINCT ON (r.id, g.id)
                  ro.number AS "roomNumber", p.full_name AS "guestName", p.phone AS "guestPhone",
                  g.nationality, g.id_type AS "idType", r.check_in_at AS "checkInAt", r.status,
                  coalesce(rg.is_primary, true) AS "isPrimary"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id AND rg.tenant_id = r.tenant_id
           JOIN guests g ON g.id = coalesce(rg.guest_id, r.guest_id)
           JOIN parties p ON p.id = g.party_id
           WHERE r.tenant_id = $1 AND r.property_id = $2 AND r.check_in = $3::date
             AND r.status NOT IN ('cancelled', 'no_show')
           ORDER BY r.id, g.id, r.check_in_at ASC NULLS LAST`,
          [user.tenantId, user.propertyId, targetDate],
        )
      ).rows;

      // Departures on targetDate
      const departures = (
        await c.query(
          `SELECT DISTINCT ON (r.id, g.id)
                  ro.number AS "roomNumber", p.full_name AS "guestName", p.phone AS "guestPhone",
                  g.nationality, r.check_out_at AS "checkOutAt", r.status,
                  coalesce(rg.is_primary, true) AS "isPrimary"
           FROM reservations r
           JOIN rooms ro ON ro.id = r.room_id
           LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id AND rg.tenant_id = r.tenant_id
           JOIN guests g ON g.id = coalesce(rg.guest_id, r.guest_id)
           JOIN parties p ON p.id = g.party_id
           WHERE r.tenant_id = $1 AND r.property_id = $2 AND r.check_out = $3::date
             AND r.status NOT IN ('cancelled', 'no_show')
           ORDER BY r.id, g.id, r.check_out_at ASC NULLS LAST`,
          [user.tenantId, user.propertyId, targetDate],
        )
      ).rows;

      const property = (
        await c.query(`SELECT name, timezone, currency FROM properties WHERE tenant_id = $1 AND id = $2`, [user.tenantId, user.propertyId])
      ).rows[0];

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'police_report.export',
        entity: 'police_report',
        meta: { date: targetDate, inHouseCount: inHouse.length },
      });

      return {
        property: property ?? { name: 'Hotel Property', timezone: 'Asia/Kolkata', currency: 'INR' },
        reportDate: targetDate,
        generatedAt: new Date().toISOString(),
        isHistorical: targetDate !== new Date().toISOString().slice(0, 10),
        summary: {
          totalInHouse: inHouse.length,
          arrivalsToday: arrivals.length,
          departuresToday: departures.length,
        },
        inHouse,
        arrivals,
        departures,
      };
    });
  }
}
