import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

import OrganisationScopeLayout from './OrganisationScopeLayout';

const fixtures = vi.hoisted(() => ({
  organisation: {
    name: 'Northwind HVAC',
    slug: 'northwind',
    status: 'active',
    plan: { name: 'Pro', subscriptionStatus: 'active' },
    paymentHoldActive: false,
  },
  project: {
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

vi.mock('@/queries/useSuperAdmin', () => ({
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
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/super-admin/organisations/:organisationId"
          element={<OrganisationScopeLayout />}
        >
          <Route path="overview" element={<p>Organisation content</p>} />
          <Route path="projects/:projectId" element={<p>Project content</p>} />
          <Route
            path="projects/:projectId/jobs/:jobId"
            element={<p>Job content</p>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('selected organisation context header', () => {
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
