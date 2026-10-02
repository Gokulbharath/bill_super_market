import { cn } from '@/lib/utils';
import { storeConfig } from '@/config/store';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  variant?: 'sidebar' | 'header' | 'receipt' | 'login' | 'default';
}

const sizeMap = {
  sm: { img: 'h-8 w-8', text: 'text-xs' },
  md: { img: 'h-10 w-10', text: 'text-sm' },
  lg: { img: 'h-14 w-14', text: 'text-base' },
};

export function Logo({ size = 'md', showText = true, className, variant = 'default' }: LogoProps) {
  const s = sizeMap[size];
  
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/assets/logo.png"
        alt="Sree Super Market"
        className={cn('object-contain shrink-0 rounded-lg', s.img)}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={cn('font-bold tracking-tight', s.text)}>{storeConfig.logo.label}</span>
        </div>
      )}
    </div>
  );
}
