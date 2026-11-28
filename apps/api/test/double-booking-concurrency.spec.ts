import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import '../src/load-env';

describe('Concurrency & Double-Booking Exclusion Constraint Test (50 Simultaneous Bookings)', () => {
  let pool: Pool;
  let tenantId: string;
  let propertyId: string;
  let roomId: string;
  let guestId: string;

  before(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_ADMIN_URL,
      max: 20,
    });

    const client = await pool.connect();
    try {
      // Setup an isolated tenant for concurrency testing
      const tenantRes = await client.query(
        `INSERT INTO tenants (name, slug, vertical) 
         VALUES ('Concurrency Test Hotel', 'concurrency-test-hotel', 'hotel') 
         RETURNING id`,
      );
      tenantId = tenantRes.rows[0].id;

      // Setup property
      const propRes = await client.query(
        `INSERT INTO properties (tenant_id, name, timezone, currency, is_default) 
         VALUES ($1, 'Concurrency Test Resort', 'Asia/Kolkata', 'INR', true) 
         RETURNING id`,
        [tenantId],
      );
      propertyId = propRes.rows[0].id;

      // Set session context for the setup client
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );

      // Setup party and guest
      const partyRes = await client.query(
        `INSERT INTO parties (tenant_id, property_id, full_name, phone) 
         VALUES ($1, $2, 'Concurrency Guest', '+91 99999 88888') 
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

      // Setup room type and room
      const rtRes = await client.query(
        `INSERT INTO room_types (tenant_id, property_id, name, base_rate, capacity) 
         VALUES ($1, $2, 'Concurrency Suite', 6000, 2) 
         RETURNING id`,
        [tenantId, propertyId],
      );
      const roomRes = await client.query(
        `INSERT INTO rooms (tenant_id, property_id, room_type_id, number, floor) 
         VALUES ($1, $2, $3, '999-CONC', 9) 
         RETURNING id`,
        [tenantId, propertyId, rtRes.rows[0].id],
      );
      roomId = roomRes.rows[0].id;
    } finally {
      client.release();
    }
  });

  after(async () => {
    if (pool && tenantId) {
      const client = await pool.connect();
      try {
        await client.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('fires 50 simultaneous booking requests for the exact same room and dates: exactly 1 succeeds, 49 fail with 23P01 exclusion violation', async () => {
    const checkIn = '2027-11-10';
    const checkOut = '2027-11-15';
    const totalAttempts = 50;

    // Fire 50 concurrent booking attempts using connection pool
    const bookingPromises = Array.from({ length: totalAttempts }, async (_, index) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          "SELECT set_config('app.tenant_id', $1, true), set_config('app.property_id', $2, true)",
          [tenantId, propertyId],
        );
        const query = `
          INSERT INTO reservations (
            tenant_id, property_id, guest_id, room_id,
            check_in, check_out, check_in_at, check_out_at,
            rate_mode, unit_rate, total_amount, status
          ) VALUES (
            $1, $2, $3, $4,
            $5::date, $6::date,
            ($5::date + '12:00'::time), ($6::date + '11:00'::time),
            'nightly', 6000, 30000, 'reserved'
          ) RETURNING id
        `;
        const res = await client.query(query, [
          tenantId,
          propertyId,
          guestId,
          roomId,
          checkIn,
          checkOut,
        ]);
        await client.query('COMMIT');
        return { success: true, id: res.rows[0].id, index };
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => undefined);
        return {
          success: false,
          errorCode: err.code, // Expect 23P01 (exclusion_violation)
          errorMessage: err.message,
          index,
        };
      } finally {
        client.release();
      }
    });

    const results = await Promise.all(bookingPromises);

    const successfulBookings = results.filter((r) => r.success);
    const failedBookings = results.filter((r) => !r.success);

    console.log(`[Concurrency Results] Succeeded: ${successfulBookings.length}, Rejected: ${failedBookings.length}`);
    if (failedBookings.length > 0) {
      console.log(`[Sample Rejection Error] Code: ${failedBookings[0].errorCode}, Msg: ${failedBookings[0].errorMessage}`);
    }

    // Assert: Exactly ONE transaction must succeed
    assert.equal(
      successfulBookings.length,
      1,
      `Expected exactly 1 successful booking out of 50, but got ${successfulBookings.length}`,
    );

    // Assert: Exactly 49 transactions must be rejected
    assert.equal(
      failedBookings.length,
      totalAttempts - 1,
      `Expected exactly ${totalAttempts - 1} failed bookings, but got ${failedBookings.length}`,
    );

    // Assert: All rejected bookings failed due to PostgreSQL 23P01 exclusion constraint
    for (const failure of failedBookings) {
      assert.equal(
        failure.errorCode,
        '23P01',
        `Expected error code 23P01 (exclusion_violation), but got: ${failure.errorCode} (${failure.errorMessage})`,
      );
    }

    // Verify in database: Exactly 1 reservation exists for this room
    const client = await pool.connect();
    try {
      await client.query(
        "SELECT set_config('app.tenant_id', $1, false), set_config('app.property_id', $2, false)",
        [tenantId, propertyId],
      );
      const dbCheck = await client.query(
        `SELECT count(*)::int as count FROM reservations 
         WHERE room_id = $1 AND status IN ('reserved', 'checked_in')`,
        [roomId],
      );
      assert.equal(dbCheck.rows[0].count, 1, 'Database must contain strictly 1 active reservation');
    } finally {
      client.release();
    }
  });
});
