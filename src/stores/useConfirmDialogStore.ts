import type { ReactNode } from 'react';
import { create } from 'zustand';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'success' | 'info';

export interface ConfirmOptions {
  variant?: ConfirmDialogVariant;
  title: string;
  description?: ReactNode;
  /** Optional rich content rendered between the description and the footer
   *  (e.g. an impact summary for a disconnect action). */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogState {
  open: boolean;
  variant: ConfirmDialogVariant;
  title: string;
  description?: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  isConfirming: boolean;
  onConfirm: (() => void | Promise<void>) | null;
  confirm: (options: ConfirmOptions) => void;
  close: () => void;
  handleConfirm: () => Promise<void>;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  open: false,
  variant: 'info',
  title: '',
  description: undefined,
  body: undefined,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  isConfirming: false,
  onConfirm: null,

  confirm: (options) =>
    set({
      open: true,
      variant: options.variant ?? 'info',
      title: options.title,
      description: options.description,
      body: options.body,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      isConfirming: false,
      onConfirm: options.onConfirm,
    }),

  close: () => set({ open: false, isConfirming: false, onConfirm: null }),

  handleConfirm: async () => {
    const { onConfirm } = get();
    if (!onConfirm) return;
    set({ isConfirming: true });
    try {
      await onConfirm();
      set({ open: false, isConfirming: false, onConfirm: null });
    } catch {
      // Errors already surface via toast (apiClient interceptor / caller) —
      // keep the dialog open so the user can retry or cancel.
      set({ isConfirming: false });
    }
  },
}));
