# Hospitality ERP Version Changelog & Upgrade Notes

This document tracks all schema migrations, architectural enhancements, and feature milestones deployed across the ERP system.

---

## Release v2.9.0: Multi-Outlet F&B Expansion (Aura Dine: Standalone & Hotel Integrated POS)

### 1. Dual-Operation Architecture (Hotel Connected & Standalone POS)
- **Hotel Integrated Mode**: Directly links with active hotel check-ins, allowing 1-click posting to guest folios under **SAC 996331 at 5% GST** without tax commingling.
- **Standalone Restaurant Mode**: Functions independently for high-street bistros, food courts, cafes, and bars with zero hotel dependency. Supports direct walk-ins, phone-based CRM customer recognition, Swiggy/Zomato takeaway, and direct Cash/UPI/EDC card settlement.

### 2. Aura Dine Floor Plan & Table Management
- **Floor Zones / Sections**: Organizes tables across custom sections (*Main AC Hall*, *Open Terrace Garden*, *Poolside Deck*, *Bar & Lounge*, *VIP Private Dining*).
- **Table Shift / Transfer (`/hotel/restaurant/tables/transfer`)**: 1-click transfer of active KOT orders from one table to any vacant table (e.g. T-01 ➔ T-05).
- **Table Merge (`/hotel/restaurant/tables/merge`)**: Combines two tables into a single consolidated master order for large banquet and family gatherings.

### 3. Multi-Round KOT Punch & Kitchen Ticketing
- **Subsequent KOT Rounds (`/hotel/restaurant/kots/:id/round`)**: Punch Round 2 (Mains), Round 3 (Desserts) into an active order. Generates distinct sequential tickets (`KOT-101-R2`) for kitchen chefs while consolidating the table bill.
- **80mm ESC/POS Thermal Printing**: Dual print modal formats:
  - `KotPrintModal`: 80mm kitchen ticketing format with dish prep tags (*"No Onion Garlic"*, *"Mild"*, *"Crispy"*).
  - `BillPrintModal`: 80mm customer tax receipt format with FSSAI license, GSTIN, SAC 996331 breakdown, CGST, SGST, discounts, and payment mode.

### 4. Aura Dine Split Billing Engine & Standalone Diner CRM
- **Split Bill Engine (`/hotel/restaurant/kots/:id/split`)**:
  - Equal split across 2 to 5 ways with independent tenders per person (e.g., Split 1 via Cash, Split 2 via Dynamic UPI QR, Split 3 via Room Folio).
  - Individual split settlement tracking in `kot_order_splits`.
- **Standalone Diner CRM (`/hotel/restaurant/customers/lookup`)**:
  - Auto-identifies returning diners on mobile number entry.
  - Tracks visit count, lifetime spend, and dietary preferences (Veg, Non-Veg, Jain).

---

## Release v2.8.0: Integrated Aura Dine F&B Restaurant POS & KOT + Enterprise Key Management (Brass Rack & RFID Hardware Bridge)

### 1. Integrated Aura Dine Restaurant POS & KOT
- **Migration 021 (`021_restaurant_pos_kot.sql`)**:
  - Created tables: `restaurant_outlets`, `restaurant_tables`, `menu_categories`, `menu_items`, `kot_orders`, `kot_order_items`, `room_keys`.
  - Added feature flags: `hotel.restaurant.pos` and `hotel.keycards` across all subscription plan tiers in `plan_features`.
  - Seeded default dining outlets ("The Royal Pavilion", "In-Room Dining"), tables T-01 to T-08, 5 menu categories, 16 authentic dishes (Paneer Tikka, Dal Makhani, Butter Chicken, Biryani, Naan, Gulab Jamun, Masala Chai, etc.), and room keys for all rooms.
  - Attached forced PostgreSQL RLS policies (`tenant_isolation`, `property_isolation`) and `enforce_property_scope` triggers.
