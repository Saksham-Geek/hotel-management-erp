'use client';

import { useState, useTransition } from 'react';
import { CustomDropdown } from '@/components/dropdown';
import { CustomDatePicker } from '@/components/date-picker';
import { formatDate, formatStayDates, formatMoney } from '@/lib/format';
import {
  sendReviewRequest,
  createCampaign,
  updateGuestLoyalty,
  type ActionState,
} from './actions';

function money(amount: number | null | undefined, currency = 'INR') {
  return formatMoney(amount, currency);
}

interface GuestProfile {
  guestId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  vip: boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'kohinoor';
  totalNights: number;
  totalSpend: number;
  pointsBalance: number;
  preferences: {
    pillow_type?: string;
    floor_preference?: string;
    dietary?: string;
    newspaper?: string;
    [key: string]: any;
  };
  anniversaryDate: string | null;
  birthdayDate: string | null;
  lastStayDate: string | null;
}

interface PendingFollowUp {
  reservationId: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingSource: string;
  roomNumber: string;
  roomTypeName: string;
  guestId: string;
  vip: boolean;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  lastFollowUpId: string | null;
  followUpStatus: string | null;
  lastFollowUpSentAt: string | null;
}

interface FollowUpLog {
  id: string;
  guestId: string;
  reservationId: string | null;
  triggerType: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipientName: string;
  recipientPhone: string | null;
  recipientEmail: string | null;
  messageBody: string;
  status: string;
  reviewPlatform: string;
  ratingReceived: number | null;
  guestFeedback: string | null;
  sentAt: string;
}

interface Campaign {
  id: string;
  title: string;
  campaignType: string;
  channel: string;
  audienceSegment: string;
  templateMessage: string;
  discountCode: string | null;
  status: string;
  sentCount: number;
  deliveredCount: number;
  convertedCount: number;
  revenueGenerated: number;
  createdAt: string;
}

interface MarketingData {
  hotelName: string;
  guests: GuestProfile[];
  pendingFollowUps: PendingFollowUp[];
  recentLogs: FollowUpLog[];
  campaigns: Campaign[];
  metrics: {
    totalGuests: number;
    platinumGuests: number;
    totalFollowUpsSent: number;
    reviewsReceived: number;
    reviewConversionRate: number;
    averageNpsRating: number;
    repeatGuestRatio: string;
  };
}

