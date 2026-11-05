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

### 7. 💳 Cashiering, Folios & Statutory Indian GST Billing (`/billing`)
- Dual-slab Indian GST calculation (12% for tariff &le; ₹7,500; 18% for tariff &gt; ₹7,500) under SAC Code `996311`.
- **Hardware POS Machine & EDC Terminal Integration**: Full compatibility with physical card swipe/tap terminals (Pine Labs Plutus, Paytm Smart POS, Razorpay POS/EzeTap, Innoviti uniPAY, Ingenico Lane IP, and direct USB Web Serial). Dispatches charges to physical pinpads, records Bank RRN, Auth Codes, EMV chip verification, and formats/prints thermal charge slips.
- **Dynamic NPCI Scan-to-Pay UPI QR Generator**: Generates real-time, tamper-proof QR codes with embedded property VPA, amount, transaction reference, and a 10-minute security countdown timer for instant settlement via PhonePe, GPay, Paytm, CRED, or BHIM.
- **1-Click WhatsApp GST Invoice Dispatch**: Instantly compiles and launches pre-filled WhatsApp tax invoice messages to guest mobile numbers with PDF download links and breakdown details.
- **Owner-Exclusive Receiver UPI ID Configuration**: Property owners exclusively configure and update the receiving bank VPA (`upi_id`) and merchant name. General Managers and Front Desk staff are locked to read-only access (403 Forbidden on write) to safeguard hotel funds.
- **Income Tax Act Section 269ST Guard**: Automatically refuses cash transactions &ge; ₹2,00,000 per guest per stay.
- **Rule 114B PAN Validation**: Mandatory PAN record for cash payments &gt; ₹50,000.
- B2B Corporate Ledgers with 15-character GSTIN validation and multi-item cashiering (Accommodation, In-Room Dining, Minibar, Spa).

### 8. 🍽️ Integrated Aura Dine F&B Restaurant POS & KOT (`/restaurant`)
- **Dual Operating Mode**: Switch seamlessly between **🏨 Hotel Integrated Mode** (connected with active room folios) and **🍽️ Standalone POS Mode** (independent high-street bistros, cafes, and food courts).
- **Floor Zones, Dynamic Table Setup & Operations**: Multi-section floor plans (*Main AC Hall, Open Terrace Garden, Poolside Deck, Bar & Lounge*), interactive **+ Add Table** modal with covers and zone configuration, edit/delete table controls, 1-click **Table Shifting** (`transferTable`), and **Table Merging** (`mergeTables`) for large banquet parties.
- **On-the-Fly Menu & Category Management**: Instant **+ Add Dish** and **+ Category** creation with dietary tags (Veg 🟢, Non-Veg 🔴, Egg 🟡), SAC 996331, and 5% GST.
- **Multi-Round KOT Punching**: Supports subsequent rounds of ordering (*Round 1 Starters, Round 2 Mains, Round 3 Desserts*) with individual thermal KOT kitchen tickets (`KOT-101-R2`) while consolidating the table bill.
- **Aura Dine Split Billing Engine**: Split dining bills 2 to 5 ways equally or itemized, with independent payment methods per split (Cash, Scan-to-Pay UPI QR, EDC POS Machine Card, or Room Charge).
- **Standalone Diner CRM**: Fast mobile number lookup auto-recognizes returning guests with visit frequency, lifetime spend, and dietary preference tags (Veg, Non-Veg, Jain).
- **80mm ESC/POS Printing**:
  - `KotPrintModal`: Thermal kitchen tickets with prep instructions (*"No Onion Garlic"*, *"Mild"*, *"Crispy"*).
  - `BillPrintModal`: Official 80mm customer tax receipts with FSSAI license, GSTIN, SAC 996331 tax breakdown, CGST, SGST, discounts, and payment mode.
- **1-Click "Charge to Room Folio"**: Directly transfers restaurant dining bills to active checked-in hotel guest folios under **SAC 996331 at 5% GST**, keeping accommodation and dining taxes strictly isolated.

### 9. 🔑 Enterprise Key Management & Hardware Bridge (`/keycards`)
- **Dual-System Hospitality Design**: Accommodates both physical heritage brass keys and electronic contactless RFID locks.
- **Traditional Wooden Brass Key Rack**: Visual pigeonhole key tag rack showing real-time physical possession: *In Slot*, *Issued to Guest*, *With Housekeeping*, or *Lost*.
- **W3C Web Serial RFID Card Encoder Bridge**: Zero-middleware browser integration (`navigator.serial`) pairing directly with USB RFID writers to encode MIFARE Classic 1K / Ultralight contactless smart keys with automatic check-out timestamp expiry.
- **Digital QR Mobile Guest Pass**: Contactless keyless entry mobile pass with encrypted QR tokens deliverable directly to guest smartphones.
- **Checkout Auto-Deprovisioning**: 1-click key return during front desk checkout immediately revokes door access.

### 10. 🏨 Commission-Free Direct Guest Booking Engine (`/book/[slug]`)
- **Direct Distribution Channel**: Public-facing, mobile-first guest booking portal allowing travelers to reserve directly with **0% OTA commissions**, eliminating the 18% to 25% fees extracted by MakeMyTrip, Agoda, and Booking.com.
- **Live Inventory Inspection**: Real-time room type availability, tariffs, amenities, and guest count selection.
- **Direct Advance UPI Settlement**: Displays property's verified NPCI UPI QR code for direct guest deposit confirmation.
- **Instant Allocation**: Automatically creates guest profile, confirms reservation, and renders directly into the Front Desk Room Rack (`/tape-chart`).

