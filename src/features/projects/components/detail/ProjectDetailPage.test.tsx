import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectDetailPage from './ProjectDetailPage';

import { projectsApi } from '@/api/projects';
import {
  useProjectDetailCacheHelpers,
  useProjectDetailQuery,
  useProjectDetailTabs,
  useProjectEnvironmentActivation,
  useProjectDetailLiveSync,
} from '@/features/projects/hooks';
import { hasBothConnections as computeHasBothConnections } from '@/features/projects/lib/projectConnections';

vi.mock('@/api/projects', () => ({
  projectsApi: {
    updateProject: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/features/projects/hooks', () => ({
  useProjectDetailQuery: vi.fn(),
  useProjectDetailCacheHelpers: vi.fn(),
  useProjectDetailTabs: vi.fn(),
  useProjectEnvironmentActivation: vi.fn(),
  useProjectDetailLiveSync: vi.fn(),
}));

vi.mock('@/features/projects/lib/projectConnections', () => ({
  hasBothConnections: vi.fn(),
}));

vi.mock('@/components/shared/AccountContextAlert', () => ({
  default: () => null,
}));

// Mock sub-components to keep test focused on status management logic
vi.mock('./ProjectHeader', () => ({
  default: () => <div data-testid="project-header" />,
}));
vi.mock('./ProjectTabs', () => ({
  default: () => <div data-testid="project-tabs" />,
}));
vi.mock('./ProjectTabContent', () => ({
  default: () => <div data-testid="project-tab-content" />,
}));
vi.mock('./ProjectOnboardingJourney', () => ({
  default: () => <div data-testid="project-onboarding-journey" />,
}));

describe('ProjectDetailPage - Self-Healing Status Management', () => {
  const mockPatchProject = vi.fn();
  const mockSetConnections = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProjectDetailCacheHelpers).mockReturnValue({
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    });

    vi.mocked(useProjectDetailTabs).mockReturnValue({
      activeTab: 'overview',
      tabs: [],
      handleTabChange: vi.fn(),
    });

    vi.mocked(useProjectEnvironmentActivation).mockReturnValue({
      projectActiveEnv: 'production',
      envActivating: false,
      activationError: null,
      clearActivationError: vi.fn(),
      envFullyConnected: vi.fn().mockReturnValue(false),
      envHasAnyConnected: vi.fn().mockReturnValue(false),
      handleActivateEnv: vi.fn(),
      doActivate: vi.fn(),
      connReloadKey: 0,
    });
  });

  afterEach(cleanup);

  const renderPage = (projectId = 'proj-123') => {
    return render(
      <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('promotes project from draft to active when both platforms are verified', async () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      loading: false,
      data: {
        project: { id: 'proj-123', status: 'draft' } as any,
        jobs: [],
        connections: [],
        logs: [],
      },
      error: null,
      refetch: vi.fn(),
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    } as any);

    vi.mocked(computeHasBothConnections).mockReturnValue(true);

    renderPage();

    await waitFor(() => {
      expect(projectsApi.updateProject).toHaveBeenCalledWith('proj-123', {
        status: 'active',
      });
      expect(mockPatchProject).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  it('restores project from error to active when broken connections are fixed', async () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      loading: false,
      data: {
        project: { id: 'proj-123', status: 'error' } as any,
        jobs: [],
        connections: [],
        logs: [],
      },
      error: null,
      refetch: vi.fn(),
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    } as any);

    vi.mocked(computeHasBothConnections).mockReturnValue(true);

    renderPage();

    await waitFor(() => {
      expect(projectsApi.updateProject).toHaveBeenCalledWith('proj-123', {
        status: 'active',
      });
      expect(mockPatchProject).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  it('demotes an active project to error when connections break or are disconnected', async () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      loading: false,
      data: {
        project: { id: 'proj-123', status: 'active' } as any,
        jobs: [],
        connections: [],
        logs: [],
      },
      error: null,
      refetch: vi.fn(),
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    } as any);

    vi.mocked(computeHasBothConnections).mockReturnValue(false);

    renderPage();

    await waitFor(() => {
      expect(projectsApi.updateProject).toHaveBeenCalledWith('proj-123', {
        status: 'error',
      });
      expect(mockPatchProject).toHaveBeenCalledWith({ status: 'error' });
    });
  });

  it('leaves a draft project in draft when connections are incomplete (does not flip to error)', async () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      loading: false,
      data: {
        project: { id: 'proj-123', status: 'draft' } as any,
        jobs: [],
        connections: [],
        logs: [],
      },
      error: null,
      refetch: vi.fn(),
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    } as any);

    vi.mocked(computeHasBothConnections).mockReturnValue(false);

    renderPage();

    // Give effect a tick to run
    await new Promise((r) => setTimeout(r, 50));

    expect(projectsApi.updateProject).not.toHaveBeenCalled();
    expect(mockPatchProject).not.toHaveBeenCalled();
  });

  it('leaves a paused project as paused regardless of connection health', async () => {
    vi.mocked(useProjectDetailQuery).mockReturnValue({
      loading: false,
      data: {
        project: { id: 'proj-123', status: 'paused' } as any,
        jobs: [],
        connections: [],
        logs: [],
      },
      error: null,
      refetch: vi.fn(),
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    } as any);

    vi.mocked(computeHasBothConnections).mockReturnValue(false);

    renderPage();

    await new Promise((r) => setTimeout(r, 50));

    expect(projectsApi.updateProject).not.toHaveBeenCalled();
    expect(mockPatchProject).not.toHaveBeenCalled();
  });

  it('restores project from error to draft when prior state was draft', async () => {
    sessionStorage.setItem('synkazo:proj-prev-status:proj-123', 'draft');

    vi.mocked(useProjectDetailQuery).mockReturnValue({
      loading: false,
      data: {
        project: { id: 'proj-123', status: 'error' } as any,
        jobs: [],
        connections: [],
        logs: [],
      },
      error: null,
      refetch: vi.fn(),
      patchProject: mockPatchProject,
      setConnections: mockSetConnections,
    } as any);

    vi.mocked(computeHasBothConnections).mockReturnValue(true);

    renderPage();

    await waitFor(() => {
      expect(projectsApi.updateProject).toHaveBeenCalledWith('proj-123', {
        status: 'draft',
      });
      expect(mockPatchProject).toHaveBeenCalledWith({ status: 'draft' });
    });
  });
});

