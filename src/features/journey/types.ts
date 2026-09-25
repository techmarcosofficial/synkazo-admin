import type { Connection, Job, Project, SyncRun, UserRole } from '@/types';

export type UserJourneyStateId =
  | 'S01_NEW_USER_UNVERIFIED'
  | 'S02_NO_ORGANISATION'
  | 'S03_NO_PROJECT'
  | 'S04_PROJECT_NO_CONNECTIONS'
  | 'S05_ONE_CONNECTION_MISSING'
  | 'S06_CONNECTIONS_READY'
  | 'S07_SYNC_RECIPE_SELECTED'
  | 'S08_MAPPING_INCOMPLETE'
  | 'S09_MAPPING_BLOCKED_DECISIONS'
  | 'S10_PIPELINE_UNCONFIGURED'
  | 'S11_READY_FOR_TEST'
  | 'S12_TEST_RUNNING'
  | 'S13_TEST_FAILED'
  | 'S14_TEST_PASSED_UNSCHEDULED'
  | 'S15_ACTIVE_AUTOMATED_SYNC'
  | 'S16_OPERATIONAL_ATTENTION';

export interface NextActionResolution {
  state: UserJourneyStateId;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  actionType: 'navigate' | 'modal' | 'trigger';
  triggerKey?: string;
  estimatedTime?: string;
  isBlocked: boolean;
  blockerReason?: string;
  blockerResolutionUrl?: string;
}

export type JourneyStepStatus = 'complete' | 'current' | 'upcoming';

export interface JourneyProgressStep {
  id: string;
  title: string;
  description: string;
  status: JourneyStepStatus;
  url?: string;
  optional?: boolean;
}

export interface SetupDraft {
  projectId: string;
  jobId?: string | null;
  step?: number;
  lastSavedAt?: string;
}

export interface JourneyEvaluationContext {
  isEmailVerified?: boolean;
  hasOrganisation?: boolean;
  projects: Project[];
  connections: Connection[];
  jobs: Job[];
  runs: SyncRun[];
  userRole?: UserRole;
  targetProjectId?: string;
  targetJobId?: string;
  activeDraft?: SetupDraft | null;
}
