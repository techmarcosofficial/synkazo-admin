import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import RunHistoryTab from './RunHistoryTab';
import { JobDetailProvider, type JobDetailContextValue } from '../context';
import type { ExtSyncRun } from '@/features/jobs/hooks';

const mockUseRunLogsQuery = vi.fn();
vi.mock('@/queries/useJobs', () => ({
  useRunLogsQuery: (...args: unknown[]) => mockUseRunLogsQuery(...args),
}));

vi.mock('../TriageDrawer', () => ({
  TriageDrawer: () => <div data-testid="triage-drawer" />,
}));

describe('RunHistoryTab', () => {
  const sampleRun: ExtSyncRun = {
    id: 'run-99',
    jobId: 'job-1',
    projectId: 'proj-1',
    organisationId: 'org-1',
    status: 'completed',
    startedAt: '2026-10-26T10:00:00Z',
    finishedAt: '2026-10-26T10:02:00Z',
    triggeredBy: 'manual',
    recordsProcessed: 42,
    createdCount: 20,
    updatedCount: 20,
    skippedCount: 2,
    failedCount: 0,
    sourcePlatform: 'hubspot',
    destPlatform: 'servicetitan',
    sourceObject: 'contacts',
    destObject: 'customers',
  };

  const mockContextValue = {
    projectId: 'proj-ctx-1',
    jobId: 'job-ctx-1',
    job: { id: 'job-ctx-1', name: 'Sync Job' },
    activeRunLog: null,
    refetch: vi.fn(),
  } as unknown as JobDetailContextValue;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRunLogsQuery.mockReturnValue({
      data: {
        data: [sampleRun],
        total: 1,
        page: 1,
        limit: 20,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders runs using JobDetailContext when mounted without props (normal user flow)', () => {
    render(
      <MemoryRouter>
        <JobDetailProvider value={mockContextValue}>
          <RunHistoryTab />
        </JobDetailProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Run History')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search run or record ID/i)).toBeInTheDocument();
    expect(mockUseRunLogsQuery).toHaveBeenCalledWith(
      'proj-ctx-1',
      'job-ctx-1',
      1,
      20,
      true,
      expect.any(Object),
    );
    expect(screen.getAllByText('40').length).toBeGreaterThan(0);
  });

  it('renders runs using explicit props without JobDetailProvider (Super Admin flow)', () => {
    const mockRefetch = vi.fn();
    render(
      <MemoryRouter>
        <RunHistoryTab
          projectId="super-proj-1"
          jobId="super-job-1"
          refetch={mockRefetch}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Run History')).toBeInTheDocument();
    expect(mockUseRunLogsQuery).toHaveBeenCalledWith(
      'super-proj-1',
      'super-job-1',
      1,
      20,
      true,
      expect.any(Object),
    );
    expect(screen.getAllByText('40').length).toBeGreaterThan(0);
  });

  it('renders empty state when there are no sync runs', () => {
    mockUseRunLogsQuery.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RunHistoryTab projectId="proj-1" jobId="job-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No sync runs yet/i)).toBeInTheDocument();
  });
});
