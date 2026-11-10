import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobDetailContext } from './context';
import JobOnboardingJourney from './JobOnboardingJourney';

import type { ExtJob } from '@/features/jobs/hooks';
import type { Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./context', () => ({
  useJobDetailContext: vi.fn(),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

describe('JobOnboardingJourney - Environment Awareness & Production Graduation', () => {
  const mockJob: ExtJob = {
    id: 'job-101',
    projectId: 'proj-123',
    name: 'Customer Sync',
    sourceObject: 'Customer',
    destObject: 'contact',
    status: 'active',
    lastSyncedAt: '2026-03-01T12:00:00Z',
  };

  const mockProjectSandbox = {
    id: 'proj-123',
    name: 'Test Integration',
    status: 'active' as const,
    sourcePlatformId: 'hubspot' as const,
    destPlatformId: 'salesforce' as const,
    activeEnvironment: 'sandbox' as const,
  };

  const mockProjectProduction = {
    id: 'proj-123',
    name: 'Live Integration',
    status: 'active' as const,
    sourcePlatformId: 'hubspot' as const,
    destPlatformId: 'salesforce' as const,
    activeEnvironment: 'production' as const,
  };

  it('renders "Connect your Production platforms" when test succeeds in Sandbox and Production is disconnected', () => {
    // Initial mount in 'test' stage (not complete yet)
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, lastSyncedAt: null },
      project: mockProjectSandbox,
      runLogs: [],
      jobFieldMappings: [
        {
          id: 'map-1',
          jobId: 'job-101',
          sourceField: 'email',
          destFieldKey: 'email',
          matchDestKey: true,
        } as any,
      ],
      pipelineRequired: false,
      pipelineConfigured: true,
      isProductionReady: false,
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    const { rerender } = render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Now test run completes
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: mockJob,
      project: mockProjectSandbox,
      runLogs: [{ id: 'run-1', jobId: 'job-101', status: 'completed' } as any],
      jobFieldMappings: [
        {
          id: 'map-1',
          jobId: 'job-101',
          sourceField: 'email',
          destFieldKey: 'email',
          matchDestKey: true,
        } as any,
      ],
      pipelineRequired: false,
      pipelineConfigured: true,
      isProductionReady: false,
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    rerender(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Eyebrow and headlines
    expect(screen.getByText('Sandbox test complete')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Ready to go live? Connect your Production platforms',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/verified cleanly in Sandbox without errors/i),
    ).toBeInTheDocument();

    // Primary CTA: Connect Production Platforms
    const connectBtn = screen.getByRole('button', {
      name: /^connect production platforms/i,
    });
    expect(connectBtn).toBeInTheDocument();
    fireEvent.click(connectBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-123?tab=connections&env=production',
    );

    // Secondary CTA: View Overview
    const overviewBtn = screen.getByRole('button', {
      name: /^view overview/i,
    });
    expect(overviewBtn).toBeInTheDocument();
    fireEvent.click(overviewBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-123?tab=overview',
    );
  });

  it('renders "Ready to activate live Production sync?" and "Promote to Production" button when Production is already connected', () => {
    // Initial mount in 'test' stage (not complete yet)
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, lastSyncedAt: null },
      project: mockProjectSandbox,
      runLogs: [],
      jobFieldMappings: [
        {
          id: 'map-1',
          jobId: 'job-101',
          sourceField: 'email',
          destFieldKey: 'email',
          matchDestKey: true,
        } as any,
      ],
      pipelineRequired: false,
      pipelineConfigured: true,
      isProductionReady: true,
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    const { rerender } = render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Now test run completes
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: mockJob,
      project: mockProjectSandbox,
      runLogs: [{ id: 'run-1', jobId: 'job-101', status: 'completed' } as any],
      jobFieldMappings: [
        {
          id: 'map-1',
          jobId: 'job-101',
          sourceField: 'email',
          destFieldKey: 'email',
          matchDestKey: true,
        } as any,
      ],
      pipelineRequired: false,
      pipelineConfigured: true,
      isProductionReady: true,
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    rerender(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Eyebrow and headlines
    expect(screen.getByText('Sandbox test complete')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Ready to activate live Production sync?',
      }),
    ).toBeInTheDocument();

    // Primary CTA: Promote to Production
    const promoteBtn = screen.getByRole('button', {
      name: /^promote to production/i,
    });
    expect(promoteBtn).toBeInTheDocument();
    fireEvent.click(promoteBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-123?tab=settings&section=environments',
    );
  });

  it('hides the setup section once the flow completes in Production', () => {
    const base = {
      projectId: 'proj-123',
      project: mockProjectProduction,
      jobFieldMappings: [
        {
          id: 'map-1',
          jobId: 'job-101',
          sourceField: 'email',
          destFieldKey: 'email',
          matchDestKey: true,
        } as any,
      ],
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    };
    vi.mocked(useJobDetailContext).mockReturnValue({
      ...base,
      job: { ...mockJob, lastSyncedAt: null },
      runLogs: [],
    } as any);

    const { rerender, container } = render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );
    expect(screen.getByText('Flow setup')).toBeInTheDocument();

    // The test run completes
    vi.mocked(useJobDetailContext).mockReturnValue({
      ...base,
      job: mockJob,
      runLogs: [{ id: 'run-1', jobId: 'job-101', status: 'completed' } as any],
    } as any);
    rerender(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('JobOnboardingJourney - Step Gating & Activation Flow', () => {
  const mockJob: ExtJob = {
    id: 'job-101',
    projectId: 'proj-123',
    name: 'Customer Sync',
    sourceObject: 'Customer',
    destObject: 'contact',
    status: 'idle',
    isEnabled: false,
    lastSyncedAt: null,
  };

  const mockProject = {
    id: 'proj-123',
    name: 'Test Integration',
    status: 'active' as const,
    sourcePlatformId: 'hubspot' as const,
    destPlatformId: 'salesforce' as const,
    activeEnvironment: 'sandbox' as const,
  };

  const mappingWithMatch = [
    {
      id: 'map-1',
      jobId: 'job-101',
      sourceField: 'email',
      destFieldKey: 'email',
      matchDestKey: true,
    } as any,
  ];

  const contextWith = (overrides: Record<string, unknown>) =>
    ({
      projectId: 'proj-123',
      job: mockJob,
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
      ...overrides,
    }) as any;

  const renderJourney = () =>
    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

  it('renders nothing outside the Overview tab', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      contextWith({ activeTab: 'field-mapping' }),
    );
    const { container } = renderJourney();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows only the Field Mapping step until fields are mapped', () => {
    const handleTabChange = vi.fn();
    vi.mocked(useJobDetailContext).mockReturnValue(
      contextWith({ jobFieldMappings: [], handleTabChange }),
    );
    renderJourney();

    expect(
      screen.getByRole('heading', { name: 'Set up your flow' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Next: Map source and destination fields/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Test & Review')).not.toBeInTheDocument();
    expect(screen.queryByText('Automate (optional)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /field mapping/i }));
    expect(handleTabChange).toHaveBeenCalledWith('field-mapping');
  });

  it('shows only the Configure Pipeline step when a pipeline is still required', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      contextWith({ pipelineRequired: true, pipelineConfigured: false }),
    );
    renderJourney();

    expect(screen.getByText('Configure Pipeline')).toBeInTheDocument();
    expect(screen.queryByText('Field Mapping')).not.toBeInTheDocument();
    expect(screen.queryByText('Test & Review')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Next: Choose the destination pipeline/),
    ).toBeInTheDocument();
  });

  it('omits the pipeline step entirely when no pipeline is required', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(contextWith({}));
    renderJourney();

    expect(screen.queryByText('Configure Pipeline')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /1\. Field Mapping[\s\S]*2\. Test & Review[\s\S]*3\. Automate/,
      ),
    ).toBeInTheDocument();
  });

  it("opens the Run Sync tab from an inactive flow's test step", () => {
    const handleTabChange = vi.fn();
    vi.mocked(useJobDetailContext).mockReturnValue(
      contextWith({ handleTabChange }),
    );
    renderJourney();

    expect(screen.getByText('Flow setup')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Set up your flow' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Next: Field mapping is configured\. Run a test sync in Sandbox/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Field Mapping')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '1 of 2 steps complete' }),
    ).toBeInTheDocument();

    const testStep = screen.getByRole('button', { name: /test & review/i });
    expect(testStep).toHaveAttribute(
      'data-step-hint',
      'Open Run Sync to test records',
    );
    expect(testStep).toHaveAttribute('data-step-guides-action', 'true');

    const syncButton = document.createElement('button');
    syncButton.id = 'sync-now-button';
    syncButton.scrollIntoView = vi.fn();
    document.body.appendChild(syncButton);

    fireEvent.click(testStep);
    expect(handleTabChange).toHaveBeenCalledWith('run-sync');
    expect(syncButton.scrollIntoView).not.toHaveBeenCalled();

    // Sync now unavailable (e.g. a run is queued): point at it instead.
    handleTabChange.mockClear();
    syncButton.disabled = true;
    fireEvent.click(testStep);
    expect(handleTabChange).not.toHaveBeenCalled();
    expect(syncButton.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
    expect(syncButton).toHaveAttribute('data-attention-flash', 'true');
    syncButton.remove();
  });

  it('tells an active flow to run its limited sync', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      contextWith({ job: { ...mockJob, isEnabled: true } }),
    );
    renderJourney();

    expect(
      screen.getByText(
        /Next: The flow is active\. Run a limited sync in Sandbox/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /test & review/i }),
    ).toBeInTheDocument();
  });
});
