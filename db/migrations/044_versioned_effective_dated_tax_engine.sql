-- 044_versioned_effective_dated_tax_engine.sql
-- Implements versioned, effective-dated Indian GST statutory tax rules (56th GST Council compliant)

-- 1. Add specified premises flag to properties table
alter table properties add column if not exists is_specified_premises boolean not null default false;
comment on column properties.is_specified_premises is 
  'True if the property has had any room with declared tariff > Rs 7,500 in the preceding financial year or has opted-in under GST Notification 20/2019-CTR';

-- 2. Create versioned tax_rules table
create table if not exists tax_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  category_code text not null,
  sac_code text not null,
  slab_from numeric not null default 0,
  slab_to numeric, -- NULL represents positive infinity
  cgst_rate numeric not null,
  sgst_rate numeric not null,
  igst_rate numeric not null,
  total_rate numeric not null,
  itc_allowed boolean not null default false,
  requires_specified_premises boolean not null default false,
  valid_from date not null default '2017-07-01',
  valid_to date, -- NULL represents currently active
  description text,
  created_at timestamptz not null default now()
);

create index if not exists tax_rules_lookup_idx on tax_rules(sac_code, category_code, valid_from, valid_to);
create index if not exists tax_rules_prop_idx on tax_rules(property_id, tenant_id);

alter table tax_rules enable row level security;
drop policy if exists tax_rules_tenant_isolate on tax_rules;
create policy tax_rules_tenant_isolate on tax_rules
  for all using (tenant_id is null or tenant_id = current_setting('app.current_tenant_id', true)::uuid);

grant select, insert, update, delete on tax_rules to erp_app;

-- 3. Seed statutory system default tax rules (tenant_id is NULL for system baselines)

-- 3A. Pre-56th GST Council Historical Accommodation (2017-07-01 to 2025-09-21)
insert into tax_rules (category_code, sac_code, slab_from, slab_to, cgst_rate, sgst_rate, igst_rate, total_rate, itc_allowed, requires_specified_premises, valid_from, valid_to, description)
values
  ('ACCOMMODATION', '996311', 0, 7500.00, 6.00, 6.00, 12.00, 12.00, true, false, '2017-07-01', '2025-09-21', 'Pre-56th GST Council: Hotel rooms tariff <= Rs 7,500/day at 12% with ITC'),
  ('ACCOMMODATION', '996311', 7500.01, null, 9.00, 9.00, 18.00, 18.00, true, false, '2017-07-01', '2025-09-21', 'Pre-56th GST Council: Hotel rooms tariff > Rs 7,500/day at 18% with ITC');

-- 3B. 56th GST Council Statutory Accommodation (Effective 2025-09-22 onwards)
-- Accommodation up to Rs 7,500 cut to 5% without ITC; above Rs 7,500 remains 18% with ITC
insert into tax_rules (category_code, sac_code, slab_from, slab_to, cgst_rate, sgst_rate, igst_rate, total_rate, itc_allowed, requires_specified_premises, valid_from, valid_to, description)
values
  ('ACCOMMODATION', '996311', 0, 7500.00, 2.50, 2.50, 5.00, 5.00, false, false, '2025-09-22', null, '56th GST Council: Hotel accommodation <= Rs 7,500/unit/day cut to 5% without ITC'),
  ('ACCOMMODATION', '996311', 7500.01, null, 9.00, 9.00, 18.00, 18.00, true, false, '2025-09-22', null, '56th GST Council: Hotel accommodation > Rs 7,500/unit/day at 18% with ITC');

-- 3C. Restaurant & Food & Beverage (SAC 996331)
-- Non-specified premises: 5% without ITC
-- Specified premises (hotel with any room > Rs 7,500 in preceding FY): 18% with ITC
insert into tax_rules (category_code, sac_code, slab_from, slab_to, cgst_rate, sgst_rate, igst_rate, total_rate, itc_allowed, requires_specified_premises, valid_from, valid_to, description)
values
  ('FNB_REST', '996331', 0, null, 2.50, 2.50, 5.00, 5.00, false, false, '2017-11-15', null, 'F&B Restaurant Services in standalone / non-specified hotel premises (5% without ITC)'),
  ('FNB_REST', '996331', 0, null, 9.00, 9.00, 18.00, 18.00, true, true, '2017-11-15', null, 'F&B Restaurant Services in specified premises with room tariff > Rs 7,500 in previous FY (18% with ITC)'),
  ('FNB_ROOM_SERVICE', '996331', 0, null, 2.50, 2.50, 5.00, 5.00, false, false, '2017-11-15', null, 'In-Room Dining / Room Service in non-specified premises (5% without ITC)'),
  ('FNB_ROOM_SERVICE', '996331', 0, null, 9.00, 9.00, 18.00, 18.00, true, true, '2017-11-15', null, 'In-Room Dining / Room Service in specified premises (18% with ITC)');

-- 3D. Ancillary Hospitality Services
insert into tax_rules (category_code, sac_code, slab_from, slab_to, cgst_rate, sgst_rate, igst_rate, total_rate, itc_allowed, requires_specified_premises, valid_from, valid_to, description)
values
  ('LAUNDRY', '9997', 0, null, 9.00, 9.00, 18.00, 18.00, true, false, '2017-07-01', null, 'Guest Laundry Services (SAC 9997, 18% with ITC)'),
  ('SPA', '999721', 0, null, 9.00, 9.00, 18.00, 18.00, true, false, '2017-07-01', null, 'Spa, Wellness & Salon Services (SAC 999721, 18% with ITC)'),
  ('BANQUET', '998592', 0, null, 9.00, 9.00, 18.00, 18.00, true, false, '2017-07-01', null, 'Banqueting, Mandap Keepers & Convention Halls (18% with ITC)'),
  ('MISC_SERVICE', '999999', 0, null, 9.00, 9.00, 18.00, 18.00, true, false, '2017-07-01', null, 'Standard Hospitality Ancillary Services (18% with ITC)');
