import { BarChart3 } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="View sales, inventory, and business reports"
      comingSoonDescription="The reports module will be implemented in Phase 9. You'll be able to generate sales reports, inventory reports, GST reports, and business analytics."
      icon={BarChart3}
      breadcrumbs={[{ label: 'Reports' }]}
    />
  );
}
