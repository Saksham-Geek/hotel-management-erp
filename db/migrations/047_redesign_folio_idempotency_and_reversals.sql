-- 047_redesign_folio_idempotency_and_reversals.sql
-- Refine folio items idempotency key to prevent silent drops on multi-room folios and mid-stay room changes.
-- Support explicit reversal-and-repost accounting flow for rate corrections.

-- 1. Drop over-broad index from migration 046
DROP INDEX IF EXISTS folio_items_idempotent_charge_idx;

-- 2. Add room_id, source_line_id (reversal link), and item status
ALTER TABLE folio_items
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_line_id uuid REFERENCES folio_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed', 'reversal'));

-- 3. Adjust check constraints to allow negative offsetting amounts for explicit reversal entries
ALTER TABLE folio_items DROP CONSTRAINT IF EXISTS folio_items_cgst_amount_check;
ALTER TABLE folio_items ADD CONSTRAINT folio_items_cgst_amount_check CHECK (status = 'reversal' OR cgst_amount >= 0);

ALTER TABLE folio_items DROP CONSTRAINT IF EXISTS folio_items_sgst_amount_check;
ALTER TABLE folio_items ADD CONSTRAINT folio_items_sgst_amount_check CHECK (status = 'reversal' OR sgst_amount >= 0);

ALTER TABLE folio_items DROP CONSTRAINT IF EXISTS folio_items_igst_amount_check;
ALTER TABLE folio_items ADD CONSTRAINT folio_items_igst_amount_check CHECK (status = 'reversal' OR igst_amount >= 0);

ALTER TABLE folio_items DROP CONSTRAINT IF EXISTS folio_items_unit_price_check;
ALTER TABLE folio_items ADD CONSTRAINT folio_items_unit_price_check CHECK (status = 'reversal' OR unit_price >= 0);

ALTER TABLE folio_items DROP CONSTRAINT IF EXISTS folio_items_line_total_check;
ALTER TABLE folio_items ADD CONSTRAINT folio_items_line_total_check CHECK (status = 'reversal' OR line_total >= 0);

-- Disable trigger during migration backfill
ALTER TABLE folio_items DISABLE TRIGGER enforce_property_scope;

-- Backfill room_id from reservations
UPDATE folio_items fi
SET room_id = r.room_id
FROM reservations r
WHERE fi.reservation_id = r.id AND fi.room_id IS NULL;

-- Re-enable trigger
ALTER TABLE folio_items ENABLE TRIGGER enforce_property_scope;

-- 4. Targeted Unique Index for Automated Night Audit Room Charges:
-- Exactly one active 'posted' charge per (folio, reservation, room, business_date) for 'ROOM_NIGHTLY'.
-- Multi-room bookings with distinct room_ids on the same folio will each post cleanly.
-- Reversed items (status = 'reversed') do not conflict, permitting explicit reversal + repost.
CREATE UNIQUE INDEX IF NOT EXISTS folio_items_audit_room_charge_idx
ON folio_items (folio_id, reservation_id, room_id, business_date, charge_type)
WHERE charge_type = 'ROOM_NIGHTLY' AND status = 'posted';

-- Index for lineage tracking (reversals)
CREATE INDEX IF NOT EXISTS folio_items_source_line_idx
ON folio_items (source_line_id)
WHERE source_line_id IS NOT NULL;
