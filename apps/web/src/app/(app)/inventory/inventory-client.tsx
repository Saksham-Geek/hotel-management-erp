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
  configureDishRecipeAction,
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
  recipesOverview = [],
  menuCategories = [],
}: {
  initialMaterials: RawMaterial[];
  initialCategories?: InventoryCategory[];
  initialMovements?: StockMovement[];
  vendors?: { id: string; name: string }[];
  recipesOverview?: Array<{
    menuItemId: string;
    itemName: string;
    categoryName?: string;
    sellingPrice: number;
    ingredientsCount: number;
    theoreticalCost: number;
    grossMarginPercent: number;
  }>;
  menuCategories?: Array<{
    id: string;
    name: string;
    items?: Array<{ id: string; name: string; price: number }>;
  }>;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ledger' | 'movements' | 'recipes'>('ledger');
  const [materials, setMaterials] = useState<RawMaterial[]>(initialMaterials);
  const [categories] = useState<InventoryCategory[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES
  );
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [recipes] = useState(recipesOverview);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeDishId, setRecipeDishId] = useState('');
  const [recipeMaterialId, setRecipeMaterialId] = useState('');
  const [recipeQty, setRecipeQty] = useState('0.25');

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

  // Adjust / Issue Form State
  const [adjustType, setAdjustType] = useState<'CONSUMPTION' | 'WASTAGE' | 'AUDIT_ADJUSTMENT'>('CONSUMPTION');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustDept, setAdjustDept] = useState('Main Kitchen');
  const [adjustReason, setAdjustReason] = useState('');

  // Edit Item Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('kg');
  const [editMinAlert, setEditMinAlert] = useState('');
  const [editCostPerUnit, setEditCostPerUnit] = useState('');
  const [editStorageLoc, setEditStorageLoc] = useState('');
  const [editVendor, setEditVendor] = useState('');

  const filtered = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.storageLocation && m.storageLocation.toLowerCase().includes(search.toLowerCase())) ||
      (m.defaultVendorName && m.defaultVendorName.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = materials.filter((m) => m.currentStock <= m.minimumAlertStock).length;
  const totalValuation = materials.reduce((acc, m) => acc + m.currentStock * m.costPerUnit, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
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

      if (!res.ok) throw new Error(res.error || 'Failed to create item');

      setIsAddModalOpen(false);
      setName('');
      router.refresh();

      if (res.item) {
        setMaterials((prev) => [res.item, ...prev]);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating item');
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || !restockQty) return;
    setError(null);
    setLoading(true);

    try {
      const res = await restockRawMaterialAction(restockItem.id, {
        quantity: parseFloat(restockQty),
        costPerUnit: restockUnitCost ? parseFloat(restockUnitCost) : undefined,
        notes: [
          restockVendor.trim() ? `Vendor: ${restockVendor.trim()}` : '',
          restockInvoiceRef.trim() ? `Ref: ${restockInvoiceRef.trim()}` : '',
          restockNotes.trim(),
        ].filter(Boolean).join(' | ') || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to restock item');

      setRestockItem(null);
      setRestockQty('');
      setRestockUnitCost('');
      setRestockVendor('');
      setRestockInvoiceRef('');
      setRestockNotes('');
      router.refresh();

      if (res.item) {
        setMaterials((prev) => prev.map((m) => (m.id === restockItem.id ? { ...m, ...res.item } : m)));
      }
    } catch (err: any) {
      setError(err.message || 'Error restocking item');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || !adjustQty) return;
    setError(null);
    setLoading(true);

    try {
      const res = await adjustRawMaterialAction(adjustItem.id, {
        movementType: adjustType,
        quantity: parseFloat(adjustQty),
        department: adjustType === 'CONSUMPTION' ? adjustDept : undefined,
        notes: adjustReason.trim() || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to adjust stock');

      setAdjustItem(null);
      setAdjustQty('');
      setAdjustReason('');
      router.refresh();

      if (res.item) {
        setMaterials((prev) => prev.map((m) => (m.id === adjustItem.id ? { ...m, ...res.item } : m)));
      }
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

  const handleLinkRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeDishId || !recipeMaterialId || !recipeQty) return;
    setLoading(true);
    setError(null);
    try {
      const res = await configureDishRecipeAction({
        menuItemId: recipeDishId,
        ingredients: [{ rawMaterialId: recipeMaterialId, quantityPerPortion: parseFloat(recipeQty) || 0.25 }],
      });
      if (!res.ok) throw new Error(res.error || 'Failed to link recipe');
      setIsRecipeModalOpen(false);
      router.refresh();
      alert('Recipe ingredient BOM linked successfully! Inventory will auto-deplete on KOT orders.');
    } catch (err: any) {
      setError(err.message || 'Error linking recipe');
    } finally {
      setLoading(false);
    }
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
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📦</span> Stores &amp; Kitchen Raw Material Inventory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track hotel stock, kitchen grocery consumption, reorder alerts, purchase receipt notes (GRN), and recipe BOM depletion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {/* Tabs Switcher: Current Stock vs Movement Ledger vs Recipe BOM */}
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

        <button
          type="button"
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${activeTab === 'recipes' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <span>🥗 Dish Recipe BOM &amp; Kitchen Depletion</span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
            {recipes.length} Dishes
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
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />

            <div className="w-full sm:w-64">
              <CustomDropdown
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` })),
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Storage Location</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3 text-right">Unit Cost (₹)</th>
                    <th className="px-4 py-3 text-right">Total Value (₹)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs dark:divide-slate-800">
                  {filtered.map((mat) => {
                    const isLow = mat.currentStock <= mat.minimumAlertStock;
                    const val = mat.currentStock * mat.costPerUnit;
                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{mat.name}</span>
                            {mat.defaultVendorName && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                · {mat.defaultVendorName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {mat.category}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            📍 {mat.storageLocation || 'Main Store'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {mat.currentStock} {mat.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          ₹{mat.costPerUnit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{val.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {isLow ? (
                            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              ⚠️ LOW (≤{mat.minimumAlertStock})
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ✓ OPTIMAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRestockItem(mat);
                                setRestockUnitCost(String(mat.costPerUnit));
                                setRestockVendor(mat.defaultVendorName || '');
                              }}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700"
                              title="Record Goods Receipt Note (GRN)"
                            >
                              + Stock In
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustItem(mat)}
                              className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
                              title="Department Issue or Spoilage"
                            >
                              - Issue
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(mat)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              title="Edit item properties"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(mat)}
                              className="rounded-lg border border-rose-200 px-1.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
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
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                        No materials found matching your search.
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
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
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

      {/* TAB 3: DISH RECIPE BOM & KITCHEN DEPLETION */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👨‍🍳</span>
              <div>
                <p className="font-bold">Automated Kitchen Inventory Depletion Active</p>
                <p className="text-[11px] opacity-80">
                  Every time restaurant waitstaff or room service punches a KOT, the linked raw materials are automatically deducted from the Store Inventory and logged in the Movements Audit Trail.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRecipeModalOpen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
            >
              + Link Recipe Ingredient (BOM)
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Menu Dish Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">Linked Ingredients</th>
                    <th className="px-4 py-3 text-right">Theoretical Raw Cost</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Gross Food Margin</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recipes.map((r) => (
                    <tr key={r.menuItemId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {r.itemName}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {r.categoryName || 'General'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full text-[11px]">
                          {r.ingredientsCount} raw items
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        ₹{r.theoreticalCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{r.sellingPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          r.grossMarginPercent >= 65 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          r.grossMarginPercent >= 45 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {r.grossMarginPercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setRecipeDishId(r.menuItemId);
                            setIsRecipeModalOpen(true);
                          }}
                          className="rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                        >
                          + Add Ingredient
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recipes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                        No restaurant dishes mapped yet. Click "+ Link Recipe Ingredient" to link menu items to store SKUs.
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
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Item / SKU Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Fresh Paneer, Amul Butter, Dental Kit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Store Category *
                  </label>
                  <CustomDropdown
                    value={category}
                    onChange={setCategory}
                    options={categories.map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Unit of Measurement *
                  </label>
                  <CustomDropdown value={unit} onChange={setUnit} options={UNIT_OPTIONS} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Min Alert *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={minimumAlertStock}
                    onChange={(e) => setMinimumAlertStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Cost/Unit (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Storage Location / Shelf
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dry Store Rack A, Walk-In Chiller"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Preferred Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Cash & Carry, Amrit Dairy"
                    value={defaultVendorName}
                    onChange={(e) => setDefaultVendorName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                  {loading ? 'Adding…' : '+ Add SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipe Link Modal */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🥗</span> Link Recipe Ingredient BOM
              </h2>
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkRecipe} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Select Restaurant Menu Dish *
                </label>
                <CustomDropdown
                  value={recipeDishId}
                  onChange={setRecipeDishId}
                  placeholder="Select a menu item…"
                  options={menuCategories.flatMap((c) =>
                    (c.items || []).map((i) => ({
                      value: i.id,
                      label: `${i.name} (₹${i.price})`,
                    }))
                  )}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Select Store Raw Material SKU *
                </label>
                <CustomDropdown
                  value={recipeMaterialId}
                  onChange={setRecipeMaterialId}
                  placeholder="Select a raw material SKU…"
                  options={materials.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.unit} @ ₹${m.costPerUnit})`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Portion Quantity Required *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={recipeQty}
                  onChange={(e) => setRecipeQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  placeholder="e.g. 0.25 (250g) or 0.1 (100ml)"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Linking…' : 'Save Recipe Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In / Goods Receipt Note (GRN) Modal */}
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

            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <p className="font-bold text-xs text-slate-900 dark:text-white">{restockItem.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current Stock: <span className="font-bold">{restockItem.currentStock} {restockItem.unit}</span> | Current Cost: ₹{restockItem.costPerUnit}/{restockItem.unit}
              </p>
            </div>

            <form onSubmit={handleRestock} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Quantity Received ({restockItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 25"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Purchase Rate (₹/{restockItem.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(restockItem.costPerUnit)}
                    value={restockUnitCost}
                    onChange={(e) => setRestockUnitCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Vendor Bill / Supplier Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro Cash & Carry Invoice #88124"
                  value={restockInvoiceRef}
                  onChange={(e) => setRestockInvoiceRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Receiving Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh morning delivery, temperature verified"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? 'Recording…' : 'Record GRN Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Out / Issue Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📤</span> Stock Out / Department Issue
              </h2>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <p className="font-bold text-xs text-slate-900 dark:text-white">{adjustItem.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Available to Issue: <span className="font-bold text-slate-900 dark:text-white">{adjustItem.currentStock} {adjustItem.unit}</span>
              </p>
            </div>

            <form onSubmit={handleAdjust} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Movement Purpose *
                </label>
                <CustomDropdown
                  value={adjustType}
                  onChange={(v) => setAdjustType(v as any)}
                  options={[
                    { value: 'CONSUMPTION', label: 'Department Consumption / Requisition' },
                    { value: 'WASTAGE', label: 'Spoilage, Expired or Damaged' },
                    { value: 'AUDIT_ADJUSTMENT', label: 'Physical Store Count Audit Variance' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Quantity ({adjustItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={adjustItem.currentStock}
                    placeholder={`Max ${adjustItem.currentStock}`}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {adjustType === 'CONSUMPTION' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Destination Dept *
                    </label>
                    <CustomDropdown
                      value={adjustDept}
                      onChange={setAdjustDept}
                      options={[
                        { value: 'Main Kitchen', label: 'Main Kitchen' },
                        { value: 'Banquet Kitchen', label: 'Banquet Kitchen' },
                        { value: 'Bar & Lounge', label: 'Bar & Lounge' },
                        { value: 'Housekeeping', label: 'Housekeeping' },
                        { value: 'Staff Welfare Mess', label: 'Staff Mess' },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Reason / Requisition Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily dinner buffet preparation requisition"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 disabled:opacity-50"
                >
                  {loading ? 'Deducting…' : 'Confirm Stock Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>✏️</span> Edit Store Item / SKU Details
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
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Item / SKU Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Store Category *
                  </label>
                  <CustomDropdown
                    value={editCategory}
                    onChange={setEditCategory}
                    options={categories.map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Unit *
                  </label>
                  <CustomDropdown value={editUnit} onChange={setEditUnit} options={UNIT_OPTIONS} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Min Alert Threshold *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editMinAlert}
                    onChange={(e) => setEditMinAlert(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Cost Per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCostPerUnit}
                    onChange={(e) => setEditCostPerUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={editStorageLoc}
                    onChange={(e) => setEditStorageLoc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Default Supplier
                  </label>
                  <input
                    type="text"
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
