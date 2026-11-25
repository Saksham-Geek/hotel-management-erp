import { api } from '@/lib/api';
import { InventoryClient } from './inventory-client';

export const metadata = {
  title: 'Stores & Kitchen Raw Material Inventory | Hotel ERP',
  description: 'Manage store goods, kitchen raw materials, stock replenishment, and low stock alerts.',
};

export default async function InventoryPage() {
  const [materials, categories, movements, vendors] = await Promise.all([
    api<any[]>('/hotel/restaurant/inventory/raw-materials').catch(() => []),
    api<any[]>('/hotel/restaurant/inventory/categories').catch(() => []),
    api<any[]>('/hotel/restaurant/inventory/movements').catch(() => []),
    api<any[]>('/hotel/expenses/vendors').catch(() => []),
  ]);

  return (
    <InventoryClient
      initialMaterials={materials}
      initialCategories={categories}
      initialMovements={movements}
      vendors={vendors}
    />
  );
}
