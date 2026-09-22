import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RunJobDialog from './RunJobDialog';

function renderDialog(overrides: Partial<Parameters<typeof RunJobDialog>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <RunJobDialog
      open
      onOpenChange={vi.fn()}
      jobName="ServiceTitan customers"
      isSubmitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return { onSubmit };
}

afterEach(() => {
  cleanup();
});

describe('RunJobDialog', () => {
  it('submits a bare full-sync run with no dates or max records', () => {
    const { onSubmit } = renderDialog();
    fireEvent.click(screen.getByLabelText('Full re-sync'));
    fireEvent.click(screen.getByRole('button', { name: /run now/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      fullSync: true,
      maxRecords: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('blocks submission if a date is provided without full-sync', () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText(/Start date/i), {
      target: { value: '2026-09-01' },
    });
    expect(screen.getByRole('button', { name: /run now/i })).toBeDisabled();
    expect(
      screen.getByText(/Date-bounded runs require Full re-sync/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submission if date range and max-records are both set', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Full re-sync'));
    fireEvent.change(screen.getByLabelText(/Max records/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/Start date/i), {
      target: { value: '2026-09-01' },
    });
    expect(screen.getByRole('button', { name: /run now/i })).toBeDisabled();
    expect(
      screen.getByText(/Date bounds and max records cannot both be set/i),
    ).toBeInTheDocument();
  });

  it('blocks submission when start is after end date', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Full re-sync'));
    fireEvent.change(screen.getByLabelText(/Start date/i), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText(/End date/i), {
      target: { value: '2026-09-01' },
    });
    expect(screen.getByRole('button', { name: /run now/i })).toBeDisabled();
    expect(
      screen.getByText(/Start date must be before end date/i),
    ).toBeInTheDocument();
  });

  it('keeps submit disabled while the mutation is pending', () => {
    renderDialog({ isSubmitting: true });
    expect(
      screen.getByRole('button', { name: /queueing…/i }),
    ).toBeDisabled();
  });
});
