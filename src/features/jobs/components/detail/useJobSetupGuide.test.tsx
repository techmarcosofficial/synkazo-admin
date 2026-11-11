import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobDetailContext } from './context';
import { useJobSetupGuide } from './useJobSetupGuide';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('./context', () => ({ useJobDetailContext: vi.fn() }));

const handleTabChange = vi.fn();
const mapped = [
  { id: 'm1', sourceField: 'email', destFieldKey: 'email', matchDestKey: true },
];
const sandbox = {
  id: 'proj-1',
  status: 'active',
  activeEnvironment: 'sandbox',
};
const production = {
  id: 'proj-1',
  status: 'active',
  activeEnvironment: 'production',
};

function context(overrides: Record<string, unknown> = {}) {
  return {
    projectId: 'proj-1',
    job: { id: 'job-1', name: 'Customers', lastSyncedAt: null },
    project: production,
    runLogs: [],
    jobFieldMappings: [],
    pipelineRequired: false,
    pipelineConfigured: true,
    isProductionReady: false,
    handleTabChange,
    ...overrides,
  } as never;
}

const titles = (guide: ReturnType<typeof useJobSetupGuide>) =>
  guide?.steps.map((step) => `${step.title}:${step.status}`);

describe('useJobSetupGuide', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts at field mapping', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(context());
    const { result } = renderHook(() => useJobSetupGuide());

    expect(titles(result.current)).toEqual([
      'Map fields:current',
      'Run & review:upcoming',
      'Automate:upcoming',
    ]);
    result.current?.next.onGo();
    expect(handleTabChange).toHaveBeenCalledWith('field-mapping');
  });

  it('adds the pipeline step when the destination needs one', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      context({
        jobFieldMappings: mapped,
        pipelineRequired: true,
        pipelineConfigured: false,
      }),
    );
    const { result } = renderHook(() => useJobSetupGuide());

    expect(titles(result.current)?.slice(0, 2)).toEqual([
      'Map fields:complete',
      'Choose pipeline:current',
    ]);
    result.current?.next.onGo();
    expect(handleTabChange).toHaveBeenCalledWith('pipeline');
  });

  it('sends a mapped flow to Run Sync for its test', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      context({ jobFieldMappings: mapped, project: sandbox }),
    );
    const { result } = renderHook(() => useJobSetupGuide());

    expect(result.current?.next.actionLabel).toBe('Run test sync');
    result.current?.next.onGo();
    expect(handleTabChange).toHaveBeenCalledWith('run-sync');
  });

  it('is hidden for a flow that was already set up when the page opened', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      context({
        jobFieldMappings: mapped,
        project: sandbox,
        job: { id: 'job-1', name: 'Customers', lastSyncedAt: '2026-01-01' },
        runLogs: [{ id: 'r1', status: 'completed' }],
      }),
    );
    const { result } = renderHook(() => useJobSetupGuide());

    expect(result.current).toBeNull();
  });

  it.each([
    [
      false,
      'Connect Production',
      '/projects/proj-1?tab=connections&env=production',
    ],
    [
      true,
      'Open Environment settings',
      '/projects/proj-1?tab=settings&section=environments',
    ],
  ])(
    'offers Go live after a Sandbox test passes (production ready: %s)',
    (isProductionReady, actionLabel, path) => {
      vi.mocked(useJobDetailContext).mockReturnValue(
        context({
          jobFieldMappings: mapped,
          project: sandbox,
          isProductionReady,
        }),
      );
      const { result, rerender } = renderHook(() => useJobSetupGuide());

      vi.mocked(useJobDetailContext).mockReturnValue(
        context({
          jobFieldMappings: mapped,
          project: sandbox,
          isProductionReady,
          job: { id: 'job-1', name: 'Customers', lastSyncedAt: '2026-01-01' },
          runLogs: [{ id: 'r1', status: 'completed' }],
        }),
      );
      rerender();

      expect(titles(result.current)?.slice(-1)[0]).toBe('Go live:current');
      expect(result.current?.next.actionLabel).toBe(actionLabel);
      result.current?.next.onGo();
      expect(mockNavigate).toHaveBeenCalledWith(path);
    },
  );

  it('is hidden in Production once the test passes', () => {
    vi.mocked(useJobDetailContext).mockReturnValue(
      context({ jobFieldMappings: mapped }),
    );
    const { result, rerender } = renderHook(() => useJobSetupGuide());

    vi.mocked(useJobDetailContext).mockReturnValue(
      context({
        jobFieldMappings: mapped,
        job: { id: 'job-1', name: 'Customers', lastSyncedAt: '2026-01-01' },
        runLogs: [{ id: 'r1', status: 'completed' }],
      }),
    );
    rerender();

    expect(result.current).toBeNull();
  });
});
