-- 013_tier_subscription_catalog.sql
-- Tiered subscription catalogue: Starter (Small Hotels/Homestays), Growth (Resorts), Enterprise (Taj & Luxury Chains)

-- 1. Insert new enterprise and chain feature keys
insert into features (key, description, vertical) values
  ('hotel.corporate_ledger', 'Corporate City Ledger & B2B Accounts Receivable with aging reports', 'hotel'),
  ('hotel.crs',              'Central Reservation System & Multi-Property Portfolio governance',   'hotel'),
  ('hotel.keycards',         'RFID Keycard Encoder Hardware Integration (Assa Abloy / Salto)',     'hotel'),
  ('hotel.loyalty',          'Central Guest Loyalty & Lifetime Stay Recognition Program',         'hotel')
on conflict (key) do update set description = excluded.description;

-- 2. Update existing plan names to reflect Indian hospitality tiers
update plans set name = 'Starter (Homestay & Small Hotel)' where key = 'basic';
update plans set name = 'Growth (Mid-Scale & Resort)' where key = 'plus';
update plans set name = 'Premium Chain' where key = 'premium';
update plans set name = 'Enterprise Chain (Taj & Luxury Edition)' where key = 'enterprise';

-- 3. Add first-class 'starter' and 'growth' plans for direct semantic tier selection
insert into plans (key, name, rank) values
  ('starter', 'Starter (Homestay & Small Hotel)', 10),
  ('growth',  'Growth (Mid-Scale & Resort)',      20)
on conflict (key) do update set name = excluded.name;

-- 4. Clean and re-seed plan_features to guarantee exact limits for small hotels vs large chains

-- === STARTER & BASIC (Small Hotel / Homestay / B&B Edition: max 25 rooms, 3 users) ===
insert into plan_features (plan_key, feature_key, limit_value) values
  ('starter', 'core.users', 3),
  ('starter', 'hotel.rooms', 25),
  ('starter', 'hotel.reservations', null),
  ('starter', 'hotel.tape_chart', null),
  ('starter', 'hotel.billing', null),
  ('starter', 'hotel.compliance', null),

  ('basic', 'core.users', 3),
  ('basic', 'hotel.rooms', 25),
  ('basic', 'hotel.reservations', null),
  ('basic', 'hotel.tape_chart', null),
  ('basic', 'hotel.billing', null),
  ('basic', 'hotel.compliance', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;

-- === GROWTH & PLUS (Mid-Scale / Heritage Resort Edition: max 80 rooms, 15 users) ===
insert into plan_features (plan_key, feature_key, limit_value) values
  ('growth', 'core.users', 15),
  ('growth', 'hotel.rooms', 80),
  ('growth', 'hotel.reservations', null),
  ('growth', 'hotel.tape_chart', null),
  ('growth', 'hotel.billing', null),
  ('growth', 'hotel.compliance', null),
  ('growth', 'hotel.housekeeping', null),
  ('growth', 'hotel.night_audit', null),
  ('growth', 'hotel.reports_basic', null),
  ('growth', 'core.custom_fields', null),

  ('plus', 'core.users', 15),
  ('plus', 'hotel.rooms', 80),
  ('plus', 'hotel.reservations', null),
  ('plus', 'hotel.tape_chart', null),
  ('plus', 'hotel.billing', null),
  ('plus', 'hotel.compliance', null),
  ('plus', 'hotel.housekeeping', null),
  ('plus', 'hotel.night_audit', null),
  ('plus', 'hotel.reports_basic', null),
  ('plus', 'core.custom_fields', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;

-- === ENTERPRISE (Taj, Oberoi, ITC Luxury Hotel Chain Edition: Unlimited rooms & users) ===
insert into plan_features (plan_key, feature_key, limit_value) values
  ('enterprise', 'core.users', null),
  ('enterprise', 'hotel.rooms', null),
  ('enterprise', 'hotel.reservations', null),
  ('enterprise', 'hotel.tape_chart', null),
  ('enterprise', 'hotel.billing', null),
  ('enterprise', 'hotel.compliance', null),
  ('enterprise', 'hotel.housekeeping', null),
  ('enterprise', 'hotel.night_audit', null),
  ('enterprise', 'hotel.reports_basic', null),
  ('enterprise', 'hotel.reports_advanced', null),
  ('enterprise', 'hotel.corporate_ledger', null),
  ('enterprise', 'hotel.crs', null),
  ('enterprise', 'hotel.keycards', null),
  ('enterprise', 'hotel.loyalty', null),
  ('enterprise', 'hotel.channel_manager', null),
  ('enterprise', 'hotel.pos', null),
  ('enterprise', 'core.custom_fields', null),
  ('enterprise', 'core.sso', null),
  ('enterprise', 'core.audit_export', null),
  ('enterprise', 'core.api_access', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;

-- === PREMIUM (Boutique Multi-Property Chain) ===
insert into plan_features (plan_key, feature_key, limit_value) values
  ('premium', 'core.users', 50),
  ('premium', 'hotel.rooms', 250),
  ('premium', 'hotel.reservations', null),
  ('premium', 'hotel.tape_chart', null),
  ('premium', 'hotel.billing', null),
  ('premium', 'hotel.compliance', null),
  ('premium', 'hotel.housekeeping', null),
  ('premium', 'hotel.night_audit', null),
  ('premium', 'hotel.reports_basic', null),
  ('premium', 'hotel.reports_advanced', null),
  ('premium', 'hotel.corporate_ledger', null),
  ('premium', 'hotel.channel_manager', null),
  ('premium', 'hotel.pos', null),
  ('premium', 'core.custom_fields', null),
  ('premium', 'core.api_access', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;
