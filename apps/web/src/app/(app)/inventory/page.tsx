import { api } from '@/lib/api';
import { InventoryClient } from './inventory-client';

export const metadata = {
  title: 'Stores & Kitchen Raw Material Inventory | Hotel ERP',
  description: 'Manage store goods, kitchen raw materials, stock replenishment, and low stock alerts.',
};

export default async function InventoryPage() {
  const materials = await api<any[]>('/hotel/restaurant/inventory/raw-materials').catch(() => []);
  return <InventoryClient initialMaterials={materials} />;
}
