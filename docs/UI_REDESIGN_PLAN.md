# Hotel ERP UI & Design System Specifications

This document outlines the design language, layout standards, and verified route inventory of the Enterprise Hospitality ERP.

---

## 1. Design Language & Visual System (Material 3 / Bundled Notes)

The interface follows a clean, warm-neutral **Material 3 / Bundled Notes** aesthetic:
- **Surface Geometry**: Softly rounded cards (`rounded-3xl` for major cards, `rounded-2xl` for sub-sections, `rounded-xl` for interactive controls).
- **Color Architecture**:
  - Background: Soft warm stone canvas (`#f8fafc` / `bg-ground`).
  - Dark Navigation Sidebar: Deep midnight navy (`#080d1a`) with subtle white borders (`border-white/[.08]`).
  - Room Categories: Soft pastel pill themes (Presidential Palace Suite, Executive Suite, Deluxe Room, Standard Room).
- **Outline Filter Chips**: Horizontal scrollable outline chips with active state fills and counter pills.
- **Accents**: Signature horizontal accent dashes and single VIP badge indicators.
- **Micro-Interactions**: Drag-to-select stay range booking on the Tape Chart, timeless Aura PMS luxury login with password reveal, dynamic UPI QR countdown timer, live POS terminal card swipe/tap prompt, floating confirmation toasts.

---

## 2. Complete Verified Route Inventory

| Route | Primary Audience | Operational Scope |
| :--- | :--- | :--- |
| **`/login`** | All Users | Timeless luxury Aura PMS portal. Clean property organization code, work email, and password authentication with eye reveal, fresh onboarding link, and discreet showcase link. |
| **`/onboard`** | Prospective Hoteliers | Public 4-step clean-slate registration wizard with 0 dummy bookings, instant slug generation, and choice between blank slate (0 rooms) and starter inventory. |
| **`/showcase`** | Sales & Demonstrations | Presentation matrix showcasing 8 client portfolios with 1-click credential cards and sales pitch highlights. |
| **`/dashboard`** | Front Desk / GM | Real-time floor room rack, today's arrivals/departures counters, occupancy %, quick check-in actions. |
| **`/tape-chart`** | Front Desk / GM | Multi-day visual Gantt timeline with interactive drag-to-select booking, OTA channel ribbons, and 1-click jump to guest folios. |
| **`/reservations`** | Front Desk | Complete booking ledger for direct reservations, walk-ins, hourly day-use stays, modifications, and cancellations. |
| **`/rooms`** | Owner / GM | Physical room and floor configuration, room categories, base tariffs, and hourly rates. |
| **`/guests`** | Front Desk / GM | Centralized identity directory, companion linking, photo ID uploads, masked Aadhaar storage, VIP indicators. |
| **`/billing`** | Front Desk / Cashier / Owner | Multi-item cashiering with dual-slab Indian GST (12% / 18%), hardware POS machine integration (`PosMachineCard`), authentic thermal slip viewer (`PosSlipModal`), terminal fleet manager (`PosTerminalsModal`), Dynamic NPCI Scan-to-Pay QR generator (`UpiQrCard`), Owner-exclusive receiver UPI settings modal (`UpiSettingsModal`), WhatsApp invoice dispatch button, Section 269ST ₹2L cash limit check, Rule 114B PAN validation, SAC 996311 tax invoices. |
| **`/restaurant`** | F&B Captain / Cashier / GM | Petpooja-grade touch dining POS. Floor plan table management, digital menu master with Veg/Non-Veg indicators, kitchen order tickets (KOT) with 80mm ESC/POS thermal printing, Kitchen Display System (KDS), direct settlement (Cash/UPI/Card), and 1-click "Charge to Room Folio" under SAC 996331 at 5% GST. |
| **`/keycards`** | Front Desk / Housekeeping | Dual-mode enterprise key rack. Traditional brass key tag pigeonhole rack (In Slot, With Guest, With Housekeeping, Lost), W3C Web Serial RFID MIFARE 1K card encoder bridge for electronic door locks, and contactless digital QR mobile guest pass. |
| **`/book/[slug]`** | Public Direct Guests | Public mobile-first direct booking engine with room category cards, real-time availability, guest details intake, and advance UPI QR settlement. |
| **`/night-audit`** | Night Auditor / GM | Automated business date rollover, room posting, cashier drawer reconciliation, RevPAR/ADR manager revenue flash reports. |
| **`/compliance`** | Front Desk / GM | Bureau of Immigration (BoI) Form C filing for foreign national guests within 24 hours of arrival; daily local police station beat register export. |
| **`/channel-manager`** | GM / Revenue Mgr | Two-way ARI distribution with MakeMyTrip, Booking.com, Agoda, Expedia; live OTA booking simulator and webhook audit logs. |
| **`/staff`** | Owner / GM | Multi-tier role delegation: Owners appoint GMs, GMs provision Front Desk/Housekeeping, shift assignments, account status toggles. |
| **`/marketing`** | GM / Front Desk | Taj InnerCircle loyalty tier tracking, 1-click WhatsApp review requests (Google/TripAdvisor), targeted repeat booking broadcasts. |
| **`/housekeeping`** | Housekeeping Staff | Room cleaning turnover board: transitions rooms through `Cleaning`, `Inspected`, and `Available` states. |
| **`/income`** | 👑 Property Owner Only | Confidential P&L analytics across 8 flexible intervals (Daily, 7d, 30d, Quarterly, 6M, 1Y, FY, Custom Range) with interactive SVG graphs and USALI room vs F&B split. |
| **`/super-admin`** | 👑 Property Owner Only | Centralized multi-hotel switcher for owners with 2+ properties (e.g. Taj Mumbai & Taj Ganges, or Heritage Haveli & Lakeview). |
| **`/platform-admin`** | ⚡ SaaS Platform Founder Only | Confidential SaaS command center. Monitors platform MRR, ARR, lifetime software income, client hotel directory, plan switcher, and churn retention ledger. |
| **`/guide`** | All Staff (Role-Aware) | Interactive handbook displaying operating procedures and permission matrices tailored to the user's active access level. |
| **`/upgrade`** | Owner / Super Admin | Subscription tiers (Starter, Growth, Enterprise Chain) and feature limit governance. |
