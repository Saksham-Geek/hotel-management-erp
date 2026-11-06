import '../load-env';
import { Client } from 'pg';
import { calculateGstTax } from '../hotel/tax-calculator';
import { encryptSensitiveField } from '../common/field-encryption';

/**
 * Comprehensive Testing Seed:
 * Populates all hospitality variations into tenant 'grand-azure':
 * - 10 distinct reservation & stay variations (Walk-in, High-value Cash, OTAs, BoI Form C, Corporate B2B, Hourly, VIP, Cancelled, Checked-Out)
 * - Folios with Itemized Accommodation (12% / 18%), F&B Dining (5%), Laundry (18%), Spa (18%), Incidentals
 * - Payments via UPI, Section 269ST Cash (<2L), Rule 114B PAN Cash (>50k), POS Card, Corporate Ledger
 * - Sequential Statutory Indian Tax Invoices (B2C and B2B with GSTIN)
 * - Corporate Accounts Receivable with Credit Limits & Aging
 * - Foreign Guest Bureau of Immigration (BoI) Form C records
 * - OTA Channels (MakeMyTrip, Booking.com, Agoda) with ARI push & sync logs
 * - Room status board (Available, Occupied, Cleaning, Maintenance)
 */
async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) throw new Error('DATABASE_ADMIN_URL is required');

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    await client.query('begin');

    // 1. Fetch Tenant & Property - Target Grand Azure Hotel Specifically
    const t = await client.query(`SELECT id FROM tenants WHERE slug = 'grand-azure'`);
    if (!t.rows.length) throw new Error('Tenant grand-azure not found. Run standard seed first.');
    const tenantId: string = t.rows[0].id;
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    const p = await client.query(
      `SELECT id, name FROM properties WHERE tenant_id = $1 AND name ILIKE '%Grand Azure%' LIMIT 1`,
      [tenantId],
    );
    if (!p.rows.length) throw new Error('Grand Azure Hotel property not found');
    const propertyId: string = p.rows[0].id;
    console.log(`Targeting Primary Hotel: ${p.rows[0].name} (${propertyId})`);
    await client.query("SELECT set_config('app.property_id', $1, true)", [propertyId]);

    // Upgrade subscription to Enterprise so all features are unlocked
    await client.query(
      `INSERT INTO property_subscriptions (tenant_id, property_id, plan_key, status)
       VALUES ($1, $2, 'enterprise', 'active')
       ON CONFLICT (tenant_id, property_id)
       DO UPDATE SET plan_key = 'enterprise', status = 'active'`,
      [tenantId, propertyId],
    );

    // Initialize business date to 2026-11-02
    await client.query(
      `INSERT INTO hotel_business_dates (tenant_id, property_id, current_business_date)
       VALUES ($1, $2, '2026-11-02')
       ON CONFLICT (tenant_id, property_id)
       DO UPDATE SET current_business_date = '2026-11-02'`,
      [tenantId, propertyId],
    );

    // 2. Configure Room Types
    const roomTypesData = [
      ['Standard', 3200, 2, 'Air-conditioned room with queen bed, ensuite bath, and city view (12% GST slab)'],
      ['Deluxe', 5500, 3, 'Spacious room with king bed, workspace, and garden view (12% GST slab)'],
      ['Executive Suite', 9500, 4, 'Luxury living room & bedroom suite with balcony (18% Luxury GST slab)'],
      ['Presidential Palace Suite', 18000, 6, 'Royal duplex suite with private dining, Jacuzzi, and butler service (18% Luxury GST slab)'],
    ];

    for (const [name, rate, cap, desc] of roomTypesData) {
      await client.query(
        `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, property_id, name)
         DO UPDATE SET base_rate = excluded.base_rate, capacity = excluded.capacity, description = excluded.description`,
        [tenantId, propertyId, name, rate, cap, desc],
      );
    }

    const rtRes = await client.query(`SELECT id, name, base_rate FROM room_types WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    const rtMap = new Map(rtRes.rows.map((r) => [r.name, r]));

    // 3. Configure Rooms with Realistic Statuses
    const roomsToSeed = [
      // Floor 1 (Standard & Deluxe)
      { number: '101', floor: 1, type: 'Standard', status: 'occupied' },
      { number: '102', floor: 1, type: 'Standard', status: 'occupied' },
      { number: '103', floor: 1, type: 'Standard', status: 'cleaning' },
      { number: '104', floor: 1, type: 'Deluxe', status: 'occupied' },
      { number: '105', floor: 1, type: 'Deluxe', status: 'maintenance' },
      { number: '106', floor: 1, type: 'Deluxe', status: 'occupied' },
      // Floor 2 (Deluxe)
      { number: '201', floor: 2, type: 'Deluxe', status: 'occupied' },
      { number: '202', floor: 2, type: 'Deluxe', status: 'occupied' },
      { number: '203', floor: 2, type: 'Deluxe', status: 'occupied' },
      { number: '204', floor: 2, type: 'Deluxe', status: 'available' },
      { number: '205', floor: 2, type: 'Deluxe', status: 'occupied' },
      { number: '206', floor: 2, type: 'Deluxe', status: 'cleaning' },
      // Floor 3 (Suites)
      { number: '301', floor: 3, type: 'Executive Suite', status: 'occupied' },
      { number: '302', floor: 3, type: 'Executive Suite', status: 'available' },
      { number: '303', floor: 3, type: 'Executive Suite', status: 'available' },
      { number: '304', floor: 3, type: 'Presidential Palace Suite', status: 'occupied' },
      { number: '305', floor: 3, type: 'Presidential Palace Suite', status: 'available' },
      { number: '306', floor: 3, type: 'Presidential Palace Suite', status: 'available' },
    ];

    for (const rm of roomsToSeed) {
      const typeInfo = rtMap.get(rm.type);
      if (!typeInfo) continue;
      await client.query(
        `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, property_id, number)
         DO UPDATE SET room_type_id = excluded.room_type_id, floor = excluded.floor, status = excluded.status`,
        [tenantId, propertyId, typeInfo.id, rm.number, rm.floor, rm.status],
      );
    }

    const roomsRes = await client.query(`SELECT id, number FROM rooms WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    const roomMap = new Map(roomsRes.rows.map((r) => [r.number, r.id]));

    // 4. Seed Corporate Accounts (City Ledger)
    const corporateData = [
      {
        name: 'Tata Consultancy Services Ltd',
        gstin: '27AAACT2727Q1ZW',
        pan: 'AAACT2727Q',
        contact: 'Nandita Iyer (Travel Desk)',
        email: 'traveldesk@tcs.test',
        phone: '+91 22 6778 9999',
        limit: 1000000,
        days: 30,
      },
      {
        name: 'Infosys BPM Technologies Ltd',
        gstin: '29AAACI4321A1ZG',
        pan: 'AAACI4321A',
        contact: 'Gaurav Kulkarni',
        email: 'travel@infosys.test',
        phone: '+91 80 2852 0261',
        limit: 800000,
        days: 45,
      },
      {
        name: 'Reliance Industries Hospitality Services',
        gstin: '24AAACR5055K1Z1',
        pan: 'AAACR5055K',
        contact: 'Amit Singhal',
        email: 'corporate.travel@ril.test',
        phone: '+91 22 3555 5000',
        limit: 1500000,
        days: 60,
      },
      {
        name: 'Wipro Technologies Ltd',
        gstin: '29AAACW1234A1Z5',
        pan: 'AAACW1234A',
        contact: 'Pooja Hegde (Corporate Travel)',
        email: 'travel@wipro.test',
        phone: '+91 80 2844 0011',
        limit: 1200000,
        days: 45,
      },
    ];

    for (const corp of corporateData) {
      await client.query(
        `INSERT INTO corporate_accounts (
           tenant_id, property_id, company_name, gstin, pan_number, contact_person,
           contact_email, contact_phone, credit_limit, credit_period_days, billing_address
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (tenant_id, property_id, company_name)
         DO UPDATE SET gstin = excluded.gstin, credit_limit = excluded.credit_limit`,
        [
          tenantId,
          propertyId,
          corp.name,
          corp.gstin,
          corp.pan,
          corp.contact,
          corp.email,
          corp.phone,
          corp.limit,
          corp.days,
          JSON.stringify({ address: 'Corporate Tower 4, BKC', city: 'Mumbai', state: 'Maharashtra', pin: '400051' }),
        ],
      );
    }

    // Clean prior test reservations and rogue rooms to ensure pristine reproducible entries
    await client.query(`DELETE FROM tax_invoices WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    await client.query(`DELETE FROM folio_payments WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    await client.query(`DELETE FROM folio_items WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    await client.query(`DELETE FROM reservation_folios WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    await client.query(`DELETE FROM guest_form_c WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    await client.query(`DELETE FROM reservation_guests WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM reservations WHERE tenant_id = $1 AND property_id = $2`, [tenantId, propertyId]);
    await client.query(
      `DELETE FROM rooms WHERE tenant_id = $1 AND property_id = $2 AND number NOT IN ('101','102','103','104','105','106','201','202','203','204','205','206','301','302','303','304','305','306')`,
      [tenantId, propertyId],
    );

    // Helper: Create Party & Guest
    async function createGuest(
      rawFullName: string,
      phone: string,
      email: string,
      nationality: string,
      idType: string,
      idNumberPlain: string,
      vip = false,
      notes = '',
    ) {
      // Strip any bracketed debugging tags like [Walk-In Cash...] so guest names are 100% human-readable
      const fullName = rawFullName.replace(/^\[.*?\]\s*/, '').trim();
      const pRes = await client.query(
        `INSERT INTO parties (tenant_id, full_name, phone, email)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenantId, fullName, phone, email],
      );
      const partyId = pRes.rows[0].id;
      const enc = encryptSensitiveField(idNumberPlain);
      const gRes = await client.query(
        `INSERT INTO guests (
           tenant_id, property_id, party_id, nationality, id_type, id_number,
           id_number_ciphertext, id_number_iv, id_number_auth_tag, vip, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [tenantId, propertyId, partyId, nationality, idType, idNumberPlain, enc.ciphertext, enc.iv, enc.authTag, vip, notes],
      );
      return gRes.rows[0].id as string;
    }

    // Helper: Create Full Stay with Folio, Line Items, Payments, and Optional Invoices
    async function createStay({
      guestId,
      roomNumber,
      checkIn,
      checkOut,
      status,
      rateMode = 'nightly',
      source = 'direct',
      otaId = null as string | null,
      commission = 0,
      overrideReason = null as string | null,
      charges = [] as { desc: string; qty: number; unitPrice: number; cat: string }[],
      payments = [] as { amount: number; method: string; ref?: string; pan?: string; corp?: string; payer?: string }[],
      invoice = null as { type: 'B2C' | 'B2B'; gstin?: string; company?: string } | null,
    }: {
      guestId: string;
      roomNumber: string;
      checkIn: string;
      checkOut: string;
      status: string;
      rateMode?: string;
      source?: string;
      otaId?: string | null;
      commission?: number;
      overrideReason?: string | null;
      charges?: { desc: string; qty: number; unitPrice: number; cat: string }[];
      payments?: { amount: number; method: string; ref?: string; pan?: string; corp?: string; payer?: string }[];
      invoice?: { type: 'B2C' | 'B2B'; gstin?: string; company?: string } | null;
    }) {
      const roomId = roomMap.get(roomNumber);
      if (!roomId) throw new Error(`Room ${roomNumber} not found`);

      // Calculate total amount from charges
      let calculatedTotal = 0;
      for (const ch of charges) {
        const tax = calculateGstTax(ch.cat, ch.unitPrice, ch.qty, false);
        calculatedTotal += tax.lineTotal;
      }

      const checkInAt = rateMode === 'hourly'
        ? `${checkIn} 10:00:00+05:30`
        : `${checkIn} 14:00:00+05:30`;
      const checkOutAt = rateMode === 'hourly'
        ? `${checkOut} 16:00:00+05:30`
        : `${checkOut} 11:00:00+05:30`;

      const resRes = await client.query(
        `INSERT INTO reservations (
           tenant_id, property_id, guest_id, room_id, check_in, check_out,
           check_in_at, check_out_at,
           status, total_amount, rate_mode, override_reason, booking_source, ota_booking_id, ota_commission_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [
          tenantId,
          propertyId,
          guestId,
          roomId,
          checkIn,
          checkOut,
          checkInAt,
          checkOutAt,
          status,
          calculatedTotal,
          rateMode,
          overrideReason,
          source,
          otaId,
          commission,
        ],
      );
      const resId = resRes.rows[0].id;

      // Link primary guest in reservation_guests
      await client.query(
        `INSERT INTO reservation_guests (tenant_id, reservation_id, guest_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [tenantId, resId, guestId],
      );

      // Folio
      const folioRes = await client.query(
        `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, currency, status)
         VALUES ($1, $2, $3, 'INR', $4) RETURNING id`,
        [tenantId, propertyId, resId, status === 'checked_out' ? 'paid' : 'open'],
      );
      const folioId = folioRes.rows[0].id;

      let subtotal = 0;
      let taxTotal = 0;
      let totalBilled = 0;

      for (const ch of charges) {
        const tax = calculateGstTax(ch.cat, ch.unitPrice, ch.qty, false);
        subtotal += tax.taxableAmount;
        taxTotal += tax.taxTotal;
        totalBilled += tax.lineTotal;

        await client.query(
          `INSERT INTO folio_items (
             tenant_id, property_id, folio_id, description, quantity, unit_price,
             tax_category_code, hsn_sac, tax_rate, cgst_amount, sgst_amount, igst_amount,
             is_interstate, line_total
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            tenantId,
            propertyId,
            folioId,
            ch.desc,
            ch.qty,
            ch.unitPrice,
            ch.cat,
            tax.hsnSac,
            tax.cgstRate + tax.sgstRate,
            tax.cgstAmount,
            tax.sgstAmount,
            tax.igstAmount,
            false,
            tax.lineTotal,
          ],
        );
      }

      let paidTotal = 0;
      for (const pay of payments) {
        paidTotal += pay.amount;
        let corpId = null;
        if (pay.corp) {
          const cRow = await client.query(`SELECT id FROM corporate_accounts WHERE tenant_id = $1 AND property_id = $2 AND company_name = $3 LIMIT 1`, [tenantId, propertyId, pay.corp]);
          corpId = cRow.rows[0]?.id ?? null;
        }

        await client.query(
          `INSERT INTO folio_payments (
             tenant_id, property_id, folio_id, amount, method, reference,
             status, pan_number, corporate_account_id, notes
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'captured', $7, $8, $9)`,
          [
            tenantId,
            propertyId,
            folioId,
            pay.amount,
            pay.method === 'corporate_ledger' ? 'other' : pay.method,
            pay.ref ?? null,
            pay.pan ?? null,
            corpId,
            pay.payer ? `Payer: ${pay.payer}` : null,
          ],
        );
      }

      const folioStatus = status === 'checked_out' || paidTotal >= totalBilled
        ? 'paid'
        : paidTotal > 0
        ? 'part_paid'
        : 'open';

      await client.query(
        `UPDATE reservation_folios
         SET subtotal = $1, tax_total = $2, total = $3, status = $4, updated_at = now()
         WHERE id = $5`,
        [subtotal, taxTotal, totalBilled, folioStatus, folioId],
      );

      // Issue Tax Invoice if specified
      if (invoice) {
        const seqRes = await client.query(
          `SELECT coalesce(max(nullif(regexp_replace(invoice_number, '^INV-2026-', ''), '')), '0')::int + 1 AS seq
           FROM tax_invoices WHERE tenant_id = $1 AND property_id = $2`,
          [tenantId, propertyId],
        );
        const invNum = `INV-2026-${String(seqRes.rows[0].seq).padStart(5, '0')}`;
        const halfTax = Math.round((taxTotal / 2) * 100) / 100;

        // Fetch guest name
        const gNameRes = await client.query(
          `SELECT p.full_name FROM parties p JOIN guests g ON g.party_id = p.id WHERE g.id = $1`,
          [guestId],
        );
        const guestName = gNameRes.rows[0]?.full_name ?? 'Guest';

        await client.query(
          `INSERT INTO tax_invoices (
             tenant_id, property_id, folio_id, reservation_id, invoice_number, financial_year,
             invoice_type, guest_name, guest_gstin, guest_company_name, total_taxable_amount,
             cgst_amount, sgst_amount, igst_amount, grand_total, irn_status
           )
           VALUES ($1, $2, $3, $4, $5, '2026-27', $6, $7, $8, $9, $10, $11, $12, 0, $13, $14)`,
          [
            tenantId,
            propertyId,
            folioId,
            resId,
            invNum,
            invoice.type,
            guestName,
            invoice.gstin ?? null,
            invoice.company ?? null,
            subtotal,
            halfTax,
            halfTax,
            totalBilled,
            invoice.type === 'B2B' ? 'generated' : 'pending',
          ],
        );
      }

      return { resId, folioId };
    }

    // =======================================================================
    // 5. SEED ALL 10 COMPREHENSIVE ENTRY VARIATIONS
    // =======================================================================

    console.log('Seeding Entry 1: [Walk-In Cash Check-In] In-House Stay...');
    const g1 = await createGuest(
      'Vikram Malhotra',
      '+91 98112 34567',
      'vikram.malhotra@testguest.in',
      'Indian',
      'aadhaar',
      'xxxx xxxx 8821',
      false,
      'Walk-in customer arrived without prior reservation. Settle room tariff daily.',
    );
    await createStay({
      guestId: g1,
      roomNumber: '101',
      checkIn: '2026-11-01',
      checkOut: '2026-11-04',
      status: 'checked_in',
      source: 'walk_in',
      charges: [
        { desc: 'Standard Room Accommodation (3 Nights @ ₹3,200)', qty: 3, unitPrice: 3200, cat: 'ACCOMMODATION' },
        { desc: 'Room Service Dinner (Butter Chicken & Naan - SAC 996331)', qty: 2, unitPrice: 650, cat: 'FNB_ROOM_SERVICE' },
        { desc: 'Express Laundry Service (SAC 9997)', qty: 1, unitPrice: 450, cat: 'LAUNDRY' },
      ],
      payments: [
        { amount: 5000, method: 'cash', ref: 'CASH-REC-101-01', payer: 'Vikram Malhotra' },
      ],
    });

    console.log('Seeding Entry 2: [High-Value Cash with Rule 114B PAN] Luxury Stay...');
    const g2 = await createGuest(
      'Rajesh Singhania',
      '+91 99201 98765',
      'rajesh.singhania@luxury-palace.test',
      'Indian',
      'pan',
      'ABCPS1234F',
      true,
      'High net-worth guest. Complied with Income Tax Rule 114B PAN collection for cash > ₹50,000.',
    );
    await createStay({
      guestId: g2,
      roomNumber: '301',
      checkIn: '2026-11-01',
      checkOut: '2026-11-05',
      status: 'checked_in',
      source: 'direct',
      charges: [
        { desc: 'Executive Suite Accommodation (4 Nights @ ₹9,500 - 18% GST Slab)', qty: 4, unitPrice: 9500, cat: 'ACCOMMODATION' },
        { desc: 'Ayurvedic Wellness Spa Rejuvenation (SAC 999721)', qty: 2, unitPrice: 4500, cat: 'SPA' },
        { desc: 'Private Terrace Dining with Personal Chef (SAC 996331)', qty: 1, unitPrice: 8500, cat: 'FNB_REST' },
      ],
      payments: [
        { amount: 65000, method: 'cash', pan: 'ABCPS1234F', ref: 'CASH-PAN-65000', payer: 'Rajesh Singhania' },
      ],
    });

    console.log('Seeding Entry 3: [OTA Booking - MakeMyTrip] Online Ingestion...');
    const g3 = await createGuest(
      'Pooja Sharma',
      '+91 98765 43210',
      'pooja.mmt@ota-guest.test',
      'Indian',
      'aadhaar',
      'xxxx xxxx 4321',
      false,
      'Booked via MakeMyTrip Ingot API. 18% commission payable to MMT.',
    );
    await createStay({
      guestId: g3,
      roomNumber: '102',
      checkIn: '2026-11-02',
      checkOut: '2026-11-05',
      status: 'checked_in',
      source: 'makemytrip',
      otaId: 'MMT-98421034',
      commission: 1980,
      charges: [
        { desc: 'Standard Room Accommodation (OTA: MAKEMYTRIP #MMT-98421034)', qty: 3, unitPrice: 3300, cat: 'ACCOMMODATION' },
        { desc: 'Buffet Breakfast Supplement (SAC 996331)', qty: 3, unitPrice: 400, cat: 'FNB_REST' },
      ],
      payments: [
        { amount: 11088, method: 'card', ref: 'MMT-VCC-98412034', payer: 'MakeMyTrip Virtual Card' },
      ],
    });

    console.log('Seeding Entry 4: [OTA Booking - Booking.com] In-House Stay...');
    const g4 = await createGuest(
      'Sarah Jenkins',
      '+44 7911 123456',
      'sarah.j@travelworld.co.uk',
      'British',
      'passport',
      'GBR982341A',
      false,
      'Connectivity Partner Booking.com API booking. Guest requested quiet garden-facing room.',
    );
    await createStay({
      guestId: g4,
      roomNumber: '201',
      checkIn: '2026-11-02',
      checkOut: '2026-11-06',
      status: 'checked_in',
      source: 'booking_com',
      otaId: 'BKG-77219084',
      commission: 3696,
      charges: [
        { desc: 'Deluxe Room Accommodation (OTA: BOOKING.COM #BKG-77219084)', qty: 4, unitPrice: 5500, cat: 'ACCOMMODATION' },
        { desc: 'Chauffeur Airport Pickup (Indira Gandhi International Airport - SAC 9997)', qty: 1, unitPrice: 2500, cat: 'OTHER' },
      ],
      payments: [
        { amount: 15000, method: 'card', ref: 'POS-AUTH-BKG-883921', payer: 'Sarah Jenkins' },
      ],
    });

    console.log('Seeding Entry 5: [Foreign National - BoI Form C] Immigration Portal Entry...');
    const g5 = await createGuest(
      'David Arthur Miller',
      '+44 7700 900123',
      'david.miller@london-architects.co.uk',
      'British',
      'passport',
      'P-UK9920148',
      true,
      'UK National visiting for international urban design seminar. Complied with Form C filing.',
    );
    const s5 = await createStay({
      guestId: g5,
      roomNumber: '202',
      checkIn: '2026-11-01',
      checkOut: '2026-11-06',
      status: 'checked_in',
      source: 'direct',
      charges: [
        { desc: 'Deluxe Room Accommodation (5 Nights @ ₹5,500)', qty: 5, unitPrice: 5500, cat: 'ACCOMMODATION' },
        { desc: 'Club Dining & Beverages (SAC 996331)', qty: 2, unitPrice: 1200, cat: 'FNB_REST' },
      ],
      payments: [
        { amount: 33320, method: 'card', ref: 'AMEX-UK-8841920', payer: 'David Arthur Miller' },
      ],
    });

    // Seed official BoI Form C record
    await client.query(
      `INSERT INTO guest_form_c (
         tenant_id, property_id, reservation_id, guest_id,
         passport_number, passport_country, passport_issue_date, passport_expiry_date,
         visa_number, visa_type, visa_valid_until, visa_issue_place,
         arrival_date_in_india, arrived_from_city_country, next_destination_city_country,
         purpose_of_visit, submission_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'submitted_online')`,
      [
        tenantId,
        propertyId,
        s5.resId,
        g5,
        'P-UK9920148',
        'United Kingdom',
        '2022-08-15',
        '2032-08-15',
        'V-IN8821034',
        'business',
        '2027-02-10',
        'London HM Passport Office',
        '2026-10-31',
        'London, United Kingdom',
        'Jaipur, Rajasthan',
        'business',
      ],
    );

    console.log('Seeding Entry 6: [Corporate B2B Stay · TCS City Ledger] with B2B Tax Invoice...');
    const g6 = await createGuest(
      'Amitav Ghosh',
      '+91 98205 11223',
      'amitav.ghosh@tcs.test',
      'Indian',
      'aadhaar',
      'xxxx xxxx 6634',
      false,
      'Corporate stay on bill-to-company city ledger account.',
    );
    await createStay({
      guestId: g6,
      roomNumber: '203',
      checkIn: '2026-11-02',
      checkOut: '2026-11-05',
      status: 'checked_in',
      source: 'corporate',
      charges: [
        { desc: 'Deluxe Room Accommodation (3 Nights @ ₹5,500 - Corporate Rate)', qty: 3, unitPrice: 5500, cat: 'ACCOMMODATION' },
        { desc: 'Business Center Printing & High-Speed Conference Wi-Fi', qty: 1, unitPrice: 850, cat: 'OTHER' },
        { desc: 'Corporate Working Lunch (SAC 996331)', qty: 2, unitPrice: 750, cat: 'FNB_REST' },
      ],
      payments: [
        {
          amount: 21053,
          method: 'corporate_ledger',
          corp: 'Tata Consultancy Services Ltd',
          ref: 'PO-TCS-DEL-2026-884',
          payer: 'Tata Consultancy Services Ltd',
        },
      ],
      invoice: {
        type: 'B2B',
        gstin: '27AAACT2727Q1ZW',
        company: 'Tata Consultancy Services Ltd',
      },
    });

    console.log('Seeding Entry 7: [Checked-Out Settled Folio] with B2C Tax Invoice & UPI Payment...');
    const g7 = await createGuest(
      'Neha Reddy',
      '+91 97001 22334',
      'neha.reddy@hyderabad.test',
      'Indian',
      'aadhaar',
      'xxxx xxxx 7712',
      false,
      'Stay completed. Paid via Google Pay UPI. Issued B2C GST invoice.',
    );
    await createStay({
      guestId: g7,
      roomNumber: '103',
      checkIn: '2026-10-30',
      checkOut: '2026-11-02',
      status: 'checked_out',
      source: 'direct',
      charges: [
        { desc: 'Standard Room Accommodation (3 Nights @ ₹3,200)', qty: 3, unitPrice: 3200, cat: 'ACCOMMODATION' },
        { desc: 'Café Cold Brew & Sandwich (SAC 996331)', qty: 2, unitPrice: 350, cat: 'FNB_REST' },
      ],
      payments: [
        { amount: 11487, method: 'upi', ref: 'UPI/20261102/9841203412@okaxis', payer: 'Neha Reddy' },
      ],
      invoice: {
        type: 'B2C',
      },
    });

    console.log('Seeding Entry 8: [VIP Palace Suite Stay] High-Tariff 18% GST Slab...');
    const g8 = await createGuest(
      'Maharaja K. R. Scindia',
      '+91 98210 99999',
      'royal.office@scindia-palace.test',
      'Indian',
      'passport',
      'Z-IND7788990',
      true,
      'VIP guest. Presidential suite with customized dining, private security, and royal protocol.',
    );
    await createStay({
      guestId: g8,
      roomNumber: '304',
      checkIn: '2026-11-01',
      checkOut: '2026-11-06',
      status: 'checked_in',
      source: 'direct',
      charges: [
        { desc: 'Presidential Palace Suite (5 Nights @ ₹18,000 - 18% Luxury GST Slab)', qty: 5, unitPrice: 18000, cat: 'ACCOMMODATION' },
        { desc: 'Royal Imperial Banquet Dining (SAC 996331)', qty: 1, unitPrice: 14500, cat: 'FNB_REST' },
        { desc: 'Full-Day Chauffeur Mercedes Maybach Rental (SAC 9997)', qty: 2, unitPrice: 8500, cat: 'OTHER' },
      ],
      payments: [
        { amount: 50000, method: 'card', ref: 'AMEX-CENTURION-99124', payer: 'K. R. Scindia' },
      ],
    });

    console.log('Seeding Entry 9: [Day-Use Hourly Layover Stay] Same-Day Check-in & Out...');
    const g9 = await createGuest(
      'Priya Sundaram',
      '+91 94440 12345',
      'priya.s@chennai-consulting.test',
      'Indian',
      'aadhaar',
      'xxxx xxxx 5521',
      false,
      'Airport layover business meeting day use.',
    );
    await createStay({
      guestId: g9,
      roomNumber: '106',
      checkIn: '2026-11-02',
      checkOut: '2026-11-02',
      status: 'checked_in',
      rateMode: 'hourly',
      overrideReason: '6-Hour Airport Layover Business Day-Use Package',
      charges: [
        { desc: 'Day-Use Room Hourly Stay (6 Hours @ ₹1,800)', qty: 1, unitPrice: 1800, cat: 'ACCOMMODATION' },
        { desc: 'Express Club Lunch (SAC 996331)', qty: 1, unitPrice: 600, cat: 'FNB_ROOM_SERVICE' },
      ],
      payments: [
        { amount: 2646, method: 'upi', ref: 'UPI/20261102/PAYTM881293', payer: 'Priya Sundaram' },
      ],
    });

    console.log('Seeding Entry 10: [Cancelled Reservation] Upcoming Stay...');
    const g10 = await createGuest(
      'Amit Kapoor',
      '+91 98330 45678',
      'amit.kapoor@mumbai-tech.test',
      'Indian',
      'aadhaar',
      'xxxx xxxx 9912',
      false,
      'Flight rescheduled due to cyclone warning. Cancelled with zero penalty.',
    );
    await createStay({
      guestId: g10,
      roomNumber: '105',
      checkIn: '2026-11-05',
      checkOut: '2026-11-07',
      status: 'cancelled',
      source: 'direct',
      charges: [
        { desc: 'Standard Room Accommodation (2 Nights @ ₹3,200)', qty: 2, unitPrice: 3200, cat: 'ACCOMMODATION' },
      ],
    });

    console.log('Seeding Additional High-Density Stays across Floor 1, 2, and 3...');

    // Entry 11: Room 101 - Michael Chang (Expedia upcoming after Vikram Malhotra departs)
    const g11 = await createGuest('Michael Chang', '+1 415 555 0192', 'm.chang@sf-design.test', 'American', 'passport', 'USA8892104', false, 'Expedia Partner Booking');
    await createStay({
      guestId: g11,
      roomNumber: '101',
      checkIn: '2026-11-04',
      checkOut: '2026-11-07',
      status: 'reserved',
      source: 'expedia',
      otaId: 'EXP-992144',
      commission: 1980,
      charges: [{ desc: 'Standard Room (3 Nights @ ₹3,200)', qty: 3, unitPrice: 3200, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 10752, method: 'card', ref: 'EXP-VCC-992144', payer: 'Expedia Virtual Card' }],
    });

    // Entry 12: Room 102 - Rahul Verma (Direct weekend after Pooja Sharma departs)
    const g12 = await createGuest('Rahul Verma', '+91 98200 44556', 'rahul.verma@mumbai.test', 'Indian', 'aadhaar', 'xxxx xxxx 1234', false, 'Direct website booking');
    await createStay({
      guestId: g12,
      roomNumber: '102',
      checkIn: '2026-11-05',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'direct',
      charges: [{ desc: 'Standard Room (3 Nights @ ₹3,200)', qty: 3, unitPrice: 3200, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 10752, method: 'upi', ref: 'UPI/20261105/9820044@axis', payer: 'Rahul Verma' }],
    });

    // Entry 13: Room 103 - Dr. Rohan Mehra & Family (MakeMyTrip arriving tomorrow)
    const g13 = await createGuest('Dr. Rohan Mehra', '+91 98101 22334', 'rohan.mehra@delhi-hosp.test', 'Indian', 'aadhaar', 'xxxx xxxx 5678', false, 'MakeMyTrip Family Holiday');
    await createStay({
      guestId: g13,
      roomNumber: '103',
      checkIn: '2026-11-03',
      checkOut: '2026-11-06',
      status: 'reserved',
      source: 'makemytrip',
      otaId: 'MMT-44129',
      commission: 1980,
      charges: [{ desc: 'Standard Room (3 Nights @ ₹3,200)', qty: 3, unitPrice: 3200, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 10752, method: 'card', ref: 'MMT-VCC-44129', payer: 'MMT Virtual Card' }],
    });

    // Entry 14: Room 104 - Kenji Sato (Agoda Tokyo Traveler - In House today)
    const g14 = await createGuest('Kenji Sato', '+81 90 1234 5678', 'kenji.sato@tokyo-consulting.test', 'Japanese', 'passport', 'JPN990142A', false, 'Agoda Booking');
    await createStay({
      guestId: g14,
      roomNumber: '104',
      checkIn: '2026-11-01',
      checkOut: '2026-11-03',
      status: 'checked_in',
      source: 'agoda',
      otaId: 'AGD-882194',
      commission: 1848,
      charges: [{ desc: 'Deluxe Room Accommodation (2 Nights @ ₹5,500)', qty: 2, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 12320, method: 'card', ref: 'AGD-VCC-882194', payer: 'Agoda Virtual Card' }],
    });

    // Entry 15: Room 104 - Deepak Verma (Wipro Technologies B2B arriving Tue after Kenji departs)
    const g15 = await createGuest('Deepak Verma', '+91 98450 11992', 'deepak.verma@wipro.test', 'Indian', 'aadhaar', 'xxxx xxxx 4329', false, 'Wipro Corporate mobility');
    await createStay({
      guestId: g15,
      roomNumber: '104',
      checkIn: '2026-11-03',
      checkOut: '2026-11-07',
      status: 'reserved',
      source: 'corporate',
      charges: [{ desc: 'Deluxe Room (4 Nights @ ₹5,500)', qty: 4, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 24640, method: 'corporate_ledger', corp: 'Wipro Technologies Ltd', ref: 'PO-WIPRO-BLR-992', payer: 'Wipro Technologies Ltd' }],
      invoice: { type: 'B2B', gstin: '29AAACW1234A1Z5', company: 'Wipro Technologies Ltd' },
    });

    // Entry 16: Room 105 - Ananya Sen (Booking.com weekend)
    const g16 = await createGuest('Ananya Sen', '+91 98300 77889', 'ananya.sen@kolkata.test', 'Indian', 'aadhaar', 'xxxx xxxx 7721', false, 'Booking.com weekend break');
    await createStay({
      guestId: g16,
      roomNumber: '105',
      checkIn: '2026-11-06',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'booking_com',
      otaId: 'BKG-11209',
      commission: 1848,
      charges: [{ desc: 'Deluxe Room (2 Nights @ ₹5,500)', qty: 2, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 12320, method: 'card', ref: 'POS-AUTH-BKG-11209', payer: 'Ananya Sen' }],
    });

    // Entry 17: Room 106 - Alok Mathur (Cognizant Technology after Priya Sundaram day use)
    const g17 = await createGuest('Alok Mathur', '+91 98400 99881', 'alok.mathur@cognizant.test', 'Indian', 'aadhaar', 'xxxx xxxx 3322', false, 'Corporate IT project');
    await createStay({
      guestId: g17,
      roomNumber: '106',
      checkIn: '2026-11-04',
      checkOut: '2026-11-07',
      status: 'reserved',
      source: 'direct',
      charges: [{ desc: 'Deluxe Room (3 Nights @ ₹5,500)', qty: 3, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 18480, method: 'upi', ref: 'UPI/20261104/alok@icici', payer: 'Alok Mathur' }],
    });

    // Entry 18: Room 201 - Liam O'Connor (Booking.com Ireland after Sarah Jenkins departs)
    const g18 = await createGuest("Liam O'Connor", '+353 87 123 4567', 'liam.oc@dublin-travel.test', 'Irish', 'passport', 'IRL449210B', false, 'Booking.com Europe Traveler');
    await createStay({
      guestId: g18,
      roomNumber: '201',
      checkIn: '2026-11-06',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'booking_com',
      otaId: 'BKG-88310',
      commission: 1848,
      charges: [{ desc: 'Deluxe Room (2 Nights @ ₹5,500)', qty: 2, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 12320, method: 'card', ref: 'POS-AUTH-BKG-88310', payer: "Liam O'Connor" }],
    });

    // Entry 19: Room 204 - Ananya Gupta (MakeMyTrip Delhi)
    const g19 = await createGuest('Ananya Gupta', '+91 98111 66554', 'ananya.gupta@delhi-pr.test', 'Indian', 'aadhaar', 'xxxx xxxx 9981', false, 'MakeMyTrip Inbound');
    await createStay({
      guestId: g19,
      roomNumber: '204',
      checkIn: '2026-11-03',
      checkOut: '2026-11-06',
      status: 'reserved',
      source: 'makemytrip',
      otaId: 'MMT-55102',
      commission: 3300,
      charges: [{ desc: 'Deluxe Room (3 Nights @ ₹5,500)', qty: 3, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 18480, method: 'card', ref: 'MMT-VCC-55102', payer: 'MMT Virtual Card' }],
    });

    // Entry 20: Room 205 - Sunita Rao (Infosys BPM Technologies - In House today)
    const g20 = await createGuest('Sunita Rao', '+91 98450 33445', 'sunita.rao@infosys.test', 'Indian', 'aadhaar', 'xxxx xxxx 6655', false, 'Infosys Enterprise Client Stay');
    await createStay({
      guestId: g20,
      roomNumber: '205',
      checkIn: '2026-11-02',
      checkOut: '2026-11-05',
      status: 'checked_in',
      source: 'corporate',
      charges: [{ desc: 'Deluxe Room Accommodation (3 Nights @ ₹5,500)', qty: 3, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 18480, method: 'corporate_ledger', corp: 'Infosys BPM Technologies Ltd', ref: 'PO-INFY-2026-441', payer: 'Infosys BPM Technologies Ltd' }],
      invoice: { type: 'B2B', gstin: '29AAACI4321A1ZG', company: 'Infosys BPM Technologies Ltd' },
    });

    // Entry 21: Room 205 - Nitin Ambani (Reliance Industries after Sunita Rao departs)
    const g21 = await createGuest('Nitin Ambani', '+91 98200 88990', 'nitin.ambani@ril.test', 'Indian', 'aadhaar', 'xxxx xxxx 8877', false, 'Reliance Corporate delegation');
    await createStay({
      guestId: g21,
      roomNumber: '205',
      checkIn: '2026-11-05',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'corporate',
      charges: [{ desc: 'Deluxe Room (3 Nights @ ₹5,500)', qty: 3, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 18480, method: 'corporate_ledger', corp: 'Reliance Industries Hospitality Services', ref: 'PO-RIL-BKC-772', payer: 'Reliance Industries Hospitality Services' }],
      invoice: { type: 'B2B', gstin: '24AAACR5055K1Z1', company: 'Reliance Industries Hospitality Services' },
    });

    // Entry 22: Room 206 - Kavita Krishnan (Weekend Leisure)
    const g22 = await createGuest('Kavita Krishnan', '+91 98451 99221', 'kavita.k@bengaluru.test', 'Indian', 'aadhaar', 'xxxx xxxx 4411', false, 'Direct website weekend reservation');
    await createStay({
      guestId: g22,
      roomNumber: '206',
      checkIn: '2026-11-05',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'direct',
      charges: [{ desc: 'Deluxe Room (3 Nights @ ₹5,500)', qty: 3, unitPrice: 5500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 18480, method: 'upi', ref: 'UPI/20261105/kavita@ybl', payer: 'Kavita Krishnan' }],
    });

    // Entry 23: Room 302 - Sanjay Nair (HDFC Bank Treasury Executive Suite)
    const g23 = await createGuest('Sanjay Nair', '+91 98211 44552', 'sanjay.nair@hdfcbank.test', 'Indian', 'pan', 'AAABH1234N', false, 'HDFC Bank treasury board meeting');
    await createStay({
      guestId: g23,
      roomNumber: '302',
      checkIn: '2026-11-03',
      checkOut: '2026-11-07',
      status: 'reserved',
      source: 'direct',
      charges: [{ desc: 'Executive Suite (4 Nights @ ₹9,500 - 18% GST Slab)', qty: 4, unitPrice: 9500, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 44840, method: 'card', ref: 'POS-AUTH-HDFC-9912', payer: 'Sanjay Nair' }],
      invoice: { type: 'B2B', gstin: '27AAACH2702H1Z1', company: 'HDFC Bank Ltd' },
    });

    // Entry 24: Room 303 - Arjun & Meera Kapoor (Palace Honeymoon Package)
    const g24 = await createGuest('Arjun & Meera Kapoor', '+91 99201 11223', 'arjun.kapoor@honeymoon.test', 'Indian', 'aadhaar', 'xxxx xxxx 9911', true, 'VIP Honeymoon Package with private terrace dining');
    await createStay({
      guestId: g24,
      roomNumber: '303',
      checkIn: '2026-11-04',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'direct',
      charges: [
        { desc: 'Executive Suite (4 Nights @ ₹9,500 - 18% GST)', qty: 4, unitPrice: 9500, cat: 'ACCOMMODATION' },
        { desc: 'Romantic Terrace Dinner & Champagne (SAC 996331)', qty: 1, unitPrice: 6500, cat: 'FNB_REST' },
      ],
      payments: [{ amount: 51665, method: 'card', ref: 'AMEX-HONEYMOON-881', payer: 'Arjun Kapoor' }],
    });

    // Entry 25: Room 305 - Tarun Khanna (Presidential Palace Suite Weekend)
    const g25 = await createGuest('Tarun Khanna', '+91 98100 88888', 'tarun.khanna@delhi-venture.test', 'Indian', 'pan', 'AAAPK9988K', true, 'Presidential Palace Suite VIP Stay');
    await createStay({
      guestId: g25,
      roomNumber: '305',
      checkIn: '2026-11-05',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'direct',
      charges: [{ desc: 'Presidential Palace Suite (3 Nights @ ₹18,000 - 18% Luxury GST)', qty: 3, unitPrice: 18000, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 63720, method: 'card', ref: 'AMEX-CENTURION-551', payer: 'Tarun Khanna' }],
    });

    // Entry 26: Room 306 - Diplomatic Delegation (German Consulate)
    const g26 = await createGuest('German Consulate Delegation', '+49 30 18170', 'consular.desk@mumbai.diplo.de', 'German', 'passport', 'DEU990012P', true, 'Diplomatic official stay');
    await createStay({
      guestId: g26,
      roomNumber: '306',
      checkIn: '2026-11-04',
      checkOut: '2026-11-08',
      status: 'reserved',
      source: 'direct',
      charges: [{ desc: 'Presidential Palace Suite (4 Nights @ ₹18,000 - 18% Luxury GST)', qty: 4, unitPrice: 18000, cat: 'ACCOMMODATION' }],
      payments: [{ amount: 84960, method: 'card', ref: 'CORP-CARD-DIPLO-99', payer: 'German Consulate General' }],
    });

    // 5.1 Synchronize Live Room Statuses on rooms table for current business date (2026-11-02)
    console.log('Synchronizing Live Room Statuses for Grand Azure Hotel...');
    await client.query(`UPDATE rooms SET status = 'occupied' WHERE tenant_id = $1 AND property_id = $2 AND number IN ('101','102','104','106','201','202','203','205','301','304')`, [tenantId, propertyId]);
    await client.query(`UPDATE rooms SET status = 'cleaning' WHERE tenant_id = $1 AND property_id = $2 AND number IN ('103','206')`, [tenantId, propertyId]);
    await client.query(`UPDATE rooms SET status = 'maintenance' WHERE tenant_id = $1 AND property_id = $2 AND number IN ('105')`, [tenantId, propertyId]);
    await client.query(`UPDATE rooms SET status = 'available' WHERE tenant_id = $1 AND property_id = $2 AND number IN ('204','302','303','305','306')`, [tenantId, propertyId]);

    // 6. Seed OTA Channel Integrations & Real-Time Sync Logs
    console.log('Seeding OTA Channels & Sync Logs...');
    const channelsConfig = [
      { key: 'makemytrip', name: 'MakeMyTrip & Goibibo', code: 'MMT-DEL-9842', active: true, rate: 18.0, msg: 'Pushed live ARI: 6 Available, 11 Occupied, 2 Cleaning' },
      { key: 'booking_com', name: 'Booking.com', code: 'BKG-DEL-7712', active: true, rate: 15.0, msg: 'Two-way ARI handshake active. Ingested BKG-77219084' },
      { key: 'agoda', name: 'Agoda', code: 'AGD-DEL-5521', active: true, rate: 15.0, msg: 'Rates & promotions synchronized with YCS API' },
      { key: 'expedia', name: 'Expedia Group', code: 'EXP-DEL-3319', active: false, rate: 18.0, msg: 'Credentials pending partner verification' },
      { key: 'airbnb', name: 'Airbnb', code: 'ABNB-PALACE-01', active: false, rate: 3.0, msg: 'Host API ready to connect' },
    ];

    for (const ch of channelsConfig) {
      await client.query(
        `INSERT INTO ota_channels (
           tenant_id, property_id, channel_key, channel_name, hotel_code,
           is_active, sync_mode, commission_rate, last_sync_at, last_sync_status, last_sync_message
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'two_way', $7, now(), $8, $9)
         ON CONFLICT (tenant_id, property_id, channel_key)
         DO UPDATE SET
           hotel_code = excluded.hotel_code,
           is_active = excluded.is_active,
           last_sync_status = excluded.last_sync_status,
           last_sync_message = excluded.last_sync_message`,
        [tenantId, propertyId, ch.key, ch.name, ch.code, ch.active, ch.rate, ch.active ? 'success' : 'idle', ch.msg],
      );
    }

    const syncLogsData = [
      { ch: 'makemytrip', dir: 'inbound', type: 'new_booking', summary: 'Ingested booking MMT-98421034 for Pooja Sharma in Room 102 (₹11,088)' },
      { ch: 'booking_com', dir: 'inbound', type: 'new_booking', summary: 'Ingested booking BKG-77219084 for Sarah Jenkins in Room 201 (₹24,640)' },
      { ch: 'makemytrip', dir: 'outbound', type: 'push_inventory', summary: 'Pushed real-time ARI: 6 Standard, 4 Deluxe, 2 Suites remaining' },
      { ch: 'booking_com', dir: 'outbound', type: 'push_inventory', summary: 'Pushed inventory update following Walk-in check-in for Room 101' },
      { ch: 'agoda', dir: 'outbound', type: 'test_connection', summary: 'Agoda YCS Partner API credentials handshake verified successfully' },
    ];

    for (const sl of syncLogsData) {
      await client.query(
        `INSERT INTO ota_sync_logs (
           tenant_id, property_id, channel_key, direction, event_type, status, summary, payload
         )
         VALUES ($1, $2, $3, $4, $5, 'success', $6, $7)`,
        [tenantId, propertyId, sl.ch, sl.dir, sl.type, sl.summary, JSON.stringify({ simulated: true, timestamp: new Date().toISOString() })],
      );
    }

    // ==========================================
    // 16. SEED ENTERPRISE HIERARCHY & STAFF DELEGATION
    // ==========================================
    console.log('Seeding enterprise staff hierarchy and shifts...');
    await client.query(
      `UPDATE property_users
       SET department = 'Executive Management', shift = 'General'
       WHERE tenant_id = $1 AND role = 'owner'`,
      [tenantId],
    );

    // Ensure staff with explicit roles exist
    const staffMembers = [
      { email: 'frontdesk@grandazure.com', name: 'Aarav Mehta', role: 'frontdesk', dept: 'Front Office', shift: 'Morning (07:00 - 15:30)' },
      { email: 'reception.night@grandazure.com', name: 'Kavita Deshmukh', role: 'frontdesk', dept: 'Front Office (Night Audit)', shift: 'Night (23:00 - 07:30)' },
      { email: 'housekeeping@grandazure.com', name: 'Sunita Rao', role: 'housekeeping', dept: 'Housekeeping & Laundry', shift: 'Morning (08:00 - 16:30)' },
      { email: 'hk.supervisor@grandazure.com', name: 'Ramesh Patel', role: 'housekeeping', dept: 'Housekeeping Floor Supervisor', shift: 'Evening (15:00 - 23:30)' },
    ];

    const passHash = '$2a$10$9YJLHJftkrb.ZAh2hMZ5Ne1QGh3KDxdVUkxc8SOaBfU/8GXZ1D.mS'; // bcrypt hash for ChangeMe-123!
    for (const sm of staffMembers) {
      const uRes = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, email) DO UPDATE SET full_name = excluded.full_name
         RETURNING id`,
        [tenantId, sm.email, passHash, sm.name, sm.role],
      );
      const uid = uRes.rows[0].id;
      await client.query(
        `INSERT INTO property_users (tenant_id, property_id, user_id, role, department, shift)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, property_id, user_id)
         DO UPDATE SET role = excluded.role, department = excluded.department, shift = excluded.shift`,
        [tenantId, propertyId, uid, sm.role, sm.dept, sm.shift],
      );
    }

    // ==========================================
    // 17. SEED GUEST LOYALTY CRM PROFILES (Taj InnerCircle Style)
    // ==========================================
    console.log('Seeding Taj-grade guest loyalty profiles and preferences...');
    const allGuests = (await client.query(`SELECT id, party_id, vip FROM guests WHERE tenant_id = $1`, [tenantId])).rows;

    const loyaltyTemplates = [
      {
        tier: 'kohinoor',
        nights: 24,
        spend: 285400.00,
        points: 4800,
        prefs: { pillow_type: 'Goose Feather Soft', floor_preference: 'Highest Floor Penthouse', dietary: 'Strict Jain (No root vegetables)', newspaper: 'Financial Times', beverage: 'Darjeeling First Flush Tea' },
        anniversary: '2026-12-14',
        bday: '1982-05-18',
      },
      {
        tier: 'platinum',
        nights: 16,
        spend: 142800.00,
        points: 2450,
        prefs: { pillow_type: 'Memory Foam Contour', floor_preference: 'Corner Suite Away From Elevators', dietary: 'Gluten-Free Vegetarian', newspaper: 'The Economic Times', airport_pickup: 'Mercedes S-Class' },
        anniversary: '2026-11-20',
        bday: '1987-08-25',
      },
      {
        tier: 'gold',
        nights: 8,
        spend: 78500.00,
        points: 1200,
        prefs: { pillow_type: 'Hypoallergenic Firm', floor_preference: 'Garden Facing Balcony', dietary: 'Non-Vegetarian Halal', newspaper: 'Mint' },
        anniversary: '2026-12-28',
        bday: '1991-03-11',
      },
      {
        tier: 'silver',
        nights: 3,
        spend: 26400.00,
        points: 450,
        prefs: { pillow_type: 'Standard Soft', floor_preference: 'Non-Smoking Floor', dietary: 'Vegetarian', newspaper: 'The Hindu' },
        anniversary: '2027-02-14',
        bday: '1995-10-09',
      },
    ];

    let tIdx = 0;
    for (const g of allGuests) {
      const template = loyaltyTemplates[tIdx % loyaltyTemplates.length];
      tIdx++;
      await client.query(
        `INSERT INTO guest_loyalty_profiles (
           tenant_id, property_id, guest_id, tier, total_nights, total_spend, points_balance,
           preferences, anniversary_date, birthday_date, last_stay_date
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '2026-11-02')
         ON CONFLICT (tenant_id, guest_id)
         DO UPDATE SET
           tier = excluded.tier,
           total_nights = excluded.total_nights,
           total_spend = excluded.total_spend,
           points_balance = excluded.points_balance,
           preferences = excluded.preferences`,
        [tenantId, propertyId, g.id, template.tier, template.nights, template.spend, template.points, JSON.stringify(template.prefs), template.anniversary, template.bday],
      );
    }

    // ==========================================
    // 18. SEED AUTOMATED POST-CHECKOUT FOLLOW-UP LOGS
    // ==========================================
    console.log('Seeding automated review follow-ups & NPS logs...');
    const followupSeeds = [
      {
        name: 'Rajesh Singhania',
        phone: '+91 98201 11223',
        email: 'rajesh.singhania@indosteel.com',
        channel: 'whatsapp',
        platform: 'google',
        status: 'reviewed',
        rating: 5,
        feedback: 'Magnificent heritage hospitality! The suite was pristine and the private butler service was impeccable.',
        body: 'Namaste Rajesh! Thank you for staying at Grand Azure Hotel. Could you take 30 seconds to rate us on Google? https://g.page/r/GrandAzureHotel/review - GM, Grand Azure Hotel',
      },
      {
        name: 'Sarah Jenkins',
        phone: '+44 7700 900123',
        email: 'sarah.jenkins@oxfordalumni.org',
        channel: 'whatsapp',
        platform: 'tripadvisor',
        status: 'reviewed',
        rating: 5,
        feedback: 'One of the best heritage luxury stays in India. Smooth check-in, spotless bathroom, delicious breakfast.',
        body: 'Dear Sarah, thank you for choosing Grand Azure Hotel! We hope your stay was memorable. Please share your review on TripAdvisor: https://tripadvisor.in/GrandAzureHotel - GM, Grand Azure Hotel',
      },
      {
        name: 'Amitabh Sen',
        phone: '+91 98300 44556',
        email: 'amitabh.sen@bengaltech.in',
        channel: 'whatsapp',
        platform: 'google',
        status: 'sent',
        rating: null,
        feedback: null,
        body: 'Namaste Amitabh! Thank you for staying with us. How was your experience in Deluxe Room 104? Leave us a Google Review: https://g.page/r/GrandAzureHotel/review',
      },
      {
        name: 'Pooja Sharma',
        phone: '+91 98111 88990',
        email: 'pooja.sharma@gurgaoncorp.com',
        channel: 'email',
        platform: 'direct_nps',
        status: 'reviewed',
        rating: 4,
        feedback: 'Very comfortable room and prompt room service. Wifi was fast for my video calls.',
        body: 'Dear Pooja, thank you for staying at Grand Azure Hotel. Please rate your stay on our official NPS portal: https://stay.azurehotels.com/nps',
      },
    ];

    if (allGuests.length > 0) {
      for (let i = 0; i < followupSeeds.length; i++) {
        const fs = followupSeeds[i];
        const gId = allGuests[i % allGuests.length].id;
        await client.query(
          `INSERT INTO guest_followup_logs (
             tenant_id, property_id, guest_id, trigger_type, channel, recipient_name,
             recipient_phone, recipient_email, message_body, status, review_platform,
             rating_received, guest_feedback, sent_at
           )
           VALUES ($1, $2, $3, 'post_checkout_review', $4, $5, $6, $7, $8, $9, $10, $11, $12, now() - interval '${i * 4} hours')`,
          [tenantId, propertyId, gId, fs.channel, fs.name, fs.phone, fs.email, fs.body, fs.status, fs.platform, fs.rating, fs.feedback],
        );
      }
    }

    // ==========================================
    // 19. SEED TARGETED MARKETING CAMPAIGNS
    // ==========================================
    console.log('Seeding targeted marketing campaigns...');
    const campaigns = [
      {
        title: 'Monsoon Royal Palace Weekend Getaway',
        type: 'repeat_booking',
        channel: 'whatsapp',
        segment: 'all_guests',
        discount: 'MONSOON25',
        sent: 48,
        delivered: 47,
        conv: 12,
        rev: 168000.00,
        msg: 'Experience royal monsoon tranquility at Grand Azure Hotel. Enjoy 25% savings on all suites, complimentary high tea, and late checkout. Use code MONSOON25 on your next direct booking.',
      },
      {
        title: 'We Miss You - Exclusive Inactive Guest Privilege',
        type: 'inactive_reengagement',
        channel: 'whatsapp',
        segment: 'inactive_90_days',
        discount: 'WELCOMEBACK',
        sent: 32,
        delivered: 31,
        conv: 7,
        rev: 94500.00,
        msg: 'Namaste from Grand Azure Hotel! We would love to welcome you back. Enjoy ₹3,000 complimentary dining credit with any 2-night stay this month. Book direct with code WELCOMEBACK.',
      },
      {
        title: 'Kohinoor & Platinum VIP Annual Privilege Renewal',
        type: 'vip_loyalty',
        channel: 'email',
        segment: 'vip_platinum',
        discount: 'VIPPLATINUM',
        sent: 14,
        delivered: 14,
        conv: 6,
        rev: 198000.00,
        msg: 'As an esteemed Taj-tier guest at Grand Azure Hotel, your suite upgrade voucher and private chef dining credit have been activated for the upcoming holiday quarter.',
      },
      {
        title: 'Corporate Year-End Direct Billing & Event Rates',
        type: 'corporate_renewal',
        channel: 'email',
        segment: 'corporate',
        discount: 'CORP2027',
        sent: 26,
        delivered: 26,
        conv: 9,
        rev: 345000.00,
        msg: 'Plan your executive offsites and corporate conferences at Grand Azure Hotel. Exclusive GST credit invoicing, dedicated relationship manager, and preferential delegate room tariffs.',
      },
    ];

    for (const c of campaigns) {
      await client.query(
        `INSERT INTO marketing_campaigns (
           tenant_id, property_id, title, campaign_type, channel, audience_segment,
           template_message, discount_code, status, sent_count, delivered_count,
           converted_count, revenue_generated
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent', $9, $10, $11, $12)`,
        [tenantId, propertyId, c.title, c.type, c.channel, c.segment, c.msg, c.discount, c.sent, c.delivered, c.conv, c.rev],
      );
    }

    await client.query('commit');
    console.log('✅ COMPREHENSIVE SEED COMPLETED SUCCESSFULLY!');
    console.log('All 10 hospitality variations, folios, tax invoices, corporate ledger, and OTA channels populated.');
  } catch (e) {
    await client.query('rollback');
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
