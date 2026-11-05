import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { Public } from '../auth/public';
import { DbService } from '../db/db.service';
import { calculateGstTax } from './tax-calculator';

@Controller('public')
export class PublicBookingController {
  constructor(private readonly db: DbService) {}

  @Public()
  @Get('hotels/:slug')
  async getHotelBookingProfile(@Param('slug') slug: string) {
    // 1. Get tenant (tenants table is global)
    const tenantRes = await this.db.query(
      `SELECT id, slug, name, contact_email, contact_phone, currency FROM tenants WHERE slug = $1`,
      [slug],
    );
    if (!tenantRes.rows[0]) {
      throw new NotFoundException(`Hotel portfolio '${slug}' not found.`);
    }
    const tenant = tenantRes.rows[0];

    // 2. Use withTenant so RLS permits access to tenant's properties and room types
    return this.db.withTenant(tenant.id, null, async (c) => {
      const propRes = await c.query(
        `SELECT id, name, timezone, currency, is_default, status,
                upi_id AS "upiId", upi_merchant_name AS "upiMerchantName"
         FROM properties WHERE tenant_id = $1 AND status = 'active' ORDER BY is_default DESC, name ASC`,
        [tenant.id],
      );
      const properties = propRes.rows;
      if (properties.length === 0) {
        throw new NotFoundException(`No active properties found for this hotel.`);
      }

      const defaultProperty = properties[0];

      // 3. Get room types for default property
      const roomTypesRes = await c.query(
        `SELECT rt.id, rt.name, rt.base_rate::float8 as "baseRate", rt.capacity, rt.description,
                (SELECT count(*)::int FROM rooms ro WHERE ro.room_type_id = rt.id AND ro.property_id = $1) as "totalKeys"
         FROM room_types rt
         WHERE rt.property_id = $1
         ORDER BY rt.base_rate ASC`,
        [defaultProperty.id],
      );

      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          currency: tenant.currency ?? 'INR',
        },
        properties,
        activeProperty: defaultProperty,
        roomTypes: roomTypesRes.rows,
      };
    });
  }

  @Public()
  @Post('direct-booking')
  async createDirectBooking(
    @Body()
    body: {
      tenantSlug: string;
      propertyId?: string;
      roomTypeId: string;
      checkIn: string; // YYYY-MM-DD
      checkOut: string; // YYYY-MM-DD
      guestName: string;
      guestPhone: string;
      guestEmail?: string;
      specialRequests?: string;
      adults?: number;
    },
  ) {
    if (!body.tenantSlug || !body.roomTypeId || !body.checkIn || !body.checkOut || !body.guestName || !body.guestPhone) {
      throw new BadRequestException('Missing required booking fields.');
    }

    const tenantRes = await this.db.query(`SELECT id, slug, name, currency FROM tenants WHERE slug = $1`, [body.tenantSlug]);
    if (!tenantRes.rows[0]) throw new NotFoundException('Hotel portfolio not found.');
    const tenant = tenantRes.rows[0];

    return this.db.withTenant(tenant.id, body.propertyId ?? null, async (c) => {
      const propId = body.propertyId ?? (await c.query(`SELECT id FROM properties WHERE tenant_id = $1 AND status = 'active' ORDER BY is_default DESC LIMIT 1`, [tenant.id])).rows[0]?.id;
      if (!propId) throw new NotFoundException('No active property found.');

      const roomTypeRes = await c.query(`SELECT id, name, base_rate::float8 as "baseRate" FROM room_types WHERE id = $1 AND property_id = $2`, [body.roomTypeId, propId]);
      if (!roomTypeRes.rows[0]) throw new NotFoundException('Selected room type not found.');
      const roomType = roomTypeRes.rows[0];

      // Find available room using stay_time tstzrange overlap
      const availRoom = await c.query(
        `SELECT r.id, r.number FROM rooms r
         WHERE r.property_id = $1 AND r.room_type_id = $2 AND r.status != 'maintenance'
         AND NOT EXISTS (
           SELECT 1 FROM reservations res
           WHERE res.room_id = r.id
             AND res.status IN ('reserved', 'checked_in')
             AND res.stay_time && tstzrange(($3::text || ' 14:00 Asia/Kolkata')::timestamptz, ($4::text || ' 11:00 Asia/Kolkata')::timestamptz, '[)')
         )
         LIMIT 1`,
        [propId, body.roomTypeId, body.checkIn, body.checkOut],
      );

      if (!availRoom.rows[0]) {
        throw new BadRequestException('Sorry, all rooms of this type are fully booked for your selected dates. Please choose different dates or suite category.');
      }

      const room = availRoom.rows[0];

      // Calculate nights & amount
      const dIn = new Date(body.checkIn);
      const dOut = new Date(body.checkOut);
      const nights = Math.max(1, Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24)));
      const roomSubtotal = roomType.baseRate * nights;
      const tax = calculateGstTax('ACCOMMODATION', roomType.baseRate, nights);
      const grossTotal = Math.round(tax.lineTotal);

      // 1. Party & Guest
      let partyId: string;
      const existingParty = await c.query(
        `SELECT p.id FROM parties p
         WHERE regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
         LIMIT 1`,
        [body.guestPhone],
      );

      if (existingParty.rows[0]) {
        partyId = existingParty.rows[0].id;
      } else {
        const pRes = await c.query(
          `INSERT INTO parties (tenant_id, full_name, phone, email)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [tenant.id, body.guestName.trim(), body.guestPhone.trim(), body.guestEmail?.trim() || null],
        );
        partyId = pRes.rows[0].id;
      }

      let guestId: string;
      const existingGuest = await c.query(`SELECT id FROM guests WHERE tenant_id = $1 AND party_id = $2`, [tenant.id, partyId]);
      if (existingGuest.rows[0]) {
        guestId = existingGuest.rows[0].id;
      } else {
        const gRes = await c.query(
          `INSERT INTO guests (tenant_id, party_id) VALUES ($1, $2) RETURNING id`,
          [tenant.id, partyId],
        );
        guestId = gRes.rows[0].id;
      }

      // 2. Reservation
      const resCode = 'BK-' + Math.floor(100000 + Math.random() * 900000);
      const resInsert = await c.query(
        `INSERT INTO reservations (
           tenant_id, property_id, room_id, guest_id, check_in, check_out,
           check_in_at, check_out_at, status, total_amount, booking_source, ota_booking_id
         )
         VALUES (
           $1, $2, $3, $4, $5::date, $6::date,
           ($5::text || ' 14:00 Asia/Kolkata')::timestamptz, ($6::text || ' 11:00 Asia/Kolkata')::timestamptz,
           'reserved', $7, 'direct', $8
         )
         RETURNING id, check_in::text as "checkIn", check_out::text as "checkOut"`,
        [
          tenant.id,
          propId,
          room.id,
          guestId,
          body.checkIn,
          body.checkOut,
          grossTotal,
          resCode,
        ],
      );
      const reservation = resInsert.rows[0];

      // 3. Link reservation guest
      await c.query(
        `INSERT INTO reservation_guests (tenant_id, reservation_id, guest_id, is_primary)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (tenant_id, reservation_id, guest_id) DO NOTHING`,
        [tenant.id, reservation.id, guestId],
      );

      // 4. Folio
      await c.query(
        `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, currency, status, total, subtotal, tax_total)
         VALUES ($1, $2, $3, $4, 'open', $5, $6, $7)
         ON CONFLICT (tenant_id, reservation_id) DO NOTHING`,
        [tenant.id, propId, reservation.id, tenant.currency ?? 'INR', grossTotal, roomSubtotal, tax.taxTotal],
      );

      return {
        bookingReference: resCode,
        reservationId: reservation.id,
        hotelName: tenant.name,
        roomNumber: room.number,
        roomType: roomType.name,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        currency: tenant.currency ?? 'INR',
        baseRate: roomType.baseRate,
        subtotal: roomSubtotal,
        gstRate: tax.cgstRate + tax.sgstRate + tax.igstRate,
        taxTotal: tax.taxTotal,
        grossTotal,
        status: 'Confirmed (Reserved)',
      };
    });
  }
}
