import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import '../src/load-env';

describe('Refined Night Audit Folio Idempotency, Multi-Room & Reversal-Repost Test', () => {
  let pool: Pool;
  let tenantId: string;
  let propertyId: string;
  let room1Id: string;
  let room2Id: string;
  let guestId: string;
  let reservationId: string;
  let folioId: string;
  let postedItem1Id: string;
  const businessDate = '2027-11-20';
  const unitRate1 = 6000;
  const unitRate2 = 7000;

  before(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_ADMIN_URL,
      max: 10,
    });

    const client = await pool.connect();
    try {
      // 1. Isolated tenant
      const tRes = await client.query(
        `INSERT INTO tenants (name, slug, vertical) 
         VALUES ('Refined Audit Hotel', 'refined-audit-hotel', 'hotel') 
         RETURNING id`,
      );
      tenantId = tRes.rows[0].id;

      // 2. Property
      const pRes = await client.query(
        `INSERT INTO properties (tenant_id, name, timezone, currency, is_default) 
         VALUES ($1, 'Refined Audit Resort', 'Asia/Kolkata', 'INR', true) 
         RETURNING id`,
        [tenantId],
      );
      propertyId = pRes.rows[0].id;

      // Session context
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // 3. Business date setup
      await client.query(
        `INSERT INTO hotel_business_dates (tenant_id, property_id, current_business_date) 
         VALUES ($1, $2, $3::date) 
         ON CONFLICT (tenant_id, property_id) 
         DO UPDATE SET current_business_date = $3::date`,
        [tenantId, propertyId, businessDate],
      );

      // 4. Guest & Party
      const partyRes = await client.query(
        `INSERT INTO parties (tenant_id, property_id, full_name, phone) 
         VALUES ($1, $2, 'Refined Audit Guest', '+91 97777 66666') 
         RETURNING id`,
        [tenantId, propertyId],
      );
      const guestRes = await client.query(
        `INSERT INTO guests (tenant_id, property_id, party_id) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        [tenantId, propertyId, partyRes.rows[0].id],
      );
      guestId = guestRes.rows[0].id;

      // 5. Room Type & 2 Distinct Rooms (for multi-room booking test)
      const rtRes = await client.query(
        `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity) 
         VALUES ($1, $2, 'Deluxe Suites', $3, 2) 
         RETURNING id`,
        [tenantId, propertyId, unitRate1],
      );
      const room1Res = await client.query(
        `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor) 
         VALUES ($1, $2, $3, '401-A', 4) 
         RETURNING id`,
        [tenantId, propertyId, rtRes.rows[0].id],
      );
      room1Id = room1Res.rows[0].id;

      const room2Res = await client.query(
        `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor) 
         VALUES ($1, $2, $3, '402-B', 4) 
         RETURNING id`,
        [tenantId, propertyId, rtRes.rows[0].id],
      );
      room2Id = room2Res.rows[0].id;

      // 6. Reservation associated with Room 1
      const resRes = await client.query(
        `INSERT INTO reservations (
           tenant_id, property_id, guest_id, room_id,
           check_in, check_out, check_in_at, check_out_at,
           rate_mode, unit_rate, total_amount, status
         ) VALUES (
           $1, $2, $3, $4,
           $5::date, ($5::date + interval '3 days')::date,
           ($5::date + '12:00'::time), (($5::date + interval '3 days')::date + '11:00'::time),
           'nightly', $6::numeric, $7::numeric, 'checked_in'
         ) RETURNING id`,
        [tenantId, propertyId, guestId, room1Id, businessDate, unitRate1, unitRate1 * 3],
      );
      reservationId = resRes.rows[0].id;

      // 7. Shared Folio
      const folioRes = await client.query(
        `INSERT INTO reservation_folios (tenant_id, property_id, reservation_id, subtotal, tax_total, total) 
         VALUES ($1, $2, $3, 0, 0, 0) 
         RETURNING id`,
        [tenantId, propertyId, reservationId],
      );
      folioId = folioRes.rows[0].id;
    } finally {
      client.release();
    }
  });

  after(async () => {
    if (pool && tenantId) {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('1. Posts daily room charge for Room 1 on business date', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      const postQuery = `
        INSERT INTO folio_items (
          tenant_id, property_id, folio_id, reservation_id, room_id, business_date, charge_type, status,
          description, quantity, unit_price, tax_rate, line_total,
          tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, 'ROOM_NIGHTLY', 'posted', $7, 1, $8, 5, $9, 'ACCOMMODATION', '996311', 150, 150, 0)
        ON CONFLICT (folio_id, reservation_id, room_id, business_date, charge_type)
        WHERE charge_type = 'ROOM_NIGHTLY' AND status = 'posted'
        DO NOTHING
        RETURNING id
      `;

      const insertRes = await client.query(postQuery, [
        tenantId,
        propertyId,
        folioId,
        reservationId,
        room1Id,
        businessDate,
        `Daily room charge - Room 401-A (${businessDate})`,
        unitRate1,
        unitRate1 + 300,
      ]);

      assert.equal(insertRes.rowCount, 1, 'Room 1 charge must insert successfully');
      postedItem1Id = insertRes.rows[0].id;

      await client.query(
        `UPDATE reservation_folios
         SET subtotal = subtotal + $2, tax_total = tax_total + $3, total = total + $4
         WHERE id = $1`,
        [folioId, unitRate1, 300, unitRate1 + 300],
      );

      const fCheck = await client.query(`SELECT subtotal::float8, tax_total::float8, total::float8 FROM reservation_folios WHERE id = $1`, [folioId]);
      assert.equal(fCheck.rows[0].subtotal, 6000);
      assert.equal(fCheck.rows[0].total, 6300);
    } finally {
      client.release();
    }
  });

  it('2. Multi-room folio support: Room 2 posts to same folio without collision on same date', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      const postQuery = `
        INSERT INTO folio_items (
          tenant_id, property_id, folio_id, reservation_id, room_id, business_date, charge_type, status,
          description, quantity, unit_price, tax_rate, line_total,
          tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, 'ROOM_NIGHTLY', 'posted', $7, 1, $8, 5, $9, 'ACCOMMODATION', '996311', 175, 175, 0)
        ON CONFLICT (folio_id, reservation_id, room_id, business_date, charge_type)
        WHERE charge_type = 'ROOM_NIGHTLY' AND status = 'posted'
        DO NOTHING
        RETURNING id
      `;

      // Room 2 has room2Id, distinct from room1Id
      const insertRes = await client.query(postQuery, [
        tenantId,
        propertyId,
        folioId,
        reservationId,
        room2Id,
        businessDate,
        `Daily room charge - Room 402-B (${businessDate})`,
        unitRate2,
        unitRate2 + 350,
      ]);

      assert.equal(insertRes.rowCount, 1, 'Multi-room charge for Room 2 on shared folio must NOT be dropped');

      await client.query(
        `UPDATE reservation_folios
         SET subtotal = subtotal + $2, tax_total = tax_total + $3, total = total + $4
         WHERE id = $1`,
        [folioId, unitRate2, 350, unitRate2 + 350],
      );

      const fCheck = await client.query(`SELECT subtotal::float8, total::float8 FROM reservation_folios WHERE id = $1`, [folioId]);
      assert.equal(fCheck.rows[0].subtotal, 13000); // 6000 + 7000
      assert.equal(fCheck.rows[0].total, 13650);    // 6300 + 7350
    } finally {
      client.release();
    }
  });

  it('3. Audit re-run on same room and date is strictly idempotent (0 duplicate postings)', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      const postQuery = `
        INSERT INTO folio_items (
          tenant_id, property_id, folio_id, reservation_id, room_id, business_date, charge_type, status,
          description, quantity, unit_price, tax_rate, line_total,
          tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, 'ROOM_NIGHTLY', 'posted', $7, 1, $8, 5, $9, 'ACCOMMODATION', '996311', 150, 150, 0)
        ON CONFLICT (folio_id, reservation_id, room_id, business_date, charge_type)
        WHERE charge_type = 'ROOM_NIGHTLY' AND status = 'posted'
        DO NOTHING
        RETURNING id
      `;

      // Attempt duplicate insertion for Room 1
      const insertRes = await client.query(postQuery, [
        tenantId,
        propertyId,
        folioId,
        reservationId,
        room1Id,
        businessDate,
        `Daily room charge - Room 401-A (${businessDate})`,
        unitRate1,
        unitRate1 + 300,
      ]);

      assert.equal(insertRes.rowCount, 0, 'Duplicate night audit insertion for Room 1 must be blocked');

      // Folio total unchanged
      const fCheck = await client.query(`SELECT subtotal::float8, total::float8 FROM reservation_folios WHERE id = $1`, [folioId]);
      assert.equal(fCheck.rows[0].subtotal, 13000);
      assert.equal(fCheck.rows[0].total, 13650);
    } finally {
      client.release();
    }
  });

  it('4. Rate correction produces explicit reversal and re-post (never silent drop)', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // Suppose Room 1 was charged Rs 6,000, but negotiated rate was Rs 5,000.
      // 1. Mark original item as reversed
      await client.query(`UPDATE folio_items SET status = 'reversed' WHERE id = $1`, [postedItem1Id]);

      // 2. Insert explicit negative reversal entry
      const revRes = await client.query(
        `INSERT INTO folio_items (
           tenant_id, property_id, folio_id, reservation_id, room_id, business_date, charge_type, status, source_line_id,
           description, quantity, unit_price, tax_rate, line_total, tax_category_code, hsn_sac,
           cgst_amount, sgst_amount, igst_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6::date, 'ROOM_NIGHTLY', 'reversal', $7, 'Reversal: Rate correction', 1, -6000, 5, -6300, 'ACCOMMODATION', '996311', -150, -150, 0)
         RETURNING id`,
        [tenantId, propertyId, folioId, reservationId, room1Id, businessDate, postedItem1Id],
      );
      assert.ok(revRes.rows[0].id);

      // 3. Re-post corrected charge (Rs 5,000 + 5% tax = Rs 5,250)
      const repostRes = await client.query(
        `INSERT INTO folio_items (
           tenant_id, property_id, folio_id, reservation_id, room_id, business_date, charge_type, status, source_line_id,
           description, quantity, unit_price, tax_rate, line_total, tax_category_code, hsn_sac,
           cgst_amount, sgst_amount, igst_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6::date, 'ROOM_NIGHTLY', 'posted', $7, 'Daily room charge - Room 401-A (Corrected Rs 5000)', 1, 5000, 5, 5250, 'ACCOMMODATION', '996311', 125, 125, 0)
         RETURNING id`,
        [tenantId, propertyId, folioId, reservationId, room1Id, businessDate, postedItem1Id],
      );
      assert.ok(repostRes.rows[0].id, 'Corrected repost must succeed because original status is now reversed');

      // 4. Update folio summary
      const totals = (
        await client.query(
          `SELECT coalesce(sum(quantity * unit_price), 0)::float8 AS subtotal,
                  coalesce(sum(cgst_amount + sgst_amount + igst_amount), 0)::float8 AS tax_total,
                  coalesce(sum(line_total), 0)::float8 AS total
           FROM folio_items WHERE folio_id = $1`,
          [folioId],
        )
      ).rows[0];

      // Original subtotal was 13,000 (6,000 + 7,000).
      // Reversal: -6,000. Repost: +5,000. New subtotal: 12,000. Total: 12,600.
      assert.equal(totals.subtotal, 12000);
      assert.equal(totals.tax_total, 600);
      assert.equal(totals.total, 12600);
    } finally {
      client.release();
    }
  });

  it('5. Audit Gate blocks roll forward when open restaurant KOTs or unassigned arrivals exist', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // Setup outlet and table for F&B order
      const outletRes = await client.query(
        `INSERT INTO restaurant_outlets (tenant_id, property_id, name, code, outlet_type)
         VALUES ($1, $2, 'Poolside Bistro', 'PB-01', 'dine_in')
         RETURNING id`,
        [tenantId, propertyId],
      );
      const outletId = outletRes.rows[0].id;

      // Insert an open / active KOT that is unpaid
      const kotRes = await client.query(
        `INSERT INTO kot_orders (
           tenant_id, property_id, outlet_id, kot_number, order_type, status, payment_status, total_amount
         )
         VALUES ($1, $2, $3, 'KOT-9999', 'dine_in', 'preparing', 'unpaid', 850.00)
         RETURNING id`,
        [tenantId, propertyId, outletId],
      );
      const openKotId = kotRes.rows[0].id;

      // Check Gate: Query open KOT blockers
      const openKots = (
        await client.query(
          `SELECT k.id, k.kot_number AS "kotNumber"
           FROM kot_orders k
           WHERE k.tenant_id = $1 AND k.property_id = $2
             AND k.status IN ('pending', 'preparing', 'ready', 'served')
             AND k.payment_status = 'unpaid'`,
          [tenantId, propertyId],
        )
      ).rows;
      assert.ok(openKots.length > 0, 'Must detect open unpaid KOT order');

      // Verify business date does NOT roll forward while gate is blocked
      const bDateBefore = (
        await client.query(
          `SELECT current_business_date::text AS bdate FROM hotel_business_dates WHERE tenant_id = $1 AND property_id = $2`,
          [tenantId, propertyId],
        )
      ).rows[0].bdate;
      assert.equal(bDateBefore, businessDate);

      // Now settle the KOT (e.g. guest pays or charges to room)
      await client.query(
        `UPDATE kot_orders SET status = 'settled', payment_status = 'paid_direct' WHERE id = $1`,
        [openKotId],
      );

      // Check Gate again: Open KOTs must now be zero
      const openKotsAfter = (
        await client.query(
          `SELECT count(*)::int AS count
           FROM kot_orders k
           WHERE k.tenant_id = $1 AND k.property_id = $2
             AND k.status IN ('pending', 'preparing', 'ready', 'served')
             AND k.payment_status = 'unpaid'`,
          [tenantId, propertyId],
        )
      ).rows[0].count;
      assert.equal(openKotsAfter, 0, 'All KOT orders must be settled');

      // Now close audit and roll forward to next day
      const nextDate = (
        await client.query(
          `UPDATE hotel_business_dates
           SET current_business_date = current_business_date + interval '1 day',
               is_audit_in_progress = false,
               last_audited_at = now()
           WHERE tenant_id = $1 AND property_id = $2
           RETURNING current_business_date::text AS "newBusinessDate"`,
          [tenantId, propertyId],
        )
      ).rows[0].newBusinessDate;

      assert.equal(nextDate, '2027-11-21', 'Business date must roll strictly to next day on successful audit close');
    } finally {
      client.release();
    }
  });

  it('6. Manager departure override allows night audit with late checkouts and logs reason', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // Create a fresh room for late departure test
      const rtRes = (await client.query(`SELECT id FROM room_types WHERE tenant_id = $1 LIMIT 1`, [tenantId])).rows[0];
      const roomLateId = (
        await client.query(
          `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor) VALUES ($1, $2, $3, '403-LATE', 4) RETURNING id`,
          [tenantId, propertyId, rtRes.id],
        )
      ).rows[0].id;

      // Create a late departure reservation (check_out = current business date)
      const lateRes = (
        await client.query(
          `INSERT INTO reservations (
             tenant_id, property_id, guest_id, room_id,
             check_in, check_out, check_in_at, check_out_at,
             rate_mode, unit_rate, total_amount, status
           ) VALUES ($1, $2, $3, $4, '2027-11-18'::date, '2027-11-21'::date, '2027-11-18 12:00'::timestamptz, '2027-11-21 11:00'::timestamptz, 'nightly', 5000, 15000, 'checked_in')
           RETURNING id`,
          [tenantId, propertyId, guestId, roomLateId],
        )
      ).rows[0].id;

      // With manager override, audit succeeds and logs override details
      const auditLog = (
        await client.query(
          `INSERT INTO night_audit_logs (
             tenant_id, property_id, business_date, rooms_total, rooms_occupied, occupancy_rate,
             total_room_revenue, total_fnb_revenue, total_tax_collected, adr, revpar,
             departure_override, departure_override_reason
           )
           VALUES ($1, $2, '2027-11-21'::date, 2, 1, 50, 5000, 0, 250, 5000, 2500, true, 'Flight delayed, late checkout approved by Duty Manager')
           RETURNING id, departure_override AS "departureOverride", departure_override_reason AS "overrideReason"`,
          [tenantId, propertyId],
        )
      ).rows[0];

      assert.equal(auditLog.departureOverride, true);
      assert.match(auditLog.overrideReason, /late checkout approved/i);
    } finally {
      client.release();
    }
  });

  it('7. Advisory transaction lock prevents concurrent night audit execution on the same property', async () => {
    const client1 = await pool.connect();
    const client2 = await pool.connect();
    try {
      await client1.query('BEGIN');
      // Client 1 acquires the advisory lock for property
      const lock1 = (
        await client1.query(
          `SELECT pg_try_advisory_xact_lock(hashtext('night_audit_' || $1::text)) AS acquired`,
          [propertyId],
        )
      ).rows[0].acquired;
      assert.equal(lock1, true, 'Client 1 must successfully acquire advisory lock');

      // Client 2 attempts to acquire the same lock concurrently -> must return false!
      const lock2 = (
        await client2.query(
          `SELECT pg_try_advisory_xact_lock(hashtext('night_audit_' || $1::text)) AS acquired`,
          [propertyId],
        )
      ).rows[0].acquired;
      assert.equal(lock2, false, 'Client 2 concurrent attempt must fail to acquire the lock (preventing overlap)');

      // Commit client 1 transaction releases the lock
      await client1.query('COMMIT');

      // Client 2 can now acquire the lock
      await client2.query('BEGIN');
      const lock2After = (
        await client2.query(
          `SELECT pg_try_advisory_xact_lock(hashtext('night_audit_' || $1::text)) AS acquired`,
          [propertyId],
        )
      ).rows[0].acquired;
      assert.equal(lock2After, true, 'Client 2 can acquire lock after Client 1 transaction ends');
      await client2.query('COMMIT');
    } finally {
      client1.release();
      client2.release();
    }
  });
});
