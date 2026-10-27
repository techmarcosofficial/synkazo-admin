import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WorkspaceInventory from './WorkspaceInventory';

import { jobsApi } from '@/api/jobs';
import { useLegacyJobsQuery, useProjectEnvironmentsQuery } from '@/queries/useProjects';

vi.mock('@/api/jobs', () => ({
  jobsApi: { resumeWorkspaceJob: vi.fn() },
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: () => true }),
}));

vi.mock('@/queries/useProjects', () => ({
  useProjectEnvironmentsQuery: vi.fn(),
  useLegacyJobsQuery: vi.fn(),
}));

describe('WorkspaceInventory', () => {
  it('resumes only a reviewed active job with the displayed generation', async () => {
    vi.mocked(useLegacyJobsQuery).mockReturnValue({ data: [], isError: false } as unknown as ReturnType<typeof useLegacyJobsQuery>);
    vi.mocked(useProjectEnvironmentsQuery).mockReturnValue({
      data: { environmentGeneration: '7', workspaces: [], legacyUnassigned: {
        jobs: 0, connections: 0, runs: 0, runLogs: 0,
      } },
      isPending: false, isError: false,
    } as unknown as ReturnType<typeof useProjectEnvironmentsQuery>);
    vi.mocked(jobsApi.resumeWorkspaceJob).mockResolvedValue({ id: 'job-1' } as never);
    const refresh = vi.fn();
    render(<WorkspaceInventory projectId="project-1" jobs={[{
      id: 'job-1', projectId: 'project-1', name: 'Customers',
      sourceObject: 'customers', destObject: 'contacts', status: 'idle',
      resumeRequired: true,
    }]} onRefresh={refresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resume job' }));
    await waitFor(() => {
      expect(jobsApi.resumeWorkspaceJob).toHaveBeenCalledWith('project-1', 'job-1', '7');
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it('keeps unclassified legacy counts out of each workspace', () => {
    vi.mocked(useLegacyJobsQuery).mockReturnValue({
      data: [{ id: 'old-job', name: 'Contacts sync', sourceObject: 'customers',
        destObject: 'contacts', legacyArchivedAt: null }],
      isError: false,
    } as ReturnType<typeof useLegacyJobsQuery>);
    vi.mocked(useProjectEnvironmentsQuery).mockReturnValue({
      data: {
        projectId: 'project-1',
        activeEnvironmentId: 'sandbox-1',
        environmentGeneration: '0',
        workspaces: [
          {
            id: 'sandbox-1',
            key: 'sandbox',
            role: 'sandbox',
            label: 'Sandbox',
            lifecycleStatus: 'ready',
            active: true,
            jobs: 2,
            connections: 2,
            runs: 6,
            runLogs: 8,
          },
          {
            id: 'production-1',
            key: 'production',
            role: 'production',
            label: 'Production',
            lifecycleStatus: 'ready',
            active: false,
            jobs: 3,
            connections: 2,
            runs: 10,
            runLogs: 12,
          },
        ],
        legacyUnassigned: { jobs: 4, connections: 1, runs: 5, runLogs: 9 },
      },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useProjectEnvironmentsQuery>);

    render(<WorkspaceInventory projectId="project-1" />);

    expect(screen.getByText('Sandbox')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Unclassified legacy data — saved jobs: 4; connections: 1; runs: 5; run logs: 9/,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(3);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Legacy jobs to recreate')).toBeInTheDocument();
    expect(screen.getByText('Contacts sync')).toBeInTheDocument();
    expect(screen.getByText('Awaiting cutover')).toBeInTheDocument();
  });
});
