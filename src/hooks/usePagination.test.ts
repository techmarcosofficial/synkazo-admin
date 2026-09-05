import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('clamps the current page when filtering reduces the result count', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, 2),
      { initialProps: { items: [1, 2, 3, 4, 5] } },
    );

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    rerender({ items: [1] });

    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([1]);
  });
});
