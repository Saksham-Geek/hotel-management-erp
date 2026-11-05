-- Migration 024: Aura Dine Live Swiggy & Zomato Aggregator Credentials & Webhooks
-- Stores merchant RID, API tokens, webhook secrets, and auto-accept configurations per outlet

alter table restaurant_outlets
  add column if not exists swiggy_rid text,
  add column if not exists swiggy_api_key text,
  add column if not exists swiggy_auto_accept boolean not null default false,
  add column if not exists swiggy_default_prep_minutes integer not null default 20,
  add column if not exists zomato_resid text,
  add column if not exists zomato_api_key text,
  add column if not exists zomato_auto_accept boolean not null default false,
  add column if not exists zomato_default_prep_minutes integer not null default 20,
  add column if not exists aggregator_webhook_token text default encode(gen_random_bytes(16), 'hex');
