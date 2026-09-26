import { Settings } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Configure store and application settings"
      comingSoonDescription="The settings module will be implemented in Phase 10. You'll be able to configure store details, receipt settings, tax rates, payment methods, and system preferences."
      icon={Settings}
      breadcrumbs={[{ label: 'Settings' }]}
    />
  );
}
