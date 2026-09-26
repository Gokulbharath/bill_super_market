import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variantStyles = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

const iconBgStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default', className }: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold tracking-tight', variantStyles[variant])}>{value}</p>
            {trend && (
              <p className={cn('text-xs font-medium', trend.positive ? 'text-success' : 'text-destructive')}>
                {trend.positive ? '+' : ''}{trend.value}
              </p>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBgStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
