import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QueueJobList from './QueueJobList';

import type { QueueJob } from '@/types';

const queueJobs: QueueJob[] = [
  {
    id: 'queue-job-1',
    queueId: 'queue-1',
    jobId: 'job-1',
    position: 0,
    enabled: true,
    executionWindowSec: 600,
    consecutiveFailures: 0,
    blocked: false,
    job: {
      id: 'job-1',
      projectId: 'project-1',
      name: 'Customers',
      sourceObject: 'customers',
      destObject: 'contacts',
      status: 'active',
    },
  },
  {
    id: 'queue-job-2',
    queueId: 'queue-1',
    jobId: 'job-2',
    position: 1,
    enabled: true,
    executionWindowSec: 600,
    consecutiveFailures: 0,
    blocked: false,
    job: {
      id: 'job-2',
      projectId: 'project-1',
      name: 'Locations',
      sourceObject: 'locations',
      destObject: 'companies',
      status: 'active',
    },
  },
];

afterEach(cleanup);

describe('QueueJobList', () => {
  it('uses drag handles as the sole ordering control', () => {
    const onReorderLocal = vi.fn();

    render(
      <QueueJobList
        queueJobs={queueJobs}
        onReorderLocal={onReorderLocal}
        onEdit={vi.fn()}
        onToggleEnabled={vi.fn()}
        onRetry={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Reorder Customers' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^move customers/i }),
    ).not.toBeInTheDocument();
    expect(onReorderLocal).not.toHaveBeenCalled();
  });

  it('locks the queue list while an existing row is being edited', () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const onToggleEnabled = vi.fn();

    render(
      <QueueJobList
        queueJobs={queueJobs}
        editingQueueJobId="queue-job-1"
        onReorderLocal={vi.fn()}
        onEdit={onEdit}
        onToggleEnabled={onToggleEnabled}
        onRetry={vi.fn()}
        onRemove={onRemove}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Reorder Customers' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Edit Customers' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remove Customers' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('switch', { name: 'Toggle Customers' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Edit Locations' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Customers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Locations' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
