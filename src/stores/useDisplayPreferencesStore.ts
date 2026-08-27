import { create } from 'zustand';

export type ManagementViewMode = 'table' | 'card';

const STORAGE_KEY = 'sb_display_prefs';

function readDefaultView(): ManagementViewMode {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return stored.defaultView === 'card' ? 'card' : 'table';
  } catch {
    return 'table';
  }
}

interface DisplayPreferencesState {
  // App-wide default, set from Settings. Every List/Card page uses this as
  // its view on load; a page's own toggle only changes that page locally
  // (see useViewMode) and never writes back here.
  defaultView: ManagementViewMode;
  setDefaultView: (mode: ManagementViewMode) => void;
}

export const useDisplayPreferencesStore = create<DisplayPreferencesState>(
  (set) => ({
    defaultView: readDefaultView(),
    setDefaultView: (mode) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ defaultView: mode }),
        );
      } catch {
        /* ignore persistence errors */
      }
      set({ defaultView: mode });
    },
  }),
);
