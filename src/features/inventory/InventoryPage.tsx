import { Warehouse } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function InventoryPage() {
  return (
    <PlaceholderPage
      title="Inventory Management"
      description="Track stock levels and manage inventory"
      comingSoonDescription="The inventory management module will be implemented in Phase 5. You'll be able to track stock levels, manage stock adjustments, and monitor low-stock alerts."
      icon={Warehouse}
      breadcrumbs={[{ label: 'Inventory' }]}
    />
  );
}
