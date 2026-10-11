-- Hotel vertical. Composite (tenant_id, id) foreign keys stop one tenant from ever
-- referencing another tenant's rows (FK checks bypass row-level security).

create table room_types (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  base_rate    numeric(12,2) not null check (base_rate >= 0),
  capacity     int not null default 2 check (capacity > 0),
  description  text,
  unique (tenant_id, name),
  unique (tenant_id, id)
);

create table rooms (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  room_type_id  uuid not null,
  number        text not null,
  floor         int not null default 0,
  status        text not null default 'available'
                  check (status in ('available', 'occupied', 'cleaning', 'maintenance')),
  unique (tenant_id, number),
  unique (tenant_id, id),
  foreign key (tenant_id, room_type_id) references room_types (tenant_id, id)
);
create index rooms_tenant_status_idx on rooms (tenant_id, status);

create table guests (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  party_id    uuid not null,
  nationality text,
  id_type     text,
  id_number   text,            -- TODO: field-level encryption before production use
  vip         boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, party_id) references parties (tenant_id, id)
);

create table reservations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  guest_id      uuid not null,
  room_id       uuid not null,
  check_in      date not null,
  check_out     date not null,
  stay          daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  status        text not null default 'reserved'
                  check (status in ('reserved', 'checked_in', 'checked_out', 'cancelled')),
  total_amount  numeric(12,2) not null default 0,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  check (check_out > check_in),
  unique (tenant_id, id),
  foreign key (tenant_id, guest_id) references guests (tenant_id, id),
  foreign key (tenant_id, room_id)  references rooms  (tenant_id, id),
  -- The database itself refuses double-booking a room, even under concurrent requests.
  constraint no_double_booking exclude using gist (
    tenant_id with =, room_id with =, stay with &&
  ) where (status in ('reserved', 'checked_in'))
);
create index reservations_tenant_checkin_idx on reservations (tenant_id, check_in);
create index reservations_tenant_status_idx on reservations (tenant_id, status);

do $$
declare t text;
begin
  foreach t in array array['room_types', 'rooms', 'guests', 'reservations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$
      create policy tenant_isolation on %I
        using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
        with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    $p$, t);
  end loop;
end $$;
