'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomDropdown } from '@/components/ui';
import {
  createBanquetBookingAction,
  updateBanquetBookingAction,
  getFunctionProspectusAction,
} from './actions';
import { FunctionProspectusModal, type FunctionProspectusData } from './function-prospectus-modal';

export interface Venue {
  id: string;
  name: string;
  type: string;
  maxPax: number;
  baseRentalRate: number;
  amenities: string[];
  isActive: boolean;
}

export interface BanquetBooking {
  id: string;
  venueId: string;
  venueName: string;
  venueType: string;
  bookingNumber: string;
  eventName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  eventDate: string;
  slot: 'MORNING' | 'EVENING' | 'FULL_DAY';
  paxCount: number;
  menuPackage: string;
  ratePerPax: number;
  hallRental: number;
  decorAvCharges: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  status: string;
  specialInstructions: string | null;
  createdAt: string;
}

const VENUE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  BANQUET_HALL: { label: 'Banquet Hall', icon: '🏛️' },
  LAWN: { label: 'Outdoor Lawn', icon: '🌳' },
  BOARDROOM: { label: 'Executive Boardroom', icon: '💼' },
  ROOFTOP_TERRACE: { label: 'Rooftop Terrace', icon: '✨' },
  CONFERENCE_CENTER: { label: 'Conference Center', icon: '🎙️' },
};

const MENU_PACKAGES = [
  { name: 'Standard Buffet', defaultRate: 850 },
  { name: 'Royal Awadhi Feast', defaultRate: 1150 },
  { name: 'Imperial Mughlai & Continental Spread', defaultRate: 1450 },
  { name: 'Pure Vegetarian Jain Delicacy', defaultRate: 950 },
  { name: 'High-Tea & Corporate Snacks', defaultRate: 450 },
];

