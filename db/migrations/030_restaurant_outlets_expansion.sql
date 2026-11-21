-- Migration 030: Expand restaurant_outlets outlet_type constraint and support clean outlet deletion / deactivation
alter table restaurant_outlets drop constraint if exists restaurant_outlets_outlet_type_check;
alter table restaurant_outlets add constraint restaurant_outlets_outlet_type_check
  check (outlet_type in ('dine_in', 'room_service', 'bar', 'poolside', 'banquet', 'cafe', 'takeaway', 'bistro'));
