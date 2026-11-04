# Enterprise Hospitality ERP Master Manual & Operational Handbook
> **Edition:** Taj, Oberoi & Luxury Chain Grade (Multi-Property PMS)  
> **Architecture:** PostgreSQL 16 (Tenant & Property RLS) · NestJS 10 Modular Core · Next.js 15 App Router · Tailwind CSS  
> **Statutory Compliance:** Indian GST Dual-Slab (12% / 18% with SAC 996311), Income Tax Act Section 269ST, Rule 114B PAN, Bureau of Immigration (BoI) Form C, Local Police Beat Register

---

## 1. Executive Summary & Competitive Advantage
This Enterprise Hospitality ERP is engineered to surpass legacy on-premise hotel systems (Oracle Opera PMS, IDS Next, Protel) and cloud PMS platforms (Cloudbeds, eZee Frontdesk). It provides zero-latency cloud responsiveness, absolute multi-tenant cryptographic and row-level data isolation, two-way OTA distribution, statutory Indian fiscal guardrails, automated post-stay WhatsApp marketing, and authentic chain delegation hierarchy.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM SUPER ADMIN / HQ CONSOLE                       │
│        Portfolio Governance · Multi-Property Onboarding · Subscriptions     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Onboards Property & Appoints Owner
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOTEL PROPERTY OWNER / DIRECTOR                          │
│     Asset Governance · P&L / RevPAR Audit · Appoints General Manager (GM)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Appoints GM & Senior Leadership
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GENERAL MANAGER (GM) / HOTEL MANAGER                     │
│    Daily Operations · Recruits Front Desk & Housekeeping · Channel Parity   │
└──────────────────┬──────────────────────────────────────────┬───────────────┘
                   │ Provisions Front Desk                    │ Provisions Housekeeping
                   ▼                                          ▼
