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
| **`/billing`** | **Cashiering & GST Folios** | Front Desk / Cashier / Owner | Multi-item cashiering with dual-slab Indian GST (12% &le; ₹7.5k; 18% &gt; ₹7.5k), physical EDC POS machine integration (Pine Labs Plutus, Paytm Smart POS, Innoviti uniPAY, Razorpay EzeTap, Ingenico Lane IP, USB Web Serial), dynamic NPCI Scan-to-Pay UPI QR codes with countdown timer, printable thermal card charge slips, 1-click WhatsApp tax invoice dispatch, Owner-exclusive receiver UPI ID bank configuration, Section 269ST ₹2L cash limit check, Rule 114B PAN validation, SAC 996311 tax invoices. |
| **`/book/[slug]`** | **Direct Guest Booking Engine**| Public Guests / Direct | Commission-free, mobile-first public booking portal. Bypasses 18-25% OTA fees, displays live inventory, collects guest particulars, issues instant advance UPI QR deposit requests, and books directly into Front Desk room rack. |
| **`/night-audit`** | **Night Audit & Day Close** | Night Auditor / GM | Automated business date rollover, room posting, cashier drawer reconciliation, RevPAR/ADR manager revenue flash reports. |
| **`/compliance`** | **Statutory Compliance & BoI**| Front Desk / GM | Bureau of Immigration (BoI) Form C filing for foreign national guests within 24 hours of arrival; daily local police station beat register export. |
| **`/channel-manager`**| **OTA Channel Manager** | GM / Revenue Mgr | Two-way ARI distribution with MakeMyTrip, Booking.com, Agoda, Expedia; live OTA booking simulator and webhook audit logs. |
| **`/restaurant`** | **F&B Restaurant POS & KOT** | F&B Captain / Cashier / GM | Aura Dine touch dining POS. Floor plan table management with sections, table shifting & merging, multi-round KOTs, digital menu master with Veg/Non-Veg indicators, 80mm ESC/POS thermal printing, Kitchen Display System (KDS), split billing (2-5 ways), phone CRM, direct settlement (Cash/UPI/Card), and 1-click "Charge to Room Folio" under SAC 996331 at 5% GST. |
| **`/keycards`** | **Key Management & Door Locks**| Front Desk / Housekeeping | Dual-mode enterprise key rack. Traditional brass key tag pigeonhole rack (In Slot, With Guest, With Housekeeping, Lost), W3C Web Serial RFID MIFARE 1K card encoder bridge for electronic door locks, and contactless digital QR mobile guest pass. |
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
6. **Configure Bank Settlement & Receiver UPI ID (Owner Exclusive)**:
   - Open `/billing` ➔ Click **"Configure Receiving Account"** on the verified UPI banner.
   - Enter your official hotel bank UPI ID (e.g. `tajhotels@icici`) and registered trade merchant name.
   - **Owner-Exclusive Security Constraint**: Only the authenticated **Owner** possesses `PROPERTY_BANKING_MANAGE` authority. General Managers, Front Desk Receptionists, and Housekeeping staff have strictly read-only visibility and receive a `403 Forbidden` response if attempting modification. This guarantees that operational staff can never alter where cashiering or direct booking settlements flow.

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
6. **Direct Booking Distribution & 0% Commission Yield**:
   - Deploy property's public direct booking URL (`/book/[slug]`) across Google My Business, guest communication channels, and print collateral.
   - Guests book directly with 0% OTA commissions, saving 18-25% in commissions.
   - Direct reservations instantly inject into the Front Desk Room Rack (`/tape-chart`), blocking double bookings automatically.
7. **Hardware POS EDC Fleet Management & Diagnostics**:
   - Open `/billing` ➔ Click **"Manage POS Terminals"** (available to GMs and Owners).
   - Review all configured EDC machines across billing desks: Front Desk Master, Executive Lounge, Banquets, and In-Room Wireless terminals.
   - Register new terminals with connection modes: **LAN / IP Network Socket** (e.g. `192.168.1.140:8080`), **Cloud Push Queue** (Pine Labs / Paytm / Razorpay EzeTap / Innoviti), or **USB Direct Cable**.
   - Click **"Test Connection"** to verify roundtrip ping latency, battery %, paper roll status, and acquirer handshake.
   - Assign terminals to specific billing counters to isolate cashier shifts.

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

