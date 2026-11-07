'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  btnCls,
  btnGhostCls,
  btnDangerCls,
  inputCls,
  CustomDropdown,
  EmptyState,
} from '@/components/ui';
import { getRoomTypeTheme } from '@/lib/room-types';
import {
  createRoomSetting,
  createRoomTypeSetting,
  updateRoomTypeSetting,
  updateUpiSetting,
  createPosTerminalSetting,
  saveChannelConnectionSetting,
  onboardStaffSetting,
} from './actions';
import {
  createRestaurantTableAction,
  updateRestaurantTableAction,
  deleteRestaurantTableAction,
  createMenuCategoryAction,
  createMenuItemAction,
  deleteMenuItemAction,
  toggleMenuItemStockAction,
} from '../restaurant/actions';

export interface RoomTypeRecord {
  id: string;
  name: string;
  baseRate: number;
  hourlyRate?: number | null;
  capacity: number;
  description?: string | null;
}

export interface RoomRecord {
  id: string;
  roomTypeId: string;
  number: string;
  floor: number;
  status: string;
  baseRate?: number | null;
  hourlyRate?: number | null;
}

export interface OutletDto {
  id: string;
  name: string;
  code: string;
  outletType: string;
}

export interface TableDto {
  id: string;
  outletId: string;
  tableNumber: string;
  capacity: number;
  section?: string | null;
  status?: string;
}

export interface MenuItemDto {
  id: string;
  categoryId: string;
  name: string;
  itemCode?: string;
  description?: string | null;
  price: number;
  foodType?: 'veg' | 'non_veg' | 'egg' | string;
  isVeg?: boolean;
  sacCode?: string;
  gstRate?: number;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  kitchenStation?: string | null;
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  items?: MenuItemDto[];
}

interface SettingsViewProps {
  initialTab: string;
  role: string;
  property: {
    id: string;
    name: string;
    currency: string;
    slug?: string;
  };
  rooms: RoomRecord[];
  types: RoomTypeRecord[];
  tables: TableDto[];
  outlets: OutletDto[];
  menu: MenuCategoryDto[];
  upiSettings: {
    upiId: string;
    upiMerchantName: string;
    propertyName: string;
    isOwner: boolean;
  } | null;
  terminals: any[];
  channelData: {
    channels: any[];
    stats: { otaBookingsCount: number };
  };
  users: any[];
  keycards: any[];
  readOnly: boolean;
}

