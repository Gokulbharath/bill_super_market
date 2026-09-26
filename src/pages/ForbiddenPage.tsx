import { ShieldX, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-6">
        <ShieldX className="h-10 w-10" />
      </div>
      <p className="text-6xl font-bold tracking-tight text-muted-foreground/30">403</p>
      <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
