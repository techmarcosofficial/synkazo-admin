import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  migrationApi,
  type MigrationDiff,
  type MigrationDiffItem,
  type MigrationRun,
} from '@/api/migration';
import type { ConnectionExt } from '@/features/projects/hooks/useProjectDetail';

type MigrationFilter = 'all' | 'missing' | 'conflict' | 'selected' | 'in_sync';

function errorMessage(error: unknown, fallback: string) {
  const candidate = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return candidate.response?.data?.message ?? candidate.message ?? fallback;
}

export function useEnvironmentMigration(
  projectId: string,
  connections?: ConnectionExt[],
) {
  const [diff, setDiff] = useState<MigrationDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(true);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<MigrationFilter>('missing');
  const [reversed, setReversed] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [runs, setRuns] = useState<MigrationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MigrationRun | null>(null);

  const fromEnvironment = reversed ? 'production' : 'sandbox';
  const toEnvironment = reversed ? 'sandbox' : 'production';

  const loadDiff = useCallback(async () => {
    setDiffLoading(true);
    setDiff(null);
    setSelected(new Set());
    setDiffError(null);
    try {
      setDiff(
        await migrationApi.diff(projectId, fromEnvironment, toEnvironment),
      );
    } catch (error) {
      setDiffError(
        errorMessage(error, 'Could not compare environment configuration.'),
      );
    } finally {
      setDiffLoading(false);
    }
  }, [fromEnvironment, projectId, toEnvironment]);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      setRuns(await migrationApi.listRuns(projectId));
    } catch (error) {
      setRunsError(errorMessage(error, 'Could not load transfer history.'));
    } finally {
      setRunsLoading(false);
    }
  }, [projectId]);

  const hubspotConnectionSignature = useMemo(
    () =>
      (connections ?? [])
        .filter((connection) => connection.platformId === 'hubspot')
        .map(
          (connection) =>
            `${connection.environment}:${connection.connectionType}:${connection.status}`,
        )
        .sort()
        .join(','),
    [connections],
  );

  useEffect(() => {
    void loadDiff();
  }, [loadDiff, hubspotConnectionSignature]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const toggle = (key: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = (items: MigrationDiffItem[]) =>
    setSelected((previous) => {
      const next = new Set(previous);
      const allSelected = items.every((item) => next.has(item.identityKey));
      items.forEach((item) => {
        if (allSelected) next.delete(item.identityKey);
        else next.add(item.identityKey);
      });
      return next;
    });

  const transfer = async () => {
    setMigrating(true);
    setMigrationError(null);
    try {
      const run = await migrationApi.run(
        projectId,
        Array.from(selected),
        fromEnvironment,
        toEnvironment,
      );
      setLastResult(run);
      setRuns((previous) => [
        run,
        ...previous.filter((existing) => existing.id !== run.id),
      ]);
      setSelected(new Set());
      const message = `${run.succeeded} created, ${run.skipped} skipped, ${run.failed} failed`;
      if (run.failed === 0) toast.success(`Transfer complete: ${message}`);
      else toast.warning(`Transfer ${run.status}: ${message}`);
      await loadDiff();
    } catch (error) {
      const message = errorMessage(error, 'Configuration transfer failed.');
      setMigrationError(message);
      toast.error(message);
      throw error;
    } finally {
      setMigrating(false);
    }
  };

  const reverseDirection = () => {
    setReversed((value) => !value);
    setDiff(null);
    setDiffLoading(true);
    setSelected(new Set());
    setMigrationError(null);
  };

  return {
    diff,
    diffLoading,
    diffError,
    selected,
    filter,
    setFilter,
    reversed,
    migrating,
    migrationError,
    runs,
    runsLoading,
    runsError,
    lastResult,
    loadDiff,
    loadRuns,
    loadRunItems: (runId: string) => migrationApi.getRunItems(projectId, runId),
    toggle,
    toggleAll,
    transfer,
    reverseDirection,
  };
}
