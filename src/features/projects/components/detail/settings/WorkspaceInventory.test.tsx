import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WorkspaceInventory from './WorkspaceInventory';

import { useProjectEnvironmentsQuery } from '@/queries/useProjects';

vi.mock('@/queries/useProjects', () => ({
  useProjectEnvironmentsQuery: vi.fn(),
}));

describe('WorkspaceInventory', () => {
  it('keeps unclassified legacy counts out of each workspace', () => {
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
  });
});
