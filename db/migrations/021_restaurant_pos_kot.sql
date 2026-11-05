-- Migration 021: Integrated F&B Restaurant POS & KOT (Petpooja-Grade) & Key Management (RFID & Brass)
-- Phase 2: Table Management, Menu Master, Kitchen Order Tickets (KOT), Kitchen Display Screen (KDS), 1-Click Room Folio Posting
-- Phase 4: Room Keys (Brass Keychains with numbered tags & RFID MIFARE cards) & Digital Mobile Passes

-- 1. Restaurant Outlets
create table if not exists restaurant_outlets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  name text not null,
  code text not null,
  outlet_type text not null default 'dine_in' check (outlet_type in ('dine_in', 'room_service', 'bar', 'poolside', 'banquet', 'cafe')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists restaurant_outlets_tenant_prop_idx on restaurant_outlets(tenant_id, property_id);

-- 2. Restaurant Tables
create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  outlet_id uuid not null references restaurant_outlets(id) on delete cascade,
  table_number text not null,
  capacity integer not null default 4,
  status text not null default 'vacant' check (status in ('vacant', 'occupied', 'billed')),
  active_kot_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists restaurant_tables_tenant_prop_idx on restaurant_tables(tenant_id, property_id);
create index if not exists restaurant_tables_outlet_idx on restaurant_tables(outlet_id);

-- 3. Menu Categories
create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists menu_categories_tenant_prop_idx on menu_categories(tenant_id, property_id);

-- 4. Menu Items
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  item_code text not null,
  description text,
  price numeric(12,2) not null,
  food_type text not null default 'veg' check (food_type in ('veg', 'non_veg', 'egg')),
  sac_code text not null default '996331',
  gst_rate numeric(5,2) not null default 5.00,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists menu_items_tenant_prop_idx on menu_items(tenant_id, property_id);
create index if not exists menu_items_category_idx on menu_items(category_id);

-- 5. KOT Orders
create table if not exists kot_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  outlet_id uuid not null references restaurant_outlets(id) on delete cascade,
  table_id uuid references restaurant_tables(id) on delete set null,
  reservation_id uuid references reservations(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  folio_id uuid references reservation_folios(id) on delete set null,
  kot_number text not null,
  order_type text not null default 'dine_in' check (order_type in ('dine_in', 'room_service', 'takeaway')),
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'served', 'settled', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'charged_to_room', 'paid_direct')),
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  special_instructions text,
  guest_name text,
  server_name text,
  created_at timestamptz not null default now(),
  prepared_at timestamptz,
  served_at timestamptz,
  settled_at timestamptz,
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists kot_orders_tenant_prop_idx on kot_orders(tenant_id, property_id);
create index if not exists kot_orders_status_idx on kot_orders(status);
create index if not exists kot_orders_table_idx on kot_orders(table_id);
create index if not exists kot_orders_res_idx on kot_orders(reservation_id);

-- 6. KOT Order Items
create table if not exists kot_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references kot_orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null,
  gst_rate numeric(5,2) not null default 5.00,
  food_type text not null default 'veg',
  special_notes text,
  status text not null default 'queued' check (status in ('queued', 'cooking', 'ready', 'served'))
);

create index if not exists kot_order_items_order_idx on kot_order_items(order_id);

-- 7. Room Keys (Physical Brass Keychain & RFID Cards)
create table if not exists room_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  room_id uuid not null references rooms(id) on delete cascade,
  key_number text not null,
  key_type text not null default 'physical_brass' check (key_type in ('rfid_mifare', 'physical_brass', 'mobile_qr')),
  card_uid text,
  status text not null default 'in_slot' check (status in ('in_slot', 'issued_to_guest', 'with_housekeeping', 'lost')),
  issued_to_reservation_id uuid references reservations(id) on delete set null,
  issued_to_guest_name text,
  issued_at timestamptz,
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists room_keys_tenant_prop_idx on room_keys(tenant_id, property_id);
create index if not exists room_keys_room_idx on room_keys(room_id);
create index if not exists room_keys_status_idx on room_keys(status);

-- 8. Seed Feature Entitlements
insert into features (key, description, vertical) values
  ('hotel.restaurant.pos', 'Integrated F&B Restaurant POS, Table Management, and Kitchen Order Tickets (KOT)', 'hotel'),
  ('hotel.keycards', 'Door lock RFID encoder bridge and physical key rack management', 'hotel')
on conflict (key) do nothing;

