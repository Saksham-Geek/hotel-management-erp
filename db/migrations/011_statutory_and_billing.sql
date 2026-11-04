-- Migration 011: Indian Statutory Compliance, GST Multi-Slab Tax Invoicing,
-- Multi-Folio Cashiering, Night Audit Business Date, and Form C (BoI) Compliance.

-- 1. Hotel Business Date Engine (Operational Business Date separate from wall clock)
create table if not exists hotel_business_dates (
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  current_business_date date not null default current_date,
  is_audit_in_progress boolean not null default false,
  audit_started_at timestamptz,
  last_audited_by uuid references users(id) on delete set null,
  last_audited_at timestamptz,
  primary key (tenant_id, property_id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

insert into hotel_business_dates (tenant_id, property_id, current_business_date)
select p.tenant_id, p.id, (now() at time zone p.timezone)::date
from properties p
on conflict (tenant_id, property_id) do nothing;

create table if not exists night_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  business_date date not null,
  rooms_total integer not null default 0,
  rooms_occupied integer not null default 0,
  occupancy_rate numeric(5,2) not null default 0,
  total_room_revenue numeric(12,2) not null default 0,
  total_fnb_revenue numeric(12,2) not null default 0,
  total_tax_collected numeric(12,2) not null default 0,
  adr numeric(12,2) not null default 0,    -- Average Daily Rate
  revpar numeric(12,2) not null default 0, -- Revenue Per Available Room
  no_shows_cancelled integer not null default 0,
  executed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, property_id, business_date),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

-- 2. GST Statutory Tax Categories and Slabs
create table if not exists tax_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  code text not null, -- 'ACCOMMODATION', 'FNB_REST', 'FNB_ROOM_SERVICE', 'LAUNDRY', 'SPA'
  name text not null,
  hsn_sac text not null, -- '996311' for Room, '996331' for F&B, '9997' for Laundry
  created_at timestamptz not null default now(),
  unique (tenant_id, property_id, code),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create table if not exists tax_slabs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  tax_category_id uuid not null,
  min_tariff numeric(12,2) not null default 0,
  max_tariff numeric(12,2), -- e.g. 7500.00 for Indian GST threshold; null for infinity
  cgst_rate numeric(5,2) not null default 0 check (cgst_rate between 0 and 50),
  sgst_rate numeric(5,2) not null default 0 check (sgst_rate between 0 and 50),
  igst_rate numeric(5,2) not null default 0 check (igst_rate between 0 and 100),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tax_category_id) references tax_categories(id) on delete cascade
);

-- 3. Corporate Accounts (City Ledger / B2B Accounts Receivable)
create table if not exists corporate_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  company_name text not null,
  gstin text check (gstin is null or length(gstin) = 15),
  pan_number text check (pan_number is null or length(pan_number) = 10),
  contact_person text,
  contact_email text,
  contact_phone text,
  billing_address jsonb not null default '{}'::jsonb,
  credit_limit numeric(12,2) not null default 0 check (credit_limit >= 0),
  current_balance numeric(12,2) not null default 0,
  credit_period_days integer not null default 30 check (credit_period_days between 0 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, property_id, company_name),
  unique (tenant_id, property_id, id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

-- 4. Folio Enhancements: Category & Tax Breakdown on Folio Items
alter table folio_items add column if not exists tax_category_code text default 'ACCOMMODATION';
alter table folio_items add column if not exists hsn_sac text default '996311';
alter table folio_items add column if not exists cgst_amount numeric(12,2) not null default 0 check (cgst_amount >= 0);
alter table folio_items add column if not exists sgst_amount numeric(12,2) not null default 0 check (sgst_amount >= 0);
alter table folio_items add column if not exists igst_amount numeric(12,2) not null default 0 check (igst_amount >= 0);
alter table folio_items add column if not exists is_interstate boolean not null default false;

-- Folio Payment Enhancements (Section 269ST & Rule 114B PAN)
alter table folio_payments add column if not exists pan_number text check (pan_number is null or length(pan_number) = 10);
alter table folio_payments add column if not exists corporate_account_id uuid;
alter table folio_payments add column if not exists notes text;
-- Section 269ST constraint: cash transaction cannot equal or exceed Rs 2,00,000
alter table folio_payments drop constraint if exists folio_payments_cash_limit_check;
alter table folio_payments add constraint folio_payments_cash_limit_check
  check (method <> 'cash' or amount < 200000.00);

-- Folio Routing Rules (Master company folio vs Guest personal folio)
create table if not exists folio_routing_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  reservation_id uuid not null,
  charge_category text not null check (charge_category in ('all', 'room', 'fnb', 'laundry', 'incidentals')),
  target_folio_type text not null default 'company_master' check (target_folio_type in ('guest_personal', 'company_master')),
  corporate_account_id uuid references corporate_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tenant_id, property_id, reservation_id) references reservations(tenant_id, property_id, id) on delete cascade
);

