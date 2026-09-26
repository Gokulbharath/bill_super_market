import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-primary/10 text-primary border-primary/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', `bg-current`)} />
      {label}
    </span>
  );
}
