-- =====================================================================
-- Migration 036: Front Desk Petty Cash Expenses & Banquet Venue Management
-- Enterprise Hotel ERP additions matching and beating Aiosell / Exceed HMS
-- =====================================================================

-- 1. Front Desk Petty Cash & Operational Expenses
create table if not exists hotel_expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  voucher_number text not null,
  category text not null check (category in (
    'DIESEL_GENSET', 'KITCHEN_PERISHABLES', 'GUEST_LAUNDRY', 'PROPERTY_REPAIRS',
    'STAFF_WELFARE', 'FRONT_DESK_SUPPLIES', 'MUNICIPAL_UTILITIES', 'OTHER'
  )),
  amount numeric(12,2) not null check (amount > 0),
  payment_mode text not null default 'CASH_DRAWER' check (payment_mode in ('CASH_DRAWER', 'UPI', 'BANK_TRANSFER', 'COMPANY_CARD')),
  paid_to text not null,
  invoice_ref text,
  receipt_url text,
  notes text,
  logged_by text not null default 'Front Desk Staff',
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists hotel_expenses_prop_date_idx on hotel_expenses(property_id, expense_date desc);
create index if not exists hotel_expenses_category_idx on hotel_expenses(property_id, category);

alter table hotel_expenses enable row level security;
alter table hotel_expenses force row level security;
create policy tenant_isolation on hotel_expenses
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on hotel_expenses
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 2. Banquet & Event Venues
create table if not exists banquet_venues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  type text not null default 'BANQUET_HALL' check (type in ('BANQUET_HALL', 'LAWN', 'BOARDROOM', 'ROOFTOP_TERRACE', 'CONFERENCE_CENTER')),
  max_pax integer not null default 100,
  base_rental_rate numeric(12,2) not null default 0,
  amenities text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists banquet_venues_prop_idx on banquet_venues(property_id);

