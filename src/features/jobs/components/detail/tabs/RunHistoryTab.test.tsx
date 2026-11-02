import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { JobDetailContextValue } from '../context';
import RunHistoryTab from './RunHistoryTab';

import type { SyncRun } from '@/types';

let mockContext: JobDetailContextValue;
let mockRunLogsData: {
  data: SyncRun[];
  total: number;
  page: number;
  limit: number;
};

afterEach(() => cleanup());

vi.mock('../context', () => ({
  useJobDetailContext: () => mockContext,
}));

vi.mock('@/queries/useJobs', () => ({
  useRunLogsQuery: () => ({
    data: mockRunLogsData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/api/jobs', () => ({
  jobsApi: {
    stopJob: vi.fn(),
  },
}));

vi.mock('@/api/syncLogs', () => ({
  syncLogsApi: {
    listPages: vi.fn().mockResolvedValue([]),
    listRecords: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    retryFailed: vi.fn(),
  },
}));

describe('RunHistoryTab', () => {
  beforeEach(() => {
    mockContext = {
      projectId: 'proj-1',
      job: {
        id: 'job-1',
        name: 'Contacts Sync',
        sourceObject: 'contact',
        destObject: 'contact',
        syncDirection: 'one_way',
      } as never,
      activeRunLog: null,
      hasConnection: true,
      refetch: vi.fn(),
    } as unknown as JobDetailContextValue;

    mockRunLogsData = {
      data: [
        {
          id: 'run-1234',
          jobId: 'job-1',
          status: 'completed',
          totalFetched: 50,
          createdCount: 10,
          updatedCount: 5,
          skippedCount: 3,
          failedCount: 2,
          recordsProcessed: 20, // 10 + 5 + 3 + 2
          startedAt: new Date().toISOString(),
          durationMs: 4500,
          triggeredBy: 'manual',
        } as SyncRun,
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
  });

  it('renders "Records processed" with sum of created, updated, skipped, and failed', () => {
    render(
      <MemoryRouter>
        <RunHistoryTab />
      </MemoryRouter>,
    );

    expect(screen.getByText('Records processed')).toBeInTheDocument();
    // 10 + 5 + 3 + 2 = 20
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('displays separate "Fetched" and "Processed" metrics in the expanded view', async () => {
    render(
      <MemoryRouter>
        <RunHistoryTab />
      </MemoryRouter>,
    );

    // Expand the run row
    const expandButton = screen.getByTitle('Run ID: run-1234');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Fetched')).toBeInTheDocument();
    });

    expect(screen.getByText('50')).toBeInTheDocument();

    const processedLabels = screen.getAllByText('Processed');
    expect(processedLabels.length).toBeGreaterThanOrEqual(1);

    // Fetched count (50) is kept separate from Processed count (20)
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
