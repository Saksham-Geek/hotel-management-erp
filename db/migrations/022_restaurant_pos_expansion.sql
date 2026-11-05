-- Migration 022: Multi-Outlet F&B Expansion (Aura Dine Enterprise POS)
-- Standalone Restaurant & Hotel Integrated POS: Table Merging, Table Transfer/Shift,
-- Multi-Round KOTs, Split Billing Engine, Customer CRM, and Discounts & Service Charge

-- 1. Extend restaurant_outlets with Standalone & Statutory Metadata
alter table restaurant_outlets
  add column if not exists fssai_number text,
  add column if not exists gstin text,
  add column if not exists service_charge_percent numeric(5,2) not null default 0.00,
  add column if not exists is_standalone boolean not null default false,
  add column if not exists contact_phone text,
  add column if not exists address text;

-- 2. Extend restaurant_tables with Sections, Merging & Shifts
alter table restaurant_tables
  add column if not exists section text not null default 'Main AC Hall',
  add column if not exists is_merged boolean not null default false,
  add column if not exists merged_with_table_id uuid references restaurant_tables(id) on delete set null;

-- 3. Extend kot_orders with Multi-Round, Split, Customer CRM & Discount details
alter table kot_orders drop constraint if exists kot_orders_order_type_check;
alter table kot_orders add constraint kot_orders_order_type_check
  check (order_type in ('dine_in', 'room_service', 'takeaway', 'delivery', 'aggregator'));

alter table kot_orders
  add column if not exists round_number integer not null default 1,
  add column if not exists customer_phone text,
  add column if not exists customer_name text,
  add column if not exists discount_type text not null default 'none' check (discount_type in ('none', 'percent', 'flat')),
  add column if not exists discount_value numeric(12,2) not null default 0,
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists service_charge_amount numeric(12,2) not null default 0,
  add column if not exists payment_method text check (payment_method in ('cash', 'upi', 'pos_machine', 'room_charge', 'split', 'swiggy', 'zomato')),
  add column if not exists split_parent_order_id uuid references kot_orders(id) on delete cascade,
  add column if not exists is_split boolean not null default false;

-- 4. Create kot_order_splits for Aura Dine Split Billing Engine
create table if not exists kot_order_splits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  order_id uuid not null references kot_orders(id) on delete cascade,
  split_number integer not null default 1,
  amount numeric(12,2) not null,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'upi', 'pos_machine', 'room_charge')),
  reservation_id uuid references reservations(id) on delete set null,
  room_number text,
  payment_reference text,
  is_settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists kot_order_splits_tenant_prop_idx on kot_order_splits(tenant_id, property_id);
create index if not exists kot_order_splits_order_idx on kot_order_splits(order_id);

-- 5. Create restaurant_customers for Standalone Restaurant CRM
create table if not exists restaurant_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  name text not null,
  phone text not null,
  email text,
  dietary_preference text default 'veg' check (dietary_preference in ('veg', 'non_veg', 'jain', 'all')),
  visit_count integer not null default 1,
  total_spend numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  unique (property_id, phone)
);

create index if not exists restaurant_customers_tenant_prop_idx on restaurant_customers(tenant_id, property_id);
create index if not exists restaurant_customers_phone_idx on restaurant_customers(property_id, phone);

-- 6. Attach Row-Level Security
alter table kot_order_splits enable row level security;
alter table restaurant_customers enable row level security;

drop policy if exists tenant_isolation on kot_order_splits;
create policy tenant_isolation on kot_order_splits
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists property_isolation on kot_order_splits;
create policy property_isolation on kot_order_splits
  using (property_id = nullif(current_setting('app.property_id', true), '')::uuid);

drop policy if exists tenant_isolation on restaurant_customers;
create policy tenant_isolation on restaurant_customers
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists property_isolation on restaurant_customers;
create policy property_isolation on restaurant_customers
  using (property_id = nullif(current_setting('app.property_id', true), '')::uuid);

-- 7. Triggers for Property Scoping
drop trigger if exists enforce_kot_splits_property on kot_order_splits;
create trigger enforce_kot_splits_property
  before insert or update on kot_order_splits
  for each row execute function enforce_current_property();

drop trigger if exists enforce_rest_cust_property on restaurant_customers;
create trigger enforce_rest_cust_property
  before insert or update on restaurant_customers
  for each row execute function enforce_current_property();

