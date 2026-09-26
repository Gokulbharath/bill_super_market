import { cn } from '@/lib/utils';

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-xl border bg-card animate-pulse" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn('h-28 rounded-xl border bg-card animate-pulse', className)} />;
}

export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="h-10 rounded-md bg-muted animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 max-w-md', className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-10 rounded-md bg-muted animate-pulse" />
        </div>
      ))}
      <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
    </div>
  );
}
