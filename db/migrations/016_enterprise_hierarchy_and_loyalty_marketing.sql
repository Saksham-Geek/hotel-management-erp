-- 016_enterprise_hierarchy_and_loyalty_marketing.sql
-- Enterprise Chain Delegation Hierarchy & Marketing/Loyalty System (Taj InnerCircle Grade)

-- 1. Extend property_users with department, shift, and delegation tracking
alter table property_users
  add column if not exists department text not null default 'Front Office',
  add column if not exists shift text not null default 'General',
  add column if not exists invited_by uuid references users(id) on delete set null;

-- 2. Guest Loyalty & CRM Profiles (Taj InnerCircle / Marriott Bonvoy Grade)
create table if not exists guest_loyalty_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  tier text not null default 'silver' check (tier in ('bronze', 'silver', 'gold', 'platinum', 'kohinoor')),
  total_nights int not null default 1,
  total_spend numeric(12,2) not null default 0,
  points_balance int not null default 100,
  preferences jsonb not null default '{"pillow_type": "Hypoallergenic", "floor_preference": "High Floor", "dietary": "Vegetarian", "newspaper": "The Economic Times"}'::jsonb,
  anniversary_date date,
  birthday_date date,
  last_stay_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, guest_id),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tenant_id, guest_id) references guests(tenant_id, id) on delete cascade
);

create index if not exists guest_loyalty_tier_idx on guest_loyalty_profiles(tenant_id, property_id, tier);

-- 3. Automated Guest Follow-Up & Review Outreach Logs (WhatsApp, Email, SMS)
create table if not exists guest_followup_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  trigger_type text not null default 'post_checkout_review'
    check (trigger_type in ('post_checkout_review', 'in_stay_service', 'anniversary_greeting', 'birthday_greeting', 'promotional_offer')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'sms')),
  recipient_name text not null,
  recipient_phone text,
  recipient_email text,
  message_body text not null,
  status text not null default 'sent' check (status in ('pending', 'sent', 'delivered', 'reviewed', 'bounced')),
  review_platform text default 'google' check (review_platform in ('google', 'tripadvisor', 'direct_nps')),
  rating_received int check (rating_received between 1 and 5),
  guest_feedback text,
  sent_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade,
  foreign key (tenant_id, guest_id) references guests(tenant_id, id) on delete cascade
);

create index if not exists guest_followup_property_idx on guest_followup_logs(tenant_id, property_id, sent_at desc);

-- 4. Marketing Campaigns (Repeat Bookings, Inactive Guest Re-engagement, Corporate Direct Offers)
create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  title text not null,
  campaign_type text not null check (campaign_type in ('repeat_booking', 'inactive_reengagement', 'festive_offer', 'vip_loyalty', 'corporate_renewal')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email')),
  audience_segment text not null check (audience_segment in ('all_guests', 'recent_checkouts', 'inactive_90_days', 'vip_platinum', 'corporate')),
  template_message text not null,
  discount_code text,
  status text not null default 'sent' check (status in ('draft', 'scheduled', 'sent', 'completed')),
  sent_count int not null default 0,
  delivered_count int not null default 0,
  converted_count int not null default 0,
  revenue_generated numeric(12,2) not null default 0,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, property_id) references properties(tenant_id, id) on delete cascade
);

create index if not exists marketing_campaigns_property_idx on marketing_campaigns(tenant_id, property_id, created_at desc);

-- 5. Row Level Security Policies
alter table guest_loyalty_profiles enable row level security;
alter table guest_loyalty_profiles force row level security;
drop policy if exists guest_loyalty_tenant_isolation on guest_loyalty_profiles;
create policy guest_loyalty_tenant_isolation on guest_loyalty_profiles
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (property_id is null or property_id = nullif(current_setting('app.property_id', true), '')::uuid)
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (property_id is null or property_id = nullif(current_setting('app.property_id', true), '')::uuid)
  );

alter table guest_followup_logs enable row level security;
alter table guest_followup_logs force row level security;
drop policy if exists guest_followup_tenant_isolation on guest_followup_logs;
create policy guest_followup_tenant_isolation on guest_followup_logs
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (property_id is null or property_id = nullif(current_setting('app.property_id', true), '')::uuid)
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (property_id is null or property_id = nullif(current_setting('app.property_id', true), '')::uuid)
  );

alter table marketing_campaigns enable row level security;
alter table marketing_campaigns force row level security;
drop policy if exists marketing_campaigns_tenant_isolation on marketing_campaigns;
create policy marketing_campaigns_tenant_isolation on marketing_campaigns
  using (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (property_id is null or property_id = nullif(current_setting('app.property_id', true), '')::uuid)
  )
  with check (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    and (property_id is null or property_id = nullif(current_setting('app.property_id', true), '')::uuid)
  );

-- 6. Permissions for application role
grant select, insert, update, delete on table guest_loyalty_profiles to erp_app;
grant select, insert, update, delete on table guest_followup_logs to erp_app;
grant select, insert, update, delete on table marketing_campaigns to erp_app;

-- 7. Grant hotel.loyalty to growth, plus, and enterprise plans
insert into plan_features (plan_key, feature_key, limit_value) values
  ('growth',     'hotel.loyalty', null),
  ('plus',       'hotel.loyalty', null),
  ('enterprise', 'hotel.loyalty', null)
on conflict (plan_key, feature_key) do nothing;
