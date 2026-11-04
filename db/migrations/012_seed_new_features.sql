-- Insert newly added enterprise features into catalog
insert into features (key, description, vertical) values
  ('hotel.billing',     'Folio cashiering, GST tax invoices, and B2B corporate ledger', 'hotel'),
  ('hotel.night_audit', 'Automated business date rollover, room posting, and ADR/RevPAR KPIs', 'hotel'),
  ('hotel.compliance',  'BoI Form C foreign guest registration and daily police beat reports', 'hotel'),
  ('hotel.tape_chart',  'Interactive multi-room visual Gantt tape chart', 'hotel')
on conflict (key) do nothing;

-- Grant to basic, plus, premium, enterprise plans
insert into plan_features (plan_key, feature_key, limit_value) values
  -- basic gets billing and tape chart
  ('basic', 'hotel.billing', null),
  ('basic', 'hotel.tape_chart', null),
  -- plus gets billing, night audit, compliance, tape chart
  ('plus', 'hotel.billing', null),
  ('plus', 'hotel.night_audit', null),
  ('plus', 'hotel.compliance', null),
  ('plus', 'hotel.tape_chart', null),
  -- premium
  ('premium', 'hotel.billing', null),
  ('premium', 'hotel.night_audit', null),
  ('premium', 'hotel.compliance', null),
  ('premium', 'hotel.tape_chart', null),
  -- enterprise
  ('enterprise', 'hotel.billing', null),
  ('enterprise', 'hotel.night_audit', null),
  ('enterprise', 'hotel.compliance', null),
  ('enterprise', 'hotel.tape_chart', null)
on conflict do nothing;
