-- Record how the guest's identity document upload consent was obtained.
-- Existing documents remain readable but are explicitly marked as legacy (NULL consent fields).
alter table guest_documents
  add column if not exists consent_method text check (consent_method in ('written', 'verbal', 'digital')),
  add column if not exists consent_version text,
  add column if not exists consent_recorded_by uuid;

alter table guest_documents
  add constraint guest_documents_consent_user_fkey
  foreign key (consent_recorded_by) references users(id) on delete set null;

create index if not exists guest_documents_consent_idx
  on guest_documents(tenant_id, property_id, created_at desc)
  where consent_method is not null;
