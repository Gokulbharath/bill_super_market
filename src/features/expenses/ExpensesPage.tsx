import { Receipt } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function ExpensesPage() {
  return (
    <PlaceholderPage
      title="Expenses"
      description="Track and manage store expenses"
      comingSoonDescription="The expenses module will be implemented in Phase 9. You'll be able to record store expenses, categorize them, and generate expense reports."
      icon={Receipt}
      breadcrumbs={[{ label: 'Expenses' }]}
    />
  );
}
