import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfirmDialog from './ConfirmDialog';

import {
  useConfirmDialogStore,
  type ConfirmDialogVariant,
} from '@/stores/useConfirmDialogStore';

afterEach(() => {
  cleanup();
  useConfirmDialogStore.getState().close();
});

describe('ConfirmDialog', () => {
  it.each([
    ['danger', 'bg-destructive'],
    ['warning', 'bg-warning'],
    ['success', 'bg-success'],
    ['info', 'bg-info'],
  ] as const)(
    'uses the %s tone for its compact icon and dynamic action',
    (variant: ConfirmDialogVariant, actionClass) => {
      useConfirmDialogStore.getState().confirm({
        variant,
        title: 'Review this action',
        description: 'This message explains what will happen next.',
        confirmLabel: 'Continue now',
        cancelLabel: 'Go back',
        onConfirm: vi.fn(),
      });

      render(<ConfirmDialog />);

      const dialog = screen.getByRole('alertdialog');
      const media = dialog.querySelector('[data-slot="alert-dialog-media"]');
      const title = screen.getByText('Review this action');
      const description = screen.getByText(
        'This message explains what will happen next.',
      );
      const action = screen.getByRole('button', { name: 'Continue now' });

      expect(media).toHaveClass(
        `bg-${variant === 'danger' ? 'destructive' : variant}/10`,
      );
      expect(action).toHaveClass(actionClass);
      expect(
        screen.getByRole('button', { name: 'Go back' }),
      ).toBeInTheDocument();
      expect(media?.compareDocumentPosition(title)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(title.compareDocumentPosition(description)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
  );

  it('renders rich content and runs the supplied confirmation action', async () => {
    const onConfirm = vi.fn();
    useConfirmDialogStore.getState().confirm({
      title: 'Apply changes?',
      body: <div>3 records will be updated</div>,
      confirmLabel: 'Apply changes',
      onConfirm,
    });

    render(<ConfirmDialog />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
  });
});
