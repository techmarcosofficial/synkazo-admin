import { Check, ChevronDown } from 'lucide-react';

import StatusBadge, { getStatusTone } from '@/components/shared/StatusBadge';
import { badgeToneClasses, useBadgeAppearance } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectStatusDropdownProps<Status extends string> {
  current: Status;
  options: readonly Status[];
  onSelect: (status: Status) => void;
  disabled?: boolean;
}

export default function ProjectStatusDropdown<Status extends string>({
  current,
  options,
  onSelect,
  disabled = false,
}: ProjectStatusDropdownProps<Status>) {
  const tinted = useBadgeAppearance() === 'tinted';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={tinted ? 'ghost' : 'outline'}
          size="sm"
          shape="pill"
          className={cn(
            'group',
            tinted && 'border-0 shadow-none',
            tinted && badgeToneClasses[getStatusTone(current)],
          )}
          disabled={disabled}
          data-badge-control={tinted ? 'tinted' : undefined}
          aria-label={`Change project status: ${current}`}
        >
          <StatusBadge variant="menu" status={current} />
          <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Change Project Status</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {options.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={disabled}
            onSelect={() => onSelect(status)}
          >
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
