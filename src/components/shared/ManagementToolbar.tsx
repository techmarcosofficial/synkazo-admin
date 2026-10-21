import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';

import ViewToggle from './ViewToggle';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import type { ManagementViewMode } from '@/hooks/useViewMode';
import { cn } from '@/lib/utils';

interface ManagementToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  /** Module-specific Select filters (e.g. role, status) rendered between search and view toggle. */
  filters?: ReactNode;
  /** Omit both to hide the table/card toggle for pages that only support one view. */
  viewMode?: ManagementViewMode;
  onViewModeChange?: (mode: ManagementViewMode) => void;
  /** Primary action button (e.g. "Invite user") — omitted when not applicable. */
  action?: ReactNode;
  /** Group directory controls beside the page identity. */
  directoryLayout?: boolean;
  filterCount?: 1 | 2;
  sort?: ReactNode;
}

export default function ManagementToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchLabel,
  filters,
  viewMode,
  onViewModeChange,
  action,
  directoryLayout = false,
  filterCount = 1,
  sort,
}: ManagementToolbarProps) {
  const searchControl = (
    <InputGroup
      uiSize={directoryLayout ? 'sm' : 'default'}
      className={cn(
        'bg-muted',
        directoryLayout &&
          'border-border/80 bg-card hover:border-foreground/25 focus-within:border-ring focus-within:ring-ring/15 dark:bg-card w-full min-w-0 transition-colors focus-within:ring-2',
      )}
    >
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchLabel ?? searchPlaceholder}
        autoComplete="off"
      />
      {directoryLayout && searchValue && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
          >
            <X className="size-3.5" aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );

  if (directoryLayout) {
    return (
      <div
        className={cn(
          'grid min-w-0 items-center gap-2 xl:flex xl:gap-2.5',
          filterCount === 2
            ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
            : 'grid-cols-[minmax(0,1fr)_auto]',
        )}
      >
        <div
          className={cn(
            'row-start-1 max-w-64 min-w-0 xl:row-auto xl:w-[13.5rem] xl:shrink-0',
            filterCount === 2 ? 'col-span-2 xl:col-auto' : 'col-start-1',
          )}
        >
          {searchControl}
        </div>
        <div
          className={cn(
            'row-start-2 grid min-w-0 gap-2 xl:col-auto xl:row-auto xl:shrink-0',
            filterCount === 2
              ? !viewMode && !action
                ? 'col-span-full grid-cols-2 xl:w-60'
                : 'col-span-2 grid-cols-2 xl:w-60'
              : 'col-start-1 grid-cols-1 xl:w-32',
          )}
        >
          {filters}
        </div>
        {sort && (
          <div
            className={cn(
              'min-w-0 xl:col-auto xl:row-auto xl:w-28 xl:shrink-0',
              filterCount === 2
                ? 'col-start-3 row-start-1'
                : 'col-start-2 row-start-2',
            )}
          >
            {sort}
          </div>
        )}
        {viewMode && onViewModeChange && (
          <div
            className={cn(
              'justify-self-end xl:col-auto xl:row-auto xl:shrink-0',
              filterCount === 2
                ? 'col-start-3 row-start-2'
                : 'col-start-2 row-start-1',
            )}
          >
            <ViewToggle
              value={viewMode}
              onChange={onViewModeChange}
              prominent
              iconOnly
            />
          </div>
        )}
        {action && (
          <div
            className={cn(
              'justify-self-end xl:col-auto xl:row-auto xl:shrink-0',
              filterCount === 2
                ? 'col-span-full justify-self-end'
                : viewMode
                  ? 'col-start-2 row-start-2'
                  : 'col-start-2 row-span-2',
            )}
          >
            {action}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {searchControl}

      {filters}

      {viewMode && onViewModeChange && (
        <div>
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        </div>
      )}

      {action}
    </div>
  );
}
