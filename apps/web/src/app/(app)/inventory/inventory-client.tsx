'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomDropdown } from '@/components/ui';
import { createRawMaterialAction, restockRawMaterialAction } from './actions';

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
}

const CATEGORIES = [
  'Grocery',
  'Dairy & Perishables',
  'Meat & Poultry',
  'Spices & Condiments',
  'Beverages & Bar',
  'Housekeeping & Linen',
  'Stationery & Front Desk',
];

export function InventoryClient({ initialMaterials }: { initialMaterials: RawMaterial[] }) {
  const router = useRouter();
  const [materials, setMaterials] = useState<RawMaterial[]>(initialMaterials);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<RawMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Item Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('20');
  const [minimumAlertStock, setMinimumAlertStock] = useState('5');
  const [costPerUnit, setCostPerUnit] = useState('150');

  // Restock Form State
  const [restockQty, setRestockQty] = useState('');
  const [restockUnitCost, setRestockUnitCost] = useState('');
  const [restockNotes, setRestockNotes] = useState('');

  const filtered = materials.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
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
      });

      if (!res.ok) throw new Error(res.error || 'Failed to add item');

      setIsAddModalOpen(false);
      setName('');
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

      const res = await restockRawMaterialAction(restockItem.id, {
        quantity: qty,
        costPerUnit: unitCost,
        notes: restockNotes.trim() || undefined,
      });

      if (!res.ok) throw new Error(res.error || 'Failed to restock material');

      setRestockItem(null);
      setRestockQty('');
      setRestockUnitCost('');
      setRestockNotes('');
      router.refresh();

      // Update in memory
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

  const exportCSV = () => {
    const headers = ['Item Name', 'Category', 'Unit', 'Current Stock', 'Min Alert Threshold', 'Unit Cost (INR)', 'Total Value (INR)', 'Status'];
    const rows = filtered.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      m.category,
      m.unit,
      m.currentStock,
      m.minimumAlertStock,
      m.costPerUnit,
      (m.currentStock * m.costPerUnit).toFixed(2),
      m.currentStock <= m.minimumAlertStock ? 'LOW STOCK' : 'OPTIMAL',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotel_stores_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Stores &amp; Kitchen Raw Material Inventory
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Track hotel stock, kitchen grocery consumption, reorder alerts, and purchase receipt notes (GRN).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <span>📥 Export Stock CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>+ Add Material / SKU</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active SKUs / Stock Items</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{materials.length} Items</p>
          <p className="mt-1 text-[11px] text-slate-500">Groceries, perishables &amp; amenities</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Low Stock Reorder Alerts</span>
          <p className={`mt-2 text-2xl font-black ${lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
            {lowStockCount} Items
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Below minimum threshold</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Stock Valuation</span>
          <p className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Current store asset value</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inventory Health</span>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {materials.length > 0 ? Math.round(((materials.length - lowStockCount) / materials.length) * 100) : 100}% Optimal
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Stock availability ratio</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <input
          type="text"
          placeholder="Search materials by name (e.g. Basmati Rice, Butter, Milk, Chicken)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        />

        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Category:</span>
          <div className="flex-1">
            <CustomDropdown
              size="sm"
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
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
                      <button
                        type="button"
                        onClick={() => {
                          setRestockItem(m);
                          setRestockUnitCost(String(m.costPerUnit));
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 transition"
                      >
                        + Stock In
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    No store inventory items match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit of Measure *
                  </label>
                  <CustomDropdown
                    value={unit}
                    onChange={setUnit}
                    options={[
                      { value: 'kg', label: 'kg (Kilograms)' },
                      { value: 'litres', label: 'litres (Litres)' },
                      { value: 'packets', label: 'packets (Packs)' },
                      { value: 'pcs', label: 'pcs (Pieces / Units)' },
                      { value: 'grams', label: 'grams (Grams)' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Initial Stock
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

      {/* Stock In / Restock Modal */}
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
                    min="0.1"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vendor Bill / Supplier Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro Cash & Carry Invoice #98124"
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
    </div>
  );
}
