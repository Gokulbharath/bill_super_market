import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function GenericErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-warning/10 text-warning mb-6">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred. Please try refreshing the page, or go back to the dashboard.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Page
        </Button>
        <Button asChild>
          <Link to="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
