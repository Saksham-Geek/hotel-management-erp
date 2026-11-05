# Hospitality ERP Version Changelog & Upgrade Notes

This document tracks all schema migrations, architectural enhancements, and feature milestones deployed across the ERP system.

---

## Release v2.5.0: Production Multi-Tenant SaaS Cloud & Showcase Hub

### 1. SaaS Founder Command Center & Revenue Ledger
- **Migration 018 (`018_platform_saas_hq.sql`)**:
  - Added `contact_email`, `contact_phone`, `churn_reason`, `churned_at`, and `billing_cycle` columns to `tenants`.
  - Created `platform_subscription_invoices` table to record monthly recurring software fees, payment methods, and billing periods.
  - Added `platform` module in NestJS API (`/platform/overview`, `/platform/onboard-hotel`, `/platform/tenants/:id/status`, `/platform/tenants/:id/plan`).
  - Added dedicated SaaS Founder HQ frontend dashboard (`/platform-admin`) tracking MRR, ARR, Lifetime Revenue, Client Directory, and Churn Retention.

### 2. Turnkey Customer Demonstration Portfolios
- Populated 8 realistic client demonstration accounts with full multi-property, VIP guest, and 365-day historical consistency:
  - **Testing Sandbox**: Grand Azure Hotel (`grand-azure`) — 18 keys, full historical stays.
  - **Luxury Chain 1**: Taj Hotels IHCL (`taj-hotels`) — The Taj Mahal Palace Mumbai & Taj Ganges Varanasi.
  - **Luxury Chain 2**: ITC Hotels Group (`itc-hotels`) — ITC Maurya Delhi & ITC Mughal Agra.
  - **Mid-Market Chain 1**: Sayaji Hotels (`sayaji-hotels`) — Sayaji Indore & Sayaji Pune.
  - **Mid-Market Chain 2**: Radisson Hotels (`radisson-india`) — Radisson Blu Mumbai & Radisson Blu Udaipur.
  - **Independent Multi-Hotel**: Singhania Hospitality (`city-boutique`) — Heritage Haveli Jaipur & Lakeview Resort Udaipur.
  - **Churned Hotel**: Coastal Haven Goa (`coastal-haven`) — Suspended with exit audit.
  - **Past Due Hotel**: Alpine Pines Manali (`alpine-manali`) — Overdue invoice warning.
- Added live **Presentation Showcase Hub (`/showcase`)** and 1-click persona quick-fills on `/login`.

### 3. Fresh-Start Clean-Slate Onboarding Wizard
- Created public self-service onboarding wizard at **`/onboard`** allowing new hoteliers to register their property with zero dummy data.
- Choice between **Clean Blank Slate (0 Rooms)** and **Quick Starter Inventory** with floor and room sliders.
- Real-time automatic subdomain slug generation.
- Instant atomic database provisioning and automatic session login.

### 4. Interactive Drag-to-Select Tape Chart Booking
- Click and drag across vacant dates on any room row in `/tape-chart` to select a stay range (e.g. *Room 201 · Nov 6 → Nov 9 · 3 Nights*).
- Floating selection summary pill with direct jump to pre-filled reservation form.
- Color-coded room categories and single VIP status pill indicators.

### 5. Role-Aware SOP & Master Guide
- Dynamically detects the active user's role and prioritizes operating procedures matching their access level.
- Enforces strict separation: SaaS Founder HQ procedures are visible only to platform founders, while hotel owners and staff view their respective operational manuals.
- Added Role Permissions Matrix table comparing all 5 tiers.

---

## Release v2.0.0: Indian Statutory Compliance, Night Audit & Loyalty CRM

- **Migration 011–017**:
  - Indian GST dual-slab calculation (12% / 18% under SAC `996311`).
  - Income Tax Section 269ST ₹2,00,000 cash cap guard and Rule 114B PAN validation.
  - Bureau of Immigration (BoI) Form C filing and daily police beat register export.
  - Automated midnight Night Audit rollover and Daily Manager Flash report.
  - Two-way OTA Channel Manager ARI distribution (MakeMyTrip, Booking.com, Agoda).
  - Taj InnerCircle VIP loyalty tiers and automated post-stay WhatsApp Google Review outreach.
  - Enterprise staff delegation hierarchy (Owner ➔ GM ➔ Front Desk / Housekeeping).
  - Owner Income & Revenue Analytics (`/income`) across 8 flexible intervals.

---

## Release v1.0.0: Core Multi-Tenant Architecture & Operations

- **Migration 001–010**:
  - PostgreSQL forced Row-Level Security (RLS) on `tenant_id` and `property_id`.
  - Multi-property context switching with composite foreign keys.
  - Timestamp range exclusion constraint (`tstzrange`) preventing double bookings.
  - AES-256-GCM encrypted document storage and UIDAI-compliant Aadhaar masking (last 4 digits only).
