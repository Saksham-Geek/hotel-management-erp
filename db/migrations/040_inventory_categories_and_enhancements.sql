-- =====================================================================
-- Migration 040: Dynamic Inventory Categories, Stores & Stock Enhancements
-- Full CRUD management for inventory categories, department issues, and SKUs
-- =====================================================================

-- 1. Inventory Categories Table
create table if not exists inventory_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  code text not null,
  name text not null,
  icon text not null default '📦',
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (property_id, code)
);

create index if not exists inventory_categories_prop_idx on inventory_categories(property_id);

alter table inventory_categories enable row level security;
alter table inventory_categories force row level security;

create policy tenant_isolation on inventory_categories
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on inventory_categories
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 2. Add extra fields to raw_materials
alter table raw_materials add column if not exists sku_code text;
alter table raw_materials add column if not exists default_vendor_name text;
alter table raw_materials add column if not exists storage_location text default 'Main Store';
alter table raw_materials add column if not exists is_active boolean not null default true;

-- 3. Add extra tracking to stock_movements
alter table stock_movements add column if not exists department text;
alter table stock_movements add column if not exists logged_by text;
alter table stock_movements add column if not exists unit_cost numeric(12,2);

-- 4. Seed system categories for all existing properties
do $$
declare
  p record;
begin
  for p in select id, tenant_id from properties loop
    insert into inventory_categories (tenant_id, property_id, code, name, icon, description, is_system)
    values
      (p.tenant_id, p.id, 'GROCERY', 'Dry Groceries & Staples', '🌾', 'Rice, flour, pulses, cooking oils, grains and dry store essentials', true),
      (p.tenant_id, p.id, 'DAIRY_PERISHABLES', 'Dairy & Perishables', '🥛', 'Fresh cow milk, curd, paneer, butter, cheese, bread and eggs', true),
      (p.tenant_id, p.id, 'MEAT_POULTRY', 'Meat & Poultry', '🥩', 'Fresh chicken, mutton, fresh seafood and cold cuts', true),
      (p.tenant_id, p.id, 'SPICES_CONDIMENTS', 'Spices & Condiments', '🧂', 'Garam masala, saffron, turmeric, sauces, pastes and vinegars', true),
      (p.tenant_id, p.id, 'BEVERAGES_BAR', 'Beverages & Bar', '☕', 'Coffee beans, premium tea leaves, syrups, squash, mocktail concentrates', true),
      (p.tenant_id, p.id, 'HOUSEKEEPING_AMENITIES', 'Housekeeping & Toiletries', '🪥', 'Guest dental kits, luxury shampoos, soaps, combs and sanitary pouches', true),
      (p.tenant_id, p.id, 'LINEN_LAUNDRY', 'Linen & Bedding Store', '🧺', 'Bedsheets, duvet covers, pillowcases, bath mats and pool towels', true),
      (p.tenant_id, p.id, 'CLEANING_CHEMICALS', 'Cleaning & Sanitizers', '🧼', 'Taski R1/R2 chemicals, floor cleaners, dishwashing bars and bleaches', true)
    on conflict (property_id, code) do nothing;
  end loop;
end;
$$;
