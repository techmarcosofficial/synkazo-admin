import type { ReactNode } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface HelpTextProps {
  label?: string;
  children: ReactNode;
}

export default function HelpText({
  label = 'Where do I find this?',
  children,
}: HelpTextProps) {
  return (
    <Popover>
      <PopoverTrigger className="text-primary ml-1 text-xs underline decoration-dotted underline-offset-2">
        {label}
      </PopoverTrigger>
      <PopoverContent className="text-muted-foreground max-w-xs text-xs leading-relaxed">
        {children}
      </PopoverContent>
    </Popover>
  );
}
