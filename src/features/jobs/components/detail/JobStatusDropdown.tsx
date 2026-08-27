import { Check, ChevronDown } from 'lucide-react';

import StatusBadge from '@/components/shared/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function JobStatusDropdown({
  isActive,
  canActivate,
  hasConnection,
  fieldMappingCount,
  toggling,
  onToggle,
}: {
  isActive: boolean;
  canActivate: boolean;
  hasConnection: boolean;
  fieldMappingCount: number;
  toggling: boolean;
  onToggle: () => void;
}) {
  const disabledReason = !hasConnection
    ? 'Connect platforms first'
    : fieldMappingCount === 0
      ? 'Add field mappings first'
      : 'Mark a Match Field first';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={toggling}>
        <div
          className={cn(
            'group bg-card flex items-center gap-2 rounded-full px-3 py-1.5 text-xs',
            toggling && 'pointer-events-none opacity-60',
          )}
        >
          <StatusBadge variant="menu" status={isActive ? 'active' : 'idle'} />
          <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel>Change Job Status</DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isActive || !canActivate}
          onSelect={() => !isActive && canActivate && onToggle()}
          title={!canActivate ? disabledReason : undefined}
        >
          <StatusBadge status="active" variant="menu" showDescription />
          {isActive && <Check className="text-primary ml-auto size-4" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={!isActive}
          onSelect={() => isActive && onToggle()}
        >
          <StatusBadge status="idle" variant="menu" showDescription />
          {!isActive && <Check className="text-primary ml-auto size-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
