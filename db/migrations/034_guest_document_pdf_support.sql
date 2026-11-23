-- Migration 034: Add PDF support for guest identity document uploads (e.g. masked Aadhaar e-PDFs)

-- Safely drop existing check constraint on mime_type if present
alter table guest_documents drop constraint if exists guest_documents_mime_type_check;

-- Re-add check constraint supporting application/pdf along with image formats
alter table guest_documents add constraint guest_documents_mime_type_check
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf'));