-- 5. Official Indian GST Tax Invoices
create table if not exists tax_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  folio_id uuid not null,
  reservation_id uuid not null,
  invoice_number text not null, -- Consecutive 16-char max: e.g. 'GA/2627/000001'
  financial_year text not null, -- e.g. '2026-27'
  invoice_type text not null default 'B2C' check (invoice_type in ('B2C', 'B2B', 'CREDIT_NOTE', 'DEBIT_NOTE')),
  hotel_gstin text not null default '27AAAAA0000A1Z5',
  guest_gstin text check (guest_gstin is null or length(guest_gstin) = 15),
  guest_company_name text,
  guest_name text not null,
  place_of_supply_state_code text not null default '27', -- 2-digit Indian State Code
  is_interstate boolean not null default false,
  total_taxable_amount numeric(12,2) not null check (total_taxable_amount >= 0),
  cgst_amount numeric(12,2) not null default 0 check (cgst_amount >= 0),
  sgst_amount numeric(12,2) not null default 0 check (sgst_amount >= 0),
  igst_amount numeric(12,2) not null default 0 check (igst_amount >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  irn_hash text check (irn_hash is null or length(irn_hash) = 64),
  signed_qr_code text,
  irn_status text not null default 'pending' check (irn_status in ('pending', 'generated', 'failed', 'cancelled')),
  issued_by uuid references users(id) on delete set null,
  issued_at timestamptz not null default now(),
  unique (tenant_id, property_id, invoice_number),
  unique (tenant_id, property_id, id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tenant_id, property_id, folio_id) references reservation_folios(tenant_id, property_id, id) on delete restrict,
  foreign key (tenant_id, property_id, reservation_id) references reservations(tenant_id, property_id, id) on delete restrict
);
create index if not exists tax_invoices_folio_idx on tax_invoices(tenant_id, property_id, folio_id);
create index if not exists tax_invoices_issued_idx on tax_invoices(tenant_id, property_id, issued_at desc);

-- 6. Bureau of Immigration (BoI) / Form C Foreign Guest Records
create table if not exists guest_form_c (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  guest_id uuid not null,
  reservation_id uuid not null,
  passport_number text not null,
  passport_country text not null,
  passport_issue_date date not null,
  passport_expiry_date date not null,
  visa_number text not null,
  visa_type text not null,
  visa_valid_until date not null,
  visa_issue_place text not null,
  arrival_date_in_india date not null,
  arrived_from_city_country text not null,
  next_destination_city_country text not null,
  purpose_of_visit text not null default 'tourism' check (purpose_of_visit in ('tourism', 'business', 'medical', 'conference', 'employment', 'other')),
  employed_in_india boolean not null default false,
  submission_status text not null default 'draft' check (submission_status in ('draft', 'submitted_online', 'manual_acknowledged')),
  boi_application_id text,
  submitted_at timestamptz,
  submitted_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, property_id, id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tenant_id, property_id, guest_id) references guests(tenant_id, property_id, id) on delete cascade,
  foreign key (tenant_id, property_id, reservation_id) references reservations(tenant_id, property_id, id) on delete cascade
);
create index if not exists guest_form_c_status_idx on guest_form_c(tenant_id, property_id, submission_status);

