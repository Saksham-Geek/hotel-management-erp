-- Changing/resetting a password increments auth_version so all previously
-- issued JWTs are rejected by the API guard.
alter table users add column if not exists auth_version integer not null default 0;

-- Reset links contain a random bearer secret; persist only its SHA-256 digest.
create table user_password_reset_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  tenant_id uuid not null,
  user_id uuid not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, user_id) references users(tenant_id, id) on delete cascade
);

create index user_password_reset_tokens_user_idx
  on user_password_reset_tokens(tenant_id, user_id, created_at desc);
create index user_password_reset_tokens_expiry_idx
  on user_password_reset_tokens(expires_at) where consumed_at is null;

revoke all on user_password_reset_tokens from public;
grant select, insert, update, delete on user_password_reset_tokens to erp_app;
