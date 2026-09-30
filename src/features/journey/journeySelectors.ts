import type {
  Connection,
  Job,
  Project,
  ProjectEnvironment,
  SyncRun,
} from '@/types';
import {
  getAllDraftSyncJobProjectIds,
  getDraftSyncJob,
  type DraftSyncJob,
} from './draftSyncJob';
import type {
  JourneyEvaluationContext,
  JourneyProgressStep,
  NextActionResolution,
  UserJourneyStateId,
} from './types';

/**
 * Checks whether both source and destination connections exist and are connected
 * within the same environment (production or sandbox).
 */
export function hasBothConnections(connections: Connection[]): boolean {
  return (['production', 'sandbox'] as const).some((environment) => {
    const inEnv = connections.filter(
      (c) => (c.environment ?? 'production') === environment,
    );
    return (
      inEnv.some(
        (c) => c.connectionType === 'source' && c.status === 'connected',
      ) &&
      inEnv.some(
        (c) => c.connectionType === 'destination' && c.status === 'connected',
      )
    );
  });
}

/**
 * Determines whether an organization has permanently graduated from introductory onboarding
 * into active operational mode.
 *
 * A successful run graduates the organization in either environment, including
 * limited runs. Job counters preserve that signal after older run logs are paged out.
 */
export function isOrganizationGraduated(
  jobs: Job[],
  runs: SyncRun[] = [],
): boolean {
  if (jobs.length === 0) return false;
  return (
    jobs.some((j) => Boolean(j.lastSyncedAt) || (j.recordsSynced ?? 0) > 0) ||
    runs.some((r) => r.status === 'success' || r.status === 'completed')
  );
}

function isSandboxProject(project: Project): boolean {
  const activeEnvironment =
    (project as Project & { activeEnvironment?: ProjectEnvironment })
      .activeEnvironment ?? project.active_environment;
  return activeEnvironment === 'sandbox';
}

export interface ActiveDraftResolution {
  projectId: string;
  projectName?: string;
  draft: DraftSyncJob;
  stepNumber: number;
  stepLabel: string;
  summaryText: string;
  returnUrl: string;
  isBlocked: boolean;
  blockerReason?: string;
}

/**
 * Pure selector that resolves the single most relevant active draft sync flow.
 * Checks sessionStorage for active drafts and returns high-priority resume metadata.
 */
export function resolveActiveDraft(
  projects: Project[] = [],
  targetProjectId?: string,
  userRole?: string,
): ActiveDraftResolution | null {
  if (typeof window === 'undefined') return null;

  const projectIdsToCheck: string[] = [];
  if (targetProjectId) {
    projectIdsToCheck.push(targetProjectId);
  }

  const storedIds = getAllDraftSyncJobProjectIds();
  for (const pid of storedIds) {
    if (!projectIdsToCheck.includes(pid)) {
      projectIdsToCheck.push(pid);
    }
  }

  for (const p of projects) {
    if (!projectIdsToCheck.includes(p.id)) {
      projectIdsToCheck.push(p.id);
    }
  }

  for (const pid of projectIdsToCheck) {
    const draft = getDraftSyncJob(pid);
    if (!draft) continue;

    const project = projects.find((p) => p.id === pid);
    const stepNumber = Number(draft.step ?? 0) + 1;

    let stepName = 'Job Details';
    if (draft.step === 1) {
      stepName = draft.config?.sourceObject ? 'Object & Status' : 'Field Mapping';
    } else if (draft.step === 2) {
      stepName = 'Field Mapping';
    } else if (draft.step === 3) {
      stepName = 'Default Values';
    } else if (draft.step === 4) {
      stepName = 'Schedule & Launch';
    }

    const stepLabel = `Step ${stepNumber}: ${stepName}`;
    const flowTitle =
      draft.config?.name ||
      (draft.config?.sourceObject && draft.config?.destObject
        ? `${draft.config.sourceObject} → ${draft.config.destObject}`
        : 'Sync Flow Draft');

    const isEditor = userRole === 'editor';

    return {
      projectId: pid,
      projectName: project?.name,
      draft,
      stepNumber,
      stepLabel,
      summaryText: `${flowTitle} (${stepLabel})`,
      returnUrl: `/projects/${pid}?tab=sync-rules&create=true`,
      isBlocked: isEditor,
      blockerReason: isEditor
        ? 'Only Organization Admins can resume and save sync flows.'
        : undefined,
    };
  }

  return null;
}

