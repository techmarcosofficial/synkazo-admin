import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TrashItem } from '@/api/trashTypes';

import { TrashTable } from './TrashTable';

const item: TrashItem = {
  id: 'proj-1',
  type: 'project',
  name: 'Revenue Ops',
  organisationId: 'org-1',
  organisationName: 'Acme',
  projectId: null,
  projectName: null,
  deletedAt: new Date().toISOString(),
  deletedById: 'user-1',
  deletionReason: 'cleanup',
  deletionBatchId: 'batch-1',
};

const baseProps = {
  isLoading: false,
  isError: false,
  onRetry: vi.fn(),
  onRestore: vi.fn(),
};

describe('TrashTable', () => {
  afterEach(cleanup);

  it('shows an empty state when there are no items', () => {
    render(<TrashTable {...baseProps} items={[]} />);
    expect(screen.getByText(/Trash is empty/i)).toBeInTheDocument();
  });

  it('renders a row and fires restore', () => {
    const onRestore = vi.fn();
    render(<TrashTable {...baseProps} items={[item]} onRestore={onRestore} />);

    expect(screen.getByText('Revenue Ops')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    expect(onRestore).toHaveBeenCalledWith(item);
  });

  it('hides permanent delete when no handler is provided', () => {
    render(<TrashTable {...baseProps} items={[item]} />);
    expect(
      screen.queryByRole('button', { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });

  it('shows permanent delete when a handler is provided (platform scope)', () => {
    const onPermanentDelete = vi.fn();
    render(
      <TrashTable
        {...baseProps}
        items={[item]}
        onPermanentDelete={onPermanentDelete}
      />,
    );
    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteBtn);
    expect(onPermanentDelete).toHaveBeenCalledWith(item);
  });

  it('renders an error state with retry', () => {
    const onRetry = vi.fn();
    render(
      <TrashTable {...baseProps} items={[]} isError onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
