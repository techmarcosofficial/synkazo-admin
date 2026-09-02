import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export default function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  disabled = false,
}: PaginationBarProps) {
  if (total === 0) return null;

  // Callers that derive `page`/`totalPages` from a still-settling query (server-side
  // pagination reading a count that starts at 0, or a page synced from URL state before
  // the first render) can hand this component 0/NaN briefly on mount. Falling back here
  // means the page number always renders something sane instead of going blank next to
  // the "Rows per page" selector until the caller's own state catches up.
  const safeTotalPages = totalPages > 0 ? totalPages : 1;
  const safePage = page > 0 ? Math.min(page, safeTotalPages) : 1;

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        Showing {start}–{end} of {total}
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
              disabled={disabled}
            >
              <SelectTrigger size="sm" className="w-17">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="text-muted-foreground text-sm">
          Page {safePage} of {safeTotalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={disabled || safePage <= 1}
            aria-label="First page"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage - 1)}
            disabled={disabled || safePage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage + 1)}
            disabled={disabled || safePage >= safeTotalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={disabled || safePage >= safeTotalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