#### 4. Departure, Dynamic UPI QR Settlement & Indian GST Invoicing
- Open the reservation folio on `/billing`.
- System automatically applies Indian GST:
  - **12% GST** if room tariff &le; ₹7,500/night.
  - **18% GST** if room tariff &gt; ₹7,500/night.
  - SAC Code: `996311` (Hotel Accommodation).
- **Dynamic NPCI Scan-to-Pay UPI Settlement**:
  - In the settlement dialog, select **UPI / QR Code**.
  - System generates a real-time, tamper-proof **NPCI-compliant UPI QR code** containing the hotel's verified VPA (`upi_id`), trade merchant name, exact rupee amount, transaction reference, and a 10-minute countdown security timer.
  - Guest scans with PhonePe, Google Pay, Paytm, CRED, or BHIM.
  - Front desk verifies transaction and records the 12-digit bank UTR reference number.
- **Statutory Cash Guards**:
  - **Section 269ST**: Automatically blocks cash payments &ge; ₹2,00,000 per guest per stay.
  - **Rule 114B**: Requires mandatory PAN recording for cash payments &gt; ₹50,000.
- Collect payment via UPI, Credit/Debit Card, Hardware POS Machine, or B2B Corporate Ledger.
- Click **"Issue GST Tax Invoice"** and mark **"Check-Out"**.
- Room status automatically transitions to `Cleaning`, notifying housekeeping.

