import { Users } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function CustomersPage() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Manage customer information and history"
      comingSoonDescription="The customer management module will be implemented in Phase 7. You'll be able to add customers, track purchase history, and manage loyalty information."
      icon={Users}
      breadcrumbs={[{ label: 'Customers' }]}
    />
  );
}
