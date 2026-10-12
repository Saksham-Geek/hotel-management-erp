-- A one-time, short-lived email change challenge. Only a SHA-256 token digest
-- is stored; the raw bearer token is delivered to the user's existing session.
create table user_email_change_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  tenant_id uuid not null,
  user_id uuid not null,
  new_email text not null check (length(new_email) between 3 and 200),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, user_id) references users(tenant_id, id) on delete cascade
);

create index user_email_change_tokens_user_idx
  on user_email_change_tokens(tenant_id, user_id, created_at desc);
create index user_email_change_tokens_expiry_idx
  on user_email_change_tokens(expires_at) where consumed_at is null;

-- The verification endpoint is unauthenticated by design. Access to this
-- table is limited to the restricted API database role; tokens are unguessable,
-- hashed at rest, expire, and are consumed once.
revoke all on user_email_change_tokens from public;
grant select, insert, update, delete on user_email_change_tokens to erp_app;
