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
- **Role-Decoupled Operations & Zero Clutter**: Decoupled into dedicated operational workspaces (**🪑 Floor Plan Tables** for Captains, **🖥️ Touch POS Counter** for Cashiers, **🛵 Online Delivery Hub** for Aggregator Dispatch, **👨‍🍳 Kitchen KDS** for Station Chefs, **📊 Cashier Shifts** for Reconciliation, and a centralized **⚙️ Settings & Hardware Control Center** for Admin setup).
- **Dual Operating Mode**: Switch seamlessly between **🏨 Hotel Integrated Mode** (connected with active room folios) and **🍽️ Standalone POS Mode** (independent high-street bistros, cafes, and food courts).
- **Floor Zones, Dynamic Table Setup & Operations**: Multi-section floor plans (*Main AC Hall, Open Terrace Garden, Poolside Deck, Bar & Lounge*), 1-click **Table Shifting** (`transferTable`), and **Table Merging** (`mergeTables`) for large banquet parties.
- **Centralized Settings & Configuration Control Center**: Heavy setup tasks (Table authoring, Menu & Category creation with SAC 996331 5% GST, Swiggy & Zomato API credentials, 80mm ESC/POS hardware setup) are isolated in **Settings** to keep operational screens clean, distraction-free, and dead simple for waitstaff.
- **Multi-Round KOT Punching**: Supports subsequent rounds of ordering (*Round 1 Starters, Round 2 Mains, Round 3 Desserts*) with individual thermal KOT kitchen tickets (`KOT-101-R2`) while consolidating the table bill.
- **Aura Dine Split Billing Engine**: Split dining bills 2 to 5 ways equally or itemized, with independent payment methods per split (Cash, Scan-to-Pay UPI QR, EDC POS Machine Card, or Room Charge).
- **Standalone Diner CRM**: Fast mobile number lookup auto-recognizes returning guests with visit frequency, lifetime spend, and dietary preference tags (Veg, Non-Veg, Jain).
- **80mm ESC/POS Printing**:
  - `KotPrintModal`: Thermal kitchen tickets with prep instructions (*"No Onion Garlic"*, *"Mild"*, *"Crispy"*).
  - `BillPrintModal`: Official 80mm customer tax receipts with FSSAI license, GSTIN, SAC 996331 tax breakdown, CGST, SGST, discounts, and payment mode.
- **Online Delivery Hub (Swiggy & Zomato Connected)**: Live incoming delivery orders feed, dual-tone alert chime, pop-up accept/reject modal with prep timers (15m, 25m, 40m), food ready packing alerts, rider status tracking, and 1-click live demo simulation.
- **Live Item 86'ing & Multi-Station Kitchen Routing**: Instant out-of-stock toggle (Item 86) syncing across dine-in and delivery channels; automated KDS department routing (*🔥 Tandoor, 🍳 Main Curry, 🍸 Bar, 🥗 Pantry*).
- **Cashier Shifts & Day-End Z-Report**: Shift opening float management, multi-tender revenue aggregation, cash drawer variance auditing, and official 80mm Day-End Z-Reports.
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

### 11. 🛡️ Zero-Cost Client-Side ID Masking & Statutory Redaction (`IdRedactionModal`)
> *100% DPDP Act 2023 & UIDAI Section 29 Compliant · ₹0 Cloud OCR/API Costs*
- **Permanent In-Canvas Pixel Overwriting**: Overwrites raw pixel arrays with solid `#000000` pitch-black blocks directly on the HTML5 canvas before file transmission, mathematically guaranteeing unmasked PII never reaches server memory, databases, or cloud storage.
- **Statutory Indelible Compliance Footer**: Automatically burns the required statutory stamp onto the saved document:
  > `SECURE KYC · MASKED UNDER SECTION 29 AADHAAR ACT / DPDP ACT 2023 · FOR HOTEL CHECK-IN USE ONLY`
