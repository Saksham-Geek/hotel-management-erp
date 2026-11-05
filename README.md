# Antigravity Enterprise Hospitality ERP (Multi-Property PMS & SaaS Cloud)

A modern, cloud-native hospitality Property Management System (PMS) and multi-tenant SaaS platform engineered to surpass legacy hotel systems (Oracle Opera PMS, IDS Next, Cloudbeds) and match luxury 5-star chain standards (Taj / IHCL, Oberoi, ITC Hotels, Marriott).

Built on **Next.js 15 App Router**, **NestJS 10 Modular Core**, and **PostgreSQL 16** with cryptographic Row-Level Security (RLS) multi-tenant and multi-property isolation.

---

## 🌟 Core Modules & Operational Capabilities

### 1. ⚡ SaaS Founder & Cloud HQ Command Center (`/platform-admin`)
> *Confidential: Restricted exclusively to the SaaS Platform Founder and Cloud Operations Staff.*
- **Recurring Software Revenue KPIs**: Live Monthly Recurring Revenue (MRR), Annual Run-Rate (ARR), and Cumulative Lifetime Platform Income.
- **12-Month Revenue Timeline**: Visual bar chart tracking monthly subscription payments collected from client hotels.
- **Client Organizations Directory**: Instant search across all onboarded hotel groups, active plan keys, room capacity, and status toggles.
- **Plan Switcher**: 1-click tier upgrades (Starter ₹1,999, Growth ₹5,999, Enterprise ₹19,999).
- **Churn & Retention Audit Ledger**: Detailed tracking of departed hotels, cancellation dates, historical lifetime value (LTV), and structured exit reasons.

### 2. 🏛️ Turnkey Customer Showcase Hub (`/showcase`)
- Live interactive presentation matrix for pitching to luxury palace chains, mid-scale corporate chains, and independent boutique hotel owners.
- 1-click credential cards with copy buttons and feature highlights.
- Pre-loaded with realistic multi-property operations, diplomatic folios, and 365-day historical consistency.

### 3. ✨ Fresh-Start Self-Service Onboarding Wizard (`/onboard`)
- **Zero-Pollution Guarantee**: New hoteliers sign up independently with **0 dummy bookings** and clean inventory.
- **4-Step Wizard**:
  1. *Hotel Profile*: Name, City, WhatsApp/Phone, and real-time subdomain slug generation.
  2. *Plan Selection*: Starter (₹1,999), Growth (₹5,999 - Most Popular), Enterprise (₹19,999) with 14-day free trial.
  3. *Owner Account*: Full Name, official work email, and master password.
  4. *Room Inventory Choice*: Choose **Option A: Clean Blank Slate (0 Rooms)** for custom setups or **Option B: Quick Starter Inventory** with floor and room sliders.
- **Instant Auto-Login**: Automatically provisions PostgreSQL tenant, property context, RLS scope, subscription invoice, and logs the hotelier into `/dashboard`.

### 4. 👑 Confidential Owner Income & Revenue Analytics (`/income`)
> *Restricted strictly to Hotel Property Owners & Managing Directors.*
- **8 Flexible Time Horizons**: Daily, Weekly (7d), Monthly (30d), Quarterly (3m), 6 Months, 1 Year, Annual Financial Year (FY), and Custom Calendar Date Range.
- **USALI Departmental Split**: Rooms gross/net revenue vs Food & Beverage (F&B) dining vs Ancillary services (Spa/Laundry).
- **Yield KPIs**: Average Daily Rate (ADR), Revenue Per Available Room (RevPAR), Total Revenue Per Available Room (TRevPAR), and Occupancy %.
- **Direct vs OTA Revenue**: Compare direct bookings against OTA commissions (MakeMyTrip, Booking.com, Agoda).
- **Tender Realization**: Breakdown by UPI, Credit/Debit Cards, and Cash (guarded by Section 269ST).
- **1-Click Board Pack P&L**: Export a print-ready executive P&L statement formatted for CA audit or investor board meetings.

### 5. 🏢 Multi-Hotel Portfolio Console (`/super-admin`)
> *For Multi-Property Hotel Owners (e.g. Taj Mumbai & Ganges, or Heritage Haveli & Lakeview).*
- 1-click instant property switching without logging out.
- Aggregate chain portfolio key counts and capacity metrics.
- Provision new branch properties under the same owner organization.

