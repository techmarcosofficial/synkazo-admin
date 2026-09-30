import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TriageDrawer } from './TriageDrawer';
import type { ExtSyncRun } from '@/features/jobs/hooks';
import type { SyncLogRecord } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockListRecords = vi.fn();
const mockRunJob = vi.fn();
vi.mock('@/api/syncLogs', () => ({
  syncLogsApi: {
    listRecords: (...args: unknown[]) => mockListRecords(...args),
  },
}));

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    runJob: (...args: unknown[]) => mockRunJob(...args),
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
      failReasonDetail: 'Destination requires email field but source record has no value',
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
    mockListRecords.mockResolvedValue({ data: mockRecords });
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
    const defaultValBtn = screen.getByRole('button', { name: /default fallback value/i });
    expect(defaultValBtn).toBeInTheDocument();

    const skipRuleBtn = screen.getByRole('button', { name: /skip rule suggestion/i });
    expect(skipRuleBtn).toBeInTheDocument();

    // Clicking a fix suggestion navigates to field mapping
    fireEvent.click(defaultValBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1/jobs/job-1?tab=field-mapping');
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

    const reconnectBtn = await screen.findByRole('button', { name: /reconnect in connections/i });
    expect(reconnectBtn).toBeInTheDocument();

    fireEvent.click(reconnectBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1?tab=connections');
  });
});
