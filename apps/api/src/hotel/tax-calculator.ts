export interface TaxCalculationResult {
  categoryCode: string;
  hsnSac: string;
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  lineTotal: number;
}

/**
 * Indian GST Tax Calculation according to statutory slabs:
 * - Room accommodation (SAC 996311): 12% for tariff <= Rs 7,500; 18% for tariff > Rs 7,500
 * - F&B Restaurant / Room service (SAC 996331): 5% without ITC (or 18% in luxury)
 * - Guest Laundry (SAC 9997): 18%
 * - Intra-state: CGST + SGST
 * - Inter-state: IGST
 */
export function calculateGstTax(
  categoryCode: string,
  unitPrice: number,
  quantity = 1,
  isInterstate = false,
): TaxCalculationResult {
  const safePrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const taxableAmount = Math.round(safePrice * safeQty * 100) / 100;
  let hsnSac = '996311';
  let totalRate = 12;

  switch (categoryCode) {
    case 'ACCOMMODATION':
      hsnSac = '996311';
      // Indian GST rule: > 7,500 per day per unit is 18%, <= 7,500 is 12%
      totalRate = safePrice > 7500 ? 18 : 12;
      break;
    case 'FNB_REST':
    case 'FNB_ROOM_SERVICE':
      hsnSac = '996331';
      totalRate = 5;
      break;
    case 'LAUNDRY':
      hsnSac = '9997';
      totalRate = 18;
      break;
    case 'SPA':
      hsnSac = '999721';
      totalRate = 18;
      break;
    default:
      hsnSac = '999999';
      totalRate = 18;
      break;
  }

  const halfRate = totalRate / 2;
  const cgstRate = isInterstate ? 0 : halfRate;
  const sgstRate = isInterstate ? 0 : halfRate;
  const igstRate = isInterstate ? totalRate : 0;

  const cgstAmount = isInterstate ? 0 : Math.round(((taxableAmount * cgstRate) / 100) * 100) / 100;
  const sgstAmount = isInterstate ? 0 : Math.round(((taxableAmount * sgstRate) / 100) * 100) / 100;
  const igstAmount = isInterstate ? Math.round(((taxableAmount * igstRate) / 100) * 100) / 100 : 0;
  const taxTotal = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;
  const lineTotal = Math.round((taxableAmount + taxTotal) * 100) / 100;

  return {
    categoryCode,
    hsnSac,
    taxableAmount,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxTotal,
    lineTotal,
  };
}
