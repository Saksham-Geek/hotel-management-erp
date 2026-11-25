-- =====================================================================
-- Migration 039: Common Recurring Expense Items Catalog
-- Pre-configured recurring operational expense items for quick voucher entry
-- =====================================================================

create table if not exists common_expense_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  category_code text not null,
  default_amount numeric(12,2) not null default 0,
  default_vendor_name text,
  default_payment_mode text not null default 'CASH_DRAWER',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

create index if not exists common_expense_items_prop_idx on common_expense_items(property_id);

alter table common_expense_items enable row level security;
alter table common_expense_items force row level security;

create policy tenant_isolation on common_expense_items
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on common_expense_items
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- Seed standard common expense items for existing properties
do $$
declare
  p record;
begin
  for p in select id, tenant_id from properties loop
    insert into common_expense_items (tenant_id, property_id, name, category_code, default_amount, default_vendor_name, default_payment_mode, description)
    values
      (p.tenant_id, p.id, 'GenSet Diesel (30 Liters)', 'DIESEL_GENSET', 2850.00, 'Bharat Petroleum City Pump', 'CASH_DRAWER', 'Evening backup generator fuel during grid outages'),
      (p.tenant_id, p.id, 'Daily Dairy Milk Supply (20L)', 'KITCHEN_PERISHABLES', 1300.00, 'Amrit Dairy Farm', 'CASH_DRAWER', 'Fresh full-cream cow milk for breakfast buffet & tea'),
      (p.tenant_id, p.id, 'Thermal POS Paper Rolls (Box of 10)', 'FRONT_DESK_SUPPLIES', 450.00, 'Metro Cash & Carry Wholesale', 'CASH_DRAWER', '80mm thermal paper rolls for billing printer and KOT'),
      (p.tenant_id, p.id, 'Staff Evening Tea & Biscuits', 'STAFF_WELFARE', 220.00, 'Local Tea Stall', 'CASH_DRAWER', 'Daily tea, coffee & rusks for front office & housekeeping staff'),
      (p.tenant_id, p.id, 'Emergency Plumbing Washers & Teflon', 'PROPERTY_REPAIRS', 350.00, 'Shree Ram Hardware & Sanitary', 'CASH_DRAWER', 'Replacement washers, angle valves and Teflon tapes for guest room maintenance'),
      (p.tenant_id, p.id, 'Municipal Drinking Water Tanker (5000L)', 'MUNICIPAL_UTILITIES', 1600.00, 'City Water Tanker Supply', 'UPI', 'Commercial water tanker refilling for overhead rooftop tanks'),
      (p.tenant_id, p.id, 'Guest Linen Express Laundry', 'GUEST_LAUNDRY', 850.00, 'Sunshine Steam Laundry Services', 'CASH_DRAWER', 'Express iron & dry cleaning for VIP guest garments')
    on conflict (property_id, name) do nothing;
  end loop;
end;
$$;
