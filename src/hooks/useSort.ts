import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

/**
 * Generic column sorting over an already-filtered array. Caller supplies a
 * `compare(a, b, key)` that knows how to compare two items for a given key;
 * this hook just owns which key/direction is active and toggles between
 * asc -> desc -> asc on repeated clicks of the same column.
 */
export function useSort<T, K extends string>(
  items: T[],
  compare: (a: T, b: T, key: K) => number,
) {
  const [sortKey, setSortKey] = useState<K | null>(null);
  const [direction, setDirection] = useState<SortDirection>('asc');

  const toggleSort = (key: K) => {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    const factor = direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => factor * compare(a, b, sortKey));
  }, [items, sortKey, direction, compare]);

  return { sorted, sortKey, direction, toggleSort };
}
