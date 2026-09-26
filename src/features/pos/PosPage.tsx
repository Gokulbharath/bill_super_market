import { ShoppingCart } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function PosPage() {
  return (
    <PlaceholderPage
      title="POS Billing"
      description="Scan products and create bills"
      comingSoonDescription="The POS billing module will be implemented in Phase 6. You'll be able to scan barcodes, search products, manage cart, calculate GST, process payments, and print two-copy invoices."
      icon={ShoppingCart}
      breadcrumbs={[{ label: 'POS Billing' }]}
    />
  );
}
