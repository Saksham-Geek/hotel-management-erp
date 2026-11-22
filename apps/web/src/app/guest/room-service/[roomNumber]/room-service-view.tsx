'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  itemCode?: string;
  description?: string;
  price: number;
  foodType: 'veg' | 'non_veg' | 'egg';
  gstRate: number;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface RoomServiceProfile {
  hotelName: string;
  currency: string;
  roomNumber: string;
  floor: number;
  hasActiveStay: boolean;
  guestName: string | null;
  reservationId: string | null;
  categories: MenuCategory[];
}

export function RoomServiceGuestView({
  initialData,
  tenantSlug,
  roomNumber,
}: {
  initialData: RoomServiceProfile;
  tenantSlug: string;
  roomNumber: string;
}) {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, { item: MenuItem; quantity: number; notes: string }>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [guestNotes, setGuestNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allItems = useMemo(() => {
    return initialData.categories.flatMap((c) => c.items);
  }, [initialData.categories]);

  const filteredItems = useMemo(() => {
    return allItems.filter((it) => {
      if (selectedCatId !== 'all' && it.categoryId !== selectedCatId) return false;
      if (dietaryFilter === 'veg' && it.foodType !== 'veg') return false;
      if (dietaryFilter === 'non_veg' && it.foodType !== 'non_veg') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return it.name.toLowerCase().includes(q) || (it.description && it.description.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allItems, selectedCatId, dietaryFilter, searchQuery]);

  // Cart math
  const cartEntries = Object.values(cart).filter((c) => c.quantity > 0);
  const totalItemCount = cartEntries.reduce((sum, c) => sum + c.quantity, 0);
  const subtotal = cartEntries.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const taxTotal = subtotal * 0.05; // 5% GST
  const grandTotal = Math.round(subtotal + taxTotal);

  const updateQuantity = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const current = prev[item.id]?.quantity || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }
      return {
        ...prev,
        [item.id]: {
          item,
          quantity: next,
          notes: prev[item.id]?.notes || '',
        },
      };
    });
  };

  const handlePlaceOrder = async () => {
    if (cartEntries.length === 0) return;
    setIsOrdering(true);
    setErrorMessage(null);

    try {
      const payload = {
        tenantSlug,
        roomNumber,
        items: cartEntries.map((c) => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
          specialNotes: c.notes || undefined,
        })),
        guestInstructions: guestNotes.trim() || undefined,
      };

      const res = await fetch('/api/guest/room-service/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Order failed to place.');
      }

      setConfirmedOrder(data);
      setCart({});
      setIsCartOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch order to kitchen');
    } finally {
      setIsOrdering(false);
    }
  };

  // If no active guest is checked into this room
  if (!initialData.hasActiveStay) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-800/80 p-8 backdrop-blur-md shadow-2xl">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/20 text-3xl text-amber-400">
            🛎️
          </div>
          <h1 className="text-2xl font-black">{initialData.hotelName}</h1>
          <div className="mt-2 inline-block rounded-full bg-slate-700/80 px-3.5 py-1 text-xs font-bold text-slate-300">
            Room {roomNumber} • Floor {initialData.floor}
          </div>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Room {roomNumber} does not currently have an active checked-in guest stay registered in our system.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400 text-left space-y-1">
            <p className="font-semibold text-slate-200">How to proceed:</p>
            <p>• If you just arrived, please complete check-in at the front desk lobby.</p>
            <p>• If you are already checked in, dial Front Desk &quot;9&quot; from your in-room intercom telephone.</p>
          </div>
        </div>
      </div>
    );
  }

  // Order Confirmed Screen
  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 shadow-2xl">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-4xl text-emerald-400 animate-bounce">
            🍳
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400 uppercase tracking-widest">
            Order Sent to Kitchen
          </span>
          <h1 className="mt-3 text-2xl font-black">Thank you, {confirmedOrder.guestName}!</h1>
          <p className="mt-1 text-xs text-slate-400">
            Your dining order for <strong className="text-white">Room {confirmedOrder.roomNumber}</strong> is now being freshly prepared.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">KOT Reference:</span>
              <span className="font-mono font-bold text-emerald-400">#{confirmedOrder.kotNumber}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Billed:</span>
              <span className="font-bold text-white">₹{confirmedOrder.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Billed To:</span>
              <span className="font-semibold text-indigo-300">Room Folio (Pay at Checkout)</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/10 pt-2">
              <span className="text-slate-400">Estimated Delivery:</span>
              <span className="font-bold text-amber-400">~{confirmedOrder.estimatedMinutes} minutes</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmedOrder(null)}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg"
          >
            Order More Dishes →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Top Welcome Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-black">
                🛎️
              </span>
              <h1 className="text-base font-extrabold tracking-tight text-white">
                {initialData.hotelName}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Welcome <strong className="text-slate-200">{initialData.guestName}</strong> • Room {roomNumber}
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-[11px] font-bold text-emerald-300">
            In-Room Dining
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
        {/* Search & Dietary Toggle */}
        <div className="space-y-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search appetizers, biryani, beverages..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setDietaryFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  dietaryFilter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter('veg')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  dietaryFilter === 'veg' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span>🟢</span>
                <span>Pure Veg</span>
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter('non_veg')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  dietaryFilter === 'non_veg' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <span>🔴</span>
                <span>Non-Veg</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills - Wraps cleanly with zero horizontal scroll */}
        <div className="mt-4 flex flex-wrap gap-2 pb-2">
          <button
            type="button"
            onClick={() => setSelectedCatId('all')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              selectedCatId === 'all'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
            }`}
          >
            Full Menu ({allItems.length})
          </button>
          {initialData.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatId(cat.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                selectedCatId === cat.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>

        {/* Dish Items List */}
        <div className="mt-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400 text-sm">
              No dishes found matching your current filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const qty = cart[item.id]?.quantity || 0;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-sm border p-0.5 ${
                          item.foodType === 'veg'
                            ? 'border-emerald-500'
                            : item.foodType === 'non_veg'
                            ? 'border-rose-500'
                            : 'border-amber-500'
                        }`}
                      >
                        <span
                          className={`block h-full w-full rounded-full ${
                            item.foodType === 'veg'
                              ? 'bg-emerald-500'
                              : item.foodType === 'non_veg'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                      </span>
                      <h3 className="font-bold text-sm text-white truncate">{item.name}</h3>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-extrabold text-emerald-400">
                      ₹{item.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Stepper / Add Button */}
                  <div className="shrink-0 flex items-center">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, 1)}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-4 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition active:scale-95 shadow-xs"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="flex items-center rounded-xl border border-emerald-500/40 bg-emerald-950/80">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item, -1)}
                          className="px-2.5 py-1 text-sm font-bold text-emerald-300 hover:text-white"
                        >
                          −
                        </button>
                        <span className="px-2 font-mono text-xs font-bold text-white">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item, 1)}
                          className="px-2.5 py-1 text-sm font-bold text-emerald-300 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-0 right-0 z-50 px-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div>
              <span className="text-xs font-bold text-emerald-400">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in order
              </span>
              <p className="text-base font-black text-white">₹{grandTotal.toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition active:scale-95"
            >
              View Order Cart →
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer / Bottom Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs sm:items-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Your Room Dining Order</h2>
                <p className="text-xs text-slate-400">Delivery to Room {roomNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {cartEntries.map(({ item, quantity, notes }) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{item.name}</span>
                    <span className="font-bold text-xs text-emerald-400">
                      ₹{(item.price * quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      placeholder="Special note (e.g. less spicy)..."
                      value={notes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCart((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], notes: val },
                        }));
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none w-3/5"
                    />
                    <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.05]">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, -1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-300 hover:text-white"
                      >
                        −
                      </button>
                      <span className="px-2 text-xs font-bold text-white">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, 1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-300 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Kitchen Instruction */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  General Cooking / Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  placeholder="e.g. Please bring extra cutlery, leave on outside trolley..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              {/* Bill Breakdown */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (5% F&B):</span>
                  <span>₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white border-t border-white/10 pt-1.5">
                  <span>Total Amount:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Place Order CTA */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <button
                type="button"
                disabled={isOrdering}
                onClick={handlePlaceOrder}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-xl hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isOrdering ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Routing to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Order & Charge to Room {roomNumber}</span>
                    <span>→</span>
                  </>
                )}
              </button>
              <p className="mt-1.5 text-center text-[10px] text-slate-500">
                Auto-charged to room folio • Settle at check-out
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