#### 5. Physical POS Machine (EDC Terminal) Card Swipe/Tap Settlement
- In the folio settlement panel, select payment method **"POS Machine"**.
- Select the active counter terminal (e.g. *Pine Labs Plutus #1 · Front Desk Counter 1* or *Paytm Smart POS · Desk 2*).
- **Direct USB Serial Connection**: If the EDC machine is plugged via USB cable directly into the cashier PC, click **"Pair USB Serial Device"** to grant browser access via the standard Web Serial API (`navigator.serial`).
- Click **"Initiate Card Charge on Terminal"**:
  - The ERP automatically pushes the exact outstanding folio balance to the physical machine.
  - Live interactive modal guides the cashier and guest: *Awaiting Card Tap/Insert ➔ Reading EMV Chip ➔ Waiting for Guest 4-6 Digit PIN ➔ Acquirer Bank Handshake ➔ APPROVED*.
  - Terminal returns the authoritative 12-digit **Bank RRN**, 6-digit **Auth Code**, Card Scheme (Visa/Mastercard/RuPay/Amex), and Masked PAN (`XXXX-XXXX-XXXX-1289`).
  - The payment is committed to the folio with all tamper-proof card audit metadata.
- **Authentic Thermal Charge Slip**:
  - Click **"View POS Slip"** on any POS payment row to open the authentic 58mm/80mm thermal receipt viewer (`PosSlipModal`).
  - Supports 1-click browser printing for guest signature retention and merchant copy archival.

#### 6. Instant WhatsApp GST Tax Invoice & Folio Dispatch
- On any settled folio or issued invoice, click the **"WhatsApp Invoice"** button.
- The ERP launches a direct WhatsApp message to the guest's mobile number with property branding, folio breakdown, invoice number, and paperless tax invoice link.

#### 7. Post-Stay Marketing Review Outreach
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

### F. 🍽️ F&B Restaurant Captain & Kitchen Order Ticket (KOT) Journey
> **Aura Dine Engine**: Unified seamlessly into both **Hotel Integrated PMS** and **Standalone High-Street Restaurant Mode**.

#### 1. Dual-Operation Mode: Hotel Connected vs Standalone POS
- **Toggle at Top Right**:
  - **🏨 Hotel Integrated Mode**: Designed for hotel restaurants, poolside bars, and in-room dining. Directly queries checked-in guests, displays active room folios, and supports 1-click **"Charge to Room Folio"** under SAC `996331` at 5% GST.
  - **🍽️ Standalone POS Mode**: Designed for standalone bistros, cafes, and food courts with zero hotel dependency. Focuses on direct walk-in diners, mobile phone-based CRM profile lookup, Swiggy/Zomato pickup, and direct cashiering settlement.

#### 2. Table Floor Plan, Adding Tables, Sections, Shifts & Merges
- **Adding Tables to Floor Plan**:
  - On the **"Floor Plan Tables"** tab, click **"+ Add Table"**.
  - Specify the **Table Number / Identifier** (e.g., `T-01`, `T-02`, `Terrace-04`, `Bar-02`).
  - Set the **Covers / Seating Capacity** (e.g. 2, 4, 6, 8, 12).
  - Assign to a **Floor Zone / Section** (*Main AC Hall*, *Open Terrace*, *Poolside Deck*, *Bar & Lounge*, *Private Dining Room*, or custom zone).
  - Select the target **Dining Outlet** and click **"+ Create Table"**. The table instantly appears on the live interactive floor plan.
- **Editing & Deleting Tables**:
  - Vacant tables display quick-action controls: click **`✏️`** to modify table number, seating covers, or assigned zone; click **`🗑️`** to delete any vacant table that has no active orders.
- **Floor Zones / Sections**: View tables organized by area (*Main AC Hall*, *Open Terrace Garden*, *Poolside Deck*, *Bar & Lounge*, *VIP Private Dining*).
- **Table Shifting / Transfer**:
  - If guests move tables (e.g. from Garden to AC Hall), click **"Shift ➔"** on the table card.
  - Select any vacant destination table; the ERP shifts the active KOT order immediately and vacates the origin table.
- **Table Merging for Large Parties**:
  - When hosting a banquet or large family group across multiple tables, click **"Merge 🔗"**.
  - Select an adjacent table. The ERP combines items into one master order, links both tables, and generates a single consolidated bill.

#### 3. Menu Management & On-The-Fly Dish Creation
- On the **"Touch POS Counter"** tab:
  - Click **"+ Add Dish"** to create a new menu item with dietary tag (Veg 🟢, Non-Veg 🔴, Egg 🟡), dish name, price in INR, optional item code, SAC `996331`, and 5% GST.
  - Click **"+ Category"** to create a new menu category (e.g., *Continental Starters*, *Tandoor Kebabs*, *Beverages*).
- Interactive **"ℹ️ How Aura Dine Works"** guide button opens an instant operational manual directly in the POS view.

#### 4. Standalone Diner CRM & Fast Phone Lookup
- In the POS order panel, enter customer mobile phone (e.g. `9820011223`).
- The ERP auto-recognizes returning diners: displays total visit count, cumulative spend, and dietary preferences (*"Returning Diner: 6 visits · Prefers corner tables & mild spice"*).

#### 4. Fast Touch Screen Ordering & Multi-Round KOTs
- Browse categorized menu items (Starters, Main Course, Breads & Rice, Desserts, Beverages) with **Veg (🟢) / Non-Veg (🔴)** badges.
- **Subsequent KOT Rounds (Multi-KOT)**:
  - Tables can punch initial drinks & starters, followed by Round 2 (Mains), and Round 3 (Desserts).
  - Click **"+ Round"** on any occupied table to fire sequential kitchen tickets (`KOT-101-R2`) while keeping the master table bill consolidated.
- 1-tap quick kitchen prep tags: `[No Onion Garlic]`, `[Mild]`, `[Spicy]`, `[Jain]`, `[Extra Crispy]`, `[Serve Fast]`.

#### 5. Kitchen Order Ticket (KOT) Dispatch & ESC/POS Thermal Printing
- Click **"Fire KOT to Kitchen"**:
  - Automatically launches the **80mm ESC/POS Thermal Slip Modal** (`KotPrintModal`) formatted for star/epson kitchen printers.
  - Displays round number, table/room identifier, server captain name, and highlighted preparation notes.

#### 6. Aura Dine Bill Settlement & Split Billing Engine
- When dining concludes, click **"Settle & Bill"**:
  - **Split Bill Engine (2 to 5 Ways)**:
    - Click **"Split Bill Engine"** and select 2, 3, 4, or 5 equal shares.
    - Settle each person's share with independent tenders: e.g. Split 1 via Cash, Split 2 via Scan-to-Pay UPI QR, Split 3 via EDC POS Card Machine, and Split 4 charged to Room Folio!
  - **Single Settlement Options**:
    - **Option A — 1-Click "Charge to Room Folio"** (Hotel Mode): Directly transfers to active guest folio under SAC `996331` at 5% GST without tax commingling.
    - **Option B — Direct Settlement** (Standalone Mode): Cash (with Section 269ST ₹2L check), Dynamic NPCI Scan-to-Pay UPI QR, EDC POS Machine Card Swipe, or Swiggy/Zomato.
  - **80mm Customer Tax Bill (`BillPrintModal`)**:
    - Prints official Aura Dine 80mm ESC/POS customer receipt with FSSAI license, GSTIN, SAC 996331 breakdown, 2.5% CGST, 2.5% SGST, discounts, and payment mode.

#### 7. Online Delivery Hub (Swiggy & Zomato Connected) & Live API Integration
- Navigate to the **"🛵 Online Delivery Hub"** tab on `/restaurant`.
- **Connecting in Live / Production (How Swiggy & Zomato API Integration Works in India)**:
  - Click **"⚙️ API & Webhook Credentials"** in the top header.
  - **Step 1 (Restaurant IDs)**: Retrieve your **Swiggy Restaurant ID (RID)** from the Swiggy Partner App / Portal (`partner.swiggy.com`) and your **Zomato Restaurant ID (ResID)** from Zomato for Business (`zomato.com/merchant`) or from your Swiggy / Zomato Key Account Manager (KAM).
  - **Step 2 (Enter Credentials)**: Enter your Swiggy RID, Swiggy Partner Secret, Zomato ResID, and Zomato Partner Token. Choose whether to enable **Auto-Accept Incoming Orders** and set your default prep time (15, 20, 25, 30, or 40 minutes).
  - **Step 3 (Register Webhook URLs)**: Aura Dine generates dedicated live Webhook Ingestion URLs:
    - Swiggy Webhook: `https://[your-domain]/api/hotel/restaurant/aggregators/webhook/swiggy/[outletId]`
    - Zomato Webhook: `https://[your-domain]/api/hotel/restaurant/aggregators/webhook/zomato/[outletId]`
    Click **"Copy"** and provide these endpoints to your Swiggy/Zomato onboarding engineer.
  - **Step 4 (Automated Kitchen Ingestion)**: When a diner places an order on Swiggy or Zomato, their cloud infrastructure fires an HTTP POST payload to your webhook. Aura Dine automatically parses the items, calculates 5% F&B GST (SAC 996331), prints the KOT ticket to the kitchen, and triggers the audio notification chime.
  - **Step 5 (Two-Way Rider Notification)**: When your kitchen packs the food and clicks **"Food Ready & Packed"**, Aura Dine sends an automated status sync to Swiggy/Zomato notifying the delivery rider to proceed to the parcel counter.
- **1-Click Accept with Prep Timers**:
  - For manual accept mode, accept incoming orders with 1 tap choosing estimated preparation time: **15 Min**, **25 Min**, or **40 Min**.
  - Automatically transmits ETA to the aggregator rider and dispatches items to kitchen KDS.
- **Rider OTP & Lifecycle Tracking**:
  - Displays assigned rider name, phone number, and status (`Assigning Rider`, `At Restaurant`, `Picked Up & Dispatched`).
  - Click **"📦 Food Ready & Packed"** when dishes are ready, notifying the delivery rider to proceed to the pickup counter.
  - Click **"🛵 Hand to Rider & Dispatch"** upon parcel handover.
- **Live Order Simulation**:
  - Features **"⚡ Simulate Swiggy Order"** and **"⚡ Simulate Zomato Order"** buttons for instant end-to-end demonstrations with zero API key dependencies. Even on empty menus, built-in fallback dishes ensure instant simulation testing.

#### 8. Live Item 86'ing & Multi-Station Kitchen Routing
- **Item 86 Out-of-Stock Toggle**:
  - When ingredients run out during service, click the **"🟢 Stock / 🔴 86"** toggle on any dish card in the Touch POS catalog.
  - Dishes marked 86 are instantly greyed out and prevented from being punched across Dine-In POS, Swiggy, and Zomato.
- **Multi-Station Kitchen Routing**:
  - Every dish is mapped to its specialized culinary department:
    - 🔥 **Tandoor & Clay Oven Station**: Naans, rotis, kebabs, tikkas.
    - 🍳 **Main Curry & Gravy Station**: Dal makhani, butter chicken, biryanis.
    - 🍸 **Bar Counter**: Cocktails, mocktails, fresh juices, sodas.
    - 🥗 **Pantry & Bakery**: Salads, cold cuts, desserts, breads.
  - Chefs on the **👨‍🍳 Kitchen KDS** filter tickets by their specific station, ensuring tandoor chefs only view tandoor items while beverage bartenders only view beverage tickets.

#### 9. Cashier Shift Management & Day-End Z-Report
- Navigate to the **"📊 Cashier Shifts & Z-Report"** tab:
  - **Open Shift Float**: Declare drawer starting cash balance (e.g. ₹2,000.00). The session tracks active sales across Cash, UPI, Card POS, Swiggy, Zomato, and Room Folios.
  - **Shift Closing & Reconciliation**:
    - At shift end, cashier enters the physical counted drawer cash.
    - The ERP automatically computes **Expected Drawer Cash** (`Opening Float + Cash Sales`) and audits **Cash Variance** (`Counted Cash - Expected Cash`).
  - **Official 80mm Z-Report Slip**:
    - Click **"Print 80mm Z-Report"** to print formatted thermal cashier reconciliation with shift timestamps, KOT count, multi-tender breakdowns, and variance signoff.

---

### G. 🔑 Enterprise Key Management & Door Lock Journey (Brass Rack & RFID)
> **Dual-System Hospitality Philosophy**: Supports both historic palace heritage keys and modern RFID electronic contactless locks.

#### 1. Traditional Brass Key Tag Rack Management
- Open `/keycards` ➔ Select the **"Brass Key Tag Rack"** tab.
- View a heritage-styled visual wooden key rack with individual room pigeonhole hooks and engraved brass tags.
- Each key slot reflects real-time physical possession:
  - 🟢 **In Slot**: Key is resting safely in its hotel desk pigeonhole. Ready to hand to guest.
  - 🔵 **Issued to Guest**: Currently carried by the registered guest. Shows guest name and reservation link.
  - 🟡 **With Housekeeping**: Key checked out by housekeeping staff for room turndown or linen change.
  - 🔴 **Lost / Missing**: Tagged as lost for security replacement.
- 1-click quick action buttons to instantly transition key state (*"Hand to Guest"*, *"Hand to Housekeeping"*, *"Return to Slot"*).

#### 2. RFID Contactless Keycard Encoder Bridge (Web Serial)
- Select the **"RFID Keycard Encoder"** tab.
- Plug any standard USB RFID writer/encoder (supporting MIFARE Classic 1K, MIFARE Ultralight, or Saflok / VingCard protocols) into the front desk PC.
- Click **"Connect USB Encoder"**:
  - Invokes W3C Web Serial API (`navigator.serial.requestPort()`) to establish a direct 9600/115200 baud serial connection with zero client driver installation.
  - Status updates to 🟢 *Connected (COM3 / USB Serial)*.
- **Card Encoding Workflow**:
  - Click **"Encode New Keycard"** on any room row.
  - Select active guest reservation to automatically bind the guest name, room number, check-in date, and strict check-out expiry timestamp.
  - Select encoder protocol (MIFARE Classic 1K or Ultralight).
  - Click **"Write to Physical Card"**: ERP writes encrypted room authorization block, reads unique 8-byte Card UID, and flags card as `Issued to Guest`.
  - The electronic door lock will only grant access until the exact checkout datetime.

#### 3. Digital Mobile Guest Pass (Contactless Keyless Entry)
- Select the **"Digital Mobile Pass"** tab or click **"Mobile Pass"** on any active keycard.
- Displays a branded mobile digital pass containing encrypted QR access token, room number, and validity dates.
- Hoteliers can send the digital pass directly to the guest's smartphone via WhatsApp or SMS, allowing smartphone scan access at smart lock scanners.

#### 4. Guest Checkout & Key De-provisioning
- During front desk checkout on `/billing`:
  - Cashier is alerted if brass keys or RFID cards are still held by the departing guest.
  - 1-click **"Return to Slot"** wipes the RFID encryption key, sets status to `In Slot`, and clears guest identity binding.

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

### NPCI Unified Payments Interface (UPI) Standards & Banking Governance
- **URI Payload Format**: `upi://pay?pa={vpa}&pn={merchant_name}&am={amount}&cu=INR&tr={folio_ref}` compliant with National Payments Corporation of India (NPCI) merchant specifications.
- **Dynamic Render**: Generates high-density vector QR code with 10-minute expiry countdown to prevent stale or duplicate cashiering settlements.
- **Banking Settlement Governance**: Hotel receiving VPA (`upi_id`) and legal merchant entity name (`upi_merchant_name`) are stored on the `properties` table. Access is cryptographically guarded by the `PROPERTY_BANKING_MANAGE` permission and enforced on the NestJS backend via role check (`user.role === 'owner'`). General Managers, Front Desk Receptionists, and Floor Attendants cannot alter the settlement account, mitigating revenue diversion risks.

### Hardware POS (EDC Machine) & PCI-DSS Cardholder Data Compliance
- **Zero Raw PAN Storage (PCI-DSS Level 1 / Section 3.4)**: The ERP strictly avoids capturing or storing 16-digit Primary Account Numbers (PAN) or 3-digit CVV codes in application memory or PostgreSQL databases. Only the first 4 and last 4 digits (e.g. `4532XXXXXXXX1289`) are preserved for guest receipt presentation and bank chargeback defense.
- **Bank Reference Audit Trail**: Every card charge processed via Pine Labs, Paytm, Innoviti, Razorpay EzeTap, or Ingenico EDC machines records the 12-digit **Bank RRN** (Retrieval Reference Number) and 6-digit **Auth Code** directly on `folio_payments`.
- **Thermal Slip Archival**: Detailed EMV transaction receipts (`pos_slip_data`) including Terminal ID (TID), Merchant ID (MID), Batch Number, Invoice Number, Card Brand, and Entry Method (`CHIP_INSERT` / `CONTACTLESS_TAP` / `FALLBACK_SWIPE`) are stored in structured JSON format and renderable on demand in 58mm/80mm thermal printer format.
- **Hardware Protocol Agnostic**: Supports direct USB connection via W3C Web Serial API (`navigator.serial` at 9600/115200 baud) for legacy serial cash registers and REST / WebSocket LAN socket push for modern Android Smart POS terminals.

### Food & Beverage (F&B) GST Dual-SAC Isolation (SAC 996331 vs SAC 996311)
- **Distinct Tax Accounting**: Indian GST Council notifications strictly distinguish room accommodation services (SAC `996311` at 12% or 18% based on nightly room rate) from restaurant dining services (SAC `996331` flat 5% without Input Tax Credit).
- **Folio Auto-Segmentation**: When a restaurant or room-service KOT order is posted to a guest room folio via **"Charge to Room Folio"**, the system creates a distinct line item referencing SAC `996331` and calculates 2.5% CGST + 2.5% SGST. It never commingles restaurant charges with accommodation tariffs, safeguarding against tax misclassification penalties during statutory GST audits.

### Electronic Door Lock & RFID Keycard Security Standards
- **MIFARE ISO/IEC 14443-A Compatibility**: Supports standard 13.56 MHz high-frequency contactless smart cards widely used in hospitality electronic door locks (Assa Abloy / VingCard, Saflok, Dormakaba, Salto).
- **Temporal Access Encasement**: Keycard encoding routines enforce strict check-out timestamp expiry down to the minute. Cards automatically deactivate upon the guest's scheduled check-out time, preventing unauthorized room access after key return.
- **W3C Web Serial Bridge**: Direct browser-to-hardware communication eliminates bulky desktop middleware agents or vendor lock-in. Compatible with standard USB-to-UART bridge chips (CH340, CP2102, FTDI).
