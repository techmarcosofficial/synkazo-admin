import { create } from 'zustand';

import type { ProjectExtended } from '../types';

interface CreateProjectStore {
  isOpen: boolean;
  onCreated?: (project: ProjectExtended) => void;

  open: (options?: { onCreated?: (project: ProjectExtended) => void }) => void;

  close: () => void;

  setOpen: (open: boolean) => void;
}

export const useCreateProjectStore = create<CreateProjectStore>((set) => ({
  isOpen: false,
  onCreated: undefined,

  open: (options) =>
    set({
      isOpen: true,
      onCreated: options?.onCreated,
    }),

  close: () =>
    set({
      isOpen: false,
      onCreated: undefined,
    }),

  setOpen: (open) =>
    set((state) => ({
      isOpen: open,
      onCreated: open ? state.onCreated : undefined,
    })),
}));
