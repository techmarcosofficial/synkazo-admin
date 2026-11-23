import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrashItem } from '@/api/trashTypes';

import { PermanentDeleteTrashDialog } from './PermanentDeleteTrashDialog';

const item: TrashItem = {
  id: 'job-1',
  type: 'job',
  name: 'Customers → Companies',
  organisationId: 'org-1',
  organisationName: 'Acme',
  projectId: 'proj-1',
  projectName: 'CRM Sync',
  deletedAt: new Date().toISOString(),
  deletedById: null,
  deletionReason: null,
  deletionBatchId: 'job-1',
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof PermanentDeleteTrashDialog>> = {}) {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(
    <PermanentDeleteTrashDialog
      item={item}
      open
      onOpenChange={vi.fn()}
      onConfirm={onConfirm}
      isDeleting={false}
      {...overrides}
    />,
  );
  const input = screen.getByLabelText(/type .* to confirm/i) as HTMLInputElement;
  const deleteBtn = screen.getByRole('button', { name: /^permanently delete$/i });
  return { onConfirm, input, deleteBtn };
}

describe('PermanentDeleteTrashDialog', () => {
  afterEach(cleanup);

  it('keeps the delete button disabled until DELETE is typed', () => {
    const { input, deleteBtn } = renderDialog();
    expect(deleteBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'delete' } });
    expect(input.value).toBe('DELETE');
    expect(deleteBtn).toBeEnabled();
  });

  it('ignores characters that are not a prefix of DELETE', () => {
    const { input, deleteBtn } = renderDialog();

    // Wrong first character is rejected outright.
    fireEvent.change(input, { target: { value: 'x' } });
    expect(input.value).toBe('');

    // A valid word, then an extra character past DELETE is not printed.
    fireEvent.change(input, { target: { value: 'DELETE' } });
    expect(input.value).toBe('DELETE');
    fireEvent.change(input, { target: { value: 'DELETEX' } });
    expect(input.value).toBe('DELETE');
    expect(deleteBtn).toBeEnabled();
  });

  it('fires onConfirm with the reason once armed', () => {
    const { input, deleteBtn, onConfirm } = renderDialog();
    fireEvent.change(input, { target: { value: 'DELETE' } });
    fireEvent.change(screen.getByPlaceholderText(/why is this/i), {
      target: { value: 'spam' },
    });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledWith('spam');
  });
});
