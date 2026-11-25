-- =====================================================================
-- Migration 041: Enterprise Architecture & Comprehensive Hospitality Suite
-- Phase 1: Database-backed KYC bridge sessions, automated night audit settings
-- Phase 2: Recipe Costing & Kitchen Bill of Materials (BOM)
-- Phase 3: Chart of Accounts (COA), Double-Entry Journal Ledger, Multi-Folio Routing
-- Phase 4: Housekeeping Turnaround Logs, Minibar Catalog & Dynamic Pricing Rules
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ephemeral KYC Bridge Sessions (Clustered / Distributed Safe)
-- ---------------------------------------------------------------------
create table if not exists kyc_bridge_sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text unique not null,
  status text not null default 'pending', -- 'pending', 'uploaded', 'claimed', 'expired'
  data jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists kyc_bridge_sessions_code_idx on kyc_bridge_sessions(session_code);
create index if not exists kyc_bridge_sessions_expires_idx on kyc_bridge_sessions(expires_at);

-- ---------------------------------------------------------------------
-- 2. Automated Night Audit Configuration on hotel_business_dates
-- ---------------------------------------------------------------------
alter table hotel_business_dates add column if not exists auto_audit_enabled boolean not null default false;
alter table hotel_business_dates add column if not exists auto_audit_time text not null default '02:00';
alter table hotel_business_dates add column if not exists auto_audit_last_run_at timestamptz;

-- ---------------------------------------------------------------------
-- 3. Phase 2: Recipe Bill of Materials (BOM) & Inventory Depletion
-- ---------------------------------------------------------------------
create table if not exists menu_item_recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  raw_material_id uuid not null references raw_materials(id) on delete cascade,
  quantity_required numeric(12, 4) not null default 1.0,
  unit text not null default 'kg',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, menu_item_id, raw_material_id)
);

create index if not exists menu_item_recipes_menu_idx on menu_item_recipes(menu_item_id);
create index if not exists menu_item_recipes_mat_idx on menu_item_recipes(raw_material_id);

alter table menu_item_recipes enable row level security;
alter table menu_item_recipes force row level security;

create policy tenant_isolation on menu_item_recipes
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on menu_item_recipes
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- ---------------------------------------------------------------------
-- 4. Phase 3: Chart of Accounts & General Ledger (Double-Entry Bookkeeping)
-- ---------------------------------------------------------------------
create table if not exists chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  account_code text not null,
  account_name text not null,
  account_type text not null, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
  sub_category text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  current_balance numeric(14, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  unique (property_id, account_code)
);

create index if not exists chart_of_accounts_prop_idx on chart_of_accounts(property_id);

alter table chart_of_accounts enable row level security;
alter table chart_of_accounts force row level security;

create policy tenant_isolation on chart_of_accounts
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on chart_of_accounts
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- Journal Entries & Vouchers
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  voucher_number text not null,
  voucher_date date not null default current_date,
  source_module text not null, -- 'FOLIO_PAYMENT', 'PETTY_CASH', 'GRN_PURCHASE', 'NIGHT_AUDIT', 'MANUAL_JOURNAL'
  source_reference_id text,
  narration text not null,
  total_debit numeric(14, 2) not null default 0.00,
  total_credit numeric(14, 2) not null default 0.00,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_prop_idx on journal_entries(property_id, voucher_date);

alter table journal_entries enable row level security;
alter table journal_entries force row level security;

create policy tenant_isolation on journal_entries
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on journal_entries
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- Journal Lines (Double-Entry Debit/Credit breakdown)
create table if not exists journal_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id) on delete restrict,
  debit_amount numeric(14, 2) not null default 0.00,
  credit_amount numeric(14, 2) not null default 0.00,
  line_narration text,
  created_at timestamptz not null default now()
);

create index if not exists journal_lines_entry_idx on journal_lines(journal_entry_id);
create index if not exists journal_lines_account_idx on journal_lines(account_id);

alter table journal_lines enable row level security;
alter table journal_lines force row level security;

