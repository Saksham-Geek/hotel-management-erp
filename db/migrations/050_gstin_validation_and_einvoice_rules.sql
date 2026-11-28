-- 050_gstin_validation_and_einvoice_rules.sql
-- 1. Support 'not_applicable' for IRN status on B2C invoices and sub-threshold hotels
-- 2. Add real GSTIN column and e-invoicing threshold flag to properties table
-- 3. Drop hardcoded dummy default GSTINs

-- 1. Update tax_invoices_irn_status_check constraint to include 'not_applicable'
ALTER TABLE tax_invoices DROP CONSTRAINT IF EXISTS tax_invoices_irn_status_check;
ALTER TABLE tax_invoices ADD CONSTRAINT tax_invoices_irn_status_check
  CHECK (irn_status IN ('not_applicable', 'pending', 'generated', 'failed', 'cancelled'));

-- 2. Add gstin and turnover_exceeds_einvoice_threshold to properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS turnover_exceeds_einvoice_threshold boolean NOT NULL DEFAULT false;

-- Add format check constraint for GSTIN on properties (15-char standard format)
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_gstin_format_check;
ALTER TABLE properties ADD CONSTRAINT properties_gstin_format_check
  CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');

-- Backfill Grand Azure Hotel with a valid sample GSTIN (Maharashtra 27, PAN AAACG1234F)
UPDATE properties
SET gstin = '27AAACG1234F1Z8'
WHERE gstin IS NULL AND name ILIKE '%Grand Azure%';

-- 3. Remove hardcoded dummy defaults from sequences and tax_invoices
ALTER TABLE property_invoice_sequences ALTER COLUMN gstin DROP DEFAULT;
ALTER TABLE tax_invoices ALTER COLUMN hotel_gstin DROP DEFAULT;
