import { Building2 } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function SuppliersPage() {
  return (
    <PlaceholderPage
      title="Suppliers"
      description="Manage supplier information and contacts"
      comingSoonDescription="The supplier management module will be implemented in Phase 8. You'll be able to add suppliers, track contact details, and manage supplier relationships."
      icon={Building2}
      breadcrumbs={[{ label: 'Suppliers' }]}
    />
  );
}
