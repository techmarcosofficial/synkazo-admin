import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ConnectionExt, ProjectExt } from './useProjectDetail';

import { connectionsApi } from '@/api/connections';
import type { ProjectEnvironment } from '@/types';

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
  const [activationError, setActivationError] = useState<string | null>(null);
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
    setActivationError(null);
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
      toast.success(`${envLabel} activated`, { id: toastId });
      setConnReloadKey((k) => k + 1);
      refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      const message =
        e?.response?.data?.message ??
        'Activation blocked — credentials did not verify';
      setActivationError(message);
      toast.error(message, { id: toastId });
      throw err;
    } finally {
      setEnvActivating(false);
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
      void doActivate(readyEnv).catch(() => {
        autoActivatedRef.current = false;
      });
    }
  }, [connections, loading, projectActiveEnv, project]);

  return {
    projectActiveEnv,
    envActivating,
    activationError,
    connReloadKey,
    envHasAnyConnected,
    envFullyConnected,
    handleActivateEnv: doActivate,
    doActivate,
    clearActivationError: () => setActivationError(null),
  };
}
