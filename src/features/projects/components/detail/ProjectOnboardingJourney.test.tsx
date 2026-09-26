import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectOnboardingJourney from './ProjectOnboardingJourney';
import { useProjectDetailContext } from './context';

vi.mock('./context', () => ({
  useProjectDetailContext: vi.fn(),
}));

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
    expect(screen.getByRole('heading', { level: 2, name: 'Your connections are ready!' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Both platforms are connected and verified. Next, choose what data you want to sync.',
      ),
    ).toBeInTheDocument();

    // Step 1: Connect Platforms - Complete
    expect(screen.getByText('Connect Platforms')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();

    // Step 2: Create First Sync Flow - Action needed
    expect(screen.getAllByText('Create First Sync Flow').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Action needed')).toBeInTheDocument();

    // Counter
    expect(screen.getByText('1/2 complete')).toBeInTheDocument();

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

    expect(screen.getByText('Unfinished sync flow in progress')).toBeInTheDocument();
    expect(
      screen.getByText(/Customer to Contact Sync/i),
    ).toBeInTheDocument();

    const resumeBtn = screen.getByRole('button', { name: /resume setup/i });
    expect(resumeBtn).toBeInTheDocument();
    fireEvent.click(resumeBtn);
    expect(mockOnCreateSyncRule).toHaveBeenCalledOnce();

    // Discard action
    const discardBtn = screen.getByRole('button', { name: /discard/i });
    expect(discardBtn).toBeInTheDocument();
    fireEvent.click(discardBtn);

    // After discard, reverts back to "Your connections are ready!"
    expect(screen.getByRole('heading', { level: 2, name: 'Your connections are ready!' })).toBeInTheDocument();
  });

  it('does not hide the journey card when a job exists but is still in draft', () => {
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
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Complete sync flow configuration'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue setup/i }),
    ).toBeInTheDocument();
  });

  it('hides completely on mount when project is already graduated', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'active', syncEnabled: true }],
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
    expect(screen.getByText('1/2 complete')).toBeInTheDocument();

    // But the redundant primary CTA button is suppressed
    expect(
      screen.queryByRole('button', { name: /^create first sync flow$/i }),
    ).not.toBeInTheDocument();
  });

  it('marks Step 1 as Action needed and 0/2 complete when a connection has an issue, even if a job exists', () => {
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
    expect(screen.getByRole('heading', { level: 2, name: 'Connect your source and destination' })).toBeInTheDocument();
    expect(
      screen.getByText('Both connections must be verified before you can create or run a sync flow.'),
    ).toBeInTheDocument();

    // Step 1: Connect Platforms - Action needed (NOT Complete!)
    expect(screen.getByText('Connect Platforms')).toBeInTheDocument();
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();

    // Step 2: Configure Sync Flow - upcoming
    expect(screen.getByText('Configure Sync Flow')).toBeInTheDocument();

    // Counter: 0/2 complete
    expect(screen.getByText('0/2 complete')).toBeInTheDocument();

    // On connections tab, redundant primary CTA button is suppressed so user focuses on the platform cards
    expect(
      screen.queryByRole('button', { name: /^connect platforms$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /activate flow/i }),
    ).not.toBeInTheDocument();
  });
});
