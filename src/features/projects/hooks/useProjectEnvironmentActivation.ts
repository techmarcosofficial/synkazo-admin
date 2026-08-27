import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ConnectionExt, ProjectExt } from './useProjectDetail';

import { connectionsApi } from '@/api/connections';
import { migrationApi, type MigrationDiffItem } from '@/api/migration';
import type { ProjectEnvironment } from '@/types';

export interface MigrationDiffResult {
  customObjects?: MigrationDiffItem[];
  properties?: MigrationDiffItem[];
  associations?: MigrationDiffItem[];
}

export interface ActivationModalState {
  targetEnv: ProjectEnvironment;
  currentEnv: ProjectEnvironment;
  diff: MigrationDiffResult;
}

interface UseProjectEnvironmentActivationInput {
  projectId: string;
  project: ProjectExt | null;
  connections: ConnectionExt[];
  loading: boolean;
  patchProject: (patch: Partial<ProjectExt>) => void;
  refetch: () => void;
}

const envOf = (c: ConnectionExt) => c.environment ?? 'production';

// Owns the Sandbox/Production activation widget: which env is active, the
// diff-conflict confirmation modal, and the one-time auto-activate bootstrap
// for brand-new projects — whichever environment (sandbox or production)
// finishes connecting both sides first becomes active automatically, with
// no manual "Syncs run on" step required.
export function useProjectEnvironmentActivation({
  projectId,
  project,
  connections,
  loading,
  patchProject,
  refetch,
}: UseProjectEnvironmentActivationInput) {
  const [projectActiveEnv, setProjectActiveEnv] =
    useState<ProjectEnvironment | null>(null);
  const [envActivating, setEnvActivating] = useState(false);
  const [envDiffLoading, setEnvDiffLoading] = useState(false);
  const [activationModal, setActivationModal] =
    useState<ActivationModalState | null>(null);
  const [connReloadKey, setConnReloadKey] = useState(0);

  useEffect(() => {
    // A fresh project defaults to "production" in the DB before any setup
    // happens — environmentActivatedAt (null until real activation) is the
    // authoritative "has this actually been activated" flag, not activeEnvironment.
    if (project)
      setProjectActiveEnv(
        project.environmentActivatedAt
          ? (project.activeEnvironment ?? null)
          : null,
      );
  }, [project?.activeEnvironment, project?.environmentActivatedAt]);

  const envHasAnyConnected = (env: string) =>
    connections.some((c) => envOf(c) === env && c.status === 'connected');

  const envFullyConnected = (env: string) => {
    const envConns = connections.filter(
      (c) => envOf(c) === env && c.status === 'connected',
    );
    const srcOk =
      !project?.sourcePlatformId ||
      envConns.some((c) => c.connectionType === 'source');
    const dstOk =
      !project?.destPlatformId ||
      envConns.some((c) => c.connectionType === 'destination');
    return srcOk && dstOk;
  };

  const doActivate = async (env: ProjectEnvironment) => {
    setEnvActivating(true);
    const envLabel = env === 'sandbox' ? 'Sandbox' : 'Production';
    const toastId = toast.loading(
      `Switching to ${envLabel}… validating connections`,
    );
    try {
      await connectionsApi.activateEnvironment(projectId, env);
      setProjectActiveEnv(env);
      patchProject({
        activeEnvironment: env,
        environmentActivatedAt: new Date().toISOString(),
      });
      setActivationModal(null);
      toast.success(`${envLabel} activated`, { id: toastId });
      setConnReloadKey((k) => k + 1);
      refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message ??
          'Activation blocked — credentials did not verify',
        { id: toastId },
      );
    } finally {
      setEnvActivating(false);
    }
  };

  const handleActivateEnv = async (env: ProjectEnvironment) => {
    if (env === projectActiveEnv) return;
    const otherEnv: ProjectEnvironment =
      env === 'sandbox' ? 'production' : 'sandbox';
    const otherEnvConnected = connections.some(
      (c) => envOf(c) === otherEnv && c.status === 'connected',
    );
    if (!projectActiveEnv || !otherEnvConnected) {
      doActivate(env);
      return;
    }
    setEnvDiffLoading(true);
    try {
      const diffData = (await migrationApi.diff(
        projectId,
        projectActiveEnv,
        env,
      )) as unknown as MigrationDiffResult;
      const missing = [
        ...(diffData.customObjects ?? []),
        ...(diffData.properties ?? []),
        ...(diffData.associations ?? []),
      ].filter((i) => i.status === 'missing');
      if (missing.length === 0) {
        doActivate(env);
        return;
      }
      setActivationModal({
        targetEnv: env,
        currentEnv: projectActiveEnv,
        diff: diffData,
      });
    } catch {
      doActivate(env);
    } finally {
      setEnvDiffLoading(false);
    }
  };

  const autoActivatedRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!project) return;
    if (project.environmentActivatedAt) return;
    if (projectActiveEnv) return;
    if (autoActivatedRef.current) return;
    // Sandbox wins if both happen to be ready at once (e.g. re-connecting an
    // existing project) — otherwise whichever env completes first activates.
    const readyEnv: ProjectEnvironment | null = envFullyConnected('sandbox')
      ? 'sandbox'
      : envFullyConnected('production')
        ? 'production'
        : null;
    if (readyEnv) {
      autoActivatedRef.current = true;
      doActivate(readyEnv);
    }
  }, [connections, loading, projectActiveEnv, project]);

  return {
    projectActiveEnv,
    envActivating,
    envDiffLoading,
    activationModal,
    connReloadKey,
    envHasAnyConnected,
    envFullyConnected,
    handleActivateEnv,
    doActivate,
    closeActivationModal: () => setActivationModal(null),
  };
}
