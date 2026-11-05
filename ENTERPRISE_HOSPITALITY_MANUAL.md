# Enterprise Hospitality ERP Master Manual & Operational Handbook
> **Edition:** 5-Star Luxury Palace Grade (Multi-Property PMS & Multi-Tenant SaaS Cloud)  
> **Architecture:** PostgreSQL 16 (Tenant & Property RLS) · NestJS 10 Modular Core · Next.js 15 App Router · Tailwind CSS  
> **Statutory Compliance:** Indian GST Dual-Slab (12% / 18% with SAC 996311), Income Tax Act Section 269ST (₹2L Cash Guard), Rule 114B PAN, Bureau of Immigration (BoI) Form C, Local Police Beat Register

---

## 1. Executive Summary & Organizational Architecture

This Enterprise Hospitality ERP is engineered to surpass legacy on-premise hotel systems (Oracle Opera PMS, IDS Next, Protel) and cloud platforms (Cloudbeds, eZee Frontdesk). It provides zero-latency cloud responsiveness, absolute multi-tenant cryptographic and row-level data isolation, two-way OTA distribution, statutory Indian fiscal guardrails, automated post-stay WhatsApp marketing, and authentic chain delegation hierarchy.

### Multi-Tier Role & Authority Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ⚡ SAAS PLATFORM FOUNDER & CLOUD HQ                      │
│        Software Recurring Revenue (MRR/ARR) · Client Directory · Churn      │
│        Tenant Provisioning · Subscription Invoicing (/platform-admin)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Onboards Client Organization (Tenant)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    👑 HOTEL PROPERTY OWNER / DIRECTOR                       │
│     Asset Governance · Confidential Hotel P&L / RevPAR Audit (/income)      │
│     Multi-Hotel Cluster Switcher (/super-admin) · Appoints GM (/staff)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Appoints GM & Senior Leadership
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    👔 GENERAL MANAGER (GM) / OPERATIONS LEAD                │
│    Daily Operations (/dashboard) · Staff Shifts & Hierarchy (/staff)        │
│    Two-Way OTA Channel Manager (/channel-manager) · Night Audit Supervision │
└──────────────────┬──────────────────────────────────────────┬───────────────┘
                   │ Provisions Front Desk                    │ Provisions Housekeeping
                   ▼                                          ▼
