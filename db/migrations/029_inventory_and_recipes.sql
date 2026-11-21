-- =====================================================================
-- Migration 029: Recipe & Raw Material Kitchen Inventory
-- Automatic stock depletion on KOT dispatch & food costing
-- =====================================================================

-- 1. Raw Materials Table
create table if not exists raw_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  category text not null default 'Grocery',
  unit text not null default 'kg',
  current_stock numeric(12,2) not null default 0 check (current_stock >= 0),
  minimum_alert_stock numeric(12,2) not null default 5,
  cost_per_unit numeric(12,2) not null default 0,
  last_restocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);

create index if not exists raw_materials_prop_idx on raw_materials(property_id);
create index if not exists raw_materials_low_stock_idx on raw_materials(property_id) where current_stock <= minimum_alert_stock;

-- 2. Dish Recipes (BOM - Bill of Materials)
create table if not exists dish_recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  raw_material_id uuid not null references raw_materials(id) on delete cascade,
  quantity_per_portion numeric(10,3) not null check (quantity_per_portion > 0),
  created_at timestamptz not null default now(),
  unique (property_id, menu_item_id, raw_material_id)
);

create index if not exists dish_recipes_menu_idx on dish_recipes(menu_item_id);
create index if not exists dish_recipes_mat_idx on dish_recipes(raw_material_id);

-- 3. Stock Movements (Audit Ledger)
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  raw_material_id uuid not null references raw_materials(id) on delete cascade,
  movement_type text not null check (movement_type in ('RESTOCK', 'CONSUMPTION', 'WASTAGE', 'AUDIT_ADJUSTMENT')),
  quantity numeric(12,3) not null,
  reference_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_mat_idx on stock_movements(raw_material_id, created_at desc);

-- 4. Enable Row Level Security
alter table raw_materials enable row level security;
alter table raw_materials force row level security;
create policy tenant_isolation on raw_materials
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on raw_materials
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table dish_recipes enable row level security;
alter table dish_recipes force row level security;
create policy tenant_isolation on dish_recipes
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on dish_recipes
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table stock_movements enable row level security;
alter table stock_movements force row level security;
create policy tenant_isolation on stock_movements
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on stock_movements
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 5. Seed Core Raw Materials for active properties
do $$
declare
  p record;
  mat_paneer uuid;
  mat_butter uuid;
  mat_chicken uuid;
  mat_dal uuid;
  mat_rice uuid;
  mat_flour uuid;
  mat_milk uuid;
  mat_spices uuid;
  dish_id uuid;
begin
  for p in select id, tenant_id from properties loop
    -- Insert standard raw materials
    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Fresh Malai Paneer', 'Dairy', 'kg', 24.50, 5.00, 320.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_paneer;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Amul Table Butter', 'Dairy', 'kg', 18.00, 4.00, 480.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_butter;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Fresh Chicken (Curry Cut)', 'Meat & Poultry', 'kg', 32.00, 8.00, 220.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_chicken;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Urad Dal (Whole Black Gram)', 'Grocery', 'kg', 45.00, 10.00, 140.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_dal;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Daawat Basmati Rice (XXL)', 'Grocery', 'kg', 85.00, 15.00, 125.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_rice;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Fine Maida & Atta Blend', 'Grocery', 'kg', 60.00, 10.00, 45.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_flour;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Full Cream Buffalo Milk', 'Dairy', 'l', 35.00, 8.00, 68.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_milk;

    insert into raw_materials (tenant_id, property_id, name, category, unit, current_stock, minimum_alert_stock, cost_per_unit)
    values
      (p.tenant_id, p.id, 'Whole Garam Masala & Cardamom', 'Spices', 'kg', 6.50, 1.50, 1800.00)
    on conflict (property_id, name) do update set current_stock = excluded.current_stock
    returning id into mat_spices;

    -- Link dish recipes if dishes exist
    for dish_id in select id from menu_items where property_id = p.id and (name ilike '%paneer%' or name ilike '%tikka%') loop
      insert into dish_recipes (tenant_id, property_id, menu_item_id, raw_material_id, quantity_per_portion)
      values
        (p.tenant_id, p.id, dish_id, mat_paneer, 0.200),
        (p.tenant_id, p.id, dish_id, mat_butter, 0.050)
      on conflict (property_id, menu_item_id, raw_material_id) do nothing;
    end loop;

    for dish_id in select id from menu_items where property_id = p.id and (name ilike '%chicken%' or name ilike '%murgh%') loop
      insert into dish_recipes (tenant_id, property_id, menu_item_id, raw_material_id, quantity_per_portion)
      values
        (p.tenant_id, p.id, dish_id, mat_chicken, 0.300),
        (p.tenant_id, p.id, dish_id, mat_butter, 0.060)
      on conflict (property_id, menu_item_id, raw_material_id) do nothing;
    end loop;

    for dish_id in select id from menu_items where property_id = p.id and name ilike '%dal makhani%' loop
      insert into dish_recipes (tenant_id, property_id, menu_item_id, raw_material_id, quantity_per_portion)
      values
        (p.tenant_id, p.id, dish_id, mat_dal, 0.150),
        (p.tenant_id, p.id, dish_id, mat_butter, 0.080)
      on conflict (property_id, menu_item_id, raw_material_id) do nothing;
    end loop;

    for dish_id in select id from menu_items where property_id = p.id and (name ilike '%biryani%' or name ilike '%rice%') loop
      insert into dish_recipes (tenant_id, property_id, menu_item_id, raw_material_id, quantity_per_portion)
      values
        (p.tenant_id, p.id, dish_id, mat_rice, 0.180),
        (p.tenant_id, p.id, dish_id, mat_butter, 0.030)
      on conflict (property_id, menu_item_id, raw_material_id) do nothing;
    end loop;

    for dish_id in select id from menu_items where property_id = p.id and (name ilike '%naan%' or name ilike '%roti%' or name ilike '%kulcha%') loop
      insert into dish_recipes (tenant_id, property_id, menu_item_id, raw_material_id, quantity_per_portion)
      values
        (p.tenant_id, p.id, dish_id, mat_flour, 0.120),
        (p.tenant_id, p.id, dish_id, mat_butter, 0.020)
      on conflict (property_id, menu_item_id, raw_material_id) do nothing;
    end loop;

    for dish_id in select id from menu_items where property_id = p.id and (name ilike '%chai%' or name ilike '%tea%' or name ilike '%coffee%') loop
      insert into dish_recipes (tenant_id, property_id, menu_item_id, raw_material_id, quantity_per_portion)
      values
        (p.tenant_id, p.id, dish_id, mat_milk, 0.150)
      on conflict (property_id, menu_item_id, raw_material_id) do nothing;
    end loop;

  end loop;
end $$;
