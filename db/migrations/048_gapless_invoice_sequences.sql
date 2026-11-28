-- 048_gapless_invoice_sequences.sql
-- Statutory Gapless Sequential Invoice & Credit Note Numbering (Section 31 & Rule 46 CGST Rules)
-- Guarantees monotonically increasing, consecutive numbers per property per financial year without gaps.

CREATE TABLE IF NOT EXISTS property_invoice_sequences (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id uuid NOT NULL,
  financial_year text NOT NULL, -- e.g. '2026-27'
  series_type text NOT NULL CHECK (series_type IN ('TAX_INVOICE', 'CREDIT_NOTE')),
  prefix text NOT NULL DEFAULT 'INV', -- e.g. 'INV', 'CN'
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, property_id, financial_year, series_type),
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS property_invoice_sequences_lookup_idx
  ON property_invoice_sequences (tenant_id, property_id, financial_year, series_type);

ALTER TABLE property_invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS property_invoice_sequences_tenant_isolation ON property_invoice_sequences;
CREATE POLICY property_invoice_sequences_tenant_isolation ON property_invoice_sequences
  FOR ALL
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE ON property_invoice_sequences TO erp_app;