create policy tenant_isolation on journal_lines
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on journal_lines
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- Reservation Multi-Folio Routing Rules
create table if not exists reservation_folio_routings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  reservation_id uuid not null references reservations(id) on delete cascade,
  target_folio_type text not null default 'MASTER_COMPANY', -- 'MASTER_COMPANY', 'GUEST_PERSONAL', 'EXTRA_SPLIT'
  charge_category text not null default 'ROOM_TARIFF', -- 'ALL', 'ROOM_TARIFF', 'FNB_AND_MINIBAR', 'LAUNDRY_EXTRAS'
  company_name text,
  company_gstin text,
  billing_notes text,
  created_at timestamptz not null default now()
);

create index if not exists reservation_folio_routings_res_idx on reservation_folio_routings(reservation_id);

alter table reservation_folio_routings enable row level security;
alter table reservation_folio_routings force row level security;

create policy tenant_isolation on reservation_folio_routings
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on reservation_folio_routings
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- ---------------------------------------------------------------------
-- 5. Phase 4: Housekeeping Turnaround Logs, Minibar Catalog & Dynamic Pricing
-- ---------------------------------------------------------------------
create table if not exists housekeeping_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  attendant_name text not null,
  from_status text not null,
  to_status text not null,
  inspection_notes text,
  maintenance_issue text,
  logged_at timestamptz not null default now()
);

create index if not exists housekeeping_logs_room_idx on housekeeping_logs(room_id);

alter table housekeeping_logs enable row level security;
alter table housekeeping_logs force row level security;

create policy tenant_isolation on housekeeping_logs
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on housekeeping_logs
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- Minibar Items Catalog
create table if not exists minibar_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  item_name text not null,
  category text not null default 'BEVERAGE', -- 'BEVERAGE', 'SNACKS', 'CONFECTIONERY', 'PREMIUM'
  unit_price numeric(10, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, item_name)
);

create index if not exists minibar_items_prop_idx on minibar_items(property_id);

alter table minibar_items enable row level security;
alter table minibar_items force row level security;

create policy tenant_isolation on minibar_items
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on minibar_items
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- Dynamic Pricing Rules (RMS Engine)
create table if not exists dynamic_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  rule_name text not null,
  rule_type text not null, -- 'OCCUPANCY_SURGE', 'WEEKEND_MULTIPLIER', 'LAST_MINUTE_DISCOUNT', 'EARLY_BIRD'
  condition_min_occupancy numeric(5, 2),
  condition_max_occupancy numeric(5, 2),
  price_multiplier numeric(5, 2) not null default 1.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, rule_name)
);

create index if not exists dynamic_pricing_rules_prop_idx on dynamic_pricing_rules(property_id);

alter table dynamic_pricing_rules enable row level security;
alter table dynamic_pricing_rules force row level security;

