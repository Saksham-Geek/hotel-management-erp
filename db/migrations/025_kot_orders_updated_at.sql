-- Migration 025: Add updated_at timestamp to kot_orders
alter table kot_orders add column if not exists updated_at timestamptz not null default now();
