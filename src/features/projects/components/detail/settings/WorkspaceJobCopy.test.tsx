import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WorkspaceJobCopy from './WorkspaceJobCopy';

const preview = vi.fn();
afterEach(() => cleanup());

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (options: { queryKey: unknown[] }) => preview(options),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/queries/useProjects', () => ({
  useProjectEnvironmentsQuery: () => ({
    data: { workspaces: [
      { id: 'sandbox-1', label: 'Sandbox', active: true },
      { id: 'production-1', label: 'Production', active: false },
    ] },
    isPending: false,
    isError: false,
  }),
}));
vi.mock('@/queries/useEntitlements', () => ({
  useEntitlements: () => ({ envMigration: true }),
}));
vi.mock('@/hooks/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: () => true }),
}));

describe('WorkspaceJobCopy', () => {
  it('lists a Production job as an optional inactive copy when Sandbox is active', () => {
    preview.mockReturnValue({
      data: {
        jobs: [{
          jobId: 'prod-job-1', name: 'Contacts sync',
          sourceObject: 'contacts', destObject: 'contacts',
          mappingCount: 2, dependsOnJobId: null, status: 'ready', reason: null,
        }],
        savedJobs: 1, maxJobs: 10, legacyUnassignedJobs: 0,
      },
      isPending: false,
      isError: false,
    });

    render(<WorkspaceJobCopy projectId="project-1" />);

    expect(screen.getByText('Contacts sync')).toBeInTheDocument();
    expect(screen.getByText(/Choose saved jobs from Production to create inactive copies in Sandbox/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Contacts sync' })).toBeEnabled();
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['projects', 'project-1', 'job-copy-preview', 'production-1', 'sandbox-1'],
    }));
  });

  it('explains why an old unassigned job is absent from the copy list', () => {
    preview.mockReturnValue({
      data: { jobs: [], savedJobs: 1, maxJobs: 10, legacyUnassignedJobs: 1 },
      isPending: false,
      isError: false,
    });

    render(<WorkspaceJobCopy projectId="project-1" />);

    expect(screen.getByText(/1 old shared job is unclassified/)).toBeInTheDocument();
    expect(screen.getByText(/No workspace-owned jobs are saved in Production yet/)).toBeInTheDocument();
  });

  it('reverses the copy direction from Sandbox to Production', () => {
    preview.mockReturnValue({
      data: { jobs: [], savedJobs: 0, maxJobs: 10, legacyUnassignedJobs: 0 },
      isPending: false,
      isError: false,
    });
    render(<WorkspaceJobCopy projectId="project-1" />);

    fireEvent.click(screen.getByRole('button', { name: /Reverse direction/ }));

    expect(screen.getByText(/Choose saved jobs from Sandbox to create inactive copies in Production/)).toBeInTheDocument();
    expect(preview).toHaveBeenLastCalledWith(expect.objectContaining({
      queryKey: ['projects', 'project-1', 'job-copy-preview', 'sandbox-1', 'production-1'],
    }));
  });

  it('blocks a selection that exceeds a finite saved-job allowance', () => {
    preview.mockReturnValue({
      data: {
        jobs: [{
          jobId: 'prod-job-1', name: 'Contacts sync',
          sourceObject: 'contacts', destObject: 'contacts',
          mappingCount: 2, dependsOnJobId: null, status: 'ready', reason: null,
        }],
        savedJobs: 10, maxJobs: 10, legacyUnassignedJobs: 0,
      },
      isPending: false,
      isError: false,
    });

    render(<WorkspaceJobCopy projectId="project-1" />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Contacts sync' }));

    expect(screen.getByRole('button', { name: 'Copy 1 as inactive' })).toBeDisabled();
    expect(screen.getByText(/These copies exceed the saved-job limit/)).toBeInTheDocument();
  });
});
