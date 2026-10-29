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
      setManualDialogOpen: vi.fn(),
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
      setManualDialogOpen: vi.fn(),
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
      screen.getByText(/create and review Production jobs separately/i),
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

  it('links to Production review when Production is connected', () => {
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
      setManualDialogOpen: vi.fn(),
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
      setManualDialogOpen: vi.fn(),
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
        name: 'Review your Production workspace',
      }),
    ).toBeInTheDocument();

    // Primary CTA: review Production workspace
    const promoteBtn = screen.getByRole('button', {
      name: /^review production workspace/i,
    });
    expect(promoteBtn).toBeInTheDocument();
    fireEvent.click(promoteBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-123?tab=settings&section=environments',
    );
  });

  it('renders standard "Your sync job is ready" card when completed in Production', () => {
    // Initial mount in 'test' stage (not complete yet)
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, lastSyncedAt: null },
      project: mockProjectProduction,
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
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      setManualDialogOpen: vi.fn(),
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
      project: mockProjectProduction,
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
      activeTab: 'overview',
      handleTabChange: vi.fn(),
      setManualDialogOpen: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    rerender(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    expect(screen.getByText('Job setup complete')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Your sync job is ready',
      }),
    ).toBeInTheDocument();

    const overviewBtn = screen.getByRole('button', {
      name: /^go to project overview/i,
    });
    expect(overviewBtn).toBeInTheDocument();
    fireEvent.click(overviewBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/proj-123?tab=overview',
    );
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

  it('omits the Configure Pipeline step when pipelineRequired is false', () => {
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: mockJob,
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'field-mapping',
      handleTabChange: vi.fn(),
      setManualDialogOpen: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Verify steps: Field Mapping, Test & Review, Automate (optional)
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Test & Review')).toBeInTheDocument();
    expect(screen.getByText('Automate (optional)')).toBeInTheDocument();

    // Verify Configure / Pipeline is completely absent
    expect(screen.queryByText('Configure Pipeline')).not.toBeInTheDocument();
    expect(screen.queryByText('Configure')).not.toBeInTheDocument();
  });

  it('includes the Configure Pipeline step when pipelineRequired is true', () => {
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: mockJob,
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: true,
      pipelineConfigured: false,
      activeTab: 'field-mapping',
      handleTabChange: vi.fn(),
      setManualDialogOpen: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Configure Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Test & Review')).toBeInTheDocument();
    expect(screen.getByText('Automate (optional)')).toBeInTheDocument();
  });

  it('guides user to sync run button when on overview tab without opening the dialog directly', () => {
    const setManualDialogOpen = vi.fn();
    const handleTabChange = vi.fn();

    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, isEnabled: false },
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'overview',
      handleTabChange,
      setManualDialogOpen,
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Shows informative title encouraging first test sync
    expect(
      screen.getByRole('heading', { name: 'Run your first test sync' }),
    ).toBeInTheDocument();

    // Verify hover hint and flow guide on Test & Review step
    const testStep = screen.getByRole('button', { name: /test & review/i });
    expect(testStep).toHaveAttribute(
      'data-step-hint',
      "Click 'Sync now' below to test records",
    );
    expect(testStep).toHaveAttribute('data-step-guides-action', 'true');
    expect(testStep).not.toHaveAttribute('title');

    // Clicking step card highlights the sync button without opening the modal
    fireEvent.click(testStep);
    expect(setManualDialogOpen).not.toHaveBeenCalled();
    expect(handleTabChange).not.toHaveBeenCalled();
  });

  it('displays active state and guides to sync button without opening dialog directly when job is active on overview tab', () => {
    const setManualDialogOpen = vi.fn();
    const handleTabChange = vi.fn();

    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, isEnabled: true },
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'overview',
      handleTabChange,
      setManualDialogOpen,
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Eyebrow and heading confirm active state
    expect(screen.getByText('Job active')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Job is active — Ready for test sync',
      }),
    ).toBeInTheDocument();

    // Verify hover hint on Test & Review step when active
    const testStep = screen.getByRole('button', { name: /test & review/i });
    expect(testStep).toHaveAttribute(
      'data-step-hint',
      "Click 'Sync now' below to test records",
    );
    expect(testStep).toHaveAttribute('data-step-guides-action', 'true');
    expect(testStep).not.toHaveAttribute('title');

    // Clicking step card does not open dialog directly
    fireEvent.click(testStep);
    expect(setManualDialogOpen).not.toHaveBeenCalled();
  });

  it('guides step navigation with hover hints and one-click tab switching when on a different tab', () => {
    const handleTabChange = vi.fn();

    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, isEnabled: true },
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'field-mapping',
      handleTabChange,
      setManualDialogOpen: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    // Step 1: Field Mapping (current tab)
    const step1 = screen.getByRole('button', { name: /field mapping/i });
    expect(step1).toHaveAttribute(
      'data-step-hint',
      'Map source and destination fields, and select a match field',
    );
    expect(step1).not.toHaveAttribute('title');

    // Step 2: Test & Review (different tab -> Go to Overview tab)
    const step2 = screen.getByRole('button', { name: /test & review/i });
    expect(step2).toHaveAttribute('data-step-hint', 'Go to Overview tab');
    expect(step2).not.toHaveAttribute('title');

    // Clicking step 2 strictly switches to overview tab without dialog
    fireEvent.click(step2);
    expect(handleTabChange).toHaveBeenCalledWith('overview');

    // Step 3: Automate (schedule options live on Overview)
    const step3 = screen.getByRole('button', { name: /automate/i });
    expect(step3).toHaveAttribute('data-step-hint', 'Go to Overview tab to view schedule options');
    expect(step3).not.toHaveAttribute('title');
  });

  it('selects Overview when clicking the Automate step pill', () => {
    const handleTabChange = vi.fn();

    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, isEnabled: true },
      project: mockProject,
      runLogs: [],
      jobFieldMappings: mappingWithMatch,
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'field-mapping',
      handleTabChange,
      setManualDialogOpen: vi.fn(),
      handleToggle: vi.fn(),
      toggling: false,
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    const automateBtn = screen.getByRole('button', {
      name: /automate \(optional\)/i,
    });
    expect(automateBtn).toBeInTheDocument();

    fireEvent.click(automateBtn);

    expect(handleTabChange).toHaveBeenCalledWith('overview');
  });

  it('keeps setup steps visible on Overview before the first run', () => {
    vi.mocked(useJobDetailContext).mockReturnValue({
      projectId: 'proj-123',
      job: { ...mockJob, isEnabled: false },
      project: mockProject,
      runLogs: [],
      jobFieldMappings: [],
      pipelineRequired: false,
      pipelineConfigured: true,
      activeTab: 'overview',
    } as any);

    render(
      <MemoryRouter>
        <JobOnboardingJourney />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Map the fields for this sync job' }),
    ).toBeInTheDocument();
  });
});
