import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import ViewToggle from './ViewToggle';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import type { ManagementViewMode } from '@/hooks/useViewMode';

interface ManagementToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Module-specific Select filters (e.g. role, status) rendered between search and view toggle. */
  filters?: ReactNode;
  /** Omit both to hide the table/card toggle for pages that only support one view. */
  viewMode?: ManagementViewMode;
  onViewModeChange?: (mode: ManagementViewMode) => void;
  /** Primary action button (e.g. "Invite user") — omitted when not applicable. */
  action?: ReactNode;
}

export default function ManagementToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  viewMode,
  onViewModeChange,
  action,
}: ManagementToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <InputGroup className="bg-muted">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
        />
      </InputGroup>

      {filters}

      {viewMode && onViewModeChange && (
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
      )}

      {action}
    </div>
  );
}
