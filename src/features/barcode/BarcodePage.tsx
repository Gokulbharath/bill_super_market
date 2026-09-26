import { ScanBarcode } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function BarcodePage() {
  return (
    <PlaceholderPage
      title="Barcode / QR"
      description="Generate and print barcodes for products"
      comingSoonDescription="The barcode generation module will be implemented in Phase 4. You'll be able to generate and print barcodes and QR codes for your products."
      icon={ScanBarcode}
      breadcrumbs={[{ label: 'Barcode' }]}
    />
  );
}
