-- 046_idempotent_night_audit_folio_posting.sql
-- Enforce strict database-level idempotency on daily night audit folio charges.
-- Prevents duplicate room charge postings if the audit job runs twice or encounters retry loops.

ALTER TABLE folio_items
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES reservations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_date date,
  ADD COLUMN IF NOT EXISTS charge_type text NOT NULL DEFAULT 'MANUAL';

-- Disable enforce_property_scope during migration backfill
ALTER TABLE folio_items DISABLE TRIGGER enforce_property_scope;

-- Backfill reservation_id for existing folio items from parent reservation_folios
UPDATE folio_items fi
SET reservation_id = rf.reservation_id
FROM reservation_folios rf
WHERE fi.folio_id = rf.id AND fi.reservation_id IS NULL;

-- Backfill charge_type for existing daily room charges
UPDATE folio_items
SET charge_type = 'ROOM_NIGHTLY'
WHERE description LIKE 'Daily room charge%' AND charge_type = 'MANUAL';

-- Re-enable enforce_property_scope
ALTER TABLE folio_items ENABLE TRIGGER enforce_property_scope;

-- Unique partial index: On any folio, a specific charge_type for a specific business_date
-- can be posted AT MOST ONCE.
CREATE UNIQUE INDEX IF NOT EXISTS folio_items_idempotent_charge_idx
ON folio_items (folio_id, business_date, charge_type)
WHERE business_date IS NOT NULL AND charge_type IS NOT NULL;

-- Index for fast lookup by reservation, business date, and charge type
CREATE INDEX IF NOT EXISTS folio_items_res_business_date_idx
ON folio_items (tenant_id, reservation_id, business_date, charge_type);
