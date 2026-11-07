-- 027_room_key_custody_history.sql
-- Active-stay chain of custody logs for physical room keys & smart keycards.
-- Records every key movement (issuance, return, housekeeping, loss).
-- Automatically purged upon final guest check-out to protect privacy.

create table if not exists room_key_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  key_id uuid not null references room_keys(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete cascade,
  room_number text not null,
  action text not null check (action in ('issued_to_guest', 'returned_to_slot', 'with_housekeeping', 'lost')),
  recipient_name text not null,
  recipient_type text not null default 'primary_guest' check (recipient_type in ('primary_guest', 'companion', 'housekeeping', 'front_desk')),
  notes text,
  logged_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists room_key_logs_prop_key_idx on room_key_logs(property_id, key_id);
create index if not exists room_key_logs_res_idx on room_key_logs(reservation_id);

alter table room_key_logs enable row level security;
alter table room_key_logs force row level security;

create policy tenant_isolation on room_key_logs
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy property_isolation on room_key_logs
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

create trigger enforce_property_scope before insert or update on room_key_logs
  for each row execute function enforce_current_property();

grant select, insert, update, delete on room_key_logs to erp_app;
