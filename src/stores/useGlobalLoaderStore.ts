import { create } from 'zustand';

// Full-page brand loader visibility. This is the ONLY full-screen loading
// experience in the app and is only meant to gate the initial app boot
// (auth resolution) — per-request loading must use skeletons, not this.
interface GlobalLoaderState {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
}

export const useGlobalLoaderStore = create<GlobalLoaderState>((set) => ({
  isVisible: true,
  show: () => set({ isVisible: true }),
  hide: () => set({ isVisible: false }),
}));
