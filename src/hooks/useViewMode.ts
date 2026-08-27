import { useState } from 'react';

import {
  useDisplayPreferencesStore,
  type ManagementViewMode,
} from '@/stores/useDisplayPreferencesStore';

export type { ManagementViewMode };

/**
 * Tracks the table/card view for a management page. Initializes from the
 * app-wide default set on the Settings page (reactive, so a Settings change
 * applies immediately without a reload) and lets the page's own toggle
 * override it locally for that page's session only — the override is never
 * written back to the shared default.
 */
export function useViewMode(_moduleKey: string) {
  const defaultView = useDisplayPreferencesStore((state) => state.defaultView);
  const [override, setOverride] = useState<ManagementViewMode | null>(null);

  return [override ?? defaultView, setOverride] as const;
}
