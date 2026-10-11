-- Core platform: tenants, plans/entitlements, users, parties, custom fields, audit log.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name        text not null,
  vertical    text not null check (vertical in ('hotel', 'hospital')),
  timezone    text not null default 'Asia/Kolkata',
  currency    text not null default 'INR',
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now()
);

-- ---------- plans & entitlements (global catalogue, plus per-tenant state) ----------
create table plans (
  key   text primary key,
  name  text not null,
  rank  int  not null unique
);

create table features (
  key          text primary key,
  description  text not null,
  vertical     text check (vertical in ('hotel', 'hospital'))   -- null = core / any vertical
);

create table plan_features (
  plan_key     text not null references plans(key) on delete cascade,
  feature_key  text not null references features(key) on delete cascade,
  limit_value  int,                                              -- null = unlimited
  primary key (plan_key, feature_key)
);

create table tenant_subscriptions (
  tenant_id           uuid primary key references tenants(id) on delete cascade,
  plan_key            text not null references plans(key),
  status              text not null default 'active'
                        check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at       timestamptz,
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);

create table tenant_feature_overrides (
  tenant_id    uuid not null references tenants(id) on delete cascade,
  feature_key  text not null references features(key) on delete cascade,
  enabled      boolean not null default true,
  limit_value  int,
  primary key (tenant_id, feature_key)
);

-- ---------- users ----------
create table users (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  email          text not null,
  password_hash  text not null,
  full_name      text not null,
  role           text not null check (role in ('owner', 'manager', 'frontdesk', 'housekeeping')),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (tenant_id, email),
  unique (tenant_id, id)
);

-- ---------- parties: the shared "person" record guests and patients both build on ----------
create table parties (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  kind          text not null default 'person' check (kind in ('person', 'company')),
  full_name     text not null,
  phone         text,
  email         text,
  address       jsonb not null default '{}'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (tenant_id, id)
);
create index parties_tenant_name_idx on parties (tenant_id, full_name);
create index parties_tenant_phone_idx on parties (tenant_id, phone);

-- ---------- per-tenant custom fields ----------
create table custom_field_definitions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  entity      text not null,                       -- e.g. 'guest', 'patient'
  key         text not null check (key ~ '^[a-z][a-z0-9_]{0,40}$'),
  label       text not null,
  field_type  text not null check (field_type in ('text', 'number', 'date', 'boolean', 'select')),
  required    boolean not null default false,
  options     jsonb,                               -- for 'select'
  sort_order  int not null default 0,
  unique (tenant_id, entity, key)
);

-- ---------- audit log (append-only for the app role) ----------
create table audit_log (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid,
  action      text not null,
  entity      text not null,
  entity_id   text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_tenant_created_idx on audit_log (tenant_id, created_at desc);

-- ---------- helper: "today" in the tenant's own timezone ----------
create function tenant_today() returns date
language sql stable as $$
  select (now() at time zone t.timezone)::date
  from tenants t
  where t.id = nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- ---------- row-level security: the DB itself enforces tenant isolation ----------
do $$
declare t text;
begin
  foreach t in array array[
    'tenant_subscriptions', 'tenant_feature_overrides', 'users', 'parties',
    'custom_field_definitions', 'audit_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$
      create policy tenant_isolation on %I
        using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
        with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    $p$, t);
  end loop;
end $$;

-- ---------- privileges for the restricted runtime role ----------
grant usage on schema public to erp_app;
grant select, insert, update, delete on all tables in schema public to erp_app;
grant usage, select on all sequences in schema public to erp_app;
alter default privileges in schema public grant select, insert, update, delete on tables to erp_app;
alter default privileges in schema public grant usage, select on sequences to erp_app;

-- Plan catalogue, tenants and subscriptions are managed by an admin/billing path, never by tenant users.
revoke insert, update, delete on plans, features, plan_features from erp_app;
revoke insert, update, delete on tenants, tenant_subscriptions, tenant_feature_overrides from erp_app;
-- The audit trail can be appended to but not rewritten.
revoke update, delete on audit_log from erp_app;
