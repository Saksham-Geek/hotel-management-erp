export interface TaxRule {
  id?: string;
  categoryCode: string;
  sacCode: string;
  slabFrom: number;
  slabTo: number | null;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  totalRate: number;
  itcAllowed: boolean;
  requiresSpecifiedPremises: boolean;
  validFrom: string; // YYYY-MM-DD
  validTo: string | null; // YYYY-MM-DD or null for active
  description: string;
}

export interface TaxCalculationInput {
  categoryCode: string;
  declaredDailyTariff: number; // Tariff per room per night (slab determinant)
  quantity?: number;
  isInterstate?: boolean;
  isSpecifiedPremises?: boolean; // Hotel had room > 7,500 in preceding FY
  effectiveDate?: string | Date; // Date of stay / billing
  customRules?: TaxRule[];
}

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
  itcAllowed: boolean;
  isSpecifiedPremises: boolean;
  appliedRuleDescription: string;
  effectiveDate: string;
}

/**
 * Statutory Indian GST Baseline Rules
 * Reflects 56th GST Council decisions (effective 22-Sep-2025) and historical rates.
 * Can be overridden or extended dynamically from property-level tax_rules table.
 */
export const STATUTORY_GST_BASELINE_RULES: TaxRule[] = [
  // 1. Post-56th GST Council Accommodation (Effective 2025-09-22 onwards)
  // Up to Rs 7,500 per unit per day: 5% without ITC
  {
    categoryCode: 'ACCOMMODATION',
    sacCode: '996311',
    slabFrom: 0,
    slabTo: 7500.0,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5.0,
    totalRate: 5.0,
    itcAllowed: false,
    requiresSpecifiedPremises: false,
    validFrom: '2025-09-22',
    validTo: null,
    description: '56th GST Council: Hotel accommodation <= Rs 7,500/unit/day (5% without ITC)',
  },
  // Over Rs 7,500 per unit per day: 18% with ITC
  {
    categoryCode: 'ACCOMMODATION',
    sacCode: '996311',
    slabFrom: 7500.01,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2025-09-22',
    validTo: null,
    description: '56th GST Council: Hotel accommodation > Rs 7,500/unit/day (18% with ITC)',
  },

  // 2. Pre-56th GST Council Historical Accommodation (2017-07-01 to 2025-09-21)
  {
    categoryCode: 'ACCOMMODATION',
    sacCode: '996311',
    slabFrom: 0,
    slabTo: 7500.0,
    cgstRate: 6.0,
    sgstRate: 6.0,
    igstRate: 12.0,
    totalRate: 12.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2017-07-01',
    validTo: '2025-09-21',
    description: 'Historical Statutory: Hotel room tariff <= Rs 7,500/day (12% with ITC)',
  },
  {
    categoryCode: 'ACCOMMODATION',
    sacCode: '996311',
    slabFrom: 7500.01,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2017-07-01',
    validTo: '2025-09-21',
    description: 'Historical Statutory: Hotel room tariff > Rs 7,500/day (18% with ITC)',
  },

  // 3. Restaurant & In-Room Dining (SAC 996331)
  // Non-specified premises (room tariff <= 7,500 in preceding FY): 5% without ITC
  {
    categoryCode: 'FNB_REST',
    sacCode: '996331',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5.0,
    totalRate: 5.0,
    itcAllowed: false,
    requiresSpecifiedPremises: false,
    validFrom: '2017-11-15',
    validTo: null,
    description: 'F&B Restaurant Services in non-specified premises (5% without ITC)',
  },
  // Specified premises (hotel had any room > Rs 7,500 in preceding FY): 18% with ITC
  {
    categoryCode: 'FNB_REST',
    sacCode: '996331',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: true,
    validFrom: '2017-11-15',
    validTo: null,
    description: 'F&B Restaurant Services in specified premises with room tariff > Rs 7,500 in prev FY (18% with ITC)',
  },
  {
    categoryCode: 'FNB_ROOM_SERVICE',
    sacCode: '996331',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 5.0,
    totalRate: 5.0,
    itcAllowed: false,
    requiresSpecifiedPremises: false,
    validFrom: '2017-11-15',
    validTo: null,
    description: 'In-Room Dining / Room Service in non-specified premises (5% without ITC)',
  },
  {
    categoryCode: 'FNB_ROOM_SERVICE',
    sacCode: '996331',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: true,
    validFrom: '2017-11-15',
    validTo: null,
    description: 'In-Room Dining / Room Service in specified premises (18% with ITC)',
  },

  // 4. Ancillary Hospitality Services
  {
    categoryCode: 'LAUNDRY',
    sacCode: '9997',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2017-07-01',
    validTo: null,
    description: 'Guest Laundry Services (18% with ITC)',
  },
  {
    categoryCode: 'SPA',
    sacCode: '999721',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2017-07-01',
    validTo: null,
    description: 'Spa, Wellness & Salon Services (18% with ITC)',
  },
  {
    categoryCode: 'BANQUET',
    sacCode: '998592',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2017-07-01',
    validTo: null,
    description: 'Banqueting & Mandap Keepers Services (18% with ITC)',
  },
  {
    categoryCode: 'MISC_SERVICE',
    sacCode: '999999',
    slabFrom: 0,
    slabTo: null,
    cgstRate: 9.0,
    sgstRate: 9.0,
    igstRate: 18.0,
    totalRate: 18.0,
    itcAllowed: true,
    requiresSpecifiedPremises: false,
    validFrom: '2017-07-01',
    validTo: null,
    description: 'Standard Ancillary Hospitality (18% with ITC)',
  },
];