- **Backend Core (`RestaurantController`)**:
  - Registered under `/hotel/restaurant` in `HotelModule`.
  - Endpoints:
    - `GET /hotel/restaurant/outlets`
    - `GET /hotel/restaurant/tables`
    - `GET /hotel/restaurant/menu`
    - `GET /hotel/restaurant/kots`
    - `POST /hotel/restaurant/kots`
    - `PATCH /hotel/restaurant/kots/:id/status`
    - `POST /hotel/restaurant/kots/:id/charge-to-room` (Atomic line item posting under SAC 996331 at 5% GST directly to checked-in guest room folio)
    - `POST /hotel/restaurant/kots/:id/settle-direct` (Direct cashiering settlement with Cash, UPI QR, or EDC POS card machine)
- **Frontend Touch POS UI (`/restaurant`)**:
  - Aura Dine touch POS screen with Veg (🟢) / Non-Veg (🔴) culinary badges, spice level indicator, search, and category tabs.
  - Interactive table floor plan showing real-time occupancy (Available, Occupied, Billed).
  - Multi-type order support: Dine-In, In-Room Dining (Room Service), and Takeaway.
  - Custom prep instructions per dish (*"Less spicy, crispy naan"*).
  - `KotPrintModal`: 80mm ESC/POS thermal kitchen order ticket generator formatted for standard receipt printers with running KOT number and chef instructions.
  - Real-time Kitchen Display System (KDS) chef board with live status transitions (*Pending ➔ Preparing ➔ Ready ➔ Served*).

### 2. Enterprise Room Key Management (Brass Key Rack & RFID Card Encoder)
- **Backend Core (`KeycardsController`)**:
  - Registered under `/hotel/keycards` in `HotelModule`.
  - Endpoints:
    - `GET /hotel/keycards/keys`
    - `PATCH /hotel/keycards/keys/:id/status`
    - `POST /hotel/keycards/keys/:id/encode` (Writes UID, validates guest stay dates, sets expiry, marks issued)
- **Frontend Key Management UI (`/keycards`)**:
  - **Traditional Brass Key Tag Rack**: Heritage wooden key rack with individual room pigeonhole slots displaying physical key possession (*In Slot, Issued to Guest, With Housekeeping, Lost*).
  - **RFID Keycard Encoder Bridge**: W3C Web Serial API integration (`navigator.serial.requestPort()`) for direct USB RFID smart card writers (MIFARE Classic 1K, MIFARE Ultralight, Saflok/VingCard). Encodes room authorization and reads card UID.
  - **Digital Mobile Pass**: Contactless keyless entry mobile pass with encrypted QR tokens deliverable to guest smartphones.
  - **Active Guest Stay Binding**: Synchronized with active checked-in hotel guests for 1-click key issuance and return upon checkout.

---

## Release v2.7.0: Timeless Luxury Login Portal Redesign & Hardware POS (EDC Machine) Cashiering

### 1. Timeless Luxury Login Portal Redesign
- **Aura PMS Brand Architecture**:
  - Re-engineered `/login` with a timeless, prestigious luxury hospitality aesthetic.
  - Replaced temporary/demo naming with **Aura PMS: Enterprise Property Management System**.
  - Integrated classic architectural emblem and elegant split-panel layout with deep obsidian/navy ambiance and frosted glass highlights.
- **Zero Ephemeral or Incomplete Elements**:
  - Eliminated the prominent 1-click test persona cards (Taj, ITC, Sayaji, Radisson, Local Multi-Hotel, Sandbox) from the production login screen.
  - Eliminated hardcoded test default values (`grand-azure`, `owner@grandazure.test`, `ChangeMe-123!`), initializing form inputs with empty values and professional placeholders.
  - Removed temporary version tags and promotional hotel copy to ensure permanent, timeless durability.
  - Added discrete, professional secondary links: *"Register for a fresh workspace"* (`/onboard`) and *"Explore Client Showcase"* (`/showcase`).
- **Refined Authentication Controls**:
  - Property organization code input with building icon and helper explanation.
  - Work email input with envelope icon.
  - Password input with interactive eye show/hide toggle and clean "Forgot password?" recovery link.

### 2. Physical POS Machine (EDC Terminal) Cashiering Integration
- **Migration 020 (`020_pos_terminals.sql`)**:
  - Created `pos_terminals` table with forced PostgreSQL Row-Level Security (`tenant_id`, `property_id`).
  - Added `'pos_machine'` to `folio_payments_method_check` constraint.
  - Extended `folio_payments` with `pos_terminal_id`, `card_brand`, `card_last_four`, `bank_rrn`, `auth_code`, and `pos_slip_data`.
  - Seeded default POS terminals across Taj, ITC, Sayaji, Radisson, Singhania, and Grand Azure portfolios.
