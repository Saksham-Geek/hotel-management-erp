import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import { InventoryClient } from './inventory-client';

export const metadata = {
  title: 'Stores & Kitchen Raw Material Inventory | Hotel ERP',
  description: 'Manage store goods, kitchen raw materials, stock replenishment, and low stock alerts.',
};

export default async function InventoryPage() {
  const [ent, [materials, categories, movements, vendors, recipesOverview, menuCategories]] = await Promise.all([
    requireFeature(FEATURES.HOTEL_INVENTORY),
    Promise.all([
      api<any[]>('/hotel/restaurant/inventory/raw-materials').catch(() => []),
      api<any[]>('/hotel/restaurant/inventory/categories').catch(() => []),
      api<any[]>('/hotel/restaurant/inventory/movements').catch(() => []),
      api<any[]>('/hotel/expenses/vendors').catch(() => []),
      api<any[]>('/hotel/restaurant/inventory/recipes-overview').catch(() => []),
      api<any[]>('/hotel/restaurant/menu').catch(() => []),
    ]),
  ]);

  return (
    <InventoryClient
      initialMaterials={materials}
      initialCategories={categories}
      initialMovements={movements}
      vendors={vendors}
      recipesOverview={recipesOverview}
      menuCategories={menuCategories}
      hasRecipesBom={Boolean(ent.features[FEATURES.HOTEL_RECIPES_BOM])}
    />
  );
}
