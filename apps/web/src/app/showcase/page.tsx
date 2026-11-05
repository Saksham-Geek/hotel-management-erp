import Link from 'next/link';
import { PageHeader } from '@/components/ui';

interface ShowcaseItem {
  id: string;
  category: string;
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  tagline: string;
  tenantSlug: string;
  plan: string;
  planFee: string;
  properties: { name: string; city: string; keys: number; desc: string }[];
  credentials: {
    owner: { name: string; email: string; pass: string; title: string };
    manager?: { name: string; email: string; title: string };
  };
  highlights: string[];
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'taj-hotels',
    category: '5-Star Luxury Palace Chain',
    badge: 'Enterprise Tier',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    icon: '👑',
    title: 'The Indian Hotels Company (Taj Hotels)',
    tagline: 'Multi-property iconic palace & heritage luxury portfolio with VIP protocols and Tata Presidential suites.',
    tenantSlug: 'taj-hotels',
    plan: 'Enterprise Chain',
    planFee: '₹19,999 / mo',
    properties: [
      { name: 'The Taj Mahal Palace, Mumbai', city: 'Colaba, Mumbai', keys: 35, desc: 'Palace Wing Luxury Grande, Sea Facing Heritage Suites, Tata Presidential Suite' },
      { name: 'Taj Ganges, Varanasi', city: 'Nadesar Palace Grounds, Varanasi', keys: 25, desc: 'Deluxe Valley View, Ganges Executive Suites, Maharaja Suite' },
    ],
    credentials: {
      owner: { name: 'Puneet Chhatwal', email: 'director@tajhotels.com', pass: 'TajPalace2026!', title: 'Managing Director & CEO' },
      manager: { name: 'Taljinder Singh', email: 'palace.gm@tajhotels.com', title: 'Senior VP & GM Palace Mumbai' },
    },
    highlights: [
      'Multi-Property Switching from Top Header Bar',
      'High-ADR Luxury Suites (₹22,000 to ₹1,50,000/night)',
      'Taj InnerCircle VIP Protocols & Government Delegations',
      'Corporate City Ledger & Indian GST 18% Slabs',
    ],
  },
  {
    id: 'itc-hotels',
    category: '5-Star Luxury Business & Resort Chain',
    badge: 'Enterprise Tier',
    badgeColor: 'bg-purple-100 text-purple-950 border-purple-300',
    icon: '🏛️',
    title: 'ITC Hotels & Resorts',
    tagline: 'Multi-property luxury business hotels and royal Mughal architecture with diplomatic delegations.',
    tenantSlug: 'itc-hotels',
    plan: 'Enterprise Chain',
    planFee: '₹19,999 / mo',
    properties: [
      { name: 'ITC Maurya, New Delhi', city: 'Diplomatic Enclave, New Delhi', keys: 32, desc: 'Executive Club Rooms, The Towers, Grand Presidential Suite' },
      { name: 'ITC Mughal, Agra', city: 'Fatehabad Road, Agra', keys: 28, desc: 'Mughal Chambers, Royal Mughal Suites, Mumtaz Mahal Suite' },
    ],
    credentials: {
      owner: { name: 'Nakul Anand', email: 'owner@itchotels.com', pass: 'ItcLuxury2026!', title: 'Corporate Executive Director' },
      manager: { name: 'Amaresh Tiwari', email: 'maurya.gm@itchotels.com', title: 'General Manager Maurya' },
    },
    highlights: [
      'Diplomatic Delegations & Embassy Folios',
      'Bespoke F&B charges (Bukhara & Dum Pukht Dining)',
      'Multi-Day Visual Tape Chart Room Rack',
      'Corporate AR Aging & GST Tax Invoicing',
    ],
  },
  {
    id: 'sayaji-hotels',
    category: 'Mid-Market Business Hotel Chain',
    badge: 'Growth Tier',
    badgeColor: 'bg-blue-100 text-blue-950 border-blue-300',
    icon: '🏢',
    title: 'Sayaji Hotels Group',
    tagline: 'Multi-city premier business hotels catering to corporate executives, IT hubs, and banquets.',
    tenantSlug: 'sayaji-hotels',
    plan: 'Growth Tier',
    planFee: '₹5,999 / mo',
    properties: [
      { name: 'Sayaji Hotel Indore', city: 'Vijay Nagar, Indore', keys: 24, desc: 'Sayaji Grande Rooms, Club Executive Suites' },
      { name: 'Sayaji Hotel Pune', city: 'Wakad / Hinjawadi IT Hub, Pune', keys: 20, desc: 'Executive Business Rooms, Presidential Suites' },
    ],
    credentials: {
      owner: { name: 'Raoof Dhanani', email: 'owner@sayajihotels.com', pass: 'SayajiGrowth2026!', title: 'Chairman & Group Owner' },
      manager: { name: 'Nitin Sharma', email: 'indore.gm@sayajihotels.com', title: 'GM Sayaji Indore' },
    },
    highlights: [
      '2-Property Corporate Switching from 1 Owner Account',
      'Automated Daily Night Audit & Day Close',
      'Corporate Travel Booker Settlements (Tech Mahindra, IT Parks)',
      'UPI, Corporate Card & Direct Billing',
    ],
  },
  {
    id: 'radisson-india',
    category: 'International Airport & Resort Franchise',
    badge: 'Growth Tier',
    badgeColor: 'bg-teal-100 text-teal-950 border-teal-300',
    icon: '🌐',
    title: 'Radisson Hotel Group India',
    tagline: 'Transit airport hubs & scenic palace resorts operated under premier hospitality franchise standards.',
    tenantSlug: 'radisson-india',
    plan: 'Growth Tier',
    planFee: '₹5,999 / mo',
    properties: [
      { name: 'Radisson Blu Mumbai Airport', city: 'Andheri East, Mumbai', keys: 26, desc: 'Superior Transit Rooms, Business Class Suites' },
      { name: 'Radisson Blu Udaipur Palace Resort', city: 'Fateh Sagar Lake, Udaipur', keys: 24, desc: 'Deluxe Lake View, Heritage Palace Suites' },
    ],
    credentials: {
      owner: { name: 'Zubin Saxena', email: 'franchise@radissonhotels.com', pass: 'Radisson2026!', title: 'Regional Managing Director' },
      manager: { name: 'Vikas Sharma', email: 'mumbai.gm@radissonhotels.com', title: 'GM Radisson Blu Mumbai' },
    },
    highlights: [
      'Airline Crew & Transit Hourly/Nightly Rates',
      'Two-Way OTA Channel Integrations (MakeMyTrip, Booking.com, Agoda)',
      'BoI Foreigner Form C Filing & Police Beat Reporting',
      'Full Cashiering & Advance Folio Deposits',
    ],
  },
  {
    id: 'city-boutique',
    category: 'Local City Independent Multi-Hotel Owner',
    badge: 'Growth Tier (Boutique)',
    badgeColor: 'bg-rose-100 text-rose-950 border-rose-300',
    icon: '🏰',
    title: 'Singhania Boutique Hospitality',
    tagline: 'Single independent owner managing multiple city hotels under different brand names from one unified login.',
    tenantSlug: 'city-boutique',
    plan: 'Growth Tier',
    planFee: '₹5,999 / mo',
    properties: [
      { name: 'Heritage Haveli, Jaipur', city: 'Old City, Jaipur', keys: 16, desc: 'Haveli Deluxe Rooms, Royal Courtyard Suites' },
      { name: 'Lakeview Boutique Resort, Udaipur', city: 'Pichola Banks, Udaipur', keys: 14, desc: 'Lakefront Villas, Sunset Cottage Suites' },
    ],
    credentials: {
      owner: { name: 'Vikram Singhania', email: 'owner@singhaniahotels.com', pass: 'Boutique2026!', title: 'Founder & Boutique Owner' },
      manager: { name: 'Mahesh Bhati', email: 'jaipur.mgr@singhaniahotels.com', title: 'Manager Heritage Haveli' },
    },
    highlights: [
      '1 Owner, 2 Differently Named City Hotels',
      'Switch between Haveli Jaipur and Lakeview Udaipur with 1 Click',
      'Heritage Tourism, Honeymooners & Wedding Guest Folios',
      'Dual Indian GST Slabs (12% vs 18%)',
    ],
  },
  {
    id: 'grand-azure',
    category: 'Personal Testing Sandbox & Playground',
    badge: 'Sandbox Testbed',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    icon: '🧪',
    title: 'Grand Azure Hotel (365-Day Historical Data)',
    tagline: 'Your private sandbox with 2,016 real non-overlapping historical reservations spanning 1 full year across all 18 keys.',
    tenantSlug: 'grand-azure',
    plan: 'Growth Tier',
    planFee: 'Sandbox Mode',
    properties: [
      { name: 'Grand Azure Hotel', city: 'Civil Lines, Jaipur', keys: 18, desc: 'Deluxe Heritage, Executive Suites, Presidential Palace Suite' },
    ],
    credentials: {
      owner: { name: 'Asha Verma', email: 'owner@grandazure.test', pass: 'ChangeMe-123!', title: 'Owner & Testing Director' },
    },
    highlights: [
      'Full 365 Days of unbroken historical booking capsules',
      'Test anything freely without altering client presentation accounts',
      'Reconciled Owner Income & Revenue Analytics across all time ranges',
      'Front Desk Gantt Tape Chart with interactive range selection',
    ],
  },
  {
    id: 'platform-hq',
    category: 'SaaS Platform Founder & Staff Console',
    badge: 'Platform Super-Admin',
    badgeColor: 'bg-slate-900 text-white border-slate-700',
    icon: '⚡',
    title: 'Antigravity ERP Cloud HQ (Founder & Employee Console)',
    tagline: 'Command center for the SaaS Founder and support staff to track monthly recurring revenue (MRR), ARR, and churn.',
    tenantSlug: 'platform-hq',
    plan: 'HQ Super-Admin',
    planFee: 'Founder Access',
    properties: [
      { name: 'SaaS Platform Operations HQ', city: 'Bengaluru / Cloud', keys: 1, desc: 'Central Platform Operations & Client Billing Ledger' },
    ],
    credentials: {
      owner: { name: 'SaaS Platform Founder', email: 'founder@antigravity-erp.com', pass: 'FounderCloud2026!', title: 'Platform Founder & CEO' },
      manager: { name: 'Kavita Sharma', email: 'ops@antigravity-erp.com', title: 'Lead Operations Engineer' },
    },
    highlights: [
      'Track Monthly Recurring Revenue (MRR: ₹63,994/mo) & ARR (₹7.68 Lakh/yr)',
      'Client Directory with plan, active/past-due/churned status, and renewal dates',
      'Track hotels who left subscription (churned) with stated reasons & historical LTV',
      '1-click clean slate onboarding for prospective hotel owners',
    ],
  },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-0.5 text-xs font-black text-emerald-950 uppercase tracking-wider shadow-2xs">
                <span>✦</span>
                <span>Production Showcase Hub</span>
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Turnkey Demonstration Matrix
              </span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight font-display">
              Hospitality Client Portfolios &amp; Live Demos
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl font-medium leading-relaxed">
              Tailored demonstration environments for pitching to 5-star palace chains, mid-scale corporate hotels, and independent boutique owners with multiple properties.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-950 shadow-2xs hover:bg-emerald-100 transition-all"
            >
              <span>✦ Self-Service Onboarding</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all"
            >
              <span>← Back to Login</span>
            </Link>
          </div>
        </div>

        {/* Portfolio Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOWCASE_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group"
            >
              <div className="space-y-4">
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {item.category}
                  </p>
                  <h2 className="mt-0.5 text-lg font-extrabold text-slate-950 font-display leading-snug">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-medium">
                    {item.tagline}
                  </p>
                </div>

                {/* Properties in Portfolio */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Properties Under Governance ({item.properties.length}):
                  </p>
                  {item.properties.map((p, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.city}</p>
                      </div>
                      <span className="rounded-full bg-white border border-slate-200/90 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 shrink-0">
                        {p.keys} Keys
                      </span>
                    </div>
                  ))}
                </div>

                {/* Highlights */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Showcase Capabilities:
                  </p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    {item.highlights.map((h, hIdx) => (
                      <li key={hIdx} className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold text-xs">✓</span>
                        <span className="font-medium text-[11px]">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action / Credentials Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold">Hotel Code:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {item.tenantSlug}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold">Owner Login:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[170px]" title={item.credentials.owner.email}>
                      {item.credentials.owner.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold">Password:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {item.credentials.owner.pass}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/login`}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 py-2.5 text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>Launch Live Demo</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
