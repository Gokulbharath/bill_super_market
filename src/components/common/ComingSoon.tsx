import { Clock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
            {icon || <Sparkles className="h-8 w-8" />}
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {description || 'This module is coming in a future development phase.'}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Upcoming Phase
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
