'use client';

import { use, useState } from 'react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: '1', name: 'Paneer Tikka Angara', category: 'Starters', price: 340, isVeg: true, description: 'Cottage cheese cubes marinated in spicy yogurt & tandoori spices.' },
  { id: '2', name: 'Murgh Malai Kebab', category: 'Starters', price: 420, isVeg: false, description: 'Melt-in-mouth chicken chunks with cream, cardamom & cheese.' },
  { id: '3', name: 'Dal Makhani Bukhara', category: 'Mains', price: 320, isVeg: true, description: 'Slow cooked black lentils simmered overnight with butter and fresh cream.' },
  { id: '4', name: 'Butter Chicken Masala', category: 'Mains', price: 460, isVeg: false, description: 'Tandoori chicken in velvety tomato, butter and fenugreek gravy.' },
  { id: '5', name: 'Dum Gosht Hyderabadi Biryani', category: 'Biryani', price: 540, isVeg: false, description: 'Aromatic basmati rice cooked on dum with tender mutton cuts & saffron.' },
  { id: '6', name: 'Subz Dum Biryani', category: 'Biryani', price: 380, isVeg: true, description: 'Fragrant basmati rice layered with seasonal veggies & mint.' },
  { id: '7', name: 'Garlic Butter Naan', category: 'Breads', price: 85, isVeg: true, description: 'Refined flour flatbread brushed with garlic butter.' },
  { id: '8', name: 'Masala Chai Flask', category: 'Beverages', price: 140, isVeg: true, description: 'Freshly brewed Assam tea with cardamom, ginger & lemongrass (Serves 2).' },
  { id: '9', name: 'Gulab Jamun with Rabri', category: 'Desserts', price: 180, isVeg: true, description: 'Warm khoya dumplings soaked in saffron syrup served with reduced milk.' },
];

const QUICK_REQUESTS = [
  { id: 'towels', icon: '🧹', title: 'Clean Room & Fresh Towels', desc: 'Housekeeping turnaround' },
  { id: 'water', icon: '💧', title: '2x Mineral Water Bottles', desc: 'Complimentary bottled water' },
  { id: 'iron', icon: '👔', title: 'Iron & Ironing Board', desc: 'Delivered to your room' },
  { id: 'bellboy', icon: '🧳', title: 'Bellboy Luggage Assistance', desc: 'Luggage pickup / porter' },
  { id: 'wakeup', icon: '⏰', title: 'Morning Wake-Up Call', desc: 'Call from front desk at 7:00 AM' },
];

