import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import '../src/load-env';

describe('Idempotent Night Audit Folio Posting Test', () => {
  let pool: Pool;
  let tenantId: string;
  let propertyId: string;
  let roomId: string;
  let guestId: string;
  let reservationId: string;
  let folioId: string;
  const businessDate = '2027-11-20';
  const unitRate = 6000;

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
         VALUES ('Idempotency Audit Hotel', 'idempotency-audit-hotel', 'hotel') 
         RETURNING id`,
      );
      tenantId = tRes.rows[0].id;

      // 2. Property
      const pRes = await client.query(
        `INSERT INTO properties (tenant_id, name, timezone, currency, is_default) 
         VALUES ($1, 'Idempotency Resort', 'Asia/Kolkata', 'INR', true) 
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
         VALUES ($1, $2, 'Audit Test Guest', '+91 98888 77777') 
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

      // 5. Room Type & Room
      const rtRes = await client.query(
        `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity) 
         VALUES ($1, $2, 'Executive Club', $3, 2) 
         RETURNING id`,
        [tenantId, propertyId, unitRate],
      );
      const roomRes = await client.query(
        `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor) 
         VALUES ($1, $2, $3, '301-AUDIT', 3) 
         RETURNING id`,
        [tenantId, propertyId, rtRes.rows[0].id],
      );
      roomId = roomRes.rows[0].id;

      // 6. Checked-in reservation
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
        [tenantId, propertyId, guestId, roomId, businessDate, unitRate, unitRate * 3],
      );
      reservationId = resRes.rows[0].id;

      // 7. Initial Folio
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

  it('first night audit execution posts exactly 1 room charge to folio', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // Post room charge via idempotent query
      const postQuery = `
        INSERT INTO folio_items (
          tenant_id, property_id, folio_id, reservation_id, business_date, charge_type,
          description, quantity, unit_price, tax_rate, line_total,
          tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
        )
        VALUES ($1, $2, $3, $4, $5::date, 'ROOM_NIGHTLY', $6, 1, $7, 5, $8, 'ACCOMMODATION', '996311', 150, 150, 0)
        ON CONFLICT (folio_id, business_date, charge_type) WHERE business_date IS NOT NULL AND charge_type IS NOT NULL
        DO NOTHING
        RETURNING id
      `;

      const insertRes = await client.query(postQuery, [
        tenantId,
        propertyId,
        folioId,
        reservationId,
        businessDate,
        `Daily room charge (${businessDate})`,
        unitRate,
        unitRate + 300,
      ]);

      assert.equal(insertRes.rowCount, 1, 'First run must insert 1 folio item');

      // Update folio
      await client.query(
        `UPDATE reservation_folios
         SET subtotal = subtotal + $2, tax_total = tax_total + $3, total = total + $4
         WHERE id = $1`,
        [folioId, unitRate, 300, unitRate + 300],
      );

      // Check folio
      const fCheck = await client.query(`SELECT subtotal::float8, tax_total::float8, total::float8 FROM reservation_folios WHERE id = $1`, [folioId]);
      assert.equal(fCheck.rows[0].subtotal, 6000);
      assert.equal(fCheck.rows[0].tax_total, 300);
      assert.equal(fCheck.rows[0].total, 6300);
    } finally {
      client.release();
    }
  });

  it('second night audit execution for same business date is strictly idempotent (0 duplicate charges)', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // Run exact same query a second time (simulating audit rerun or worker retry)
      const postQuery = `
        INSERT INTO folio_items (
          tenant_id, property_id, folio_id, reservation_id, business_date, charge_type,
          description, quantity, unit_price, tax_rate, line_total,
          tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
        )
        VALUES ($1, $2, $3, $4, $5::date, 'ROOM_NIGHTLY', $6, 1, $7, 5, $8, 'ACCOMMODATION', '996311', 150, 150, 0)
        ON CONFLICT (folio_id, business_date, charge_type) WHERE business_date IS NOT NULL AND charge_type IS NOT NULL
        DO NOTHING
        RETURNING id
      `;

      const insertRes = await client.query(postQuery, [
        tenantId,
        propertyId,
        folioId,
        reservationId,
        businessDate,
        `Daily room charge (${businessDate})`,
        unitRate,
        unitRate + 300,
      ]);

      // Assert: ZERO rows inserted because constraint prevented duplicate posting
      assert.equal(insertRes.rowCount, 0, 'Second run must return 0 inserted rows due to ON CONFLICT DO NOTHING');

      // Folio total must remain unchanged (NOT doubled)
      const fCheck = await client.query(`SELECT subtotal::float8, tax_total::float8, total::float8 FROM reservation_folios WHERE id = $1`, [folioId]);
      assert.equal(fCheck.rows[0].subtotal, 6000, 'Subtotal must not be doubled');
      assert.equal(fCheck.rows[0].tax_total, 300, 'Tax total must not be doubled');
      assert.equal(fCheck.rows[0].total, 6300, 'Grand total must not be doubled');

      // Verify total items count
      const itemsCount = await client.query(
        `SELECT count(*)::int AS count FROM folio_items 
         WHERE folio_id = $1 AND business_date = $2::date AND charge_type = 'ROOM_NIGHTLY'`,
        [folioId, businessDate],
      );
      assert.equal(itemsCount.rows[0].count, 1, 'Strictly 1 room charge row exists in database');
    } finally {
      client.release();
    }
  });

  it('direct raw INSERT without ON CONFLICT throws 23505 unique violation', async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      await assert.rejects(
        async () => {
          await client.query(
            `INSERT INTO folio_items (
               tenant_id, property_id, folio_id, reservation_id, business_date, charge_type,
               description, quantity, unit_price, tax_rate, line_total,
               tax_category_code, hsn_sac, cgst_amount, sgst_amount, igst_amount
             )
             VALUES ($1, $2, $3, $4, $5::date, 'ROOM_NIGHTLY', 'Duplicate charge attempt', 1, $6, 5, 6300, 'ACCOMMODATION', '996311', 150, 150, 0)`,
            [tenantId, propertyId, folioId, reservationId, businessDate, unitRate],
          );
        },
        (err: any) => {
          assert.equal(err.code, '23505', 'Must fail with PostgreSQL 23505 (unique_violation)');
          return true;
        },
      );
    } finally {
      client.release();
    }
  });
});
