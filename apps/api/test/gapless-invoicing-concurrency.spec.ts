import '../src/load-env';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { InvoiceSequenceService, getIndianFinancialYear } from '../src/hotel/invoice-sequence.service';

const adminDbUrl = process.env.DATABASE_ADMIN_URL || 'postgres://erp_owner:erp_owner_dev@localhost:5433/hotel_management_clean';
const appDbUrl = process.env.DATABASE_URL || 'postgres://erp_app:erp_app_dev@localhost:5433/hotel_management_clean';

describe('Gapless Sequential Invoice Numbering & 50-Concurrency Stress Test (Rule 46(b))', () => {
  let adminPool: Pool;
  let appPool: Pool;
  let testTenantId: string;
  let testPropertyId: string;
  const service = new InvoiceSequenceService();

  before(async () => {
    adminPool = new Pool({ connectionString: adminDbUrl, max: 5 });
    appPool = new Pool({ connectionString: appDbUrl, max: 65 });

    const client = await adminPool.connect();
    try {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const tRes = await client.query(
        `INSERT INTO tenants (name, slug, vertical)
         VALUES ('Gapless Test Chain', 'gapless-' || $1, 'hotel')
         RETURNING id`,
        [randomSuffix],
      );
      testTenantId = tRes.rows[0].id;

      const pRes = await client.query(
        `INSERT INTO properties (tenant_id, name, timezone, currency, is_default)
         VALUES ($1, 'Grand Gapless Hotel', 'Asia/Kolkata', 'INR', true)
         RETURNING id`,
        [testTenantId],
      );
      testPropertyId = pRes.rows[0].id;
    } finally {
      client.release();
    }
  });

  after(async () => {
    if (adminPool && testTenantId) {
      const client = await adminPool.connect();
      try {
        await client.query('DELETE FROM property_invoice_sequences WHERE tenant_id = $1', [testTenantId]).catch(() => {});
        await client.query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
      } finally {
        client.release();
      }
      await adminPool.end();
    }
    if (appPool) {
      await appPool.end();
    }
  });

  it('correctly calculates Indian Financial Year (Apr 1 to Mar 31)', () => {
    const novDate = new Date(2026, 10, 15); // Nov 2026
    const resNov = getIndianFinancialYear(novDate);
    assert.equal(resNov.fyFull, '2026-2027');
    assert.equal(resNov.fyCode, '26-27');

    const febDate = new Date(2026, 1, 15); // Feb 2026
    const resFeb = getIndianFinancialYear(febDate);
    assert.equal(resFeb.fyFull, '2025-2026');
    assert.equal(resFeb.fyCode, '25-26');

    const aprDate = new Date(2026, 3, 1); // Apr 1, 2026
    const resApr = getIndianFinancialYear(aprDate);
    assert.equal(resApr.fyFull, '2026-2027');
    assert.equal(resApr.fyCode, '26-27');
  });

  it('runs 50 simultaneous concurrent invoice creations: produces exactly 1..50 with ZERO gaps and ZERO duplicates', async () => {
    const CONCURRENCY = 50;
    const promises: Promise<{ invoiceNumber: string; sequenceNumber: number }>[] = [];

    for (let i = 0; i < CONCURRENCY; i++) {
      promises.push(
        (async () => {
          const client = await appPool.connect();
          try {
            await client.query('BEGIN');
            await client.query(`SET LOCAL "app.tenant_id" = '${testTenantId}'`);
            await client.query(`SET LOCAL "app.property_id" = '${testPropertyId}'`);

            const result = await service.getNextInvoiceNumber(client, {
              tenantId: testTenantId,
              propertyId: testPropertyId,
              seriesType: 'TAX_INVOICE',
              propertyCode: 'GA',
            });

            await client.query('COMMIT');
            return {
              invoiceNumber: result.invoiceNumber,
              sequenceNumber: result.sequenceNumber,
            };
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            throw err;
          } finally {
            client.release();
          }
        })(),
      );
    }

    const results = await Promise.all(promises);

    // 1. All 50 succeed
    assert.equal(results.length, CONCURRENCY, 'All 50 invoice generation transactions must succeed');

    // 2. Exactly 50 unique invoice numbers (no duplicates)
    const uniqueInvoiceNumbers = new Set(results.map((r) => r.invoiceNumber));
    assert.equal(uniqueInvoiceNumbers.size, CONCURRENCY, 'Every invoice number must be strictly unique');

    // 3. Exactly sequences 1 through 50 with ZERO gaps
    const seqNumbers = results.map((r) => r.sequenceNumber).sort((a, b) => a - b);
    for (let i = 0; i < CONCURRENCY; i++) {
      const expected = i + 1;
      assert.equal(
        seqNumbers[i],
        expected,
        `Sequence at index ${i} must be exactly ${expected} (found ${seqNumbers[i]}). No gaps permitted!`,
      );
    }

    // 4. CGST Rule 46(b) length verification: must not exceed 16 characters
    for (const res of results) {
      assert.ok(
        res.invoiceNumber.length <= 16,
        `Invoice number "${res.invoiceNumber}" length (${res.invoiceNumber.length}) exceeds statutory 16-char limit!`,
      );
      assert.match(res.invoiceNumber, /^GA\/\d{2}-\d{2}\/\d{6}$/);
    }
  });

  it('runs separate credit note sequence: produces monotonic numbers under separate series without colliding with invoices', async () => {
    const CN_CONCURRENCY = 15;
    const promises: Promise<{ invoiceNumber: string; sequenceNumber: number }>[] = [];

    for (let i = 0; i < CN_CONCURRENCY; i++) {
      promises.push(
        (async () => {
          const client = await appPool.connect();
          try {
            await client.query('BEGIN');
            await client.query(`SET LOCAL "app.tenant_id" = '${testTenantId}'`);
            await client.query(`SET LOCAL "app.property_id" = '${testPropertyId}'`);

            const result = await service.getNextInvoiceNumber(client, {
              tenantId: testTenantId,
              propertyId: testPropertyId,
              seriesType: 'CREDIT_NOTE',
              propertyCode: 'GA',
            });

            await client.query('COMMIT');
            return {
              invoiceNumber: result.invoiceNumber,
              sequenceNumber: result.sequenceNumber,
            };
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            throw err;
          } finally {
            client.release();
          }
        })(),
      );
    }

    const results = await Promise.all(promises);

    assert.equal(results.length, CN_CONCURRENCY);
    const uniqueCnNumbers = new Set(results.map((r) => r.invoiceNumber));
    assert.equal(uniqueCnNumbers.size, CN_CONCURRENCY);

    const seqNumbers = results.map((r) => r.sequenceNumber).sort((a, b) => a - b);
    for (let i = 0; i < CN_CONCURRENCY; i++) {
      assert.equal(seqNumbers[i], i + 1, `Credit note sequence must be continuous 1..${CN_CONCURRENCY}`);
    }

    for (const res of results) {
      assert.ok(res.invoiceNumber.length <= 16);
      assert.match(res.invoiceNumber, /^GA\/\d{2}-\d{2}\/CN\d{5}$/);
    }
  });
});