/**
 * Deterministically resolves the single best next action and current state based on context.
 */
export function resolveNextAction(
  context: JourneyEvaluationContext,
): NextActionResolution {
  // 1. Email verification check
  if (context.isEmailVerified === false) {
    return {
      state: 'S01_NEW_USER_UNVERIFIED',
      title: 'Verify your email address',
      description:
        'Check your inbox to confirm your account and unlock your workspace.',
      actionLabel: 'Go to Verification',
      actionUrl: '/verify-email',
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  // 2. Organization existence check
  if (context.hasOrganisation === false) {
    return {
      state: 'S02_NO_ORGANISATION',
      title: 'Name your organization workspace',
      description:
        'Your workspace holds your integration projects, team credentials, and sync settings.',
      actionLabel: 'Create Workspace',
      actionUrl: '/setup-organisation',
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  // 3. Project existence check
  if (context.projects.length === 0) {
    const isEditor = context.userRole === 'editor';
    return {
      state: 'S03_NO_PROJECT',
      title: 'Create your first integration project',
      description:
        'Choose your software platforms to establish a secure synchronization channel.',
      actionLabel: 'Create Project',
      actionUrl: '/projects?new=1',
      actionType: 'modal',
      triggerKey: 'create_project',
      estimatedTime: 'Takes ~1 min',
      isBlocked: isEditor,
      blockerReason: isEditor
        ? 'Only Organization Administrators can create projects. Contact your administrator to create a project.'
        : undefined,
    };
  }

  // Identify target project (explicit target, or the most recent project)
  const targetProject: Project =
    (context.targetProjectId
      ? context.projects.find((p) => p.id === context.targetProjectId)
      : null) ?? context.projects[0];
  const isSandbox = isSandboxProject(targetProject);

  const projectConns = context.connections.filter(
    (c) => c.projectId === targetProject.id,
  );

  // 4. Operational interrupts (expired tokens, platform auth errors)
  const expiredConn = projectConns.find(
    (c) => c.status === 'error' || c.status === 'disconnected',
  );
  if (expiredConn) {
    return {
      state: 'S16_OPERATIONAL_ATTENTION',
      title: `Reconnect ${expiredConn.platformId}`,
      description: `Authentication needs attention on ${expiredConn.platformId}. Data synchronization is paused until reconnected.`,
      actionLabel: 'Reconnect Platform',
      actionUrl: `/projects/${targetProject.id}?tab=connections`,
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  // 5. Connection requirements
  if (projectConns.length === 0) {
    return {
      state: 'S04_PROJECT_NO_CONNECTIONS',
      title: `Connect ${targetProject.sourcePlatformId || 'Source App'}`,
      description:
        'Link your source software so Synkazo can read records securely.',
      actionLabel: `Connect ${targetProject.sourcePlatformId || 'Source'}`,
      actionUrl: `/projects/${targetProject.id}?tab=connections`,
      actionType: 'navigate',
      estimatedTime: 'Takes ~2 mins',
      isBlocked: false,
    };
  }

  const hasSource = projectConns.some(
    (c) => c.connectionType === 'source' && c.status === 'connected',
  );
  const hasDest = projectConns.some(
    (c) => c.connectionType === 'destination' && c.status === 'connected',
  );

  if (!hasSource) {
    return {
      state: 'S05_ONE_CONNECTION_MISSING',
      title: `Connect ${targetProject.sourcePlatformId || 'Source App'}`,
      description:
        'Connect your source platform to complete the integration pair.',
      actionLabel: `Connect ${targetProject.sourcePlatformId || 'Source'}`,
      actionUrl: `/projects/${targetProject.id}?tab=connections`,
      actionType: 'navigate',
      estimatedTime: 'Takes ~2 mins',
      isBlocked: false,
    };
  }

  if (!hasDest) {
    return {
      state: 'S05_ONE_CONNECTION_MISSING',
      title: `Connect ${targetProject.destPlatformId || 'Destination App'}`,
      description: `${targetProject.sourcePlatformId || 'Source'} is connected. Now link your destination platform to complete the connection pair.`,
      actionLabel: `Connect ${targetProject.destPlatformId || 'Destination'}`,
      actionUrl: `/projects/${targetProject.id}?tab=connections`,
      actionType: 'navigate',
      estimatedTime: 'Takes ~2 mins',
      isBlocked: false,
    };
  }

  // 6. Job requirements
  const projectJobs = context.jobs.filter(
    (j) => j.projectId === targetProject.id,
  );

  if (projectJobs.length === 0) {
    return {
      state: 'S06_CONNECTIONS_READY',
      title: 'Choose what data you want to sync',
      description:
        'Both platforms are connected and verified! Create your first sync flow to choose what records should move between them.',
      actionLabel: 'Create First Sync Flow',
      actionUrl: `/projects/${targetProject.id}?tab=sync-rules&new=1`,
      actionType: 'navigate',
      estimatedTime: 'Takes ~2 mins',
      isBlocked: false,
    };
  }

  // Identify target job
  const targetJob: Job =
    (context.targetJobId
      ? projectJobs.find((j) => j.id === context.targetJobId)
      : null) ?? projectJobs[0];

  // Object selection check
  if (!targetJob.sourceObject || !targetJob.destObject) {
    return {
      state: 'S07_SYNC_RECIPE_SELECTED',
      title: 'Select records to sync',
      description:
        'Choose the source and destination record types (e.g. Customers → Contacts).',
      actionLabel: 'Select Record Types',
      actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}`,
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  // Draft / Mapping check
  if (targetJob.status === 'draft') {
    return {
      state: 'S08_MAPPING_INCOMPLETE',
      title: 'Match fields for this sync flow',
      description:
        'Match the fields you want to transfer between your platforms.',
      actionLabel: 'Match Fields',
      actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=field-mapping`,
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  // Test run evaluation
  const jobRuns = context.runs.filter((r) => r.jobId === targetJob.id);
  const hasSuccessfulRun =
    Boolean(targetJob.lastSyncedAt) ||
    (targetJob.recordsSynced != null && targetJob.recordsSynced > 0) ||
    jobRuns.some((r) => r.status === 'success' || r.status === 'completed');

  const hasRunningRun =
    targetJob.isRunning || jobRuns.some((r) => r.status === 'running');
  const latestRun = jobRuns[0];
  const hasFailedRun =
    !hasSuccessfulRun &&
    latestRun &&
    (latestRun.status === 'error' || latestRun.status === 'failed');

  if (hasRunningRun) {
    return {
      state: 'S12_TEST_RUNNING',
      title: isSandbox ? 'Sample test in progress' : 'Limited sync in progress',
      description: isSandbox
        ? 'Synkazo is syncing a limited number of records in Sandbox for review.'
        : 'Synkazo is syncing a limited number of records in Production.',
      actionLabel: isSandbox ? 'View Test Progress' : 'View Sync Progress',
      actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=overview`,
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  if (hasFailedRun) {
    return {
      state: 'S13_TEST_FAILED',
      title: isSandbox
        ? 'Sample test needs review'
        : 'Limited sync needs review',
      description:
        latestRun?.errorMessage ||
        `The ${isSandbox ? 'sample test' : 'limited sync'} encountered an issue. Review the diagnostic details to resolve and retry.`,
      actionLabel: 'Review Diagnostics & Retry',
      actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=overview`,
      actionType: 'navigate',
      isBlocked: false,
    };
  }

  if (!hasSuccessfulRun) {
    return {
      state: 'S11_READY_FOR_TEST',
      title: isSandbox ? 'Run a 5-record Sandbox test' : 'Run a limited sync',
      description: isSandbox
        ? 'Sync a small sample to your Sandbox destination and review the results before automating.'
        : 'Sync a controlled number of records to your Production destination and review the results before automating.',
      actionLabel: isSandbox ? 'Run 5-Record Test' : 'Run Limited Sync',
      actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=overview`,
      actionType: 'trigger',
      triggerKey: 'run_sample_test',
      estimatedTime: 'Takes ~30 sec',
      isBlocked: false,
    };
  }

  // 7. Schedule check
  const hasSchedule = Boolean(
    targetJob.syncEnabled ||
    targetJob.isEnabled ||
    targetJob.intervalMinutes ||
    targetJob.cronExpression ||
    (targetJob.scheduleTimes && targetJob.scheduleTimes.length > 0),
  );

  if (!hasSchedule) {
    return {
      state: 'S14_TEST_PASSED_UNSCHEDULED',
      title: 'Turn on automatic sync schedule',
      description: `Your ${isSandbox ? 'sample test' : 'limited sync'} completed successfully! Choose how often Synkazo should sync new data.`,
      actionLabel: 'Set Sync Schedule',
      actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=settings&section=schedule`,
      actionType: 'navigate',
      estimatedTime: 'Takes ~1 min',
      isBlocked: false,
    };
  }

  // 8. Normal operational monitoring
  return {
    state: 'S15_ACTIVE_AUTOMATED_SYNC',
    title: 'Sync running smoothly',
    description: targetJob.lastSyncedAt
      ? `Last synced at ${targetJob.lastSyncedAt}. All systems healthy.`
      : 'All systems operational. Next scheduled sync will run automatically.',
    actionLabel: 'View Live Sync Activity',
    actionUrl: `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=overview`,
    actionType: 'navigate',
    isBlocked: false,
  };
}

/**
 * Computes high-level journey progress steps for ambient progress bars and journey cards.
 */
export function computeJourneyProgressSteps(
  context: JourneyEvaluationContext,
): JourneyProgressStep[] {
  const targetProject =
    (context.targetProjectId
      ? context.projects.find((p) => p.id === context.targetProjectId)
      : null) ?? context.projects[0];

  if (!targetProject) {
    return [
      {
        id: 'create_project',
        title: 'Create Project',
        description: 'Set up an integration channel between your software.',
        status: 'current',
      },
      {
        id: 'connect_platforms',
        title: 'Connect Platforms',
        description: 'Link source and destination platforms.',
        status: 'upcoming',
      },
      {
        id: 'create_sync',
        title: 'Create Sync Flow',
        description: 'Choose records and match properties.',
        status: 'upcoming',
      },
      {
        id: 'test_and_activate',
        title: 'Run & Activate',
        description: 'Run a limited sync and automate the schedule.',
        status: 'upcoming',
      },
    ];
  }

  const isSandbox = isSandboxProject(targetProject);
  const projectConns = context.connections.filter(
    (c) => c.projectId === targetProject.id,
  );
  const connsReady = hasBothConnections(projectConns);

  const projectJobs = context.jobs.filter(
    (j) => j.projectId === targetProject.id,
  );
  const jobExists = projectJobs.length > 0;
  const targetJob = projectJobs[0];

  const jobRuns = targetJob
    ? context.runs.filter((r) => r.jobId === targetJob.id)
    : [];
  const testComplete =
    Boolean(targetJob?.lastSyncedAt) ||
    (targetJob?.recordsSynced ?? 0) > 0 ||
    jobRuns.some((r) => r.status === 'success' || r.status === 'completed');

  const scheduleActive = Boolean(
    targetJob?.syncEnabled ||
    targetJob?.isEnabled ||
    targetJob?.intervalMinutes ||
    targetJob?.cronExpression ||
    (targetJob?.scheduleTimes && targetJob.scheduleTimes.length > 0),
  );

  return [
    {
      id: 'connect_platforms',
      title: 'Connect Platforms',
      description: 'Link your source and destination software.',
      status: connsReady ? 'complete' : 'current',
      url: `/projects/${targetProject.id}?tab=connections`,
    },
    {
      id: 'create_sync',
      title: 'Create Sync Flow',
      description: 'Select records and match properties.',
      status: jobExists ? 'complete' : connsReady ? 'current' : 'upcoming',
      url: `/projects/${targetProject.id}?tab=sync-rules`,
    },
    {
      id: 'test_preview',
      title: isSandbox ? 'Test & Review' : 'Run & Review',
      description: isSandbox
        ? 'Sync a small sample in Sandbox and review the result.'
        : 'Run a limited sync in Production and review the result.',
      status: testComplete ? 'complete' : jobExists ? 'current' : 'upcoming',
      url: targetJob
        ? `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=overview`
        : undefined,
    },
    {
      id: 'automate_schedule',
      title: 'Automate Schedule',
      description: 'Set sync frequency and activate.',
      status: scheduleActive
        ? 'complete'
        : testComplete
          ? 'current'
          : 'upcoming',
      url: targetJob
        ? `/projects/${targetProject.id}/jobs/${targetJob.id}?tab=settings&section=schedule`
        : undefined,
    },
  ];
}
