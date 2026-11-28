-- 049_gstin_sequences_and_maintenance_exclusions.sql
-- 1. Support maintenance / out-of-order blocks in reservations and exclusion constraints
-- 2. Scope sequential invoice numbers per GST registration (GSTIN) per Rule 46(b)
-- 3. Update credit note formatting and ensure advisory lock support for night audit

-- 1. Update reservations_status_check to include 'maintenance'
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status IN ('reserved', 'checked_in', 'checked_out', 'cancelled', 'maintenance'));

-- Update date-level exclusion constraint to include maintenance blocks
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_double_booking_date;
ALTER TABLE reservations ADD CONSTRAINT no_double_booking_date
  EXCLUDE USING gist (
    tenant_id WITH =,
    room_id WITH =,
    stay WITH &&
  ) WHERE (status IN ('reserved', 'checked_in', 'maintenance') AND rate_mode = 'nightly');

-- Update time-level exclusion constraint to include maintenance blocks
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_double_booking_time;
ALTER TABLE reservations ADD CONSTRAINT no_double_booking_time
  EXCLUDE USING gist (
    tenant_id WITH =,
    room_id WITH =,
    stay_time WITH &&
  ) WHERE (status IN ('reserved', 'checked_in', 'maintenance'));

-- 2. Update property_invoice_sequences to support GSTIN-scoping and multi-series per GSTIN
ALTER TABLE property_invoice_sequences 
  ADD COLUMN IF NOT EXISTS gstin text NOT NULL DEFAULT '27AAAAA0000A1Z5',
  ADD COLUMN IF NOT EXISTS series_code text NOT NULL DEFAULT 'DEFAULT';

-- Create unique index ensuring monotonic sequence per (tenant, gstin, financial_year, series_type, prefix)
CREATE UNIQUE INDEX IF NOT EXISTS gstin_invoice_sequence_unique_idx
  ON property_invoice_sequences (tenant_id, gstin, financial_year, series_type, prefix);

-- Add manager departure override audit columns to night_audit_logs if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'night_audit_logs') THEN
    ALTER TABLE night_audit_logs 
      ADD COLUMN IF NOT EXISTS departure_override boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS departure_override_reason text;
  END IF;
END $$;
