// layout/store/useHeaderStore.ts
import type { ComponentType, ReactNode } from 'react';
import { create } from 'zustand';

// A declarative primary action for a tab-based page header. The active tab
// registers one of these (via useHeaderPrimaryAction) instead of the page
// header hardcoding which button belongs to which tab.
export interface HeaderPrimaryAction {
  // Identifies the registering owner so a delayed/out-of-order cleanup from a
  // tab that just unmounted can't clobber the next tab's freshly-set action.
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface HeaderStore {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
  clearActions: () => void;
  primaryAction: HeaderPrimaryAction | null;
  setPrimaryAction: (action: HeaderPrimaryAction) => void;
  clearPrimaryAction: (key: string) => void;
}

export const useHeaderStore = create<HeaderStore>((set, get) => ({
  actions: null,
  setActions: (actions) => set({ actions }),
  clearActions: () => set({ actions: null }),
  primaryAction: null,
  setPrimaryAction: (action) => set({ primaryAction: action }),
  clearPrimaryAction: (key) => {
    if (get().primaryAction?.key === key) set({ primaryAction: null });
  },
}));
