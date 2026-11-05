'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createDirectBookingAction } from './actions';

function money(amount: number | null | undefined, currency = 'INR') {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export interface RoomType {
  id: string;
  name: string;
  baseRate: number;
  capacity: number;
  description: string | null;
  totalKeys: number;
}

export interface HotelBookingProfile {
  tenant: {
    id: string;
    slug: string;
    name: string;
    currency: string;
  };
  properties: Array<{
    id: string;
    name: string;
    timezone: string;
    currency: string;
    is_default: boolean;
  }>;
  activeProperty: {
    id: string;
    name: string;
    timezone: string;
    currency: string;
  };
  roomTypes: RoomType[];
}

export function BookingView({ profile }: { profile: HotelBookingProfile }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkInDefault = tomorrow.toISOString().split('T')[0];
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);
  const checkOutDefault = dayAfter.toISOString().split('T')[0];

  const [selectedPropertyId, setSelectedPropertyId] = useState(profile.activeProperty.id);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState(profile.roomTypes[0]?.id ?? '');
  const [checkIn, setCheckIn] = useState(checkInDefault);
  const [checkOut, setCheckOut] = useState(checkOutDefault);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'hotel' | 'upi'>('hotel');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  const selectedRoom = profile.roomTypes.find((r) => r.id === selectedRoomTypeId) ?? profile.roomTypes[0];
  const activeProperty = profile.properties.find((p) => p.id === selectedPropertyId) ?? profile.activeProperty;

  // Nights calculation
  const dIn = new Date(checkIn);
  const dOut = new Date(checkOut);
  const nights = Math.max(1, Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24)));
  const subtotal = (selectedRoom?.baseRate ?? 0) * nights;
  const gstRate = (selectedRoom?.baseRate ?? 0) > 7500 ? 0.18 : 0.12;
  const taxTotal = Math.round(subtotal * gstRate);
  const grandTotal = subtotal + taxTotal;

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = await createDirectBookingAction({
      tenantSlug: profile.tenant.slug,
      propertyId: selectedPropertyId,
      roomTypeId: selectedRoomTypeId,
      checkIn,
      checkOut,
      guestName,
      guestPhone,
      guestEmail: guestEmail || undefined,
      specialRequests: specialRequests || undefined,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error ?? 'Failed to complete booking');
      return;
    }

    setConfirmedBooking(res.data);
  }

  // Pre-configured room tags
  const suiteFeatures = [
    'Complimentary High-Speed Wi-Fi',
    'Luxury King Bedding & Pillow Menu',
    '24/7 In-Room Dining Service',
    'Marble Ensuite with Rain Shower',
    'Curated Welcome Refreshment Platter',
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Brand Banner */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 font-black shadow-md">
              ✦
            </span>
            <div>
              <p className="font-display text-base font-extrabold tracking-tight text-white">
                {profile.tenant.name}
              </p>
              <p className="text-[11px] font-semibold text-amber-300">
                Direct Guest Reservation Portal · 0% OTA Commission Guarantee
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Best Rate Guaranteed
            </span>
          </div>
        </div>
      </header>

      {/* Confirmation State */}
      {confirmedBooking ? (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-950 p-6 sm:p-10 shadow-2xl relative">
            <div className="text-center space-y-3">
              <span className="inline-grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/20 text-3xl text-emerald-400 border border-emerald-500/30 shadow-lg">
                ✓
              </span>
              <h1 className="font-display text-3xl font-extrabold text-white">
                Reservation Confirmed!
              </h1>
              <p className="text-sm text-slate-300">
                Your luxury stay has been reserved directly at <strong className="text-white">{confirmedBooking.hotelName}</strong>.
              </p>
              <div className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-mono font-bold text-amber-300">
                Booking Reference: {confirmedBooking.bookingReference}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs sm:grid-cols-4">
              <div>
                <p className="text-slate-400">Check-in</p>
                <p className="mt-1 font-bold text-white text-sm">{confirmedBooking.checkIn}</p>
                <p className="text-[10px] text-slate-400">From 2:00 PM</p>
              </div>
              <div>
                <p className="text-slate-400">Check-out</p>
                <p className="mt-1 font-bold text-white text-sm">{confirmedBooking.checkOut}</p>
                <p className="text-[10px] text-slate-400">Until 11:00 AM</p>
              </div>
              <div>
                <p className="text-slate-400">Suite Category</p>
                <p className="mt-1 font-bold text-white text-sm">{confirmedBooking.roomType}</p>
                <p className="text-[10px] text-amber-300">Room #{confirmedBooking.roomNumber}</p>
              </div>
              <div>
                <p className="text-slate-400">Total Payable</p>
                <p className="mt-1 font-bold text-emerald-400 text-sm">{money(confirmedBooking.grossTotal, confirmedBooking.currency)}</p>
                <p className="text-[10px] text-slate-400">Incl. {confirmedBooking.gstRate}% GST</p>
              </div>
            </div>

            {/* WhatsApp Confirmation Dispatch */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(
                  confirmedBooking.guestPhone.replace(/[^0-9]/g, ''),
                )}&text=${encodeURIComponent(
                  `*Reservation Confirmed at ${confirmedBooking.hotelName}*\n\n` +
                    `Ref: *${confirmedBooking.bookingReference}*\n` +
                    `Guest: ${confirmedBooking.guestName}\n` +
                    `Suite: ${confirmedBooking.roomType} (Room #${confirmedBooking.roomNumber})\n` +
                    `Check-in: ${confirmedBooking.checkIn} (from 2:00 PM)\n` +
                    `Check-out: ${confirmedBooking.checkOut} (until 11:00 AM)\n` +
                    `Total Tariff: ${money(confirmedBooking.grossTotal, confirmedBooking.currency)}\n\n` +
                    `We look forward to welcoming you!`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/30"
              >
                <span>💬 Receive Confirmation on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Book Another Stay
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* Booking Engine Main View */
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
          {/* Hotel Hero Card */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 text-sm">
                  <span>★★★★★</span>
                  <span className="text-xs text-slate-300 font-semibold ml-1">5-Star Luxury Experience</span>
                </div>
                <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {profile.tenant.name}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {activeProperty.name} · India
                </p>
              </div>

              {/* Property Selector for Multi-Hotel Chains */}
              {profile.properties.length > 1 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="property-picker" className="text-xs text-slate-400">Select Property:</label>
                  <select
                    id="property-picker"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                  >
                    {profile.properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Booking Engine Grid */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            {/* Left: Room Types Selection */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">
                  1. Select Your Suite or Room
                </h2>
                <span className="text-xs text-slate-400">
                  {profile.roomTypes.length} Available Categories
                </span>
              </div>

              <div className="space-y-4">
                {profile.roomTypes.map((room) => {
                  const isSelected = room.id === selectedRoomTypeId;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomTypeId(room.id)}
                      className={`relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/20 shadow-lg ring-1 ring-amber-400/50'
                          : 'border-white/10 bg-slate-950/60 hover:border-white/25 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-lg font-bold text-white">
                              {room.name}
                            </span>
                            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                              Up to {room.capacity} Guests
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400 leading-relaxed max-w-md">
                            {room.description ||
                              'Indulge in spacious contemporary luxury with handcrafted furnishings, personalized butler service, and scenic views.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {suiteFeatures.slice(0, 3).map((f) => (
                              <span
                                key={f}
                                className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] text-slate-300"
                              >
                                ✓ {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-right sm:border-l sm:border-white/10 sm:pl-6 shrink-0">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Nightly Tariff
                          </p>
                          <p className="mt-0.5 font-display text-2xl font-black text-amber-300">
                            {money(room.baseRate, profile.tenant.currency)}
                          </p>
                          <p className="text-[10px] text-slate-400">+ GST 18%</p>
                          <button
                            type="button"
                            className={`mt-3 w-full rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-md'
                                : 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
                            }`}
                          >
                            {isSelected ? '✓ Selected' : 'Choose Room'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Stay Dates & Guest Details Form */}
            <div className="space-y-6">
              <h2 className="font-display text-xl font-bold text-white">
                2. Stay Dates &amp; Guest Details
              </h2>

              <form
                onSubmit={handleBook}
                className="rounded-3xl border border-white/10 bg-slate-950 p-6 sm:p-7 shadow-xl space-y-5"
              >
                {/* Stay Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="check-in-date" className="block text-xs font-semibold text-slate-300">
                      Check-in Date
                    </label>
                    <input
                      id="check-in-date"
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="check-out-date" className="block text-xs font-semibold text-slate-300">
                      Check-out Date
                    </label>
                    <input
                      id="check-out-date"
                      type="date"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Guest Contact Details */}
                <div>
                  <label htmlFor="guest-full-name" className="block text-xs font-semibold text-slate-300">
                    Primary Guest Full Name
                  </label>
                  <input
                    id="guest-full-name"
                    required
                    placeholder="e.g. Vikramaditya Singhania"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="guest-whatsapp-mobile" className="block text-xs font-semibold text-slate-300">
                      Mobile (WhatsApp)
                    </label>
                    <input
                      id="guest-whatsapp-mobile"
                      required
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-email-address" className="block text-xs font-semibold text-slate-300">
                      Email Address
                    </label>
                    <input
                      id="guest-email-address"
                      type="email"
                      placeholder="vikram@domain.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="guest-special-requests" className="block text-xs font-semibold text-slate-300">
                    Special Requests / VIP Notes
                  </label>
                  <textarea
                    id="guest-special-requests"
                    rows={2}
                    placeholder="Airport pickup, high floor, non-smoking, anniversary cake…"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-xs text-white shadow-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Price Summary Breakdown */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>
                      {selectedRoom?.name} ({nights} Night{nights > 1 ? 's' : ''})
                    </span>
                    <span className="font-semibold text-white">
                      {money(subtotal, profile.tenant.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Statutory Indian GST ({Math.round(gstRate * 100)}%)</span>
                    <span>{money(taxTotal, profile.tenant.currency)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-white">
                    <span>Total Payable Tariff</span>
                    <span className="text-amber-300 font-extrabold text-base">
                      {money(grandTotal, profile.tenant.currency)}
                    </span>
                  </div>
                </div>

                {/* Payment Option */}
                <div>
                  <p className="block text-xs font-semibold text-slate-300 mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentChoice('hotel')}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                        paymentChoice === 'hotel'
                          ? 'border-amber-400 bg-amber-400/10 text-white font-bold'
                          : 'border-white/15 bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span>🏨 Pay at Check-in</span>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5">Card or Cash on arrival</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentChoice('upi')}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                        paymentChoice === 'upi'
                          ? 'border-amber-400 bg-amber-400/10 text-white font-bold'
                          : 'border-white/15 bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span>📱 Scan-to-Pay UPI</span>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5">Instant GPay, PhonePe, Paytm</span>
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Confirming Reservation…' : `Confirm Luxury Stay · ${money(grandTotal, profile.tenant.currency)}`}
                </button>

                <p className="text-center text-[10px] text-slate-500">
                  By confirming, you receive zero-cancellation fee protection up to 24h before arrival.
                </p>
              </form>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
