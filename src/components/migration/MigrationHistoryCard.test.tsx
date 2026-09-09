import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MigrationHistoryCard from './MigrationHistoryCard';

import type { MigrationRun } from '@/api/migration';

const loadRunItems = vi.fn();

const run: MigrationRun = {
  id: 'run-1',
  projectId: 'project-1',
  status: 'partial',
  fromEnvironment: 'sandbox',
  toEnvironment: 'production',
  totalItems: 3,
  succeeded: 1,
  skipped: 1,
  failed: 1,
  startedAt: '2026-09-08T10:00:00.000Z',
  createdAt: '2026-09-08T10:00:00.000Z',
};

beforeEach(() => {
  loadRunItems.mockResolvedValue([
    {
      id: 'item-1',
      kind: 'custom_object',
      displayName: 'Contractors',
      status: 'completed',
      errorMessage: null,
    },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MigrationHistoryCard', () => {
  it('shows an explicit empty state', () => {
    render(
      <MigrationHistoryCard
        runs={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onLoadRunItems={loadRunItems}
      />,
    );
    expect(screen.getByText('No transfer history')).toBeInTheDocument();
  });

  it('expands item outcomes and marks the latest result', async () => {
    render(
      <MigrationHistoryCard
        runs={[run]}
        loading={false}
        error={null}
        latestRunId="run-1"
        onRetry={vi.fn()}
        onLoadRunItems={loadRunItems}
      />,
    );

    expect(screen.getByText('Latest result')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { expanded: false }));
    expect(await screen.findByText('Contractors')).toBeInTheDocument();
    expect(loadRunItems).toHaveBeenCalledWith('run-1');
  });

  it('keeps item-detail failures visible and supports retry', async () => {
    loadRunItems
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([]);
    render(
      <MigrationHistoryCard
        runs={[run]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onLoadRunItems={loadRunItems}
      />,
    );

    await userEvent.click(screen.getByRole('button', { expanded: false }));
    expect(
      await screen.findByText('Could not load item details.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry details' }),
    );
    await waitFor(() => expect(loadRunItems).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(/No item details were recorded/),
    ).toBeInTheDocument();
  });

  it('keeps history load failures visible and retryable', async () => {
    const onRetry = vi.fn();
    render(
      <MigrationHistoryCard
        runs={[]}
        loading={false}
        error="Could not load transfer history."
        onRetry={onRetry}
        onLoadRunItems={loadRunItems}
      />,
    );
    expect(
      screen.getByText('Could not load transfer history.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
