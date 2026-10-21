import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import OrganisationProjectSettings from './OrganisationProjectSettings';

import type { SuperAdminProjectDetail } from '@/types/superAdmin';

const archiveApi = vi.hoisted(() => ({
  getProjectArchiveImpact: vi.fn(),
  archiveProject: vi.fn(),
}));
vi.mock('@/api/superAdminOperations', () => ({
  superAdminOperationsApi: archiveApi,
}));

vi.mock('@/queries/useSuperAdmin', () => ({
  useUpdateSuperAdminProjectMutation: () => ({
    isPending: false,
    isError: false,
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}));
vi.mock('./associations/OrganisationProjectAssociationsPage', () => ({
  OrganisationProjectAssociationsPanel: () => <p>Scoped associations panel</p>,
}));
vi.mock('./migration/OrganisationProjectMigrationPage', () => ({
  OrganisationProjectMigrationPanel: () => <p>Scoped environments panel</p>,
}));
vi.mock('./OrganisationProjectScheduler', () => ({
  default: () => {
    const [draft, setDraft] = useState('');
    return (
      <div>
        <p>Scoped scheduler panel</p>
        <input
          aria-label="Scheduler draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
    );
  },
}));

const project: SuperAdminProjectDetail = {
  id: 'project-1',
  organisationId: 'org-1',
  name: 'CRM sync',
  description: 'Customer to contact',
  status: 'active',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  syncMode: 'one_way',
  jobCount: 2,
  enabledJobCount: 2,
  lastSyncedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  schedulerMode: 'individual',
  activeEnvironment: 'sandbox',
  environmentActivatedAt: null,
  totalRecordsSynced: 0,
  totalErrorCount: 0,
};

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderSettings(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <OrganisationProjectSettings
        organisationId="org-1"
        organisationName="Northwind"
        project={project}
        onHold={vi.fn()}
        onResume={vi.fn()}
        operationPending={false}
      />
      <Location />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('OrganisationProjectSettings', () => {
  it('renders separate full-width cards that collapse independently and keeps open sections in the URL', async () => {
    renderSettings(
      '/super-admin/organisations/org-1/projects/project-1?tab=settings',
    );
    expect(screen.getByRole('button', { name: /General/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Project information')).toBeInTheDocument();
    const general = screen.getByRole('button', { name: /General/ });
    const scheduler = screen.getByRole('button', { name: /Bulk Scheduler/ });
    const associations = screen.getByRole('button', { name: /Associations/ });
    const environments = screen.getByRole('button', {
      name: /Environments/,
    });
    const cards = [general, scheduler, associations, environments].map(
      (trigger) => trigger.closest('[data-slot="card"]'),
    );
    expect(new Set(cards).size).toBe(4);
    cards.forEach((card) =>
      expect(card).toHaveAttribute('data-layout-surface', 'outer'),
    );
    expect(scheduler).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(associations);
    expect(
      await screen.findByText('Scoped associations panel'),
    ).toBeInTheDocument();
    expect(general).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Project information')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        'section=general%2Cassociations',
      ),
    );

    fireEvent.click(general);
    expect(general).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Project information')).not.toBeInTheDocument();
    expect(associations).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent(
      'section=associations',
    );

    fireEvent.click(associations);
    expect(associations).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('location')).toHaveTextContent('section=closed');
  });

  it('opens a deep-linked environment section', async () => {
    renderSettings(
      '/super-admin/organisations/org-1/projects/project-1?tab=settings&section=environments',
    );
    expect(
      await screen.findByText('Scoped environments panel'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Environments/ }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('preserves unsaved scheduler state when its card is collapsed', async () => {
    renderSettings(
      '/super-admin/organisations/org-1/projects/project-1?tab=settings',
    );
    const trigger = screen.getByRole('button', { name: /Bulk Scheduler/ });
    fireEvent.click(trigger);
    const draft = await screen.findByRole('textbox', {
      name: 'Scheduler draft',
    });
    fireEvent.change(draft, { target: { value: 'unsaved schedule' } });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(
      screen.getByRole('textbox', { name: 'Scheduler draft' }),
    ).toHaveValue('unsaved schedule');
  });

  it('requires archive impact, exact project name, and an operator reason', async () => {
    archiveApi.getProjectArchiveImpact.mockResolvedValue({
      projectId: 'project-1',
      projectName: 'CRM sync',
      canArchive: true,
      blockers: { queuedSyncs: 0, runningSyncs: 0, activePriorityCycles: 0 },
      affected: {
        jobs: 2,
        scheduledJobs: 1,
        prioritySchedules: 0,
        connections: 2,
        runHistory: 5,
      },
    });
    archiveApi.archiveProject.mockResolvedValue({});
    renderSettings(
      '/super-admin/organisations/org-1/projects/project-1?tab=settings',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review impact' }));
    await screen.findByText(/2 jobs · 1 scheduled/);
    fireEvent.click(screen.getByRole('button', { name: 'Archive project' }));
    const submit = screen.getByRole('button', { name: 'Archive project' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type CRM sync to confirm/), {
      target: { value: 'crm sync' },
    });
    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: 'Requested by support' },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type CRM sync to confirm/), {
      target: { value: 'CRM sync' },
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(archiveApi.archiveProject).toHaveBeenCalledWith(
        'org-1',
        'project-1',
        'CRM sync',
        'Requested by support',
      ),
    );
  });
});
