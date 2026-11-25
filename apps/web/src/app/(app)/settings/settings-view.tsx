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
  type DropdownOption,
  EmptyState,
} from '@/components/ui';
import { getRoomTypeTheme } from '@/lib/room-types';
import {
  createRoomSetting,
  createRoomTypeSetting,
  updateRoomTypeSetting,
  updateUpiSetting,
  updateKeySystemSetting,
  createPosTerminalSetting,
  saveChannelConnectionSetting,
  onboardStaffSetting,
  createExpenseCategorySetting,
  deleteExpenseCategorySetting,
  createVendorSetting,
  deleteVendorSetting,
  createCommonExpenseSetting,
  deleteCommonExpenseSetting,
  createVenueSetting,
  deleteVenueSetting,
  updateConciergeSetting,
} from './actions';
import { createRawMaterialAction } from '../inventory/actions';
import { createCorporateAccountAction } from '../corporate/actions';
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
  keySystemSettings?: {
    keySystemMode: 'brass_only' | 'rfid_only' | 'hybrid';
    enableMobileQr: boolean;
  };
  expenseCategories?: {
    id: string;
    code: string;
    name: string;
    icon: string;
    badgeColor: string;
    description: string | null;
    isSystem: boolean;
  }[];
  vendors?: {
    id: string;
    name: string;
    category: string;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    paymentTerms: string;
    isActive: boolean;
  }[];
  venues?: {
    id: string;
    name: string;
    type: string;
    maxPax: number;
    baseRentalRate: number;
    amenities: string[];
    isActive: boolean;
  }[];
  rawMaterials?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumAlertStock: number;
    costPerUnit: number;
  }[];
  corporateAccounts?: {
    id: string;
    companyName: string;
    gstin: string | null;
    panNumber: string | null;
    contactPerson: string | null;
    creditLimit: number;
    currentBalance: number;
    creditPeriodDays: number;
  }[];
  conciergeSettings?: {
    wifiSsid: string;
    wifiPassword: string;
    receptionPhone: string;
    receptionWhatsapp: string;
    breakfastTiming?: string;
    poolTiming?: string;
    gymTiming?: string;
    googleReviewUrl?: string;
  } | null;
  commonExpenses?: {
    id: string;
    name: string;
    categoryCode: string;
    defaultAmount: number;
    defaultVendorName: string | null;
    defaultPaymentMode: string;
    description: string | null;
    isActive: boolean;
  }[];
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
  keySystemSettings,
  expenseCategories = [],
  vendors = [],
  venues = [],
  rawMaterials = [],
  corporateAccounts = [],
  conciergeSettings = null,
  commonExpenses = [],
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

  const safeUsers = Array.isArray(users) ? users : ((users as any)?.staff ?? []);

  const tabsList = [
    { id: 'all', label: 'All Modules Overview', icon: '⚡', count: null },
    { id: 'rooms', label: 'Rooms & Rates', icon: '🏨', count: `${rooms.length} Rooms` },
    { id: 'restaurant', label: 'Restaurant & F&B', icon: '🍽️', count: `${tables.length} Tables` },
    { id: 'payments', label: 'Bank UPI & Hardware', icon: '💳', count: isOwner ? 'Owner' : 'Protected' },
    { id: 'channels', label: 'OTA Channel APIs', icon: '🌐', count: '5 OTAs' },
    { id: 'staff', label: 'Staff & Roles', icon: '👥', count: `${safeUsers.length} Staff` },
    { id: 'compliance', label: 'Police & GST Reports', icon: '⚖️', count: 'Govt Reports' },
    { id: 'marketing', label: 'Loyalty & Offers', icon: '📣', count: 'Loyalty CRM' },
    { id: 'keycards', label: 'Door Locks & Keys', icon: '🔑', count: `${keycards.length} Keys` },
    { id: 'expenses', label: 'Petty Cash & Vendors', icon: '💵', count: `${expenseCategories.length} Cats • ${vendors.length} Vendors` },
    { id: 'banquets', label: 'Banquets & Lawns', icon: '🎉', count: `${venues.length} Spaces` },
    { id: 'inventory', label: 'Stores & Stock', icon: '📦', count: `${rawMaterials.length} SKUs` },
    { id: 'corporate', label: 'Corporate Accounts (BTC)', icon: '💼', count: `${corporateAccounts.length} B2B` },
    { id: 'concierge', label: 'Digital Guest Concierge', icon: '🛎️', count: 'In-Room QR' },
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
              <div className="font-mono text-xl font-black text-white">{safeUsers.length}</div>
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

      {/* Tabs Navigation Bar - Wraps cleanly with zero horizontal scroll */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-200/90 dark:border-white/10" role="tablist" aria-label="Settings tabs">
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
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-slate-950 text-white shadow-md ring-2 ring-slate-950/15 dark:bg-white dark:text-slate-950 dark:ring-white/20'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-950 dark:bg-slate-800/80 dark:text-slate-300 dark:border-white/10 dark:hover:bg-slate-700'
              }`}
            >
              <span aria-hidden="true" className="text-sm">{t.icon}</span>
              <span>{t.label}</span>
              {t.count && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    active
                      ? 'bg-white/25 text-white dark:bg-slate-950/20 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
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
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Door Lock Hardware Type
                      </label>
                      <CustomDropdown
                        name="lockType"
                        defaultValue="both"
                        options={[
                          { value: 'both', label: '🗝️💳 Dual Lock (Smart Lock + Brass Master Key)' },
                          { value: 'rfid_card', label: '💳 RFID Smart Card Lock Only (Contactless MIFARE)' },
                          { value: 'brass_key', label: '🗝️ Physical Brass Keychain Only (Heritage)' },
                        ]}
                        aria-label="Door Lock Hardware Type"
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
                <table className="w-full min-w-[720px] text-left text-xs" aria-label="Menu dishes catalog">
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
                  {safeUsers.length} Team Members Configured
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
                  Door Locks &amp; Key Access Architecture
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  keySystemSettings?.keySystemMode === 'brass_only'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : keySystemSettings?.keySystemMode === 'rfid_only'
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {keySystemSettings?.keySystemMode === 'brass_only'
                    ? '🗝️ Boutique Heritage (Brass Only)'
                    : keySystemSettings?.keySystemMode === 'rfid_only'
                    ? '💳 Modern Hotel (RFID Only)'
                    : '🗝️💳 Hybrid Combination Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure your property lock standard: Traditional physical brass key tags, modern contactless MIFARE RFID smart cards, or a hybrid combination.
              </p>
            </div>

            <Link
              href="/keycards"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-900 transition-all shadow-xs cursor-pointer group"
            >
              <span>🚀 Open Front Desk Key Cabinet</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Property Key System Configuration Form */}
            <form action={updateKeySystemSetting} className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Property Lock &amp; Key Policy</h3>
              <p className="text-xs text-slate-500">
                Choose the lock hardware architecture that matches your property operations.
              </p>

              <div className="space-y-2.5">
                <label className={`block rounded-xl border p-3 cursor-pointer transition-all ${
                  (keySystemSettings?.keySystemMode || 'hybrid') === 'hybrid'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="keySystemMode"
                      value="hybrid"
                      defaultChecked={(keySystemSettings?.keySystemMode || 'hybrid') === 'hybrid'}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">🗝️💳 Hybrid / Combination (Recommended)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports both physical brass keychains and contactless RFID cards. Ideal for properties with heritage and modern wings, or smart locks with mechanical backup master keys.
                      </p>
                    </div>
                  </div>
                </label>

                <label className={`block rounded-xl border p-3 cursor-pointer transition-all ${
                  keySystemSettings?.keySystemMode === 'brass_only'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="keySystemMode"
                      value="brass_only"
                      defaultChecked={keySystemSettings?.keySystemMode === 'brass_only'}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">🗝️ Boutique / Heritage Hotel (Brass Keys Only)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Traditional solid brass numbered key tags. Hides electronic RFID encoder interfaces and focuses entirely on front desk slot cabinet custody &amp; audits.
                      </p>
                    </div>
                  </div>
                </label>

                <label className={`block rounded-xl border p-3 cursor-pointer transition-all ${
                  keySystemSettings?.keySystemMode === 'rfid_only'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="keySystemMode"
                      value="rfid_only"
                      defaultChecked={keySystemSettings?.keySystemMode === 'rfid_only'}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">💳 Modern Electronic Hotel (RFID Cards Only)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Contactless MIFARE / NFC smart keycards programmed via USB reader. Automatic expiration on checkout and instant replacement card invalidation.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="enableMobileQr"
                    defaultChecked={keySystemSettings?.enableMobileQr ?? true}
                    className="rounded text-indigo-600"
                  />
                  <span>📱 Enable Digital Smartphone QR Mobile Keycards for Checked-in Guests</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={readOnly}
                className={btnCls}
              >
                Save Lock Architecture Policy
              </button>
            </form>

            {/* Inventory & Active Hardware Breakdown */}
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Access Key Inventory &amp; Custody</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-amber-700 uppercase">🗝️ Brass Keychains</div>
                  <div className="font-mono text-2xl font-black text-slate-900">
                    {keycards.filter((k: any) => k.keyType === 'physical_brass').length}
                  </div>
                  <p className="text-[10px] text-slate-400">Pigeonhole tag cabinet</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-indigo-700 uppercase">💳 RFID Smart Cards</div>
                  <div className="font-mono text-2xl font-black text-slate-900">
                    {keycards.filter((k: any) => k.keyType === 'rfid_mifare').length}
                  </div>
                  <p className="text-[10px] text-slate-400">MIFARE / 13.56MHz</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">In Slot / Cabinet</div>
                  <div className="font-mono text-2xl font-black text-emerald-600">
                    {keycards.filter((k: any) => k.status === 'in_slot').length}
                  </div>
                  <p className="text-[10px] text-slate-400">Available at front desk</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-blue-700 uppercase">With Guests</div>
                  <div className="font-mono text-2xl font-black text-blue-600">
                    {keycards.filter((k: any) => k.status === 'issued_to_guest').length}
                  </div>
                  <p className="text-[10px] text-slate-400">Active checked-in stays</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                <p className="font-bold text-slate-900">Real-World PMS Automation Rules Active:</p>
                <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                  <li>Automated custody return to slot upon guest checkout or cancellation.</li>
                  <li>Security integrity: keys can only be issued to verified occupants of that specific room.</li>
                  <li>Tamper-proof custody audit logs tracking handovers between guests and front desk.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 9. PETTY CASH CATEGORIES & APPROVED HOTEL VENDORS CONSOLE */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'expenses') && (
        <section id="settings-expenses" className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">💵</span>
                <h2 className="text-lg font-bold text-slate-900">Petty Cash Categories &amp; Approved Vendors</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {expenseCategories.length} Categories • {vendors.length} Vendors
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Configure expense categories and approved suppliers (fuel, milk, laundry, electrical) with payment terms and GSTIN.
              </p>
            </div>
            <Link
              href="/expenses"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Go to Front Desk Expense Ledger ›</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Category Configuration Form & List */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">+ Create Expense Category</h3>
                <form action={createExpenseCategorySetting} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600">Category Name *</label>
                      <input
                        name="name"
                        required
                        placeholder="e.g. Pest Control, Gardening, Pool Chemicals"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Icon Emoji</label>
                      <input
                        name="icon"
                        defaultValue="📦"
                        placeholder="e.g. 🌿"
                        className={`${inputCls} text-center`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Description</label>
                    <input
                      name="description"
                      placeholder="e.g. Monthly pest fumigation or garden fertilizers"
                      className={inputCls}
                    />
                  </div>
                  <button type="submit" disabled={readOnly} className={btnCls}>
                    + Add Category
                  </button>
                </form>
              </div>

              {/* Categories List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Categories</h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
                  {expenseCategories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 hover:bg-slate-50/60">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{c.icon || '📦'}</span>
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{c.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.isSystem ? (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                            System
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => deleteExpenseCategorySetting(c.id)}
                            className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Approved Vendors Configuration Form & List */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">+ Register Approved Hotel Vendor</h3>
                <form action={createVendorSetting} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Vendor / Trade Name *</label>
                      <input name="name" required placeholder="e.g. Bharat Petroleum, City Dairy" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Category Tag</label>
                      <input name="category" placeholder="e.g. Fuel, Dairy, Hardware" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Contact Person</label>
                      <input name="contactPerson" placeholder="e.g. Ramesh Kumar" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Phone</label>
                      <input name="phone" placeholder="+91 98210 11223" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">GSTIN</label>
                      <input name="gstin" placeholder="15 Digits" className={`${inputCls} font-mono`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Terms</label>
                      <CustomDropdown
                        name="paymentTerms"
                        defaultValue="Cash on Delivery"
                        options={[
                          { value: 'Cash on Delivery', label: 'Cash on Delivery' },
                          { value: 'Weekly Cheque', label: 'Weekly Cheque' },
                          { value: 'Monthly Account', label: 'Monthly Account' },
                          { value: 'Net 15 Days', label: 'Net 15 Days' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Supplier Address / Depot</label>
                      <input name="address" placeholder="e.g. Station Road Sector 4" className={inputCls} />
                    </div>
                  </div>

                  <button type="submit" disabled={readOnly} className={btnCls}>
                    Register Vendor
                  </button>
                </form>
              </div>

              {/* Vendors List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Approved Suppliers</h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs max-h-80 overflow-y-auto">
                  {vendors.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 hover:bg-slate-50/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{v.name}</p>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {v.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {v.contactPerson && `${v.contactPerson} • `}{v.phone && `${v.phone} • `}Terms: {v.paymentTerms}
                        </p>
                        {v.gstin && <p className="text-[10px] font-mono text-slate-400">GST: {v.gstin}</p>}
                      </div>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => deleteVendorSetting(v.id)}
                        className="rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shrink-0"
                      >
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recurring Common Expense Items Catalog */}
          <div className="border-t border-slate-200/80 pt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>⚡</span> Recurring Common Expense Items Catalog
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-configure common recurring operational items (GenSet Diesel, Dairy Milk, Thermal Paper, Spares) for 1-click entry on front desk vouchers.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {commonExpenses.length} Items Configured
              </span>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Form to add Common Expense Item */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">+ Add Common Expense Template</h4>
                <form action={createCommonExpenseSetting} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Item Name *</label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. GenSet Diesel (40L) or Dairy Milk (20L)"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Expense Category *</label>
                      <CustomDropdown
                        name="categoryCode"
                        defaultValue={expenseCategories[0]?.code || 'DIESEL_GENSET'}
                        options={expenseCategories.map((c) => ({
                          value: c.code,
                          label: c.name,
                          icon: <span>{c.icon || '🏷️'}</span>,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Default Amount (₹ INR)</label>
                      <input
                        name="defaultAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue="0"
                        placeholder="e.g. 2800"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">Default Supplier / Vendor</label>
                      <input
                        name="defaultVendorName"
                        list="settings-vendor-suggestions"
                        placeholder="e.g. Bharat Petroleum"
                        className={inputCls}
                      />
                      <datalist id="settings-vendor-suggestions">
                        {vendors.map((v) => (
                          <option key={v.id} value={v.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Disbursed Mode</label>
                      <CustomDropdown
                        name="defaultPaymentMode"
                        defaultValue="CASH_DRAWER"
                        options={[
                          { value: 'CASH_DRAWER', label: 'Cash Drawer', icon: <span>💵</span> },
                          { value: 'UPI', label: 'Manager UPI', icon: <span>📱</span> },
                          { value: 'BANK_TRANSFER', label: 'Net Banking', icon: <span>🏦</span> },
                          { value: 'COMPANY_CARD', label: 'Company Card', icon: <span>💳</span> },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Standard Purpose / Description</label>
                    <input
                      name="description"
                      placeholder="e.g. Backup generator diesel refilling during power outages"
                      className={inputCls}
                    />
                  </div>

                  <button type="submit" disabled={readOnly} className={btnCls}>
                    + Add to Common Catalog
                  </button>
                </form>
              </div>

              {/* List of Configured Common Expense Items */}
              <div className="space-y-2 lg:col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Standard Items</h4>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs max-h-96 overflow-y-auto">
                  {commonExpenses.map((ci) => {
                    const cat = expenseCategories.find((c) => c.code === ci.categoryCode);
                    return (
                      <div key={ci.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/60">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl mt-0.5">{cat?.icon || '🏷️'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-[13px]">{ci.name}</p>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {cat?.name || ci.categoryCode}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {ci.defaultVendorName && `Vendor: ${ci.defaultVendorName} • `}
                              Disbursed: {ci.defaultPaymentMode.replace('_', ' ')}
                              {ci.description && ` • ${ci.description}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="font-mono font-bold text-slate-900 text-sm">
                              ₹{ci.defaultAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-400">Default rate</p>
                          </div>
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => deleteCommonExpenseSetting(ci.id)}
                            className="rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {commonExpenses.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No common expense items configured yet. Add recurring items above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 10. BANQUETS, LAWNS & CONFERENCE VENUES CONFIGURATION */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'banquets') && (
        <section id="settings-banquets" className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <h2 className="text-lg font-bold text-slate-900">Banquet Venues &amp; Event Lawns Configuration</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {venues.length} Configured Venues
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Setup banquet halls, wedding lawns, and corporate boardrooms with capacity, base rental tariffs, and AV/decor amenities.
              </p>
            </div>
            <Link
              href="/banquets"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Go to Live Banquet Calendar &amp; BEO ›</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">+ Add Banquet / Event Space</h3>
              <form action={createVenueSetting} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Venue Space Name *</label>
                  <input name="name" required placeholder="e.g. Royal Palms Wedding Lawn" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Venue Type</label>
                    <CustomDropdown
                      name="type"
                      defaultValue="BANQUET_HALL"
                      options={[
                        { value: 'BANQUET_HALL', label: 'Banquet Hall' },
                        { value: 'LAWN', label: 'Outdoor Lawn' },
                        { value: 'BOARDROOM', label: 'Executive Boardroom' },
                        { value: 'ROOFTOP_TERRACE', label: 'Rooftop Terrace' },
                        { value: 'CONFERENCE_CENTER', label: 'Conference Center' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Max Pax Capacity *</label>
                    <input name="maxPax" type="number" min="5" defaultValue="150" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Base Session Rental Rate (₹ INR) *</label>
                  <input name="baseRentalRate" type="number" min="0" defaultValue="45000" className={inputCls} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Key Amenities (Comma-separated)</label>
                  <input
                    name="amenities"
                    placeholder="Central AC, Stage, Projector, Sound System, Valet"
                    defaultValue="Central AC, Stage, Sound System, Valet Parking"
                    className={inputCls}
                  />
                </div>

                <button type="submit" disabled={readOnly} className={btnCls}>
                  + Create Event Space
                </button>
              </form>
            </div>

            {/* List */}
            <div className="col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Event Venues</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {venues.map((v) => (
                  <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                          {v.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-slate-600">
                        <span>Max Capacity: <strong>{v.maxPax} Pax</strong></span>
                        <span>Base Rental: <strong>₹{v.baseRentalRate.toLocaleString('en-IN')}</strong></span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {v.amenities.map((a: string, idx: number) => (
                          <span key={idx} className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-200/60">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => deleteVenueSetting(v.id)}
                        className="rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                      >
                        Deactivate Space
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 11. STORES & KITCHEN RAW MATERIAL INVENTORY CONFIGURATION */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'inventory') && (
        <section id="settings-inventory" className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <h2 className="text-lg font-bold text-slate-900">Stores &amp; Kitchen Raw Material Catalog</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {rawMaterials.length} Active SKUs
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Configure raw materials, ingredients, unit of measurement, reorder alert thresholds, and standard cost rates.
              </p>
            </div>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Go to Stores &amp; Stock Ledger ›</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Add Item Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">+ Add Material / Store SKU</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await createRawMaterialAction({
                    name: String(fd.get('name') || '').trim(),
                    category: String(fd.get('category') || 'Grocery'),
                    unit: String(fd.get('unit') || 'kg'),
                    currentStock: parseFloat(String(fd.get('currentStock') || 0)),
                    minimumAlertStock: parseFloat(String(fd.get('minimumAlertStock') || 5)),
                    costPerUnit: parseFloat(String(fd.get('costPerUnit') || 0)),
                  });
                  router.refresh();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Item Name *</label>
                  <input name="name" required placeholder="e.g. Basmati Rice, Butter, Paneer" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
                    <CustomDropdown
                      name="category"
                      defaultValue="Grocery"
                      options={[
                        { value: 'Grocery', label: 'Grocery' },
                        { value: 'Dairy & Perishables', label: 'Dairy & Perishables' },
                        { value: 'Meat & Poultry', label: 'Meat & Poultry' },
                        { value: 'Spices & Condiments', label: 'Spices & Condiments' },
                        { value: 'Beverages & Bar', label: 'Beverages & Bar' },
                        { value: 'Housekeeping & Linen', label: 'Housekeeping & Linen' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit</label>
                    <CustomDropdown
                      name="unit"
                      defaultValue="kg"
                      options={[
                        { value: 'kg', label: 'kg' },
                        { value: 'litres', label: 'litres' },
                        { value: 'packets', label: 'packets' },
                        { value: 'pcs', label: 'pcs' },
                        { value: 'grams', label: 'grams' },
                      ]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Stock</label>
                    <input name="currentStock" type="number" defaultValue="20" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Min Alert</label>
                    <input name="minimumAlertStock" type="number" defaultValue="5" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Cost/Unit</label>
                    <input name="costPerUnit" type="number" defaultValue="120" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={readOnly} className={btnCls}>
                  + Register SKU
                </button>
              </form>
            </div>

            {/* List */}
            <div className="col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Raw Materials</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs max-h-80 overflow-y-auto">
                {rawMaterials.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50/60">
                    <div>
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {m.category} • Current: <strong>{m.currentStock} {m.unit}</strong> • Reorder at: ≤{m.minimumAlertStock} {m.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-900">₹{m.costPerUnit}/{m.unit}</p>
                      <p className="text-[10px] text-slate-400">Value: ₹{(m.currentStock * m.costPerUnit).toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 12. CORPORATE ACCOUNTS & CITY LEDGER CONFIGURATION */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'corporate') && (
        <section id="settings-corporate" className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">💼</span>
                <h2 className="text-lg font-bold text-slate-900">Corporate Accounts &amp; Travel Agencies (BTC)</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {corporateAccounts.length} B2B Accounts
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Manage B2B company accounts, GSTIN, sanctioned credit limits, and credit period days for direct folio billing.
              </p>
            </div>
            <Link
              href="/corporate"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Go to City Ledger &amp; Aging Summary ›</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Add B2B Account Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">+ Register Corporate Account</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await createCorporateAccountAction({
                    companyName: String(fd.get('companyName') || '').trim(),
                    gstin: String(fd.get('gstin') || '').trim().toUpperCase() || undefined,
                    panNumber: String(fd.get('panNumber') || '').trim().toUpperCase() || undefined,
                    contactPerson: String(fd.get('contactPerson') || '').trim() || undefined,
                    creditLimit: parseFloat(String(fd.get('creditLimit') || 0)),
                    creditPeriodDays: parseInt(String(fd.get('creditPeriodDays') || 30)),
                    billingAddress: { address: String(fd.get('address') || '').trim() },
                  });
                  router.refresh();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Company / Agency Name *</label>
                  <input name="companyName" required placeholder="e.g. Infosys Ltd, TCS" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">GSTIN</label>
                    <input name="gstin" placeholder="15 Digits" className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">PAN</label>
                    <input name="panNumber" placeholder="10 Digits" className={`${inputCls} font-mono`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Contact Person</label>
                  <input name="contactPerson" placeholder="e.g. Rajiv Menon" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Credit Limit (₹)</label>
                    <input name="creditLimit" type="number" defaultValue="200000" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Terms (Days)</label>
                    <CustomDropdown
                      name="creditPeriodDays"
                      defaultValue="30"
                      options={[
                        { value: '15', label: '15 Days' },
                        { value: '30', label: '30 Days' },
                        { value: '45', label: '45 Days' },
                        { value: '60', label: '60 Days' },
                      ]}
                    />
                  </div>
                </div>
                <button type="submit" disabled={readOnly} className={btnCls}>
                  + Register Corporate Account
                </button>
              </form>
            </div>

            {/* List */}
            <div className="col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Corporate Accounts</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs max-h-80 overflow-y-auto">
                {corporateAccounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 hover:bg-slate-50/60">
                    <div>
                      <p className="font-bold text-slate-900">{a.companyName}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.contactPerson && `${a.contactPerson} • `}Terms: {a.creditPeriodDays} Days
                      </p>
                      {a.gstin && <p className="text-[10px] font-mono text-slate-400">GST: {a.gstin}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-900">Limit: ₹{a.creditLimit.toLocaleString('en-IN')}</p>
                      <p className="font-mono text-rose-600 font-bold">Due: ₹{a.currentBalance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 13. IN-ROOM DIGITAL GUEST CONCIERGE SETTINGS */}
      {/* ========================================================================= */}
      {(tab === 'all' || tab === 'concierge') && (
        <section id="settings-concierge" className="space-y-6 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🛎️</span>
                <h2 className="text-lg font-bold text-slate-900">In-Room Digital Guest Concierge Configuration</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  Guest QR Portal
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Configure in-room guest Wi-Fi details, front desk WhatsApp helpline, hotel amenity timings, and Google review link.
              </p>
            </div>
            <a
              href="/guest-portal?room=204"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <span>Preview Live In-Room Concierge (Room 204) ›</span>
            </a>
          </div>

          <form action={updateConciergeSetting} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Wi-Fi Settings */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">📶 Guest Wi-Fi Network</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Wi-Fi Network Name (SSID) *</label>
                    <input
                      name="wifiSsid"
                      required
                      defaultValue={conciergeSettings?.wifiSsid || 'GrandAzure_Guest_5G'}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Wi-Fi Password *</label>
                    <input
                      name="wifiPassword"
                      required
                      defaultValue={conciergeSettings?.wifiPassword || 'Welcome2026!'}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Front Desk Helpline & WhatsApp */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">💬 Front Desk Contact &amp; WhatsApp</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Reception Phone Helpline *</label>
                    <input
                      name="receptionPhone"
                      required
                      defaultValue={conciergeSettings?.receptionPhone || '+91 98765 43210'}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">Front Desk WhatsApp Direct *</label>
                    <input
                      name="receptionWhatsapp"
                      required
                      defaultValue={conciergeSettings?.receptionWhatsapp || '+91 98765 43210'}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hotel Amenities & Timings */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">🏨 Hotel Operating Hours &amp; Review Link</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Breakfast Buffet Hours</label>
                  <input
                    name="breakfastTiming"
                    defaultValue={conciergeSettings?.breakfastTiming || '7:00 AM - 10:30 AM (Coral Cafe)'}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Swimming Pool Hours</label>
                  <input
                    name="poolTiming"
                    defaultValue={conciergeSettings?.poolTiming || '6:00 AM - 8:00 PM'}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600">Fitness Gym Hours</label>
                  <input
                    name="gymTiming"
                    defaultValue={conciergeSettings?.gymTiming || '24 Hours (Keycard Access)'}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600">Google Maps 5-Star Review Link</label>
                <input
                  name="googleReviewUrl"
                  defaultValue={conciergeSettings?.googleReviewUrl || 'https://maps.google.com'}
                  placeholder="https://g.page/r/your-hotel-review"
                  className={inputCls}
                />
              </div>
            </div>

            <button type="submit" disabled={readOnly} className={btnCls}>
              Save In-Room Digital Concierge Settings
            </button>
          </form>
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
