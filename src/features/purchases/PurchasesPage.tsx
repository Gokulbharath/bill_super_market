import { Truck } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function PurchasesPage() {
  return (
    <PlaceholderPage
      title="Purchases"
      description="Manage purchase orders and stock intake"
      comingSoonDescription="The purchase management module will be implemented in Phase 8. You'll be able to create purchase orders, record stock intake, and track purchase history."
      icon={Truck}
      breadcrumbs={[{ label: 'Purchases' }]}
    />
  );
}
