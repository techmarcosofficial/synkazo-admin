import { useEffect, useState } from 'react';

// Returns `value` after `delayMs` milliseconds of no change. Callers use
// this to coalesce fast input (search boxes, sliders) into a single query
// invocation. Distinct from a straight setTimeout-in-useEffect only by
// centralising the pattern so pages don't reinvent it.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