/**
 * Normalizes any date input to ISO 'YYYY-MM-DD'
 */
function normalizeDateStr(d?: string | Date): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') {
    const trimmed = d.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Finds the applicable statutory tax rule based on category, declared unit tariff,
 * specified premises classification, and effective date.
 */
export function resolveTaxRule(
  categoryCode: string,
  declaredDailyTariff: number,
  isSpecifiedPremises = false,
  effectiveDate?: string | Date,
  customRules?: TaxRule[],
): TaxRule {
  const dateStr = normalizeDateStr(effectiveDate);
  const rules = customRules && customRules.length > 0 ? customRules : STATUTORY_GST_BASELINE_RULES;

  // Filter rules matching category and date validity
  const candidates = rules.filter((r) => {
    if (r.categoryCode !== categoryCode) return false;
    if (r.validFrom > dateStr) return false;
    if (r.validTo && r.validTo < dateStr) return false;
    return true;
  });

  if (candidates.length === 0) {
    // Safe statutory fallback
    return {
      categoryCode,
      sacCode: '999999',
      slabFrom: 0,
      slabTo: null,
      cgstRate: 9.0,
      sgstRate: 9.0,
      igstRate: 18.0,
      totalRate: 18.0,
      itcAllowed: true,
      requiresSpecifiedPremises: false,
      validFrom: '2017-07-01',
      validTo: null,
      description: 'Default Fallback (18% with ITC)',
    };
  }

  // 1. Accommodation: Evaluate slab on declared tariff per unit per day
  if (categoryCode === 'ACCOMMODATION') {
    const matched = candidates.find((r) => {
      if (declaredDailyTariff < r.slabFrom) return false;
      if (r.slabTo !== null && declaredDailyTariff > r.slabTo) return false;
      return true;
    });
    if (matched) return matched;
  }

  // 2. F&B: Evaluate specified premises condition
  if (categoryCode === 'FNB_REST' || categoryCode === 'FNB_ROOM_SERVICE') {
    const matched = candidates.find((r) => r.requiresSpecifiedPremises === isSpecifiedPremises);
    if (matched) return matched;
  }

  // 3. Standard fallback among candidates
  return candidates[0];
}

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Validates an Indian Goods and Services Tax Identification Number (GSTIN).
 * Verifies standard 15-character format and Mod-36 Luhn-style statutory checksum.
 * e.g. '27AAACG1234F1Z8'
 */
