import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <Card className={cn('relative z-10 w-full max-w-md mx-4', className)}>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>
                  {cancelLabel}
                </Button>
                <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
