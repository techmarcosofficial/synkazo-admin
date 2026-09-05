import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useViewMode } from './useViewMode';

import { useDisplayPreferencesStore } from '@/stores/useDisplayPreferencesStore';

describe('useViewMode', () => {
  beforeEach(() => {
    useDisplayPreferencesStore.setState({ defaultView: 'table' });
  });

  it('supports a page-specific default while retaining a local override', () => {
    const { result } = renderHook(() => useViewMode('projects', 'card'));

    expect(result.current[0]).toBe('card');

    act(() => result.current[1]('table'));

    expect(result.current[0]).toBe('table');
  });
});
