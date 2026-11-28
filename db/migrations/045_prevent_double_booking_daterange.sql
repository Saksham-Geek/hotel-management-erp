-- 045_prevent_double_booking_daterange.sql
-- Enforces Postgres exclusion constraint on (tenant_id, room_id, stay) for date-level double booking prevention

create extension if not exists btree_gist;

-- Ensure stay column is present as generated stored daterange
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'reservations' and column_name = 'stay'
  ) then
    alter table reservations add column stay daterange generated always as (daterange(check_in, check_out, '[)')) stored;
  end if;
end $$;

-- Enforce date-level exclusion constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'no_double_booking_date'
  ) then
    -- Note: for multi-night bookings, stay is [check_in, check_out)
    alter table reservations add constraint no_double_booking_date
      exclude using gist (
        tenant_id with =,
        room_id with =,
        stay with &&
      ) where (status in ('reserved', 'checked_in') and rate_mode = 'nightly');
  end if;
end $$;