- **1-Click Smart Presets Across All Indian ID Proofs**:
  - **Aadhaar Card**: Auto-masks digits 1–8 (`XXXX XXXX 1234`) and blacks out the unencrypted 2D demographic QR code.
  - **Passport**: Redacts the bottom 2-line Machine-Readable Zone (MRZ) and specimen signature block per MEA rules.
  - **Driving License**: Redacts specimen signature and smart card emergency contact chip per MoRTH guidelines.
  - **Voter ID (EPIC)**: Redacts tracking barcodes and sensitive demographic data.
  - **PAN Card**: Redacts middle PAN digits and signature per Income Tax Rule 114B.
  - **Freehand Crosshair Drag & Draw**: Drag to draw custom blackout rectangles anywhere on desktop or touch screens.
- **Both Photo & PDF Support**: Renders JPEG, PNG, WebP, and Page 1 of official e-Aadhaar PDFs onto high-DPI canvas.

### 12. 📱 Front Desk Mobile Camera Bridge & WebRTC Live Viewfinder
- **Zero-Footprint Mobile ID Capture**: Front desk receptionist clicks *"Snap ID with Phone"* on PC, generating an ephemeral QR code.
- **No WhatsApp / Gallery Footprint**: Receptionist scans QR with smartphone; photo transfers directly to desk PC form via temporary browser memory. Never leaves guest ID photos stored in staff WhatsApp chats or phone photo galleries.
- **Live In-Browser Viewfinder**: Uses WebRTC `navigator.mediaDevices.getUserMedia` with automatic ID alignment framing guides.
- **Direct Laptop Webcam Capture**: For front desks with attached webcams or laptops, 1-click webcam capture with instant frame freeze and client-side compression (<500 KB).

### 13. 🎭 Live Role-Based Access Control (RBAC) & Staff Persona Switcher
- **Interactive Sales Demo Persona Switcher (`RolePersonaSwitcher`)**: Located in top header. Allows hoteliers and sales evaluators to toggle live staff views with 1 click:
  - 👑 **Property Owner**: Full P&L, RevPAR, Owner Income analytics, Staff governance, and Multi-Branch console.
  - 👔 **General Manager**: Operations dashboard, Staff management, Day-End Night Audit, and OTA channels (Owner Income hidden).
  - 🛎️ **Front Desk Receptionist**: Room rack, check-in/out, tape chart, guest KYC, billing folios, restaurant POS, and police reports (Staff hiring, settings, and financials hidden).
  - 🧹 **Housekeeping Staff**: Dedicated mobile-first cleaning queue (Dirty ⇄ Clean ⇄ Ready toggles). All guest PII and financial folios strictly restricted.
- **Live Preview Alert Banner**: Informs users when they are previewing a staff persona, with a 1-click `[✕ Exit Preview]` button.
- **Strict Route Enforcement**: Direct URL navigation to `/income`, `/settings`, `/staff`, or `/night-audit` in receptionist or housekeeping mode triggers an *Access Restricted* redirect.

