-- Correct the legacy constraint name used by PostgreSQL for the unnamed
-- table-level CHECK in 002_hotel.sql. Migration 003 used alternate names,
-- which left `reservations_check` active on databases already upgraded.
alter table reservations drop constraint if exists reservations_check;
alter table reservations drop constraint if exists reservations_check_check;
alter table reservations drop constraint if exists reservations_check_out_check;
alter table reservations drop constraint if exists reservation_date_order;

alter table reservations
  add constraint reservation_date_order
  check (check_out > check_in or (rate_mode = 'hourly' and check_out = check_in));
