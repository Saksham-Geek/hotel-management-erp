-- Split an existing tenant (organization) into one or more independently
-- authorized hotel properties. Every existing tenant receives one default property.
create table properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  currency char(3) not null default 'INR',
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, name)
);
create unique index properties_one_default_per_tenant_idx on properties(tenant_id) where is_default;

insert into properties (tenant_id, name, timezone, currency, is_default)
select id, name, timezone, currency, true from tenants
on conflict (tenant_id, name) do nothing;

create table property_users (
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('owner','manager','frontdesk','housekeeping')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, property_id, user_id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tenant_id, user_id) references users(tenant_id, id) on delete cascade
);
insert into property_users (tenant_id, property_id, user_id, role)
select u.tenant_id, p.id, u.id, u.role
from users u join properties p on p.tenant_id = u.tenant_id and p.is_default
on conflict do nothing;

create table property_subscriptions (
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  plan_key text not null references plans(key),
  status text not null default 'active' check (status in ('trialing','active','past_due','canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, property_id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);
insert into property_subscriptions (tenant_id, property_id, plan_key, status, trial_ends_at, current_period_end, created_at)
select s.tenant_id, p.id, s.plan_key, s.status, s.trial_ends_at, s.current_period_end, s.created_at
from tenant_subscriptions s join properties p on p.tenant_id = s.tenant_id and p.is_default
on conflict do nothing;

create table property_feature_overrides (
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null,
  feature_key text not null references features(key) on delete cascade,
  enabled boolean not null default true,
  limit_value int,
  primary key (tenant_id, property_id, feature_key),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);
insert into property_feature_overrides (tenant_id, property_id, feature_key, enabled, limit_value)
select o.tenant_id, p.id, o.feature_key, o.enabled, o.limit_value
from tenant_feature_overrides o join properties p on p.tenant_id = o.tenant_id and p.is_default
on conflict do nothing;

create function current_property_id() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('app.property_id', true), '')::uuid,
    (select id from properties
     where tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and is_default)
  )
$$;

create or replace function tenant_today() returns date
language sql stable as $$
  select (now() at time zone p.timezone)::date
  from properties p
  where p.id = current_property_id()
    and p.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Move all hotel and property-configured records into the existing tenant's
-- default property, then enforce property scope at the database boundary.
do $$
declare t text;
begin
  foreach t in array array[
    'parties','custom_field_definitions','audit_log','room_types','rooms','guests',
    'reservations','reservation_guests','reservation_folios','folio_items',
    'folio_payments','guest_documents'
  ] loop
    execute format('alter table %I add column property_id uuid', t);
    execute format($q$
      update %I x set property_id = p.id
      from properties p where p.tenant_id = x.tenant_id and p.is_default
    $q$, t);
    execute format('alter table %I alter column property_id set not null', t);
    execute format('alter table %I add constraint %I foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade', t, t || '_property_fkey');
    execute format('create index %I on %I(tenant_id, property_id)', t || '_tenant_property_idx', t);
    execute format('drop policy if exists tenant_isolation on %I', t);
    execute format('create policy property_isolation on %I using (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid and property_id = current_property_id()) with check (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid and property_id = current_property_id())', t);
  end loop;
end $$;

create function enforce_current_property() returns trigger
language plpgsql as $$
declare expected_property uuid;
begin
  expected_property := current_property_id();
  if expected_property is null or (new.property_id is not null and new.property_id <> expected_property) then
    raise exception 'row is outside the active property scope' using errcode = '42501';
  end if;
  new.property_id := expected_property;
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'parties','custom_field_definitions','audit_log','room_types','rooms','guests',
    'reservations','reservation_guests','reservation_folios','folio_items',
    'folio_payments','guest_documents','property_subscriptions','property_feature_overrides'
  ] loop
    execute format('create trigger enforce_property_scope before insert or update on %I for each row execute function enforce_current_property()', t);
  end loop;
end $$;

-- Composite uniqueness and foreign keys prevent same-tenant cross-property links.
alter table parties add constraint parties_tenant_property_id_key unique (tenant_id, property_id, id);
alter table room_types add constraint room_types_tenant_property_id_key unique (tenant_id, property_id, id);
alter table rooms add constraint rooms_tenant_property_id_key unique (tenant_id, property_id, id);
alter table guests add constraint guests_tenant_property_id_key unique (tenant_id, property_id, id);
alter table reservations add constraint reservations_tenant_property_id_key unique (tenant_id, property_id, id);
alter table reservation_folios add constraint reservation_folios_tenant_property_id_key unique (tenant_id, property_id, id);

alter table rooms add constraint rooms_property_room_type_fkey foreign key (tenant_id, property_id, room_type_id) references room_types(tenant_id, property_id, id);
alter table guests add constraint guests_property_party_fkey foreign key (tenant_id, property_id, party_id) references parties(tenant_id, property_id, id);
alter table reservations add constraint reservations_property_guest_fkey foreign key (tenant_id, property_id, guest_id) references guests(tenant_id, property_id, id);
alter table reservations add constraint reservations_property_room_fkey foreign key (tenant_id, property_id, room_id) references rooms(tenant_id, property_id, id);
alter table reservation_guests add constraint reservation_guests_property_reservation_fkey foreign key (tenant_id, property_id, reservation_id) references reservations(tenant_id, property_id, id) on delete cascade;
alter table reservation_guests add constraint reservation_guests_property_guest_fkey foreign key (tenant_id, property_id, guest_id) references guests(tenant_id, property_id, id) on delete restrict;
alter table reservation_folios add constraint reservation_folios_property_reservation_fkey foreign key (tenant_id, property_id, reservation_id) references reservations(tenant_id, property_id, id) on delete restrict;
alter table folio_items add constraint folio_items_property_folio_fkey foreign key (tenant_id, property_id, folio_id) references reservation_folios(tenant_id, property_id, id) on delete restrict;
alter table folio_payments add constraint folio_payments_property_folio_fkey foreign key (tenant_id, property_id, folio_id) references reservation_folios(tenant_id, property_id, id) on delete restrict;
alter table folio_payments add constraint folio_payments_property_payer_fkey foreign key (tenant_id, property_id, payer_guest_id) references guests(tenant_id, property_id, id) on delete restrict;
alter table guest_documents add constraint guest_documents_property_guest_fkey foreign key (tenant_id, property_id, guest_id) references guests(tenant_id, property_id, id) on delete cascade;

alter table property_users enable row level security;
alter table property_users force row level security;
create policy tenant_isolation on property_users
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
alter table property_subscriptions enable row level security;
alter table property_subscriptions force row level security;
create policy property_isolation on property_subscriptions
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());
alter table property_feature_overrides enable row level security;
alter table property_feature_overrides force row level security;
create policy property_isolation on property_feature_overrides
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id())
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid and property_id = current_property_id());

alter table properties enable row level security;
alter table properties force row level security;
create policy tenant_isolation on properties
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

grant insert on property_subscriptions to erp_app;
revoke update, delete on property_subscriptions from erp_app;
revoke insert, update, delete on property_feature_overrides from erp_app;
