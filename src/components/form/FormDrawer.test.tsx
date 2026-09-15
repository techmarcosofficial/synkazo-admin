import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FormDrawer from './FormDrawer';

import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

afterEach(() => {
  cleanup();
  useConfirmDialogStore.getState().close();
});

describe('FormDrawer', () => {
  it('shows compact wizard progress in the drawer header', () => {
    render(
      <FormDrawer
        open
        onOpenChange={() => {}}
        title="Create association rule"
        currentStep={2}
        totalSteps={4}
        stepLabels={['Source object', 'Target object', 'Conditions', 'Type']}
      >
        <p>Drawer content</p>
      </FormDrawer>,
    );

    expect(
      screen.getByRole('heading', { name: 'Create association rule' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4 · Target object')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('guards the close action when the form has unsaved changes', async () => {
    const onOpenChange = vi.fn();
    render(
      <FormDrawer
        open
        onOpenChange={onOpenChange}
        title="Edit association rule"
        isDirty
      >
        <p>Drawer content</p>
      </FormDrawer>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(useConfirmDialogStore.getState()).toMatchObject({
      open: true,
      title: 'Discard changes?',
      confirmLabel: 'Discard',
    });

    await useConfirmDialogStore.getState().onConfirm?.();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
