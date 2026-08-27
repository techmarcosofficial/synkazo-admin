import { AlertTriangle, Check, GitBranch, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { showToast } from '@/lib/toast';
import type { PipelineStatus } from '@/types';

interface Pipeline {
  id: string;
  label: string;
  stages: Array<{ id: string; label: string; displayOrder: number }>;
}

export default function PipelineTab() {
  const { projectId, job, refetch } = useJobDetailContext();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stStatuses, setStStatuses] = useState<string[]>([]);
  const [pipelineId, setPipelineId] = useState(job.destPipelineId ?? '');
  const [statusMapping, setStatusMapping] = useState<Record<string, string>>(
    job.statusMapping ?? {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setScopeError(null);
    Promise.all([
      jobsApi.getSourceStatuses(projectId, job.id).catch(() => [] as string[]),
      jobsApi
        .getPipelineStatus(projectId, job.id)
        .catch(() => ({ pipelines: [] }) as Partial<PipelineStatus>),
    ])
      .then(([statuses, ps]) => {
        const pipelineList = ps.pipelines ?? [];
        setStStatuses(statuses);
        setPipelines(pipelineList);
        if (ps.scopeError) setScopeError(ps.scopeError);
        if (!pipelineId && pipelineList.length > 0)
          setPipelineId(pipelineList[0].id);
      })
      .catch(() =>
        setError('Failed to load pipeline data — check your connections.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [projectId]);

  const provisionPipeline = async () => {
    setProvisioning(true);
    try {
      const created = await jobsApi.provisionDefaultPipeline(projectId, job.id);
      await fetchData();
      if (created?.id) setPipelineId(created.id);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e.response?.data?.message ?? 'Failed to create default pipeline',
      );
    } finally {
      setProvisioning(false);
    }
  };

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const stages = selectedPipeline?.stages ?? [];

  const srcLabel = job.sourceObject ?? 'source';
  const dstLabel = job.destObject ?? 'destination';

  const handleSave = async () => {
    setSaving(true);
    try {
      const mapping = Object.fromEntries(
        Object.entries(statusMapping).filter(([, v]) => v),
      );
      await jobsApi.updateJob(projectId, job.id, {
        destPipelineId: pipelineId || null,
        statusMapping: Object.keys(mapping).length > 0 ? mapping : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast.success('Pipeline settings saved!');
      refetch();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast.error(
        e?.response?.data?.message ??
          'Failed to save pipeline settings. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center justify-center gap-3 py-20">
          <Spinner />
          <span className="text-sm">Loading pipeline data…</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <AlertTriangle className="text-destructive size-5" />
          <span className="text-destructive text-sm">{error}</span>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h3 className="mb-1 font-semibold">HubSpot Pipeline</h3>
            <p className="text-muted-foreground text-xs">
              Choose which HubSpot pipeline synced{' '}
              <strong className="text-foreground">{dstLabel}</strong> records
              are placed into.
            </p>
          </div>

          {pipelines.length === 0 ? (
            <div className="space-y-3">
              {scopeError ? (
                <div className="bg-destructive/10 flex items-start gap-3 rounded-xl px-4 py-3 text-xs">
                  <AlertTriangle className="text-destructive mt-0.5 size-3.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-destructive font-semibold">
                      HubSpot private app is missing required scopes
                    </p>
                    <p className="text-muted-foreground">
                      The private app token does not have permission to access{' '}
                      <strong>{dstLabel}</strong> pipelines. To fix this:
                    </p>
                    <ol className="text-muted-foreground list-inside list-decimal space-y-1">
                      <li>
                        Open HubSpot → Settings → Integrations → Private Apps
                      </li>
                      <li>
                        Select your app and go to the <strong>Scopes</strong>{' '}
                        tab
                      </li>
                      <li>
                        Add these scopes:{' '}
                        <code className="bg-muted text-primary rounded px-1.5 py-0.5 text-[11px]">
                          crm.objects.{dstLabel.toLowerCase()}.read
                        </code>{' '}
                        and{' '}
                        <code className="bg-muted text-primary rounded px-1.5 py-0.5 text-[11px]">
                          crm.objects.{dstLabel.toLowerCase()}.write
                        </code>
                      </li>
                      <li>
                        Click <strong>Save</strong> — the existing token will
                        automatically gain the new scopes
                      </li>
                    </ol>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchData}
                      className="mt-1"
                    >
                      <RefreshCw /> Check again after updating scopes
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-warning/10 flex items-start gap-3 rounded-xl px-4 py-3 text-xs">
                    <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-warning font-medium">
                        No pipelines configured for{' '}
                        <span className="font-bold">{dstLabel}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Click <strong>Auto-Create Default Pipeline</strong> to
                        create one automatically, or go to HubSpot → Settings →
                        Pipelines and create one manually, then click Refresh.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={provisionPipeline} disabled={provisioning}>
                      {provisioning ? (
                        <>
                          <RefreshCw className="animate-spin" /> Creating…
                        </>
                      ) : (
                        <>
                          <GitBranch /> Auto-Create Default Pipeline
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={fetchData}
                      disabled={provisioning}
                    >
                      <RefreshCw /> Refresh
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Select
              value={pipelineId}
              onValueChange={(v) => {
                setPipelineId(v);
                setStatusMapping({});
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="— Select a pipeline —" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {pipelineId && stages.length > 0 && stStatuses.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div className="bg-muted/40 border-b px-6 py-4">
            <h3 className="font-semibold">Status → Stage Mapping</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Map each source{' '}
              <strong className="text-foreground">{srcLabel}</strong> status to
              a HubSpot pipeline stage.
            </p>
          </div>
          <div className="bg-muted/40 text-muted-foreground grid grid-cols-2 border-b px-6 py-2 text-xs font-semibold tracking-wider uppercase">
            <span>Source Status</span>
            <span>HubSpot Stage</span>
          </div>
          <div className="divide-y">
            {stStatuses.map((status) => (
              <div
                key={status}
                className="grid grid-cols-2 items-center gap-4 px-6 py-3"
              >
                <span className="text-sm font-medium">{status}</span>
                <Select
                  value={statusMapping[status] ?? '__unmapped'}
                  onValueChange={(v) =>
                    setStatusMapping((prev) => ({
                      ...prev,
                      [status]: v === '__unmapped' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unmapped">— Not mapped —</SelectItem>
                    {stages
                      .sort(
                        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
                      )
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {pipelineId && stStatuses.length === 0 && (
        <div className="bg-warning/10 text-warning flex items-center gap-2 rounded-xl px-4 py-3 text-xs">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>
            Could not load source statuses. Pipeline will be set but stage
            mapping won't be configured.
          </span>
        </div>
      )}

      {pipelines.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !pipelineId}>
            {saving ? (
              <Spinner />
            ) : saved ? (
              <Check />
            ) : (
              <GitBranch className="rotate-90" />
            )}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Pipeline Config'}
          </Button>
        </div>
      )}
    </div>
  );
}
