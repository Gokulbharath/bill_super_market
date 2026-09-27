import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type MasterSelectItem = { id: number; name: string; symbol?: string };

interface SearchableMasterSelectProps {
  items: MasterSelectItem[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  loading?: boolean;
  loadingMessage?: string;
  addAction?: () => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
}

export function SearchableMasterSelect({ items, value, onChange, placeholder, searchPlaceholder, emptyMessage, loading, loadingMessage = 'Loading...', addAction, allowNone, noneLabel = 'No Brand / Store Product', disabled }: SearchableMasterSelectProps) {
  const selected = items.find((item) => item.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="w-full justify-between font-normal">
          <span className={cn(!selected && 'text-muted-foreground')}>{selected?.name || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[60] w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            {loading ? <CommandEmpty>{loadingMessage}</CommandEmpty> : <CommandEmpty>{emptyMessage}</CommandEmpty>}
            {allowNone && <CommandItem value={noneLabel} onSelect={() => onChange(null)}><Check className={cn('mr-2 h-4 w-4', value === null ? 'opacity-100' : 'opacity-0')} />{noneLabel}</CommandItem>}
            {items.map((item) => <CommandItem key={item.id} value={item.name} onSelect={() => onChange(item.id)}><Check className={cn('mr-2 h-4 w-4', value === item.id ? 'opacity-100' : 'opacity-0')} />{item.name}{item.symbol ? ` (${item.symbol})` : ''}</CommandItem>)}
            {addAction && <><div className="border-t" /><CommandItem value="__add_new__" onSelect={addAction}><Plus className="mr-2 h-4 w-4" />Add New Brand</CommandItem></>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}