export function BanquetClient({
  initialVenues,
  initialBookings,
}: {
  initialVenues: Venue[];
  initialBookings: BanquetBooking[];
}) {
  const router = useRouter();
  const [venues] = useState<Venue[]>(initialVenues);
  const [bookings, setBookings] = useState<BanquetBooking[]>(initialBookings);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [activeFp, setActiveFp] = useState<FunctionProspectusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [eventName, setEventName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<'MORNING' | 'EVENING' | 'FULL_DAY'>('EVENING');
  const [paxCount, setPaxCount] = useState('150');
  const [menuPackage, setMenuPackage] = useState(MENU_PACKAGES[1].name);
  const [ratePerPax, setRatePerPax] = useState(String(MENU_PACKAGES[1].defaultRate));
  const [hallRental, setHallRental] = useState('35000');
  const [decorAvCharges, setDecorAvCharges] = useState('15000');
  const [advancePaid, setAdvancePaid] = useState('50000');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Auto-calculated totals
  const numPax = parseInt(paxCount) || 0;
  const numRate = parseFloat(ratePerPax) || 0;
  const numRental = parseFloat(hallRental) || 0;
  const numDecor = parseFloat(decorAvCharges) || 0;
  const totalContract = numPax * numRate + numRental + numDecor;

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch =
      b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.eventName.toLowerCase().includes(search.toLowerCase()) ||
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.venueName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenFp = async (bookingId: string) => {
    setLoading(true);
    const res = await getFunctionProspectusAction(bookingId);
    setLoading(false);
    if (res.ok && res.data) {
      setActiveFp(res.data);
    } else {
      alert(res.error || 'Could not load Function Prospectus');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createBanquetBookingAction({
        venueId,
        eventName: eventName.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        eventDate,
        slot,
        paxCount: numPax,
        menuPackage,
        ratePerPax: numRate,
        hallRental: numRental,
        decorAvCharges: numDecor,
        advancePaid: parseFloat(advancePaid) || 0,
        specialInstructions: specialInstructions.trim() || undefined,
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to create banquet booking.');
      }

      setIsBookModalOpen(false);
      setEventName('');
      setClientName('');
      setClientPhone('');
      setSpecialInstructions('');
      router.refresh();
      if (res.booking) {
        // Find venue name
        const v = venues.find((x) => x.id === venueId);
        const newBooking = {
          ...res.booking,
          venueName: v?.name || 'Main Hall',
          venueType: v?.type || 'BANQUET_HALL',
          menuPackage,
          ratePerPax: numRate,
          hallRental: numRental,
          decorAvCharges: numDecor,
          balanceDue: totalContract - (parseFloat(advancePaid) || 0),
          clientPhone,
          clientEmail,
          clientName,
          specialInstructions,
        };
        setBookings([newBooking, ...bookings]);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  const totalAdvanceCollected = bookings.reduce((sum, b) => sum + b.advancePaid, 0);
  const totalBanquetReceivables = bookings.reduce((sum, b) => sum + b.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Banquet, Event Lawns &amp; Conference Hub
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Book wedding receptions, corporate conferences, and lawn parties with Function Prospectus (BEO) generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBookModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>+ Book Event / Banquet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Configured Venues</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{venues.length} Spaces</p>
          <p className="mt-1 text-[11px] text-slate-500">Ballrooms, Lawns &amp; Boardrooms</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Bookings</span>
          <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">{bookings.length} Events</p>
          <p className="mt-1 text-[11px] text-slate-500">Active &amp; confirmed schedules</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Advances Collected</span>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{totalAdvanceCollected.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Deposited into hotel accounts</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Event Balance</span>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            ₹{totalBanquetReceivables.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">To be collected on event day</p>
        </div>
      </div>

      {/* Available Venues Overview Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Available Venues &amp; Facilities
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {venues.map((v) => {
            const meta = VENUE_TYPE_LABELS[v.type] || VENUE_TYPE_LABELS.BANQUET_HALL;
            return (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                    {v.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>👥 Max: <strong>{v.maxPax} Pax</strong></span>
                    <span>💰 Base: <strong>₹{v.baseRentalRate.toLocaleString('en-IN')}</strong></span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {v.amenities.map((a, idx) => (
                      <span key={idx} className="rounded-md bg-slate-50 dark:bg-slate-950 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setVenueId(v.id);
                      setHallRental(String(v.baseRentalRate));
                      setIsBookModalOpen(true);
                    }}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Book This Space
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bookings Schedule Table */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <input
            type="text"
            placeholder="Search event bookings by client, event name, or booking #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          <div className="flex items-center gap-2 min-w-[170px]">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Status:</span>
            <div className="flex-1">
              <CustomDropdown
                size="sm"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'ENQUIRY', label: 'Enquiry' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <th className="px-4 py-3">Booking #</th>
                  <th className="px-4 py-3">Event &amp; Venue</th>
                  <th className="px-4 py-3">Client Contact</th>
                  <th className="px-4 py-3">Date &amp; Slot</th>
                  <th className="px-4 py-3">Pax</th>
                  <th className="px-4 py-3 text-right">Contract Total</th>
                  <th className="px-4 py-3 text-right">Advance Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-xs dark:divide-slate-800">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {b.bookingNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div>{b.eventName}</div>
                      <div className="text-[11px] text-slate-500 font-normal">🏛️ {b.venueName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{b.clientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.clientPhone}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        {new Date(b.eventDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {b.slot}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      {b.paxCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                      ₹{b.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      ₹{b.advancePaid.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      ₹{b.balanceDue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : b.status === 'COMPLETED'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenFp(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        📋 Print BEO
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-slate-500">
                      No banquet event bookings match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Book Event Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎉</span> Book Banquet, Lawn or Conference Event
              </h2>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Venue Space *
                  </label>
                  <CustomDropdown
                    value={venueId}
                    onChange={(val) => {
                      setVenueId(val);
                      const v = venues.find((x) => x.id === val);
                      if (v) setHallRental(String(v.baseRentalRate));
                    }}
                    options={venues.map((v) => ({
                      value: v.id,
                      label: `${v.name} (Max ${v.maxPax} Pax)`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Event Title / Occasion *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verma Wedding Sangeet & Reception"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Host / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Verma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Client Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98201 54321"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Client Email
                  </label>
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Session Slot *
                  </label>
                  <CustomDropdown
                    value={slot}
                    onChange={(val) => setSlot(val as any)}
                    options={[
                      { value: 'MORNING', label: 'Morning (9:00 AM - 3:00 PM)' },
                      { value: 'EVENING', label: 'Evening (6:00 PM - 11:30 PM)' },
                      { value: 'FULL_DAY', label: 'Full Day (24 Hours)' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pax Count *
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={paxCount}
                    onChange={(e) => setPaxCount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Menu Package
                  </label>
                  <CustomDropdown
                    value={menuPackage}
                    onChange={(val) => {
                      setMenuPackage(val);
                      const pkg = MENU_PACKAGES.find((p) => p.name === val);
                      if (pkg) setRatePerPax(String(pkg.defaultRate));
                    }}
                    options={MENU_PACKAGES.map((p) => ({
                      value: p.name,
                      label: `${p.name} (₹${p.defaultRate}/pax)`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Plate Rate (₹/Pax)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ratePerPax}
                    onChange={(e) => setRatePerPax(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hall Rental (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hallRental}
                    onChange={(e) => setHallRental(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Stage, Decor &amp; AV (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={decorAvCharges}
                    onChange={(e) => setDecorAvCharges(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Advance Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-600 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Special Kitchen / Stage Setup Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Jain counter for 40 guests, live chaat counter by 7:30 PM, stage floral pastel backdrop."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Live Contract Calculation Banner */}
              <div className="rounded-xl bg-slate-900 p-3 text-white flex items-center justify-between font-mono text-xs">
                <span>Calculated Total Contract:</span>
                <span className="text-base font-bold text-teal-300">
                  ₹{totalContract.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? 'Booking…' : 'Confirm Event & Issue BEO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Function Prospectus Modal */}
      {activeFp && (
        <FunctionProspectusModal fp={activeFp} onClose={() => setActiveFp(null)} />
      )}
    </div>
  );
}
