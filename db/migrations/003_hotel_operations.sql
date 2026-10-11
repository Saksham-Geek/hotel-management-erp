-- Forward-only upgrade: reusable guest relationships, flexible rates and reservation-level billing.
-- Existing reservations are preserved and backfilled to standard hotel check-in/out times.
alter table room_types add column if not exists hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0);
alter table rooms add column if not exists hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0);
alter table reservations add column if not exists rate_mode text not null default 'nightly' check (rate_mode in ('nightly','hourly'));
alter table reservations add column if not exists unit_rate numeric(12,2) not null default 0 check (unit_rate >= 0);
alter table reservations add column if not exists price_override numeric(12,2) check (price_override is null or price_override >= 0);
alter table reservations add column if not exists override_reason text;
alter table reservations add column if not exists check_in_at timestamptz;
alter table reservations add column if not exists check_out_at timestamptz;
update reservations set check_in_at = (check_in::text || ' 14:00 Asia/Kolkata')::timestamptz, check_out_at = (check_out::text || ' 11:00 Asia/Kolkata')::timestamptz where check_in_at is null or check_out_at is null;
alter table reservations alter column check_in_at set not null;
alter table reservations alter column check_out_at set not null;

-- Replace date-only exclusion with timestamp exclusion so hourly bookings can share a date.
alter table reservations drop constraint if exists no_double_booking;
alter table reservations add column if not exists stay_time tstzrange generated always as (tstzrange(check_in_at, check_out_at, '[)')) stored;
alter table reservations add constraint no_double_booking_time exclude using gist (
  tenant_id with =, room_id with =, stay_time with &&
) where (status in ('reserved', 'checked_in'));
alter table reservations add constraint reservation_time_order check (check_out_at > check_in_at);

create table if not exists reservation_guests (
  tenant_id uuid not null references tenants(id) on delete cascade,
  reservation_id uuid not null,
  guest_id uuid not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tenant_id, reservation_id, guest_id),
  foreign key (tenant_id, reservation_id) references reservations(tenant_id, id) on delete cascade,
  foreign key (tenant_id, guest_id) references guests(tenant_id, id) on delete restrict
);
insert into reservation_guests (tenant_id, reservation_id, guest_id, is_primary)
select tenant_id, id, guest_id, true from reservations on conflict do nothing;
create index if not exists reservation_guests_guest_idx on reservation_guests(tenant_id, guest_id);

-- One consolidated folio per reservation by default; multiple payment transactions can settle it.
create table if not exists reservation_folios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  reservation_id uuid not null,
  status text not null default 'open' check (status in ('open','issued','part_paid','paid','void')),
  currency char(3) not null default 'INR',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, reservation_id),
  unique (tenant_id, id),
  foreign key (tenant_id, reservation_id) references reservations(tenant_id, id) on delete restrict
);
create table if not exists folio_items (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
  folio_id uuid not null, description text not null, quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0), tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  line_total numeric(12,2) not null check (line_total >= 0), created_at timestamptz not null default now(),
  foreign key (tenant_id, folio_id) references reservation_folios(tenant_id,id) on delete restrict
);
insert into reservation_folios (tenant_id, reservation_id, currency, subtotal, total, status)
select r.tenant_id, r.id, t.currency, r.total_amount, r.total_amount, 'open'
from reservations r join tenants t on t.id = r.tenant_id
on conflict (tenant_id, reservation_id) do nothing;
insert into folio_items (tenant_id, folio_id, description, quantity, unit_price, line_total)
select f.tenant_id, f.id, 'Room charge (legacy reservation)', 1, f.total, f.total
from reservation_folios f
where not exists (select 1 from folio_items i where i.tenant_id = f.tenant_id and i.folio_id = f.id);

create table if not exists folio_payments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
  folio_id uuid not null, amount numeric(12,2) not null check (amount > 0), method text not null check (method in ('cash','card','upi','bank_transfer','other')),
  payer_guest_id uuid, reference text, status text not null default 'captured' check (status in ('pending','captured','refunded','failed')),
  received_by uuid, created_at timestamptz not null default now(),
  foreign key (tenant_id, folio_id) references reservation_folios(tenant_id,id) on delete restrict,
  foreign key (tenant_id, payer_guest_id) references guests(tenant_id,id) on delete restrict
);
create index if not exists folio_payments_folio_idx on folio_payments(tenant_id, folio_id, created_at);

-- Private encrypted guest document storage. API encryption key must be configured before upload/download.
create table if not exists guest_documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
  guest_id uuid not null, document_type text not null default 'identity', original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_length integer not null check (byte_length between 1 and 5242880),
  ciphertext bytea not null, iv bytea not null, auth_tag bytea not null,
  uploaded_by uuid, created_at timestamptz not null default now(),
  foreign key (tenant_id, guest_id) references guests(tenant_id,id) on delete cascade
);
create index if not exists guest_documents_guest_idx on guest_documents(tenant_id, guest_id, created_at desc);

-- Enforce tenant RLS on new business tables.
do $$ declare t text; begin
 foreach t in array array['reservation_guests','reservation_folios','folio_items','folio_payments','guest_documents'] loop
   execute format('alter table %I enable row level security', t);
   execute format('alter table %I force row level security', t);
   execute format($p$create policy tenant_isolation on %I using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
 end loop;
end $$;
-- Drop the original date-order check before allowing same-day hourly stays.
-- Keep the alternate names too, so databases created from earlier variants upgrade.
alter table reservations drop constraint if exists reservations_check;
alter table reservations drop constraint if exists reservations_check_check;
alter table reservations drop constraint if exists reservations_check_out_check;
alter table reservations add constraint reservation_date_order check (check_out > check_in or (rate_mode = 'hourly' and check_out = check_in));
alter table guests add column if not exists id_number_ciphertext bytea;
alter table guests add column if not exists id_number_iv bytea;
alter table guests add column if not exists id_number_auth_tag bytea;
