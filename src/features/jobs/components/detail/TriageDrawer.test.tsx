import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TriageDrawer } from './TriageDrawer';
import type { ExtSyncRun } from '@/features/jobs/hooks';
import type { SyncLogRecord } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockListRecords = vi.fn();
const mockRetryFailed = vi.fn();
const mockRetryStatus = vi.fn();
vi.mock('@/api/syncLogs', () => ({
  syncLogsApi: {
    listRecords: (...args: unknown[]) => mockListRecords(...args),
    retryFailed: (...args: unknown[]) => mockRetryFailed(...args),
    getRetryFailedStatus: (...args: unknown[]) => mockRetryStatus(...args),
  },
}));

describe('TriageDrawer', () => {
  const baseRun: ExtSyncRun = {
    id: 'run-123',
    jobId: 'job-1',
    status: 'failed',
    startedAt: '2026-09-27T10:00:00Z',
    finishedAt: '2026-09-27T10:05:00Z',
    recordsProcessed: 10,
    createdCount: 8,
    updatedCount: 0,
    skippedCount: 1,
    failedCount: 1,
  };

  const mockRecords: SyncLogRecord[] = [
    {
      id: 'rec-1',
      action: 'failed',
      sourceRecordId: 'SRC-9901',
      failReason: 'missing_required_field',
      failReasonDetail:
        'Destination requires email field but source record has no value',
    },
    {
      id: 'rec-2',
      action: 'skipped',
      sourceRecordId: 'SRC-9902',
      skipReason: 'filter_excluded',
      skipReasonDetail: 'Record excluded by rule: status equals inactive',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListRecords.mockResolvedValue({
      data: mockRecords,
      remainingFailed: 1,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders affected records and fix suggestions for failed records', async () => {
    render(
      <TriageDrawer
        open={true}
        onOpenChange={vi.fn()}
        projectId="proj-1"
        jobId="job-1"
        run={baseRun}
      />,
    );

    expect(screen.getByText('Triage & Recovery')).toBeInTheDocument();
    expect(await screen.findByText('SRC-9901')).toBeInTheDocument();
    expect(screen.getByText('SRC-9902')).toBeInTheDocument();

    // Contextual fix suggestions for missing required field
    const defaultValBtn = screen.getByRole('button', {
      name: /default fallback value/i,
    });
    expect(defaultValBtn).toBeInTheDocument();

    const skipRuleBtn = screen.getByRole('button', {
      name: /skip rule suggestion/i,
    });
    expect(skipRuleBtn).toBeInTheDocument();

    // Clicking a fix suggestion navigates to field mapping with deep link
    fireEvent.click(defaultValBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-1/jobs/job-1?tab=field-mapping&field=email&action=fallbacks',
    );
  });

  it('filters records by search query', async () => {
    render(
      <TriageDrawer
        open={true}
        onOpenChange={vi.fn()}
        projectId="proj-1"
        jobId="job-1"
        run={baseRun}
      />,
    );

    expect(await screen.findByText('SRC-9901')).toBeInTheDocument();
    expect(screen.getAllByText('SRC-9902').length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText('Filter records...');
    fireEvent.change(searchInput, { target: { value: '9901' } });

    expect(screen.getByText('SRC-9901')).toBeInTheDocument();
    expect(screen.queryByText('SRC-9902')).not.toBeInTheDocument();
  });

  it('navigates to connections when auth fix is clicked', async () => {
    mockListRecords.mockResolvedValue({
      data: [
        {
          id: 'rec-auth',
          action: 'failed',
          sourceRecordId: 'SRC-AUTH-1',
          failReason: 'auth_failed',
          failReasonDetail: '401 Unauthorized token expired',
        },
      ],
    });

    render(
      <TriageDrawer
        open={true}
        onOpenChange={vi.fn()}
        projectId="proj-1"
        jobId="job-1"
        run={baseRun}
      />,
    );

    const reconnectBtn = await screen.findByRole('button', {
      name: /reconnect in connections/i,
    });
    expect(reconnectBtn).toBeInTheDocument();

    fireEvent.click(reconnectBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-1?tab=connections',
    );
  });

  it('retries the displayed run once and refreshes recovered records', async () => {
    mockListRecords
      .mockResolvedValueOnce({ data: mockRecords, remainingFailed: 1 })
      .mockResolvedValue({
        data: [{ ...mockRecords[0], resolved: true }, mockRecords[1]],
        remainingFailed: 0,
      });
    let releaseRetry!: (value: {
      bullJobId: string;
      failedCount: number;
    }) => void;
    mockRetryFailed.mockReturnValue(
      new Promise((resolve) => {
        releaseRetry = resolve;
      }),
    );
    mockRetryStatus.mockResolvedValue({
      state: 'completed',
      runStatus: 'completed',
      error: null,
      runError: null,
      createdCount: 1,
      updatedCount: 0,
      failedCount: 0,
      remainingFailed: 0,
    });
    const refresh = vi.fn();
    render(
      <TriageDrawer
        open
        onOpenChange={vi.fn()}
        projectId="proj-1"
        jobId="job-1"
        run={baseRun}
        onRefreshHistory={refresh}
      />,
    );
    const retry = await screen.findByRole('button', {
      name: /retry 1 failed records/i,
    });
    retry.focus();
    expect(retry).toHaveFocus();
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(mockRetryFailed).toHaveBeenCalledTimes(1);
    expect(mockRetryFailed).toHaveBeenCalledWith('proj-1', 'job-1', 'run-123');
    expect(retry).toBeDisabled();
    releaseRetry({ bullJobId: 'queue-1', failedCount: 1 });
    await waitFor(() =>
      expect(mockRetryStatus).toHaveBeenCalledWith(
        'proj-1',
        'job-1',
        'run-123',
        'queue-1',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      '1 record(s) synced',
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: /retry .* failed records/i }),
    ).not.toBeInTheDocument();
  });

  it('shows no retry action when no failed records remain and keeps close accessible', async () => {
    mockListRecords.mockResolvedValue({ data: [], remainingFailed: 0 });
    const close = vi.fn();
    render(
      <TriageDrawer
        open
        onOpenChange={close}
        projectId="proj-1"
        jobId="job-1"
        run={{ ...baseRun, failedCount: 0, skippedCount: 0 }}
      />,
    );
    await screen.findByText('No affected records found');
    expect(
      screen.queryByRole('button', { name: /retry .* failed records/i }),
    ).not.toBeInTheDocument();
    const closeButton = screen.getByRole('button', {
      name: 'Close triage sidebar',
    });
    closeButton.focus();
    expect(closeButton).toHaveFocus();
    fireEvent.click(closeButton);
    expect(close).toHaveBeenCalledWith(false);
  });

  it('shows retry errors and allows another attempt', async () => {
    mockRetryFailed.mockRejectedValue({
      response: {
        data: { message: 'A sync is already in progress for this job' },
      },
    });
    render(
      <TriageDrawer
        open
        onOpenChange={vi.fn()}
        projectId="proj-1"
        jobId="job-1"
        run={baseRun}
      />,
    );
    const retry = await screen.findByRole('button', {
      name: /retry 1 failed records/i,
    });
    fireEvent.click(retry);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A sync is already in progress for this job',
    );
    expect(retry).toBeEnabled();
  });
});
