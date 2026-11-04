-- 014_performance_indexes_and_integrity.sql
-- High-performance composite indexes for multi-tenant queries, tape chart timeline scans,
-- night audit aggregation, and statutory tax invoice lookups.

-- 1. Folio items & payments performance indexes
create index if not exists folio_items_folio_idx on folio_items(folio_id);
create index if not exists folio_payments_folio_status_idx on folio_payments(folio_id, status);
create index if not exists folio_payments_corp_idx on folio_payments(corporate_account_id) where corporate_account_id is not null;

-- 2. Tape chart and reservation timeline lookup indexes
create index if not exists reservations_tape_chart_idx
  on reservations(tenant_id, property_id, status, check_in, check_out);

create index if not exists reservations_room_dates_idx
  on reservations(room_id, check_in, check_out);

-- 3. Corporate accounts & statutory tax invoice indexes
create index if not exists corporate_accounts_active_idx
  on corporate_accounts(tenant_id, property_id, is_active);

create index if not exists tax_invoices_fy_number_idx
  on tax_invoices(tenant_id, property_id, financial_year, invoice_number);

-- 4. Unique constraint to prevent duplicate final tax invoices on the same folio
create unique index if not exists tax_invoices_single_per_folio_idx
  on tax_invoices(tenant_id, property_id, folio_id)
  where invoice_type in ('B2C', 'B2B');

-- 5. Form C & Police report speed indexes
create index if not exists guest_form_c_res_idx
  on guest_form_c(tenant_id, property_id, reservation_id);

create index if not exists reservations_checkin_checkout_dates_idx
  on reservations(tenant_id, property_id, check_in, check_out);