-- 7. Seed Default Indian GST Slabs & Tax Categories for Existing Properties
do $$
declare prop record;
declare cat_acc uuid;
declare cat_fnb uuid;
declare cat_lnd uuid;
begin
  for prop in select id, tenant_id from properties loop
    -- Accommodation SAC 996311
    insert into tax_categories (tenant_id, property_id, code, name, hsn_sac)
    values (prop.tenant_id, prop.id, 'ACCOMMODATION', 'Hotel Accommodation', '996311')
    on conflict (tenant_id, property_id, code) do update set name = excluded.name
    returning id into cat_acc;

    if cat_acc is null then
      select id into cat_acc from tax_categories where tenant_id = prop.tenant_id and property_id = prop.id and code = 'ACCOMMODATION';
    end if;

    -- Slabs for Accommodation: <= 7500 -> 12% (6% CGST + 6% SGST, 12% IGST)
    insert into tax_slabs (tenant_id, property_id, tax_category_id, min_tariff, max_tariff, cgst_rate, sgst_rate, igst_rate)
    select prop.tenant_id, prop.id, cat_acc, 0, 7500.00, 6.00, 6.00, 12.00
    where not exists (select 1 from tax_slabs where tenant_id = prop.tenant_id and property_id = prop.id and tax_category_id = cat_acc and min_tariff = 0);

    -- Slabs for Accommodation: > 7500 -> 18% (9% CGST + 9% SGST, 18% IGST)
    insert into tax_slabs (tenant_id, property_id, tax_category_id, min_tariff, max_tariff, cgst_rate, sgst_rate, igst_rate)
    select prop.tenant_id, prop.id, cat_acc, 7500.01, null, 9.00, 9.00, 18.00
    where not exists (select 1 from tax_slabs where tenant_id = prop.tenant_id and property_id = prop.id and tax_category_id = cat_acc and min_tariff > 7500);

    -- F&B Restaurant SAC 996331 (5% without ITC or 18% with ITC in luxury hotel)
    insert into tax_categories (tenant_id, property_id, code, name, hsn_sac)
    values (prop.tenant_id, prop.id, 'FNB_REST', 'Restaurant and In-Room Dining', '996331')
    on conflict (tenant_id, property_id, code) do update set name = excluded.name
    returning id into cat_fnb;

    if cat_fnb is null then
      select id into cat_fnb from tax_categories where tenant_id = prop.tenant_id and property_id = prop.id and code = 'FNB_REST';
    end if;

    insert into tax_slabs (tenant_id, property_id, tax_category_id, min_tariff, max_tariff, cgst_rate, sgst_rate, igst_rate)
    select prop.tenant_id, prop.id, cat_fnb, 0, null, 2.50, 2.50, 5.00
    where not exists (select 1 from tax_slabs where tenant_id = prop.tenant_id and property_id = prop.id and tax_category_id = cat_fnb);

    -- Laundry SAC 9997 (18% GST)
    insert into tax_categories (tenant_id, property_id, code, name, hsn_sac)
    values (prop.tenant_id, prop.id, 'LAUNDRY', 'Guest Laundry Services', '9997')
    on conflict (tenant_id, property_id, code) do update set name = excluded.name
    returning id into cat_lnd;

    if cat_lnd is null then
      select id into cat_lnd from tax_categories where tenant_id = prop.tenant_id and property_id = prop.id and code = 'LAUNDRY';
    end if;

    insert into tax_slabs (tenant_id, property_id, tax_category_id, min_tariff, max_tariff, cgst_rate, sgst_rate, igst_rate)
    select prop.tenant_id, prop.id, cat_lnd, 0, null, 9.00, 9.00, 18.00
    where not exists (select 1 from tax_slabs where tenant_id = prop.tenant_id and property_id = prop.id and tax_category_id = cat_lnd);

  end loop;
end $$;

-- 8. Apply RLS & Scope Enforcement to all new tables
do $$
declare t text;
begin
  foreach t in array array[
    'hotel_business_dates', 'night_audit_logs', 'tax_categories', 'tax_slabs',
    'corporate_accounts', 'folio_routing_rules', 'tax_invoices', 'guest_form_c'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists property_isolation on %I', t);
    execute format($p$
      create policy property_isolation on %I
        using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
               and property_id = current_property_id())
        with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
               and property_id = current_property_id())
    $p$, t);
    execute format('drop trigger if exists enforce_property_scope on %I', t);
    execute format('create trigger enforce_property_scope before insert or update on %I for each row execute function enforce_current_property()', t);
  end loop;
end $$;

-- 9. Privileges for runtime erp_app role
grant select, insert, update, delete on
  hotel_business_dates, night_audit_logs, tax_categories, tax_slabs,
  corporate_accounts, folio_routing_rules, tax_invoices, guest_form_c
to erp_app;
