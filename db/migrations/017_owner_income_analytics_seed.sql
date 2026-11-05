-- Migration 017: Historical Night Audit and Financial Analytics Backfill for Owner Income Engine
-- Populates historical night audit logs for tenant 'grand-azure' to power rolling 1-year analytics.

do $$
declare
  prop record;
  d date;
  dow int;
  total_rms int;
  occ_rms int;
  occ_pct numeric(5,2);
  rm_rev numeric(12,2);
  fnb_rev numeric(12,2);
  tax_rev numeric(12,2);
  calc_adr numeric(12,2);
  calc_revpar numeric(12,2);
  multiplier numeric;
  base_rate numeric;
begin
  for prop in
    select p.id as property_id, p.tenant_id
    from properties p
    join tenants t on t.id = p.tenant_id
    where t.slug = 'grand-azure'
  loop
    perform set_config('app.tenant_id', prop.tenant_id::text, true);
    perform set_config('app.property_id', prop.property_id::text, true);

    -- Total rooms in property (defaults to 18)
    select count(*) into total_rms from rooms where tenant_id = prop.tenant_id and property_id = prop.property_id;
    if total_rms is null or total_rms = 0 then
      total_rms := 18;
    end if;

    -- Backfill 365 daily night audit records leading up to current_date
    for i in 1..365 loop
      d := current_date - i;
      dow := extract(dow from d); -- 0 = Sun, 5 = Fri, 6 = Sat

      -- Weekend demand surge multiplier (Taj luxury leisure pattern)
      if dow in (5, 6, 0) then
        multiplier := 1.25;
        occ_rms := least(total_rms, 13 + (i % 5));
      else
        multiplier := 1.0;
        occ_rms := least(total_rms, 10 + (i % 6));
      end if;

      occ_pct := round((occ_rms::numeric / total_rms::numeric) * 100, 1);
      base_rate := round((7200 + ((i * 137) % 3800)) * multiplier, 2);
      rm_rev := round(occ_rms * base_rate, 2);
      fnb_rev := round((rm_rev * 0.32) + ((i * 97) % 12000), 2);
      tax_rev := round((rm_rev * 0.15) + (fnb_rev * 0.05), 2);
      calc_adr := round(rm_rev / occ_rms, 2);
      calc_revpar := round(rm_rev / total_rms, 2);

      insert into night_audit_logs (
        tenant_id, property_id, business_date, rooms_total, rooms_occupied,
        occupancy_rate, total_room_revenue, total_fnb_revenue, total_tax_collected,
        adr, revpar, no_shows_cancelled, created_at
      )
      values (
        prop.tenant_id, prop.property_id, d, total_rms, occ_rms,
        occ_pct, rm_rev, fnb_rev, tax_rev,
        calc_adr, calc_revpar, (case when i % 7 = 0 then 1 else 0 end),
        (d::text || ' 23:59:00+05:30')::timestamptz
      )
      on conflict (tenant_id, property_id, business_date) do nothing;
    end loop;
  end loop;
end $$;
