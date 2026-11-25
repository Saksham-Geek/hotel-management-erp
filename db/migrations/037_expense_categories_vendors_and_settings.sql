-- =====================================================================
-- Migration 037: Expense Categories, Approved Vendors & Concierge Settings
-- Dynamic CRUD configurations integrated into Settings & Management Hub
-- =====================================================================

-- 1. Expense Categories Table
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  code text not null,
  name text not null,
  icon text not null default '📦',
  badge_color text not null default 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (property_id, code)
);

create index if not exists expense_categories_prop_idx on expense_categories(property_id);

alter table expense_categories enable row level security;
alter table expense_categories force row level security;
create policy tenant_isolation on expense_categories
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on expense_categories
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 2. Approved Hotel Vendors Table
create table if not exists hotel_vendors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  category text not null default 'General Supplier',
  contact_person text,
  phone text,
  email text,
  gstin text,
  pan_number text,
  address text,
  payment_terms text not null default 'Cash on Delivery',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

create index if not exists hotel_vendors_prop_idx on hotel_vendors(property_id);

alter table hotel_vendors enable row level security;
alter table hotel_vendors force row level security;
create policy tenant_isolation on hotel_vendors
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on hotel_vendors
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 3. Digital Concierge Property Settings Table
create table if not exists concierge_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  wifi_ssid text not null default 'GrandAzure_Guest_5G',
  wifi_password text not null default 'Welcome2026!',
  reception_phone text not null default '+91 98765 43210',
  reception_whatsapp text not null default '+91 98765 43210',
  breakfast_timing text not null default '7:00 AM - 10:30 AM (Coral Cafe)',
  pool_timing text not null default '6:00 AM - 8:00 PM',
  gym_timing text not null default '24 Hours (Keycard Access)',
  google_review_url text not null default 'https://maps.google.com',
  updated_at timestamptz not null default now(),
  unique (property_id)
);

create index if not exists concierge_settings_prop_idx on concierge_settings(property_id);

alter table concierge_settings enable row level security;
alter table concierge_settings force row level security;
create policy tenant_isolation on concierge_settings
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on concierge_settings
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 4. Seed Standard Categories, Vendors & Settings for All Properties
do $$
declare
  p record;
begin
  for p in select id, tenant_id, name from properties loop
    -- Seed System Expense Categories
    insert into expense_categories (tenant_id, property_id, code, name, icon, badge_color, description, is_system)
    values
      (p.tenant_id, p.id, 'DIESEL_GENSET', 'GenSet Diesel & Fuel', '⛽', 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', 'Diesel for power backup generator sets and maintenance oils.', true),
      (p.tenant_id, p.id, 'KITCHEN_PERISHABLES', 'Milk, Bread & Perishables', '🥛', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300', 'Fresh cow milk, artisan breads, eggs, dairy and daily vegetables.', true),
      (p.tenant_id, p.id, 'GUEST_LAUNDRY', 'Outsourced Guest Laundry', '🧺', 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300', 'Dry cleaning and urgent pressing outsourced to local partner laundries.', true),
      (p.tenant_id, p.id, 'PROPERTY_REPAIRS', 'Plumbing & Electrical Spares', '🔧', 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300', 'Emergency pipe washers, taps, MCB switches, fuses and AC capacitors.', true),
      (p.tenant_id, p.id, 'STAFF_WELFARE', 'Staff Tea & Welfare', '☕', 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300', 'Duty staff evening tea, biscuits, pantry welfare and shift rations.', true),
      (p.tenant_id, p.id, 'FRONT_DESK_SUPPLIES', 'Stationery & Key Sleeves', '📝', 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300', 'Thermal receipt rolls, RFID keycard jackets, registration pads.', true),
      (p.tenant_id, p.id, 'MUNICIPAL_UTILITIES', 'Water Tanker & Municipal', '💧', 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300', 'Commercial emergency water tankers, garbage cess and municipality refills.', true),
      (p.tenant_id, p.id, 'OTHER', 'General Petty Cash Sundry', '📦', 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', 'Unclassified emergency petty cash disbursements.', true)
    on conflict (property_id, code) do nothing;

    -- Seed Initial Approved Vendors
    insert into hotel_vendors (tenant_id, property_id, name, category, contact_person, phone, email, gstin, pan_number, address, payment_terms)
    values
      (p.tenant_id, p.id, 'Bharat Petroleum City Pump', 'GenSet Diesel & Fuel', 'Ramesh Kumar (Manager)', '+91 98210 11223', 'citypump@bpclretail.in', '27AABCB2114P1ZM', 'AABCB2114P', 'Station Road, Fuel Depot Sector 4', 'Cash on Delivery'),
      (p.tenant_id, p.id, 'Amrit Dairy Farm', 'Milk, Bread & Perishables', 'Harish Choudhary', '+91 98450 44556', 'orders@amritdairy.com', '27AACCA9988K1ZR', 'AACCA9988K', 'Gokul Nagar, Milk Chilling Center #3', 'Monthly Account / Weekly Cheque'),
      (p.tenant_id, p.id, 'Vijay Hardware & Electrical Mart', 'Plumbing & Electrical Spares', 'Vijay Patel', '+91 99201 33445', 'sales@vijayhardware.in', '27AAFPV4411C1ZQ', 'AAFPV4411C', 'Shop 14, Commercial Market Main Road', 'Cash on Delivery'),
      (p.tenant_id, p.id, 'Sunshine Steam Laundry Services', 'Outsourced Guest Laundry', 'Anand Rao', '+91 98330 77889', 'sunshinesteam@gmail.com', null, null, 'Industrial Area Plot 22', 'Weekly Billing'),
      (p.tenant_id, p.id, 'Metro Cash & Carry Wholesale', 'Kitchen Groceries & Stores', 'Account Helpdesk', '+91 1800 200 1234', 'support@metro.co.in', '27AAACM1234F1ZX', 'AAACM1234F', 'Outer Ring Road Distribution Hub', 'Net 15 Days')
    on conflict (property_id, name) do nothing;

    -- Seed Default Digital Concierge Settings
    insert into concierge_settings (tenant_id, property_id, wifi_ssid, wifi_password, reception_phone, reception_whatsapp, breakfast_timing, pool_timing, gym_timing, google_review_url)
    values
      (p.tenant_id, p.id, 'GrandAzure_Guest_5G', 'Welcome2026!', '+91 98765 43210', '+91 98765 43210', '7:00 AM - 10:30 AM (Coral Cafe)', '6:00 AM - 8:00 PM', '24 Hours (Keycard Access)', 'https://maps.google.com')
    on conflict (property_id) do nothing;

  end loop;
end $$;