create policy tenant_isolation on dynamic_pricing_rules
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on dynamic_pricing_rules
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- ---------------------------------------------------------------------
-- 6. Initial System Seeds for All Existing Properties
-- ---------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in select id, tenant_id from properties loop
    -- Seed Chart of Accounts
    insert into chart_of_accounts (tenant_id, property_id, account_code, account_name, account_type, sub_category, is_system)
    values
      (p.tenant_id, p.id, '1010', 'Front Desk Cash Drawer', 'ASSET', 'Cash & Cash Equivalents', true),
      (p.tenant_id, p.id, '1020', 'Bank & UPI Settlement Clearing', 'ASSET', 'Bank Accounts', true),
      (p.tenant_id, p.id, '1030', 'Guest Ledger (Folios Receivable)', 'ASSET', 'Current Assets', true),
      (p.tenant_id, p.id, '1040', 'Corporate City Ledger (BTC)', 'ASSET', 'Accounts Receivable', true),
      (p.tenant_id, p.id, '1050', 'Stores & Kitchen Raw Materials Stock', 'ASSET', 'Inventory Asset', true),
      (p.tenant_id, p.id, '2010', 'Output CGST 6%/9% Payable', 'LIABILITY', 'Statutory Duties & Taxes', true),
      (p.tenant_id, p.id, '2020', 'Output SGST 6%/9% Payable', 'LIABILITY', 'Statutory Duties & Taxes', true),
      (p.tenant_id, p.id, '2030', 'Output IGST 12%/18% Payable', 'LIABILITY', 'Statutory Duties & Taxes', true),
      (p.tenant_id, p.id, '2040', 'Accounts Payable (Trade Vendors)', 'LIABILITY', 'Current Liabilities', true),
      (p.tenant_id, p.id, '2050', 'Advance Guest Deposits & Retainers', 'LIABILITY', 'Guest Advances', true),
      (p.tenant_id, p.id, '3010', 'Owner Capital & Retained Earnings', 'EQUITY', 'Shareholder Equity', true),
      (p.tenant_id, p.id, '4010', 'Room Accommodation Revenue', 'REVENUE', 'Operating Income', true),
      (p.tenant_id, p.id, '4020', 'Restaurant & In-Room Dining F&B', 'REVENUE', 'Operating Income', true),
      (p.tenant_id, p.id, '4030', 'Banquets & Event Hall Rental', 'REVENUE', 'Operating Income', true),
      (p.tenant_id, p.id, '4040', 'Minibar & Sundry Guest Services', 'REVENUE', 'Operating Income', true),
      (p.tenant_id, p.id, '5010', 'Kitchen Raw Materials & Groceries Consumed', 'EXPENSE', 'Direct Cost of Sales', true),
      (p.tenant_id, p.id, '5020', 'GenSet Diesel & Property Utilities', 'EXPENSE', 'Operating Expenses', true),
      (p.tenant_id, p.id, '5030', 'Facility Repairs & Maintenance Spares', 'EXPENSE', 'Operating Expenses', true),
      (p.tenant_id, p.id, '5040', 'Staff Welfare & Employee Meals', 'EXPENSE', 'Personnel Expenses', true),
      (p.tenant_id, p.id, '5050', 'Outsourced Linen & Laundry Cleaning', 'EXPENSE', 'Operating Expenses', true),
      (p.tenant_id, p.id, '5060', 'Printing, Stationery & Key Sleeves', 'EXPENSE', 'Administrative Expenses', true)
    on conflict (property_id, account_code) do nothing;

    -- Seed Minibar catalog items
    insert into minibar_items (tenant_id, property_id, item_name, category, unit_price)
    values
      (p.tenant_id, p.id, 'Himalayan Natural Mineral Water (1L)', 'BEVERAGE', 80.00),
      (p.tenant_id, p.id, 'Coca-Cola / Diet Coke Can (330ml)', 'BEVERAGE', 95.00),
      (p.tenant_id, p.id, 'Red Bull Energy Drink (250ml)', 'BEVERAGE', 190.00),
      (p.tenant_id, p.id, 'Roasted & Salted Cashews (50g)', 'SNACKS', 140.00),
      (p.tenant_id, p.id, 'Artisan Dark Chocolate Bar', 'CONFECTIONERY', 160.00),
      (p.tenant_id, p.id, 'Sparkling Perrier Water (330ml)', 'BEVERAGE', 210.00)
    on conflict (property_id, item_name) do nothing;

    -- Seed Dynamic Pricing Rules
    insert into dynamic_pricing_rules (tenant_id, property_id, rule_name, rule_type, condition_min_occupancy, condition_max_occupancy, price_multiplier)
    values
      (p.tenant_id, p.id, 'High Occupancy Peak Surge (+15%)', 'OCCUPANCY_SURGE', 80.00, null, 1.15),
      (p.tenant_id, p.id, 'Weekend Friday/Saturday Surge (+10%)', 'WEEKEND_MULTIPLIER', null, null, 1.10),
      (p.tenant_id, p.id, 'Low Occupancy Last-Minute Saver (-15%)', 'LAST_MINUTE_DISCOUNT', null, 40.00, 0.85)
    on conflict (property_id, rule_name) do nothing;
  end loop;
end $$;
