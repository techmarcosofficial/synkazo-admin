import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DangerZoneCard from './DangerZoneCard';

import type { ProjectArchiveImpact } from '@/api/projects';
import type { ProjectExt } from '@/features/projects/hooks';

const api = vi.hoisted(() => ({
  getArchiveImpact: vi.fn(),
  deleteProject: vi.fn(),
}));
const auth = vi.hoisted(() => ({ canManage: true }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/api/projects', () => ({ projectsApi: api }));
vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({ hasRole: () => auth.canManage }),
}));
vi.mock('@/lib/toast', () => ({ showToast: toast }));

const project: ProjectExt = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'Revenue Operations',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  status: 'active',
};

const readyImpact: ProjectArchiveImpact = {
  projectId: project.id,
  projectName: project.name,
  canArchive: true,
  blockers: {
    queuedSyncs: 0,
    runningSyncs: 0,
    activePriorityCycles: 0,
  },
  affected: {
    jobs: 4,
    scheduledJobs: 2,
    prioritySchedules: 1,
    connections: 4,
    runHistory: 27,
  },
};

beforeEach(() => {
  auth.canManage = true;
  api.getArchiveImpact.mockResolvedValue(readyImpact);
  api.deleteProject.mockResolvedValue(readyImpact);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard(onDeleted = vi.fn()) {
  render(<DangerZoneCard project={project} onDeleted={onDeleted} />);
  return onDeleted;
}

describe('DangerZoneCard', () => {
  it('shows the authoritative retained-data and schedule impact', async () => {
    renderCard();

    expect(await screen.findByText('Ready to archive')).toBeInTheDocument();
    expect(screen.getByText('Jobs retained')).toBeInTheDocument();
    expect(screen.getByText('Schedules disabled')).toBeInTheDocument();
    expect(screen.getByText('Connections retained')).toBeInTheDocument();
    expect(screen.getByText('Runs retained')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText(/soft archive/i)).toBeInTheDocument();
  });

  it('requires the exact project name before archiving and redirects on success', async () => {
    const onDeleted = renderCard();
    await screen.findByText('Ready to archive');
    await userEvent.click(
      screen.getByRole('button', { name: 'Review and archive' }),
    );

    const dialog = screen.getByRole('dialog');
    const archiveButton = within(dialog).getByRole('button', {
      name: 'Archive project',
    });
    expect(archiveButton).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText(/Type Revenue Operations to confirm/i),
      'Revenue Operation',
    );
    expect(archiveButton).toBeDisabled();
    await userEvent.type(
      within(dialog).getByLabelText(/Type Revenue Operations to confirm/i),
      's',
    );
    expect(archiveButton).toBeEnabled();
    await userEvent.click(archiveButton);

    await waitFor(() =>
      expect(api.deleteProject).toHaveBeenCalledWith(
        'project-1',
        'Revenue Operations',
      ),
    );
    expect(toast.success).toHaveBeenCalledWith('Project archived.');
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  it('blocks archive while queued, running, or priority work is active', async () => {
    api.getArchiveImpact.mockResolvedValue({
      ...readyImpact,
      canArchive: false,
      blockers: {
        queuedSyncs: 2,
        runningSyncs: 1,
        activePriorityCycles: 1,
      },
    });
    renderCard();

    expect(
      await screen.findByText('Active work must finish first'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 queued syncs, 1 running syncs/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Review and archive' }),
    ).toBeDisabled();
  });

  it('keeps impact failures visible and retryable', async () => {
    api.getArchiveImpact
      .mockRejectedValueOnce(new Error('Queue inspection unavailable.'))
      .mockResolvedValueOnce(readyImpact);
    renderCard();

    expect(
      await screen.findByText('Archive impact unavailable'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Queue inspection unavailable.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Ready to archive')).toBeInTheDocument();
  });

  it('keeps the danger action read-only for editors', async () => {
    auth.canManage = false;
    renderCard();

    expect(
      await screen.findByText('Admin access required'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Review and archive' }),
    ).not.toBeInTheDocument();
  });

  it('keeps archive failures in the dialog without redirecting', async () => {
    api.deleteProject.mockRejectedValue(
      new Error('A sync started. Refresh the impact and try again.'),
    );
    const onDeleted = renderCard();
    await screen.findByText('Ready to archive');
    await userEvent.click(
      screen.getByRole('button', { name: 'Review and archive' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText(/Type Revenue Operations to confirm/i),
      project.name,
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Archive project' }),
    );

    expect(
      await within(dialog).findByText(/A sync started. Refresh the impact/i),
    ).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
