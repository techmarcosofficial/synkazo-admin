import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SyncRunProgress from './SyncRunProgress';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SyncRunProgress', () => {
  it('shows one live overall bar with record and batch counts', () => {
    const { rerender } = render(
      <SyncRunProgress
        status="running"
        totalRecords={200}
        processedRecords={50}
        completedBatches={3}
        currentBatch={4}
        batchProcessed={10}
        batchTotal={20}
        totalBatches={10}
        sourceLabel="Customers"
        destinationLabel="Companies"
        startedAt="2026-09-23T10:00:00.000Z"
        triggeredBy="cron"
        etaSeconds={120}
        defaultOpen={true}
      />,
    );

    expect(screen.getByText('Sync in progress')).toBeInTheDocument();
    expect(screen.getByText('Customers → Companies')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50 of 200 records processed')).toBeInTheDocument();
    expect(screen.getByText('4/10')).toBeInTheDocument();
    expect(screen.getByText('Batches')).toBeInTheDocument();
    expect(screen.getByText('4 of 10 batches')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('2m 0s')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress' }),
    ).toHaveAttribute('aria-valuenow', '25');

    rerender(
      <SyncRunProgress
        status="running"
        totalRecords={200}
        processedRecords={100}
        completedBatches={5}
        currentBatch={6}
        batchProcessed={0}
        batchTotal={20}
        totalBatches={10}
      />,
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('6/10')).toBeInTheDocument();
    expect(screen.getByText('6 of 10 batches')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress' }),
    ).toHaveAttribute('aria-valuenow', '50');
  });

  it('keeps the subtitle limited to the platform pair and the stop action functional', () => {
    const onStop = vi.fn();
    render(
      <SyncRunProgress
        status="running"
        variant="compact"
        jobId="job-1"
        processedRecords={12}
        sourceLabel="Customers"
        destinationLabel="Companies"
        onStop={onStop}
      />,
    );

    expect(screen.getByText('Customers → Companies')).toBeInTheDocument();
    expect(screen.queryByText(/Job job-1/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Sync in progress')).toHaveAttribute(
      'data-variant',
      'compact',
    );
    expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop sync' }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('shows completed counts and remembers dismissal for only that run', () => {
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
      defaultOpen: true,
    };
    render(<SyncRunProgress {...props} />);

    expect(screen.getByText('Sync completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByLabelText('Record statistics').children).toHaveLength(5);
    expect(screen.getByText('Ended at')).toBeInTheDocument();
    expect(screen.getByText('1m 0s')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Stop sync' }),
    ).not.toBeInTheDocument();

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

  it('keeps unknown totals indeterminate without inventing a batch', () => {
    render(
      <SyncRunProgress
        status="queued"
        totalRecords={0}
        processedRecords={0}
        startedAt="invalid"
      />,
    );
    expect(screen.getByText('Sync preparing')).toBeInTheDocument();
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText(/Batch /)).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress unknown' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('shows completed batch counts when the active batch has not arrived', () => {
    render(
      <SyncRunProgress
        status="running"
        totalRecords={100}
        processedRecords={20}
        completedBatches={2}
        totalBatches={10}
      />,
    );
    expect(screen.getByText('2/10')).toBeInTheDocument();
    expect(screen.getByText('2 of 10 batches')).toBeInTheDocument();
  });

  it('keeps actual failed progress and shows the issue in the footer', () => {
    render(
      <SyncRunProgress
        status="failed"
        totalRecords={100}
        processedRecords={25}
        failedCount={30}
        errorMessage="Authentication failed"
        defaultOpen={true}
      />,
    );
    expect(screen.getByText('Sync failed')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.getByText('Issue')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The platform connection needs attention. Reconnect it and try again.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /View details/ }),
    ).not.toBeInTheDocument();
  });

  it('shows completed issues and the final batch without a second bar', () => {
    render(
      <SyncRunProgress
        status="completed"
        totalRecords={10}
        processedRecords={10}
        failedCount={2}
        completedBatches={4}
        totalBatches={4}
        defaultOpen={true}
      />,
    );
    expect(screen.getByText('Sync completed with issues')).toBeInTheDocument();
    expect(screen.getByText('4/4')).toBeInTheDocument();
    expect(screen.getByText('4 of 4 batches')).toBeInTheDocument();
    expect(
      screen.getByText('2 failed · Review run history'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('starts collapsed by default and expands on header click', () => {
    render(
      <SyncRunProgress
        status="running"
        totalRecords={100}
        processedRecords={50}
      />,
    );

    const expandBtn = screen.getByRole('button', { name: 'Expand' });
    expect(expandBtn).toBeInTheDocument();
    expect(screen.queryByLabelText('Record statistics')).not.toBeInTheDocument();

    const header = screen.getByText('Sync in progress').closest('[data-slot="sync-summary-header"]');
    expect(header).toBeInTheDocument();
    fireEvent.click(header!);

    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();
    expect(screen.getByLabelText('Record statistics')).toBeInTheDocument();
  });

  it('triggers onViewHistory when clicking the action link on completed runs', () => {
    const onViewHistory = vi.fn();
    render(
      <SyncRunProgress
        status="completed"
        totalRecords={50}
        processedRecords={50}
        defaultOpen={true}
        onViewHistory={onViewHistory}
      />,
    );

    const historyLink = screen.getByRole('button', {
      name: /View in Sync History/i,
    });
    expect(historyLink).toBeInTheDocument();
    fireEvent.click(historyLink);
    expect(onViewHistory).toHaveBeenCalledOnce();
  });

  it('renders View Run action in header on completed runs and calls onViewRun with runId', () => {
    const onViewRun = vi.fn();
    render(
      <SyncRunProgress
        status="completed"
        runId="run-abc-123"
        totalRecords={50}
        processedRecords={50}
        defaultOpen={true}
        onViewRun={onViewRun}
      />,
    );

    const viewRunButtons = screen.getAllByRole('button', { name: 'View Run' });
    expect(viewRunButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewRunButtons[0]);
    expect(onViewRun).toHaveBeenCalledWith('run-abc-123');
  });

  it('shows a compact one-line completed state with View Run action when collapsed', () => {
    const onViewRun = vi.fn();
    render(
      <SyncRunProgress
        status="completed"
        runId="run-456"
        totalRecords={100}
        processedRecords={100}
        createdCount={80}
        updatedCount={20}
        defaultOpen={false}
        onViewRun={onViewRun}
      />,
    );

    // Collapsed bar is visible
    expect(
      screen.getByText(/100 records processed · 80 created, 20 updated/),
    ).toBeInTheDocument();

    const viewRunButtons = screen.getAllByRole('button', { name: 'View Run' });
    expect(viewRunButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(viewRunButtons[viewRunButtons.length - 1]);
    expect(onViewRun).toHaveBeenCalledWith('run-456');
  });
});
