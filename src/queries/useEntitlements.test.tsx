import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEntitlements } from './useEntitlements';

const mockState = vi.hoisted(() => ({
  role: 'org_admin',
  planData: null as unknown,
}));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    currentUser: { id: 'u-1', role: mockState.role },
    hasRole: (r: string) => mockState.role === r,
  }),
}));

vi.mock('./useBilling', () => ({
  usePlanQuery: () => ({
    data: mockState.planData,
  }),
}));

describe('useEntitlements — creation gating at limit', () => {
  it('disallows adding resources when at limit (count === limit) even though over is false', () => {
    mockState.role = 'org_admin';
    mockState.planData = {
      limits: {
        maxProjects: 1,
        maxJobs: 1,
        syncDirections: ['one_way'],
        syncFrequencies: ['daily'],
        schedulingModes: ['interval'],
        objectScope: 'core',
        fieldMappingLevel: 'basic',
        allowedTransformTypes: ['direct'],
        associationRules: false,
        customObjects: false,
        customFields: false,
        envMigration: false,
        priorityScheduling: false,
        minIntervalMinutes: 15,
        logRetentionDays: 7,
      },
      overLimit: {
        projects: { count: 1, limit: 1, over: false, canAdd: false },
        jobs: { count: 1, limit: 1, over: false, canAdd: false },
        teamMembers: { count: 1, limit: 1, over: false, canAdd: false },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: false,
      },
    };

    const { result } = renderHook(() => useEntitlements());

    expect(result.current.canAddProject).toBe(false);
    expect(result.current.canAddJob).toBe(false);
  });

  it('allows adding resources when below limit (count < limit)', () => {
    mockState.role = 'org_admin';
    mockState.planData = {
      limits: {
        maxProjects: 2,
        maxJobs: 5,
        syncDirections: ['one_way'],
        syncFrequencies: ['daily'],
        schedulingModes: ['interval'],
        objectScope: 'core',
        fieldMappingLevel: 'basic',
        allowedTransformTypes: ['direct'],
        associationRules: false,
        customObjects: false,
        customFields: false,
        envMigration: false,
        priorityScheduling: false,
        minIntervalMinutes: 15,
        logRetentionDays: 7,
      },
      overLimit: {
        projects: { count: 1, limit: 2, over: false, canAdd: true },
        jobs: { count: 1, limit: 5, over: false, canAdd: true },
        teamMembers: { count: 1, limit: 2, over: false, canAdd: true },
        records: { count: 100, limit: 1000, over: false, canAdd: true },
        isOverLimit: false,
      },
    };

    const { result } = renderHook(() => useEntitlements());

    expect(result.current.canAddProject).toBe(true);
    expect(result.current.canAddJob).toBe(true);
  });

  it('exempts super_admin from creation restrictions', () => {
    mockState.role = 'super_admin';
    mockState.planData = {
      overLimit: {
        projects: { count: 10, limit: 1, over: true, canAdd: false },
        jobs: { count: 10, limit: 1, over: true, canAdd: false },
        isOverLimit: true,
      },
    };

    const { result } = renderHook(() => useEntitlements());

    expect(result.current.canAddProject).toBe(true);
    expect(result.current.canAddJob).toBe(true);
  });
});