### 14. ⚡ Dynamic UPI QR Cashiering with Fullscreen Counter Display Mode
- **Exact-Amount Dynamic QR Code**: Standard NPCI UPI URI (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`) embeds the exact balance down to the paisa. Eliminates incorrect payment amounts.
- **🖥️ Fullscreen Customer Display**: 1-click popup expands a high-contrast QR display for reception desk iPads or second guest-facing monitors.
- **Real-Time Payment Detection**: Server-Sent Events (SSE) stream and polling auto-detect payment completion, pulse green, and record the NPCI Bank UTR.
- **Simulate Paid Demo Mode**: Receptionists and evaluators can simulate real-time UPI webhook arrival with a single click.

### 15. 🖨️ Dedicated 80mm & 58mm Thermal Print Engine (ESC/POS & CSS)
- **High-Speed Receipt & KOT Printing**: Fully optimized `@media print` CSS for standard 80mm front desk thermal roll printers and 58mm mobile Bluetooth printers.
- **Guest Folio Mini-Receipt (`FolioPrintModal`)**: Prints guest name, room number, stay dates, itemized room/food charges, GST breakdown (CGST+SGST/IGST), and statutory hotel GSTIN. Supports raw ESC/POS byte streaming.
- **Kitchen Order Tickets (`KotPrintModal`)**: Kitchen printing with Table #, Room #, Order Type, Special Chef Notes (*"No Onion Garlic"*, *"Mild"*), and server name.

### 16. 💬 WhatsApp Guest Notification Templates & Voucher Engine
- **WhatsApp Booking Confirmation Voucher (`WhatsAppVoucherModal`)**: Added to every reservation row. Pre-fills guest WhatsApp number and formats official hotel vouchers (dates, room assigned, total price, check-in/out timings, Google Maps directions).
- **Pre-Arrival Digital Check-In**: Sends guests a secure link to upload ID proof from their smartphone before arrival (skipping the reception queue).
- **Welcome & Wi-Fi Greeting**: In-room dining dial codes, reception intercom, and guest Wi-Fi connection details.
- **WhatsApp GST Tax Invoice (`WhatsAppInvoiceModal`)**: Dispatches digital PDF tax invoices directly to the guest's mobile on checkout.

### 17. 🛡️ High-Resilience REST-Based Authentication (`/api/auth/login`)
- Replaced brittle Server Action form submissions with a permanent, resilient REST endpoint (`POST /api/auth/login`).
- Eliminates Next.js internal `UnrecognizedActionError` hash mismatches during hot-reloads or rolling updates.
- Real-time inline error messaging without page reloads or cleared input fields.

### 18. 📋 Front Desk Emergency Contingency Engine (`FrontDeskContingencyModal`)
- Instant printable/downloadable offline guest ledger for power or internet outages.
- Exports in-house guest roster, room occupancy, pending arrivals, and outstanding balances in 1 click.

### 19. ⚖️ Statutory Compliance & BoI Form C (`/compliance`)
- Mandatory **Bureau of Immigration (BoI) Form C** filing for foreign national guests within 24 hours of arrival.
- Daily local police station beat register export formatted for local law enforcement submission.

### 20. 🌙 Automated Night Audit Rollover & Scheduler (`/night-audit`)
- 1-click midnight business date rollover and daily room rate posting.
- **Configurable Automated Scheduler**: Toggle automated scheduled audit execution at fixed midnight hours (e.g. 02:00 AM) with auto-posting of room accommodation tariffs and GST to active guest folios.
- Daily Manager Flash Revenue Report with live ADR, RevPAR, and occupancy calculations.

### 21. 🥗 Recipe Costing & Kitchen Bill of Materials (`/restaurant` & `/settings?tab=recipes`)
- **Menu Dish to Store SKU Ingredient Mapping**: Directly maps restaurant menu items to raw material inventory items (e.g. 1 portion of Butter Chicken = 300g Chicken, 50g Butter, 100ml Cream).
- **Automated Inventory Depletion**: Automatically decrements kitchen store stock when KOT orders are prepared.
- **Theoretical Food Cost & Margin Analytics**: Tracks theoretical recipe cost vs selling price and calculates live gross profit margin %.

### 22. 📊 Chart of Accounts (COA) & Double-Entry General Ledger (`/settings?tab=accounting`)
- **Integrated Chart of Accounts**: Standard Assets (1010-1050), Liabilities (2010-2050), Equity (3010), Operating Revenue (4010-4040), and Operating Expenses (5010-5060).
- **Automated Journal Entries**: Auto-creates double-entry journal vouchers for folio settlements, petty cash vouchers, and GRN purchase receipts.
- **Live Financial Statements**: Generates real-time Trial Balance, Profit & Loss (P&L) Statement, and Balance Sheet.
- **Multi-Folio Corporate Routing Rules**: Configure corporate split rules (e.g., Master Folio A for room tariff to Company BTC with GSTIN, and Folio B for guest personal extras).

### 23. 🍾 Minibar Amenities & In-Room Folio Billing (`/settings?tab=minibar`)
- Configurable in-room minibar catalog (Beverages, Snacks, Confectionery, Premium).
- 1-click consumption posting directly onto active guest room folios with automated GST tax calculation.

### 24. 📈 Dynamic Pricing & Revenue Management Engine (`/settings?tab=pricing`)
- Configurable automated pricing triggers based on live property occupancy thresholds.
- Supports Occupancy Surge Multipliers (+15% when occupancy &ge; 75%), Weekend Premiums, and Last-Minute Vacancy Savers (-15%).

### 25. 🧹 Housekeeping Turnaround & Inspection Console (`/settings?tab=housekeeping` & `/housekeeping`)
- Dedicated turnaround logging console: `dirty` ➔ `cleaning` ➔ `available` (ready) ➔ `maintenance`.
- Log room attendant names, inspection checklists, and maintenance work orders.

### 26. 🌐 Two-Way OTA Channel Manager (`/channel-manager`)
- Real-time ARI (Availability, Rates & Inventory) synchronization with MakeMyTrip, Booking.com, Agoda, and Expedia.
- Inbound booking simulation and webhook audit logging.

### 27. 👥 Staff Hierarchy & Delegation Governance (`/staff`)
- Strict hierarchy enforcement: Super Admin ➔ Property Owner ➔ General Manager ➔ Front Desk / Housekeeping.
- General Managers are restricted to recruiting Front Desk and Housekeeping staff.
- Shift assignments (Morning, Evening, Night Audit, General).

### 28. ⚙️ Unified Settings & Management Hub (`/settings`)
- 20 unified administrative tabs equipped with end-to-end CRUD:
  1. `rooms`: Room Types, Base/Hourly Tariffs, Lock Types, Key Allocations
  2. `restaurant`: Aura Dine Dining Outlets, Tables, Floor Zones, Menu Categories, Menu Items
  3. `payments`: Bank UPI Receiver VPA, Merchant Name, EDC POS Machines & PIN-Pads
  4. `channels`: OTA Channel Connections, Two-Way Sync Logs
  5. `staff`: Staff Onboarding, Role Assignments, Hierarchy Permissions
  6. `compliance`: Bureau of Immigration (BoI) Form C, Police Beat Register
  7. `marketing`: Guest Loyalty CRM, Tier Thresholds, Promotional Coupons
  8. `keycards`: RFID Door Key Provisioning, Brass Key Rack Modes
  9. `expenses`: Petty Cash Categories, Approved Vendor Registry, Preset Common Expenses
  10. `banquets`: Event Spaces, Halls, Lawn Capacity, Base Rental Tariffs
  11. `inventory`: Store Raw Material SKUs, Dynamic Inventory Categories, Storage Locations
  12. `corporate`: Corporate Accounts (BTC), Credit Limits, GSTIN & PAN
  13. `concierge`: In-Room QR Wi-Fi Credentials, Reception Helpline, Timing Announcements
  14. `nightaudit`: Automated Scheduled Night Audit Toggle & Execution Time
  15. `accounting`: Chart of Accounts (COA) Ledger Management
  16. `recipes`: Recipe Costing & Kitchen Bill of Materials (BOM)
  17. `minibar`: In-Room Minibar Amenities Catalog & Tariffs
  18. `pricing`: Dynamic Pricing Rules (RMS Engine)
  19. `housekeeping`: Housekeeping Turnaround & Maintenance Work Order Logging
  20. `all`: Global Overview of All Configured Modules

### 29. 📖 Role-Aware Master Guide & SOP Handbook (`/guide`)
- In-site operational handbook that dynamically detects the user's role and displays the exact procedures authorized for their access level.
- Role-Based Access Control (RBAC) permissions matrix comparing all 4 tiers.
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
