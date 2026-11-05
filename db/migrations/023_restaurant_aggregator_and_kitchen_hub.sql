-- Migration 023: Aura Dine Aggregator Hub, Kitchen Stations & Cashier Z-Report
-- Reverse-engineered Tier-1 Restaurant Management Engine:
-- 1. Swiggy & Zomato Aggregator Order Ingestion, Prep Timers & Rider Tracking
-- 2. Live Item 86'ing / Out-of-Stock Multi-Channel Toggle
-- 3. Multi-Station Kitchen Routing (Tandoor, Curry, Bar, Pantry)
-- 4. Shift Reconciliation & Day-End Cashier Z-Reports

-- 1. Extend kot_orders with Aggregator & Rider Tracking Metadata
alter table kot_orders
  add column if not exists aggregator_brand text check (aggregator_brand in ('swiggy', 'zomato', 'direct_web', 'none')) default 'none',
  add column if not exists aggregator_order_id text,
  add column if not exists rider_name text,
  add column if not exists rider_phone text,
  add column if not exists rider_status text check (rider_status in ('assigning', 'at_restaurant', 'picked_up', 'delivered')),
  add column if not exists preparation_time_minutes integer default 20,
  add column if not exists aggregator_status text check (aggregator_status in ('incoming', 'accepted', 'food_ready', 'dispatched', 'cancelled', 'none')) default 'none';

create index if not exists kot_orders_aggregator_idx on kot_orders(aggregator_brand, aggregator_status);

-- 2. Extend menu_items with Item 86'ing & Kitchen Station Routing
alter table menu_items
  add column if not exists is_out_of_stock boolean not null default false,
  add column if not exists kitchen_station text not null default 'main_kitchen' check (kitchen_station in ('tandoor', 'main_kitchen', 'bar', 'pantry', 'bakery')),
  add column if not exists channel_availability text not null default 'all' check (channel_availability in ('all', 'dine_in_only', 'delivery_only'));

create index if not exists menu_items_kitchen_station_idx on menu_items(kitchen_station);

-- 3. Create restaurant_shifts for Cashier Drawers & Day-End Z-Reports
create table if not exists restaurant_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  outlet_id uuid not null references restaurant_outlets(id) on delete cascade,
  shift_name text not null default 'Dinner Shift',
  opened_by text not null,
  closed_by text,
  opening_cash numeric(12,2) not null default 0.00,
  closing_cash numeric(12,2),
  expected_cash numeric(12,2) not null default 0.00,
  cash_variance numeric(12,2) not null default 0.00,
  total_upi numeric(12,2) not null default 0.00,
  total_card numeric(12,2) not null default 0.00,
  total_swiggy numeric(12,2) not null default 0.00,
  total_zomato numeric(12,2) not null default 0.00,
  total_room_charges numeric(12,2) not null default 0.00,
  total_sales numeric(12,2) not null default 0.00,
  total_kots_count integer not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists restaurant_shifts_tenant_prop_idx on restaurant_shifts(tenant_id, property_id);
create index if not exists restaurant_shifts_outlet_idx on restaurant_shifts(outlet_id);

-- Enable Row Level Security
alter table restaurant_shifts enable row level security;

drop policy if exists tenant_isolation on restaurant_shifts;
create policy tenant_isolation on restaurant_shifts
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists property_isolation on restaurant_shifts;
create policy property_isolation on restaurant_shifts
  using (property_id = nullif(current_setting('app.property_id', true), '')::uuid);

drop trigger if exists enforce_restaurant_shifts_property on restaurant_shifts;
create trigger enforce_restaurant_shifts_property
  before insert or update on restaurant_shifts
  for each row execute function enforce_current_property();
