import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EnvironmentOverviewCards, {
  environmentReadiness,
} from './EnvironmentOverviewCards';

import type {
  ConnectionExt,
  ProjectExt,
} from '@/features/projects/hooks/useProjectDetail';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';
import { connectionsApi } from '@/api/connections';
import { EnvironmentHeaderActionContext } from './EnvironmentHeaderActionContext';

const authState = vi.hoisted(() => ({ canManage: true }));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasRole: () => authState.canManage,
  }),
}));

vi.mock('@/api/connections', () => ({
  connectionsApi: {
    getSharedSourceAcknowledgement: vi.fn(),
    acknowledgeSharedSource: vi.fn(),
    previewEnvironmentSwitch: vi.fn(),
  },
}));

const project: ProjectExt = {
  id: 'project-1',
  workspaceIsolationMode: 'isolated',
  organisationId: 'org-1',
  name: 'Environment project',
  sourcePlatformId: 'servicetitan',
  destPlatformId: 'hubspot',
  status: 'active',
  activeEnvironment: 'sandbox',
  environmentActivatedAt: '2026-01-01T00:00:00.000Z',
};

function connection(
  id: string,
  environment: 'sandbox' | 'production',
  connectionType: 'source' | 'destination',
  status: ConnectionExt['status'] = 'connected',
): ConnectionExt {
  return {
    id,
    projectId: project.id,
    platformId: connectionType === 'source' ? 'servicetitan' : 'hubspot',
    connectionType,
    environment,
    status,
    accountName: `${environment} ${connectionType}`,
  };
}

const sandboxPair = [
  connection('sandbox-source', 'sandbox', 'source'),
  connection('sandbox-destination', 'sandbox', 'destination'),
];
const productionPair = [
  connection('production-source', 'production', 'source'),
  connection('production-destination', 'production', 'destination'),
];

afterEach(() => {
  cleanup();
  authState.canManage = true;
  useConfirmDialogStore.getState().close();
});

vi.mocked(connectionsApi.getSharedSourceAcknowledgement).mockResolvedValue({
  shared: false, verificationRequired: false, acknowledged: false,
  accountName: null, accountIdentity: null, platformId: 'servicetitan', fingerprint: null,
  sandboxConnectionId: 'sandbox-source',
  productionConnectionId: 'production-source',
});
vi.mocked(connectionsApi.previewEnvironmentSwitch).mockResolvedValue({
  currentEnvironment: 'sandbox', targetEnvironment: 'production',
  targetWorkspaceId: 'production-id', expectedGeneration: '4',
  targetReady: true, canSwitch: true,
  blockers: { runningJobs: 0, runningRuns: 0, priorityCycles: 0, associationRuns: 0 },
  pendingWebhookEvents: 0, jobsToPause: 1,
  targetCounts: { jobs: 2, runs: 3, runLogs: 4 },
  targetSource: null, targetDestination: {
    accountName: 'Production portal', accountIdentity: 'hubspot:123', status: 'connected',
  },
  sandboxDestinationWriteSafety: null,
});

function renderCards(
  overrides: Partial<
    React.ComponentProps<typeof EnvironmentOverviewCards>
  > = {},
  headerHost: HTMLElement | null = null,
) {
  const props: React.ComponentProps<typeof EnvironmentOverviewCards> = {
    project,
    connections: [...sandboxPair, ...productionPair],
    activeEnvironment: 'sandbox',
    activating: false,
    activationError: null,
    clearActivationError: vi.fn(),
    onActivate: vi.fn().mockResolvedValue(undefined),
    onGoToConnections: vi.fn(),
    ...overrides,
  };
  render(
    <EnvironmentHeaderActionContext.Provider value={headerHost}>
      <EnvironmentOverviewCards {...props} />
    </EnvironmentHeaderActionContext.Provider>,
  );
  return props;
}

describe('environmentReadiness', () => {
  it('requires connected source and destination records in the same environment', () => {
    expect(environmentReadiness(sandboxPair, 'sandbox').ready).toBe(true);
    expect(
      environmentReadiness(
        [
          connection('source', 'production', 'source'),
          connection('dest', 'production', 'destination', 'error'),
        ],
        'production',
      ).ready,
    ).toBe(false);
  });
});

