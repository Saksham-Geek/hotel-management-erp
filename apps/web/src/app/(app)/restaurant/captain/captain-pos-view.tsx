'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createKotOrderAction, punchKotRoundAction } from '../actions';
import { KotPrintModal, type KotPrintData } from '../kot-print-modal';
import type {
  OutletDto,
  TableDto,
  MenuCategoryDto,
  KotOrderDto,
  CheckedInRoomDto,
} from '../restaurant-pos-view';

const NOTE_PRESETS = ['Less Spicy', 'Extra Spicy', 'Jain / No Onion Garlic', 'Serve First', 'Parcel'];

export function CaptainPosView({
  user,
  outlets,
  tables,
  categories,
  kots,
  checkedInRooms,
}: {
  user: { fullName?: string; email?: string; role?: string };
  outlets: OutletDto[];
  tables: TableDto[];
  categories: MenuCategoryDto[];
  kots: KotOrderDto[];
  checkedInRooms: CheckedInRoomDto[];
}) {
  const router = useRouter();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, { item: any; quantity: number; notes: string }>>({});
  const [isPunching, setIsPunching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [printSlip, setPrintSlip] = useState<KotPrintData | null>(null);

  const activeOutlet = outlets.find((o) => o.outletType === 'dine_in') || outlets[0];

  // Active table object
  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Existing active order for the selected table
  const activeKotForTable = useMemo(() => {
    if (!selectedTable) return null;
    return kots.find(
      (k) =>
        (k.tableNumber === selectedTable.tableNumber || selectedTable.activeKotId === k.id) &&
        k.status !== 'settled' &&
        k.status !== 'cancelled'
    ) || null;
  }, [kots, selectedTable]);

  // Sections list for filtering tables
  const sections = useMemo(() => {
    return Array.from(new Set(tables.map((t) => t.section || 'General')));
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (sectionFilter !== 'all' && (t.section || 'General') !== sectionFilter) return false;
      return true;
    });
  }, [tables, sectionFilter]);

  // All menu items flattened
  const allMenuItems = useMemo(() => {
    return categories.flatMap((c) =>
      c.items.map((it) => ({ ...it, categoryName: c.name }))
    );
  }, [categories]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return allMenuItems.filter((it) => {
      if (selectedCategoryId !== 'all' && it.categoryId !== selectedCategoryId) return false;
      if (foodTypeFilter === 'veg' && it.foodType !== 'veg') return false;
      if (foodTypeFilter === 'non_veg' && it.foodType !== 'non_veg') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return it.name.toLowerCase().includes(q) || (it.itemCode && it.itemCode.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allMenuItems, selectedCategoryId, foodTypeFilter, searchQuery]);

  // Cart operations
  const cartEntries = Object.values(cart).filter((c) => c.quantity > 0);
  const totalCartCount = cartEntries.reduce((sum, c) => sum + c.quantity, 0);
  const cartSubtotal = cartEntries.reduce((sum, c) => sum + c.item.price * c.quantity, 0);

  const updateQuantity = (item: any, delta: number) => {
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

  const addPresetNote = (itemId: string, note: string) => {
    setCart((prev) => {
      if (!prev[itemId]) return prev;
      const curNotes = prev[itemId].notes;
      const nextNotes = curNotes ? `${curNotes}, ${note}` : note;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], notes: nextNotes },
      };
    });
  };

  // Submit / Punch KOT
  const handlePunchKot = async () => {
    if (!selectedTable || cartEntries.length === 0) return;
    setIsPunching(true);
    setFeedback(null);

    try {
      const serverCaptain = user.fullName || 'Captain';

      if (activeKotForTable) {
        // Punch additional round
        const res = await punchKotRoundAction(activeKotForTable.id, {
          items: cartEntries.map((c) => ({
            menuItemId: c.item.id,
            itemName: c.item.name,
            quantity: c.quantity,
            unitPrice: Number(c.item.price),
            gstRate: Number(c.item.gstRate || 5),
            foodType: (c.item.foodType as 'veg' | 'non_veg' | 'egg') || 'veg',
            specialNotes: c.notes || undefined,
          })),
        });

        if (res.error) throw new Error(res.error);

        setFeedback({ type: 'ok', text: `Round ${((activeKotForTable.roundNumber || 1) + 1)} Punched to Kitchen!` });
        setPrintSlip({
          kotNumber: activeKotForTable.kotNumber,
          roundNumber: (activeKotForTable.roundNumber || 1) + 1,
          orderType: 'dine_in',
          outletName: activeOutlet?.name || 'Restaurant',
          tableNumber: selectedTable.tableNumber,
          serverName: serverCaptain,
          createdAt: new Date().toISOString(),
          items: cartEntries.map((c) => ({
            itemName: c.item.name,
            quantity: c.quantity,
            foodType: c.item.foodType,
            specialNotes: c.notes,
          })),
        });
      } else {
        // New KOT
        const res = await createKotOrderAction({
          outletId: activeOutlet?.id || '',
          tableId: selectedTable.id,
          orderType: 'dine_in',
          guestName: `Table ${selectedTable.tableNumber}`,
          items: cartEntries.map((c) => ({
            menuItemId: c.item.id,
            itemName: c.item.name,
            quantity: c.quantity,
            unitPrice: Number(c.item.price),
            gstRate: Number(c.item.gstRate || 5),
            foodType: (c.item.foodType as 'veg' | 'non_veg' | 'egg') || 'veg',
            specialNotes: c.notes || undefined,
          })),
        });

        if (res.error) throw new Error(res.error);

        setFeedback({ type: 'ok', text: `KOT Punched to Kitchen for Table ${selectedTable.tableNumber}!` });
        if (res.data) {
          setPrintSlip({
            kotNumber: res.data.kotNumber || `KOT-${selectedTable.tableNumber}`,
            orderType: 'dine_in',
            outletName: activeOutlet?.name || 'Restaurant',
            tableNumber: selectedTable.tableNumber,
            serverName: serverCaptain,
            createdAt: new Date().toISOString(),
            items: cartEntries.map((c) => ({
              itemName: c.item.name,
              quantity: c.quantity,
              foodType: c.item.foodType,
              specialNotes: c.notes,
            })),
          });
        }
      }

      setCart({});
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message || 'Failed to punch KOT' });
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-28">
      {/* Handheld Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/restaurant"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              title="Back to Desktop POS"
            >
              ←
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-500/20 text-xs font-bold text-amber-400">
                  📱
                </span>
                <h1 className="text-sm font-black text-white">Captain Handheld POS</h1>
              </div>
              <p className="text-[11px] text-slate-400">
                Captain: <strong className="text-slate-200">{user.fullName || 'Server'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedTable && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTableId(null);
                  setCart({});
                }}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300"
              >
                Change Table ({selectedTable.tableNumber})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="px-4 pt-3 max-w-lg mx-auto">
        {feedback && (
          <div
            className={`mb-3 rounded-xl p-3 text-xs font-bold ${
              feedback.type === 'ok'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* STEP 1: Select Table If None Selected */}
        {!selectedTable ? (
          <div>
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-slate-300">Select Floor Table</h2>
              <span className="text-xs text-slate-500">{tables.length} Tables</span>
            </div>

            {/* Section Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              <button
                type="button"
                onClick={() => setSectionFilter('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  sectionFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                All Sections
              </button>
              {sections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSectionFilter(sec)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    sectionFilter === sec
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredTables.map((t) => {
                const activeKot = kots.find(
                  (k) =>
                    (k.tableNumber === t.tableNumber || t.activeKotId === k.id) &&
                    k.status !== 'settled' &&
                    k.status !== 'cancelled'
                );
                const isOccupied = !!activeKot;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTableId(t.id)}
                    className={`flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition active:scale-95 ${
                      isOccupied
                        ? 'border-amber-500/50 bg-amber-500/10 hover:border-amber-400'
                        : 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-400'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="font-mono text-xl font-black text-white">{t.tableNumber}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isOccupied
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {isOccupied ? 'Occupied' : 'Vacant'}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                      <p className="font-semibold text-slate-300">{t.section || 'Dine-In'}</p>
                      <p className="text-[11px] text-slate-500">Seats: {t.capacity} guests</p>
                    </div>

                    {isOccupied && activeKot && (
                      <div className="mt-2 w-full border-t border-amber-500/20 pt-1 text-[11px] font-bold text-amber-300">
                        ₹{Number(activeKot.totalAmount || 0).toFixed(0)} • Round {activeKot.roundNumber || 1}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* STEP 2: Tableside Ordering Mode */
          <div>
            {/* Active Table Status Banner */}
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Table
                </span>
                <p className="font-mono text-lg font-black text-amber-400">
                  {selectedTable.tableNumber}{' '}
                  <span className="text-xs font-normal text-slate-400">({selectedTable.section})</span>
                </p>
              </div>
              {activeKotForTable && (
                <div className="text-right">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                    Running Bill: ₹{Number(activeKotForTable.totalAmount || 0).toFixed(2)}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Round {activeKotForTable.roundNumber || 1} • {activeKotForTable.items?.length || 0} items
                  </p>
                </div>
              )}
            </div>

            {/* Dish Search & Veg/Non-Veg */}
            <div className="space-y-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search dishes or code..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              />

              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    foodTypeFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400'
                  }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('veg')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    foodTypeFilter === 'veg' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400'
                  }`}
                >
                  🟢 Veg Only
                </button>
                <button
                  type="button"
                  onClick={() => setFoodTypeFilter('non_veg')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    foodTypeFilter === 'non_veg' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400'
                  }`}
                >
                  🔴 Non-Veg
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 pb-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition shrink-0 ${
                  selectedCategoryId === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-white/5 text-slate-300'
                }`}
              >
                All ({allMenuItems.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition shrink-0 ${
                    selectedCategoryId === c.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {c.name} ({c.items.length})
                </button>
              ))}
            </div>

            {/* Dish Tap Targets */}
            <div className="mt-3 space-y-2">
              {filteredDishes.map((dish) => {
                const qty = cart[dish.id]?.quantity || 0;
                return (
                  <div
                    key={dish.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">
                            {dish.foodType === 'veg' ? '🟢' : dish.foodType === 'non_veg' ? '🔴' : '🟡'}
                          </span>
                          <span className="font-bold text-xs text-white truncate">{dish.name}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-extrabold text-amber-400">
                          ₹{Number(dish.price).toFixed(2)}
                        </p>
                      </div>

                      {/* Stepper Buttons */}
                      <div className="shrink-0 flex items-center">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateQuantity(dish, 1)}
                            className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition active:scale-95 shadow-xs"
                          >
                            + ADD
                          </button>
                        ) : (
                          <div className="flex items-center rounded-xl border border-amber-500 bg-amber-500/20">
                            <button
                              type="button"
                              onClick={() => updateQuantity(dish, -1)}
                              className="px-2.5 py-1 text-xs font-black text-amber-300 hover:text-white"
                            >
                              −
                            </button>
                            <span className="px-2 font-mono text-xs font-black text-white">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(dish, 1)}
                              className="px-2.5 py-1 text-xs font-black text-amber-300 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Modifier Chips if selected */}
                    {qty > 0 && (
                      <div className="mt-2 border-t border-white/5 pt-2">
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          <span className="text-[10px] text-slate-500 shrink-0">Note:</span>
                          {NOTE_PRESETS.map((np) => (
                            <button
                              key={np}
                              type="button"
                              onClick={() => addPresetNote(dish.id, np)}
                              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 shrink-0"
                            >
                              {np}
                            </button>
                          ))}
                        </div>
                        {cart[dish.id]?.notes && (
                          <p className="text-[10px] italic text-amber-300 mt-1">
                            ↳ Note: {cart[dish.id].notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Punch Bar */}
      {selectedTable && totalCartCount > 0 && (
        <div className="fixed bottom-3 left-0 right-0 z-40 px-4">
          <div className="mx-auto flex max-w-lg items-center justify-between rounded-2xl border border-amber-500/50 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div>
              <span className="text-xs font-bold text-amber-400">
                {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} • Table {selectedTable.tableNumber}
              </span>
              <p className="text-base font-black text-white">₹{cartSubtotal.toFixed(2)}</p>
            </div>

            <button
              type="button"
              disabled={isPunching}
              onClick={handlePunchKot}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg hover:bg-amber-400 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isPunching ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Punching KOT...</span>
                </>
              ) : (
                <>
                  <span>⚡ Punch KOT to Kitchen</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* KOT Print Modal */}
      {printSlip && (
        <KotPrintModal
          data={printSlip}
          onClose={() => setPrintSlip(null)}
        />
      )}
    </div>
  );
}