- **Backend Core (`PosController`)**:
  - Registered `PosController` under `/hotel/pos` in `HotelModule`.
  - Added endpoints: `GET /hotel/pos/terminals`, `POST /hotel/pos/terminals`, `PATCH /hotel/pos/terminals/:id`, `DELETE /hotel/pos/terminals/:id`, `POST /hotel/pos/terminals/:id/ping`, and `POST /hotel/pos/initiate-charge`.
  - Enforced `PERMISSIONS.POS_TERMINAL_MANAGE` RBAC for Owner and Manager roles.
- **Frontend POS Cashiering UI**:
  - `PosMachineCard`: Interactive terminal charge component with terminal selector, connection badge (🟢 Online / ⚪ Offline), and W3C Web Serial API pairing (`navigator.serial.requestPort()`) for direct USB cable connections.
  - Dual-stage live card swipe/tap animation (*Awaiting Card ➔ Reading Chip ➔ Waiting for Guest PIN ➔ Bank Approval*).
  - `PosSlipModal`: Authentic 58mm/80mm thermal charge slip receipt generator with 1-click browser printing for cardholder signature retention and merchant copy archival.
  - `PosTerminalsModal`: Terminal fleet management for Owners and GMs to register, edit, and ping terminals.

---

## Release v2.6.0: UPI Receiver Settings, Dynamic Scan-to-Pay QR, WhatsApp Invoicing & Direct Booking Engine

### 1. Owner-Exclusive UPI Receiver Settings
- **Migration 019 (`019_property_upi_receiver.sql`)**:
  - Added `upi_id` (VPA) and `upi_merchant_name` to the `properties` table.
  - Seeded verified VPAs for demonstration portfolios: Taj (`tajhotels@icici`), ITC (`itchotels@hdfcbank`), Sayaji (`sayaji@icici`), Radisson (`radissonhotels@axisbank`), Singhania (`singhania@kotak`), and Grand Azure (`grandazure@icici`).
- **Security & Authorization**:
  - Added `PROPERTY_BANKING_MANAGE` permission in `@erp/shared` mapped strictly to the `owner` role.
  - Implemented `GET /hotel/upi-settings` and `PATCH /hotel/upi-settings` in `BillingController`.
  - Added strict backend role verification returning `403 Forbidden` if non-owners attempt to modify the receiving VPA.
- **Frontend Banking UI**:
  - Added `UpiReceiverBanner` displaying active VPA status on `/billing`.
  - Added `UpiSettingsModal` enabling hotel owners to update their receiving VPA and legal merchant name with live validation.

### 2. Dynamic NPCI Scan-to-Pay QR Generator
- Added `UpiQrCard` component inside folio cashiering modal on `/billing`.
- Formulates real-time NPCI-compliant payment strings: `upi://pay?pa=...&pn=...&am=...&cu=INR&tr=...`.
- Embedded 10-minute security countdown timer to prevent stale payment authorizations.
- Front desk cashier records the 12-digit Indian bank UTR transaction reference number for audit reconciliation.

### 3. Automated WhatsApp GST Tax Invoice & Folio Dispatch
- Added 1-click **"WhatsApp Invoice"** button on guest folios and settled tax invoices.
- Prepares a formatted WhatsApp Web/app message addressed directly to the guest's mobile phone number with property details, stay breakdown, and tax invoice download URL.

### 4. Commission-Free Direct Guest Booking Engine
- **Backend**:
  - Added `PublicBookingController` with `@Public()` endpoints `GET /public/hotels/:slug` and `POST /public/direct-booking`.
  - Full input validation via `directGuestBookingSchema` in `@erp/shared`.
- **Frontend Portal**:
  - Built mobile-responsive public booking portal at **`/book/[slug]`** (`/book/taj-hotels`, `/book/itc-hotels`, etc.).
  - Real-time room availability inspection, amenity chips, guest count selectors, and instant advance UPI QR deposit flow.
  - Automatically provisions guest profiles and allocates reservations directly into the Front Desk room rack.

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
