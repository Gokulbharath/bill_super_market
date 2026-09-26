import { UserCog } from 'lucide-react';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function UsersPage() {
  return (
    <PlaceholderPage
      title="User Management"
      description="Manage system users and roles"
      comingSoonDescription="The user management module will be implemented in a later phase. You'll be able to add users, assign roles (Owner, Admin, Cashier), and manage access permissions."
      icon={UserCog}
      breadcrumbs={[{ label: 'User Management' }]}
    />
  );
}
