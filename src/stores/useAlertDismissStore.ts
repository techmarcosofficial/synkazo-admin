import { create } from 'zustand';

interface AlertDismissState {
  dismissed: Record<string, true>;
  dismiss: (id: string) => void;
  isDismissed: (id: string) => boolean;
}

// In-memory only (no persist middleware) — dismissals last for the current
// session, including navigation away and back, but reset on hard refresh.
export const useAlertDismissStore = create<AlertDismissState>((set, get) => ({
  dismissed: {},
  dismiss: (id) => set((s) => ({ dismissed: { ...s.dismissed, [id]: true } })),
  isDismissed: (id) => !!get().dismissed[id],
}));
