import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

/** Compact, table-only filters shared by both people tabs. */
export default function PeopleToolbar({
  searchValue,
  onSearchChange,
  filters,
  action,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
      <InputGroup className="bg-muted w-full sm:w-56 sm:flex-none">
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name or email…"
          aria-label="Search people by name or email"
          autoComplete="off"
        />
      </InputGroup>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {filters}
        {action}
      </div>
    </div>
  );
}
