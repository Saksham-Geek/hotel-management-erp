-- 026_enterprise_scale_performance_indexes.sql
-- Mission-critical composite indexes designed for 100,000+ operations/sec:
-- 1. Active KOT orders & Kitchen KDS dispatch
-- 2. Indexed reservation lookups by status and check-in ordering
-- 3. High-throughput property user session resolution
-- 4. Fast table status lookups for dining floor plans
-- 5. Keycard status and room door lock bridges

-- 1. KOT active kitchen display & table order scans
create index if not exists kot_orders_kds_status_idx
  on kot_orders (property_id, status, created_at desc);

create index if not exists kot_orders_table_active_idx
  on kot_orders (table_id, status)
  where status not in ('settled', 'cancelled');

-- 2. Fast reservation listing with combined status filtering and descending date sorting
create index if not exists reservations_prop_status_dates_idx
  on reservations (property_id, status, check_in desc, created_at desc);

-- 3. Rapid authentication & membership verification in JwtAuthGuard
create index if not exists property_users_user_property_idx
  on property_users (user_id, property_id, role);

-- 4. Restaurant dining floor plan active tables
create index if not exists restaurant_tables_prop_section_idx
  on restaurant_tables (property_id, section, status);

-- 5. Room keys inventory & quick slot lookups
create index if not exists room_keys_prop_status_room_idx
  on room_keys (property_id, status, room_id);

-- 6. Folios fast lookup by reservation
create index if not exists reservation_folios_res_prop_idx
  on reservation_folios (reservation_id, property_id, status);
