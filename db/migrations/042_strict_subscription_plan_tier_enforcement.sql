-- 042_strict_subscription_plan_tier_enforcement.sql
-- Strictly enforces 3-tier subscription gating across Starter (₹1,499), Growth (₹3,799), and Enterprise (₹8,999)

-- 1. Insert newly introduced hospitality enterprise features
insert into features (key, description, vertical) values
  ('hotel.inventory',        'Stores & Raw Materials Inventory with GRN stock-in and department stock-out', 'hotel'),
  ('hotel.recipes_bom',      'Recipe Bill of Materials (BOM) with automated kitchen stock depletion and food margins', 'hotel'),
  ('hotel.accounting_gl',    'Double-Entry General Ledger, Chart of Accounts, Trial Balance, P&L, and Balance Sheet', 'hotel'),
  ('hotel.dynamic_pricing',  'Dynamic Pricing Rules Engine (RMS) with occupancy surge multipliers', 'hotel'),
  ('hotel.banquets',         'Banquets, Event Spaces, Lawns, and Hall Scheduling with billing', 'hotel'),
  ('hotel.expenses',         'Front Desk Petty Cash Drawer Vouchers and Approved Hotel Vendor Registry', 'hotel'),
  ('hotel.minibar',          'In-Room Minibar Catalog & Direct Guest Folio Consumption Billing', 'hotel')
on conflict (key) do update set description = excluded.description;

-- 2. Clear existing plan_features for clean semantic tier re-alignment
delete from plan_features where plan_key in ('starter', 'basic', 'growth', 'plus', 'enterprise', 'premium');

-- 3. === STARTER & BASIC (Small Hotel / Homestay / B&B Edition: max 20 rooms, 3 users) ===
insert into plan_features (plan_key, feature_key, limit_value) values
  ('starter', 'core.users', 3),
  ('starter', 'hotel.rooms', 20),
  ('starter', 'hotel.reservations', null),
  ('starter', 'hotel.tape_chart', null),
  ('starter', 'hotel.billing', null),
  ('starter', 'hotel.compliance', null),

  ('basic', 'core.users', 3),
  ('basic', 'hotel.rooms', 20),
  ('basic', 'hotel.reservations', null),
  ('basic', 'hotel.tape_chart', null),
  ('basic', 'hotel.billing', null),
  ('basic', 'hotel.compliance', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;

-- 4. === GROWTH & PLUS (Mid-Scale / Heritage Resort Edition: max 60 rooms, 10 users) ===
insert into plan_features (plan_key, feature_key, limit_value) values
  ('growth', 'core.users', 10),
  ('growth', 'hotel.rooms', 60),
  ('growth', 'hotel.reservations', null),
  ('growth', 'hotel.tape_chart', null),
  ('growth', 'hotel.billing', null),
  ('growth', 'hotel.compliance', null),
  ('growth', 'hotel.housekeeping', null),
  ('growth', 'hotel.night_audit', null),
  ('growth', 'hotel.reports_basic', null),
  ('growth', 'hotel.restaurant.pos', null),
  ('growth', 'hotel.inventory', null),
  ('growth', 'hotel.expenses', null),
  ('growth', 'hotel.banquets', null),
  ('growth', 'hotel.minibar', null),
  ('growth', 'core.custom_fields', null),

  ('plus', 'core.users', 10),
  ('plus', 'hotel.rooms', 60),
  ('plus', 'hotel.reservations', null),
  ('plus', 'hotel.tape_chart', null),
  ('plus', 'hotel.billing', null),
  ('plus', 'hotel.compliance', null),
  ('plus', 'hotel.housekeeping', null),
  ('plus', 'hotel.night_audit', null),
  ('plus', 'hotel.reports_basic', null),
  ('plus', 'hotel.restaurant.pos', null),
  ('plus', 'hotel.inventory', null),
  ('plus', 'hotel.expenses', null),
  ('plus', 'hotel.banquets', null),
  ('plus', 'hotel.minibar', null),
  ('plus', 'core.custom_fields', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;

-- 5. === ENTERPRISE & PREMIUM (Taj, Oberoi, ITC Luxury Hotel Chain Edition: Unlimited rooms & users) ===
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
  ('enterprise', 'hotel.restaurant.pos', null),
  ('enterprise', 'hotel.inventory', null),
  ('enterprise', 'hotel.expenses', null),
  ('enterprise', 'hotel.banquets', null),
  ('enterprise', 'hotel.minibar', null),
  ('enterprise', 'hotel.recipes_bom', null),
  ('enterprise', 'hotel.accounting_gl', null),
  ('enterprise', 'hotel.dynamic_pricing', null),
  ('enterprise', 'hotel.channel_manager', null),
  ('enterprise', 'hotel.keycards', null),
  ('enterprise', 'hotel.corporate_ledger', null),
  ('enterprise', 'hotel.crs', null),
  ('enterprise', 'hotel.loyalty', null),
  ('enterprise', 'hotel.pos', null),
  ('enterprise', 'core.custom_fields', null),
  ('enterprise', 'core.sso', null),
  ('enterprise', 'core.audit_export', null),
  ('enterprise', 'core.api_access', null),

  ('premium', 'core.users', null),
  ('premium', 'hotel.rooms', null),
  ('premium', 'hotel.reservations', null),
  ('premium', 'hotel.tape_chart', null),
  ('premium', 'hotel.billing', null),
  ('premium', 'hotel.compliance', null),
  ('premium', 'hotel.housekeeping', null),
  ('premium', 'hotel.night_audit', null),
  ('premium', 'hotel.reports_basic', null),
  ('premium', 'hotel.reports_advanced', null),
  ('premium', 'hotel.restaurant.pos', null),
  ('premium', 'hotel.inventory', null),
  ('premium', 'hotel.expenses', null),
  ('premium', 'hotel.banquets', null),
  ('premium', 'hotel.minibar', null),
  ('premium', 'hotel.recipes_bom', null),
  ('premium', 'hotel.accounting_gl', null),
  ('premium', 'hotel.dynamic_pricing', null),
  ('premium', 'hotel.channel_manager', null),
  ('premium', 'hotel.keycards', null),
  ('premium', 'hotel.corporate_ledger', null),
  ('premium', 'hotel.crs', null),
  ('premium', 'hotel.loyalty', null),
  ('premium', 'hotel.pos', null),
  ('premium', 'core.custom_fields', null),
  ('premium', 'core.sso', null),
  ('premium', 'core.audit_export', null),
  ('premium', 'core.api_access', null)
on conflict (plan_key, feature_key) do update set limit_value = excluded.limit_value;
