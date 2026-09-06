import { create } from 'zustand';

export type ManagementViewMode = 'table' | 'card';
export type LayoutStyle = 'contrast' | 'shadow';

const STORAGE_KEY = 'sb_display_prefs';

interface StoredDisplayPreferences {
  defaultView: ManagementViewMode;
  layoutStyle: LayoutStyle;
}

const DEFAULT_PREFERENCES: StoredDisplayPreferences = {
  defaultView: 'table',
  layoutStyle: 'contrast',
};

function readPreferences(): StoredDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      defaultView: stored.defaultView === 'card' ? 'card' : 'table',
      layoutStyle: stored.layoutStyle === 'shadow' ? 'shadow' : 'contrast',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(preferences: StoredDisplayPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* ignore persistence errors */
  }
}

function applyLayoutStyle(style: LayoutStyle) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.layoutStyle = style;
  }
}

interface DisplayPreferencesState {
  // App-wide default, set from Settings. Every List/Card page uses this as
  // its view on load; a page's own toggle only changes that page locally
  // (see useViewMode) and never writes back here.
  defaultView: ManagementViewMode;
  layoutStyle: LayoutStyle;
  setDefaultView: (mode: ManagementViewMode) => void;
  setLayoutStyle: (style: LayoutStyle) => void;
}

const initialPreferences = readPreferences();
applyLayoutStyle(initialPreferences.layoutStyle);

export const useDisplayPreferencesStore = create<DisplayPreferencesState>(
  (set) => ({
    ...initialPreferences,
    setDefaultView: (mode) =>
      set((state) => {
        persistPreferences({
          defaultView: mode,
          layoutStyle: state.layoutStyle,
        });
        return { defaultView: mode };
      }),
    setLayoutStyle: (style) =>
      set((state) => {
        applyLayoutStyle(style);
        persistPreferences({
          defaultView: state.defaultView,
          layoutStyle: style,
        });
        return { layoutStyle: style };
      }),
  }),
);
