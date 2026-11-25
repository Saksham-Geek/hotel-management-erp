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

  @Public()
  @Get('room-service/:tenantSlug/:roomNumber')
  async getRoomServiceProfile(
    @Param('tenantSlug') tenantSlug: string,
    @Param('roomNumber') roomNumber: string,
  ) {
    const tenantRes = await this.db.query(
      `SELECT id, slug, name, currency FROM tenants WHERE slug = $1`,
      [tenantSlug],
    );
    if (!tenantRes.rows[0]) {
      throw new NotFoundException(`Hotel portfolio '${tenantSlug}' not found.`);
    }
    const tenant = tenantRes.rows[0];

    return this.db.withTenant(tenant.id, null, async (c) => {
      const propRes = await c.query(
        `SELECT id, name FROM properties WHERE tenant_id = $1 AND status = 'active' ORDER BY is_default DESC LIMIT 1`,
        [tenant.id]
      );
      if (!propRes.rows[0]) throw new NotFoundException('Active property not found.');
      const property = propRes.rows[0];

      const roomRes = await c.query(
        `SELECT id, number, floor FROM rooms WHERE tenant_id = $1 AND property_id = $2 AND number = $3`,
        [tenant.id, property.id, roomNumber]
      );
      if (!roomRes.rows[0]) {
        throw new NotFoundException(`Room ${roomNumber} not found in this hotel.`);
      }
      const room = roomRes.rows[0];

      const stayRes = await c.query(
        `SELECT r.id, r.check_in as "checkIn", r.check_out as "checkOut", p.full_name as "guestName", p.phone as "guestPhone"
         FROM reservations r
         JOIN guests g ON g.id = r.guest_id
         JOIN parties p ON p.id = g.party_id
         WHERE r.tenant_id = $1 AND r.property_id = $2 AND r.room_id = $3 AND r.status = 'checked_in'
         ORDER BY r.check_in_at DESC LIMIT 1`,
        [tenant.id, property.id, room.id]
      );

      const activeStay = stayRes.rows[0] || null;

      const catRes = await c.query(
        `SELECT id, name FROM menu_categories WHERE property_id = $1 ORDER BY sort_order ASC, name ASC`,
        [property.id]
      );
      const itemsRes = await c.query(
        `SELECT id, category_id as "categoryId", name, item_code as "itemCode",
                description, price::float8, food_type as "foodType", gst_rate::float8 as "gstRate"
         FROM menu_items
         WHERE property_id = $1 AND is_available = true
         ORDER BY name ASC`,
        [property.id]
      );

      const categories = catRes.rows.map((cat: any) => ({
        ...cat,
        items: itemsRes.rows.filter((it: any) => it.categoryId === cat.id),
      }));

      return {
        hotelName: tenant.name,
        currency: tenant.currency ?? 'INR',
        roomNumber: room.number,
        floor: room.floor,
        hasActiveStay: !!activeStay,
        guestName: activeStay?.guestName ?? null,
        reservationId: activeStay?.id ?? null,
        categories,
      };
    });
  }

  @Public()
  @Post('room-service/order')
  async placeRoomServiceOrder(
    @Body()
    body: {
      tenantSlug: string;
      roomNumber: string;
      items: Array<{ menuItemId: string; quantity: number; specialNotes?: string }>;
      guestInstructions?: string;
    },
  ) {
    if (!body?.tenantSlug || !body?.roomNumber || !Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('Missing required fields or empty item cart.');
    }

    const tenantRes = await this.db.query(
      `SELECT id, slug, name, currency FROM tenants WHERE slug = $1`,
      [body.tenantSlug],
    );
    if (!tenantRes.rows[0]) throw new NotFoundException('Hotel portfolio not found.');
    const tenant = tenantRes.rows[0];

    return this.db.withTenant(tenant.id, null, async (c) => {
      const propRes = await c.query(
        `SELECT id, name FROM properties WHERE tenant_id = $1 AND status = 'active' ORDER BY is_default DESC LIMIT 1`,
        [tenant.id]
      );
      const property = propRes.rows[0];

      const roomRes = await c.query(
        `SELECT id, number FROM rooms WHERE tenant_id = $1 AND property_id = $2 AND number = $3`,
        [tenant.id, property.id, body.roomNumber]
      );
      if (!roomRes.rows[0]) throw new NotFoundException(`Room ${body.roomNumber} not found.`);
      const room = roomRes.rows[0];

      const stayRes = await c.query(
        `SELECT r.id, p.full_name as "guestName"
         FROM reservations r
         JOIN guests g ON g.id = r.guest_id
         JOIN parties p ON p.id = g.party_id
         WHERE r.tenant_id = $1 AND r.property_id = $2 AND r.room_id = $3 AND r.status = 'checked_in'
         ORDER BY r.check_in_at DESC LIMIT 1`,
        [tenant.id, property.id, room.id]
      );

      if (!stayRes.rows[0]) {
        throw new BadRequestException('Room is not currently occupied by an active checked-in guest.');
      }
      const stay = stayRes.rows[0];

      const outletRes = await c.query(
        `SELECT id, name FROM restaurant_outlets WHERE property_id = $1 ORDER BY (case when outlet_type = 'room_service' then 0 else 1 end) LIMIT 1`,
        [property.id]
      );
      const outlet = outletRes.rows[0];

      const itemIds = body.items.map((i) => i.menuItemId);
      const dbItemsRes = await c.query(
        `SELECT id, name, price::float8, gst_rate::float8 as "gstRate", food_type as "foodType", sac_code as "sacCode"
         FROM menu_items WHERE id = ANY($1::uuid[]) AND property_id = $2`,
        [itemIds, property.id]
      );
      const dbItemsMap = new Map<string, any>();
      for (const it of dbItemsRes.rows) {
        dbItemsMap.set(it.id, it);
      }

      let subtotal = 0;
      let totalGst = 0;
      const orderItemsToInsert: any[] = [];

      for (const reqItem of body.items) {
        const item = dbItemsMap.get(reqItem.menuItemId);
        if (!item) continue;
        const qty = Math.max(1, Number(reqItem.quantity) || 1);
        const linePrice = item.price * qty;
        const gstAmount = linePrice * (item.gstRate / 100);

        subtotal += linePrice;
        totalGst += gstAmount;

        orderItemsToInsert.push({
          menuItemId: item.id,
          itemName: item.name,
          quantity: qty,
          unitPrice: item.price,
          gstRate: item.gstRate,
          foodType: item.foodType,
          specialNotes: reqItem.specialNotes || null,
        });
      }

      const totalAmount = Math.round((subtotal + totalGst) * 100) / 100;
      const kotNumber = `RS-${body.roomNumber}-${Date.now().toString().slice(-4)}`;

      const kotInsert = await c.query(
        `INSERT INTO kot_orders (
           tenant_id, property_id, outlet_id, room_id, reservation_id, kot_number,
           order_type, status, payment_status, guest_name, subtotal, tax_amount, total_amount,
           special_instructions, round_number
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'room_service', 'pending', 'charged_to_room', $7, $8, $9, $10, $11, 1)
         RETURNING id, kot_number as "kotNumber"`,
        [
          tenant.id,
          property.id,
          outlet?.id || null,
          room.id,
          stay.id,
          kotNumber,
          stay.guestName,
          subtotal,
          totalGst,
          totalAmount,
          body.guestInstructions || null,
        ]
      );
      const kot = kotInsert.rows[0];

      for (const oi of orderItemsToInsert) {
        await c.query(
          `INSERT INTO kot_order_items (
             order_id, menu_item_id, item_name, quantity, unit_price, gst_rate, food_type, special_notes, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued')`,
          [kot.id, oi.menuItemId, oi.itemName, oi.quantity, oi.unitPrice, oi.gstRate, oi.foodType, oi.specialNotes]
        );

        // Auto-deplete raw materials if recipes configured
        if (oi.menuItemId) {
          const recRes = await c.query(
            `SELECT raw_material_id, quantity_per_portion FROM dish_recipes WHERE property_id = $1 AND menu_item_id = $2`,
            [property.id, oi.menuItemId]
          );
          for (const rec of recRes.rows) {
            const consumed = Number(rec.quantity_per_portion) * oi.quantity;
            await c.query(
              `UPDATE raw_materials
               SET current_stock = GREATEST(0, current_stock - $1), updated_at = now()
               WHERE id = $2 AND property_id = $3`,
              [consumed, rec.raw_material_id, property.id]
            );
            await c.query(
              `INSERT INTO stock_movements (tenant_id, property_id, raw_material_id, movement_type, quantity, reference_id, notes)
               VALUES ($1, $2, $3, 'CONSUMPTION', $4, $5, $6)`,
              [tenant.id, property.id, rec.raw_material_id, consumed, kotNumber, `Room service ${oi.quantity}x ${oi.itemName}`]
            );
          }
        }
      }

      const folioRes = await c.query(
        `SELECT id FROM reservation_folios WHERE tenant_id = $1 AND reservation_id = $2 AND status = 'open' LIMIT 1`,
        [tenant.id, stay.id]
      );

      if (folioRes.rows[0]) {
        const folioId = folioRes.rows[0].id;
        const cgst = Math.round((totalGst / 2) * 100) / 100;
        const sgst = totalGst - cgst;

        await c.query(
          `INSERT INTO folio_items (
             tenant_id, folio_id, description, quantity, unit_price, tax_rate, line_total,
             tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount, is_interstate
           )
           VALUES ($1, $2, $3, 1, $4, 5.0, $5, 'FNB', '996331', $6, $7, 0, false)`,
          [tenant.id, folioId, `In-Room Dining (KOT #${kotNumber})`, subtotal, totalAmount, cgst, sgst]
        );

        await c.query(
          `UPDATE reservation_folios SET
             subtotal = subtotal + $1,
             tax_total = tax_total + $2,
             total = total + $3
           WHERE id = $4`,
          [subtotal, totalGst, totalAmount, folioId]
        );
      }

      return {
        success: true,
        orderId: kot.id,
        kotNumber: kot.kotNumber,
        roomNumber: body.roomNumber,
        guestName: stay.guestName,
        itemCount: orderItemsToInsert.length,
        subtotal,
        totalGst,
        totalAmount,
        estimatedMinutes: 25,
        message: `Order #${kot.kotNumber} placed successfully! Routed to kitchen and charged to Room ${body.roomNumber} folio.`,
      };
    });
  }

  // -----------------------------------------------------------------
  // Database-Backed Ephemeral KYC Bridge Sessions (Clustered & Multi-Instance Safe)
  // -----------------------------------------------------------------
  @Public()
  @Post('kyc-bridge/create')
  async createKycBridgeSession() {
    // Purge expired sessions
    await this.db.query(`DELETE FROM kyc_bridge_sessions WHERE expires_at < now() OR status = 'claimed'`);

    const sessionCode = (await this.db.query(
      `INSERT INTO kyc_bridge_sessions (session_code, status, expires_at)
       VALUES (gen_random_uuid()::text, 'pending', now() + interval '10 minutes')
       RETURNING session_code AS "id",
                 extract(epoch from created_at)*1000 AS "createdAt",
                 extract(epoch from expires_at)*1000 AS "expiresAt",
                 status`,
    )).rows[0];

    return {
      id: sessionCode.id,
      createdAt: Number(sessionCode.createdAt),
      expiresAt: Number(sessionCode.expiresAt),
      status: sessionCode.status,
    };
  }

  @Public()
  @Get('kyc-bridge/:sessionId')
  async getKycBridgeSession(@Param('sessionId') sessionId: string) {
    const row = (
      await this.db.query(
        `SELECT session_code AS "id", status, data,
                extract(epoch from created_at)*1000 AS "createdAt",
                extract(epoch from expires_at)*1000 AS "expiresAt"
         FROM kyc_bridge_sessions
         WHERE session_code = $1 AND expires_at > now()`,
        [sessionId],
      )
    ).rows[0];

    if (!row) {
      return { status: 'expired', message: 'Bridge session has expired or does not exist.' };
    }

    return {
      id: row.id,
      status: row.status,
      data: row.data,
      expiresAt: Number(row.expiresAt),
    };
  }

  @Public()
  @Post('kyc-bridge/:sessionId/upload')
  async uploadToKycBridgeSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { fileName: string; mimeType: string; base64: string; fileSize: number },
  ) {
    const res = await this.db.query(
      `UPDATE kyc_bridge_sessions
       SET status = 'uploaded',
           data = $2::jsonb
       WHERE session_code = $1 AND status = 'pending' AND expires_at > now()
       RETURNING session_code`,
      [sessionId, JSON.stringify({ ...body, uploadedAt: Date.now() })],
    );

    if (res.rowCount === 0) {
      throw new BadRequestException('Session is invalid, already used, or expired.');
    }

    return { success: true };
  }

  @Public()
  @Post('kyc-bridge/:sessionId/claim')
  async claimKycBridgeSession(@Param('sessionId') sessionId: string) {
    const res = (
      await this.db.query(
        `UPDATE kyc_bridge_sessions
         SET status = 'claimed'
         WHERE session_code = $1 AND status = 'uploaded' AND expires_at > now()
         RETURNING data`,
        [sessionId],
      )
    ).rows[0];

    if (!res || !res.data) {
      throw new NotFoundException('No uploaded data found or session already claimed.');
    }

    // Delete claimed session immediately
    await this.db.query(`DELETE FROM kyc_bridge_sessions WHERE session_code = $1`, [sessionId]);

    return { success: true, data: res.data };
  }
}
