import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SyncRunProgress from './SyncRunProgress';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SyncRunProgress', () => {
  it('renders scheduled run context and live progress', () => {
    render(
      <SyncRunProgress
        runId="run-1"
        jobId="job-1"
        status="running"
        totalRecords={200}
        processedRecords={50}
        createdCount={30}
        updatedCount={15}
        skippedCount={4}
        failedCount={1}
        ratePerSec={2}
        startedAt="2026-09-23T10:00:00.000Z"
        triggeredBy="cron"
        sourceLabel="Customers"
        destinationLabel="Companies"
      />,
    );

    expect(screen.getByText('Sync in progress')).toBeInTheDocument();
    expect(screen.getByText('Scheduled run')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent === '50 of 200 records processed',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('120/min')).toBeInTheDocument();
  });

  it('renders manual context and keeps the stop action interactive', () => {
    const onStop = vi.fn();

    render(
      <SyncRunProgress
        status="running"
        processedRecords={12}
        triggeredBy="limit_sync"
        variant="compact"
        onStop={onStop}
      />,
    );

    expect(screen.getByText('Manual run')).toBeInTheDocument();
    expect(screen.getByLabelText('Sync in progress')).toHaveAttribute(
      'data-variant',
      'compact',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop sync' }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('renders a completed summary and persists dismissal for that run only', () => {
    const props = {
      runId: 'run-complete',
      jobId: 'job-1',
      status: 'completed',
      totalRecords: 50,
      processedRecords: 50,
      createdCount: 40,
      updatedCount: 10,
      startedAt: '2026-09-23T10:00:00.000Z',
      finishedAt: '2026-09-23T10:01:00.000Z',
      durationMs: 60_000,
      triggeredBy: 'cron',
    };

    render(<SyncRunProgress {...props} />);

    expect(screen.getByText('Sync completed')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Ended at')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Sync completed')).not.toBeInTheDocument();
    expect(localStorage.getItem('synkazo:sync-summary-dismissed:job-1')).toBe(
      'run-complete',
    );

    cleanup();
    render(<SyncRunProgress {...props} />);
    expect(screen.queryByText('Sync completed')).not.toBeInTheDocument();

    cleanup();
    render(<SyncRunProgress {...props} runId="run-next" />);
    expect(screen.getByText('Sync completed')).toBeInTheDocument();
  });

  it('renders failed and stopped terminal variants', () => {
    const { rerender } = render(
      <SyncRunProgress
        runId="run-failed"
        jobId="job-1"
        status="failed"
        failedCount={3}
        errorMessage="The destination rejected the request."
      />,
    );

    expect(screen.getByText('Sync failed')).toBeInTheDocument();
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('The destination rejected the request.'),
    ).toBeInTheDocument();

    rerender(
      <SyncRunProgress
        runId="run-stopped"
        jobId="job-1"
        status="cancelled"
        processedRecords={20}
      />,
    );

    expect(screen.getByText('Sync stopped')).toBeInTheDocument();
    expect(screen.getAllByText('Stopped').length).toBeGreaterThanOrEqual(1);
  });
});