alter table banquet_venues enable row level security;
alter table banquet_venues force row level security;
create policy tenant_isolation on banquet_venues
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on banquet_venues
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 3. Banquet & Event Bookings
create table if not exists banquet_bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  venue_id uuid not null references banquet_venues(id) on delete cascade,
  booking_number text not null,
  event_name text not null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  event_date date not null,
  slot text not null check (slot in ('MORNING', 'EVENING', 'FULL_DAY')),
  pax_count integer not null default 50,
  menu_package text not null default 'Standard Buffet',
  rate_per_pax numeric(10,2) not null default 0,
  hall_rental numeric(12,2) not null default 0,
  decor_av_charges numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  advance_paid numeric(12,2) not null default 0,
  status text not null default 'CONFIRMED' check (status in ('ENQUIRY', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  special_instructions text,
  created_at timestamptz not null default now()
);

create index if not exists banquet_bookings_prop_date_idx on banquet_bookings(property_id, event_date desc);
create index if not exists banquet_bookings_venue_idx on banquet_bookings(venue_id);

alter table banquet_bookings enable row level security;
alter table banquet_bookings force row level security;
create policy tenant_isolation on banquet_bookings
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
create policy property_isolation on banquet_bookings
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

-- 4. Seed Standard Venues and Expenses for Active Properties
do $$
declare
  p record;
  v_ballroom uuid;
  v_lawn uuid;
  v_boardroom uuid;
begin
  for p in select id, tenant_id from properties loop
    -- Seed Venues
    insert into banquet_venues (tenant_id, property_id, name, type, max_pax, base_rental_rate, amenities)
    values
      (p.tenant_id, p.id, 'Grand Kohinoor Ballroom', 'BANQUET_HALL', 350, 45000, array['Central AC', 'Stage', 'HD Projector', 'Green Room', 'Dynacord Sound System']),
      (p.tenant_id, p.id, 'Royal Palms Wedding Lawn', 'LAWN', 750, 75000, array['Outdoor Ambient Lighting', 'Gazebo Mandap Area', 'Separate Live Buffet Counter', 'Valet Parking']),
      (p.tenant_id, p.id, 'Regal Corporate Boardroom', 'BOARDROOM', 30, 12000, array['Video Conference Polycom', 'Motorized Screen', 'High-Speed Wi-Fi', 'Executive Ergonomic Chairs'])
    on conflict do nothing;

    select id into v_ballroom from banquet_venues where property_id = p.id and name = 'Grand Kohinoor Ballroom' limit 1;
    select id into v_lawn from banquet_venues where property_id = p.id and name = 'Royal Palms Wedding Lawn' limit 1;

    -- Seed Sample Upcoming Banquet Bookings
    if v_ballroom is not null then
      insert into banquet_bookings (
        tenant_id, property_id, venue_id, booking_number, event_name, client_name, client_phone, client_email,
        event_date, slot, pax_count, menu_package, rate_per_pax, hall_rental, decor_av_charges, total_amount, advance_paid, status, special_instructions
      ) values (
        p.tenant_id, p.id, v_ballroom, 'BQT-' || to_char(current_date, 'YYYYMM') || '-101',
        'Verma Silver Jubilee Reception', 'Sunil Verma', '+91 98201 54321', 'sunil.verma@gmail.com',
        current_date + interval '3 days', 'EVENING', 220, 'Royal Awadhi Feast', 1150, 45000, 25000, 323000, 150000, 'CONFIRMED',
        'Stage floral backdrop in pastel peach and white lilies. Jain food counter for 30 pax.'
      ) on conflict do nothing;
    end if;

    if v_lawn is not null then
      insert into banquet_bookings (
        tenant_id, property_id, venue_id, booking_number, event_name, client_name, client_phone, client_email,
        event_date, slot, pax_count, menu_package, rate_per_pax, hall_rental, decor_av_charges, total_amount, advance_paid, status, special_instructions
      ) values (
        p.tenant_id, p.id, v_lawn, 'BQT-' || to_char(current_date, 'YYYYMM') || '-102',
        'Singhania Wedding Sangeet & Cocktail', 'Ananya Singhania', '+91 99304 88712', 'ananya.singhania@outlook.com',
        current_date + interval '7 days', 'EVENING', 450, 'Imperial Mughlai & Continental Spread', 1450, 75000, 45000, 772500, 350000, 'CONFIRMED',
        'Live Chaat & Kulfi counter. DJ stage requires 3-phase generator backup.'
      ) on conflict do nothing;
    end if;

    -- Seed Today''s Sample Petty Cash Expenses
    insert into hotel_expenses (
      tenant_id, property_id, voucher_number, category, amount, payment_mode, paid_to, invoice_ref, notes, logged_by, expense_date
    ) values
      (p.tenant_id, p.id, 'EXP-' || to_char(current_date, 'YYYYMM') || '-001', 'DIESEL_GENSET', 3800.00, 'CASH_DRAWER', 'Bharat Petroleum City Pump', 'BPCL-98214', '40 Litres HSD Diesel for Backup GenSet #1', 'Pooja Sharma (Front Desk)', current_date),
      (p.tenant_id, p.id, 'EXP-' || to_char(current_date, 'YYYYMM') || '-002', 'KITCHEN_PERISHABLES', 1450.00, 'CASH_DRAWER', 'Amrit Dairy Farm', 'BILL-412', 'Fresh Cow Milk (25L) & Curd tubs for breakfast buffet', 'Chef Sanjeev', current_date),
      (p.tenant_id, p.id, 'EXP-' || to_char(current_date, 'YYYYMM') || '-003', 'PROPERTY_REPAIRS', 850.00, 'CASH_DRAWER', 'Vijay Hardware Mart', 'VH-7741', 'Emergency tap washers, Teflon tape & silicone sealant for 3rd floor plumbing', 'Ramesh (Maintenance)', current_date)
    on conflict do nothing;

  end loop;
end $$;
