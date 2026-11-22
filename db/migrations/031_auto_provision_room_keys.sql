-- Migration 031: Auto-Provision Room Keys on Room Creation & Retroactive Sync
-- Ensures every newly created room immediately receives physical brass keychain and RFID smart card

-- 1. Unique index to guarantee one key per type per room
create unique index if not exists room_keys_room_type_idx on room_keys(room_id, key_type);

-- 2. Trigger function to auto-create room keys upon room creation
create or replace function auto_provision_room_keys()
returns trigger as $$
begin
  -- Provision Brass Keychain if not already present
  if not exists (select 1 from room_keys where room_id = new.id and key_type = 'physical_brass') then
    insert into room_keys (tenant_id, property_id, room_id, key_number, key_type, status, notes)
    values (
      new.tenant_id,
      new.property_id,
      new.id,
      'KEY-' || new.number || '-BRASS',
      'physical_brass',
      'in_slot',
      'Traditional solid brass numbered keychain'
    );
  end if;

  -- Provision RFID MIFARE Card if not already present
  if not exists (select 1 from room_keys where room_id = new.id and key_type = 'rfid_mifare') then
    insert into room_keys (tenant_id, property_id, room_id, key_number, key_type, card_uid, status, notes)
    values (
      new.tenant_id,
      new.property_id,
      new.id,
      'CARD-' || new.number || '-RFID',
      'rfid_mifare',
      '04:' || upper(substr(md5(new.number || 'rfid'), 1, 8)),
      'in_slot',
      'MIFARE Classic 1K Contactless Card'
    );
  end if;

  return new;
end;
$$ language plpgsql;

-- 3. Attach trigger to rooms table
drop trigger if exists trg_auto_provision_room_keys on rooms;
create trigger trg_auto_provision_room_keys
  after insert on rooms
  for each row
  execute function auto_provision_room_keys();

-- 4. Retroactively provision keys for all existing rooms that are currently missing keys
do $$
declare
  prop record;
  rm record;
begin
  for prop in select id, tenant_id from properties loop
    perform set_config('app.tenant_id', prop.tenant_id::text, true);
    perform set_config('app.property_id', prop.id::text, true);

    for rm in select id, number from rooms where property_id = prop.id loop
      if not exists (select 1 from room_keys where room_id = rm.id and key_type = 'physical_brass') then
        insert into room_keys (tenant_id, property_id, room_id, key_number, key_type, status, notes)
        values (
          prop.tenant_id,
          prop.id,
          rm.id,
          'KEY-' || rm.number || '-BRASS',
          'physical_brass',
          'in_slot',
          'Traditional solid brass numbered keychain'
        );
      end if;

      if not exists (select 1 from room_keys where room_id = rm.id and key_type = 'rfid_mifare') then
        insert into room_keys (tenant_id, property_id, room_id, key_number, key_type, card_uid, status, notes)
        values (
          prop.tenant_id,
          prop.id,
          rm.id,
          'CARD-' || rm.number || '-RFID',
          'rfid_mifare',
          '04:' || upper(substr(md5(rm.number || 'rfid'), 1, 8)),
          'in_slot',
          'MIFARE Classic 1K Contactless Card'
        );
      end if;
    end loop;
  end loop;
end $$;
