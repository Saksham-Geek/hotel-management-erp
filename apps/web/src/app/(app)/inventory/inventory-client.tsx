'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomDropdown, type DropdownOption } from '@/components/ui';
import {
  createRawMaterialAction,
  updateRawMaterialAction,
  deleteRawMaterialAction,
  restockRawMaterialAction,
  adjustRawMaterialAction,
} from './actions';

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumAlertStock: number;
  costPerUnit: number;
  isLowStock: boolean;
  lastRestockedAt: string | null;
  skuCode?: string | null;
  defaultVendorName?: string | null;
  storageLocation?: string | null;
}

export interface InventoryCategory {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string | null;
  isSystem: boolean;
}

export interface StockMovement {
  id: string;
  rawMaterialId: string;
  materialName: string;
  unit: string;
  movementType: 'RESTOCK' | 'CONSUMPTION' | 'WASTAGE' | 'AUDIT_ADJUSTMENT';
  quantity: number;
  department: string | null;
  loggedBy: string | null;
  unitCost: number | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

const DEFAULT_CATEGORIES: InventoryCategory[] = [
  { id: '1', code: 'GROCERY', name: 'Dry Groceries & Staples', icon: '🌾', description: null, isSystem: true },
  { id: '2', code: 'DAIRY_PERISHABLES', name: 'Dairy & Perishables', icon: '🥛', description: null, isSystem: true },
  { id: '3', code: 'MEAT_POULTRY', name: 'Meat & Poultry', icon: '🥩', description: null, isSystem: true },
  { id: '4', code: 'SPICES_CONDIMENTS', name: 'Spices & Condiments', icon: '🧂', description: null, isSystem: true },
  { id: '5', code: 'BEVERAGES_BAR', name: 'Beverages & Bar', icon: '☕', description: null, isSystem: true },
  { id: '6', code: 'HOUSEKEEPING_AMENITIES', name: 'Housekeeping & Toiletries', icon: '🪥', description: null, isSystem: true },
  { id: '7', code: 'LINEN_LAUNDRY', name: 'Linen & Bedding Store', icon: '🧺', description: null, isSystem: true },
  { id: '8', code: 'CLEANING_CHEMICALS', name: 'Cleaning & Sanitizers', icon: '🧼', description: null, isSystem: true },
];

const UNIT_OPTIONS: DropdownOption[] = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'litres', label: 'litres (Litres)' },
  { value: 'packets', label: 'packets (Packs)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'grams', label: 'grams (Grams)' },
  { value: 'tins', label: 'tins (Cans)' },
  { value: 'bottles', label: 'bottles' },
  { value: 'boxes', label: 'boxes' },
];