export function validateGstin(gstin: string): { valid: boolean; error?: string } {
  if (!gstin || typeof gstin !== 'string') {
    return { valid: false, error: 'GSTIN must be a non-empty string' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { valid: false, error: `GSTIN must be exactly 15 characters (received ${clean.length})` };
  }

  // Format: 2 digits (State), 5 letters (PAN), 4 digits, 1 letter, 1 alphanumeric (entity #), 'Z', 1 checksum
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) {
    return { valid: false, error: 'GSTIN does not match statutory pattern (State + PAN + Entity + Z + Checksum)' };
  }

  // Mod-36 Checksum verification
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const char = clean[i];
    const codePoint = GSTIN_CHARS.indexOf(char);
    if (codePoint === -1) return { valid: false, error: `Invalid character '${char}' in GSTIN` };

    const factor = codePoint * (i % 2 === 0 ? 1 : 2);
    const quotient = Math.floor(factor / 36);
    const remainder = factor % 36;
    sum += quotient + remainder;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  const expectedCheckChar = GSTIN_CHARS[checkCodePoint];

  if (clean[14] !== expectedCheckChar) {
    return {
      valid: false,
      error: `GSTIN checksum mismatch: character 15 is '${clean[14]}', expected '${expectedCheckChar}'`,
    };
  }

  return { valid: true };
}

/**
 * Robust decimal-to-integer conversion from rupees to integer paise.
 * Avoids IEEE 754 64-bit float multiplication errors.
 *
 * Rules:
 * - Throws TypeError on invalid, NaN, non-finite, null, or undefined input.
 * - Throws RangeError on negative amounts unless allowNegative = true.
 * - Throws RangeError if string representation has > 2 decimal places (no silent truncation).
 */
export function toPaise(amount: number | string, allowNegative = false): number {
  if (amount === null || amount === undefined) {
    throw new TypeError('Monetary amount cannot be null or undefined');
  }

  let str: string;
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || Number.isNaN(amount)) {
      throw new TypeError(`Invalid monetary amount: ${amount}`);
    }
    if (amount < 0 && !allowNegative) {
      throw new RangeError(`Monetary amount cannot be negative: ${amount}`);
    }
    str = Math.abs(amount) < 1e-9 ? '0.00' : (Math.abs(amount) + Number.EPSILON).toFixed(2);
  } else if (typeof amount === 'string') {
    str = amount.trim();
    if (!str || !/^-?\d+(?:\.\d+)?$/.test(str)) {
      throw new TypeError(`Invalid monetary string format: "${amount}"`);
    }
  } else {
    throw new TypeError(`Expected number or string for monetary amount, got ${typeof amount}`);
  }

  const isNegative = typeof amount === 'number' ? amount < 0 : str.startsWith('-');
  if (isNegative && !allowNegative) {
    throw new RangeError(`Monetary amount cannot be negative: "${amount}"`);
  }

  const cleanStr = str.replace(/^-/, '');
  const parts = cleanStr.split('.');

  if (parts[1] && parts[1].length > 2) {
    throw new RangeError(`Monetary amounts cannot have more than 2 decimal places: "${amount}"`);
  }

  const rupees = parseInt(parts[0], 10) || 0;
  let paise = 0;
  if (parts[1]) {
    const paiseStr = parts[1].padEnd(2, '0').slice(0, 2);
    paise = parseInt(paiseStr, 10) || 0;
  }
  const totalPaise = rupees * 100 + paise;
  return isNegative ? -totalPaise : totalPaise;
}

