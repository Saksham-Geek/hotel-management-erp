-- Migration 020: Hardware POS Terminal (EDC Machine) Integration
-- Enables connection, management, and folio settlement via physical card swipe/tap EDC machines
-- Supporting Pine Labs, Paytm EDC, Razorpay POS, Innoviti, Ingenico LAN, and Web Serial USB

-- 1. Create pos_terminals table
create table if not exists pos_terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  name text not null,
  terminal_id text not null,
  merchant_id text,
  provider text not null default 'pine_labs' check (provider in ('pine_labs', 'paytm_edc', 'razorpay_pos', 'innoviti', 'ingenico_lan', 'generic_serial', 'generic_ip')),
  connection_type text not null default 'cloud_lan' check (connection_type in ('cloud_lan', 'local_ip', 'web_serial', 'standalone')),
  ip_address text,
  port integer default 8080,
  serial_baud_rate integer default 115200,
  is_active boolean not null default true,
  is_default boolean not null default false,
  status text not null default 'online' check (status in ('online', 'offline', 'busy', 'maintenance')),
  last_ping_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists pos_terminals_tenant_prop_idx on pos_terminals(tenant_id, property_id);
create index if not exists pos_terminals_tid_idx on pos_terminals(terminal_id);

-- Enforce Row-Level Security
alter table pos_terminals enable row level security;
alter table pos_terminals force row level security;

drop policy if exists tenant_isolation on pos_terminals;
create policy tenant_isolation on pos_terminals
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists property_isolation on pos_terminals;
create policy property_isolation on pos_terminals
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
         and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
              and property_id = current_property_id());

-- 2. Update folio_payments method check and add POS transaction tracking columns
alter table folio_payments drop constraint if exists folio_payments_method_check;
alter table folio_payments add constraint folio_payments_method_check 
  check (method in ('cash', 'card', 'upi', 'bank_transfer', 'corporate_ledger', 'pos_machine', 'other'));

alter table folio_payments add column if not exists pos_terminal_id uuid;
alter table folio_payments add column if not exists card_brand text;
alter table folio_payments add column if not exists card_last_four text;
alter table folio_payments add column if not exists bank_rrn text;
alter table folio_payments add column if not exists auth_code text;
alter table folio_payments add column if not exists pos_slip_data jsonb default '{}'::jsonb;

alter table folio_payments drop constraint if exists folio_payments_pos_terminal_fkey;
alter table folio_payments add constraint folio_payments_pos_terminal_fkey
  foreign key (pos_terminal_id) references pos_terminals(id) on delete set null;

create index if not exists folio_payments_pos_idx on folio_payments(pos_terminal_id) where pos_terminal_id is not null;
create index if not exists folio_payments_rrn_idx on folio_payments(bank_rrn) where bank_rrn is not null;

-- 3. Ensure hotel.pos is enabled across all plans in plan_features
insert into plan_features (plan_key, feature_key, limit_value)
values
  ('starter', 'hotel.pos', null),
  ('growth', 'hotel.pos', null),
  ('enterprise', 'hotel.pos', null),
  ('basic', 'hotel.pos', null),
  ('plus', 'hotel.pos', null),
  ('premium', 'hotel.pos', null)
on conflict (plan_key, feature_key) do nothing;

-- 4. Seed default POS EDC machines for existing hotel properties (before trigger)
insert into pos_terminals (tenant_id, property_id, name, terminal_id, merchant_id, provider, connection_type, ip_address, port, is_active, is_default, status, last_ping_at, metadata)
select 
  p.tenant_id,
  p.id as property_id,
  case 
    when t.slug = 'taj-hotels' then 'Front Desk Counter 1 - Pine Labs Plutus Cloud'
    when t.slug = 'itc-hotels' then 'Main Reception - Innoviti uniPAY EDC'
    when t.slug = 'sayaji-hotels' then 'Lobby Counter - Paytm Android Smart POS'
    when t.slug = 'radisson-india' then 'Front Desk EDC 1 - Pine Labs Android Terminal'
    when t.slug = 'city-boutique' then 'Front Office - Paytm Smart EDC'
    else 'Front Desk Counter 1 - Pine Labs EDC'
  end,
  case 
    when t.slug = 'taj-hotels' then 'TID-TAJ-PL01'
    when t.slug = 'itc-hotels' then 'TID-ITC-INN01'
    when t.slug = 'sayaji-hotels' then 'TID-SYJ-PAY01'
    when t.slug = 'radisson-india' then 'TID-RAD-PL01'
    when t.slug = 'city-boutique' then 'TID-SNG-PAY01'
    else 'TID-AZR-PL01'
  end,
  case 
    when t.slug = 'taj-hotels' then 'MID-HDFC-TAJ01'
    when t.slug = 'itc-hotels' then 'MID-ICICI-ITC01'
    when t.slug = 'sayaji-hotels' then 'MID-AXIS-SYJ01'
    when t.slug = 'radisson-india' then 'MID-HDFC-RAD01'
    when t.slug = 'city-boutique' then 'MID-KOTAK-SNG01'
    else 'MID-ICICI-AZR01'
  end,
  case 
    when t.slug = 'taj-hotels' then 'pine_labs'
    when t.slug = 'itc-hotels' then 'innoviti'
    when t.slug = 'sayaji-hotels' then 'paytm_edc'
    when t.slug = 'radisson-india' then 'pine_labs'
    when t.slug = 'city-boutique' then 'paytm_edc'
    else 'pine_labs'
  end,
  'cloud_lan',
  '192.168.1.150',
  8080,
  true,
  true,
  'online',
  now(),
  jsonb_build_object('model', 'Verifone V200T / Android P920', 'firmware', 'v4.2.1-IN', 'simProvider', 'Airtel M2M')
from properties p
join tenants t on t.id = p.tenant_id
where not exists (
  select 1 from pos_terminals pt where pt.property_id = p.id
);

-- Seed a 2nd terminal (USB Serial / Web Serial direct connection) for Taj and Grand Azure
insert into pos_terminals (tenant_id, property_id, name, terminal_id, merchant_id, provider, connection_type, ip_address, port, is_active, is_default, status, last_ping_at, metadata)
select 
  p.tenant_id,
  p.id as property_id,
  'Concierge Desk - USB Web Serial POS',
  'TID-USB-COM01',
  'MID-DIRECT-USB01',
  'generic_serial',
  'web_serial',
  null,
  null,
  true,
  false,
  'online',
  now(),
  jsonb_build_object('portName', 'COM3', 'baudRate', 115200, 'protocol', 'ISO8583-Serial')
from properties p
join tenants t on t.id = p.tenant_id
where t.slug in ('taj-hotels', 'grand-azure')
and not exists (
  select 1 from pos_terminals pt where pt.property_id = p.id and pt.terminal_id = 'TID-USB-COM01'
);

-- 5. Attach property scope enforcement trigger
drop trigger if exists enforce_property_scope on pos_terminals;
create trigger enforce_property_scope before insert or update on pos_terminals
  for each row execute function enforce_current_property();

-- 6. Grant runtime privileges to erp_app
grant select, insert, update, delete on pos_terminals to erp_app;
