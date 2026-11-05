-- Migration 018: Platform SaaS HQ Subscription Invoicing & Tenant Lifecycle Metadata
-- Powers the SaaS Founder / Platform Owner revenue ledger, MRR/ARR analytics, and churn tracking.

alter table tenants
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists churn_reason text,
  add column if not exists churned_at timestamptz,
  add column if not exists billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'annual'));

create table if not exists platform_subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_number text not null unique,
  plan_key text not null,
  amount numeric(12,2) not null,
  currency char(3) not null default 'INR',
  status text not null check (status in ('paid', 'pending', 'failed', 'refunded')),
  billing_period_start date not null,
  billing_period_end date not null,
  paid_at timestamptz,
  payment_method text default 'razorpay_mandate',
  created_at timestamptz not null default now()
);

create index if not exists platform_subscription_invoices_tenant_idx on platform_subscription_invoices(tenant_id, created_at desc);
create index if not exists platform_subscription_invoices_paid_at_idx on platform_subscription_invoices(paid_at);

-- Grant privileges to the restricted application role for SaaS platform tenant lifecycle & invoicing
grant select, insert, update on platform_subscription_invoices to erp_app;
grant select, insert, update on tenants to erp_app;
grant select, insert, update on property_subscriptions to erp_app;
