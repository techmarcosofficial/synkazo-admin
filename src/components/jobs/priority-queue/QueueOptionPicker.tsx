import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface QueueOption {
  value: string;
  label: string;
  detail?: string;
}

export default function QueueOptionPicker({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  options: QueueOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'bg-background h-9 w-full justify-between px-3 text-xs font-normal',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className="min-w-0 truncate text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>No matching option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.detail ?? ''}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between gap-2 py-2 text-xs"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {option.label}
                    </span>
                    {option.detail && (
                      <span className="text-muted-foreground block truncate text-[10px]">
                        {option.detail}
                      </span>
                    )}
                  </span>
                  {value === option.value && (
                    <Check className="text-primary size-3.5 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
