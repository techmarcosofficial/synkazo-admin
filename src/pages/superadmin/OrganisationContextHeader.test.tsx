import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach } from 'vitest';
import { toast } from 'sonner';

import OrganisationScopeLayout from './OrganisationScopeLayout';
import { BadgeAppearanceProvider } from '@/components/ui/badge';

const fixtures = vi.hoisted(() => ({
  updateProject: vi.fn(),
  updatePending: false,
  mutationScope: vi.fn(),
  organisation: {
    name: 'Northwind HVAC',
    slug: 'northwind',
    status: 'active',
    plan: { name: 'Pro', subscriptionStatus: 'active' },
    paymentHoldActive: false,
  },
  project: {
    id: 'proj-1',
    name: 'CRM Sync',
    status: 'active',
    sourcePlatformId: 'servicetitan',
    destPlatformId: 'hubspot',
    activeEnvironment: 'production',
    jobCount: 3,
  },
  job: {
    id: 'job-1',
    name: 'Contacts flow',
    sourceObject: 'customers',
    destObject: 'contacts',
    syncDirection: 'one_way',
    isRunning: false,
    isEnabled: true,
    fieldMappings: [],
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/queries/useSuperAdmin', () => ({
  useUpdateSuperAdminProjectMutation: (
    organisationId: string,
    projectId: string,
  ) => {
    fixtures.mutationScope(organisationId, projectId);
    return {
      isPending: fixtures.updatePending,
      mutateAsync: fixtures.updateProject,
    };
  },
  useSuperAdminOrganisationQuery: () => ({
    data: fixtures.organisation,
    isError: false,
  }),
  useSuperAdminProjectQuery: () => ({
    data: fixtures.project,
    isError: false,
  }),
  useSuperAdminJobQuery: () => ({
    data: fixtures.job,
    isError: false,
  }),
  useSuperAdminProjectConnectionsQuery: () => ({ data: [] }),
  useSetSuperAdminJobEnabledMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

function renderAt(path: string) {
  return render(
    <BadgeAppearanceProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/super-admin/organisations/:organisationId"
            element={<OrganisationScopeLayout />}
          >
            <Route path="overview" element={<p>Organisation content</p>} />
            <Route
              path="projects/:projectId"
              element={<p>Project content</p>}
            />
            <Route
              path="projects/:projectId/jobs/:jobId"
              element={<p>Job content</p>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </BadgeAppearanceProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.updatePending = false;
  fixtures.updateProject.mockReset().mockResolvedValue({});
});

describe('selected organisation context header', () => {
  it('changes project status using the selected organisation and project', async () => {
    const user = userEvent.setup();
    renderAt('/super-admin/organisations/org-1/projects/proj-1?tab=sync-rules');
    expect(
      screen.getByRole('button', { name: 'Change project status: active' }),
    ).toHaveClass('border-0', 'bg-success/10', 'text-foreground');
    await user.click(
      screen.getByRole('button', { name: 'Change project status: active' }),
    );
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
    await user.click(screen.getByRole('menuitem', { name: /paused/i }));
    expect(fixtures.mutationScope).toHaveBeenCalledWith('org-1', 'proj-1');
    expect(fixtures.updateProject).toHaveBeenCalledExactlyOnceWith({
      status: 'paused',
    });
    expect(toast.success).toHaveBeenCalledWith('Project status set to paused.');
  });

  it('shows an update failure and keeps the current status available for retry', async () => {
    const user = userEvent.setup();
    fixtures.updateProject.mockRejectedValue(new Error('Project not found'));
    renderAt('/super-admin/organisations/org-1/projects/proj-1?tab=settings');
    await user.click(
      screen.getByRole('button', { name: 'Change project status: active' }),
    );
    await user.click(screen.getByRole('menuitem', { name: /paused/i }));
    expect(toast.error).toHaveBeenCalledWith('Project not found');
    expect(toast.success).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Change project status: active' }),
    ).toBeEnabled();
  });

  it('disables the project status dropdown while saving', () => {
    fixtures.updatePending = true;
    renderAt('/super-admin/organisations/org-1/projects/proj-1');
    expect(
      screen.getByRole('button', { name: 'Change project status: active' }),
    ).toBeDisabled();
    expect(fixtures.updateProject).not.toHaveBeenCalled();
  });

  it('does not submit the status that is already selected', async () => {
    const user = userEvent.setup();
    renderAt('/super-admin/organisations/org-1/projects/proj-1');
    await user.click(
      screen.getByRole('button', { name: 'Change project status: active' }),
    );
    await user.click(screen.getByRole('menuitem', { name: /^active/i }));
    expect(fixtures.updateProject).not.toHaveBeenCalled();
  });

  it('shows one organisation heading and organisation sections', () => {
    renderAt('/super-admin/organisations/org-1/overview');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Northwind HVAC' }),
    ).toBeInTheDocument();
    const sections = screen.getByRole('navigation', {
      name: 'Organisation sections',
    });
    expect(
      within(sections).getByRole('link', { name: 'Overview' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows the organisation hierarchy and switches project tabs through the URL', () => {
    renderAt('/super-admin/organisations/org-1/projects/proj-1?tab=sync-rules');

    expect(
      screen.getByRole('link', { name: 'Back to Projects' }),
    ).toHaveAttribute('href', '/super-admin/organisations/org-1/projects');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'CRM Sync' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Northwind HVAC' }),
    ).toHaveAttribute('href', '/super-admin/organisations/org-1/overview');
    const sections = screen.getByRole('navigation', {
      name: 'Project sections',
    });
    expect(
      within(sections).getByRole('link', { name: 'Sync Flows' }),
    ).toHaveAttribute('aria-current', 'page');
    fireEvent.click(
      within(sections).getByRole('link', { name: 'Connections' }),
    );
    expect(
      within(sections).getByRole('link', { name: 'Connections' }),
    ).toHaveAttribute('aria-current', 'page');
    fireEvent.click(within(sections).getByRole('link', { name: 'Settings' }));
    expect(
      within(sections).getByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows job hierarchy and the current job tab on a direct link', () => {
    renderAt(
      '/super-admin/organisations/org-1/projects/proj-1/jobs/job-1?tab=field-mapping',
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: 'Back to Sync Flows' }),
    ).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/projects/proj-1?tab=sync-rules',
    );
    expect(
      screen.getByRole('heading', { name: 'Contacts flow' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CRM Sync' })).toHaveAttribute(
      'href',
      '/super-admin/organisations/org-1/projects/proj-1?tab=sync-rules',
    );
    const sections = screen.getByRole('navigation', {
      name: 'Sync flow sections',
    });
    expect(
      within(sections).getByRole('link', { name: 'Field Mapping' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(sections).queryByRole('link', { name: 'Pipeline' }),
    ).not.toBeInTheDocument();
  });
});
