-- Migration 033: Production-Ready Email OTP Authentication
create table if not exists email_login_otps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists email_login_otps_lookup_idx
  on email_login_otps (tenant_id, lower(email), expires_at)
  where consumed_at is null;

grant select, insert, update, delete on email_login_otps to erp_app, erp_owner;
