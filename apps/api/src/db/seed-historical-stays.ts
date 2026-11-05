import '../load-env';
import { Client } from 'pg';
import { calculateGstTax } from '../hotel/tax-calculator';
import { encryptSensitiveField } from '../common/field-encryption';

async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) throw new Error('DATABASE_ADMIN_URL is required');

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    await client.query('begin');

    // 1. Target Grand Azure Hotel
    const t = await client.query(`SELECT id FROM tenants WHERE slug = 'grand-azure'`);
    if (!t.rows.length) throw new Error('Tenant grand-azure not found');
    const tenantId: string = t.rows[0].id;
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    const p = await client.query(
      `SELECT id, name FROM properties WHERE tenant_id = $1 AND name ILIKE '%Grand Azure%' LIMIT 1`,
      [tenantId],
    );
    if (!p.rows.length) throw new Error('Grand Azure Hotel not found');
    const propertyId: string = p.rows[0].id;
    await client.query("SELECT set_config('app.property_id', $1, true)", [propertyId]);

    console.log(`Populating Historical Booking Ledger for: ${p.rows[0].name} (${propertyId})`);

    // 2. Fetch Rooms & Base Rates
    const roomsRes = await client.query(
      `SELECT r.id, r.number, r.floor, rt.name AS "roomType", rt.base_rate::float8 AS "baseRate"
       FROM rooms r
       JOIN room_types rt ON rt.id = r.room_type_id
       WHERE r.tenant_id = $1 AND r.property_id = $2
       ORDER BY r.number ASC`,
      [tenantId, propertyId],
    );
    const rooms = roomsRes.rows;
    console.log(`Found ${rooms.length} rooms`);

    // 3. Pool of 40 Realistic Luxury Hotel Guests
    const guestSeedData = [
      { name: 'Dr. Rohan Mehra', phone: '+91 98201 11223', email: 'rohan.mehra@aiims.test', nat: 'Indian', vip: true },
      { name: 'Sarah Jenkins', phone: '+44 7911 123456', email: 'sarah.jenkins@london.test', nat: 'British', vip: false },
      { name: 'Vikram Malhotra', phone: '+91 98112 34567', email: 'vikram.malhotra@bkc.test', nat: 'Indian', vip: false },
      { name: 'Pooja Sharma', phone: '+91 98765 43210', email: 'pooja.sharma@tcs.test', nat: 'Indian', vip: false },
      { name: 'David Arthur Miller', phone: '+44 7700 900123', email: 'd.miller@oxford.test', nat: 'British', vip: true },
      { name: 'Kenji Sato', phone: '+81 90 1234 5678', email: 'kenji.sato@tokyo.test', nat: 'Japanese', vip: false },
      { name: 'Sunita Rao', phone: '+91 98450 33445', email: 'sunita.rao@infosys.test', nat: 'Indian', vip: false },
      { name: 'Rajesh Singhania', phone: '+91 99201 98765', email: 'rajesh.singhania@group.test', nat: 'Indian', vip: true },
      { name: 'Amitav Ghosh', phone: '+91 98205 11223', email: 'amitav.ghosh@ril.test', nat: 'Indian', vip: false },
      { name: 'Priya Sundaram', phone: '+91 94440 12345', email: 'priya.s@wipro.test', nat: 'Indian', vip: false },
      { name: 'Neha Reddy', phone: '+91 97001 22334', email: 'neha.reddy@hyderabad.test', nat: 'Indian', vip: false },
      { name: 'Nitin Ambani', phone: '+91 98210 99988', email: 'nitin.ambani@corporate.test', nat: 'Indian', vip: true },
      { name: 'Kavita Krishnan', phone: '+91 98401 55667', email: 'kavita.k@chennai.test', nat: 'Indian', vip: false },
      { name: 'Arjun Kapoor', phone: '+91 98200 44556', email: 'arjun.k@mumbai.test', nat: 'Indian', vip: true },
      { name: 'Meera Kapoor', phone: '+91 98200 77889', email: 'meera.k@mumbai.test', nat: 'Indian', vip: true },
      { name: 'Tarun Khanna', phone: '+91 98102 33445', email: 'tarun.khanna@delhi.test', nat: 'Indian', vip: true },
      { name: 'German Consulate Delegation', phone: '+49 30 18170', email: 'consulate.mumbai@auswaertiges-amt.test', nat: 'German', vip: true },
      { name: 'Maharaja K. R. Scindia', phone: '+91 98210 99999', email: 'scindia.royal@gwalior.test', nat: 'Indian', vip: true },
      { name: 'Michael Chang', phone: '+1 415 555 2671', email: 'm.chang@siliconvalley.test', nat: 'American', vip: false },
      { name: 'Alok Mathur', phone: '+91 98290 12345', email: 'alok.mathur@jaipur.test', nat: 'Indian', vip: false },
      { name: 'Liam O’Connor', phone: '+353 1 496 0000', email: 'liam.oconnor@dublin.test', nat: 'Irish', vip: false },
      { name: 'Ananya Gupta', phone: '+91 98111 88990', email: 'ananya.gupta@delhi.test', nat: 'Indian', vip: false },
      { name: 'Sanjay Nair', phone: '+91 98470 11223', email: 'sanjay.nair@cochin.test', nat: 'Indian', vip: false },
      { name: 'Rahul Verma', phone: '+91 98203 44556', email: 'rahul.verma@bkc.test', nat: 'Indian', vip: false },
      { name: 'Deepak Varma', phone: '+91 98202 33445', email: 'deepak.varma@tcs.test', nat: 'Indian', vip: false },
      { name: 'Ananya Sen', phone: '+91 98300 11223', email: 'ananya.sen@kolkata.test', nat: 'Indian', vip: false },
      { name: 'François Dubois', phone: '+33 1 40 50 60 70', email: 'francois.dubois@paris.test', nat: 'French', vip: false },
      { name: 'Elena Rostova', phone: '+7 495 123 4567', email: 'elena.rostova@moscow.test', nat: 'Russian', vip: false },
      { name: 'Tanvi Deshmukh', phone: '+91 98220 33445', email: 'tanvi.d@pune.test', nat: 'Indian', vip: false },
      { name: 'Aditya Birla Travel', phone: '+91 22 2499 5000', email: 'travel@adityabirla.test', nat: 'Indian', vip: true },
    ];

    const guestIds: { id: string; vip: boolean; name: string }[] = [];
    for (const g of guestSeedData) {
      const pRes = await client.query(
        `INSERT INTO parties (tenant_id, full_name, phone, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [tenantId, g.name, g.phone, g.email],
      );
      const partyId = pRes.rows[0].id;
      const enc = encryptSensitiveField('998877665544');

      const gRes = await client.query(
        `INSERT INTO guests (
           tenant_id, property_id, party_id, nationality, id_type, id_number,
           id_number_ciphertext, id_number_iv, id_number_auth_tag, vip, notes
         )
         VALUES ($1, $2, $3, $4, 'passport', 'Z1234567', $5, $6, $7, $8, 'Historical verified luxury guest')
         RETURNING id`,
        [tenantId, propertyId, partyId, g.nat, enc.ciphertext, enc.iv, enc.authTag, g.vip],
      );
      guestIds.push({ id: gRes.rows[0].id, vip: g.vip, name: g.name });
    }
    console.log(`Seeded ${guestIds.length} guest profiles`);

    // 4. Delete only historical reservations before 2026-11-01 to avoid overlap, keeping current active/future bookings
    await client.query(
      `DELETE FROM reservations WHERE tenant_id = $1 AND property_id = $2 AND check_out <= '2026-11-01'`,
      [tenantId, propertyId],
    );

    // 5. Generate continuous historical stays room by room across 365 days (from 2026-10-31 back to 2025-11-01)
    const channels = [
      { source: 'direct', weight: 35, ota: null },
      { source: 'corporate', weight: 25, ota: null },
      { source: 'makemytrip', weight: 20, ota: 'MMT' },
      { source: 'booking_com', weight: 15, ota: 'BKG' },
      { source: 'agoda', weight: 5, ota: 'AGO' },
    ];

    function pickChannel(seedNum: number) {
      const mod = Math.abs(seedNum) % 100;
      if (mod < 35) return channels[0];
      if (mod < 60) return channels[1];
      if (mod < 80) return channels[2];
      if (mod < 95) return channels[3];
      return channels[4];
    }

    function addDays(baseDate: Date, days: number): Date {
      return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    }

    function formatDate(d: Date): string {
      return d.toISOString().slice(0, 10);
    }

    let totalHistoricalCreated = 0;
    const allStays: {
      checkIn: string;
      checkOut: string;
      roomId: string;
      roomRev: number;
      fnbRev: number;
      otherRev: number;
      taxTotal: number;
      grossTotal: number;
    }[] = [];

    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
      const room = rooms[rIdx];
      // Target end date: 2026-10-31
      let curCheckOut = new Date('2026-10-31');
      const minDate = new Date('2025-11-01');

      let stayCounter = 0;

      while (curCheckOut > minDate) {
        stayCounter++;
        // Varied duration: 2, 3, or 4 nights
        const duration = 2 + ((rIdx + stayCounter) % 3); // 2, 3, or 4 nights
        const curCheckIn = addDays(curCheckOut, -duration);

        if (curCheckIn < minDate) break;

        const checkInStr = formatDate(curCheckIn);
        const checkOutStr = formatDate(curCheckOut);

        const guest = guestIds[(rIdx * 7 + stayCounter) % guestIds.length];
        const ch = pickChannel(rIdx * 13 + stayCounter * 17);
        const otaId = ch.ota ? `${ch.ota}-${rIdx}${stayCounter}-${Math.floor(1000 + Math.random() * 9000)}` : null;

        // Base rate with subtle seasonal variation (+-10%)
        const seasonMult = 1.0 + (((stayCounter * 3) % 7) - 3) * 0.04;
        const nightlyRate = Math.round(room.baseRate * seasonMult);
        const totalRoomTariff = nightlyRate * duration;

        // F&B charges (in-room dining / restaurant): ~30% of room tariff
        const hasFnb = ((stayCounter + rIdx) % 4) !== 0;
        const fnbRate = hasFnb ? Math.round(nightlyRate * 0.3) : 0;
        const totalFnb = fnbRate * duration;

        // Ancillary Spa / Laundry (25% of stays)
        const hasSpa = ((stayCounter + rIdx) % 4) === 1;
        const totalSpa = hasSpa ? Math.round(1800 + (stayCounter % 3) * 1200) : 0;

        // GST calculation
        const roomTax = calculateGstTax('ACCOMMODATION', nightlyRate, duration, false);
        const fnbTax = calculateGstTax('FNB_REST', fnbRate, duration, false);
        const spaTax = calculateGstTax('SPA', hasSpa ? totalSpa : 0, 1, false);

        const grossTotal = roomTax.lineTotal + fnbTax.lineTotal + spaTax.lineTotal;
        const taxTotal = roomTax.taxTotal + fnbTax.taxTotal + spaTax.taxTotal;

        const checkInAt = `${checkInStr} 14:00:00+05:30`;
        const checkOutAt = `${checkOutStr} 11:00:00+05:30`;

        // Insert reservation
        const resRes = await client.query(
          `INSERT INTO reservations (
             tenant_id, property_id, guest_id, room_id, check_in, check_out,
             check_in_at, check_out_at, status, total_amount, rate_mode,
             booking_source, ota_booking_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'checked_out', $9, 'nightly', $10, $11)
           RETURNING id`,
          [
            tenantId,
            propertyId,
            guest.id,
            room.id,
            checkInStr,
            checkOutStr,
            checkInAt,
            checkOutAt,
            grossTotal,
            ch.source,
            otaId,
          ],
        );
        const resId = resRes.rows[0].id;

        // Link reservation guest
        await client.query(
          `INSERT INTO reservation_guests (tenant_id, reservation_id, guest_id, is_primary)
           VALUES ($1, $2, $3, true)
           ON CONFLICT DO NOTHING`,
          [tenantId, resId, guest.id],
        );

        // Folio
        const folioRes = await client.query(
          `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, currency, status, total, subtotal, tax_total)
           VALUES ($1, $2, $3, 'INR', 'paid', $4, $5, $6)
           RETURNING id`,
          [tenantId, propertyId, resId, grossTotal, grossTotal - taxTotal, taxTotal],
        );
        const folioId = folioRes.rows[0].id;

        // Folio Items: Room Charge
        await client.query(
          `INSERT INTO folio_items (
             tenant_id, property_id, folio_id, description, quantity, unit_price,
             tax_category_code, hsn_sac, tax_rate, cgst_amount, sgst_amount, igst_amount, line_total, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'ACCOMMODATION', '996311', $7, $8, $9, 0, $10, $11)`,
          [
            tenantId,
            propertyId,
            folioId,
            `${room.roomType} Room Tariff (${duration} nights)`,
            duration,
            nightlyRate,
            roomTax.cgstRate + roomTax.sgstRate,
            roomTax.cgstAmount,
            roomTax.sgstAmount,
            roomTax.lineTotal,
            checkInAt,
          ],
        );

        // Folio Item: F&B Dining
        if (hasFnb && fnbTax.lineTotal > 0) {
          await client.query(
            `INSERT INTO folio_items (
               tenant_id, property_id, folio_id, description, quantity, unit_price,
               tax_category_code, hsn_sac, tax_rate, cgst_amount, sgst_amount, igst_amount, line_total, created_at
             )
             VALUES ($1, $2, $3, 'In-Room Dining & Restaurant', $4, $5, 'FNB_REST', '996331', 5, $6, $7, 0, $8, $9)`,
            [
              tenantId,
              propertyId,
              folioId,
              duration,
              fnbRate,
              fnbTax.cgstAmount,
              fnbTax.sgstAmount,
              fnbTax.lineTotal,
              checkInAt,
            ],
          );
        }

        // Folio Item: Spa & Laundry
        if (hasSpa && spaTax.lineTotal > 0) {
          await client.query(
            `INSERT INTO folio_items (
               tenant_id, property_id, folio_id, description, quantity, unit_price,
               tax_category_code, hsn_sac, tax_rate, cgst_amount, sgst_amount, igst_amount, line_total, created_at
             )
             VALUES ($1, $2, $3, 'Jiva Luxury Spa & Laundry Service', 1, $4, 'SPA', '9997', 18, $5, $6, 0, $7, $8)`,
            [
              tenantId,
              propertyId,
              folioId,
              totalSpa,
              spaTax.cgstAmount,
              spaTax.sgstAmount,
              spaTax.lineTotal,
              checkInAt,
            ],
          );
        }

        // Payment Settlement: Settle 100% of folio
        const methods = ['card', 'upi', 'bank_transfer', 'cash'];
        const method = methods[(stayCounter * 3 + rIdx) % methods.length];
        await client.query(
          `INSERT INTO folio_payments (
             tenant_id, property_id, folio_id, amount, method, status, created_at
           )
           VALUES ($1, $2, $3, $4, $5, 'captured', $6)`,
          [tenantId, propertyId, folioId, grossTotal, method, checkOutAt],
        );

        allStays.push({
          checkIn: checkInStr,
          checkOut: checkOutStr,
          roomId: room.id,
          roomRev: roomTax.lineTotal,
          fnbRev: fnbTax.lineTotal,
          otherRev: spaTax.lineTotal,
          taxTotal,
          grossTotal,
        });

        totalHistoricalCreated++;

        // Step back: add 0 to 1 night turnaround gap between reservations for high occupancy (75-85%)
        const gapDays = (stayCounter % 4 === 0) ? 1 : 0;
        curCheckOut = addDays(curCheckIn, -gapDays);
      }
    }

    console.log(`Created ${totalHistoricalCreated} historical reservations spanning 365 days across all 18 rooms!`);

    // 6. Recalculate Night Audit Logs strictly from these real reservations for every single date
    console.log('Recalculating exact Night Audit Logs directly from historical reservations...');
    await client.query(
      `DELETE FROM night_audit_logs WHERE tenant_id = $1 AND property_id = $2 AND business_date <= '2026-10-31'`,
      [tenantId, propertyId],
    );

    // Compute day by day
    const curD = new Date('2025-11-01');
    const endD = new Date('2026-10-31');

    while (curD <= endD) {
      const dStr = curD.toISOString().slice(0, 10);

      // Find all reservations active on this night
      const activeOnDate = allStays.filter((s) => s.checkIn <= dStr && s.checkOut > dStr);
      const occupiedRooms = activeOnDate.length;
      const occPct = Math.round((occupiedRooms / 18) * 1000) / 10;

      let roomRev = 0;
      let fnbRev = 0;
      let otherRev = 0;
      let taxRev = 0;

      for (const s of activeOnDate) {
        const inD = new Date(s.checkIn);
        const outD = new Date(s.checkOut);
        const nights = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
        roomRev += s.roomRev / nights;
        fnbRev += s.fnbRev / nights;
        otherRev += s.otherRev / nights;
        taxRev += s.taxTotal / nights;
      }

      roomRev = Math.round(roomRev);
      fnbRev = Math.round(fnbRev);
      otherRev = Math.round(otherRev);
      taxRev = Math.round(taxRev);

      const adr = occupiedRooms > 0 ? Math.round(roomRev / occupiedRooms) : 0;
      const revpar = Math.round(roomRev / 18);

      await client.query(
        `INSERT INTO night_audit_logs (
           tenant_id, property_id, business_date, rooms_total, rooms_occupied,
           occupancy_rate, total_room_revenue, total_fnb_revenue, total_tax_collected,
           adr, revpar, no_shows_cancelled, created_at
         )
         VALUES ($1, $2, $3::date, 18, $4, $5, $6, $7, $8, $9, $10, 0, ($3::date::text || ' 23:59:00+05:30')::timestamptz)`,
        [tenantId, propertyId, dStr, occupiedRooms, occPct, roomRev, fnbRev, taxRev, adr, revpar],
      );

      curD.setDate(curD.getDate() + 1);
    }

    await client.query('commit');
    console.log('Successfully committed full year of realistic, consistent historical bookings and night audit logs!');
  } catch (err) {
    await client.query('rollback');
    console.error('Error during historical stay seed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
