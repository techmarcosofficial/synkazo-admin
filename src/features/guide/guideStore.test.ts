import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  useGuideStore,
  useIsCreatingGuidedJob,
  useIsGuidedJob,
  useIsGuidedProject,
  useIsGuideStep,
  useIsTourJob,
  useIsTourProject,
} from './guideStore';

beforeEach(() => {
  useGuideStore.setState({
    status: 'done',
    projectId: null,
    jobId: null,
    assist: null,
    currentStep: null,
  });
});

describe('assist mode (highlight-only help, any browser)', () => {
  it('guides the assisted project and job without the tour', () => {
    act(() =>
      useGuideStore
        .getState()
        .setAssist({ projectId: 'p1', jobId: 'j1', step: 'map' }),
    );
    expect(renderHook(() => useIsGuidedProject('p1')).result.current).toBe(true);
    expect(renderHook(() => useIsGuidedJob('j1')).result.current).toBe(true);
    expect(renderHook(() => useIsGuideStep('p1', 'map')).result.current).toBe(true);
    expect(renderHook(() => useIsGuideStep('p1', 'test')).result.current).toBe(false);
    expect(renderHook(() => useIsTourProject('p1')).result.current).toBe(false);
    expect(renderHook(() => useIsTourJob('j1')).result.current).toBe(false);
    expect(renderHook(() => useIsGuidedJob('j2')).result.current).toBe(false);
  });

  it('guides the create-job dialog only while the project has no job', () => {
    act(() =>
      useGuideStore
        .getState()
        .setAssist({ projectId: 'p1', jobId: null, step: 'job' }),
    );
    expect(renderHook(() => useIsCreatingGuidedJob()).result.current).toBe(true);
    expect(renderHook(() => useIsCreatingGuidedJob('p2')).result.current).toBe(false);
    act(() =>
      useGuideStore
        .getState()
        .setAssist({ projectId: 'p1', jobId: 'j1', step: 'map' }),
    );
    expect(renderHook(() => useIsCreatingGuidedJob()).result.current).toBe(false);
  });

  it('assist on another page wins over the tour step for that project', () => {
    useGuideStore.setState({
      status: 'active',
      projectId: 'p1',
      jobId: 'j1',
      currentStep: 'test',
    });
    expect(renderHook(() => useIsTourProject('p1')).result.current).toBe(true);
    act(() =>
      useGuideStore
        .getState()
        .setAssist({ projectId: 'p2', jobId: null, step: 'connect' }),
    );
    expect(renderHook(() => useIsGuideStep('p2', 'connect')).result.current).toBe(true);
    expect(renderHook(() => useIsGuideStep('p1', 'test')).result.current).toBe(true);
  });
});