export function InventoryClient({
  initialMaterials,
  initialCategories = [],
  initialMovements = [],
  vendors = [],
}: {
  initialMaterials: RawMaterial[];
  initialCategories?: InventoryCategory[];
  initialMovements?: StockMovement[];
  vendors?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ledger' | 'movements'>('ledger');
  const [materials, setMaterials] = useState<RawMaterial[]>(initialMaterials);
  const [categories] = useState<InventoryCategory[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES
  );
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<RawMaterial | null>(null);
  const [adjustItem, setAdjustItem] = useState<RawMaterial | null>(null);
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Item State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Dry Groceries & Staples');
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('20');
  const [minimumAlertStock, setMinimumAlertStock] = useState('5');
  const [costPerUnit, setCostPerUnit] = useState('150');
  const [storageLocation, setStorageLocation] = useState('Main Store');
  const [defaultVendorName, setDefaultVendorName] = useState('');

  // Restock Form State
  const [restockQty, setRestockQty] = useState('');
  const [restockUnitCost, setRestockUnitCost] = useState('');
  const [restockVendor, setRestockVendor] = useState('');
  const [restockInvoiceRef, setRestockInvoiceRef] = useState('');
  const [restockNotes, setRestockNotes] = useState('');

  // Stock Out / Issue State
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'CONSUMPTION' | 'WASTAGE' | 'AUDIT_ADJUSTMENT'>('CONSUMPTION');
  const [adjustDept, setAdjustDept] = useState('Main Kitchen');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Edit Item State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinAlert, setEditMinAlert] = useState('');
  const [editCostPerUnit, setEditCostPerUnit] = useState('');
  const [editStorageLoc, setEditStorageLoc] = useState('');
  const [editVendor, setEditVendor] = useState('');

  // Dynamic dropdown options
  const categoryFilterOptions: DropdownOption[] = [
    { value: 'ALL', label: 'All Categories' },
    ...categories.map((c) => ({
      value: c.name,
      label: c.name,
      icon: <span>{c.icon || '📦'}</span>,
    })),
  ];

  const categorySelectOptions: DropdownOption[] = categories.map((c) => ({
    value: c.name,
    label: c.name,
    icon: <span>{c.icon || '📦'}</span>,
  }));

  const filtered = materials.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.storageLocation && m.storageLocation.toLowerCase().includes(search.toLowerCase())) ||
      (m.defaultVendorName && m.defaultVendorName.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const lowStockCount = materials.filter((m) => m.isLowStock || m.currentStock <= m.minimumAlertStock).length;
  const totalValuation = materials.reduce((sum, m) => sum + m.currentStock * m.costPerUnit, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createRawMaterialAction({
        name: name.trim(),
        category,
        unit,
        currentStock: parseFloat(currentStock) || 0,
        minimumAlertStock: parseFloat(minimumAlertStock) || 0,
        costPerUnit: parseFloat(costPerUnit) || 0,
        storageLocation: storageLocation.trim() || undefined,
        defaultVendorName: defaultVendorName.trim() || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to add item');

      setIsAddModalOpen(false);
      setName('');
      setCurrentStock('20');
      setMinimumAlertStock('5');
      setCostPerUnit('150');
      router.refresh();
      if (res.item) {
        setMaterials([res.item, ...materials.filter((m) => m.id !== res.item.id)]);
      }
    } catch (err: any) {
      setError(err.message || 'Error adding item');
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    setError(null);
    setLoading(true);

    try {
      const qty = parseFloat(restockQty) || 0;
      const unitCost = restockUnitCost ? parseFloat(restockUnitCost) : undefined;
      const combinedNotes = [
        restockVendor ? `Supplier: ${restockVendor}` : '',
        restockInvoiceRef ? `Bill: ${restockInvoiceRef}` : '',
        restockNotes ? restockNotes.trim() : '',
      ]
        .filter(Boolean)
        .join(' • ');

      const res = await restockRawMaterialAction(restockItem.id, {
        quantity: qty,
        costPerUnit: unitCost,
        notes: combinedNotes || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to restock material');

      setRestockItem(null);
      setRestockQty('');
      setRestockUnitCost('');
      setRestockVendor('');
      setRestockInvoiceRef('');
      setRestockNotes('');
      router.refresh();

      setMaterials((prev) =>
        prev.map((m) =>
          m.id === restockItem.id
            ? {
                ...m,
                currentStock: m.currentStock + qty,
                costPerUnit: unitCost !== undefined ? unitCost : m.costPerUnit,
                isLowStock: m.currentStock + qty <= m.minimumAlertStock,
              }
            : m,
        ),
      );
    } catch (err: any) {
      setError(err.message || 'Error restocking');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    setError(null);
    setLoading(true);

    try {
      const qty = parseFloat(adjustQty) || 0;
      const res = await adjustRawMaterialAction(adjustItem.id, {
        quantity: qty,
        movementType: adjustType,
        department: adjustDept,
        notes: adjustNotes.trim() || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to adjust stock');

      setAdjustItem(null);
      setAdjustQty('');
      setAdjustNotes('');
      router.refresh();

      setMaterials((prev) =>
        prev.map((m) =>
          m.id === adjustItem.id
            ? {
                ...m,
                currentStock: Math.max(0, m.currentStock - qty),
                isLowStock: m.currentStock - qty <= m.minimumAlertStock,
              }
            : m,
        ),
      );
    } catch (err: any) {
      setError(err.message || 'Error adjusting stock');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setError(null);
    setLoading(true);

    try {
      const res = await updateRawMaterialAction(editItem.id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit,
        minimumAlertStock: parseFloat(editMinAlert) || 0,
        costPerUnit: parseFloat(editCostPerUnit) || 0,
        storageLocation: editStorageLoc.trim() || undefined,
        defaultVendorName: editVendor.trim() || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to update item');

      setEditItem(null);
      router.refresh();

      if (res.item) {
        setMaterials((prev) => prev.map((m) => (m.id === editItem.id ? { ...m, ...res.item } : m)));
      }
    } catch (err: any) {
      setError(err.message || 'Error updating item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: RawMaterial) => {
    if (!confirm(`Are you sure you want to delete "${item.name}" from store inventory?`)) return;
    setLoading(true);
    try {
      const res = await deleteRawMaterialAction(item.id);
      if (!res.ok) throw new Error(res.error || 'Failed to delete item');
      setMaterials((prev) => prev.filter((m) => m.id !== item.id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting item');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (m: RawMaterial) => {
    setEditItem(m);
    setEditName(m.name);
    setEditCategory(m.category);
    setEditUnit(m.unit);
    setEditMinAlert(String(m.minimumAlertStock));
    setEditCostPerUnit(String(m.costPerUnit));
    setEditStorageLoc(m.storageLocation || 'Main Store');
    setEditVendor(m.defaultVendorName || '');
  };

  const exportCSV = () => {
    const headers = ['Item Name', 'Category', 'Unit', 'Current Stock', 'Min Alert Threshold', 'Unit Cost (INR)', 'Total Value (INR)', 'Location', 'Supplier', 'Status'];
    const rows = filtered.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      m.category,
      m.unit,
      m.currentStock,
      m.minimumAlertStock,
      m.costPerUnit,
      (m.currentStock * m.costPerUnit).toFixed(2),
      m.storageLocation || 'Main Store',
      m.defaultVendorName || '',
      m.currentStock <= m.minimumAlertStock ? 'LOW STOCK' : 'OPTIMAL',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotel_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>📦</span> Stores &amp; Kitchen Raw Material Inventory
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Track hotel stock, kitchen grocery consumption, Goods Receipt Notes (GRN), and department requisitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings?tab=inventory"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <span>⚙️ Manage in Settings</span>
          </Link>
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <span>📥 Export Stock CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 shadow-sm"
          >
            <span>+ Add Material / SKU</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active SKUs / Stock Items</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{materials.length} Items</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Groceries, perishables &amp; amenities</p>
        </div>

        <div className={`rounded-2xl border p-5 shadow-2xs ${lowStockCount > 0 ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20' : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Low Stock Reorder Alerts</p>
          <p className={`mt-2 text-2xl font-bold ${lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {lowStockCount} Items
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Below minimum threshold</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Stock Valuation</p>
          <p className="mt-2 text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Current store asset value</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Inventory Health</p>
          <p className="mt-2 text-2xl font-bold text-teal-600 dark:text-teal-400">
            {materials.length > 0 ? Math.round(((materials.length - lowStockCount) / materials.length) * 100) : 100}% Optimal
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Stock availability ratio</p>
        </div>
      </div>

      {/* Tabs Switcher: Current Stock vs Movement Ledger */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'ledger' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <span>📦 Current Store Inventory</span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {filtered.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'movements' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <span>📋 Goods Receipts (GRN) &amp; Movements Audit Trail</span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {movements.length} Logs
          </span>
        </button>
      </div>

      {/* TAB 1: CURRENT STORE INVENTORY */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <input
              type="text"
              placeholder="Search materials by name, location, or supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />

            <div className="flex items-center gap-2 min-w-[220px]">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Category:</span>
              <div className="flex-1">
                <CustomDropdown
                  size="sm"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={categoryFilterOptions}
                />
              </div>
            </div>
          </div>

          {/* Materials Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Location / Vendor</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3 text-right">Reorder Alert</th>
                    <th className="px-4 py-3 text-right">Unit Cost (₹)</th>
                    <th className="px-4 py-3 text-right">Total Value (₹)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs dark:divide-slate-800">
                  {filtered.map((m) => {
                    const isLow = m.currentStock <= m.minimumAlertStock;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {m.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {m.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          <p>{m.storageLocation || 'Main Store'}</p>
                          {m.defaultVendorName && <p className="text-[10px] text-slate-400">{m.defaultVendorName}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {m.currentStock.toFixed(2)} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          ≤ {m.minimumAlertStock.toFixed(2)} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          ₹{m.costPerUnit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                          ₹{(m.currentStock * m.costPerUnit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <span className="inline-flex rounded-full bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider animate-pulse">
                              ⚠️ Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                              ✓ Optimal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRestockItem(m);
                                setRestockUnitCost(String(m.costPerUnit));
                                setRestockVendor(m.defaultVendorName || '');
                              }}
                              className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 transition"
                            >
                              + Stock In
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustItem(m);
                                setAdjustQty('');
                                setAdjustNotes('');
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                            >
                              - Issue
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(m)}
                              className="rounded-lg bg-slate-100 p-1 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                              title="Edit SKU"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m)}
                              className="rounded-lg bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 transition"
                              title="Delete SKU"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                        No store inventory items match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOODS RECEIPTS & STOCK MOVEMENTS AUDIT TRAIL */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Item / SKU</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3">Department / Destination</th>
                    <th className="px-4 py-3">Notes &amp; Reference</th>
                    <th className="px-4 py-3">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs dark:divide-slate-800">
                  {movements.map((mov) => {
                    const isRestock = mov.movementType === 'RESTOCK';
                    const isWastage = mov.movementType === 'WASTAGE';
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(mov.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {isRestock && (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              + GRN Restock
                            </span>
                          )}
                          {mov.movementType === 'CONSUMPTION' && (
                            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                              - Dept Issue
                            </span>
                          )}
                          {isWastage && (
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              ⚠️ Wastage / Spoilage
                            </span>
                          )}
                          {mov.movementType === 'AUDIT_ADJUSTMENT' && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Audit Variance
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {mov.materialName}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${isRestock ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                          {isRestock ? '+' : '-'}{mov.quantity} {mov.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {mov.department || 'Main Store'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {mov.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">
                          {mov.loggedBy || 'Staff'}
                        </td>
                      </tr>
                    );
                  })}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                        No goods receipt or stock movements logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📦</span> Add New Store / Raw Material SKU
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Biryani Rice, Amul Butter, Fresh Paneer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <CustomDropdown
                    value={category}
                    onChange={setCategory}
                    options={categorySelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit of Measure *
                  </label>
                  <CustomDropdown
                    value={unit}
                    onChange={setUnit}
                    options={UNIT_OPTIONS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Dry Store, Chiller, Bar Cellar"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default Supplier
                  </label>
                  <input
                    type="text"
                    list="inventory-vendor-list"
                    placeholder="e.g. Metro Cash & Carry"
                    value={defaultVendorName}
                    onChange={(e) => setDefaultVendorName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <datalist id="inventory-vendor-list">
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Initial Stock ({unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Min Alert Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumAlertStock}
                    onChange={(e) => setMinimumAlertStock(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? 'Adding…' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In / Restock Modal (GRN) */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📥</span> Stock In / Goods Receipt (GRN)
              </h2>
              <button
                type="button"
                onClick={() => setRestockItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">{restockItem.name}</p>
              <p className="text-slate-500 mt-0.5">
                Current Stock: <strong>{restockItem.currentStock} {restockItem.unit}</strong> | Current Cost: ₹{restockItem.costPerUnit}/{restockItem.unit}
              </p>
            </div>

            <form onSubmit={handleRestock} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quantity Received ({restockItem.unit}) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="e.g. 25"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Purchase Rate (₹/{restockItem.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Leave blank to keep current"
                    value={restockUnitCost}
                    onChange={(e) => setRestockUnitCost(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    list="grn-vendor-list"
                    placeholder="e.g. Metro Cash & Carry"
                    value={restockVendor}
                    onChange={(e) => setRestockVendor(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <datalist id="grn-vendor-list">
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Vendor Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-948"
                    value={restockInvoiceRef}
                    onChange={(e) => setRestockInvoiceRef(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes / GRN Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning fresh dairy delivery batch 04"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? 'Receiving…' : 'Record GRN Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Out / Department Issue / Wastage Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📤</span> Stock Issue / Wastage Deduction
              </h2>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">{adjustItem.name}</p>
              <p className="text-slate-500 mt-0.5">
                Current Stock: <strong className="text-slate-800 dark:text-slate-200">{adjustItem.currentStock} {adjustItem.unit}</strong> | Location: {adjustItem.storageLocation || 'Main Store'}
              </p>
            </div>

            <form onSubmit={handleAdjust} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quantity to Deduct ({adjustItem.unit}) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={adjustItem.currentStock}
                    step="0.01"
                    required
                    placeholder={`Max ${adjustItem.currentStock}`}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Movement Type *
                  </label>
                  <CustomDropdown
                    value={adjustType}
                    onChange={(val) => setAdjustType(val as any)}
                    options={[
                      { value: 'CONSUMPTION', label: 'Department Issue (Use)' },
                      { value: 'WASTAGE', label: 'Spoiled / Damaged' },
                      { value: 'AUDIT_ADJUSTMENT', label: 'Physical Audit Variance' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Receiving Department *
                </label>
                <CustomDropdown
                  value={adjustDept}
                  onChange={setAdjustDept}
                  options={[
                    { value: 'Main Kitchen', label: 'Main Kitchen' },
                    { value: 'Banquet Kitchen', label: 'Banquet & Events Kitchen' },
                    { value: 'Bar & Lounge', label: 'Bar & Beverage Counter' },
                    { value: 'Housekeeping & Linen', label: 'Housekeeping & Floor Pantry' },
                    { value: 'Room Service', label: 'Room Service' },
                    { value: 'Front Desk / Lobby', label: 'Front Desk / Reception' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes / Chef Requisition # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Issued for Dinner Buffet prep / Batch #12"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? 'Deducting…' : 'Record Issue / Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit SKU Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>✏️</span> Edit Store SKU: {editItem.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <CustomDropdown
                    value={editCategory}
                    onChange={setEditCategory}
                    options={categorySelectOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit of Measure *
                  </label>
                  <CustomDropdown
                    value={editUnit}
                    onChange={setEditUnit}
                    options={UNIT_OPTIONS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={editStorageLoc}
                    onChange={(e) => setEditStorageLoc(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default Supplier
                  </label>
                  <input
                    type="text"
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Min Alert Threshold ({editUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editMinAlert}
                    onChange={(e) => setEditMinAlert(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editCostPerUnit}
                    onChange={(e) => setEditCostPerUnit(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
