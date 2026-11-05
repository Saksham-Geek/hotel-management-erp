'use client';

import { useState } from 'react';
import { KotPrintModal, type KotPrintData } from './kot-print-modal';
import {
  createKotOrderAction,
  updateKotStatusAction,
  chargeKotToRoomAction,
  settleKotDirectAction,
} from './actions';

export interface OutletDto {
  id: string;
  name: string;
  code: string;
  outletType: string;
  isActive: boolean;
}

export interface TableDto {
  id: string;
  outletId: string;
  tableNumber: string;
  capacity: number;
  status: 'vacant' | 'occupied' | 'billed';
  activeKotId?: string | null;
  outletName: string;
  activeKotNumber?: string | null;
  activeTotalAmount?: number | null;
  activeGuestName?: string | null;
  activeOrderTime?: string | null;
}

export interface MenuItemDto {
  id: string;
  categoryId: string;
  name: string;
  itemCode: string;
  description: string | null;
  price: string | number;
  foodType: 'veg' | 'non_veg' | 'egg';
  sacCode: string;
  gstRate: string | number;
  isAvailable: boolean;
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItemDto[];
}

export interface KotOrderDto {
  id: string;
  kotNumber: string;
  orderType: 'dine_in' | 'room_service' | 'takeaway';
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'settled' | 'cancelled';
  paymentStatus: 'unpaid' | 'charged_to_room' | 'paid_direct';
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  specialInstructions: string | null;
  guestName: string | null;
  serverName: string | null;
  createdAt: string;
  outletName: string;
  tableNumber: string | null;
  roomNumber: string | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: string | number;
    gstRate: string | number;
    foodType: string;
    specialNotes: string | null;
    status: string;
  }[];
}

export interface CheckedInRoomDto {
  id: string;
  number: string;
  guestName: string;
  reservationId: string;
}

