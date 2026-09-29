import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectOnboardingJourney from './ProjectOnboardingJourney';
import { useProjectDetailContext } from './context';

vi.mock('./context', () => ({
  useProjectDetailContext: vi.fn(),
}));

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

describe('ProjectOnboardingJourney', () => {
  const mockHandleTabChange = vi.fn();
  const mockOnCreateSyncRule = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(cleanup);

  it('renders unified card when both platforms are connected and ready for first sync flow', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [],
      hasBothConnections: true,
      hasJobs: false,
      activeTab: 'connections',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );

    // Eyebrow and headlines
    expect(screen.getByText('Project setup')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Your connections are ready!',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Both platforms are connected and verified. Next, choose what data you want to sync.',
      ),
    ).toBeInTheDocument();

    // Step 1: Connect Platforms - Complete
    expect(screen.getByText('Connect Platforms')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();

    // Step 2: Create First Sync Flow - Action needed
    expect(
      screen.getAllByText('Create First Sync Flow').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Action needed')).toBeInTheDocument();

    // Counter
    expect(screen.getByText('Configure & Test')).toBeInTheDocument();
    expect(screen.getByText('1/3 complete')).toBeInTheDocument();

    // Primary CTA: Create First Sync Flow -> directly triggers onCreateSyncRule
    const primaryButton = screen.getByRole('button', {
      name: /^create first sync flow$/i,
    });
    expect(primaryButton).toBeInTheDocument();
    fireEvent.click(primaryButton);
    expect(mockOnCreateSyncRule).toHaveBeenCalledOnce();
  });

  it('displays draft resumption seamlessly within the unified card without competing banners', () => {
    sessionStorage.setItem(
      'sb_draft_proj-1',
      JSON.stringify({
        jobId: null,
        step: 2,
        config: { name: 'Customer to Contact Sync' },
      }),
    );

    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [],
      hasBothConnections: true,
      hasJobs: false,
      activeTab: 'connections',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Unfinished sync flow in progress'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Customer to Contact Sync/i)).toBeInTheDocument();

    const resumeBtn = screen.getByRole('button', { name: /resume setup/i });
    expect(resumeBtn).toBeInTheDocument();
    fireEvent.click(resumeBtn);
    expect(mockOnCreateSyncRule).toHaveBeenCalledOnce();

    // Discard action
    const discardBtn = screen.getByRole('button', { name: /discard/i });
    expect(discardBtn).toBeInTheDocument();
    fireEvent.click(discardBtn);

    // After discard, reverts back to "Your connections are ready!"
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Your connections are ready!',
      }),
    ).toBeInTheDocument();
  });

  it('guides a single unmapped flow to field mapping without claiming completion', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'draft', name: 'Draft Job' }],
      hasBothConnections: true,
      hasJobs: true,
      activeTab: 'connections',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
        <LocationDisplay />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Configure and test a sync flow'),
    ).toBeInTheDocument();
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    const nextStep = screen.getByRole('button', { name: /configure & test/i });
    expect(nextStep).toHaveAttribute('data-project-configure-step', 'true');
    expect(
      screen.queryByRole('button', { name: /configure field mapping/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(nextStep);
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/projects/proj-1/jobs/job-1?tab=field-mapping',
    );
  });

  it('opens the detail page for a single mapped flow that has not run', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [
        {
          id: 'job-1',
          status: 'active',
          syncEnabled: true,
          fieldMappings: [
            { sourceField: 'email', destField: 'email', isMatchField: true },
          ],
        },
      ],
      hasBothConnections: true,
      hasJobs: true,
      activeTab: 'overview',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
        <LocationDisplay />
      </MemoryRouter>,
    );

    expect(screen.getByText('Run your first test sync')).toBeInTheDocument();
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue to test sync/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /configure & test/i }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/projects/proj-1/jobs/job-1',
    );
  });

  it('guides multiple unfinished flows through the list', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [
        { id: 'job-1', status: 'draft', name: 'First' },
        { id: 'job-2', status: 'draft', name: 'Second' },
      ],
      hasBothConnections: true,
      hasJobs: true,
      activeTab: 'overview',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /review sync flows/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /configure & test/i }));
    expect(mockHandleTabChange).toHaveBeenCalledWith('sync-rules');
  });

  it('does not graduate from a partial run or a successful run on a removed flow', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'error', lastSyncedAt: '2026-09-26T12:00:00Z' }],
      logs: [
        { id: 'log-1', jobId: 'job-1', metadata: { status: 'partial' } },
        { id: 'log-2', jobId: 'removed-job', metadata: { status: 'success' } },
      ],
      hasBothConnections: true,
      hasJobs: true,
      activeTab: 'overview',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(<MemoryRouter><ProjectOnboardingJourney /></MemoryRouter>);
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    expect(screen.queryByText('Project setup complete')).not.toBeInTheDocument();
  });

  it('hides on mount when any flow has already completed a run', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [
        { id: 'job-1', status: 'draft' },
        { id: 'job-2', status: 'active', lastSyncedAt: '2026-09-26T12:00:00Z' },
      ],
      hasBothConnections: true,
      hasJobs: true,
      activeTab: 'overview',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    const { container } = render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the completion milestone when a flow finishes, then hides it on a later visit', () => {
    const context = {
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'idle', lastSyncedAt: null }],
      hasBothConnections: true,
      hasJobs: true,
      activeTab: 'overview',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any;
    vi.mocked(useProjectDetailContext).mockReturnValue(context);

    const { rerender, unmount } = render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();

    vi.mocked(useProjectDetailContext).mockReturnValue({
      ...context,
      jobs: [{ ...context.jobs[0], lastSyncedAt: '2026-09-26T12:00:00Z' }],
    });
    rerender(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );
    expect(screen.getByText('Project setup complete')).toBeInTheDocument();
    expect(screen.getByText('3/3 complete')).toBeInTheDocument();

    unmount();
    const { container } = render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('suppresses the action button in the onboarding card when already on the sync-rules tab where native create buttons exist', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [],
      hasBothConnections: true,
      hasJobs: false,
      activeTab: 'sync-rules',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );

    // Steps and counter are still visible
    expect(screen.getByText('Your connections are ready!')).toBeInTheDocument();
    expect(screen.getByText('1/3 complete')).toBeInTheDocument();

    // But the redundant primary CTA button is suppressed
    expect(
      screen.queryByRole('button', { name: /^create first sync flow$/i }),
    ).not.toBeInTheDocument();
  });

  it('marks Step 1 as Action needed and 0/3 complete when a connection has an issue, even if a job exists', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'draft', name: 'Draft Job' }],
      hasBothConnections: false,
      hasJobs: true,
      activeTab: 'connections',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );

    // Card should tell the user to connect platforms
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Connect your source and destination',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Both connections must be verified before you can create or run a sync flow.',
      ),
    ).toBeInTheDocument();

    // Step 1: Connect Platforms - Action needed (NOT Complete!)
    expect(screen.getByText('Connect Platforms')).toBeInTheDocument();
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();

    // Step 2: First Sync Flow Created - upcoming
    expect(screen.getByText('First Sync Flow Created')).toBeInTheDocument();

    // Counter: 0/3 complete
    expect(screen.getByText('0/3 complete')).toBeInTheDocument();

    // On connections tab, redundant primary CTA button is suppressed so user focuses on the platform cards
    expect(
      screen.queryByRole('button', { name: /^connect platforms$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /activate flow/i }),
    ).not.toBeInTheDocument();
  });
});