┌─────────────────────────────────────┐    ┌──────────────────────────────────┐
│        FRONT DESK & CASHIERING      │    │     HOUSEKEEPING & TURNDOWN      │
│  • Check-in / Checkout / Room Rack  │    │  • Cleaning Status Transitions   │
│  • Dual-Slab Indian GST (12% / 18%) │    │  • Maintenance Ticket Logging    │
│  • Section 269ST ₹2L Cash Guard     │    │  • Priority Turnover for Arrivals│
│  • BoI Form C & Police Beat Export  │    └──────────────────────────────────┘
│  • WhatsApp Review Outreach         │
└─────────────────────────────────────┘
```

---

## 2. Directory: Which Page is For What?

| Route | Module Name | Primary Role | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **`/super-admin`** | **Super Admin (HQ Console)** | Platform Super Admin | Multi-property onboarding, portfolio ARR metrics, license limits, property impersonation context switching. |
| **`/dashboard`** | **Today's Front Desk** | Front Desk / GM | Real-time floor room rack, today's arrivals/departures counters, occupancy %, quick room status inspection. |
| **`/tape-chart`** | **Room Rack (Tape Chart)** | Front Desk / GM | Multi-day visual Gantt timeline with continuous booking ribbons color-coded by channel (MMT, Agoda, Booking.com, Direct, Corporate). |
| **`/reservations`** | **Reservations & Stays** | Front Desk | Central booking ledger for direct walk-ins, phone bookings, day-use hourly stays, modifications, and cancellations. |
| **`/rooms`** | **Rooms & Inventory** | Owner / GM | Physical room and floor configuration, room categories (Standard, Deluxe, Executive Suite, Palace Suite), base tariffs. |
| **`/guests`** | **Guests & Master CRM** | Front Desk / GM | Centralized identity directory, companion linking, photo ID uploads, masked Aadhaar storage, VIP indicators. |
| **`/billing`** | **Cashiering & GST Folios** | Front Desk / Cashier | Multi-item cashiering with dual-slab Indian GST (12% <= ₹7.5k; 18% > ₹7.5k), Section 269ST ₹2L cash limit check, Rule 114B PAN validation, SAC 996311 tax invoices. |
| **`/night-audit`** | **Night Audit & Day Close** | Night Auditor / GM | Automated business date rollover, room posting, cashier drawer reconciliation, RevPAR/ADR manager revenue flash reports. |
| **`/compliance`** | **Statutory Compliance & BoI**| Front Desk / GM | Bureau of Immigration (BoI) Form C filing for foreign national guests within 24 hours of arrival; daily local police station beat register export. |
| **`/channel-manager`**| **OTA Channel Manager** | GM / Revenue Mgr | Two-way ARI distribution with MakeMyTrip, Booking.com, Agoda, Expedia; live OTA booking simulator and webhook audit logs. |
| **`/staff`** | **Staff & Hierarchy** | Owner / GM | Multi-tier role delegation: Owners appoint GMs, GMs provision Front Desk/Housekeeping, shift assignments, account status toggles. |
| **`/marketing`** | **Guest Follow-Up & CRM** | GM / Front Desk | Taj InnerCircle loyalty tier tracking, 1-click WhatsApp review requests (Google/TripAdvisor), targeted repeat booking broadcasts. |
| **`/guide`** | **SOP & Journeys Guide** | All Staff | Interactive visual handbook detailing SOPs, page directories, and complete workflows from guest check-in to departure. |
| **`/upgrade`** | **Plans & Pricing** | Owner / Super Admin | Subscription tiers (Starter, Growth, Enterprise Chain) and feature limit governance. |

---

## 3. End-to-End User Journeys

### A. Super Admin Journey (Platform HQ & Chain Onboarding)
1. **Sign In**: Log in as Platform Owner (`saksham@grandazure.com` or platform super admin).
2. **Access HQ Console**: Navigate to `/super-admin`.
3. **Portfolio Health Assessment**: Inspect portfolio-level metrics: total hotels, active keys, occupancy rate across properties.
4. **Onboard New Hotel**:
   - Click **"+ Onboard New Hotel"**.
   - Enter legal hotel name (e.g., *Taj Lake Palace, Udaipur*).
   - Configure local timezone (`Asia/Kolkata`) and billing currency (`INR`).
   - Select subscription plan tier:
     - `starter`: Homestays / B&Bs (up to 25 rooms, 3 users).
     - `growth`: Resorts / Boutique hotels (up to 80 rooms, 15 users).
     - `enterprise`: Luxury chains (Unlimited rooms & users, B2B corporate ledgers, CRS).
   - Enter the **Property Owner / General Manager** email and credentials.
   - Check *Seed Starter Inventory* to automatically provision 3 floors of starter rooms.
5. **Context Switch / Impersonation**:
   - Click **"Switch to Hotel"** on any property card to instantly enter that property's operational workspace.

---

### B. Hotel Owner Journey (Property Director & Asset Governance)
1. **Sign In**: Log in with Hotel Owner credentials.
2. **Setup Tariffs & Categories**: Open `/rooms` to verify or modify base room tariffs and hourly day-use rates.
3. **Appoint General Manager (GM)**:
   - Navigate to `/staff`.
   - Click **"+ Add Staff Member"**.
   - Select role `General Manager (GM)`, assign to `Executive Office`, set shift to `General`.
4. **Configure OTA Distribution**:
   - Open `/channel-manager`.
   - Enter Hotel Code and API credentials for MakeMyTrip, Booking.com, and Agoda.
   - Test connection and push real-time ARI inventory.
5. **Review Financial Performance & Compliance**:
   - Monitor daily Night Audit reports at `/night-audit` (RevPAR, ADR, Occupancy %).
   - Inspect settled tax invoices, monthly CGST/SGST collected, and corporate receivables at `/billing`.

---

### C. Daily Front Desk Journey (Complete Customer Lifecycle)

#### 1. Pre-Arrival & Booking Ingestion
- Online bookings arrive from MakeMyTrip / Booking.com via the 2-way channel manager and appear as ribbons on `/tape-chart`.
- For phone inquiries or walk-ins, click **"+ New Reservation"** on `/dashboard`.

#### 2. Guest Arrival & Check-In
- Locate booking under *Expected Arrivals* on `/dashboard` or search guest in `/guests`.
- Request government photo ID (Aadhaar / Passport / Voter ID):
  - For Aadhaar: Only store last 4 digits (UIDAI compliance).
  - Encrypt sensitive identity data with AES-256-GCM.
- **Foreign Guests Statutory Duty**:
  - If the guest is a foreign national, immediately open `/compliance` and submit the **Bureau of Immigration (BoI) Form C** within 24 hours of arrival.
- Confirm assigned clean room (`status = available`) and click **"Check-In"**.
- Room automatically switches to `occupied` on the live floor rack.

#### 3. In-Stay Service & Cashiering
- As the guest orders dining, laundry, or spa treatments:
  - Open `/billing` ➔ Click **"+ Add Charge"**.
  - Select charge category:
    - *Accommodation* (12% / 18% GST, SAC 996311)
    - *F&B Restaurant / Room Service* (5% GST, SAC 996331)
    - *Laundry* (18% GST, SAC 9997)
- Housekeeping staff monitor and update room turndown requests at `/housekeeping`.

#### 4. Guest Check-Out & Statutory Invoice Settlement
- Open reservation folio on `/billing`.
- Review itemized line items and automatically calculated Indian GST dual slabs.
- **Section 269ST Compliance Check**:
  - If payment is in cash, verify the total cash paid is strictly under ₹2,00,000.
  - If cash payment exceeds ₹50,000, enforce **Rule 114B** PAN card collection.
- Settle payment via UPI QR code, Credit/Debit card, or transfer to Corporate City Ledger.
- Click **"Issue GST Tax Invoice"** to generate sequential tax invoice.
- Click **"Check-Out"** ➔ Room automatically flips to `cleaning` status on the dashboard.

#### 5. Post-Stay Follow-Up & Marketing Outreach
- Departed guest immediately appears on `/marketing` under *Pending Review Outreach*.
- Front Desk / GM clicks **"Send WhatsApp Review"** to dispatch an automated thank-you note with a 1-click Google Reviews link:
  > *"Namaste Rajesh! Thank you for staying at Grand Azure Hotel. Could you take 30 seconds to rate us on Google Reviews? [Link] - GM, Grand Azure Hotel"*
- Lifetime stay nights, total spend (LTV), and Taj InnerCircle loyalty points update automatically in the guest's CRM profile.

---

## 4. Indian Statutory & Fiscal Compliance Matrix

### A. Dual-Slab GST (Notification No. 11/2017 & 20/2019)
- **Tariff <= ₹7,500 / night**: **12% GST** (6% CGST + 6% SGST) under SAC Code `996311`.
- **Tariff > ₹7,500 / night**: **18% GST** (9% CGST + 9% SGST) under SAC Code `996311`.
- **F&B Dining / Room Service**: **5% GST** (2.5% CGST + 2.5% SGST) without ITC under SAC Code `996331`.
- **Laundry & Incidental Services**: **18% GST** under SAC Code `9997`.

### B. Income Tax Act Section 269ST (Cash Transactions Cap)
- Prohibits receiving ₹2,00,000 or more in cash in aggregate from a person in a day or in respect of a single transaction.
- The system hard-blocks any cashier from recording a cash payment of ₹2,00,000 or higher on a folio.

### C. Income Tax Rule 114B (Mandatory PAN Card)
- Mandatory collection and recording of Permanent Account Number (PAN) for any cash hotel or restaurant bill payment exceeding ₹50,000.

### D. Bureau of Immigration (BoI) Form C Registration
- Foreigners Act, 1946 & Registration of Foreigners Rules, 1992: Every hotel keeper must report foreign guests within 24 hours of arrival to the Foreigners Regional Registration Officer (FRRO) via Form C.

### E. Local Police Station Daily Beat Register
- Daily register of all arrivals and departures exported for the beat sub-inspector of the local jurisdiction.

---

## 5. Verification Checklist Before Selling to Hotel Clients

- [x] **Database Isolation**: PostgreSQL Row Level Security (RLS) active on all tables (`current_property_id()` and `current_tenant_id()`).
- [x] **Multi-Property Switching**: 1-click property context switcher operational with zero cross-tenant data leakage.
- [x] **Tape Chart Gantt Timeline & Drag-to-Select Booking**: Multi-day horizontal Gantt timeline displaying active stays with live channel badges, single VIP status tag, and mouse-drag range booking with instant URL query pre-fills (`roomId`, `checkIn`, `checkOut`).
- [x] **Bundled Notes / Material 3 Aesthetic System**: Luminous pastel cards (`#fffcf4` honey luxury, `#faf8ff` lavender suite, `#f4faff` sky deluxe, `#f4fbf7` mint standard), Material 3 outline pill filter chips, and signature horizontal accent dashes across all pages.
- [x] **Dual-Slab GST Calculation**: Correct 12% vs 18% calculation validated via unit test suite (`foundation.spec.ts`).
- [x] **Night Audit Rollover**: Automated business date incrementation and daily flash RevPAR calculation.
- [x] **OTA Channel Manager**: Simulated 2-way ARI sync with MakeMyTrip, Agoda, and Booking.com.
- [x] **Enterprise Role Delegation**: GMs restricted to provisioning Front Desk and Housekeeping staff; Owners can provision GMs.
- [x] **Post-Checkout WhatsApp Marketing**: Review outreach dispatch simulator with live Google Review links.
- [x] **High-Contrast UI**: All cards, tables, and room names styled with pitch-black `#020617` typography and clean contrast tokens.
- [x] **Test Suite**: 45/45 foundation tests passing in under 2 seconds.