export function RestaurantPosView({
  outlets,
  tables,
  categories,
  kots,
  checkedInRooms,
}: {
  outlets: OutletDto[];
  tables: TableDto[];
  categories: MenuCategoryDto[];
  kots: KotOrderDto[];
  checkedInRooms: CheckedInRoomDto[];
}) {
  const [selectedOutletId, setSelectedOutletId] = useState(outlets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'pos' | 'tables' | 'kds'>('pos');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart / Order State
  const [orderType, setOrderType] = useState<'dine_in' | 'room_service' | 'takeaway'>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(checkedInRooms[0]?.number || '');
  const [guestName, setGuestName] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cart, setCart] = useState<
    {
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      gstRate: number;
      foodType: 'veg' | 'non_veg' | 'egg';
      specialNotes: string;
    }[]
  >([]);

  // Action Pending States
  const [submitting, setSubmitting] = useState(false);
  const [printSlip, setPrintSlip] = useState<KotPrintData | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Active Outlet
  const activeOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  // Filtered Menu Items
  const allItems = categories.flatMap((c) => c.items);
  const filteredItems = allItems.filter((it) => {
    if (selectedCategory !== 'all' && it.categoryId !== selectedCategory) return false;
    if (dietaryFilter === 'veg' && it.foodType !== 'veg') return false;
    if (dietaryFilter === 'non_veg' && it.foodType !== 'non_veg') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return it.name.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q);
    }
    return true;
  });

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // SAC 996331 5% Restaurant GST
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

  function addToCart(item: MenuItemDto) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          itemName: item.name,
          quantity: 1,
          unitPrice: Number(item.price),
          gstRate: Number(item.gstRate) || 5.0,
          foodType: item.foodType,
          specialNotes: '',
        },
      ];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as typeof cart
    );
  }

  function updateItemNote(menuItemId: string, note: string) {
    setCart((prev) =>
      prev.map((item) => (item.menuItemId === menuItemId ? { ...item, specialNotes: note } : item))
    );
  }

  async function handleDispatchKot() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setFeedbackMsg(null);

    const activeRoom = checkedInRooms.find((r) => r.number === selectedRoomNumber);
    const activeTable = tables.find((t) => t.id === selectedTableId);

    const res = await createKotOrderAction({
      outletId: selectedOutletId,
      tableId: orderType === 'dine_in' ? selectedTableId : undefined,
      reservationId: orderType === 'room_service' ? activeRoom?.reservationId : undefined,
      roomNumber: orderType === 'room_service' ? selectedRoomNumber : undefined,
      orderType,
      guestName:
        guestName ||
        (orderType === 'room_service' ? activeRoom?.guestName || `Room ${selectedRoomNumber}` : `Table ${activeTable?.tableNumber || ''}`),
      specialInstructions,
      items: cart,
    });

    setSubmitting(false);

    if (res.ok) {
      setFeedbackMsg({
        type: 'ok',
        text: `Kitchen Order Ticket ${res.data.kotNumber} generated successfully and sent to kitchen printer & KDS!`,
      });
      // Launch 80mm printable thermal slip
      setPrintSlip({
        kotNumber: res.data.kotNumber,
        orderType,
        outletName: activeOutlet?.name || 'Restaurant',
        tableNumber: orderType === 'dine_in' ? activeTable?.tableNumber : undefined,
        roomNumber: orderType === 'room_service' ? selectedRoomNumber : undefined,
        guestName: guestName || (orderType === 'room_service' ? activeRoom?.guestName : undefined),
        createdAt: new Date().toISOString(),
        specialInstructions,
        items: cart.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          foodType: i.foodType,
          specialNotes: i.specialNotes,
        })),
      });
      setCart([]);
      setSpecialInstructions('');
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to dispatch KOT' });
    }
  }

  async function handleChargeToRoom(kotId: string, roomNum: string, reservationId: string) {
    setSubmitting(true);
    const res = await chargeKotToRoomAction(kotId, {
      roomNumber: roomNum,
      reservationId,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedbackMsg({ type: 'ok', text: res.data.message });
    } else {
      setFeedbackMsg({ type: 'err', text: res.error || 'Failed to charge to room' });
    }
  }

  async function handleUpdateKotStatus(kotId: string, status: KotOrderDto['status']) {
    setSubmitting(true);
    const res = await updateKotStatusAction(kotId, status);
    setSubmitting(false);
    if (!res.ok) setFeedbackMsg({ type: 'err', text: res.error || 'Status update failed' });
  }

  return (
    <div className="space-y-6">
      {/* 80mm ESC/POS Thermal Print Slip Modal */}
      {printSlip && <KotPrintModal data={printSlip} onClose={() => setPrintSlip(null)} />}

      {/* Top Controls & Navigation Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
            <RestaurantIcon />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
                Petpooja F&amp;B Restaurant POS
              </h1>
              <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-200 dark:border-emerald-800">
                SAC 996331 · 5% GST
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Integrated Kitchen Order Tickets (KOT), Table Floor Plan, and 1-Click Room Folio Billing.
            </p>
          </div>
        </div>

        {/* Outlet Switcher & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Outlet Selector */}
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.outletType.replace('_', ' ').toUpperCase()})
              </option>
            ))}
          </select>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/[0.05] p-1 border border-slate-200/80 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🍽️ Touch POS &amp; Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🪑 Table Floor Plan ({tables.filter((t) => t.status === 'occupied').length} Active)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kds')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'kds'
                  ? 'bg-white dark:bg-white/20 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              👨‍🍳 Kitchen Display (KDS) ({kots.length})
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-bold shadow-xs transition-all ${
            feedbackMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-950 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: TOUCH POS & ORDERING DRAWER */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-6 items-start">
          
          {/* Left Column: Menu Item Showcase */}
          <div className="space-y-4">
            
            {/* Search & Dietary Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-4 shadow-sm">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search dish or item code (e.g. Butter Chicken, APP-01)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-9 pr-4 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">
                  🔍
                </span>
              </div>

              {/* Veg / Non-Veg Toggles */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/[0.05] p-1 border border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setDietaryFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    dietaryFilter === 'all'
                      ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  All Food
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryFilter('veg')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    dietaryFilter === 'veg'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Pure Veg
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryFilter('non_veg')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    dietaryFilter === 'non_veg'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Non-Veg
                </button>
              </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer border ${
                  selectedCategory === 'all'
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                All Menu ({allItems.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer border ${
                    selectedCategory === c.id
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1222] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {c.name} ({c.items.length})
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-4 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {item.itemCode}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold">
                        {item.foodType === 'veg' ? (
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Veg
                          </span>
                        ) : item.foodType === 'non_veg' ? (
                          <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Non-Veg
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Egg
                          </span>
                        )}
                      </span>
                    </div>

                    <h3 className="font-display text-sm font-bold text-ink mt-1.5 leading-snug">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-normal">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3">
                    <div>
                      <p className="font-mono text-sm font-black text-ink">
                        ₹{Number(item.price).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[9px] text-slate-400">+5% GST (SAC 996331)</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
                    >
                      <span>+ Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Live Petpooja Order Cart & Folio Dispatcher */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-5 shadow-md sticky top-6">
            
            {/* Cart Header */}
            <div className="border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
                  <span>🛒 Current KOT Order</span>
                  <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {cart.reduce((s, i) => s + i.quantity, 0)} Items
                  </span>
                </h2>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Order Type Selector */}
              <div className="mt-3.5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] p-1 border border-slate-200/70 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setOrderType('dine_in')}
                  className={`rounded-lg py-1.5 text-center text-xs font-bold transition-all cursor-pointer ${
                    orderType === 'dine_in'
                      ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🍽️ Dine-In
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('room_service')}
                  className={`rounded-lg py-1.5 text-center text-xs font-bold transition-all cursor-pointer ${
                    orderType === 'room_service'
                      ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🛎️ Room Service
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`rounded-lg py-1.5 text-center text-xs font-bold transition-all cursor-pointer ${
                    orderType === 'takeaway'
                      ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  📦 Takeaway
                </button>
              </div>

              {/* Destination Dropdown */}
              <div className="mt-3">
                {orderType === 'dine_in' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Dining Table
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                    >
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.tableNumber} ({t.capacity} Guests) · {t.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {orderType === 'room_service' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Occupied Guest Room
                    </label>
                    <select
                      value={selectedRoomNumber}
                      onChange={(e) => setSelectedRoomNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                    >
                      {checkedInRooms.map((r) => (
                        <option key={r.id} value={r.number}>
                          Room {r.number} — {r.guestName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Item Rows */}
            <div className="my-4 max-h-[300px] overflow-y-auto space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <p className="text-2xl mb-1">🍲</p>
                  <p className="font-semibold">Your order is empty</p>
                  <p className="text-[11px] mt-0.5">Click any dish from the menu to add to KOT.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex flex-col gap-1.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink flex-1 truncate pr-2">
                        {item.foodType === 'veg' ? '🟢 ' : '🔴 '}
                        {item.itemName}
                      </span>
                      <span className="font-mono font-bold text-ink">
                        ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Stepper */}
                      <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.menuItemId, -1)}
                          className="px-2 py-0.5 font-bold hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-[11px]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.menuItemId, 1)}
                          className="px-2 py-0.5 font-bold hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Special Cooking Note Input */}
                      <input
                        type="text"
                        placeholder="Add cooking note (e.g. less spicy)..."
                        value={item.specialNotes}
                        onChange={(e) => updateItemNote(item.menuItemId, e.target.value)}
                        className="w-40 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-transparent px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Special Instructions */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Kitchen Notes &amp; Allergies
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jain preparation, send water, extra cutleries..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            )}

            {/* Bill Summary */}
            <div className="border-t border-slate-100 dark:border-white/10 pt-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted">
                <span>Food &amp; Beverage Subtotal:</span>
                <span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Restaurant GST (5% SAC 996331):</span>
                <span className="font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-ink text-sm border-t border-slate-100 dark:border-white/10 pt-2">
                <span>Net Order Amount:</span>
                <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* KOT Dispatch Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                disabled={cart.length === 0 || submitting}
                onClick={handleDispatchKot}
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>⚡ Dispatch Kitchen Order Ticket (KOT)</span>
              </button>

              {orderType === 'room_service' && (
                <p className="text-[10px] text-center text-slate-500 italic">
                  Tip: KOT generates immediately for chef. You can charge to guest folio upon delivery.
                </p>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INTERACTIVE TABLE FLOOR PLAN */}
      {/* ========================================================================= */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">
              {activeOutlet?.name} — Dining Tables Floor Plan
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Vacant ({tables.filter((t) => t.status === 'vacant').length})
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                Occupied / Active KOT ({tables.filter((t) => t.status === 'occupied').length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((tbl) => (
              <div
                key={tbl.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all ${
                  tbl.status === 'occupied'
                    ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20'
                    : 'border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-black text-ink">{tbl.tableNumber}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        tbl.status === 'occupied'
                          ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200'
                      }`}
                    >
                      {tbl.status === 'occupied' ? '🟡 KOT ACTIVE' : '🟢 VACANT'}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted mt-1">Capacity: {tbl.capacity} Covers</p>

                  {tbl.status === 'occupied' && tbl.activeKotNumber && (
                    <div className="mt-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-white/80 dark:bg-black/30 p-2.5 text-xs">
                      <div className="flex justify-between font-mono font-bold text-amber-950 dark:text-amber-200">
                        <span>{tbl.activeKotNumber}</span>
                        <span>₹{Number(tbl.activeTotalAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        Guest: {tbl.activeGuestName || 'Dine-In Guest'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                  {tbl.status === 'vacant' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableId(tbl.id);
                        setOrderType('dine_in');
                        setActiveTab('pos');
                      }}
                      className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      + Take Order
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const kot = kots.find((k) => k.id === tbl.activeKotId);
                          if (kot) {
                            setPrintSlip({
                              kotNumber: kot.kotNumber,
                              orderType: 'dine_in',
                              outletName: tbl.outletName,
                              tableNumber: tbl.tableNumber,
                              guestName: kot.guestName,
                              createdAt: kot.createdAt,
                              items: kot.items,
                            });
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Print KOT
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (tbl.activeKotId) {
                            await settleKotDirectAction(tbl.activeKotId);
                          }
                        }}
                        className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                      >
                        Settle Bill
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: KITCHEN DISPLAY SCREEN (KDS) */}
      {/* ========================================================================= */}
      {activeTab === 'kds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                👨‍🍳 Kitchen Display Screen (Live KDS Board)
              </h2>
              <p className="text-xs text-muted">
                Real-time active tickets dispatched to the kitchen. Mark preparation states as orders progress.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-500">
              Active Cooking Tickets: {kots.length}
            </span>
          </div>

          {kots.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-12 text-center text-slate-400">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-display text-base font-bold text-ink">All Kitchen Orders Cleared!</p>
              <p className="text-xs text-muted mt-1">No pending or cooking KOT tickets at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kots.map((kot) => {
                const elapsedMin = Math.round(
                  (Date.now() - new Date(kot.createdAt).getTime()) / 60000
                );
                return (
                  <div
                    key={kot.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1222] p-4 shadow-md overflow-hidden"
                  >
                    <div>
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
                        <div>
                          <p className="font-mono text-base font-black text-ink">{kot.kotNumber}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {kot.outletName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              elapsedMin > 20
                                ? 'bg-rose-100 text-rose-800 animate-pulse'
                                : elapsedMin > 10
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            ⏱️ {elapsedMin}m ago
                          </span>
                        </div>
                      </div>

                      {/* Destination Pill */}
                      <div className="mt-2.5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.03] p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>
                          {kot.orderType === 'dine_in' ? `Table ${kot.tableNumber}` : `Room Service: Room ${kot.roomNumber}`}
                        </span>
                        <span className="text-[11px] font-normal text-muted truncate max-w-[130px]">
                          {kot.guestName}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="my-3 space-y-2 text-xs">
                        {kot.items.map((it, idx) => (
                          <div key={idx} className="flex flex-col">
                            <div className="flex items-baseline justify-between font-bold text-ink">
                              <span className="font-black text-emerald-700 dark:text-emerald-400">
                                {it.quantity} x
                              </span>
                              <span className="flex-1 text-left px-2">
                                {it.foodType === 'veg' ? '🟢 ' : '🔴 '}
                                {it.itemName}
                              </span>
                            </div>
                            {it.specialNotes && (
                              <p className="ml-6 text-[10px] font-bold text-red-600 italic">
                                ↳ {it.specialNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {kot.specialInstructions && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2 text-[10px] text-red-700 dark:text-red-300 font-medium">
                          <strong>Note:</strong> {kot.specialInstructions}
                        </div>
                      )}
                    </div>

                    {/* Status Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateKotStatus(kot.id, 'preparing')}
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                            kot.status === 'preparing'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'
                          }`}
                        >
                          🍳 Cooking
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateKotStatus(kot.id, 'ready')}
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                            kot.status === 'ready'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'
                          }`}
                        >
                          🔔 Ready
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateKotStatus(kot.id, 'served')}
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                            kot.status === 'served'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'
                          }`}
                        >
                          ✅ Served
                        </button>
                      </div>

                      {/* 1-Click Charge to Room Button (If Room Service) */}
                      {kot.orderType === 'room_service' && kot.roomNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            const activeRoom = checkedInRooms.find((r) => r.number === kot.roomNumber);
                            if (activeRoom) {
                              handleChargeToRoom(kot.id, kot.roomNumber!, activeRoom.reservationId);
                            }
                          }}
                          className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>🏨 1-Click Charge ₹{Number(kot.totalAmount).toLocaleString('en-IN')} to Room {kot.roomNumber}</span>
                        </button>
                      )}

                      {/* Print KOT Slip Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setPrintSlip({
                            kotNumber: kot.kotNumber,
                            orderType: kot.orderType,
                            outletName: kot.outletName,
                            tableNumber: kot.tableNumber,
                            roomNumber: kot.roomNumber,
                            guestName: kot.guestName,
                            createdAt: kot.createdAt,
                            specialInstructions: kot.specialInstructions,
                            items: kot.items,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Print 80mm KOT Slip
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function RestaurantIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  );
}
