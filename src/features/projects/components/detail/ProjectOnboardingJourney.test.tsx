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

  it('shows only the current step (create first sync flow) with the progress ring on Overview', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [],
      hasBothConnections: true,
      hasJobs: false,
      activeTab: 'overview',
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
        name: 'Set up your project',
      }),
    ).toBeInTheDocument();
    // The info tooltip carries the full how-to plus the stage's next step.
    expect(
      screen.getByText(
        /Finish these 3 steps to start syncing[\s\S]*Next: Both platforms are connected and verified/,
      ),
    ).toBeInTheDocument();

    // Only the unfinished step is shown: no finished or later steps, no step numbers
    expect(screen.queryByText('Connect Platforms')).not.toBeInTheDocument();
    expect(screen.queryByText('Configure & Test')).not.toBeInTheDocument();
    const step2Btn = screen.getByRole('button', {
      name: /create first sync flow/i,
    });
    expect(step2Btn).toHaveAttribute(
      'data-step-hint',
      'Create your first sync flow',
    );
    expect(step2Btn).not.toHaveTextContent('2');
    expect(screen.getByText('Action needed')).toBeInTheDocument();

    // Progress ring still counts every step
    expect(
      screen.getByRole('img', { name: '1 of 3 steps complete' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1/3 complete')).toBeInTheDocument();

    // Clicking the step opens the create flow
    fireEvent.click(step2Btn);
    expect(mockOnCreateSyncRule).toHaveBeenCalledOnce();
  });

  it('renders nothing outside the Overview tab', () => {
    for (const activeTab of ['connections', 'sync-rules', 'settings']) {
      vi.mocked(useProjectDetailContext).mockReturnValue({
        projectId: 'proj-1',
        jobs: [],
        hasBothConnections: false,
        hasJobs: false,
        activeTab,
        handleTabChange: mockHandleTabChange,
        onCreateSyncRule: mockOnCreateSyncRule,
      } as any);

      const { container, unmount } = render(
        <MemoryRouter>
          <ProjectOnboardingJourney />
        </MemoryRouter>,
      );
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
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
      activeTab: 'overview',
      handleTabChange: mockHandleTabChange,
      onCreateSyncRule: mockOnCreateSyncRule,
    } as any);

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Set up your project' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Next: Your unfinished sync flow/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Customer to Contact Sync/i)).toBeInTheDocument();

    const step2Btn = screen.getByRole('button', {
      name: /create first sync flow/i,
    });
    expect(step2Btn).toBeInTheDocument();
    fireEvent.click(step2Btn);
    expect(mockOnCreateSyncRule).toHaveBeenCalledOnce();

    // Discard action
    const discardBtn = screen.getByRole('button', { name: /discard/i });
    expect(discardBtn).toBeInTheDocument();
    fireEvent.click(discardBtn);

    // After discard, the next step reverts to creating a sync flow
    expect(
      screen.getByText(/Next: Both platforms are connected and verified/),
    ).toBeInTheDocument();
  });

  it('sends a single unmapped flow to the Sync Flows tab without claiming completion', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'draft', name: 'Draft Job' }],
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

    expect(
      screen.getByText(/Next: Your flow has been created/),
    ).toBeInTheDocument();
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    const nextStep = screen.getByRole('button', { name: /configure & test/i });
    expect(nextStep).toHaveAttribute('data-project-configure-step', 'true');
    expect(
      screen.queryByRole('button', { name: /configure field mapping/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(nextStep);
    expect(mockHandleTabChange).toHaveBeenCalledWith('sync-rules');
  });

  it('sends a single mapped flow that has not run to the Sync Flows tab', () => {
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

    expect(
      screen.queryByText('Run your first test sync'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Next: Your flow has field mappings/),
    ).toBeInTheDocument();
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continue to test sync/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /configure & test/i }));
    expect(mockHandleTabChange).toHaveBeenCalledWith('sync-rules');
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
      jobs: [
        { id: 'job-1', status: 'error', lastSyncedAt: '2026-09-26T12:00:00Z' },
      ],
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

    render(
      <MemoryRouter>
        <ProjectOnboardingJourney />
      </MemoryRouter>,
    );
    expect(screen.getByText('2/3 complete')).toBeInTheDocument();
    expect(
      screen.queryByText('Project setup complete'),
    ).not.toBeInTheDocument();
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

  it('hides the setup section as soon as a flow finishes its first run', () => {
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
    expect(screen.queryByText('Project setup')).not.toBeInTheDocument();
    expect(screen.queryByText('3/3 complete')).not.toBeInTheDocument();
    unmount();
  });

  it('shows only Connect Platforms (0/3) while a connection has an issue, even if a job exists', () => {
    vi.mocked(useProjectDetailContext).mockReturnValue({
      projectId: 'proj-1',
      jobs: [{ id: 'job-1', status: 'draft', name: 'Draft Job' }],
      hasBothConnections: false,
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

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Set up your project',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Next: Connect and verify both platforms/),
    ).toBeInTheDocument();

    // Only the first unfinished step is shown
    const step1Btn = screen.getByRole('button', { name: /connect platforms/i });
    expect(screen.getByText('Action needed')).toBeInTheDocument();
    expect(
      screen.queryByText('First Sync Flow Created'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Configure & Test')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '0 of 3 steps complete' }),
    ).toBeInTheDocument();
    expect(screen.getByText('0/3 complete')).toBeInTheDocument();

    fireEvent.click(step1Btn);
    expect(mockHandleTabChange).toHaveBeenCalledWith('connections');
  });
});
