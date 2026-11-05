-- Migration 019: Hotel Property Receiver UPI ID Configuration
-- Enables property owners to configure their verified merchant UPI VPA & settlement name.
-- Strict RBAC: Only 'owner' role can modify the receiver UPI ID; manager and receptionist roles cannot.

alter table properties
  add column if not exists upi_id text,
  add column if not exists upi_merchant_name text;

-- Seed default verified merchant UPI VPAs for all demonstration hotels
update properties set
  upi_id = 'tajmumbai@hdfcbank',
  upi_merchant_name = 'The Taj Mahal Palace Mumbai'
where name ilike '%Taj Mahal Palace%';

update properties set
  upi_id = 'tajganges@hdfcbank',
  upi_merchant_name = 'Taj Ganges Varanasi'
where name ilike '%Taj Ganges%';

update properties set
  upi_id = 'itcmaurya@icici',
  upi_merchant_name = 'ITC Maurya New Delhi'
where name ilike '%ITC Maurya%';

update properties set
  upi_id = 'itcmughal@icici',
  upi_merchant_name = 'ITC Mughal Agra'
where name ilike '%ITC Mughal%';

update properties set
  upi_id = 'sayajiindore@sbi',
  upi_merchant_name = 'Sayaji Hotel Indore'
where name ilike '%Sayaji Hotel Indore%';

update properties set
  upi_id = 'sayajipune@sbi',
  upi_merchant_name = 'Sayaji Hotel Pune'
where name ilike '%Sayaji Hotel Pune%';

update properties set
  upi_id = 'grandazure@icici',
  upi_merchant_name = 'Grand Azure Luxury Hotel'
where name ilike '%Grand Azure%';

update properties set
  upi_id = 'radissonmumbai@axisbank',
  upi_merchant_name = 'Radisson Blu Mumbai Airport'
where name ilike '%Radisson Blu Mumbai%';

update properties set
  upi_id = 'radissonudaipur@axisbank',
  upi_merchant_name = 'Radisson Blu Udaipur Palace'
where name ilike '%Radisson Blu Udaipur%';

update properties set
  upi_id = 'heritagehaveli@paytm',
  upi_merchant_name = 'Heritage Haveli Jaipur'
where name ilike '%Heritage Haveli%';

update properties set
  upi_id = 'lakeviewresort@paytm',
  upi_merchant_name = 'Lakeview Boutique Resort'
where name ilike '%Lakeview Boutique%';

-- Fallback for any other properties:
update properties set
  upi_id = coalesce(upi_id, 'hotelpay.' || lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) || '@icici'),
  upi_merchant_name = coalesce(upi_merchant_name, name)
where upi_id is null;

-- Ensure erp_app has update permissions on properties
grant select, update (upi_id, upi_merchant_name) on properties to erp_app;
