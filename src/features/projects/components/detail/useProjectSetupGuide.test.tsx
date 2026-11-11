import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProjectDetailContext } from './context';
import { useProjectSetupGuide } from './useProjectSetupGuide';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('./context', () => ({ useProjectDetailContext: vi.fn() }));

const handleTabChange = vi.fn();
const onCreateSyncRule = vi.fn();

function withContext(overrides: Record<string, unknown>) {
  vi.mocked(useProjectDetailContext).mockReturnValue({
    projectId: 'proj-1',
    jobs: [],
    logs: [],
    hasBothConnections: false,
    hasJobs: false,
    handleTabChange,
    onCreateSyncRule,
    ...overrides,
  } as never);
}

function statuses(guide: ReturnType<typeof useProjectSetupGuide>) {
  return guide?.steps.map((step) => step.status);
}

describe('useProjectSetupGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('starts at connecting platforms and goes to the Connections tab', () => {
    withContext({});
    const { result } = renderHook(() => useProjectSetupGuide());

    expect(statuses(result.current)).toEqual([
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(result.current?.next.actionLabel).toBe('Open Connections');
    result.current?.next.onGo();
    expect(handleTabChange).toHaveBeenCalledWith('connections');
  });

  it('asks for the first sync flow once both platforms are connected', () => {
    withContext({ hasBothConnections: true });
    const { result } = renderHook(() => useProjectSetupGuide());

    expect(statuses(result.current)).toEqual([
      'complete',
      'current',
      'upcoming',
    ]);
    expect(result.current?.next.actionLabel).toBe('Create sync flow');
    result.current?.next.onGo();
    expect(onCreateSyncRule).toHaveBeenCalled();
  });

  it('opens the only flow when it needs configuring and testing', () => {
    withContext({
      hasBothConnections: true,
      hasJobs: true,
      jobs: [{ id: 'job-1', name: 'Customers', fieldMappings: [] }],
    });
    const { result } = renderHook(() => useProjectSetupGuide());

    expect(statuses(result.current)).toEqual([
      'complete',
      'complete',
      'current',
    ]);
    expect(result.current?.next.actionLabel).toBe('Open sync flow');
    expect(result.current?.next.guidesFlowAction).toBe(true);
    result.current?.next.onGo();
    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1/jobs/job-1');
  });

  it('points to the Sync Flows tab when there are several flows', () => {
    withContext({
      hasBothConnections: true,
      hasJobs: true,
      jobs: [
        { id: 'job-1', name: 'A' },
        { id: 'job-2', name: 'B' },
      ],
    });
    const { result } = renderHook(() => useProjectSetupGuide());

    expect(result.current?.next.actionLabel).toBe('View sync flows');
    result.current?.next.onGo();
    expect(handleTabChange).toHaveBeenCalledWith('sync-rules');
  });

  it('is gone once a sync has succeeded', () => {
    withContext({
      hasBothConnections: true,
      hasJobs: true,
      jobs: [{ id: 'job-1', name: 'A' }],
      logs: [{ jobId: 'job-1', metadata: { status: 'success' } }],
    });
    const { result } = renderHook(() => useProjectSetupGuide());

    expect(result.current).toBeNull();
  });

  it('offers to resume or discard a saved draft', () => {
    sessionStorage.setItem(
      'sb_draft_proj-1',
      JSON.stringify({
        jobId: null,
        step: 2,
        config: { name: 'Customers draft' },
      }),
    );
    withContext({ hasBothConnections: true });
    const { result } = renderHook(() => useProjectSetupGuide());

    expect(result.current?.next.actionLabel).toBe('Resume draft');
    expect(result.current?.next.instruction).toContain(
      '“Customers draft” was saved at step 3, Field Mapping',
    );

    act(() => result.current?.secondaryAction?.onClick());
    expect(result.current?.next.actionLabel).toBe('Create sync flow');
  });
});
