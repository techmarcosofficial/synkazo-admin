import { create } from 'zustand';

interface SetupWizardStore {
  isOpen: boolean;
  projectId: string | null;

  open: (projectId: string) => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useSetupWizardStore = create<SetupWizardStore>((set) => ({
  isOpen: false,
  projectId: null,

  open: (projectId) => set({ isOpen: true, projectId }),

  close: () => set({ isOpen: false, projectId: null }),

  setOpen: (open) =>
    set((state) => ({
      isOpen: open,
      projectId: open ? state.projectId : null,
    })),
}));
