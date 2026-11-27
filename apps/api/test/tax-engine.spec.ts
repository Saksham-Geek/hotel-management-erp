import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVersionedGstTax,
  calculateGstTax,
  resolveTaxRule,
} from '../src/hotel/tax-calculator';

describe('Versioned Indian Hotel GST Tax Engine (56th GST Council Compliant)', () => {
  describe('Boundary Cases: Accommodation (SAC 996311) Post-22 Sep 2025', () => {
    const postCouncilDate = '2025-10-01';

    it('applies 5% without ITC for room tariff exactly at Rs 7,500.00', () => {
      const res = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 7500.0,
        quantity: 1,
        effectiveDate: postCouncilDate,
      });

      assert.equal(res.hsnSac, '996311');
      assert.equal(res.cgstRate, 2.5);
      assert.equal(res.sgstRate, 2.5);
      assert.equal(res.igstRate, 0);
      assert.equal(res.taxableAmount, 7500.0);
      assert.equal(res.cgstAmount, 187.5);
      assert.equal(res.sgstAmount, 187.5);
      assert.equal(res.taxTotal, 375.0);
      assert.equal(res.lineTotal, 7875.0);
      assert.equal(res.itcAllowed, false);
    });

    it('applies 18% with ITC for room tariff at Rs 7,500.01 (1 paisa above slab threshold)', () => {
      const res = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 7500.01,
        quantity: 1,
        effectiveDate: postCouncilDate,
      });

      assert.equal(res.hsnSac, '996311');
      assert.equal(res.cgstRate, 9.0);
      assert.equal(res.sgstRate, 9.0);
      assert.equal(res.taxableAmount, 7500.01);
      assert.equal(res.cgstAmount, 675.0); // 7500.01 * 0.09 = 675.0009 -> 675.00
      assert.equal(res.sgstAmount, 675.0);
      assert.equal(res.taxTotal, 1350.0);
      assert.equal(res.lineTotal, 8850.01);
      assert.equal(res.itcAllowed, true);
    });

    it('applies slab to daily declared tariff, NOT the multi-day booking total', () => {
      // 4 nights at Rs 5,000/night = Rs 20,000 booking total.
      // Under statutory rules, tariff is Rs 5,000/day <= 7,500, so 5% applies!
      const res = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 5000.0,
        quantity: 4,
        effectiveDate: postCouncilDate,
      });

      assert.equal(res.cgstRate, 2.5);
      assert.equal(res.sgstRate, 2.5);
      assert.equal(res.taxableAmount, 20000.0);
      assert.equal(res.cgstAmount, 500.0);
      assert.equal(res.sgstAmount, 500.0);
      assert.equal(res.taxTotal, 1000.0);
      assert.equal(res.lineTotal, 21000.0);
      assert.equal(res.itcAllowed, false);
    });
  });

  describe('Historical Rates & Effective-Date Rollover', () => {
    it('applies historical 12% with ITC for dates before 22-Sep-2025', () => {
      const res = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 4500.0,
        quantity: 1,
        effectiveDate: '2025-08-15', // Pre-56th GST Council
      });

      assert.equal(res.cgstRate, 6.0);
      assert.equal(res.sgstRate, 6.0);
      assert.equal(res.taxTotal, 540.0);
      assert.equal(res.itcAllowed, true);
    });

    it('transitions smoothly on 22-Sep-2025 from 12% to 5%', () => {
      const preRes = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 6000.0,
        effectiveDate: '2025-09-21',
      });
      const postRes = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 6000.0,
        effectiveDate: '2025-09-22',
      });

      assert.equal(preRes.cgstRate + preRes.sgstRate, 12.0);
      assert.equal(preRes.itcAllowed, true);

      assert.equal(postRes.cgstRate + postRes.sgstRate, 5.0);
      assert.equal(postRes.itcAllowed, false);
    });
  });

  describe('Specified Premises & F&B Restaurant Services (SAC 996331)', () => {
    it('applies 5% without ITC for restaurant dining in non-specified hotel premises', () => {
      const res = calculateVersionedGstTax({
        categoryCode: 'FNB_REST',
        declaredDailyTariff: 1200.0, // Food bill total
        isSpecifiedPremises: false,
      });

      assert.equal(res.hsnSac, '996331');
      assert.equal(res.cgstRate, 2.5);
      assert.equal(res.sgstRate, 2.5);
      assert.equal(res.taxTotal, 60.0);
      assert.equal(res.itcAllowed, false);
    });

    it('applies 18% with ITC for restaurant dining in specified premises (room tariff > 7,500 in prev FY)', () => {
      const res = calculateVersionedGstTax({
        categoryCode: 'FNB_REST',
        declaredDailyTariff: 1200.0,
        isSpecifiedPremises: true,
      });

      assert.equal(res.hsnSac, '996331');
      assert.equal(res.cgstRate, 9.0);
      assert.equal(res.sgstRate, 9.0);
      assert.equal(res.taxTotal, 216.0);
      assert.equal(res.itcAllowed, true);
    });
  });

  describe('Interstate Billing (IGST vs CGST/SGST)', () => {
    it('applies single IGST bucket for interstate bookings', () => {
      const res = calculateVersionedGstTax({
        categoryCode: 'ACCOMMODATION',
        declaredDailyTariff: 10000.0, // > 7,500 slab
        isInterstate: true,
        effectiveDate: '2026-01-01',
      });

      assert.equal(res.cgstRate, 0);
      assert.equal(res.sgstRate, 0);
      assert.equal(res.igstRate, 18.0);
      assert.equal(res.cgstAmount, 0);
      assert.equal(res.sgstAmount, 0);
      assert.equal(res.igstAmount, 1800.0);
      assert.equal(res.taxTotal, 1800.0);
      assert.equal(res.itcAllowed, true);
    });
  });
});
