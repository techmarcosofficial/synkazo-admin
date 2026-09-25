import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeJourneyProgressSteps,
  hasBothConnections,
  isOrganizationGraduated,
  resolveActiveDraft,
  resolveNextAction,
} from './journeySelectors';
import type { Connection, Job, Project, SyncRun } from '@/types';

const mockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Sync Project',
  organisationId: 'org1',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  status: 'active',
  ...overrides,
});

describe('journeySelectors', () => {
  describe('hasBothConnections', () => {
    it('returns false for empty connections', () => {
      expect(hasBothConnections([])).toBe(false);
    });

    it('returns false when only source is connected', () => {
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
      ];
      expect(hasBothConnections(conns)).toBe(false);
    });

    it('returns false when source and destination are in different environments', () => {
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'sandbox',
        },
      ];
      expect(hasBothConnections(conns)).toBe(false);
    });

    it('returns true when both source and destination are connected in production', () => {
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'production',
        },
      ];
      expect(hasBothConnections(conns)).toBe(true);
    });
  });

  describe('isOrganizationGraduated', () => {
    it('returns false when there are no jobs', () => {
      expect(isOrganizationGraduated([], [])).toBe(false);
    });

    it('returns false when jobs exist but none have synced and no runs succeeded', () => {
      const jobs: Job[] = [
        {
          id: 'j1',
          projectId: 'p1',
          name: 'Job 1',
          sourceObject: 'Customer',
          destObject: 'Contact',
          status: 'active',
          lastSyncedAt: null,
        },
      ];
      const runs: SyncRun[] = [
        {
          id: 'r1',
          jobId: 'j1',
          status: 'error',
        },
      ];
      expect(isOrganizationGraduated(jobs, runs)).toBe(false);
    });

    it('returns true when a job has a lastSyncedAt timestamp', () => {
      const jobs: Job[] = [
        {
          id: 'j1',
          projectId: 'p1',
          name: 'Job 1',
          sourceObject: 'Customer',
          destObject: 'Contact',
          status: 'active',
          lastSyncedAt: '2026-09-25T10:00:00Z',
        },
      ];
      expect(isOrganizationGraduated(jobs, [])).toBe(true);
    });

    it('returns true when at least one full production run is marked completed or success', () => {
      const jobs: Job[] = [
        {
          id: 'j1',
          projectId: 'p1',
          name: 'Job 1',
          sourceObject: 'Customer',
          destObject: 'Contact',
          status: 'active',
          lastSyncedAt: null,
        },
      ];
      const runs: SyncRun[] = [
        {
          id: 'r1',
          jobId: 'j1',
          status: 'completed',
        },
      ];
      expect(isOrganizationGraduated(jobs, runs)).toBe(true);
    });

    it('returns false when the only successful run was a sample test run (triggeredBy limit_sync)', () => {
      const jobs: Job[] = [
        {
          id: 'j1',
          projectId: 'p1',
          name: 'Job 1',
          sourceObject: 'Customer',
          destObject: 'Contact',
          status: 'active',
          lastSyncedAt: null,
        },
      ];
      const runs: SyncRun[] = [
        {
          id: 'r1',
          jobId: 'j1',
          status: 'completed',
          triggeredBy: 'limit_sync',
        },
      ];
      expect(isOrganizationGraduated(jobs, runs)).toBe(false);
    });

    it('returns false when the run had a recordLimit applied (sample testing)', () => {
      const jobs: Job[] = [
        {
          id: 'j1',
          projectId: 'p1',
          name: 'Job 1',
          sourceObject: 'Customer',
          destObject: 'Contact',
          status: 'active',
          lastSyncedAt: null,
        },
      ];
      const runs: SyncRun[] = [
        {
          id: 'r1',
          jobId: 'j1',
          status: 'success',
          recordLimit: 5,
        },
      ];
      expect(isOrganizationGraduated(jobs, runs)).toBe(false);
    });

    it('returns true when a full production run finishes with success', () => {
      const jobs: Job[] = [
        {
          id: 'j1',
          projectId: 'p1',
          name: 'Job 1',
          sourceObject: 'Customer',
          destObject: 'Contact',
          status: 'active',
          lastSyncedAt: null,
        },
      ];
      const runs: SyncRun[] = [
        {
          id: 'r1',
          jobId: 'j1',
          status: 'success',
          recordLimit: null,
          triggeredBy: 'manual',
        },
      ];
      expect(isOrganizationGraduated(jobs, runs)).toBe(true);
    });
  });

  describe('resolveActiveDraft', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it('returns null when no drafts exist in sessionStorage', () => {
      expect(resolveActiveDraft([mockProject()])).toBeNull();
    });

    it('resolves active draft from sessionStorage with step and returnUrl', () => {
      sessionStorage.setItem(
        'sb_draft_p1',
        JSON.stringify({
          jobId: 'draft-1',
          step: 2,
          config: {
            name: 'Customer Sync',
            sourceObject: 'Customer',
            destObject: 'Contact',
          },
        }),
      );

      const resolution = resolveActiveDraft([
        mockProject({ id: 'p1', name: 'Acme Operations' }),
      ]);
      expect(resolution).not.toBeNull();
      expect(resolution?.projectId).toBe('p1');
      expect(resolution?.projectName).toBe('Acme Operations');
      expect(resolution?.stepNumber).toBe(3);
      expect(resolution?.stepLabel).toBe('Step 3: Field Mapping');
      expect(resolution?.returnUrl).toBe(
        '/projects/p1?tab=sync-rules&create=true',
      );
      expect(resolution?.isBlocked).toBe(false);
    });

    it('marks active draft as blocked when user is editor', () => {
      sessionStorage.setItem(
        'sb_draft_p1',
        JSON.stringify({
          jobId: 'draft-1',
          step: 1,
          config: { name: 'Lead Sync' },
        }),
      );

      const resolution = resolveActiveDraft(
        [mockProject({ id: 'p1' })],
        undefined,
        'editor',
      );
      expect(resolution).not.toBeNull();
      expect(resolution?.isBlocked).toBe(true);
      expect(resolution?.blockerReason).toMatch(/Only Organization Admins/);
    });

    it('prioritizes targetProjectId when multiple drafts exist', () => {
      sessionStorage.setItem(
        'sb_draft_p1',
        JSON.stringify({ jobId: 'draft-1', step: 0 }),
      );
      sessionStorage.setItem(
        'sb_draft_p2',
        JSON.stringify({ jobId: 'draft-2', step: 1 }),
      );

      const resolution = resolveActiveDraft(
        [mockProject({ id: 'p1' }), mockProject({ id: 'p2' })],
        'p2',
      );
      expect(resolution?.projectId).toBe('p2');
    });
  });

  describe('resolveNextAction', () => {
    it('resolves S01_NEW_USER_UNVERIFIED when email is unverified', () => {
      const action = resolveNextAction({
        isEmailVerified: false,
        projects: [],
        connections: [],
        jobs: [],
        runs: [],
      });
      expect(action.state).toBe('S01_NEW_USER_UNVERIFIED');
      expect(action.actionUrl).toBe('/verify-email');
    });

    it('resolves S02_NO_ORGANISATION when user has no organization', () => {
      const action = resolveNextAction({
        isEmailVerified: true,
        hasOrganisation: false,
        projects: [],
        connections: [],
        jobs: [],
        runs: [],
      });
      expect(action.state).toBe('S02_NO_ORGANISATION');
      expect(action.actionUrl).toBe('/setup-organisation');
    });

    it('resolves S03_NO_PROJECT when 0 projects exist', () => {
      const action = resolveNextAction({
        isEmailVerified: true,
        hasOrganisation: true,
        projects: [],
        connections: [],
        jobs: [],
        runs: [],
        userRole: 'org_admin',
      });
      expect(action.state).toBe('S03_NO_PROJECT');
      expect(action.isBlocked).toBe(false);
    });

    it('resolves S03_NO_PROJECT as blocked when user is editor', () => {
      const action = resolveNextAction({
        isEmailVerified: true,
        hasOrganisation: true,
        projects: [],
        connections: [],
        jobs: [],
        runs: [],
        userRole: 'editor',
      });
      expect(action.state).toBe('S03_NO_PROJECT');
      expect(action.isBlocked).toBe(true);
      expect(action.blockerReason).toContain(
        'Only Organization Administrators',
      );
    });

    it('resolves S16_OPERATIONAL_ATTENTION when connection status is error', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'error',
        },
      ];
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [],
        runs: [],
      });
      expect(action.state).toBe('S16_OPERATIONAL_ATTENTION');
      expect(action.title).toContain('Reconnect servicetitan');
    });

    it('resolves S04_PROJECT_NO_CONNECTIONS when project has 0 connections', () => {
      const project = mockProject();
      const action = resolveNextAction({
        projects: [project],
        connections: [],
        jobs: [],
        runs: [],
      });
      expect(action.state).toBe('S04_PROJECT_NO_CONNECTIONS');
      expect(action.actionUrl).toContain('/projects/p1?tab=connections');
    });

    it('resolves S05_ONE_CONNECTION_MISSING when destination connection is missing', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
      ];
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [],
        runs: [],
      });
      expect(action.state).toBe('S05_ONE_CONNECTION_MISSING');
      expect(action.title).toContain('Connect hubspot');
    });

    it('resolves S06_CONNECTIONS_READY when both connected but 0 jobs', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'production',
        },
      ];
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [],
        runs: [],
      });
      expect(action.state).toBe('S06_CONNECTIONS_READY');
      expect(action.actionUrl).toContain('/projects/p1?tab=sync-rules&new=1');
    });

    it('resolves S08_MAPPING_INCOMPLETE when job is in draft', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'production',
        },
      ];
      const job: Job = {
        id: 'j1',
        projectId: 'p1',
        name: 'Customers to Contacts',
        sourceObject: 'Customer',
        destObject: 'Contact',
        status: 'draft',
      };
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [job],
        runs: [],
      });
      expect(action.state).toBe('S08_MAPPING_INCOMPLETE');
      expect(action.actionUrl).toContain('tab=field-mapping');
    });

    it('resolves S11_READY_FOR_TEST when job has mappings and 0 runs', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'production',
        },
      ];
      const job: Job = {
        id: 'j1',
        projectId: 'p1',
        name: 'Customers to Contacts',
        sourceObject: 'Customer',
        destObject: 'Contact',
        status: 'active',
        lastSyncedAt: null,
      };
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [job],
        runs: [],
      });
      expect(action.state).toBe('S11_READY_FOR_TEST');
      expect(action.actionType).toBe('trigger');
    });

    it('resolves S14_TEST_PASSED_UNSCHEDULED when test passed but unscheduled', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'production',
        },
      ];
      const job: Job = {
        id: 'j1',
        projectId: 'p1',
        name: 'Customers to Contacts',
        sourceObject: 'Customer',
        destObject: 'Contact',
        status: 'active',
        lastSyncedAt: '2026-09-25T11:00:00Z',
        syncEnabled: false,
        isEnabled: false,
        scheduleTimes: [],
      };
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [job],
        runs: [],
      });
      expect(action.state).toBe('S14_TEST_PASSED_UNSCHEDULED');
      expect(action.actionUrl).toContain('tab=settings&section=schedule');
    });

    it('resolves S15_ACTIVE_AUTOMATED_SYNC when test passed and scheduled', () => {
      const project = mockProject();
      const conns: Connection[] = [
        {
          id: 'c1',
          projectId: 'p1',
          platformId: 'servicetitan',
          connectionType: 'source',
          status: 'connected',
          environment: 'production',
        },
        {
          id: 'c2',
          projectId: 'p1',
          platformId: 'hubspot',
          connectionType: 'destination',
          status: 'connected',
          environment: 'production',
        },
      ];
      const job: Job = {
        id: 'j1',
        projectId: 'p1',
        name: 'Customers to Contacts',
        sourceObject: 'Customer',
        destObject: 'Contact',
        status: 'active',
        lastSyncedAt: '2026-09-25T11:00:00Z',
        syncEnabled: true,
        intervalMinutes: 15,
      };
      const action = resolveNextAction({
        projects: [project],
        connections: conns,
        jobs: [job],
        runs: [],
      });
      expect(action.state).toBe('S15_ACTIVE_AUTOMATED_SYNC');
    });
  });

  describe('computeJourneyProgressSteps', () => {
    it('returns initial steps when no project exists', () => {
      const steps = computeJourneyProgressSteps({
        projects: [],
        connections: [],
        jobs: [],
        runs: [],
      });
      expect(steps).toHaveLength(4);
      expect(steps[0].id).toBe('create_project');
      expect(steps[0].status).toBe('current');
    });

    it('marks connect_platforms as current when project exists but connections missing', () => {
      const project = mockProject();
      const steps = computeJourneyProgressSteps({
        projects: [project],
        connections: [],
        jobs: [],
        runs: [],
      });
      expect(steps[0].id).toBe('connect_platforms');
      expect(steps[0].status).toBe('current');
    });
  });
});
