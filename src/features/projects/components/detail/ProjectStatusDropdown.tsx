import { Check, ChevronDown } from 'lucide-react';

import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectStatusDropdownProps {
  current: string;
  options: string[];
  onSelect: (status: string) => void;
}

export default function ProjectStatusDropdown({
  current,
  options,
  onSelect,
}: ProjectStatusDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="group bg-card rounded-full"
        >
          <StatusBadge variant="menu" status={current} />
          <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change Project Status</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {options.map((status) => (
          <DropdownMenuItem key={status} onSelect={() => onSelect(status)}>
            <StatusBadge status={status} variant="menu" showDescription />

            {status === current && (
              <Check className="text-primary ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