describe('EnvironmentOverviewCards', () => {
  it('keeps legacy switch instructions and omits isolated account warnings', async () => {
    const legacy = { ...project, workspaceIsolationMode: 'legacy' as const };
    renderCards({ project: legacy, connections: [
      ...sandboxPair.map((item) => item.connectionType === 'destination'
        ? { ...item, providerHubId: 123 } : item),
      ...productionPair.map((item) => item.connectionType === 'destination'
        ? { ...item, providerHubId: 123 } : item),
    ] });
    expect(screen.queryByText(/Sandbox destination writes are blocked because both workspaces/))
      .not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Switch to Production' }));
    await waitFor(() => expect(useConfirmDialogStore.getState().open).toBe(true));
    expect(useConfirmDialogStore.getState().body).toBeTruthy();
  });

  it('keeps one switch action in the settings header when the target is incomplete', () => {
    const headerHost = document.createElement('div');
    document.body.appendChild(headerHost);
    try {
      renderCards({
        connections: [
          ...sandboxPair,
          connection('production-source', 'production', 'source'),
        ],
      }, headerHost);

      expect(headerHost.querySelector('button')?.textContent).toContain('Switch to Production');
      expect(screen.getAllByRole('button', { name: 'Switch to Production' })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Configure Production' })).toBeInTheDocument();
    } finally {
      headerHost.remove();
    }
  });

  it('offers the reverse switch in the settings header', () => {
    const headerHost = document.createElement('div');
    document.body.appendChild(headerHost);
    try {
      renderCards({ activeEnvironment: 'production' }, headerHost);
      expect(headerHost.querySelector('button')?.textContent).toContain('Switch to Sandbox');
      expect(screen.getAllByRole('button', { name: 'Switch to Sandbox' })).toHaveLength(1);
    } finally {
      headerHost.remove();
    }
  });

  it('runs the existing switch preview from the settings header', async () => {
    const headerHost = document.createElement('div');
    document.body.appendChild(headerHost);
    try {
      renderCards({}, headerHost);
      await userEvent.click(screen.getByRole('button', { name: 'Switch to Production' }));
      await waitFor(() => expect(connectionsApi.previewEnvironmentSwitch)
        .toHaveBeenCalledWith('project-1', 'production'));
      await waitFor(() => expect(useConfirmDialogStore.getState().title)
        .toBe('Switch to Production?'));
    } finally {
      headerHost.remove();
    }
  });

  it('requires an explicit confirmation for a verified shared live source', async () => {
    vi.mocked(connectionsApi.getSharedSourceAcknowledgement).mockResolvedValueOnce({
      shared: true, verificationRequired: false, acknowledged: false,
      accountName: 'Live portal', accountIdentity: 'hubspot:123', platformId: 'hubspot',
      fingerprint: 'a'.repeat(64), sandboxConnectionId: 'sandbox-source',
      productionConnectionId: 'production-source',
    });
    vi.mocked(connectionsApi.acknowledgeSharedSource).mockResolvedValueOnce(undefined);
    renderCards();
    const button = await screen.findByRole('button', { name: 'Acknowledge source' });
    await userEvent.click(button);
    await waitFor(() => expect(useConfirmDialogStore.getState().open).toBe(true));
    const confirmation = useConfirmDialogStore.getState();
    expect(confirmation.title).toBe('Acknowledge live source account?');
    await confirmation.onConfirm?.();
    await waitFor(() => expect(connectionsApi.acknowledgeSharedSource)
      .toHaveBeenCalledWith('project-1', 'a'.repeat(64)));
  });

  it('warns when Sandbox and Production destinations use the same HubSpot portal', () => {
    renderCards({ connections: [
      ...sandboxPair.map((item) => item.connectionType === 'destination'
        ? { ...item, providerHubId: 123 } : item),
      ...productionPair.map((item) => item.connectionType === 'destination'
        ? { ...item, providerHubId: 123 } : item),
    ] });
    expect(screen.getByText(/Sandbox destination writes are blocked because both workspaces/))
      .toBeInTheDocument();
  });

  it('shows the active environment and both readiness columns', () => {
    renderCards();

    expect(screen.getByText('Active sync environment')).toBeInTheDocument();
    expect(screen.getByText('sandbox is active')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch to Production' }),
    ).toBeEnabled();
  });

  it('blocks switching when the target pair is incomplete and links to Connections', async () => {
    const onGoToConnections = vi.fn();
    renderCards({
      connections: [
        ...sandboxPair,
        connection('production-source', 'production', 'source'),
      ],
      onGoToConnections,
    });

    expect(
      screen.queryByRole('button', { name: 'Switch to Production' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Configure Production' }),
    );
    expect(onGoToConnections).toHaveBeenCalledOnce();
  });

  it('explains active-work blockers before switching', async () => {
    const props = renderCards();

    await userEvent.click(
      screen.getByRole('button', { name: 'Switch to Production' }),
    );

    await waitFor(() => expect(useConfirmDialogStore.getState().open).toBe(true));
    const confirmation = useConfirmDialogStore.getState();
    expect(confirmation).toMatchObject({
      open: true,
      title: 'Switch to Production?',
      confirmLabel: 'Switch to Production',
    });
    render(<>{confirmation.body}</>);
    expect(
      screen.getByText(
        /wait for running syncs and priority stages to finish/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 enabled job\(s\) will pause/)).toBeInTheDocument();

    await confirmation.onConfirm?.();
    expect(props.onActivate).toHaveBeenCalledWith('production', '4');
  });

  it('shows server-reported blockers without opening a switch confirmation', async () => {
    vi.mocked(connectionsApi.previewEnvironmentSwitch).mockResolvedValueOnce({
      currentEnvironment: 'sandbox', targetEnvironment: 'production',
      targetWorkspaceId: 'production-id', expectedGeneration: '4',
      targetReady: true, canSwitch: false,
      blockers: { runningJobs: 1, runningRuns: 1, priorityCycles: 0, associationRuns: 0 },
      pendingWebhookEvents: 0, jobsToPause: 1, targetCounts: null,
      targetSource: null, targetDestination: null,
      sandboxDestinationWriteSafety: null,
    });
    renderCards();
    await userEvent.click(screen.getByRole('button', { name: 'Switch to Production' }));
    expect(await screen.findByText(/Switch blocked: 1 running jobs/)).toBeInTheDocument();
    expect(useConfirmDialogStore.getState().open).toBe(false);
  });

  it('keeps activation read-only for users below organization admin', () => {
    authState.canManage = false;
    renderCards();

    expect(screen.getByText('Admin access required')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Switch to Production' }),
    ).not.toBeInTheDocument();
  });

  it('keeps activation failures visible in context', () => {
    renderCards({ activationError: 'Production credentials did not verify.' });

    expect(
      screen.getByText('Production credentials did not verify.'),
    ).toBeInTheDocument();
  });
});
