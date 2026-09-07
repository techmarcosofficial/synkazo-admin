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
        <Button
          variant="outline"
          size="sm"
          className="group h-7 rounded-full px-2.5"
        >
          <StatusBadge variant="menu" status={isActive ? 'active' : 'idle'} />
          <ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
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
