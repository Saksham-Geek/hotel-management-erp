-- Plan catalogue. Feature keys must match packages/shared/src/features.ts.
insert into plans (key, name, rank) values
  ('basic', 'Basic', 1), ('plus', 'Plus', 2), ('premium', 'Premium', 3), ('enterprise', 'Enterprise', 4);

insert into features (key, description, vertical) values
  ('core.users',              'Staff user accounts (limit = max active users)', null),
  ('core.custom_fields',      'Custom fields on guests / patients',             null),
  ('core.api_access',         'Public API access',                              null),
  ('core.audit_export',       'Export the audit trail',                         null),
  ('core.sso',                'Single sign-on (SAML / OIDC)',                   null),
  ('hotel.rooms',             'Room types and rooms',                           'hotel'),
  ('hotel.reservations',      'Reservations, check-in and check-out',           'hotel'),
  ('hotel.housekeeping',      'Housekeeping tasks and room status board',       'hotel'),
  ('hotel.reports_basic',     'Occupancy and revenue reports',                  'hotel'),
  ('hotel.reports_advanced',  'Advanced analytics and exports',                 'hotel'),
  ('hotel.pos',               'Restaurant / spa point of sale',                 'hotel'),
  ('hotel.channel_manager',   'OTA channel manager sync',                       'hotel');

insert into plan_features (plan_key, feature_key, limit_value) values
  -- basic
  ('basic', 'core.users', 5), ('basic', 'hotel.rooms', null), ('basic', 'hotel.reservations', null),
  -- plus
  ('plus', 'core.users', 15), ('plus', 'hotel.rooms', null), ('plus', 'hotel.reservations', null),
  ('plus', 'hotel.housekeeping', null), ('plus', 'hotel.reports_basic', null), ('plus', 'core.custom_fields', null),
  -- premium
  ('premium', 'core.users', 50), ('premium', 'hotel.rooms', null), ('premium', 'hotel.reservations', null),
  ('premium', 'hotel.housekeeping', null), ('premium', 'hotel.reports_basic', null), ('premium', 'core.custom_fields', null),
  ('premium', 'hotel.reports_advanced', null), ('premium', 'hotel.pos', null),
  ('premium', 'hotel.channel_manager', null), ('premium', 'core.api_access', null),
  -- enterprise (unlimited users)
  ('enterprise', 'core.users', null), ('enterprise', 'hotel.rooms', null), ('enterprise', 'hotel.reservations', null),
  ('enterprise', 'hotel.housekeeping', null), ('enterprise', 'hotel.reports_basic', null), ('enterprise', 'core.custom_fields', null),
  ('enterprise', 'hotel.reports_advanced', null), ('enterprise', 'hotel.pos', null),
  ('enterprise', 'hotel.channel_manager', null), ('enterprise', 'core.api_access', null),
  ('enterprise', 'core.sso', null), ('enterprise', 'core.audit_export', null);
