import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ActiveProjectPipelineCard from './ActiveProjectPipelineCard';

import type { Connection, Job, Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProject: Project = {
  id: 'p1',
  name: 'Acme HVAC Integration',
  organisationId: 'org-1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  status: 'active',
  active_environment: 'production',
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ActiveProjectPipelineCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders project header, status, and production write warning without redundant overview button', () => {
    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={[]}
        jobs={[]}
      />,
    );

    expect(screen.getByText('Acme HVAC Integration')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(
      screen.getByText(/limited runs write to production/i),
    ).toBeInTheDocument();

    // Verify Project Overview button is NOT present
    expect(screen.queryByRole('button', { name: /project overview/i })).not.toBeInTheDocument();
  });

  it('renders "Recently Created" tag and multi-project indicator when totalProjects > 1', () => {
    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={[]}
        jobs={[]}
        totalProjects={2}
      />,
    );

    expect(screen.getByTestId('tag-recently-created')).toBeInTheDocument();
    expect(screen.getByText('Recently Created')).toBeInTheDocument();
    expect(
      screen.getByText(/showing setup for your most recently created project \(1 of 2 in progress\)/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all projects/i })).toHaveAttribute('href', '/projects');
  });

  it('does not render "Recently Created" tag when only 1 project exists', () => {
    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={[]}
        jobs={[]}
        totalProjects={1}
      />,
    );

    expect(screen.queryByTestId('tag-recently-created')).not.toBeInTheDocument();
  });

  it('navigates to connections tab when clicking Step 2 card', () => {
    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={[]}
        jobs={[]}
      />,
    );

    const step2Card = screen.getByTestId('step-connections');
    expect(step2Card).toBeInTheDocument();
    expect(screen.getByText('Action Required')).toBeInTheDocument();

    fireEvent.click(step2Card);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/p1?tab=connections&from=dashboard',
      {
        state: { from: '/dashboard', fromLabel: 'Back to Dashboard' },
      },
    );
  });

  it('disables Step 3 when connections are incomplete', () => {
    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={[]}
        jobs={[]}
      />,
    );

    const step3Card = screen.getByTestId('step-sync-flows');
    expect(step3Card).toBeDisabled();
    expect(screen.getByText('Requires connections')).toBeInTheDocument();
  });

  it('enables Step 3 and navigates to sync rules when connections are complete', () => {
    const connections: Connection[] = [
      {
        id: 'c1',
        projectId: 'p1',
        platformId: 'servicetitan',
        connectionType: 'source',
        status: 'connected',
      },
      {
        id: 'c2',
        projectId: 'p1',
        platformId: 'hubspot',
        connectionType: 'destination',
        status: 'connected',
      },
    ];

    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={connections}
        jobs={[]}
      />,
    );

    const step3Card = screen.getByTestId('step-sync-flows');
    expect(step3Card).not.toBeDisabled();
    expect(screen.getByText('Configure')).toBeInTheDocument();

    fireEvent.click(step3Card);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/p1?tab=sync-rules&from=dashboard',
      {
        state: { from: '/dashboard', fromLabel: 'Back to Dashboard' },
      },
    );
  });

  it('enables Step 4 and navigates to a limited run when sync flows exist', () => {
    const connections: Connection[] = [
      {
        id: 'c1',
        projectId: 'p1',
        platformId: 'servicetitan',
        connectionType: 'source',
        status: 'connected',
      },
      {
        id: 'c2',
        projectId: 'p1',
        platformId: 'hubspot',
        connectionType: 'destination',
        status: 'connected',
      },
    ];

    const jobs: Job[] = [
      {
        id: 'j1',
        projectId: 'p1',
        name: 'Customers to Contacts',
        sourceObject: 'customers',
        destObject: 'contacts',
        status: 'active',
        recordsSynced: 0,
      },
    ];

    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={connections}
        jobs={jobs}
      />,
    );

    const step4Card = screen.getByTestId('step-sample-test');
    expect(step4Card).not.toBeDisabled();
    expect(screen.getByText('Run Now')).toBeInTheDocument();

    fireEvent.click(step4Card);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/p1?tab=sync-rules&from=dashboard',
      {
        state: { from: '/dashboard', fromLabel: 'Back to Dashboard' },
      },
    );
  });

  it('shows a completed run when a job has synced records', () => {
    const connections: Connection[] = [
      {
        id: 'c1',
        projectId: 'p1',
        platformId: 'servicetitan',
        connectionType: 'source',
        status: 'connected',
      },
      {
        id: 'c2',
        projectId: 'p1',
        platformId: 'hubspot',
        connectionType: 'destination',
        status: 'connected',
      },
    ];

    const jobs: Job[] = [
      {
        id: 'j1',
        projectId: 'p1',
        name: 'Customers to Contacts',
        sourceObject: 'customers',
        destObject: 'contacts',
        status: 'active',
        recordsSynced: 5,
        lastSyncedAt: '2026-09-26T10:00:00Z',
      },
    ];

    renderWithRouter(
      <ActiveProjectPipelineCard
        project={mockProject}
        connections={connections}
        jobs={jobs}
      />,
    );

    expect(screen.getByText('Sync run completed')).toBeInTheDocument();
  });

  it('uses test and review wording only for a Sandbox project', () => {
    renderWithRouter(
      <ActiveProjectPipelineCard
        project={{ ...mockProject, active_environment: 'sandbox' }}
        connections={[]}
        jobs={[]}
      />,
    );

    expect(screen.getByText('Test & Review')).toBeInTheDocument();
    expect(screen.getByText(/limited runs write to sandbox only/i)).toBeInTheDocument();
    expect(screen.queryByText(/limited runs write to production/i)).not.toBeInTheDocument();
  });
});
