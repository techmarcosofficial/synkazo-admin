import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SyncRunProgress from './SyncRunProgress';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SyncRunProgress', () => {
  it('renders scheduled run context and live progress', () => {
    const { rerender } = render(
      <SyncRunProgress
        runId="run-1"
        jobId="job-1"
        status="running"
        totalRecords={200}
        processedRecords={50}
        completedBatches={3}
        currentBatch={4}
        batchProcessed={10}
        batchTotal={20}
        totalBatches={10}
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
    expect(screen.getByText('50 of 200 records processed')).toBeInTheDocument();
    expect(screen.getByText('Batch 4 / 10')).toBeInTheDocument();
    expect(screen.getByText(/Customers → Companies/)).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.queryByText('Processing rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Source status')).not.toBeInTheDocument();
    expect(screen.queryByText('Trigger type')).not.toBeInTheDocument();
    expect(screen.queryByText('Ended at')).not.toBeInTheDocument();

    rerender(
      <SyncRunProgress
        runId="run-1"
        jobId="job-1"
        status="running"
        totalRecords={200}
        processedRecords={100}
        completedBatches={5}
        currentBatch={6}
        batchProcessed={0}
        batchTotal={20}
        totalBatches={10}
        triggeredBy="cron"
      />,
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Batch 6 / 10')).toBeInTheDocument();
  });

  it('fills one real batch from zero to full, then resets for the next batch', () => {
    const { rerender } = render(
      <SyncRunProgress
        status="running"
        totalRecords={1000}
        processedRecords={500}
        failedCount={500}
        completedBatches={50}
        currentBatch={51}
        batchProcessed={0}
        batchTotal={10}
        totalBatches={100}
      />,
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(
      screen.getByText('500 of 1,000 records processed'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress' }),
    ).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Batch 51 / 100')).toBeInTheDocument();
    const batchBar = screen.getByRole('progressbar', {
      name: 'Batch progress',
    });
    expect(batchBar).toHaveAttribute('aria-valuenow', '0');

    rerender(
      <SyncRunProgress
        status="running"
        totalRecords={1000}
        processedRecords={505}
        failedCount={505}
        completedBatches={50}
        currentBatch={51}
        batchProcessed={5}
        batchTotal={10}
        totalBatches={100}
      />,
    );
    expect(batchBar).toHaveAttribute('aria-valuenow', '50');
    expect(batchBar).toHaveClass('[&_[data-slot=progress-indicator]]:bg-info');

    rerender(
      <SyncRunProgress
        status="running"
        totalRecords={1000}
        processedRecords={510}
        failedCount={510}
        completedBatches={51}
        currentBatch={51}
        batchProcessed={10}
        batchTotal={10}
        totalBatches={100}
      />,
    );
    expect(batchBar).toHaveAttribute('aria-valuenow', '100');
    expect(batchBar).toHaveClass(
      '[&_[data-slot=progress-indicator]]:bg-success',
    );

    rerender(
      <SyncRunProgress
        status="running"
        totalRecords={1000}
        processedRecords={510}
        failedCount={510}
        completedBatches={51}
        currentBatch={52}
        batchProcessed={0}
        batchTotal={10}
        totalBatches={100}
      />,
    );
    expect(screen.getByText('Batch 52 / 100')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Batch progress' }),
    ).toHaveAttribute('aria-valuenow', '0');
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress' }),
    ).toHaveAttribute('aria-valuenow', '51');

    rerender(
      <SyncRunProgress
        status="completed"
        totalRecords={1000}
        processedRecords={1000}
        failedCount={500}
        completedBatches={100}
        totalBatches={100}
      />,
    );
    expect(screen.getAllByText('100%')).toHaveLength(2);
    expect(screen.getByText('Batch 100 / 100')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Batch progress' }),
    ).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows only the active batch for 1,000 batches', () => {
    render(
      <SyncRunProgress
        status="running"
        totalRecords={10_000}
        processedRecords={9_990}
        completedBatches={999}
        currentBatch={1000}
        batchProcessed={0}
        batchTotal={10}
        totalBatches={1_000}
      />,
    );
    const batchBar = screen.getByRole('progressbar', {
      name: 'Batch progress',
    });
    expect(screen.getByText('Batch 1,000 / 1,000')).toBeInTheDocument();
    expect(batchBar).toHaveAttribute('aria-valuenow', '0');
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
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('1m 0s')).toBeInTheDocument();
    expect(screen.getByLabelText('Record statistics').children).toHaveLength(5);
    expect(
      screen
        .getByRole('button', { name: 'Close' })
        .closest('[data-slot="sync-summary-header"]'),
    ).toBeInTheDocument();

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
      screen.getByText(
        '3 records failed. This run could not be completed. Review run history for details.',
      ),
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
    expect(
      screen.getByText('This sync stopped before completion.'),
    ).toBeInTheDocument();
  });

  it('shows an indeterminate queued state and safe unknown totals', () => {
    render(
      <SyncRunProgress
        status="queued"
        totalRecords={0}
        processedRecords={0}
        startedAt="invalid"
      />,
    );
    expect(screen.getAllByText('Queued').length).toBeGreaterThan(0);
    expect(
      screen.queryByText('Waiting for this sync to start…'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress unknown' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('—', { selector: 'strong' }).length,
    ).toBeGreaterThan(0);
  });

  it('does not invent a first batch or percentage before batch data arrives', () => {
    render(
      <SyncRunProgress
        status="running"
        totalRecords={null}
        completedBatches={0}
      />,
    );
    expect(screen.getByText('Batch progress')).toBeInTheDocument();
    expect(screen.queryByText('Batch 1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Overall progress unknown' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Batch progress unknown' }),
    ).toBeInTheDocument();
  });

  it('keeps actual failed progress and opens failed-record history', () => {
    const onViewHistory = vi.fn();
    render(
      <SyncRunProgress
        status="failed"
        totalRecords={100}
        processedRecords={25}
        failedCount={30}
        onViewHistory={onViewHistory}
      />,
    );
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    const historyAction = screen.getByRole('button', { name: /View details/ });
    expect(
      historyAction.closest('[data-slot="sync-summary-header"]'),
    ).toBeInTheDocument();
    fireEvent.click(historyAction);
    expect(onViewHistory).toHaveBeenCalledOnce();
  });

  it('shows completed issues with final batch progress', () => {
    const onViewHistory = vi.fn();
    render(
      <SyncRunProgress
        status="completed"
        totalRecords={10}
        processedRecords={10}
        failedCount={2}
        completedBatches={4}
        totalBatches={4}
        onViewHistory={onViewHistory}
      />,
    );
    expect(screen.getAllByText('Completed with issues').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText('Batch 4 / 4')).toBeInTheDocument();
    expect(
      screen.getByText(
        '2 records failed — review failed-record history for details or retry',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2 records failed/ }));
    expect(onViewHistory).toHaveBeenCalledOnce();
  });

  it('shows live failed counts but waits until the run ends to show the failed-record action', () => {
    const onViewHistory = vi.fn();
    const { rerender } = render(
      <SyncRunProgress
        status="running"
        processedRecords={70}
        failedCount={50}
        onViewHistory={onViewHistory}
      />,
    );
    expect(screen.getByText('50', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('Processing records…')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/review failed-record history/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /View details/ }),
    ).not.toBeInTheDocument();

    rerender(
      <SyncRunProgress
        status="completed"
        processedRecords={70}
        failedCount={50}
        onViewHistory={onViewHistory}
      />,
    );
    expect(
      screen.getByText(
        '50 records failed — review failed-record history for details or retry',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /View details/ }),
    ).toBeInTheDocument();
  });
});
