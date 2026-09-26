import { cn } from '@/lib/utils';
import { storeConfig } from '@/config/store';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-8 w-8', text: 'text-base', label: 'text-xs' },
  md: { box: 'h-10 w-10', text: 'text-lg', label: 'text-sm' },
  lg: { box: 'h-14 w-14', text: 'text-2xl', label: 'text-base' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shrink-0 shadow-sm',
          s.box,
          s.text,
        )}
      >
        {storeConfig.logo.text}
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={cn('font-bold tracking-tight', s.label)}>{storeConfig.logo.label}</span>
        </div>
      )}
    </div>
  );
}
