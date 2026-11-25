-- 043_enterprise_hospitality_flaws_and_resilience.sql
-- Fixes operational, housekeeping, restaurant, and compliance gaps

-- 1. Lost & Found Register for Housekeeping
create table if not exists lost_and_found_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  room_id uuid references rooms(id) on delete set null,
  room_number text not null,
  item_name text not null,
  description text,
  category text not null default 'electronics' check (category in ('electronics', 'clothing', 'documents', 'valuables', 'other')),
  storage_location text not null default 'Housekeeping Locker A',
  status text not null default 'found' check (status in ('found', 'claimed', 'disposed')),
  finder_name text not null default 'Floor Attendant',
  guest_name text,
  guest_contact text,
  found_at timestamptz not null default now(),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lost_found_prop_idx on lost_and_found_items(property_id, status);

alter table lost_and_found_items enable row level security;
drop policy if exists lost_found_tenant_isolate on lost_and_found_items;
create policy lost_found_tenant_isolate on lost_and_found_items
  for all using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

grant select, insert, update, delete on lost_and_found_items to erp_app;

-- 2. Housekeeping Status Extensions (DND & Stay-Over vs Turnaround)
alter table rooms add column if not exists dnd_status boolean not null default false;
alter table rooms add column if not exists cleaning_type text not null default 'turnaround';

-- 3. FSSAI License on Hotel Properties for Statutory Food Invoicing
alter table properties add column if not exists fssai_license_number text default '10022021000123';

-- 4. KOT Order Items Voiding & Auditing
alter table kot_order_items add column if not exists is_voided boolean not null default false;
alter table kot_order_items add column if not exists void_reason text;
alter table kot_order_items add column if not exists voided_at timestamptz;

-- Modify kot_order_items status check if needed
alter table kot_order_items drop constraint if exists kot_order_items_status_check;
alter table kot_order_items add constraint kot_order_items_status_check
  check (status in ('queued', 'cooking', 'ready', 'served', 'voided'));
