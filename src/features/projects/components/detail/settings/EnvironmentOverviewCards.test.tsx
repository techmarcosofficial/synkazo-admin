import { cleanup, render, screen } from '@testing-library/react';
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

const authState = vi.hoisted(() => ({ canManage: true }));

vi.mock('@/lib/synkazoAuth', () => ({
  useSynkazoAuth: () => ({
    hasRole: () => authState.canManage,
  }),
}));

const project: ProjectExt = {
  id: 'project-1',
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

function renderCards(
  overrides: Partial<
    React.ComponentProps<typeof EnvironmentOverviewCards>
  > = {},
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
  render(<EnvironmentOverviewCards {...props} />);
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
  it('shows the active environment and both readiness cards', () => {
    renderCards();

    expect(screen.getByText('Active sync environment')).toBeInTheDocument();
    expect(screen.getByText('sandbox is active')).toBeInTheDocument();
    expect(screen.getByText('Environment readiness')).toBeInTheDocument();
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
      screen.getByRole('button', { name: 'Switch to Production' }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Configure Production' }),
    );
    expect(onGoToConnections).toHaveBeenCalledOnce();
  });

  it('confirms pinned queued-work behavior before switching', async () => {
    const props = renderCards();

    await userEvent.click(
      screen.getByRole('button', { name: 'Switch to Production' }),
    );

    const confirmation = useConfirmDialogStore.getState();
    expect(confirmation).toMatchObject({
      open: true,
      title: 'Switch to Production?',
      confirmLabel: 'Switch to Production',
    });
    render(<>{confirmation.body}</>);
    expect(
      screen.getByText(
        /already queued or running keep the environment captured/i,
      ),
    ).toBeInTheDocument();

    await confirmation.onConfirm?.();
    expect(props.onActivate).toHaveBeenCalledWith('production');
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
