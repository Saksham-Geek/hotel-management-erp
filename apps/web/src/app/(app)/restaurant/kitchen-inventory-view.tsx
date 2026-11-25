'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CustomDropdown } from '@/components/ui';
import {
  getRawMaterialsAction,
  createRawMaterialAction,
  restockRawMaterialAction,
  getDishRecipeAction,
  configureDishRecipeAction,
} from './actions';
import type { MenuCategoryDto } from './restaurant-pos-view';

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumAlertStock: number;
  costPerUnit: number;
  isLowStock: boolean;
  lastRestockedAt?: string | null;
}

interface RecipeIngredient {
  id?: string;
  rawMaterialId: string;
  materialName?: string;
  unit?: string;
  quantityPerPortion: number;
  costPerUnit?: number;
  ingredientCost?: number;
}

export function KitchenInventoryView({
  categories,
}: {
  categories: MenuCategoryDto[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'recipes'>('materials');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<RawMaterial | null>(null);
  const [restockQty, setRestockQty] = useState('5');
  const [restockRate, setRestockRate] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  // Add material modal
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatCat, setNewMatCat] = useState('Grocery');
  const [newMatUnit, setNewMatUnit] = useState('kg');
  const [newMatStock, setNewMatStock] = useState('10');
  const [newMatMin, setNewMatMin] = useState('3');
  const [newMatCost, setNewMatCost] = useState('150');
  const [isCreatingMat, setIsCreatingMat] = useState(false);

  // Recipe manager state
  const allDishes = useMemo(() => {
    return categories.flatMap((c) =>
      c.items.map((it) => ({ ...it, categoryName: c.name }))
    );
  }, [categories]);

  const [selectedDishId, setSelectedDishId] = useState<string>(allDishes[0]?.id || '');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ ok?: string; err?: string } | null>(null);

  const selectedDish = useMemo(() => {
    return allDishes.find((d) => d.id === selectedDishId) || allDishes[0];
  }, [allDishes, selectedDishId]);

  const loadMaterials = async () => {
    setIsLoading(true);
    const res = await getRawMaterialsAction();
    if (res.ok && res.data) {
      setMaterials(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadRecipe = async (dishId: string) => {
    if (!dishId) return;
    setIsLoadingRecipe(true);
    const res = await getDishRecipeAction(dishId);
    if (res.ok && res.data) {
      setRecipeIngredients(res.data);
    } else {
      setRecipeIngredients([]);
    }
    setIsLoadingRecipe(false);
  };

  useEffect(() => {
    if (selectedDishId) {
      loadRecipe(selectedDishId);
    }
  }, [selectedDishId]);

  // Filtered raw materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [materials, categoryFilter, searchQuery]);

  // Stats
  const lowStockCount = materials.filter((m) => m.isLowStock).length;
  const totalValuation = materials.reduce((sum, m) => sum + m.currentStock * m.costPerUnit, 0);

  // Material categories
  const materialCategories = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.category)));
  }, [materials]);

  // Food cost calculation for active dish
  const totalPortionCost = useMemo(() => {
    return recipeIngredients.reduce((sum, ing) => {
      const mat = materials.find((m) => m.id === ing.rawMaterialId);
      const costPerUnit = ing.costPerUnit ?? mat?.costPerUnit ?? 0;
      return sum + ing.quantityPerPortion * costPerUnit;
    }, 0);
  }, [recipeIngredients, materials]);

  const foodCostPct = useMemo(() => {
    const dishPrice = Number(selectedDish?.price || 0);
    if (!selectedDish || dishPrice <= 0) return 0;
    return Math.round((totalPortionCost / dishPrice) * 1000) / 10;
  }, [selectedDish, totalPortionCost]);

  // Restock handler
  const handleExecuteRestock = async () => {
    if (!restockTarget) return;
    setIsRestocking(true);
    setFeedbackMsg(null);
    try {
      const res = await restockRawMaterialAction(restockTarget.id, {
        quantity: parseFloat(restockQty) || 0,
        costPerUnit: restockRate ? parseFloat(restockRate) : undefined,
        notes: restockNotes || undefined,
      });
      if (res.error) throw new Error(res.error);
      setFeedbackMsg({ ok: res.data?.message || 'Stock updated successfully!' });
      setRestockTarget(null);
      await loadMaterials();
    } catch (err: any) {
      setFeedbackMsg({ err: err.message || 'Restock failed' });
    } finally {
      setIsRestocking(false);
    }
  };

  // Add material handler
  const handleCreateMaterial = async () => {
    if (!newMatName.trim()) return;
    setIsCreatingMat(true);
    setFeedbackMsg(null);
    try {
      const res = await createRawMaterialAction({
        name: newMatName.trim(),
        category: newMatCat,
        unit: newMatUnit,
        currentStock: parseFloat(newMatStock) || 0,
        minimumAlertStock: parseFloat(newMatMin) || 3,
        costPerUnit: parseFloat(newMatCost) || 0,
      });
      if (res.error) throw new Error(res.error);
      setFeedbackMsg({ ok: res.data?.message || 'Raw material added!' });
      setIsAddMaterialOpen(false);
      setNewMatName('');
      await loadMaterials();
    } catch (err: any) {
      setFeedbackMsg({ err: err.message || 'Failed to add raw material' });
    } finally {
      setIsCreatingMat(false);
    }
  };

  // Recipe save handler
  const handleSaveRecipe = async () => {
    if (!selectedDish) return;
    setIsSavingRecipe(true);
    setFeedbackMsg(null);
    try {
      const res = await configureDishRecipeAction(
        selectedDish.id,
        recipeIngredients.map((r) => ({
          rawMaterialId: r.rawMaterialId,
          quantityPerPortion: r.quantityPerPortion,
        }))
      );
      if (res.error) throw new Error(res.error);
      setFeedbackMsg({ ok: `Recipe BOM saved for "${selectedDish.name}"!` });
      await loadRecipe(selectedDish.id);
    } catch (err: any) {
      setFeedbackMsg({ err: err.message || 'Failed to save recipe' });
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const addIngredientToDish = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return;
    if (recipeIngredients.some((r) => r.rawMaterialId === materialId)) return;
    setRecipeIngredients((prev) => [
      ...prev,
      {
        rawMaterialId: mat.id,
        materialName: mat.name,
        unit: mat.unit,
        quantityPerPortion: mat.unit === 'kg' ? 0.15 : mat.unit === 'l' ? 0.1 : 1,
        costPerUnit: mat.costPerUnit,
      },
    ]);
  };

  const removeIngredientFromDish = (materialId: string) => {
    setRecipeIngredients((prev) => prev.filter((r) => r.rawMaterialId !== materialId));
  };

  const updateIngredientPortion = (materialId: string, qty: number) => {
    setRecipeIngredients((prev) =>
      prev.map((r) => (r.rawMaterialId === materialId ? { ...r, quantityPerPortion: qty } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Raw Materials
          </span>
          <p className="mt-1 font-mono text-3xl font-black text-slate-900 dark:text-white">
            {materials.length} <span className="text-xs font-normal text-slate-400">items</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Auto-depleted on each KOT dispatch</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs dark:border-amber-500/20 dark:bg-amber-500/5">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider dark:text-amber-400">
            Low Stock Alerts
          </span>
          <p className="mt-1 font-mono text-3xl font-black text-amber-700 dark:text-amber-400">
            {lowStockCount} <span className="text-xs font-normal text-amber-600/80">items below min</span>
          </p>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300">
            {lowStockCount > 0 ? 'Restock needed immediately to avoid 86\'ing' : 'All raw material stocks healthy'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider dark:text-emerald-400">
            Kitchen Inventory Valuation
          </span>
          <p className="mt-1 font-mono text-3xl font-black text-emerald-700 dark:text-emerald-400">
            ₹{Math.round(totalValuation).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300">
            Real-time FIFO weighted purchase cost
          </p>
        </div>
      </div>

      {feedbackMsg?.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
          ✓ {feedbackMsg.ok}
        </div>
      )}
      {feedbackMsg?.err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">
          ✕ {feedbackMsg.err}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('materials')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeSubTab === 'materials'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            📦 Raw Materials Stock Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('recipes')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeSubTab === 'recipes'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            🍳 Dish Recipes &amp; Food Costing BOM
          </button>
        </div>

        {activeSubTab === 'materials' && (
          <button
            type="button"
            onClick={() => setIsAddMaterialOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            + Add Raw Material
          </button>
        )}
      </div>

      {/* SUB-TAB 1: Raw Materials Stock Ledger */}
      {activeSubTab === 'materials' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ingredient (e.g. Paneer, Butter, Basmati)..."
              className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-slate-400 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />

            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All
              </button>
              {materialCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                <tr>
                  <th className="p-3.5">Raw Material Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Current Stock</th>
                  <th className="p-3.5">Min Alert Level</th>
                  <th className="p-3.5">Unit Cost (₹)</th>
                  <th className="p-3.5">Total Value (₹)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Loading inventory records...
                    </td>
                  </tr>
                ) : filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No raw materials found. Click &quot;+ Add Raw Material&quot; to begin tracking kitchen stock.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((mat) => (
                    <tr
                      key={mat.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] ${
                        mat.isLowStock ? 'bg-amber-50/30 dark:bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {mat.name}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {mat.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-sm font-black text-slate-900 dark:text-white">
                        {mat.currentStock.toFixed(2)} {mat.unit}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {mat.minimumAlertStock} {mat.unit}
                      </td>
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                        ₹{mat.costPerUnit.toFixed(2)}/{mat.unit}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-600">
                        ₹{Math.round(mat.currentStock * mat.costPerUnit).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            mat.isLowStock
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400'
                          }`}
                        >
                          {mat.isLowStock ? '⚠️ Low Stock' : '✓ In Stock'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setRestockTarget(mat);
                            setRestockQty('10');
                            setRestockRate(String(mat.costPerUnit));
                            setRestockNotes('');
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Dish Recipes BOM & Costing */}
      {activeSubTab === 'recipes' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Dish Selector Column */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/10">
              Select Menu Item ({allDishes.length})
            </h3>
            <div className="mt-3 max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
              {allDishes.map((dish) => {
                const isSelected = dish.id === selectedDish?.id;
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedDishId(dish.id)}
                    className={`w-full flex items-center justify-between rounded-xl p-2.5 text-left text-xs transition ${
                      isSelected
                        ? 'bg-slate-950 text-white font-bold shadow-xs dark:bg-white dark:text-slate-950'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate">{dish.name}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                        {dish.categoryName}
                      </p>
                    </div>
                    <span className="font-mono font-bold shrink-0">₹{dish.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe Configuration Column */}
          <div className="lg:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
            {selectedDish && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recipe BOM &amp; Food Cost
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedDish.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Selling Price: <strong className="text-slate-900 dark:text-white">₹{selectedDish.price}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-500">Portion Cost / Margin</span>
                    <p className="text-xl font-mono font-black text-emerald-600">
                      ₹{totalPortionCost.toFixed(2)}{' '}
                      <span className={`text-xs font-bold ${foodCostPct > 35 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        ({foodCostPct}% cost)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Ingredients in Recipe */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Configured Ingredients ({recipeIngredients.length})
                    </h4>
                    <span className="text-[11px] text-slate-400">Depleted automatically per portion</span>
                  </div>

                  {isLoadingRecipe ? (
                    <p className="text-xs text-slate-400 p-4 text-center">Loading recipe BOM...</p>
                  ) : recipeIngredients.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-white/10">
                      No raw materials linked to this dish yet. Pick an ingredient below to add!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recipeIngredients.map((ing) => {
                        const mat = materials.find((m) => m.id === ing.rawMaterialId);
                        const cost = ing.quantityPerPortion * (mat?.costPerUnit || 0);
                        return (
                          <div
                            key={ing.rawMaterialId}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-white/5 dark:bg-white/[0.02]"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="font-bold text-slate-900 dark:text-white">{ing.materialName || mat?.name}</p>
                              <p className="text-[10px] text-slate-400">
                                @ ₹{mat?.costPerUnit || 0}/{mat?.unit || 'kg'} • Cost: ₹{cost.toFixed(2)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <label className="text-[11px] text-slate-500">Portion Qty:</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.001"
                                value={ing.quantityPerPortion}
                                onChange={(e) =>
                                  updateIngredientPortion(ing.rawMaterialId, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono font-bold dark:border-white/10 dark:bg-slate-800"
                              />
                              <span className="text-xs text-slate-500 w-8">{ing.unit || mat?.unit}</span>
                              <button
                                type="button"
                                onClick={() => removeIngredientFromDish(ing.rawMaterialId)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New Ingredient Picker */}
                  <div className="border-t border-slate-100 pt-3 dark:border-white/10">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      + Add Ingredient to Recipe
                    </label>
                    <CustomDropdown
                      placeholder="Select a raw material to link..."
                      value=""
                      onChange={(val) => {
                        if (val) addIngredientToDish(val);
                      }}
                      options={materials
                        .filter((m) => !recipeIngredients.some((r) => r.rawMaterialId === m.id))
                        .map((m) => ({
                          value: m.id,
                          label: `${m.name} (${m.category} • ₹${m.costPerUnit}/${m.unit})`,
                        }))}
                    />
                  </div>

                  {/* Save CTA */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isSavingRecipe}
                      onClick={handleSaveRecipe}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50"
                    >
                      {isSavingRecipe ? 'Saving BOM...' : 'Save Recipe BOM →'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Restock: {restockTarget.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Stock: {restockTarget.currentStock} {restockTarget.unit}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Incoming Quantity ({restockTarget.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold dark:border-white/10 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purchase Rate / {restockTarget.unit} (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  value={restockRate}
                  onChange={(e) => setRestockRate(e.target.value)}
                  placeholder={`Current: ₹${restockTarget.costPerUnit}`}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold dark:border-white/10 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier / PO Notes
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Amul Dairy Invoice #402"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs dark:border-white/10 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestocking}
                onClick={handleExecuteRestock}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
              >
                {isRestocking ? 'Updating...' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Material Modal */}
      {isAddMaterialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add Raw Material
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define raw kitchen ingredient for automatic stock depletion
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ingredient Name
                </label>
                <input
                  type="text"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  placeholder="e.g. Basmati Rice XXL, Amul Butter"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold dark:border-white/10 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <CustomDropdown
                    value={newMatCat}
                    onChange={setNewMatCat}
                    options={[
                      { value: 'Dairy', label: 'Dairy' },
                      { value: 'Grocery', label: 'Grocery' },
                      { value: 'Produce', label: 'Produce' },
                      { value: 'Meat & Poultry', label: 'Meat & Poultry' },
                      { value: 'Spices', label: 'Spices' },
                      { value: 'Beverages', label: 'Beverages' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <CustomDropdown
                    value={newMatUnit}
                    onChange={setNewMatUnit}
                    options={[
                      { value: 'kg', label: 'kg (Kilograms)' },
                      { value: 'g', label: 'g (Grams)' },
                      { value: 'l', label: 'l (Litres)' },
                      { value: 'ml', label: 'ml (Millilitres)' },
                      { value: 'pcs', label: 'pcs (Pieces)' },
                      { value: 'pkt', label: 'pkt (Packets)' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newMatStock}
                    onChange={(e) => setNewMatStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold dark:border-white/10 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Alert
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newMatMin}
                    onChange={(e) => setNewMatMin(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold dark:border-white/10 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost/Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={newMatCost}
                    onChange={(e) => setNewMatCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold dark:border-white/10 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsAddMaterialOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingMat}
                onClick={handleCreateMaterial}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs dark:bg-white dark:text-slate-950"
              >
                {isCreatingMat ? 'Saving...' : 'Add Ingredient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
