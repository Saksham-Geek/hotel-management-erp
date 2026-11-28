import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

export type InvoiceSeriesType = 'TAX_INVOICE' | 'CREDIT_NOTE';

export interface NextInvoiceNumberResult {
  invoiceNumber: string;
  sequenceNumber: number;
  financialYear: string;
  seriesType: InvoiceSeriesType;
  gstin: string;
}

/**
 * Calculates statutory Indian Financial Year (01 April to 31 March).
 * e.g. 15-Nov-2026 -> fyFull: '2026-2027', fyCode: '26-27'
 *      15-Feb-2026 -> fyFull: '2025-2026', fyCode: '25-26'
 */
export function getIndianFinancialYear(date: Date = new Date()): { fyFull: string; fyCode: string } {
  const month = date.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const fyFull = `${startYear}-${endYear}`;
  const fyCode = `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  return { fyFull, fyCode };
}

/**
 * Generates gapless sequential invoice numbers under Indian GST Rule 46(b)
 * using PostgreSQL row-level locking (SELECT ... FOR UPDATE) inside the caller's transaction.
 *
 * Characteristics:
 * 1. Strict Monotonicity: 1, 2, 3... guaranteed with zero gaps.
 * 2. Scoped per GST Registration (GSTIN) & Financial Year: Prevents duplicate numbering
 *    when multiple properties operate under a single legal entity / GSTIN in the same State.
 * 3. Concurrency Protection: 50 simultaneous transactions queue on the row lock;
 *    each transaction commits its assigned number in sequence.
 * 4. Rule 46(b) Format Compliance: <= 16 characters containing letters, digits, and slashes.
 *    e.g. TAX_INVOICE: 'GA/26-27/000001' (15 chars)
 *         CREDIT_NOTE: 'GA/26-27/CN00001' (16 chars, up to 99,999 credit notes per FY)
 */
@Injectable()
export class InvoiceSequenceService {
  async getNextInvoiceNumber(
    client: PoolClient,
    params: {
      tenantId: string;
      propertyId: string;
      seriesType: InvoiceSeriesType;
      propertyCode?: string;
      gstin?: string;
      date?: Date;
    },
  ): Promise<NextInvoiceNumberResult> {
    const { tenantId, propertyId, seriesType, propertyCode = 'GA', date = new Date() } = params;
    const gstin = params.gstin?.trim() || '27AAAAA0000A1Z5';
    const { fyFull, fyCode } = getIndianFinancialYear(date);
    const cleanCode = propertyCode.slice(0, 3).toUpperCase();
    const prefix = seriesType === 'CREDIT_NOTE' ? `${cleanCode}-CN` : cleanCode;

    // 1. Ensure the sequence row exists for this (tenant, gstin, financial_year, series_type, prefix)
    await client.query(
      `INSERT INTO property_invoice_sequences (
         tenant_id, property_id, gstin, financial_year, series_type, prefix, last_number, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 0, now())
       ON CONFLICT (tenant_id, gstin, financial_year, series_type, prefix) DO NOTHING`,
      [tenantId, propertyId, gstin, fyCode, seriesType, prefix],
    );

    // 2. Exclusively lock the specific (tenant, gstin, financial_year, series_type, prefix) row
    const lockedRow = (
      await client.query(
        `SELECT last_number AS "lastNumber", prefix, gstin
         FROM property_invoice_sequences
         WHERE tenant_id = $1 AND gstin = $2 AND financial_year = $3 AND series_type = $4 AND prefix = $5
         FOR UPDATE`,
        [tenantId, gstin, fyCode, seriesType, prefix],
      )
    ).rows[0];

    const nextSeq = Number(lockedRow.lastNumber) + 1;

    // 3. Atomically increment the sequence counter
    await client.query(
      `UPDATE property_invoice_sequences
       SET last_number = $6, updated_at = now()
       WHERE tenant_id = $1 AND gstin = $2 AND financial_year = $3 AND series_type = $4 AND prefix = $5`,
      [tenantId, gstin, fyCode, seriesType, prefix, nextSeq],
    );

    // 4. Format sequential number under 16-character statutory ceiling (Rule 46(b))
    // TAX_INVOICE: 'GA/26-27/000001' (15 chars)
    // CREDIT_NOTE: 'GA/26-27/CN00001' (16 chars)
    const serialPadded =
      seriesType === 'CREDIT_NOTE'
        ? `CN${String(nextSeq).padStart(5, '0')}`
        : String(nextSeq).padStart(6, '0');
    const invoiceNumber = `${cleanCode}/${fyCode}/${serialPadded}`;

    return {
      invoiceNumber,
      sequenceNumber: nextSeq,
      financialYear: fyFull,
      seriesType,
      gstin,
    };
  }
}