insert into plan_features (plan_key, feature_key, limit_value) values
  ('starter', 'hotel.restaurant.pos', null),
  ('growth', 'hotel.restaurant.pos', null),
  ('enterprise', 'hotel.restaurant.pos', null),
  ('starter', 'hotel.keycards', null),
  ('growth', 'hotel.keycards', null),
  ('enterprise', 'hotel.keycards', null)
on conflict (plan_key, feature_key) do nothing;

-- 9. Seed Default Outlets, Tables, Categories, Menu Items, and Keys
do $$
declare
  p record;
  outlet_dine uuid;
  outlet_room uuid;
  cat_starters uuid;
  cat_mains uuid;
  cat_breads uuid;
  cat_desserts uuid;
  cat_beverages uuid;
  rm record;
  tbl_no text;
  i int;
begin
  for p in select id, tenant_id, name from properties loop
    -- Create Dine-In Outlet
    insert into restaurant_outlets (tenant_id, property_id, name, code, outlet_type)
    values (p.tenant_id, p.id, 'The Royal Pavilion', 'MAIN-DINING', 'dine_in')
    returning id into outlet_dine;

    -- Create In-Room Dining Outlet
    insert into restaurant_outlets (tenant_id, property_id, name, code, outlet_type)
    values (p.tenant_id, p.id, 'In-Room Dining (Room Service)', 'ROOM-SERVICE', 'room_service')
    returning id into outlet_room;

    -- Create Tables for Dine-In Outlet (T-01 to T-08)
    for i in 1..8 loop
      tbl_no := 'T-' || lpad(i::text, 2, '0');
      insert into restaurant_tables (tenant_id, property_id, outlet_id, table_number, capacity, status)
      values (p.tenant_id, p.id, outlet_dine, tbl_no, case when i in (1,2) then 2 when i in (7,8) then 6 else 4 end, 'vacant');
    end loop;

    -- Create Menu Categories
    insert into menu_categories (tenant_id, property_id, name, sort_order)
    values (p.tenant_id, p.id, 'Starters & Kebabs', 1) returning id into cat_starters;

    insert into menu_categories (tenant_id, property_id, name, sort_order)
    values (p.tenant_id, p.id, 'Royal Indian Curries & Mains', 2) returning id into cat_mains;

    insert into menu_categories (tenant_id, property_id, name, sort_order)
    values (p.tenant_id, p.id, 'Tandoor & Breads', 3) returning id into cat_breads;

    insert into menu_categories (tenant_id, property_id, name, sort_order)
    values (p.tenant_id, p.id, 'Desserts & Sweets', 4) returning id into cat_desserts;

    insert into menu_categories (tenant_id, property_id, name, sort_order)
    values (p.tenant_id, p.id, 'Artisanal Teas & Beverages', 5) returning id into cat_beverages;

    -- Create Menu Items (Starters)
    insert into menu_items (tenant_id, property_id, category_id, name, item_code, description, price, food_type, sac_code, gst_rate) values
      (p.tenant_id, p.id, cat_starters, 'Paneer Tikka Angare', 'APP-01', 'Charcoal smoked cottage cheese with pickled onions and mint dip', 395.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_starters, 'Dahi Ke Sholay', 'APP-02', 'Crispy spiced hung curd pockets with pomegranate chutney', 345.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_starters, 'Murgh Malai Tikka', 'APP-03', 'Creamy cardamom marinated tender chicken cooked in clay oven', 495.00, 'non_veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_starters, 'Amritsari Machhi', 'APP-04', 'Carom seed batter fried crispy river sole with radish slaw', 545.00, 'non_veg', '996331', 5.00);

    -- Create Menu Items (Mains)
    insert into menu_items (tenant_id, property_id, category_id, name, item_code, description, price, food_type, sac_code, gst_rate) values
      (p.tenant_id, p.id, cat_mains, 'Dal Makhani Heritage', 'MAIN-01', 'Slow cooked black lentils simmered for 24 hours with churned butter', 425.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_mains, 'Paneer Lababdar', 'MAIN-02', 'Cottage cheese in rich tomato and onion gravy with ginger juliennes', 475.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_mains, 'Old Delhi Butter Chicken', 'MAIN-03', 'Boneless roasted tandoori chicken in velvety makhani gravy', 595.00, 'non_veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_mains, 'Dum Awadhi Gosht Biryani', 'MAIN-04', 'Fragrant long grain basmati cooked on dum with tender mutton', 675.00, 'non_veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_mains, 'Subz Dum Biryani', 'MAIN-05', 'Seasonal vegetables and basmati cooked with saffron and fried onion', 445.00, 'veg', '996331', 5.00);

    -- Create Menu Items (Breads)
    insert into menu_items (tenant_id, property_id, category_id, name, item_code, description, price, food_type, sac_code, gst_rate) values
      (p.tenant_id, p.id, cat_breads, 'Butter Naan', 'BRD-01', 'Leavened clay oven baked flatbread with melted butter', 95.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_breads, 'Garlic & Herb Naan', 'BRD-02', 'Tandoori naan topped with roasted garlic and fresh coriander', 115.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_breads, 'Tandoori Roti (Whole Wheat)', 'BRD-03', 'Traditional whole wheat unleavened bread', 65.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_breads, 'Amritsari Chur Chur Kulcha', 'BRD-04', 'Flaky stuffed bread with spiced potatoes and paneer', 145.00, 'veg', '996331', 5.00);

    -- Create Menu Items (Desserts)
    insert into menu_items (tenant_id, property_id, category_id, name, item_code, description, price, food_type, sac_code, gst_rate) values
      (p.tenant_id, p.id, cat_desserts, 'Kesari Shahi Tukda', 'DST-01', 'Crispy saffron soaked brioche with rich reduced rabdi and pistachios', 245.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_desserts, 'Warm Gulab Jamun (2 Pcs)', 'DST-02', 'Handcrafted khoya dumplings infused with green cardamom', 195.00, 'veg', '996331', 5.00);

    -- Create Menu Items (Beverages)
    insert into menu_items (tenant_id, property_id, category_id, name, item_code, description, price, food_type, sac_code, gst_rate) values
      (p.tenant_id, p.id, cat_beverages, 'Ginger Kulhad Masala Chai', 'BEV-01', 'Freshly brewed Assam tea with crushed ginger, cardamom, and whole milk', 145.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_beverages, 'South Indian Filter Kaapi', 'BEV-02', 'Traditional chicory blend decoction frothed with boiled milk', 165.00, 'veg', '996331', 5.00),
      (p.tenant_id, p.id, cat_beverages, 'Fresh Mint Mojito (Virgin)', 'BEV-03', 'Muddled garden mint, Persian lime, cane sugar, and sparkling soda', 225.00, 'veg', '996331', 5.00);

    -- Seed Room Keys for all rooms in this property (Brass Keychain & RFID Card)
    for rm in select id, number from rooms where property_id = p.id loop
      -- Brass Keychain Key
      insert into room_keys (tenant_id, property_id, room_id, key_number, key_type, status, notes)
      values (p.tenant_id, p.id, rm.id, 'KEY-' || rm.number || '-BRASS', 'physical_brass', 'in_slot', 'Traditional solid brass numbered keychain');

      -- RFID Mifare Smart Card
      insert into room_keys (tenant_id, property_id, room_id, key_number, key_type, card_uid, status, notes)
      values (p.tenant_id, p.id, rm.id, 'CARD-' || rm.number || '-RFID', 'rfid_mifare', '04:' || upper(substr(md5(rm.number || 'rfid'), 1, 8)), 'in_slot', 'MIFARE Classic 1K Contactless Card');
    end loop;

  end loop;
end $$;

-- 10. Enable Row-Level Security on all new tables
alter table restaurant_outlets enable row level security;
alter table restaurant_outlets force row level security;
create policy tenant_isolation on restaurant_outlets
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on restaurant_outlets
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table restaurant_tables enable row level security;
alter table restaurant_tables force row level security;
create policy tenant_isolation on restaurant_tables
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on restaurant_tables
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table menu_categories enable row level security;
alter table menu_categories force row level security;
create policy tenant_isolation on menu_categories
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on menu_categories
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table menu_items enable row level security;
alter table menu_items force row level security;
create policy tenant_isolation on menu_items
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on menu_items
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table kot_orders enable row level security;
alter table kot_orders force row level security;
create policy tenant_isolation on kot_orders
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on kot_orders
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table room_keys enable row level security;
alter table room_keys force row level security;
create policy tenant_isolation on room_keys
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on room_keys
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 11. Add enforce_property_scope triggers
create trigger enforce_property_scope before insert or update on restaurant_outlets
  for each row execute function enforce_current_property();

create trigger enforce_property_scope before insert or update on restaurant_tables
  for each row execute function enforce_current_property();

create trigger enforce_property_scope before insert or update on menu_categories
  for each row execute function enforce_current_property();

create trigger enforce_property_scope before insert or update on menu_items
  for each row execute function enforce_current_property();

create trigger enforce_property_scope before insert or update on kot_orders
  for each row execute function enforce_current_property();

create trigger enforce_property_scope before insert or update on room_keys
  for each row execute function enforce_current_property();