-- 8. Grant privileges to erp_app
grant select, insert, update, delete on kot_order_splits, restaurant_customers to erp_app;

-- 9. Seed Sections, Standalone Outlets & Customers
do $$
declare
  prop record;
  out_rest uuid;
  out_stand uuid;
begin
  for prop in select id, tenant_id, name from properties loop
    perform set_config('app.tenant_id', prop.tenant_id::text, true);
    perform set_config('app.property_id', prop.id::text, true);

    -- Update existing outlets with statutory data
    update restaurant_outlets
    set fssai_number = '10022011000452',
        gstin = '27AABCU9603R1ZM',
        service_charge_percent = 5.00,
        contact_phone = '+91 98200 12345',
        address = 'Lobby Level, ' || prop.name
    where property_id = prop.id and outlet_type = 'dine_in';

    -- Create a Standalone Outlet (e.g. "The Spice Route Bistro" - High Street Standalone)
    insert into restaurant_outlets (
      tenant_id, property_id, name, code, outlet_type, is_active,
      fssai_number, gstin, service_charge_percent, is_standalone, contact_phone, address
    ) values (
      prop.tenant_id, prop.id, 'The Spice Route Bistro', 'SRB-01', 'dine_in', true,
      '11518014000318', '27AABCU9603R1ZM', 0.00, true, '+91 98211 54321', 'Connaught Place Commercial Arcade'
    )
    on conflict do nothing
    returning id into out_stand;

    -- Update sections for existing tables
    update restaurant_tables
    set section = case
      when table_number in ('T-01', 'T-02', 'T-03', 'T-04') then 'Main AC Hall'
      when table_number in ('T-05', 'T-06') then 'Open Terrace Garden'
      when table_number in ('T-07', 'T-08') then 'Poolside Deck'
      else 'Main AC Hall'
    end
    where property_id = prop.id;

    -- Add Bar Lounge tables if they don't exist
    select id into out_rest from restaurant_outlets where property_id = prop.id and outlet_type = 'dine_in' limit 1;
    if out_rest is not null then
      insert into restaurant_tables (tenant_id, property_id, outlet_id, table_number, capacity, status, section)
      values
        (prop.tenant_id, prop.id, out_rest, 'T-09', 2, 'vacant', 'Bar & Lounge'),
        (prop.tenant_id, prop.id, out_rest, 'T-10', 6, 'vacant', 'VIP Private Dining')
      on conflict do nothing;
    end if;

    -- If standalone outlet was created, seed tables for it
    if out_stand is not null then
      insert into restaurant_tables (tenant_id, property_id, outlet_id, table_number, capacity, status, section)
      values
        (prop.tenant_id, prop.id, out_stand, 'B-01', 4, 'vacant', 'Ground Floor Cafe'),
        (prop.tenant_id, prop.id, out_stand, 'B-02', 4, 'vacant', 'Ground Floor Cafe'),
        (prop.tenant_id, prop.id, out_stand, 'B-03', 2, 'vacant', 'Outdoor Patio'),
        (prop.tenant_id, prop.id, out_stand, 'B-04', 6, 'vacant', 'Family Mezzanine')
      on conflict do nothing;
    end if;

    -- Seed sample returning diners in CRM
    insert into restaurant_customers (
      tenant_id, property_id, name, phone, email, dietary_preference, visit_count, total_spend, notes
    ) values
      (prop.tenant_id, prop.id, 'Vikram Malhotra', '9820011223', 'vikram.m@gmail.com', 'non_veg', 6, 14200.00, 'Regular corporate diner. Prefers corner tables and less spicy preparation.'),
      (prop.tenant_id, prop.id, 'Pooja Agarwal', '9819922334', 'pooja.a@outlook.com', 'jain', 4, 8650.00, 'Strict Jain preparation only (No onion, no garlic, no potatoes).'),
      (prop.tenant_id, prop.id, 'Amitabh Sen', '9830033445', 'amitabh.sen@tcs.com', 'veg', 9, 21800.00, 'Prefers Darjeeling Second Flush tea and Dal Makhani.')
    on conflict (property_id, phone) do nothing;
  end loop;

  perform set_config('app.tenant_id', '', true);
  perform set_config('app.property_id', '', true);
end $$;