export function SettingsView({
  initialTab,
  role,
  property,
  rooms,
  types,
  tables,
  outlets,
  menu,
  upiSettings,
  terminals,
  channelData,
  users,
  keycards,
  readOnly,
}: SettingsViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab || 'all');
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Floor zone state
  const existingZones = Array.from(
    new Set(
      tables.map((t) => t.section || 'Main AC Hall').concat([
        'Main AC Hall',
        'Bar & Lounge',
        'Open Terrace Garden',
        'Family Mezzanine',
        'Ground Floor Cafe',
        'Poolside Deck',
      ]),
    ),
  ).filter(Boolean);

  const [zones, setZones] = useState<string[]>(existingZones);
  const [newZoneName, setNewZoneName] = useState('');
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  const [deleteReassignTarget, setDeleteReassignTarget] = useState<string>('Main AC Hall');
  const [zoneToDeleteDropdown, setZoneToDeleteDropdown] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Local Menu & Tables state for instantaneous UI updates & Petpooja controls
  const [localMenu, setLocalMenu] = useState<MenuCategoryDto[]>(menu);
  const [localTables, setLocalTables] = useState<TableDto[]>(tables);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuDietaryFilter, setMenuDietaryFilter] = useState<'all' | 'veg' | 'non_veg' | 'egg'>('all');
  const [menuCatFilter, setMenuCatFilter] = useState<string>('all');
  const [menuStockFilter, setMenuStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [tableZoneFilter, setTableZoneFilter] = useState<string>('all');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setLocalMenu(menu);
  }, [menu]);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  const allDishes = useMemo(() => {
    return localMenu.flatMap((cat) =>
      (cat.items || []).map((it) => {
        const foodType = (it.foodType as 'veg' | 'non_veg' | 'egg') || (it.isVeg ? 'veg' : 'non_veg');
        return {
          ...it,
          categoryName: cat.name,
          foodType,
        };
      })
    );
  }, [localMenu]);

  const vegDishesCount = useMemo(() => allDishes.filter((d) => d.foodType === 'veg').length, [allDishes]);
  const nonVegDishesCount = useMemo(() => allDishes.filter((d) => d.foodType === 'non_veg').length, [allDishes]);
  const eggDishesCount = useMemo(() => allDishes.filter((d) => d.foodType === 'egg').length, [allDishes]);

  const filteredDishes = useMemo(() => {
    return allDishes.filter((dish) => {
      if (menuDietaryFilter !== 'all' && dish.foodType !== menuDietaryFilter) return false;
      if (menuCatFilter !== 'all' && dish.categoryId !== menuCatFilter) return false;
      if (menuStockFilter === 'in_stock' && dish.isOutOfStock) return false;
      if (menuStockFilter === 'out_of_stock' && !dish.isOutOfStock) return false;
      if (menuSearchQuery.trim()) {
        const q = menuSearchQuery.toLowerCase();
        const matchName = dish.name.toLowerCase().includes(q);
        const matchCode = (dish.itemCode || '').toLowerCase().includes(q);
        const matchCat = dish.categoryName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }
      return true;
    });
  }, [allDishes, menuDietaryFilter, menuCatFilter, menuStockFilter, menuSearchQuery]);

  const filteredTablesList = useMemo(() => {
    if (tableZoneFilter === 'all') return localTables;
    return localTables.filter((t) => (t.section || 'Main AC Hall') === tableZoneFilter);
  }, [localTables, tableZoneFilter]);

  const handleDeleteDish = async (dishId: string, dishName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${dishName}" from the menu?`)) return;
    setSubmitting(true);
    try {
      const res = await deleteMenuItemAction(dishId);
      if (res.ok) {
        setLocalMenu((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: (cat.items || []).filter((item) => item.id !== dishId),
          }))
        );
        setMsg({ type: 'ok', text: `Dish "${dishName}" removed from menu successfully.` });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to delete dish.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'An unexpected error occurred while deleting dish.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDishStock = async (dishId: string, currentStockState?: boolean) => {
    const nextOutOfStock = !currentStockState;
    setSubmitting(true);
    try {
      const res = await toggleMenuItemStockAction(dishId, { isOutOfStock: nextOutOfStock });
      if (res.ok) {
        setLocalMenu((prev) =>
          prev.map((cat) => ({
            ...cat,
            items: (cat.items || []).map((item) =>
              item.id === dishId ? { ...item, isOutOfStock: nextOutOfStock } : item
            ),
          }))
        );
        setMsg({
          type: 'ok',
          text: `Dish marked as ${nextOutOfStock ? '86 (Out of Stock)' : 'In Stock'}.`,
        });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to update stock.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Error updating stock.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (!confirm(`Are you sure you want to delete table "${tableNumber}"?`)) return;
    setSubmitting(true);
    try {
      const res = await deleteRestaurantTableAction(tableId);
      if (res.ok) {
        setLocalTables((prev) => prev.filter((t) => t.id !== tableId));
        setMsg({ type: 'ok', text: `Table "${tableNumber}" removed successfully.` });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to delete table.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Error deleting table.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSubmitting(true);
    try {
      const res = await createMenuCategoryAction({
        name: newCategoryName.trim(),
        sortOrder: localMenu.length + 1,
      });
      if (res.ok) {
        setMsg({ type: 'ok', text: `Category "${newCategoryName.trim()}" created successfully.` });
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
        router.refresh();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to create category.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Error creating category.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Selected outlet for table creation
  const defaultOutletId = outlets[0]?.id || '';
  const [selectedOutletId, setSelectedOutletId] = useState(defaultOutletId);

  // Sync custom and removed floor zones from localStorage
  useEffect(() => {
    try {
      const czKey = `aura_dine_custom_zones_${defaultOutletId || 'default'}`;
      const rzKey = `aura_dine_removed_zones_${defaultOutletId || 'default'}`;
      const savedCustom: string[] = JSON.parse(localStorage.getItem(czKey) || '[]');
      const savedRemoved: string[] = JSON.parse(localStorage.getItem(rzKey) || '[]');
      setZones((prev) => {
        const combined = Array.from(new Set([...prev, ...savedCustom])).filter(
          (z) => !savedRemoved.includes(z) || tables.some((t) => (t.section || 'Main AC Hall') === z),
        );
        return combined.length > 0 ? combined : ['Main AC Hall'];
      });
    } catch {}
  }, [defaultOutletId, tables]);

  const isOwner = role === 'owner';
  const currency = property.currency || 'INR';

  const switchTab = (nextTab: string) => {
    setTab(nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', nextTab);
    window.history.pushState({}, '', url.toString());
  };

  const handleAddZone = () => {
    const trimmed = newZoneName.trim();
    if (!trimmed) return;
    if (zones.includes(trimmed)) {
      setMsg({ type: 'error', text: `Floor zone "${trimmed}" already exists.` });
      return;
    }
    setZones((prev) => [...prev, trimmed]);
    setNewZoneName('');
    try {
      const czKey = `aura_dine_custom_zones_${defaultOutletId || 'default'}`;
      const rzKey = `aura_dine_removed_zones_${defaultOutletId || 'default'}`;
      const existingCustom: string[] = JSON.parse(localStorage.getItem(czKey) || '[]');
      const existingRemoved: string[] = JSON.parse(localStorage.getItem(rzKey) || '[]');
      localStorage.setItem(czKey, JSON.stringify(Array.from(new Set([...existingCustom, trimmed]))));
      localStorage.setItem(rzKey, JSON.stringify(existingRemoved.filter((z) => z !== trimmed)));
    } catch {}
    setMsg({ type: 'ok', text: `Added new floor zone: "${trimmed}". You can now assign tables to it.` });
  };

  const handleRenameZone = async () => {
    if (!renameFrom || !renameTo.trim()) return;
    const targetTo = renameTo.trim();
    const tablesInZone = tables.filter((t) => (t.section || 'Main AC Hall') === renameFrom);
    try {
      for (const t of tablesInZone) {
        await updateRestaurantTableAction(t.id, {
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          section: targetTo,
        });
      }
      setZones((prev) => prev.map((z) => (z === renameFrom ? targetTo : z)));
      try {
        const czKey = `aura_dine_custom_zones_${defaultOutletId || 'default'}`;
        const existingCustom: string[] = JSON.parse(localStorage.getItem(czKey) || '[]');
        localStorage.setItem(
          czKey,
          JSON.stringify(existingCustom.map((z) => (z === renameFrom ? targetTo : z))),
        );
      } catch {}
      setRenameFrom('');
      setRenameTo('');
      setMsg({
        type: 'ok',
        text: `Successfully renamed zone "${renameFrom}" to "${targetTo}" across ${tablesInZone.length} table(s).`,
      });
      router.refresh();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to rename floor zone.' });
    }
  };

  const executeDeleteZone = async (targetZone: string, reassignTo: string) => {
    if (!targetZone) return;
    setSubmitting(true);
    try {
      const tablesInZone = tables.filter((t) => (t.section || 'Main AC Hall') === targetZone);
      const remainingZones = zones.filter((z) => z !== targetZone);
      const destination = reassignTo || remainingZones[0] || 'Main AC Hall';

      if (tablesInZone.length > 0) {
        for (const t of tablesInZone) {
          await updateRestaurantTableAction(t.id, {
            tableNumber: t.tableNumber,
            capacity: t.capacity,
            section: destination,
          });
        }
      }

      setZones(remainingZones);

      try {
        const czKey = `aura_dine_custom_zones_${defaultOutletId || 'default'}`;
        const rzKey = `aura_dine_removed_zones_${defaultOutletId || 'default'}`;
        const existingCustom: string[] = JSON.parse(localStorage.getItem(czKey) || '[]');
        const existingRemoved: string[] = JSON.parse(localStorage.getItem(rzKey) || '[]');
        localStorage.setItem(czKey, JSON.stringify(existingCustom.filter((z) => z !== targetZone)));
        localStorage.setItem(rzKey, JSON.stringify(Array.from(new Set([...existingRemoved, targetZone]))));
      } catch {}

      setZoneToDelete(null);
      setZoneToDeleteDropdown('');
      setMsg({
        type: 'ok',
        text:
          tablesInZone.length > 0
            ? `Floor zone "${targetZone}" deleted and ${tablesInZone.length} table(s) moved to "${destination}".`
            : `Floor zone "${targetZone}" deleted successfully.`,
      });
      router.refresh();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to delete floor zone.' });
    } finally {
      setSubmitting(false);
    }
  };

  const tabsList = [
    { id: 'all', label: 'All Modules Overview', icon: '⚡', count: null },
    { id: 'rooms', label: 'Rooms & Rates', icon: '🏨', count: `${rooms.length} Rooms` },
    { id: 'restaurant', label: 'Restaurant & F&B', icon: '🍽️', count: `${tables.length} Tables` },
    { id: 'payments', label: 'Bank UPI & Hardware', icon: '💳', count: isOwner ? 'Owner' : 'Protected' },
    { id: 'channels', label: 'OTA Channel APIs', icon: '🌐', count: '5 OTAs' },
    { id: 'staff', label: 'Staff & Hierarchy', icon: '👥', count: `${users.length} Staff` },
    { id: 'compliance', label: 'Statutory BoI & GST', icon: '⚖️', count: 'Indian Mandates' },
    { id: 'marketing', label: 'Marketing & Loyalty', icon: '📣', count: 'Loyalty CRM' },
    { id: 'keycards', label: 'RFID Keycards', icon: '🔑', count: `${keycards.length} Keys` },
  ];

  const totalMenuItems = menu.reduce((acc, cat) => acc + (cat.items?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* Executive Overview Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wider uppercase text-indigo-200 border border-white/10">
                Property Administration
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold flex items-center gap-1 ${
                  isOwner
                    ? 'bg-amber-400 text-slate-950 border border-amber-300'
                    : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                }`}
              >
                <span>{isOwner ? '👑' : '🛡️'}</span>
                {isOwner ? 'Owner Level Authority (Full Privilege)' : 'General Manager Authority'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              {property.name} Configuration &amp; Setup Center
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Decoupled management hub to add rooms, configure dining floor zones &amp; menus, bind bank receiver UPI accounts, connect OTA channel APIs, and grant staff roles—without interrupting daily front office operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className="font-mono text-xl font-black text-white">{rooms.length}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rooms Active</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className="font-mono text-xl font-black text-white">{tables.length}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dining Tables</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className="font-mono text-xl font-black text-white">{totalMenuItems}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dishes &amp; Items</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className="font-mono text-xl font-black text-white">{users.length}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Team Members</div>
            </div>
          </div>
        </div>
      </div>

      {/* In-view Notification Message */}
      {msg && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold transition-all ${
            msg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-rose-200 bg-rose-50 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{msg.type === 'ok' ? '✓' : '⚠️'}</span>
            <span>{msg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200" role="tablist" aria-label="Settings tabs">
        {tabsList.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
              {t.count && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 01. ROOMS & ACCOMMODATION MANAGEMENT */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'rooms') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-700 font-extrabold text-sm">
                  🏨
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Rooms, Types &amp; Inventory Configuration
                </h2>
                <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {rooms.length} Rooms Configured · {types.length} Types
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Setup room inventory, standard pricing tiers, hourly tariffs, and physical room number allocations.
              </p>
            </div>

            {/* CRITICAL: Button beside manage linking directly to the live operational page */}
            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Live Rooms Rack</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* 01 Add Room Type Form */}
            <form
              action={createRoomTypeSetting}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6"
            >
              <input type="hidden" name="back" value="/settings?tab=rooms" />
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white text-xs font-bold shadow-2xs">
                  01
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add a Room Type</h3>
                  <p className="text-xs text-slate-500">Define base capacity and default night/hour tariffs.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Type Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Executive Club Suite, Deluxe Sea Facing"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nightly Rate ({currency})
                  </label>
                  <input
                    name="baseRate"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="4500"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hourly Rate ({currency}) <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    name="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Falls back to nightly ÷ 24"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guest Capacity</label>
                  <input
                    name="capacity"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue="2"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    name="description"
                    maxLength={500}
                    placeholder="King bed, balcony, jacuzzi"
                    className={inputCls}
                  />
                </div>
              </div>

              <button type="submit" disabled={readOnly} className={btnCls}>
                + Create Room Type
              </button>
            </form>

            {/* 02 Add Room Form */}
            <form
              action={createRoomSetting}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6"
            >
              <input type="hidden" name="back" value="/settings?tab=rooms" />
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs">
                  02
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add a Room</h3>
                  <p className="text-xs text-slate-500">Allocate room number to floor and link room type.</p>
                </div>
              </div>

              {types.length > 0 ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Room Type</label>
                    <CustomDropdown
                      name="roomTypeId"
                      required
                      placeholder="Choose a room type"
                      options={types.map((type) => {
                        const theme = getRoomTypeTheme(type.name);
                        return {
                          value: type.id,
                          label: `${type.name} (${money(type.baseRate, currency)}/night)`,
                          badge: `${type.capacity} Guests`,
                          icon: (
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${theme.dot} shrink-0`}
                              title={`Category Identity: ${theme.colorName}`}
                            />
                          ),
                        };
                      })}
                      aria-label="Room type selector"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Room Number</label>
                      <input
                        name="number"
                        required
                        placeholder="e.g. 101, 204, V-12"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Floor Level</label>
                      <input
                        name="floor"
                        type="number"
                        min="-5"
                        max="200"
                        defaultValue="1"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nightly Override ({currency}) <span className="font-normal text-slate-400">(Optional)</span>
                      </label>
                      <input
                        name="baseRate"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Inherit type tariff"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Hourly Override ({currency}) <span className="font-normal text-slate-400">(Optional)</span>
                      </label>
                      <input
                        name="hourlyRate"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Inherit type tariff"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={readOnly} className={btnCls}>
                    + Create Room
                  </button>
                </>
              ) : (
                <EmptyState
                  title="Create a Room Type First"
                  description="Room types supply the default rates and capacity for individual rooms."
                />
              )}
            </form>
          </div>

          {/* Existing Room Types Management & Live Tariffs */}
          {types.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Configured Room Types &amp; Default Tariffs</h3>
              <div className="grid gap-4 xl:grid-cols-2">
                {types.map((type) => {
                  const theme = getRoomTypeTheme(type.name);
                  return (
                    <details
                      key={type.id}
                      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`h-2.5 w-2.5 rounded-full ${theme.dot} shadow-2xs`} />
                            <p className="text-sm font-bold text-slate-900">{type.name}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${theme.badge}`}>
                              <span>{theme.icon}</span>
                              <span>{theme.colorName}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {type.capacity} Guests · {money(type.baseRate, currency)} / night
                            {type.hourlyRate != null
                              ? ` · ${money(type.hourlyRate, currency)} / hr`
                              : ' · hourly fallback ÷ 24'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400 group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                    <form
                      action={updateRoomTypeSetting}
                      className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2"
                    >
                      <input type="hidden" name="id" value={type.id} />
                      <input type="hidden" name="back" value="/settings?tab=rooms" />
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Type Name</label>
                        <input
                          name="name"
                          required
                          defaultValue={type.name}
                          className={`${inputCls} mt-1`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Nightly Rate</label>
                        <input
                          name="baseRate"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          defaultValue={type.baseRate}
                          className={`${inputCls} mt-1`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Hourly Rate</label>
                        <input
                          name="hourlyRate"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={type.hourlyRate ?? ''}
                          placeholder="Fallback: nightly ÷ 24"
                          className={`${inputCls} mt-1`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Max Capacity</label>
                        <input
                          name="capacity"
                          type="number"
                          min="1"
                          max="20"
                          required
                          defaultValue={type.capacity}
                          className={`${inputCls} mt-1`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700">Description</label>
                        <input
                          name="description"
                          maxLength={500}
                          defaultValue={type.description ?? ''}
                          className={`${inputCls} mt-1`}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={readOnly}
                        className={`${btnGhostCls} sm:col-span-2 text-xs`}
                      >
                        Save Room Type Changes
                      </button>
                    </form>
                  </details>
                );
              })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 02. RESTAURANT, F&B & OUTLETS MANAGEMENT */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'restaurant') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-sm">
                  🍽️
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Restaurant, Floor Zones &amp; Menu Dishes
                </h2>
                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {tables.length} Tables · {zones.length} Floor Zones · {totalMenuItems} Menu Dishes
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage physical dining floor plans, custom dining zones, menu dish catalog, and Swiggy / Zomato order ingestion.
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/restaurant"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Live Dining POS</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Sub-section 1: Floor Zones Customization */}
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/30 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🗺️</span> Custom Floor Zones Configuration
                </h3>
                <p className="text-xs text-slate-500">
                  Hotels vary from beach shacks to rooftop bars. Add custom zones or rename existing ones across all tables.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Executive Lounge, Beach Cabana"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  + Add Zone
                </button>
              </div>
            </div>

            {/* Live Active Zones Chips with Direct Delete Button */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {zones.map((zone) => {
                const count = tables.filter((t) => (t.section || 'Main AC Hall') === zone).length;
                const isSelectedForDelete = zoneToDelete === zone;
                return (
                  <div
                    key={zone}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all ${
                      isSelectedForDelete
                        ? 'border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-300'
                        : 'border-emerald-200 bg-white text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{zone}</span>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                      {count} {count === 1 ? 'table' : 'tables'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelectedForDelete) {
                          setZoneToDelete(null);
                          setZoneToDeleteDropdown('');
                        } else {
                          setZoneToDelete(zone);
                          setZoneToDeleteDropdown(zone);
                          const other = zones.find((z) => z !== zone) || 'Main AC Hall';
                          setDeleteReassignTarget(other);
                        }
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-rose-200 hover:text-rose-800 transition-colors cursor-pointer"
                      title={`Delete floor zone "${zone}"`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Interactive Confirmation & Reassignment Card for Deleting Zone */}
            {zoneToDelete && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/95 p-4 space-y-3 animate-in fade-in-50 duration-200 shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b border-rose-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🗑️</span>
                    <h4 className="text-xs font-bold text-rose-950">
                      Delete Floor Zone: &ldquo;{zoneToDelete}&rdquo;
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setZoneToDelete(null);
                      setZoneToDeleteDropdown('');
                    }}
                    className="text-xs text-rose-700 hover:text-rose-950 font-bold cursor-pointer"
                  >
                    Cancel ✕
                  </button>
                </div>

                {tables.filter((t) => (t.section || 'Main AC Hall') === zoneToDelete).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-rose-900 leading-relaxed">
                      This zone currently has <strong>{tables.filter((t) => (t.section || 'Main AC Hall') === zoneToDelete).length} table(s)</strong> assigned to it ({tables.filter((t) => (t.section || 'Main AC Hall') === zoneToDelete).map((t) => t.tableNumber).join(', ')}).
                      Select where to reassign these tables:
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-56">
                        <CustomDropdown
                          size="sm"
                          defaultValue={deleteReassignTarget}
                          onChange={(val) => setDeleteReassignTarget(val)}
                          options={zones.filter((z) => z !== zoneToDelete).map((z) => ({ value: z, label: z }))}
                          aria-label="Reassign tables destination zone"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => executeDeleteZone(zoneToDelete, deleteReassignTarget)}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? 'Reassigning & Deleting...' : 'Reassign Tables & Delete Zone'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setZoneToDelete(null);
                          setZoneToDeleteDropdown('');
                        }}
                        className="rounded-xl border border-slate-300 bg-white text-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-rose-900">
                      This zone has <strong>0 tables</strong>. Confirm permanent deletion?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => executeDeleteZone(zoneToDelete, '')}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setZoneToDelete(null);
                          setZoneToDeleteDropdown('');
                        }}
                        className="rounded-xl border border-slate-300 bg-white text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Rename Zone Across Tables */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200/50">
              <span className="text-xs font-bold text-slate-700">Rename Zone:</span>
              <div className="w-48">
                <CustomDropdown
                  placeholder="Select zone to rename"
                  size="sm"
                  defaultValue={renameFrom}
                  onChange={(val) => setRenameFrom(val)}
                  options={zones.map((z) => ({ value: z, label: z }))}
                  aria-label="Zone to rename"
                />
              </div>
              <span className="text-xs text-slate-400">&rarr;</span>
              <input
                type="text"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                placeholder="New name..."
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-2xs w-44"
              />
              <button
                type="button"
                onClick={handleRenameZone}
                disabled={!renameFrom || !renameTo.trim()}
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                Apply Rename
              </button>
            </div>

            {/* Dedicated Delete Zone Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200/50">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                <span>🗑️</span> Delete Zone:
              </span>
              <div className="w-56">
                <CustomDropdown
                  placeholder="Select zone to delete..."
                  size="sm"
                  defaultValue={zoneToDeleteDropdown}
                  onChange={(val) => {
                    setZoneToDeleteDropdown(val);
                    setZoneToDelete(val);
                    const other = zones.find((z) => z !== val) || 'Main AC Hall';
                    setDeleteReassignTarget(other);
                  }}
                  options={zones.map((z) => ({
                    value: z,
                    label: `${z} (${tables.filter((t) => (t.section || 'Main AC Hall') === z).length} tables)`,
                  }))}
                  aria-label="Select zone to delete"
                />
              </div>
              {zoneToDeleteDropdown && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setZoneToDelete(zoneToDeleteDropdown);
                    const other = zones.find((z) => z !== zoneToDeleteDropdown) || 'Main AC Hall';
                    setDeleteReassignTarget(other);
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Configure &amp; Delete
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Add Dining Table Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const tableNumber = String(fd.get('tableNumber') || '').trim();
                const capacity = Number(fd.get('capacity') || 4);
                const section = String(fd.get('section') || 'Main AC Hall');
                const outletId = String(fd.get('outletId') || outlets[0]?.id || '');
                const res = await createRestaurantTableAction({
                  outletId,
                  tableNumber,
                  capacity,
                  section,
                });
                if (res.ok) {
                  setMsg({ type: 'ok', text: `Table "${tableNumber}" added successfully.` });
                  router.refresh();
                } else {
                  setMsg({ type: 'error', text: res.error || 'Failed to add table.' });
                }
              }}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-2xs">
                  01
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Dining Table</h3>
                  <p className="text-xs text-slate-500">Configure table number, covers, and floor zone.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Floor Zone / Section</label>
                <CustomDropdown
                  name="section"
                  placeholder="Select Floor Zone"
                  defaultValue={zones[0] || 'Main AC Hall'}
                  options={zones.map((z) => ({ value: z, label: z }))}
                  aria-label="Floor zone selector"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Table Number</label>
                  <input
                    name="tableNumber"
                    required
                    placeholder="e.g. T-11, Rooftop-01"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seating Capacity (Covers)</label>
                  <input
                    name="capacity"
                    type="number"
                    min="1"
                    max="50"
                    defaultValue="4"
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {outlets.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Restaurant Outlet</label>
                  <CustomDropdown
                    name="outletId"
                    defaultValue={outlets[0]?.id}
                    options={outlets.map((o) => ({ value: o.id, label: o.name }))}
                    aria-label="Restaurant outlet selector"
                  />
                </div>
              )}

              <button type="submit" disabled={readOnly} className={btnCls}>
                + Add Dining Table
              </button>
            </form>

            {/* Add Menu Item / Dish Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const name = String(fd.get('name') || '').trim();
                const price = Number(fd.get('price') || 0);
                const categoryId = String(fd.get('categoryId') || '');
                const dietary = (fd.get('dietary') as 'veg' | 'non_veg') || 'veg';
                const sacCode = '996331';
                const gstRate = 5;

                if (!categoryId) {
                  setMsg({ type: 'error', text: 'Please create or choose a menu category first.' });
                  return;
                }

                const res = await createMenuItemAction({
                  categoryId,
                  name,
                  price,
                  foodType: dietary,
                  sacCode,
                  gstRate,
                });
                if (res.ok) {
                  setMsg({ type: 'ok', text: `Dish "${name}" added to menu successfully!` });
                  router.refresh();
                } else {
                  setMsg({ type: 'error', text: res.error || 'Failed to add menu item.' });
                }
              }}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs">
                  02
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Menu Item / Dish</h3>
                  <p className="text-xs text-slate-500">Configure dish name, price, dietary, and 5% F&amp;B GST.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Menu Category</label>
                {menu.length > 0 ? (
                  <CustomDropdown
                    name="categoryId"
                    placeholder="Select menu category"
                    defaultValue={menu[0]?.id}
                    options={menu.map((cat) => ({
                      value: cat.id,
                      label: `${cat.name} (${cat.items?.length || 0} dishes)`,
                    }))}
                    aria-label="Menu category selector"
                  />
                ) : (
                  <p className="text-xs text-rose-600 font-medium">
                    No menu categories configured. Add a category below first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Murgh Makhani, Paneer Tikka Angare, Cold Brew"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Price ({currency})
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="395"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dietary Tag</label>
                  <CustomDropdown
                    name="dietary"
                    defaultValue="veg"
                    options={[
                      { value: 'veg', label: '🟢 Vegetarian' },
                      { value: 'non_veg', label: '🔴 Non-Vegetarian' },
                      { value: 'egg', label: '🥚 Contains Egg' },
                    ]}
                    aria-label="Dietary tag"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white border border-slate-200/80 px-3 py-2 rounded-xl">
                <span>Indian Statutory GST: <strong>5% SAC 996331</strong> (F&amp;B Service)</span>
                <span className="text-emerald-700 font-bold">Auto-applied</span>
              </div>

              <button type="submit" disabled={readOnly || menu.length === 0} className={btnCls}>
                + Add Dish to Menu
              </button>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* SUB-SECTION 3: PETPOOJA-INSPIRED MASTER MENU DISHES CATALOG & DELETION */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white font-bold text-sm shadow-xs">
                    📋
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-black text-slate-950">
                        Menu Dishes Master &amp; Dietary Catalog
                      </h3>
                      <span className="rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[10px] font-black text-slate-700">
                        {allDishes.length} Total
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Filter by Veg / Non-Veg / Egg, live 86 out-of-stock toggle, and dish deletion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen((prev) => !prev)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>📁</span>
                  <span>{isAddCategoryOpen ? 'Cancel' : '+ New Category'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Add Category Card */}
            {isAddCategoryOpen && (
              <form onSubmit={handleAddCategory} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>✨</span> Create New Menu Category
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Tandoori Starters, Biryani, Italian Breads, Mocktails"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs flex-1 min-w-[240px]"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newCategoryName.trim()}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : '+ Save Category'}
                  </button>
                </div>
              </form>
            )}

            {/* Petpooja-Style Filter Controls Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50/90 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              {/* Left: Dietary Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMenuDietaryFilter('all')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    menuDietaryFilter === 'all'
                      ? 'bg-slate-950 text-white shadow-xs font-black'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({allDishes.length})
                </button>

                <button
                  type="button"
                  onClick={() => setMenuDietaryFilter('veg')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    menuDietaryFilter === 'veg'
                      ? 'bg-emerald-700 text-white shadow-xs font-black ring-2 ring-emerald-500/30'
                      : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Pure Veg ({vegDishesCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMenuDietaryFilter('non_veg')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    menuDietaryFilter === 'non_veg'
                      ? 'bg-rose-700 text-white shadow-xs font-black ring-2 ring-rose-500/30'
                      : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                  <span>Non-Veg ({nonVegDishesCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMenuDietaryFilter('egg')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    menuDietaryFilter === 'egg'
                      ? 'bg-amber-600 text-white shadow-xs font-black ring-2 ring-amber-500/30'
                      : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                  <span>Egg ({eggDishesCount})</span>
                </button>
              </div>

              {/* Right: Search, Category, Stock Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Search dish or code..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-950/20"
                  />
                  {menuSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMenuSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="w-48">
                  <CustomDropdown
                    size="sm"
                    value={menuCatFilter}
                    onChange={(val) => setMenuCatFilter(val)}
                    options={[
                      { value: 'all', label: `All Categories (${allDishes.length})` },
                      ...localMenu.map((cat) => ({
                        value: cat.id,
                        label: `${cat.name} (${cat.items?.length || 0})`,
                      })),
                    ]}
                    aria-label="Filter dishes by category"
                  />
                </div>

                <div className="w-36">
                  <CustomDropdown
                    size="sm"
                    value={menuStockFilter}
                    onChange={(val) => setMenuStockFilter(val as any)}
                    options={[
                      { value: 'all', label: 'All Stock' },
                      { value: 'in_stock', label: '✓ In Stock' },
                      { value: 'out_of_stock', label: '⚠️ 86 Out of Stock' },
                    ]}
                    aria-label="Filter dishes by stock"
                  />
                </div>
              </div>
            </div>

            {/* Menu Items Table */}
            {filteredDishes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                <span className="text-2xl">🍽️</span>
                <p className="text-xs font-bold text-slate-700">No dishes match the selected dietary or category filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDietaryFilter('all');
                    setMenuCatFilter('all');
                    setMenuStockFilter('all');
                    setMenuSearchQuery('');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs" aria-label="Menu dishes catalog">
                  <thead className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Code</th>
                      <th scope="col" className="px-4 py-3">Dish Particulars</th>
                      <th scope="col" className="px-4 py-3">Dietary</th>
                      <th scope="col" className="px-4 py-3">Category</th>
                      <th scope="col" className="px-4 py-3">Tariff</th>
                      <th scope="col" className="px-4 py-3">GST Slab</th>
                      <th scope="col" className="px-4 py-3 text-center">Live Stock (86)</th>
                      <th scope="col" className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredDishes.map((dish) => (
                      <tr key={dish.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {dish.itemCode || 'DISH'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-950 text-sm">{dish.name}</p>
                          {dish.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">{dish.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {dish.foodType === 'veg' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-900 shadow-2xs">
                              <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
                              <span>Pure Veg</span>
                            </span>
                          ) : dish.foodType === 'non_veg' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-300 px-2 py-0.5 text-[11px] font-bold text-rose-900 shadow-2xs">
                              <span className="h-2 w-2 rounded-full bg-rose-600 inline-block" />
                              <span>Non-Veg</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-900 shadow-2xs">
                              <span className="h-2 w-2 rounded-full bg-amber-600 inline-block" />
                              <span>Egg</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            {dish.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-950 text-sm">
                          ₹{Number(dish.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          SAC 996331 (5%)
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={readOnly || submitting}
                            onClick={() => handleToggleDishStock(dish.id, dish.isOutOfStock)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50 ${
                              dish.isOutOfStock
                                ? 'bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                            }`}
                            title={dish.isOutOfStock ? 'Item is 86 (Out of Stock). Click to mark In Stock.' : 'Item is In Stock. Click to 86.'}
                          >
                            {dish.isOutOfStock ? '⚠️ 86 (Out of Stock)' : '✓ In Stock'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={readOnly || submitting}
                            onClick={() => handleDeleteDish(dish.id, dish.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs cursor-pointer disabled:opacity-40"
                            title={`Delete "${dish.name}" from menu`}
                            aria-label={`Delete dish ${dish.name}`}
                          >
                            <span>🗑️</span>
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SUB-SECTION 4: DINING TABLES MASTER INVENTORY & DELETION                  */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white font-bold text-sm shadow-xs">
                  🪑
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-black text-slate-950">
                      Dining Tables Master &amp; Floor Inventory
                    </h3>
                    <span className="rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[10px] font-black text-slate-700">
                      {localTables.length} Tables
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    View active dining tables, check seating covers, filter by zone, or delete vacant tables.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Filter Zone:</span>
                <div className="w-52">
                  <CustomDropdown
                    size="sm"
                    value={tableZoneFilter}
                    onChange={(val) => setTableZoneFilter(val)}
                    options={[
                      { value: 'all', label: `All Zones (${localTables.length} tables)` },
                      ...zones.map((z) => ({
                        value: z,
                        label: `${z} (${localTables.filter((t) => (t.section || 'Main AC Hall') === z).length})`,
                      })),
                    ]}
                    aria-label="Filter tables by zone"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredTablesList.map((t) => {
                const isVacant = !t.status || t.status === 'vacant';
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between space-y-2.5 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-base font-black text-slate-950">{t.tableNumber}</p>
                        <p className="text-[10px] font-bold text-slate-500 truncate max-w-[90px]">{t.section || 'Main AC Hall'}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                          isVacant
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isVacant ? 'Vacant' : 'Occupied'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium text-[11px]">👥 {t.capacity} Covers</span>
                      <button
                        type="button"
                        disabled={!isVacant || readOnly || submitting}
                        onClick={() => handleDeleteTable(t.id, t.tableNumber)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-20 cursor-pointer"
                        title={isVacant ? `Delete Table ${t.tableNumber}` : 'Cannot delete an occupied table with active order'}
                        aria-label={`Delete table ${t.tableNumber}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 03. BANKING, UPI & POS HARDWARE MANAGEMENT (OWNER AUTHORITY) */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'payments') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-sm">
                  💳
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Bank Settlement, Receiver UPI &amp; POS Machines
                </h2>
                {isOwner ? (
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900 flex items-center gap-1">
                    <span>👑</span> Owner Authority
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 flex items-center gap-1">
                    <span>🔒</span> Manager View (Protected Financials)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Configure direct NPCI UPI receiver VPA and connect hardware EDC POS card swipe terminals (Pine Labs, Paytm, Innoviti).
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-800 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Live Cashier Folios</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* If Manager (not Owner), render security barrier note */}
          {!isOwner && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium text-amber-950 flex items-start gap-3">
              <span className="text-base">🔒</span>
              <div>
                <strong className="font-bold">Protected Financial Policy: </strong>
                Only the legal Property Owner can modify the receiving bank account UPI VPA and register primary settlement terminals. As General Manager, you have visibility over active machines and settlement channels.
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Bank Receiver UPI VPA Card */}
            <div className="space-y-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-xs">
                    ₹
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Front Desk Receiver UPI VPA</h3>
                    <p className="text-xs text-slate-500">NPCI Direct Bank Settlement</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  ✓ Verified NPCI
                </span>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Active Receiver VPA:</span>
                  <span className="font-mono font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg text-sm">
                    {upiSettings?.upiId || 'grandazure@icici'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Registered Merchant Name:</span>
                  <span className="font-bold text-slate-900">
                    {upiSettings?.upiMerchantName || property.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  Guest QR scans on invoices, restaurant bills, and direct web booking deposits settle directly to this account with zero intermediary delay.
                </p>
              </div>

              {isOwner && (
                <form
                  action={updateUpiSetting}
                  className="space-y-3 pt-2 border-t border-indigo-100"
                >
                  <label className="block text-xs font-bold text-slate-700">
                    Update Receiver UPI ID
                    <input
                      name="upiId"
                      required
                      defaultValue={upiSettings?.upiId || 'grandazure@icici'}
                      placeholder="e.g. yourhotel@icici, property@hdfcbank"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    Registered Merchant Name
                    <input
                      name="upiMerchantName"
                      defaultValue={upiSettings?.upiMerchantName || property.name}
                      placeholder="Hotel Legal Entity Name"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                  <button type="submit" disabled={readOnly} className={btnCls}>
                    Save UPI Receiver Settings
                  </button>
                </form>
              )}
            </div>

            {/* POS EDC Card Swipe Terminals */}
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white font-extrabold text-sm shadow-xs">
                    💳
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Card Swipe Terminals (EDC)</h3>
                    <p className="text-xs text-slate-500">Pine Labs · Paytm · Innoviti Cloud</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {terminals.length} Connected
                </span>
              </div>

              {/* Connected Terminals List */}
              <div className="space-y-2">
                {terminals.length > 0 ? (
                  terminals.map((term: any) => (
                    <div
                      key={term.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{term.name}</span>
                          {term.isDefault && (
                            <span className="rounded-full bg-indigo-100 text-indigo-800 px-1.5 py-0.2 text-[9px] font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                          TID: {term.terminalId} · {term.provider?.toUpperCase()} · {term.connectionType}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ● Online
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2">
                    No hardware EDC terminals configured yet. Register front desk counter machines below.
                  </p>
                )}
              </div>

              {isOwner && (
                <form
                  action={createPosTerminalSetting}
                  className="space-y-3 pt-3 border-t border-slate-200"
                >
                  <input type="hidden" name="back" value="/settings?tab=payments" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Terminal Label</label>
                      <input
                        name="name"
                        required
                        placeholder="e.g. Front Desk Terminal 1"
                        className={`${inputCls} mt-1`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Terminal ID (TID)</label>
                      <input
                        name="terminalId"
                        required
                        placeholder="e.g. PL-98214"
                        className={`${inputCls} mt-1`}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Provider</label>
                      <CustomDropdown
                        name="provider"
                        defaultValue="pine_labs"
                        options={[
                          { value: 'pine_labs', label: 'Pine Labs Plutus' },
                          { value: 'paytm', label: 'Paytm EDC POS' },
                          { value: 'innoviti', label: 'Innoviti uniPAY' },
                          { value: 'generic', label: 'Standard Bank EDC' },
                        ]}
                        aria-label="POS provider"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700">Connection Mode</label>
                      <CustomDropdown
                        name="connectionType"
                        defaultValue="cloud_lan"
                        options={[
                          { value: 'cloud_lan', label: 'Cloud LAN / Wi-Fi' },
                          { value: 'usb_serial', label: 'USB Serial COM' },
                        ]}
                        aria-label="Connection type"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                    <input type="checkbox" name="isDefault" className="rounded" />
                    <span>Set as primary terminal for cashier folios</span>
                  </label>
                  <button type="submit" disabled={readOnly} className={btnCls}>
                    + Register POS Machine
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 04. OTA CHANNEL MANAGER & APIS */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'channels') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-sky-700 font-extrabold text-sm">
                  🌐
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  OTA Channel Manager &amp; External APIs
                </h2>
                <span className="rounded-full bg-sky-100 border border-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                  MakeMyTrip · Booking.com · Agoda · Swiggy · Zomato
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Synchronize 2-way room rate parity, live inventory calendars, and online delivery food orders.
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/channel-manager"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-900 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Live Channel Manager</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* OTA Connection Setup Form */}
            <form
              action={saveChannelConnectionSetting}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-600 text-white text-xs font-bold shadow-2xs">
                  01
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Configure OTA Channel API</h3>
                  <p className="text-xs text-slate-500">Bind API credentials and commission structure.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select OTA Channel</label>
                <CustomDropdown
                  name="channelKey"
                  defaultValue="makemytrip"
                  options={[
                    { value: 'makemytrip', label: 'MakeMyTrip / Goibibo Direct API' },
                    { value: 'booking_com', label: 'Booking.com XML Connectivity' },
                    { value: 'agoda', label: 'Agoda YCS API' },
                    { value: 'airbnb', label: 'Airbnb Partner Sync' },
                    { value: 'swiggy', label: 'Swiggy Food Webhook API' },
                    { value: 'zomato', label: 'Zomato Merchant Engine API' },
                  ]}
                  aria-label="Channel selection"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Channel Display Name</label>
                  <input
                    name="channelName"
                    required
                    defaultValue="MakeMyTrip India"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hotel Property Code</label>
                  <input
                    name="hotelCode"
                    required
                    defaultValue="MMT-GA-4921"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">API Key / Client ID</label>
                  <input
                    name="apiKey"
                    type="password"
                    defaultValue="mmt_live_key_93182"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">API Secret / Token</label>
                  <input
                    name="apiSecret"
                    type="password"
                    defaultValue="mmt_sec_99182312"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Commission Rate (%)</label>
                  <input
                    name="commissionRate"
                    type="number"
                    min="0"
                    max="50"
                    defaultValue="18"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sync Mode</label>
                  <CustomDropdown
                    name="syncMode"
                    defaultValue="two_way"
                    options={[
                      { value: 'two_way', label: '2-Way (Rates + Inventory + Bookings)' },
                      { value: 'push_only', label: 'Push Only (Rates & Availability)' },
                      { value: 'pull_only', label: 'Pull Only (Reservations Only)' },
                    ]}
                    aria-label="Sync mode"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked className="rounded" />
                <span>Enable live real-time rate pushing &amp; instant booking ingestion</span>
              </label>

              <button type="submit" disabled={readOnly} className={btnCls}>
                Save Channel Integration
              </button>
            </form>

            {/* Webhook & Rate Sync Overview */}
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs">
                  02
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">API Webhooks &amp; Status</h3>
                  <p className="text-xs text-slate-500">Provide this endpoint to OTA technical portals.</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">Inbound Booking Webhook URL:</div>
                <div className="font-mono text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl break-all select-all">
                  https://api.grandazure.com/api/hotel/channels/webhook
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When a guest books on MakeMyTrip, Agoda, or Swiggy, their servers dispatch an instant JSON webhook payload here. Aura PMS automatically maps the guest profile, confirms the reservation, and fires KOT if F&amp;B.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Rate Parity Engine</span>
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px]">ACTIVE</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Automatic inventory lock: When the last available room is sold at the front desk, all connected OTAs are instantly closed within 850 milliseconds to eliminate overbooking risks.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 05. STAFF DIRECTORY & ACCESS CONTROL */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'staff') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-50 text-purple-700 font-extrabold text-sm">
                  👥
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Staff Directory &amp; Role-Based Permissions
                </h2>
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                  {users.length} Team Members Configured
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Grant role-based access for Front Desk, Housekeeping, General Managers, and Owners.
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/staff"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-800 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Staff Directory</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Quick Invite Staff Form */}
            <form
              action={onboardStaffSetting}
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-600 text-white text-xs font-bold shadow-2xs">
                  +
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Onboard New Team Member</h3>
                  <p className="text-xs text-slate-500">Assign specific operational permission tier.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  name="fullName"
                  required
                  placeholder="e.g. Aarav Mehta, Sunita Rao"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@hotel.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <CustomDropdown
                    name="role"
                    defaultValue="frontdesk"
                    options={[
                      { value: 'frontdesk', label: 'Front Desk Operator (Front Office only)' },
                      { value: 'housekeeping', label: 'Housekeeper (Room Status & Cleaning)' },
                      ...(isOwner
                        ? [{ value: 'manager', label: 'General Manager (Full Management Hub)' }]
                        : []),
                    ]}
                    aria-label="Staff role selection"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    name="department"
                    defaultValue="Front Office"
                    placeholder="Front Office, Housekeeping, F&B"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                  <input
                    name="password"
                    type="password"
                    defaultValue="ChangeMe-123!"
                    className={inputCls}
                  />
                </div>
              </div>

              <button type="submit" disabled={readOnly} className={btnCls}>
                Onboard Staff Member
              </button>
            </form>

            {/* Role Hierarchy Policy Matrix */}
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">System Role &amp; Permission Boundaries</h3>
              <div className="space-y-2.5 text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Housekeeping</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">Operations Only</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Can view room status, toggle Ready / Cleaning / Maintenance, return keys. Zero access to billing, guests, or management.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Front Desk</span>
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px]">Front Office Execution</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Check-in, check-out, tape chart, guest master, billing folios, F&amp;B POS orders, BoI Form C. No configuration access.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>General Manager</span>
                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px]">Operational Management</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Full access to Settings Hub: add rooms, set rates, dining zones, menu dishes, OTA APIs, staff invites, Night Audit.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>Property Owner</span>
                    <span className="rounded-full bg-amber-200 text-amber-950 px-2 py-0.5 text-[10px] font-extrabold">Full Authority</span>
                  </div>
                  <p className="text-amber-900 text-[11px]">
                    All Manager powers PLUS Bank UPI Receiver VPA, EDC POS Card machines, Owner Income P&amp;L Board Pack, and Multi-Hotel chain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 06. STATUTORY BOI, POLICE & GST COMPLIANCE */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'compliance') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700 font-extrabold text-sm">
                  ⚖️
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Statutory BoI &amp; Indian Legal Mandates
                </h2>
                <span className="rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                  BoI Form C · Police Midnight Beat · Dual GST
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Statutory foreign guest passport registration with the Bureau of Immigration and local police jurisdiction beat book.
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-900 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Statutory BoI Portal</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Indian Compliance Configurations</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bureau of Immigration (BoI) Hotel Code
                  </label>
                  <input
                    defaultValue="BOI-MH-MUM-4821"
                    className={inputCls}
                    placeholder="BoI registration code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Local Police Station Jurisdiction
                  </label>
                  <input
                    defaultValue="Marine Drive Police Station, Zone 1"
                    className={inputCls}
                    placeholder="Police jurisdiction"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rule 114B PAN Cash Payment Limit (₹)
                  </label>
                  <input
                    type="number"
                    defaultValue="50000"
                    className={inputCls}
                    placeholder="50000"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMsg({ type: 'ok', text: 'Compliance settings updated.' })}
                  className={btnCls}
                >
                  Save Statutory Settings
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Mandatory GST HSN/SAC Mapping</h3>
              <div className="space-y-2 text-xs">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-bold text-slate-900">SAC 996311: Room Accommodation</div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    12% GST when declared tariff &le; ₹7,500/night; 18% GST when declared tariff &gt; ₹7,500/night.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-bold text-slate-900">SAC 996331: Restaurant &amp; In-Room Dining</div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Flat 5% GST without input tax credit for hotel restaurants.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="font-bold text-slate-900">Dual GST Engine (CGST + SGST vs IGST)</div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Automatically splits intra-state stays into 2.5%/6%/9% CGST + SGST, or 5%/12%/18% IGST for interstate guests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 07. MARKETING & LOYALTY CRM */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'marketing') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-700 font-extrabold text-sm">
                  📣
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Marketing, Loyalty Program &amp; Guest Retention
                </h2>
                <span className="rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                  Silver · Gold · Platinum Tiers Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Setup loyalty tiers, points accumulation per stay, and automated WhatsApp guest review reminders.
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/marketing"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-900 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Marketing Hub</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Loyalty Tier Discount Settings</h3>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Silver Tier (%)</label>
                    <input defaultValue="5" type="number" min="0" max="30" className={`${inputCls} mt-1`} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Gold Tier (%)</label>
                    <input defaultValue="10" type="number" min="0" max="40" className={`${inputCls} mt-1`} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Platinum Tier (%)</label>
                    <input defaultValue="15" type="number" min="0" max="50" className={`${inputCls} mt-1`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loyalty Points per ₹100 Spent
                  </label>
                  <input defaultValue="10" type="number" className={inputCls} />
                </div>
                <button
                  type="button"
                  onClick={() => setMsg({ type: 'ok', text: 'Loyalty configuration saved.' })}
                  className={btnCls}
                >
                  Save Loyalty Rules
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">WhatsApp Automation Engine</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Send Google Review Link After Checkout
                  </label>
                  <CustomDropdown
                    defaultValue="2_hours"
                    options={[
                      { value: 'instant', label: 'Immediately on checkout settlement' },
                      { value: '2_hours', label: '2 hours after departure (Recommended)' },
                      { value: 'next_day', label: 'Next morning at 10:00 AM' },
                    ]}
                    aria-label="Review timing"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Business Review URL
                  </label>
                  <input
                    defaultValue="https://g.page/r/grandazure/review"
                    className={inputCls}
                    placeholder="https://g.page/r/yourhotel/review"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMsg({ type: 'ok', text: 'WhatsApp automation triggers updated.' })}
                  className={btnCls}
                >
                  Save WhatsApp Automation
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 08. KEYCARDS & ACCESS HARDWARE */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'keycards') && (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700 font-extrabold text-sm">
                  🔑
                </span>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  RFID Keycards &amp; Hardware Lock Sync
                </h2>
                <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {keycards.length} Physical Keys Encoded
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage physical hotel keycard inventory, slot rack hardware, and automated checkout key return.
              </p>
            </div>

            {/* CRITICAL: Direct operational link button beside manage */}
            <Link
              href="/keycards"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-900 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Go to Room Keycards</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Keycard Encoder Policy</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Encoder Frequency &amp; Lock Standard
                  </label>
                  <CustomDropdown
                    defaultValue="rfid_1356"
                    options={[
                      { value: 'rfid_1356', label: '13.56 MHz RFID / Mifare Classic 1K' },
                      { value: 'magstripe', label: 'Track 1/2 Magnetic Stripe Card' },
                      { value: 'ble_mobile', label: 'Bluetooth Mobile Key (BLE)' },
                    ]}
                    aria-label="Encoder frequency"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Automatically return keycard to slot on guest check-out</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Invalidate old key immediately when duplicate key is cut</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMsg({ type: 'ok', text: 'Hardware encoder settings updated.' })}
                  className={btnCls}
                >
                  Save Hardware Policy
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Keycard Inventory Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">In Slot Rack</div>
                  <div className="font-mono text-2xl font-black text-slate-900 mt-1">
                    {keycards.filter((k: any) => k.status === 'in_slot').length}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Issued to Guests</div>
                  <div className="font-mono text-2xl font-black text-emerald-600 mt-1">
                    {keycards.filter((k: any) => k.status === 'issued_to_guest').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
