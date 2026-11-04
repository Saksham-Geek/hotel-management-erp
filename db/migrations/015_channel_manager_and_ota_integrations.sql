-- 015_channel_manager_and_ota_integrations.sql
-- Two-way OTA Channel Manager integration (MakeMyTrip, Booking.com, Agoda, Expedia, Airbnb)

-- 1. Add booking source and OTA booking reference to reservations
alter table reservations
  add column if not exists booking_source text not null default 'direct'
    check (booking_source in ('direct', 'walk_in', 'makemytrip', 'booking_com', 'agoda', 'expedia', 'airbnb', 'corporate')),
  add column if not exists ota_booking_id text,
  add column if not exists ota_commission_amount numeric(12,2) not null default 0;

create index if not exists reservations_ota_booking_idx
  on reservations(tenant_id, property_id, ota_booking_id)
  where ota_booking_id is not null;

-- 2. Create OTA Channels configuration table
create table if not exists ota_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  channel_key text not null check (channel_key in ('makemytrip', 'booking_com', 'agoda', 'expedia', 'airbnb')),
  channel_name text not null,
  hotel_code text not null default '',
  api_key_encrypted text,
  api_secret_encrypted text,
  is_active boolean not null default false,
  sync_mode text not null default 'two_way' check (sync_mode in ('two_way', 'inbound_only', 'outbound_only')),
  commission_rate numeric(5,2) not null default 15.00,
  last_sync_at timestamptz,
  last_sync_status text not null default 'idle' check (last_sync_status in ('idle', 'success', 'failed', 'syncing')),
  last_sync_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, property_id, channel_key),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

-- 3. Create OTA Sync Activity Logs table
create table if not exists ota_sync_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  channel_key text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  event_type text not null check (event_type in ('new_booking', 'modify_booking', 'cancel_booking', 'push_inventory', 'push_rates', 'test_connection')),
  status text not null check (status in ('success', 'failed')),
  summary text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists ota_sync_logs_property_idx
  on ota_sync_logs(tenant_id, property_id, created_at desc);

-- 4. Enable Row Level Security (RLS)
alter table ota_channels enable row level security;
alter table ota_channels force row level security;
drop policy if exists ota_channels_tenant_isolation on ota_channels;
create policy ota_channels_tenant_isolation on ota_channels
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (
      property_id is null
      or property_id = nullif(current_setting('app.property_id', true), '')::uuid
    )
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (
      property_id is null
      or property_id = nullif(current_setting('app.property_id', true), '')::uuid
    )
  );

alter table ota_sync_logs enable row level security;
alter table ota_sync_logs force row level security;
drop policy if exists ota_sync_logs_tenant_isolation on ota_sync_logs;
create policy ota_sync_logs_tenant_isolation on ota_sync_logs
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (
      property_id is null
      or property_id = nullif(current_setting('app.property_id', true), '')::uuid
    )
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (
      property_id is null
      or property_id = nullif(current_setting('app.property_id', true), '')::uuid
    )
  );

-- 5. Grant access to erp_app role
grant select, insert, update, delete on table ota_channels to erp_app;
grant select, insert, update, delete on table ota_sync_logs to erp_app;

-- 6. Add Channel Manager to Growth & Plus tiers
insert into plan_features (plan_key, feature_key, limit_value) values
  ('growth', 'hotel.channel_manager', null),
  ('plus',   'hotel.channel_manager', null)
on conflict (plan_key, feature_key) do nothing;
