import { useState } from 'react';

import {
  useDisplayPreferencesStore,
  type ManagementViewMode,
} from '@/stores/useDisplayPreferencesStore';

export type { ManagementViewMode };

/**
 * Tracks the table/card view for a management page. A page may provide its
 * required default; otherwise the app-wide preference from Settings is used.
 * The page toggle remains a session-only local override.
 */
export function useViewMode(
  _moduleKey: string,
  pageDefault?: ManagementViewMode,
) {
  const defaultView = useDisplayPreferencesStore((state) => state.defaultView);
  const [override, setOverride] = useState<ManagementViewMode | null>(null);

  return [override ?? pageDefault ?? defaultView, setOverride] as const;
}
