import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SyncAllTab from '@/components/sync/SyncAllTab';
import type { Job } from '@/types';

describe('SyncAllTab', () => {
  const baseJob: Job = {
    id: 'job-1',
    projectId: 'proj-1',
    name: 'Contacts Sync',
    sourceObject: 'Contact',
    destObject: 'contact',
    syncDirection: 'one_way',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('renders date inputs by default', () => {
    const onConfirm = vi.fn();
    render(
      <SyncAllTab
        projectId="proj-1"
        jobId="job-1"
        job={baseJob}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getAllByText(/Start Date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/End Date/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /run sync now/i })).toBeInTheDocument();
  });

  it('renders resume alert with inline link when previous sync was interrupted, while keeping date inputs accessible', () => {
    const onConfirm = vi.fn();
    const interruptedJob: Job = {
      ...baseJob,
      syncAllPage: 5,
      syncAllRangeStart: '2026-09-01T00:00:00Z',
      syncAllRangeEnd: '2026-09-27T08:00:00Z',
      syncAllProgressDate: '2026-09-14T12:00:00Z',
    };

    render(
      <SyncAllTab
        projectId="proj-1"
        jobId="job-1"
        job={interruptedJob}
        onConfirm={onConfirm}
      />,
    );

    // Alert content
    expect(screen.getByText(/A previous Sync All ran from/i)).toBeInTheDocument();
    const resumeBtn = screen.getByRole('button', { name: /resume previous sync/i });
    expect(resumeBtn).toBeInTheDocument();

    // Date inputs remain visible and available
    expect(screen.getAllByText(/Start Date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/End Date/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /run sync now/i }).length).toBeGreaterThan(0);

    // Clicking resume triggers onConfirm with empty range (resuming from checkpoint)
    fireEvent.click(resumeBtn);
    expect(onConfirm).toHaveBeenCalledWith({});
  });
});
