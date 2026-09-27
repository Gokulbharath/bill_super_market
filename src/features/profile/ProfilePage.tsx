import { User } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { roleLabels } from '@/config/navigation';
import { useAuthStore } from '@/stores/authStore';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account details" />
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-1 text-sm text-muted-foreground">{user ? roleLabels[user.role] : ''}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
