import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LifecycleConfirmDialog from './LifecycleConfirmDialog';

function renderDialog(overrides: Partial<Parameters<typeof LifecycleConfirmDialog>[0]> = {}) {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <LifecycleConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Suspend organisation"
      description="Hard suspension."
      actionLabel="Suspend"
      tone="warning"
      organisationName="Northwind HVAC"
      requiresNameConfirm
      minReasonLength={10}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit, onOpenChange };
}

afterEach(() => {
  cleanup();
});

describe('LifecycleConfirmDialog', () => {
  it('keeps the submit button disabled until name matches and reason is long enough', () => {
    const { onSubmit } = renderDialog();

    const submit = screen.getByRole('button', { name: /suspend/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type Northwind HVAC/i), {
      target: { value: 'northwind hvac' },
    });
    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: 'short' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: 'compliance review this week' },
    });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'compliance review this week',
    });
  });

  it('enforces the higher archive threshold of 20 characters', () => {
    const { onSubmit } = renderDialog({
      title: 'Archive organisation',
      actionLabel: 'Archive',
      tone: 'danger',
      minReasonLength: 20,
    });

    fireEvent.change(screen.getByLabelText(/Type Northwind HVAC/i), {
      target: { value: 'Northwind HVAC' },
    });
    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: 'short archive note' },
    });
    expect(screen.getByRole('button', { name: /archive/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Reason/i), {
      target: { value: 'compliance-driven archive after full review' },
    });
    fireEvent.click(screen.getByRole('button', { name: /archive/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('skips the name-confirm field entirely for lower-risk actions', () => {
    renderDialog({
      title: 'Hold work',
      actionLabel: 'Hold work',
      requiresNameConfirm: false,
      minReasonLength: 0,
    });

    expect(screen.queryByLabelText(/Type Northwind HVAC/i)).toBeNull();
    // With minReasonLength=0 the action becomes clickable immediately.
    expect(screen.getByRole('button', { name: /hold work/i })).toBeEnabled();
  });
});
