import { useMemo, useState } from 'react';

/**
 * Generic client-side pagination over an already-filtered/sorted array.
 * Automatically clamps to the last valid page if the item count shrinks
 * (e.g. a search narrows the results) below the current page.
 */
export function usePagination<T>(items: T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pageItems,
    total: items.length,
  };
}