export function toSignedPaise(amount: number | string): number {
  return toPaise(amount, true);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Versioned, effective-dated Indian GST Tax Calculation.
 * Correctly evaluates:
 * - 56th GST Council room rates: 5% without ITC under Rs 7,500; 18% with ITC above.
 * - Slab applies to declared tariff per unit per day, NOT invoice total.
 * - F&B specified premises: 18% with ITC vs 5% without ITC.
 * - Place of Supply (Section 12(3)(b) & Section 12(4) IGST Act): Hotel accommodation
 *   and restaurant services are statutorily located at the immovable property,
 *   meaning supplies by a hotel registered in the property state are intra-state (CGST + SGST).
 * - Exact integer paise calculations end-to-end to eliminate float representation drift.
 * - Engineering Design Choice for odd-paisa allocation: CGST = floor(total/2), SGST = remainder
 *   ensuring CGST + SGST === Total Tax with 0.00% drift. Invoice total round-off follows Section 170.
 */
export function calculateVersionedGstTax(input: TaxCalculationInput): TaxCalculationResult {
  const safeTariff = Number.isFinite(input.declaredDailyTariff) && input.declaredDailyTariff >= 0 ? input.declaredDailyTariff : 0;
  const safeQty = Number.isFinite(input.quantity) && (input.quantity ?? 1) > 0 ? (input.quantity ?? 1) : 1;
  const isInterstate = Boolean(input.isInterstate);
  const isSpecified = Boolean(input.isSpecifiedPremises);
  const dateStr = normalizeDateStr(input.effectiveDate);

  const rule = resolveTaxRule(
    input.categoryCode,
    safeTariff,
    isSpecified,
    dateStr,
    input.customRules,
  );

  // 1. Integer paise calculations (1 INR = 100 paise)
  const tariffPaise = toPaise(safeTariff);
  const taxableAmountPaise = Math.round(tariffPaise * safeQty);
  const totalRate = rule.totalRate;
  const halfRate = totalRate / 2;

  const cgstRate = isInterstate ? 0 : halfRate;
  const sgstRate = isInterstate ? 0 : halfRate;
  const igstRate = isInterstate ? totalRate : 0;

  // 2. Tax in integer paise: Math.round((taxableAmountPaise * totalRate) / 100)
  const totalTaxPaise = Math.round((taxableAmountPaise * totalRate) / 100);

  // 3. Engineering Design Choice for odd paisa:
  // CGST gets Math.floor(totalTaxPaise / 2), and SGST gets remainder (totalTaxPaise - cgstPaise).
  // This guarantees CGST + SGST === Total Tax with 0.00% drift.
  // Final invoice grand total rounding follows Section 170 (nearest whole rupee).
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isInterstate) {
    igstPaise = totalTaxPaise;
  } else {
    cgstPaise = Math.floor(totalTaxPaise / 2);
    sgstPaise = totalTaxPaise - cgstPaise;
  }

  const lineTotalPaise = taxableAmountPaise + totalTaxPaise;

  return {
    categoryCode: input.categoryCode,
    hsnSac: rule.sacCode,
    taxableAmount: fromPaise(taxableAmountPaise),
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount: fromPaise(cgstPaise),
    sgstAmount: fromPaise(sgstPaise),
    igstAmount: fromPaise(igstPaise),
    taxTotal: fromPaise(totalTaxPaise),
    lineTotal: fromPaise(lineTotalPaise),
    itcAllowed: rule.itcAllowed,
    isSpecifiedPremises: isSpecified,
    appliedRuleDescription: rule.description,
    effectiveDate: dateStr,
  };
}

/**
 * Backward compatibility wrapper for existing code calling calculateGstTax.
 */
export function calculateGstTax(
  categoryCode: string,
  unitPrice: number,
  quantity = 1,
  isInterstate = false,
  isSpecifiedPremises = false,
  effectiveDate?: string | Date,
): TaxCalculationResult {
  return calculateVersionedGstTax({
    categoryCode,
    declaredDailyTariff: unitPrice,
    quantity,
    isInterstate,
    isSpecifiedPremises,
    effectiveDate,
  });
}