### 11. ⚖️ Statutory Compliance & BoI Form C (`/compliance`)
- Mandatory **Bureau of Immigration (BoI) Form C** filing for foreign national guests within 24 hours of arrival.
- Daily local police station beat register export formatted for local law enforcement submission.

### 12. 🌙 Automated Night Audit Rollover (`/night-audit`)
- 1-click midnight business date rollover and daily room rate posting.
- Daily Manager Flash Revenue Report with live ADR, RevPAR, and occupancy calculations.

### 13. 🌐 Two-Way OTA Channel Manager (`/channel-manager`)
- Real-time ARI (Availability, Rates & Inventory) synchronization with MakeMyTrip, Booking.com, Agoda, and Expedia.
- Inbound booking simulation and webhook audit logging.

### 14. 💬 Guest Loyalty CRM & Marketing Automation (`/marketing`)
- Taj InnerCircle VIP loyalty tiers (Kohinoor, Platinum, Gold, Silver).
- Automated 1-click post-checkout WhatsApp Google Review and TripAdvisor outreach.
- Guest stay history, lifetime spend (LTV), and guest preferences logging.

### 15. 👥 Staff Hierarchy & Delegation Governance (`/staff`)
- Strict hierarchy enforcement: Super Admin ➔ Property Owner ➔ General Manager ➔ Front Desk / Housekeeping.
- General Managers are restricted to recruiting Front Desk and Housekeeping staff.
- Shift assignments (Morning, Evening, Night Audit, General).

### 16. 📖 Role-Aware Master Guide & SOP Handbook (`/guide`)
- In-site operational handbook that dynamically detects the user's role and displays the exact procedures authorized for their access level.
- Role-Based Access Control (RBAC) permissions matrix comparing all 5 tiers.
- Front desk cashiering procedures with dynamic NPCI UPI QR code generation, Aura Dine POS, Keycard RFID encoding, and owner banking security rules.

---

## 🔑 Demonstration Accounts Matrix

The system includes pre-configured client portfolios with 1-click pre-fills on the **[`/login`](http://localhost:3000/login)** page, along with public direct booking portals:

| Portfolio Category | Organization Slug | Properties Included | Login Credentials | Direct Booking Portal & Banking |
|---|---|---|---|---|
| **🧪 Testing Sandbox** | `grand-azure` | Grand Azure Hotel (18 keys) | `owner@grandazure.test`<br/>`ChangeMe-123!` | [`/book/grand-azure`](http://localhost:3000/book/grand-azure)<br/>VPA: `grandazure@icici` (Owner-managed) |
| **👑 Luxury Palace Chain 1** | `taj-hotels` | 1. **The Taj Mahal Palace**, Mumbai (35 keys)<br/>2. **Taj Ganges**, Varanasi (25 keys) | `director@tajhotels.com`<br/>`TajPalace2026!` | [`/book/taj-hotels`](http://localhost:3000/book/taj-hotels)<br/>VPA: `tajhotels@icici` (Owner-managed) |
| **🏛️ Luxury Business Chain 2** | `itc-hotels` | 1. **ITC Maurya**, New Delhi (32 keys)<br/>2. **ITC Mughal**, Agra (28 keys) | `owner@itchotels.com`<br/>`ItcLuxury2026!` | [`/book/itc-hotels`](http://localhost:3000/book/itc-hotels)<br/>VPA: `itchotels@hdfcbank` (Owner-managed) |
| **🏢 Mid-Market Chain 1** | `sayaji-hotels` | 1. **Sayaji Hotel Indore** (24 keys)<br/>2. **Sayaji Hotel Pune** (20 keys) | `owner@sayajihotels.com`<br/>`SayajiGrowth2026!` | [`/book/sayaji-hotels`](http://localhost:3000/book/sayaji-hotels)<br/>VPA: `sayaji@icici` (Owner-managed) |
| **🏢 Mid-Market Chain 2** | `radisson-india` | 1. **Radisson Blu Mumbai Airport** (26 keys)<br/>2. **Radisson Blu Udaipur Palace** (24 keys) | `franchise@radissonhotels.com`<br/>`Radisson2026!` | [`/book/radisson-india`](http://localhost:3000/book/radisson-india)<br/>VPA: `radissonhotels@axisbank` (Owner-managed) |
| **🏰 Independent Multi-Hotel** | `city-boutique` | 1. **Heritage Haveli**, Jaipur (16 keys)<br/>2. **Lakeview Boutique Resort**, Udaipur (14 keys) | `owner@singhaniahotels.com`<br/>`Boutique2026!` | [`/book/city-boutique`](http://localhost:3000/book/city-boutique)<br/>VPA: `singhania@kotak` (Owner-managed) |
| **📉 Churned Hotel (Exited)** | `coastal-haven` | Coastal Haven Retreat, Goa (12 keys) | `owner@coastalhaven.test` | Suspended account (Monsoon closure audit) |
| **⚠️ Past Due (Overdue)** | `alpine-manali` | Alpine Pines Resort, Manali (18 keys) | `owner@alpinepines.test` | Overdue invoice recovery workflow |
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
