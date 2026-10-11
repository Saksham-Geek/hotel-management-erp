-- Inventory identifiers and room-type names are property-local, not tenant-global.
alter table room_types drop constraint if exists room_types_tenant_id_name_key;
alter table room_types
  add constraint room_types_property_name_key unique (tenant_id, property_id, name);

alter table rooms drop constraint if exists rooms_tenant_id_number_key;
alter table rooms
  add constraint rooms_property_number_key unique (tenant_id, property_id, number);

alter table rooms
  add column if not exists base_rate numeric(12,2)
  check (base_rate is null or base_rate >= 0);
