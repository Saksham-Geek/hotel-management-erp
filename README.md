# Grand Azure Enterprise Hotel ERP (Multi-Property PMS)

A modern, cloud-native hospitality Property Management System (PMS) engineered to exceed legacy hotel systems (Opera PMS, IDS Next) and match luxury chain standards (Taj / IHCL, Oberoi, Marriott).

Built on **Next.js 15 App Router**, **NestJS 10**, and **PostgreSQL 16** with cryptographic Row-Level Security (RLS) tenant isolation.

---

## 🌟 Core Modules & Operational Features

1. **Super Admin HQ Console (`/super-admin`)**:
   - Multi-property chain portfolio overview with aggregate ARR and room metrics.
   - Onboard new hotel properties with custom timezone, currency, and subscription tier.
   - 1-click property context switching / impersonation.

2. **Room Rack & Tape Chart (`/tape-chart` & `/dashboard`)**:
   - Multi-day horizontal Gantt chart timeline with continuous booking ribbons and single VIP status indicator.
   - **Interactive Drag-to-Select Booking**: Click and drag across empty dates on any room row to visually select a stay range (`Nov 5 → Nov 8 · 3 nights`) and jump directly to the reservation form with room and dates pre-filled.
   - **Bundled Notes / Material 3 Design System**: Pastel room category themes (Presidential Palace Suite, Executive Suite, Deluxe Room, Standard Room), Material 3 outline filter chips, and signature horizontal accent dashes.
   - Real-time OTA channel badges: Walk-In, MakeMyTrip, Booking.com, Agoda, Corporate.
   - Floor-by-floor room status board (Available, Occupied, Cleaning, Maintenance).

3. **Cashiering & Indian GST Billing (`/billing`)**:
   - Dual-slab Indian GST calculation (12% for tariff <= ₹7,500; 18% for tariff > ₹7,500) under SAC Code `996311`.
   - Hard enforcement of **Income Tax Act Section 269ST** (₹2,00,000 cash cap guard) and **Rule 114B** PAN validation for cash > ₹50,000.
   - Multi-folio itemization (Accommodation, F&B, Laundry, Spa) and sequential tax invoices.

4. **Automated Night Audit (`/night-audit`)**:
   - Midnight business date rollover and daily room rate posting.
   - Daily Manager Revenue Report with live **ADR**, **RevPAR**, and occupancy percentages.

5. **Statutory Compliance & BoI Form C (`/compliance`)**:
   - Mandatory **Bureau of Immigration (BoI) Form C** filing for foreign guests within 24 hours.
   - Daily local police station beat register export.

6. **2-Way OTA Channel Manager (`/channel-manager`)**:
   - Live ARI (Availability, Rates & Inventory) distribution with MakeMyTrip, Booking.com, Agoda, Expedia.
   - Inbound webhook simulation and audit logs.

7. **Staff & Enterprise Hierarchy Delegation (`/staff`)**:
   - Multi-tier role governance: Super Admin ➔ Property Owner ➔ General Manager ➔ Front Desk / Housekeeping.
   - General Managers are strictly restricted to provisioning Front Desk and Housekeeping staff.
   - Shift assignments (Morning, Evening, Night Audit, General).

8. **Guest Follow-Up & Marketing Engine (`/marketing`)**:
   - Taj InnerCircle style VIP loyalty tiers (Kohinoor, Platinum, Gold, Silver).
   - Automated 1-click post-checkout WhatsApp Google Review outreach.
   - Targeted marketing campaign broadcast simulator with revenue conversion tracking.

9. **SOP & Master User Journeys (`/guide`)**:
   - Interactive visual handbook detailing "Which Page is For What" and step-by-step journeys for Super Admins, Hotel Owners, and Front Desk agents.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker (for PostgreSQL container)

### Setup & Run

```bash
# 1. Start the PostgreSQL database
docker compose up -d postgres

# 2. Run database migrations (creates tables, RLS policies, plan catalog)
pnpm --filter @erp/api migrate

# 3. Seed comprehensive luxury hospitality variations & test data
pnpm --filter @erp/api seed:variations

# 4. Start Development Servers (API on :4000, Web UI on :3000)
pnpm dev
```

### Demo Logins (Hotel: `grand-azure`)

| Role | Email | Password | Primary Interface |
| :--- | :--- | :--- | :--- |
| **Super Admin / Chain Owner** | `saksham@grandazure.com` | `ChangeMe-123!` | `/super-admin` |
| **General Manager (GM)** | `manager@grandazure.com` | `HotelStaff123!` | `/dashboard`, `/staff` |
| **Front Desk Supervisor** | `frontdesk@grandazure.com` | `HotelStaff123!` | `/tape-chart`, `/billing` |
| **Housekeeping Attendant** | `housekeeping@grandazure.com` | `HotelStaff123!` | `/housekeeping` |

---

## 📖 Complete Documentation
For an exhaustive, production-grade operational manual, read [ENTERPRISE_HOSPITALITY_MANUAL.md](./ENTERPRISE_HOSPITALITY_MANUAL.md).