export function MarketingView({ initialData }: { initialData: MarketingData }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<'followups' | 'crm' | 'campaigns'>('followups');
  const [pending, startTransition] = useTransition();

  // Review Modal State
  const [reviewModalGuest, setReviewModalGuest] = useState<PendingFollowUp | null>(null);
  const [reviewChannel, setReviewChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [reviewPlatform, setReviewPlatform] = useState<'google' | 'tripadvisor' | 'direct_nps'>('google');
  const [reviewActionState, setReviewActionState] = useState<ActionState>(null);

  // VIP Edit Modal State
  const [editingGuest, setEditingGuest] = useState<GuestProfile | null>(null);
  const [loyaltyActionState, setLoyaltyActionState] = useState<ActionState>(null);

  // Campaign Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignActionState, setCampaignActionState] = useState<ActionState>(null);

  // CRM Search & Filter
  const [crmSearch, setCrmSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filteredGuests = data.guests.filter((g) => {
    const matchesTier = tierFilter === 'all' || g.tier === tierFilter;
    const matchesSearch =
      g.fullName.toLowerCase().includes(crmSearch.toLowerCase()) ||
      (g.phone && g.phone.includes(crmSearch)) ||
      (g.email && g.email.toLowerCase().includes(crmSearch.toLowerCase()));
    return matchesTier && matchesSearch;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'kohinoor':
        return { label: '👑 Kohinoor (Imperial)', bg: 'bg-amber-100 text-amber-950 border-amber-300 font-black' };
      case 'platinum':
        return { label: '💎 Taj Platinum', bg: 'bg-purple-100 text-purple-950 border-purple-300 font-bold' };
      case 'gold':
        return { label: '🥇 Gold Tier', bg: 'bg-yellow-100 text-yellow-900 border-yellow-300 font-bold' };
      case 'silver':
        return { label: '🥈 Silver Member', bg: 'bg-teal-100 text-teal-900 border-teal-300 font-semibold' };
      default:
        return { label: '🥉 Bronze', bg: 'bg-slate-100 text-slate-800 border-slate-300 font-medium' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-2xs">
              Guest Follow-Up &amp; Marketing Engine
            </span>
            <span className="text-xs font-medium text-slate-500">Taj InnerCircle Standard</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Post-Stay Follow-Up &amp; Loyalty CRM
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Automated WhatsApp &amp; Email Google review requests, guest lifetime value tracking, and targeted repeat booking campaigns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCampaignActionState(null);
            setIsCampaignModalOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Launch Campaign</span>
        </button>
      </div>

      {/* Top Marketing KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guest CRM Profiles
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">{data.metrics.totalGuests}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {data.metrics.platinumGuests} VIP Platinum &amp; Kohinoor
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Review Outreach Sent
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {data.metrics.totalFollowUpsSent}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">
            {data.metrics.reviewConversionRate}% conversion rate
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guest NPS Rating
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-950">★ {data.metrics.averageNpsRating}</span>
            <span className="text-sm font-medium text-slate-400">/ 5.0</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">{data.metrics.reviewsReceived} verified reviews</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Repeat Guest Ratio
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {data.metrics.repeatGuestRatio}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">High lifetime value (LTV)</p>
        </div>
      </div>

      {/* Modern Segmented Pill Tabs */}
      <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'followups'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Automated Post-Checkout Follow-Ups ({data.pendingFollowUps.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'crm'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Guest CRM &amp; Loyalty Directory ({data.guests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'campaigns'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          Follow-Up Campaigns &amp; Broadcasts ({data.campaigns.length})
        </button>
      </div>

      {/* TAB 1: Post-Checkout Follow-Ups */}
      {activeTab === 'followups' && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                  Recent Departures & Pending Review Outreach
                </h3>
                <p className="mt-1 text-sm text-slate-600 font-medium">
                  Guests checked out in the last 48 hours. Dispatch 1-click WhatsApp or Email Google review requests to boost hotel ranking.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Guest &amp; Room</th>
                    <th className="px-5 py-4">Stay Dates</th>
                    <th className="px-5 py-4">Channel / Folio</th>
                    <th className="px-5 py-4">Follow-Up Status</th>
                    <th className="px-5 py-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm sm:text-[15px]">
                  {data.pendingFollowUps.map((p) => {
                    const hasFollowedUp = !!p.lastFollowUpId;
                    return (
                      <tr key={p.reservationId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p.guestName}</span>
                            {p.vip && (
                              <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-normal mt-0.5">
                            Room {p.roomNumber} ({p.roomTypeName}) · {p.guestPhone || 'No phone'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 whitespace-nowrap">
                            {formatStayDates(p.checkIn, p.checkOut)}
                          </div>
                          <div className="text-xs text-slate-400 font-normal mt-0.5">Settled Folio</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-md bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-700">
                            {p.bookingSource.replace('_', '.')}
                          </span>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                            {formatMoney(p.totalAmount)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {hasFollowedUp ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Follow-Up Dispatched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Pending Review Request
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewActionState(null);
                              setReviewModalGuest(p);
                            }}
                            className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                          >
                            <span>💬 Send WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Follow-Up Logs Audit */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-display text-base font-bold text-slate-950 mb-3">
              Dispatched Review Outreach History & Guest Feedback
            </h3>
            <div className="space-y-3">
              {data.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-950">{log.recipientName}</span>
                      <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                        {log.channel}
                      </span>
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                        {log.reviewPlatform}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(log.sentAt).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="mt-1 text-slate-600 font-serif italic text-[11px]">
                    "{log.messageBody}"
                  </p>
                  {log.ratingReceived && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-emerald-950">
                      <div className="font-bold">★ {log.ratingReceived}/5 Rating Received:</div>
                      <p className="text-[11px] mt-0.5">"{log.guestFeedback}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Guest CRM & Loyalty Profiles */}
      {activeTab === 'crm' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <input
              type="text"
              placeholder="Search guest by name, phone, or email..."
              value={crmSearch}
              onChange={(e) => setCrmSearch(e.target.value)}
              className="h-9 w-full sm:w-80 rounded-xl border border-slate-300 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            />
            <div className="w-full sm:w-48">
              <CustomDropdown
                value={tierFilter}
                onChange={(val) => setTierFilter(val)}
                size="sm"
                options={[
                  { value: 'all', label: 'All Loyalty Tiers' },
                  { value: 'kohinoor', label: 'Kohinoor (Imperial)' },
                  { value: 'platinum', label: 'Taj Platinum' },
                  { value: 'gold', label: 'Gold Member' },
                  { value: 'silver', label: 'Silver Member' },
                ]}
                aria-label="Filter loyalty tier"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGuests.map((g) => {
              const badge = getTierBadge(g.tier);
              return (
                <div
                  key={g.guestId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-950 text-sm">{g.fullName}</h4>
                        <p className="text-[11px] text-slate-500">{g.phone || g.email || 'No contact on file'}</p>
                      </div>
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500">Stays</p>
                        <p className="font-bold text-slate-900">{g.totalNights} nights</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Total Spend</p>
                        <p className="font-bold text-slate-900">{money(g.totalSpend)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Points</p>
                        <p className="font-bold text-teal-700">{g.pointsBalance} pts</p>
                      </div>
                    </div>

                    {/* VIP Preferences Chips */}
                    <div className="mt-3 space-y-1 text-[11px]">
                      <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                        Tailored Preferences:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.preferences.pillow_type && (
                          <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-purple-900 text-[10px]">
                            🛏️ {g.preferences.pillow_type}
                          </span>
                        )}
                        {g.preferences.floor_preference && (
                          <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-blue-900 text-[10px]">
                            🏢 {g.preferences.floor_preference}
                          </span>
                        )}
                        {g.preferences.dietary && (
                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-900 text-[10px]">
                            🥗 {g.preferences.dietary}
                          </span>
                        )}
                        {g.preferences.newspaper && (
                          <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-800 text-[10px]">
                            📰 {g.preferences.newspaper}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {g.anniversaryDate ? `Anniv: ${g.anniversaryDate}` : 'No anniversary set'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoyaltyActionState(null);
                        setEditingGuest(g);
                      }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Edit Preferences
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.campaigns.map((camp) => (
              <div
                key={camp.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                        {camp.channel} · {camp.campaignType.replace('_', ' ')}
                      </span>
                      <h3 className="mt-1 font-display text-base font-bold text-slate-950">
                        {camp.title}
                      </h3>
                    </div>
                    {camp.discountCode && (
                      <span className="rounded-md border border-dashed border-teal-500 bg-teal-50 px-2 py-1 font-mono text-xs font-black text-teal-900">
                        {camp.discountCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    "{camp.templateMessage}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500">Sent</p>
                    <p className="font-bold text-slate-900">{camp.sentCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Delivered</p>
                    <p className="font-bold text-slate-900">{camp.deliveredCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Converted</p>
                    <p className="font-bold text-emerald-700">{camp.convertedCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Revenue</p>
                    <p className="font-bold text-teal-800">{money(camp.revenueGenerated)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Send WhatsApp Review Request */}
      {reviewModalGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-950">
                  Dispatch Review Outreach
                </h3>
                <p className="text-xs text-slate-500">
                  Guest: {reviewModalGuest.guestName} · Room {reviewModalGuest.roomNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalGuest(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {reviewActionState?.success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
                {reviewActionState.success}
              </div>
            )}
            {reviewActionState?.error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                {reviewActionState.error}
              </div>
            )}

            <form
              action={async (formData) => {
                startTransition(async () => {
                  const res = await sendReviewRequest(reviewActionState, formData);
                  setReviewActionState(res);
                  if (res?.success) {
                    setTimeout(() => {
                      setReviewModalGuest(null);
                      window.location.reload();
                    }, 1200);
                  }
                });
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <input type="hidden" name="guestId" value={reviewModalGuest.guestId} />
              <input type="hidden" name="reservationId" value={reviewModalGuest.reservationId} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Outreach Channel</label>
                  <CustomDropdown
                    name="channel"
                    value={reviewChannel}
                    onChange={(val) => setReviewChannel(val as any)}
                    size="sm"
                    options={[
                      { value: 'whatsapp', label: 'WhatsApp (Direct Chat)' },
                      { value: 'email', label: 'Official Email' },
                      { value: 'sms', label: 'SMS Text' },
                    ]}
                    aria-label="Outreach Channel"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Review Destination</label>
                  <CustomDropdown
                    name="platform"
                    value={reviewPlatform}
                    onChange={(val) => setReviewPlatform(val as any)}
                    size="sm"
                    options={[
                      { value: 'google', label: 'Google Maps & Business (5★)' },
                      { value: 'tripadvisor', label: 'TripAdvisor Luxury Portal' },
                      { value: 'direct_nps', label: 'Private Hotel NPS Survey' },
                    ]}
                    aria-label="Review Destination"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900">Guest Phone / WhatsApp</label>
                <input
                  name="recipientPhone"
                  defaultValue={reviewModalGuest.guestPhone || '+91 98765 43210'}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900">Live Message Preview</label>
                <div className="mt-1 rounded-2xl border border-teal-200 bg-teal-50/50 p-3 text-slate-800 leading-relaxed font-sans text-xs">
                  <p>
                    Namaste <strong>{reviewModalGuest.guestName}</strong>! Thank you for staying at{' '}
                    <strong>{data.hotelName}</strong> (Room {reviewModalGuest.roomNumber}). We hope you enjoyed your time with us. Could you take 30 seconds to share your feedback on{' '}
                    <strong>{reviewPlatform === 'google' ? 'Google Reviews' : 'TripAdvisor'}</strong>?
                  </p>
                  <p className="mt-2 text-teal-800 font-semibold underline">
                    https://g.page/r/{data.hotelName.replace(/\s+/g, '')}/review
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setReviewModalGuest(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-teal-700"
                >
                  {pending ? 'Dispatching...' : 'Dispatch Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Guest VIP Preferences & Loyalty */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-950">
                  Edit Loyalty & VIP Preferences
                </h3>
                <p className="text-xs text-slate-500">Guest: {editingGuest.fullName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGuest(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {loyaltyActionState?.success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
                {loyaltyActionState.success}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const tier = (form.elements.namedItem('tier') as HTMLSelectElement).value;
                const pillow = (form.elements.namedItem('pillow') as HTMLInputElement).value;
                const floor = (form.elements.namedItem('floor') as HTMLInputElement).value;
                const dietary = (form.elements.namedItem('dietary') as HTMLInputElement).value;
                const anniv = (form.elements.namedItem('anniversary') as HTMLInputElement).value;

                startTransition(async () => {
                  const res = await updateGuestLoyalty(editingGuest.guestId, {
                    tier,
                    preferences: {
                      pillow_type: pillow,
                      floor_preference: floor,
                      dietary: dietary,
                    },
                    anniversaryDate: anniv || null,
                  });
                  setLoyaltyActionState(res);
                  if (res?.success) {
                    setTimeout(() => {
                      setEditingGuest(null);
                      window.location.reload();
                    }, 1200);
                  }
                });
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-900 mb-1">Loyalty Status Tier</label>
                <CustomDropdown
                  name="tier"
                  defaultValue={editingGuest.tier}
                  size="sm"
                  options={[
                    { value: 'kohinoor', label: '👑 Kohinoor (Imperial VIP)' },
                    { value: 'platinum', label: '💎 Taj Platinum' },
                    { value: 'gold', label: '🥇 Gold Tier' },
                    { value: 'silver', label: '🥈 Silver Member' },
                    { value: 'bronze', label: '🥉 Bronze Standard' },
                  ]}
                  aria-label="Loyalty Status Tier"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900">Pillow Type</label>
                  <input
                    name="pillow"
                    defaultValue={editingGuest.preferences.pillow_type || 'Goose Feather'}
                    placeholder="e.g. Memory Foam, Feather"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900">Floor Preference</label>
                  <input
                    name="floor"
                    defaultValue={editingGuest.preferences.floor_preference || 'High Floor Corner'}
                    placeholder="e.g. Quiet High Floor"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900">Dietary Requirements</label>
                  <input
                    name="dietary"
                    defaultValue={editingGuest.preferences.dietary || 'Jain Vegetarian'}
                    placeholder="e.g. Vegan, Jain, Halal"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Anniversary Date</label>
                  <CustomDatePicker
                    name="anniversary"
                    defaultValue={editingGuest.anniversaryDate || ''}
                    size="sm"
                    aria-label="Anniversary Date"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-teal-700"
                >
                  {pending ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Launch Marketing Campaign */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-950">
                  Launch Marketing Campaign
                </h3>
                <p className="text-xs text-slate-500">
                  Broadcast targeted promotional offers to past and corporate guests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {campaignActionState?.error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                {campaignActionState.error}
              </div>
            )}
            {campaignActionState?.success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
                {campaignActionState.success}
              </div>
            )}

            <form
              action={async (formData) => {
                startTransition(async () => {
                  const res = await createCampaign(campaignActionState, formData);
                  setCampaignActionState(res);
                  if (res?.success) {
                    setTimeout(() => {
                      setIsCampaignModalOpen(false);
                      window.location.reload();
                    }, 1200);
                  }
                });
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-900">Campaign Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Diwali Heritage Palace Offer 2026"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Campaign Type</label>
                  <CustomDropdown
                    name="campaignType"
                    required
                    defaultValue="repeat_booking"
                    size="sm"
                    options={[
                      { value: 'repeat_booking', label: 'Repeat Stay Privilege' },
                      { value: 'inactive_reengagement', label: 'Inactive Guest Re-engagement' },
                      { value: 'festive_offer', label: 'Festive / Weekend Discount' },
                      { value: 'vip_loyalty', label: 'VIP Platinum Upgrade' },
                      { value: 'corporate_renewal', label: 'Corporate B2B Renewal' },
                    ]}
                    aria-label="Campaign Type"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Audience Segment</label>
                  <CustomDropdown
                    name="audienceSegment"
                    required
                    defaultValue="all_guests"
                    size="sm"
                    options={[
                      { value: 'all_guests', label: 'All Registered Guests' },
                      { value: 'inactive_90_days', label: 'Inactive Guests (>90 days)' },
                      { value: 'vip_platinum', label: 'VIP Platinum & Kohinoor Only' },
                      { value: 'corporate', label: 'Corporate B2B Bookers' },
                    ]}
                    aria-label="Audience Segment"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Channel</label>
                  <CustomDropdown
                    name="channel"
                    defaultValue="whatsapp"
                    size="sm"
                    options={[
                      { value: 'whatsapp', label: 'WhatsApp Broadcast' },
                      { value: 'email', label: 'Direct Email Campaign' },
                    ]}
                    aria-label="Channel"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900">Promo / Discount Code</label>
                  <input
                    name="discountCode"
                    placeholder="e.g. LUXURY25"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 font-mono font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900">Message Template</label>
                <textarea
                  name="templateMessage"
                  rows={3}
                  required
                  placeholder="Enter message template with offer details and call to action..."
                  defaultValue="Experience royal luxury at Grand Azure Hotel. Enjoy 25% savings on all suites, complimentary high tea, and late checkout with code LUXURY25."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-teal-700"
                >
                  {pending ? 'Broadcasting...' : 'Broadcast Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