### 6. 📊 Room Rack & Interactive Tape Chart (`/tape-chart` & `/dashboard`)
- **Material 3 / Bundled Notes Aesthetic**: Soft warm stone surfaces, pastel room category themes, signature horizontal dashes, and outline filter chips.
- **Interactive Drag-to-Select Booking**: Click and drag across vacant dates on any room row (e.g. *Room 201 · Nov 6 → Nov 9 · 3 Nights*) to visually select a stay range and launch the pre-filled reservation form.
- Real-time OTA channel ribbons: Walk-In, MakeMyTrip, Booking.com, Agoda, Corporate.
- Live floor-by-floor turnover board (`Available`, `Occupied`, `Cleaning`, `Maintenance`).

### 7. 💳 Cashiering & Statutory Indian GST Billing (`/billing`)
- Dual-slab Indian GST calculation (12% for tariff &le; ₹7,500; 18% for tariff &gt; ₹7,500) under SAC Code `996311`.
- **Income Tax Act Section 269ST Guard**: Automatically refuses cash transactions &ge; ₹2,00,000 per guest per stay.
- **Rule 114B PAN Validation**: Mandatory PAN record for cash payments &gt; ₹50,000.
- B2B Corporate Ledgers with 15-character GSTIN validation and multi-item cashiering (Accommodation, In-Room Dining, Minibar, Spa).

### 8. ⚖️ Statutory Compliance & BoI Form C (`/compliance`)
- Mandatory **Bureau of Immigration (BoI) Form C** filing for foreign national guests within 24 hours of arrival.
- Daily local police station beat register export formatted for local law enforcement submission.

### 9. 🌙 Automated Night Audit Rollover (`/night-audit`)
- 1-click midnight business date rollover and daily room rate posting.
- Daily Manager Flash Revenue Report with live ADR, RevPAR, and occupancy calculations.

### 10. 🌐 Two-Way OTA Channel Manager (`/channel-manager`)
- Real-time ARI (Availability, Rates & Inventory) synchronization with MakeMyTrip, Booking.com, Agoda, and Expedia.
- Inbound booking simulation and webhook audit logging.

### 11. 💬 Guest Loyalty CRM & Marketing Automation (`/marketing`)
- Taj InnerCircle VIP loyalty tiers (Kohinoor, Platinum, Gold, Silver).
- Automated 1-click post-checkout WhatsApp Google Review and TripAdvisor outreach.
- Guest stay history, lifetime spend (LTV), and guest preferences logging.

### 12. 👥 Staff Hierarchy & Delegation Governance (`/staff`)
- Strict hierarchy enforcement: Super Admin ➔ Property Owner ➔ General Manager ➔ Front Desk / Housekeeping.
- General Managers are restricted to recruiting Front Desk and Housekeeping staff.
- Shift assignments (Morning, Evening, Night Audit, General).

### 13. 📖 Role-Aware Master Guide & SOP Handbook (`/guide`)
- In-site operational handbook that dynamically detects the user's role and displays the exact procedures authorized for their access level.
- Role-Based Access Control (RBAC) permissions matrix comparing all 5 tiers.

---

## 🔑 Demonstration Accounts Matrix

