-- Migration 035: Enterprise Guest Document Pipeline (Retention, Storage Providers & Legal Hold)

alter table guest_documents
  add column if not exists storage_provider text not null default 'postgres' check (storage_provider in ('postgres', 's3', 'r2')),
  add column if not exists storage_key text,
  add column if not exists retention_until timestamptz default (now() + interval '180 days'),
  add column if not exists legal_hold boolean not null default false,
  add column if not exists sha256_hash text;

-- Index for efficient statutory purge during Night Audit
create index if not exists guest_documents_retention_purge_idx
  on guest_documents (tenant_id, retention_until)
  where legal_hold = false;