export function GuestPortalClient({
  searchParams,
  initialSettings,
}: {
  searchParams: Promise<{ room?: string }>;
  initialSettings?: {
    wifiSsid?: string;
    wifiPassword?: string;
    receptionPhone?: string;
    receptionWhatsapp?: string;
    breakfastTiming?: string;
    poolTiming?: string;
    gymTiming?: string;
    googleReviewUrl?: string;
  } | null;
}) {
  const params = use(searchParams);
  const [roomNumber, setRoomNumber] = useState(params.room || '204');
  const [guestName] = useState('Dr. Rajesh Sharma');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'requests' | 'dining' | 'hotel-info'>('requests');
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [orderPlacedTicket, setOrderPlacedTicket] = useState<string | null>(null);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  const wifiSsid = initialSettings?.wifiSsid || 'GrandAzure_Guest_5G';
  const wifiPassword = initialSettings?.wifiPassword || 'Welcome2026!';
  const receptionWhatsapp = initialSettings?.receptionWhatsapp || '+91 98765 43210';
  const breakfastTiming = initialSettings?.breakfastTiming || '7:00 AM - 10:30 AM (Coral Cafe)';
  const poolTiming = initialSettings?.poolTiming || '6:00 AM - 8:00 PM';
  const gymTiming = initialSettings?.gymTiming || '24 Hours (Keycard Access)';
  const googleReviewUrl = initialSettings?.googleReviewUrl || 'https://maps.google.com';

  const showToast = (msg: string) => {
    setActiveToast(msg);
    setTimeout(() => setActiveToast(null), 4000);
  };

  const handleCopyWifi = () => {
    navigator.clipboard.writeText(wifiPassword);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2500);
    showToast('Wi-Fi Password copied to clipboard!');
  };

  const handleServiceRequest = (reqTitle: string) => {
    showToast(`🛎️ Request dispatched: "${reqTitle}" assigned to Housekeeping & Front Desk.`);
  };

  const updateCart = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const totalItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const handlePlaceOrder = () => {
    const ticket = `ORD-RM${roomNumber}-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderPlacedTicket(ticket);
    setCart({});
    showToast(`🍽️ Order ${ticket} confirmed! Food is being prepared in the kitchen.`);
  };

  const hotelPhone = '+919876543210';
  const whatsappUrl = `https://wa.me/${hotelPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hello Front Desk, I am staying in Room ${roomNumber} (${guestName}). I need assistance with: `,
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 font-sans">
      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed top-4 z-50 max-w-sm rounded-2xl bg-teal-500 text-slate-950 px-4 py-3 text-xs font-bold shadow-2xl animate-in slide-in-from-top duration-200">
          {activeToast}
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md space-y-4 pb-20">
        {/* Brand & Property Card */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-400 text-slate-950 font-black text-sm">
                GA
              </span>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide uppercase">Hotel Grand Azure</h1>
                <p className="text-[10px] text-teal-400 font-semibold">5-Star Luxury Resort &amp; Suites</p>
              </div>
            </div>

            {/* Room Selector Capsule */}
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-bold text-white border border-white/15">
              <span>Room</span>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-10 bg-transparent text-center font-black text-teal-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-400 text-[11px]">Welcome guest,</p>
              <p className="font-bold text-white text-sm">{guestName}</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Checked-In
            </span>
          </div>
        </div>

        {/* Digital In-Room Wi-Fi Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-sm flex items-center justify-between shadow-lg">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📶 Room High-Speed Wi-Fi</span>
            <p className="text-xs font-bold text-white">SSID: {wifiSsid}</p>
            <p className="text-[11px] font-mono text-teal-300">Password: {wifiPassword}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyWifi}
            className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white transition active:scale-95"
          >
            {copiedWifi ? '✓ Copied' : '📋 Copy Wi-Fi'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-900 p-1 border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`rounded-xl py-2 transition ${
              activeTab === 'requests' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛎️ Quick Services
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dining')}
            className={`rounded-xl py-2 transition ${
              activeTab === 'dining' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🍽️ Room Dining
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hotel-info')}
            className={`rounded-xl py-2 transition ${
              activeTab === 'hotel-info' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ℹ️ Hotel Guide
          </button>
        </div>

        {/* TAB 1: 1-Tap Quick Front Desk & Housekeeping Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Tap for Instant Service to Room {roomNumber}
            </h2>
            <div className="space-y-2">
              {QUICK_REQUESTS.map((req) => (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => handleServiceRequest(req.title)}
                  className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 hover:bg-slate-800/80 transition active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-xl shrink-0">
                      {req.icon}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{req.title}</p>
                      <p className="text-[11px] text-slate-400">{req.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-400">Request ›</span>
                </button>
              ))}
            </div>

            {/* Direct WhatsApp Reception */}
            <div className="mt-4 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 text-xs font-bold shadow-lg transition active:scale-[0.99]"
              >
                <span>💬 Chat with Front Desk on WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: In-Room Dining Menu */}
        {activeTab === 'dining' && (
          <div className="space-y-3">
            {orderPlacedTicket && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-200 text-xs">
                <p className="font-bold text-sm">✅ Kitchen Order Active: {orderPlacedTicket}</p>
                <p className="mt-1 text-[11px] text-emerald-300/80">
                  Your meal will be delivered directly to Room {roomNumber}. Charges will be posted to your room folio.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                In-Room Dining Menu
              </h2>
              <span className="text-[10px] text-teal-400 font-semibold">Freshly Cooked 24x7</span>
            </div>

            <div className="space-y-2">
              {MENU_ITEMS.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/90 p-3.5"
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.isVeg ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-600/40' : 'bg-rose-900/60 text-rose-400 border border-rose-600/40'
                        }`}>
                          {item.isVeg ? '🟢 VEG' : '🔴 NON-VEG'}
                        </span>
                        <h3 className="text-xs font-bold text-white">{item.name}</h3>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                      <p className="mt-1 font-mono text-xs font-bold text-teal-300">₹{item.price}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 rounded-xl bg-teal-500 text-slate-950 px-2 py-1 font-bold text-xs">
                          <button
                            type="button"
                            onClick={() => updateCart(item.id, -1)}
                            className="px-1 text-sm active:scale-90"
                          >
                            -
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCart(item.id, 1)}
                            className="px-1 text-sm active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateCart(item.id, 1)}
                          className="rounded-xl border border-teal-500/60 bg-teal-500/10 hover:bg-teal-500 hover:text-slate-950 text-teal-300 px-3 py-1.5 text-xs font-bold transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Cart Checkout Bar */}
            {totalItemsCount > 0 && (
              <div className="sticky bottom-4 z-40 rounded-2xl bg-teal-500 text-slate-950 p-3.5 shadow-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">{totalItemsCount} Items Selected</p>
                  <p className="text-sm font-black font-mono">Total: ₹{cartTotal.toFixed(2)}</p>
                </div>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="rounded-xl bg-slate-950 text-white px-4 py-2 text-xs font-bold hover:bg-slate-900 transition active:scale-95 shadow-md"
                >
                  Order to Room {roomNumber} ›
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Hotel Guide & 5-Star Review Booster */}
        {activeTab === 'hotel-info' && (
          <div className="space-y-4">
            {/* Timings & Amenities */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3 text-xs">
              <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">🏨 Hotel Amenities &amp; Timings</h3>
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span>🍳 Breakfast Buffet:</span>
                  <span className="font-semibold text-white">{breakfastTiming}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span>🏊 Swimming Pool:</span>
                  <span className="font-semibold text-white">{poolTiming}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span>🏋️ Fitness Center (Gym):</span>
                  <span className="font-semibold text-white">{gymTiming}</span>
                </div>
                <div className="flex justify-between">
                  <span>🛎️ Reception &amp; Concierge:</span>
                  <span className="font-semibold text-teal-400">Dial 9 or WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Google 5-Star Review Collector Booster */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 p-4 text-center space-y-2">
              <span className="text-2xl">⭐</span>
              <h3 className="font-bold text-white text-sm">Loving your stay with us?</h3>
              <p className="text-[11px] text-slate-400">
                Please take 30 seconds to rate your experience on Google Maps to help our team grow.
              </p>
              <div className="flex justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRating(star);
                      showToast(`Thank you for rating ${star} stars! Opening Google Review page…`);
                    }}
                    className={`text-2xl transition hover:scale-125 ${
                      (rating || 5) >= star ? 'text-amber-400' : 'text-slate-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 rounded-xl bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold shadow-md hover:bg-amber-300 transition"
              >
                Post Review on Google Maps ›
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
