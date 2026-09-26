import { Package } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function ProductsPage() {
  return (
    <PlaceholderPage
      title="Products"
      description="Manage your product master catalog"
      comingSoonDescription="The product master module will be implemented in Phase 3. You'll be able to add, edit, and manage all products in your store catalog."
      icon={Package}
      breadcrumbs={[{ label: 'Products' }]}
    />
  );
}