┌─────────────────────────────────────┐    ┌──────────────────────────────────┐
│     🛎️ FRONT DESK & CASHIERING      │    │  🧹 HOUSEKEEPING & TURNDOWN      │
│  • Interactive Tape Chart Booking   │    │  • Cleaning Status Transitions   │
│  • Check-in / Checkout / Room Rack  │    │  • Available ➔ Occupied ➔ Cleaning│
│  • Dual-Slab Indian GST (12% / 18%) │    │  • Inspected ➔ Ready State       │
│  • Section 269ST ₹2L Cash Guard     │    │  • Maintenance Ticket Logging    │
│  • BoI Form C & Police Beat Export  │    │  • Priority Turnover for Arrivals│
│  • WhatsApp Review Outreach         │    └──────────────────────────────────┘
└─────────────────────────────────────┘
```

---

## 2. Directory: Which Page is For What?

| Route | Module Name | Primary Role | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **`/platform-admin`** | **SaaS Founder HQ (MRR)** | ⚡ SaaS Platform Founder Only | Confidential SaaS command center. Monitors platform MRR, ARR, lifetime software income, client hotel directory, plan switcher, and churn retention ledger. |
| **`/showcase`** | **Customer Showcase Matrix** | Public / Sales Demo | Presentation matrix featuring 8 distinct client portfolios (Taj Palace, ITC Luxury, Sayaji, Radisson, Local Boutique, Sandbox, Founder HQ). |
| **`/onboard`** | **Fresh-Start Self-Service** | Public / New Hoteliers | 4-step clean-slate hotel registration wizard with zero dummy data guarantee, instant slug generation, and choice of blank slate (0 rooms) or starter inventory. |
| **`/income`** | **Owner Income & Revenue** | 👑 Property Owner Only | Confidential executive P&L intelligence. Analyzes hotel revenue across 8 intervals (Daily, 7d, 30d, Quarterly, 6M, 1Y, FY, Custom Range) with interactive SVG graphs and USALI room vs F&B split. |
| **`/super-admin`** | **Multi-Hotel Console** | 👑 Property Owner Only | Centralized multi-hotel switcher for owners with 2+ properties (e.g. Taj Mumbai & Taj Ganges, or Heritage Haveli & Lakeview). |
| **`/dashboard`** | **Today's Front Desk** | Front Desk / GM | Real-time floor room rack, today's arrivals/departures counters, occupancy %, quick room status inspection. |
| **`/tape-chart`** | **Room Rack (Tape Chart)** | Front Desk / GM | Multi-day visual Gantt timeline with **interactive drag-to-select stay range booking**, pastel room category headers, and color-coded OTA channel ribbons. |
| **`/reservations`** | **Reservations & Stays** | Front Desk | Central booking ledger for direct walk-ins, phone bookings, day-use hourly stays, modifications, and cancellations. |
| **`/rooms`** | **Rooms & Inventory** | Owner / GM | Physical room and floor configuration, room categories (Deluxe, Executive Suite, Palace Suite), base tariffs, and hourly rates. |
| **`/guests`** | **Guests Master & CRM** | Front Desk / GM | Centralized identity directory, companion linking, photo ID uploads, masked Aadhaar (UIDAI last-4 digits rule), VIP indicators. |
| **`/billing`** | **Cashiering & GST Folios** | Front Desk / Cashier | Multi-item cashiering with dual-slab Indian GST (12% &le; ₹7.5k; 18% &gt; ₹7.5k), Section 269ST ₹2L cash limit check, Rule 114B PAN validation, SAC 996311 tax invoices. |
| **`/night-audit`** | **Night Audit & Day Close** | Night Auditor / GM | Automated business date rollover, room posting, cashier drawer reconciliation, RevPAR/ADR manager revenue flash reports. |
| **`/compliance`** | **Statutory Compliance & BoI**| Front Desk / GM | Bureau of Immigration (BoI) Form C filing for foreign national guests within 24 hours of arrival; daily local police station beat register export. |
| **`/channel-manager`**| **OTA Channel Manager** | GM / Revenue Mgr | Two-way ARI distribution with MakeMyTrip, Booking.com, Agoda, Expedia; live OTA booking simulator and webhook audit logs. |
| **`/staff`** | **Staff & Hierarchy** | Owner / GM | Multi-tier role delegation: Owners appoint GMs, GMs provision Front Desk/Housekeeping, shift assignments, account status toggles. |
| **`/marketing`** | **Guest Follow-Up & CRM** | GM / Front Desk | Taj InnerCircle loyalty tier tracking, 1-click WhatsApp review requests (Google/TripAdvisor), targeted repeat booking broadcasts. |
| **`/housekeeping`**| **Housekeeping Board** | Housekeeping Staff | Room cleaning turnover board: transitions rooms through `Cleaning`, `Inspected`, and `Available` states. |
| **`/guide`** | **SOP & Master Handbook** | All Staff (Role-Aware) | Interactive handbook displaying operating procedures and permission matrices tailored to the user's active access level. |
| **`/upgrade`** | **Plans & Subscription** | Owner / Super Admin | Subscription tiers (Starter, Growth, Enterprise Chain) and feature limit governance. |

---

## 3. End-to-End Operational User Journeys

### A. ⚡ SaaS Platform Founder Journey (Software Business & MRR)
1. **Sign In**: Log into `platform-hq` as `founder@antigravity-erp.com`.
2. **Access Command Center**: Navigate to `/platform-admin`.
3. **Monitor Recurring Revenue**:
   - Inspect **Monthly Recurring Revenue (MRR)** generated by all active client hotels (e.g. ₹83,990/mo).
   - Review projected **Annual Run-Rate (ARR)** and cumulative **Lifetime Platform Revenue**.
   - Track monthly subscription growth via the 12-month visual timeline chart.
4. **Manage Client Subscriptions**:
   - Locate any client hotel in the searchable directory.
   - Upgrade/downgrade client tiers (Starter ₹1,999, Growth ₹5,999, Enterprise ₹19,999).
   - Suspend delinquent accounts or reactivate canceled accounts.
5. **Analyze Churn Retention**:
   - Review hotels that left the platform, their exit reasons (e.g. *Seasonal monsoon closure & lease expired*), and their historical lifetime value (LTV).
6. **Onboard Prospective Clients**:
   - Guide prospective hotel owners to `/onboard` for clean-slate self-service registration.

---

### B. 👑 Hotel Owner Journey (Asset Governance & Profitability)
1. **Sign In**: Log into your hotel account (e.g. `director@tajhotels.com`).
2. **Review Hotel Income & Yield Analytics**:
   - Open `/income` (strictly confidential to Property Owners).
   - Toggle between **Daily, 7-Day, 30-Day, Quarterly, 6-Month, 1-Year, FY, and Custom Date Range**.
   - Review USALI room revenue vs F&B dining vs Ancillary charges.
   - Audit operational metrics: **ADR**, **RevPAR**, and Occupancy %.
   - Click **"Print Board Pack"** to generate an executive P&L statement.
3. **Multi-Hotel Cluster Switching**:
   - If managing multiple properties (e.g. Taj Mumbai and Taj Ganges, or Heritage Haveli and Lakeview Resort), open `/super-admin`.
   - Click **"Switch to Hotel"** on any property card to instantly enter that property's operational workspace.
4. **Appoint Leadership & Delegate Staff**:
   - Open `/staff` ➔ Click **"+ Add Staff Member"**.
   - Appoint your **General Manager (GM)** who directs daily front office and housekeeping operations.
5. **Configure Tariffs & Subscription**:
   - Set base room tariffs and hourly rates on `/rooms`.
   - Manage your software subscription tier on `/upgrade`.

---

### C. 👔 General Manager (GM) Journey (Daily Hotel Operations)
1. **Morning Operational Briefing (08:00 hrs)**:
   - Open `/dashboard` to inspect today's expected arrivals, departures, and current occupancy %.
   - Coordinate with the Executive Housekeeper on `/housekeeping` to prioritize turnover of dirty rooms.
2. **Room Rack Gap Optimization**:
   - Open `/tape-chart` to review multi-day booking allocations.
   - Identify unallocated gaps and adjust dynamic rates to maximize occupancy.
3. **OTA Channel Parity**:
   - Open `/channel-manager` to ensure two-way ARI synchronization with MakeMyTrip, Agoda, and Booking.com.
   - Push updated rates and verify webhook audit logs.
4. **Staff Shift Governance**:
   - Open `/staff` to assign front desk and housekeeping teams to Morning, Evening, and Night shifts.
5. **Night Audit Close-Out (23:59 hrs)**:
   - Supervise the 1-click Night Audit rollover on `/night-audit`.
   - Reconcile room rate postings, cash drawer balances, and review the Daily Manager Flash Report.

---

### D. 🛎️ Front Desk & Cashiering Journey (Complete Guest Lifecycle)

#### 1. Interactive Drag-to-Select Booking
- Navigate to `/tape-chart`.
- Click and drag across vacant dates on any room row (e.g. *Room 201 · Nov 6 → Nov 9 · 3 Nights*).
- Inspect the floating booking summary pill and click **"Book Selected Dates"** to launch the reservation form with room and dates pre-filled.

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
  - Charges are posted immediately to the guest's consolidated room folio.

#### 4. Departure & Dual-Slab Indian GST Invoicing
- Open the reservation folio on `/billing`.
- System automatically applies Indian GST:
  - **12% GST** if room tariff &le; ₹7,500/night.
  - **18% GST** if room tariff &gt; ₹7,500/night.
  - SAC Code: `996311` (Hotel Accommodation).
- **Statutory Cash Guards**:
  - **Section 269ST**: Automatically blocks cash payments &ge; ₹2,00,000 per guest per stay.
  - **Rule 114B**: Requires mandatory PAN recording for cash payments &gt; ₹50,000.
- Collect payment via UPI, Credit/Debit Card, or B2B Corporate Ledger.
- Click **"Issue GST Tax Invoice"** and mark **"Check-Out"**.
- Room status automatically transitions to `Cleaning`, notifying housekeeping.

#### 5. Post-Stay Marketing Review Outreach
- Open `/marketing` under *Pending Review Outreach*.
- Click **"Send WhatsApp"** to dispatch a personalized thank-you message with a direct Google Reviews link.
- Update Taj InnerCircle loyalty tier points and record guest room preferences.

---

### E. 🧹 Housekeeping & Turndown Journey (Room State Machine)
1. **Turnover Board Inspection**:
   - Open `/housekeeping` at the beginning of each shift.
   - Filter by floor to inspect rooms marked `Cleaning`.
2. **State Machine Execution**:
   - `Occupied` ➔ Upon checkout, room automatically flips to `Cleaning`.
   - `Cleaning` ➔ Floor attendant sanitizes the room, changes linen, replenishes amenities, and marks room as `Inspected`.
   - `Inspected` ➔ Supervisor reviews and marks room as `Available (Ready)`.
   - `Available` ➔ Room is immediately sellable on Front Desk Tape Chart and OTA channels.
3. **Maintenance Protocols**:
   - If maintenance is required (plumbing, HVAC, electrical), mark room as `Maintenance`.
   - Room is instantly blocked from all booking channels to prevent guest check-in.

---

## 4. Statutory Compliance Specifications

### Indian Goods & Services Tax (GST)
- **Accommodation SAC**: `996311`
- **Dual-Slab Threshold**:
  - Tariff &le; ₹7,500/night ➔ 12% GST (6% CGST + 6% SGST, or 12% IGST for interstate).
  - Tariff &gt; ₹7,500/night ➔ 18% GST (9% CGST + 9% SGST, or 18% IGST for interstate).
- **Restaurant & F&B SAC**: `996331` (5% GST without Input Tax Credit).
- **Sequential Invoicing**: Financial year scoped serial numbers (e.g. `INV-2026-0001`).

### Income Tax Act Guardrails
- **Section 269ST**: Strict prohibition on accepting cash of ₹2,00,000 or more in aggregate from a person in a day or in respect of a single transaction. The ERP enforces this programmatically in cashiering.
- **Rule 114B**: Mandatory collection and validation of Permanent Account Number (PAN) for any cash payment exceeding ₹50,000.

### Bureau of Immigration (BoI) Form C
- Mandatory under the Foreigners Act for every foreign national guest.
- Form C capture includes: Passport Number, Nationality, Visa Type, Expiry Date, City of Arrival, Next Destination, and Indian Contact Phone.
- Must be filed within 24 hours of check-in.
