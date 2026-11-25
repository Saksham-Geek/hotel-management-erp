import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSIONS } from '@erp/shared';
import { AuthUser, CurrentUser } from '../common/current-user';
import { DbService } from '../db/db.service';
import { RequirePermission } from '../common/permission-guard';

@Controller('hotel/banquets')
export class BanquetsController {
  constructor(private readonly db: DbService) {}

  @Get('venues')
  @RequirePermission(PERMISSIONS.BANQUET_VIEW)
  async getVenues(@CurrentUser() user: AuthUser) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `select id, name, type, max_pax as "maxPax",
                base_rental_rate::float8 as "baseRentalRate",
                amenities, is_active as "isActive", created_at as "createdAt"
         from banquet_venues
         where property_id = $1
         order by name asc`,
        [user.propertyId],
      );
      return res.rows;
    });
  }

  @Post('venues')
  @RequirePermission(PERMISSIONS.BANQUET_MANAGE)
  async createVenue(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      type: string;
      maxPax: number;
      baseRentalRate: number;
      amenities?: string[];
    },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('Venue name is required.');
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `insert into banquet_venues (
           tenant_id, property_id, name, type, max_pax, base_rental_rate, amenities
         ) values ($1, $2, $3, $4, $5, $6, $7)
         returning id, name, type, max_pax as "maxPax",
                   base_rental_rate::float8 as "baseRentalRate",
                   amenities, is_active as "isActive"`,
        [
          user.tenantId,
          user.propertyId,
          body.name.trim(),
          body.type || 'BANQUET_HALL',
          Number(body.maxPax) || 100,
          Number(body.baseRentalRate) || 0,
          body.amenities || [],
        ],
      );
      return { success: true, venue: res.rows[0] };
    });
  }

  @Patch('venues/:id')
  @RequirePermission(PERMISSIONS.BANQUET_MANAGE)
  async updateVenue(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      type?: string;
      maxPax?: number;
      baseRentalRate?: number;
      amenities?: string[];
      isActive?: boolean;
    },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const updates: string[] = [];
      const params: any[] = [id, user.propertyId];

      if (body.name) {
        params.push(body.name.trim());
        updates.push(`name = $${params.length}`);
      }
      if (body.type) {
        params.push(body.type);
        updates.push(`type = $${params.length}`);
      }
      if (body.maxPax !== undefined) {
        params.push(Number(body.maxPax));
        updates.push(`max_pax = $${params.length}`);
      }
      if (body.baseRentalRate !== undefined) {
        params.push(Number(body.baseRentalRate));
        updates.push(`base_rental_rate = $${params.length}`);
      }
      if (body.amenities !== undefined) {
        params.push(body.amenities);
        updates.push(`amenities = $${params.length}`);
      }
      if (body.isActive !== undefined) {
        params.push(body.isActive);
        updates.push(`is_active = $${params.length}`);
      }

      if (!updates.length) throw new BadRequestException('No fields to update.');

      const res = await c.query(
        `update banquet_venues set ${updates.join(', ')} where id = $1 and property_id = $2 returning id, name, is_active as "isActive"`,
        params,
      );
      if (!res.rowCount) throw new NotFoundException('Venue not found.');
      return { success: true, venue: res.rows[0] };
    });
  }

  @Delete('venues/:id')
  @RequirePermission(PERMISSIONS.BANQUET_MANAGE)
  async deleteVenue(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const res = await c.query(
        `update banquet_venues set is_active = false where id = $1 and property_id = $2 returning name`,
        [id, user.propertyId],
      );
      if (!res.rowCount) throw new NotFoundException('Venue not found.');
      return { success: true, message: `Venue "${res.rows[0].name}" deactivated.` };
    });
  }

  @Get('bookings')
  @RequirePermission(PERMISSIONS.BANQUET_VIEW)
  async getBookings(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let query = `
        select b.id, b.venue_id as "venueId", v.name as "venueName", v.type as "venueType",
               b.booking_number as "bookingNumber", b.event_name as "eventName",
               b.client_name as "clientName", b.client_phone as "clientPhone", b.client_email as "clientEmail",
               b.event_date as "eventDate", b.slot, b.pax_count as "paxCount",
               b.menu_package as "menuPackage", b.rate_per_pax::float8 as "ratePerPax",
               b.hall_rental::float8 as "hallRental", b.decor_av_charges::float8 as "decorAvCharges",
               b.total_amount::float8 as "totalAmount", b.advance_paid::float8 as "advancePaid",
               (b.total_amount - b.advance_paid)::float8 as "balanceDue",
               b.status, b.special_instructions as "specialInstructions",
               b.created_at as "createdAt"
        from banquet_bookings b
        join banquet_venues v on v.id = b.venue_id
        where b.property_id = $1
      `;
      const params: any[] = [user.propertyId];

      if (startDate) {
        params.push(startDate);
        query += ` and b.event_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` and b.event_date <= $${params.length}`;
      }
      if (status && status !== 'ALL') {
        params.push(status);
        query += ` and b.status = $${params.length}`;
      }

      query += ` order by b.event_date asc, b.slot asc`;

      const res = await c.query(query, params);
      return res.rows;
    });
  }

  @Post('bookings')
  @RequirePermission(PERMISSIONS.BANQUET_MANAGE)
  async createBooking(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      venueId: string;
      eventName: string;
      clientName: string;
      clientPhone: string;
      clientEmail?: string;
      eventDate: string;
      slot: 'MORNING' | 'EVENING' | 'FULL_DAY';
      paxCount: number;
      menuPackage: string;
      ratePerPax: number;
      hallRental?: number;
      decorAvCharges?: number;
      advancePaid?: number;
      status?: string;
      specialInstructions?: string;
    },
  ) {
    if (!body?.venueId) throw new BadRequestException('Venue selection is required.');
    if (!body?.eventName?.trim()) throw new BadRequestException('Event title/name is required.');
    if (!body?.clientName?.trim()) throw new BadRequestException('Client/Host name is required.');
    if (!body?.clientPhone?.trim()) throw new BadRequestException('Client contact phone is required.');
    if (!body?.eventDate) throw new BadRequestException('Event date is required.');

    const pax = Number(body.paxCount) || 50;
    const ratePerPax = Number(body.ratePerPax) || 0;
    const hallRental = Number(body.hallRental) || 0;
    const decorAvCharges = Number(body.decorAvCharges) || 0;
    const totalAmount = pax * ratePerPax + hallRental + decorAvCharges;
    const advancePaid = Number(body.advancePaid) || 0;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      // Check slot conflict on that venue & date
      const conflictRes = await c.query(
        `select id, event_name from banquet_bookings
         where venue_id = $1 and event_date = $2 and status != 'CANCELLED'
           and (slot = $3 or slot = 'FULL_DAY' or $3 = 'FULL_DAY')`,
        [body.venueId, body.eventDate, body.slot || 'EVENING'],
      );
      if (conflictRes.rowCount && conflictRes.rowCount > 0) {
        throw new BadRequestException(
          `Slot conflict: "${conflictRes.rows[0].event_name}" is already booked for this venue and time slot.`,
        );
      }

      // Generate Booking #
      const dateStr = body.eventDate.replace(/-/g, '').slice(0, 6);
      const countRes = await c.query(
        `select count(id) from banquet_bookings where property_id = $1 and event_date = $2`,
        [user.propertyId, body.eventDate],
      );
      const seq = Number(countRes.rows[0]?.count || 0) + 1;
      const bookingNumber = `BQT-${dateStr}-${String(seq).padStart(3, '0')}`;

      const res = await c.query(
        `insert into banquet_bookings (
           tenant_id, property_id, venue_id, booking_number, event_name,
           client_name, client_phone, client_email, event_date, slot,
           pax_count, menu_package, rate_per_pax, hall_rental, decor_av_charges,
           total_amount, advance_paid, status, special_instructions
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         returning id, booking_number as "bookingNumber", event_name as "eventName",
                   event_date as "eventDate", slot, pax_count as "paxCount",
                   total_amount::float8 as "totalAmount", advance_paid::float8 as "advancePaid",
                   status`,
        [
          user.tenantId,
          user.propertyId,
          body.venueId,
          bookingNumber,
          body.eventName.trim(),
          body.clientName.trim(),
          body.clientPhone.trim(),
          body.clientEmail?.trim() || null,
          body.eventDate,
          body.slot || 'EVENING',
          pax,
          body.menuPackage || 'Standard Buffet',
          ratePerPax,
          hallRental,
          decorAvCharges,
          totalAmount,
          advancePaid,
          body.status || 'CONFIRMED',
          body.specialInstructions?.trim() || null,
        ],
      );

      return {
        success: true,
        booking: res.rows[0],
        message: `Banquet event ${bookingNumber} booked successfully.`,
      };
    });
  }

  @Patch('bookings/:id')
  @RequirePermission(PERMISSIONS.BANQUET_MANAGE)
  async updateBooking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      advancePaid?: number;
      specialInstructions?: string;
    },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const updates: string[] = [];
      const params: any[] = [id, user.propertyId];

      if (body.status) {
        params.push(body.status);
        updates.push(`status = $${params.length}`);
      }
      if (body.advancePaid !== undefined) {
        params.push(Number(body.advancePaid));
        updates.push(`advance_paid = $${params.length}`);
      }
      if (body.specialInstructions !== undefined) {
        params.push(body.specialInstructions);
        updates.push(`special_instructions = $${params.length}`);
      }

      if (!updates.length) throw new BadRequestException('No fields to update');

      const res = await c.query(
        `update banquet_bookings set ${updates.join(', ')} where id = $1 and property_id = $2 returning id, status, advance_paid::float8 as "advancePaid"`,
        params,
      );
      if (!res.rowCount) throw new NotFoundException('Banquet booking not found');
      return { success: true, booking: res.rows[0] };
    });
  }

  @Get('bookings/:id/fp')
  @RequirePermission(PERMISSIONS.BANQUET_VIEW)
  async getFunctionProspectus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const propRes = await c.query(`select name, timezone, currency from properties where id = $1`, [user.propertyId]);
      const property = propRes.rows[0];

      const res = await c.query(
        `select b.*, v.name as venue_name, v.type as venue_type, v.amenities as venue_amenities
         from banquet_bookings b
         join banquet_venues v on v.id = b.venue_id
         where b.id = $1 and b.property_id = $2`,
        [id, user.propertyId],
      );
      if (!res.rowCount) throw new NotFoundException('Banquet booking not found');
      const b = res.rows[0];

      return {
        hotelName: property?.name || 'Hotel Grand Azure',
        bookingNumber: b.booking_number,
        eventName: b.event_name,
        clientName: b.client_name,
        clientPhone: b.client_phone,
        clientEmail: b.client_email,
        venueName: b.venue_name,
        venueType: b.venue_type,
        eventDate: b.event_date,
        slot: b.slot,
        paxCount: b.pax_count,
        menuPackage: b.menu_package,
        ratePerPax: Number(b.rate_per_pax),
        hallRental: Number(b.hall_rental),
        decorAvCharges: Number(b.decor_av_charges),
        totalAmount: Number(b.total_amount),
        advancePaid: Number(b.advance_paid),
        balanceDue: Number(b.total_amount) - Number(b.advance_paid),
        status: b.status,
        specialInstructions: b.special_instructions,
        venueAmenities: b.venue_amenities,
        generatedAt: new Date().toISOString(),
      };
    });
  }
}