The system includes pre-configured client portfolios with 1-click pre-fills on the **[`/login`](http://localhost:3000/login)** page:

| Portfolio Category | Organization Slug | Properties Included | Login Credentials | Demonstration Highlights |
|---|---|---|---|---|
| **🧪 Testing Sandbox** | `grand-azure` | Grand Azure Hotel (18 keys) | `owner@grandazure.test`<br/>`ChangeMe-123!` | Full 365-day historical booking records; test anything freely without altering client presentation accounts. |
| **👑 Luxury Palace Chain 1** | `taj-hotels` | 1. **The Taj Mahal Palace**, Mumbai (35 keys)<br/>2. **Taj Ganges**, Varanasi (25 keys) | `director@tajhotels.com`<br/>`TajPalace2026!` | 5-Star palace luxury: Tata Presidential suites, VIP protocols, high ADR corporate folios, multi-property switcher. |
| **🏛️ Luxury Business Chain 2** | `itc-hotels` | 1. **ITC Maurya**, New Delhi (32 keys)<br/>2. **ITC Mughal**, Agra (28 keys) | `owner@itchotels.com`<br/>`ItcLuxury2026!` | Diplomatic delegations, embassy folios, Bukhara & Dum Pukht F&B dining billing, corporate AR aging. |
| **🏢 Mid-Market Chain 1** | `sayaji-hotels` | 1. **Sayaji Hotel Indore** (24 keys)<br/>2. **Sayaji Hotel Pune** (20 keys) | `owner@sayajihotels.com`<br/>`SayajiGrowth2026!` | Premier business hotel chain, corporate executives, banquet management. |
| **🏢 Mid-Market Chain 2** | `radisson-india` | 1. **Radisson Blu Mumbai Airport** (26 keys)<br/>2. **Radisson Blu Udaipur Palace** (24 keys) | `franchise@radissonhotels.com`<br/>`Radisson2026!` | Franchise chains, OTA sync (MakeMyTrip, Agoda, Booking.com), housekeeping room rack. |
| **🏰 Independent Multi-Hotel** | `city-boutique` | 1. **Heritage Haveli**, Jaipur (16 keys)<br/>2. **Lakeview Boutique Resort**, Udaipur (14 keys) | `owner@singhaniahotels.com`<br/>`Boutique2026!` | **Single owner with differently named hotels**: Vikram Singhania manages two distinct properties under one login. |
| **📉 Churned Hotel (Exited)** | `coastal-haven` | Coastal Haven Retreat, Goa (12 keys) | `owner@coastalhaven.test` | Subscription canceled due to *"Seasonal monsoon closure & lease expired"* (Lifetime LTV: ₹15,992). |
| **⚠️ Past Due (Overdue)** | `alpine-manali` | Alpine Pines Resort, Manali (18 keys) | `owner@alpinepines.test` | Overdue invoice tracking & automated grace period warning. |
| **⚡ SaaS Founder HQ** | `platform-hq` | Cloud Operations HQ | `founder@antigravity-erp.com`<br/>`FounderCloud2026!` | Software Founder command center: platform MRR (₹83k+/mo), ARR (₹10L+/yr), client directory, churn retention ledger. |

---

## 🛠️ Technology Stack & Architecture

- **Web Frontend**: Next.js 15 (App Router, React 19, Server Actions, Tailwind CSS 3.4).
- **Backend API**: NestJS 10 (TypeScript, Fastify/Express, Zod runtime validation, Throttler rate limiting, Passport JWT).
- **Database**: PostgreSQL 16 with Row-Level Security (`current_setting('app.tenant_id')` and `current_setting('app.property_id')`).
- **Security**: AES-256-GCM encryption for guest documents, Bcrypt password hashing, UIDAI-compliant Aadhaar masking (last 4 digits only).
- **Monorepo**: pnpm workspaces (`@erp/shared`, `@erp/api`, `@erp/web`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16 (local or Docker container on port `5433`)

### Environment Configuration (`.env`)
```env
DATABASE_ADMIN_URL=postgres://erp_owner:erp_owner_dev@localhost:5433/erp
DATABASE_URL=postgres://erp_app:erp_app_dev@localhost:5433/erp  
APP_DB_PASSWORD=erp_app_dev

PORT=4000
JWT_SECRET=dev-only-secret-change-me-dev-only-secret-change-me
JWT_EXPIRES_IN=8h
GUEST_DOCUMENT_ENCRYPTION_KEY=a317d44244850b3af9286341e68b5cf3191c9575ec7552c85decfb5eaad1720f
API_URL=http://localhost:4000
```

### Installation & Execution

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm db:migrate

# 3. Seed Production Showcase Portfolio & 365-Day Historical Data
pnpm --filter @erp/api exec tsx src/db/seed-production-portfolio.ts
pnpm --filter @erp/api exec tsx src/db/seed-showcase-stays.ts

# 4. Start Development Servers
# Terminal 1: NestJS API (Port 4000)
pnpm --filter @erp/api start:dev

# Terminal 2: Next.js Web App (Port 3000)
pnpm --filter @erp/web dev
```

### Verification & Testing
```bash
# Run unit tests
pnpm test:foundation

# Run full TypeScript verification across all packages
pnpm --filter @erp/shared typecheck
pnpm --filter @erp/api typecheck
pnpm --filter @erp/web typecheck
```

---

## 📚 Operational Manuals & Architecture References
- [Master Credentials Directory](./CREDENTIALS.md) — All login credentials, demo personas, testing sandboxes, and passwords.
- [Enterprise Hospitality Manual](./ENTERPRISE_HOSPITALITY_MANUAL.md) — Exhaustive technical & operational handbook.
- [System Architecture](./docs/ARCHITECTURE.md) — Monolith architecture, RLS design, and concurrency decisions.
- [Upgrade Notes](./doc/UPGRADE_NOTES.md) — Patch changelog and migration notes.
