-- Migration 032: Key & Lock Access Management Modes (Boutique Brass, Modern RFID, Hybrid & Digital Mobile)
-- Enables hotels to operate as Physical Brass Only, RFID Card Only, or Hybrid Combination.

-- 1. Property-level key system policy
alter table properties
  add column if not exists key_system_mode text not null default 'hybrid' check (key_system_mode in ('brass_only', 'rfid_only', 'hybrid')),
  add column if not exists enable_mobile_qr boolean not null default true;

-- 2. Room-level lock technology configuration
alter table rooms
  add column if not exists lock_type text not null default 'both' check (lock_type in ('brass_key', 'rfid_card', 'both'));

-- 3. Dynamic Auto-Provisioning Trigger Function respecting Lock Type and Property Mode
create or replace function auto_provision_room_keys()
returns trigger as $$
declare
  prop_mode text;
begin
  -- Fetch property's configured key access mode
  select coalesce(key_system_mode, 'hybrid') into prop_mode
  from properties
  where id = new.property_id;

  -- Provision Brass Keychain if:
  -- - Room lock_type is 'brass_key' or 'both'
  -- - AND property mode is not 'rfid_only'
  if (coalesce(new.lock_type, 'both') in ('brass_key', 'both')) and (prop_mode != 'rfid_only') then
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
  end if;

  -- Provision RFID MIFARE Card if:
  -- - Room lock_type is 'rfid_card' or 'both'
  -- - AND property mode is not 'brass_only'
  if (coalesce(new.lock_type, 'both') in ('rfid_card', 'both')) and (prop_mode != 'brass_only') then
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
  end if;

  return new;
end;
$$ language plpgsql;

-- 4. Re-attach trigger
drop trigger if exists trg_auto_provision_room_keys on rooms;
create trigger trg_auto_provision_room_keys
  after insert on rooms
  for each row
  execute function auto_provision_room_keys();
