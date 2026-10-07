import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  GitBranch,
  Info,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useJobDetailContext } from '../context';

import { jobsApi } from '@/api/jobs';
import HeadingPair from '@/components/shared/HeadingPair';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
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
  const [replicateStatus, setReplicateStatus] = useState(
    job.replicateSourceStatusToPipelineStage ?? false,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const srcLabel = job.sourceObject ?? 'source';
  const dstLabel = job.destObject ?? 'destination';

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
  const sortedStages = [...stages].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  const handleAutoMatch = () => {
    const newMapping: Record<string, string> = { ...statusMapping };
    let matchedCount = 0;

    stStatuses.forEach((status) => {
      const normStatus = status.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Exact match
      const exact = stages.find(
        (s) => s.label.toLowerCase().replace(/[^a-z0-9]/g, '') === normStatus,
      );
      if (exact) {
        newMapping[status] = exact.id;
        matchedCount++;
        return;
      }

      // 2. Completed / Won semantics
      if (normStatus.includes('complete') || normStatus.includes('finished')) {
        const match = stages.find((s) => {
          const l = s.label.toLowerCase();
          return (
            l.includes('won') ||
            l.includes('closed won') ||
            l.includes('complete')
          );
        });
        if (match) {
          newMapping[status] = match.id;
          matchedCount++;
          return;
        }
      }

      // 3. Canceled / Lost semantics
      if (normStatus.includes('cancel') || normStatus.includes('lost')) {
        const match = stages.find((s) => {
          const l = s.label.toLowerCase();
          return (
            l.includes('lost') ||
            l.includes('closed lost') ||
            l.includes('cancel')
          );
        });
        if (match) {
          newMapping[status] = match.id;
          matchedCount++;
          return;
        }
      }

      // 4. Scheduled / Booked semantics
      if (normStatus.includes('schedule') || normStatus.includes('book')) {
        const match = stages.find((s) => {
          const l = s.label.toLowerCase();
          return l.includes('schedule') || l.includes('appointment');
        });
        if (match) {
          newMapping[status] = match.id;
          matchedCount++;
          return;
        }
      }

      // 5. In Progress / Working / Dispatched semantics
      if (
        normStatus.includes('progress') ||
        normStatus.includes('work') ||
        normStatus.includes('dispatch')
      ) {
        const match = stages.find((s) => {
          const l = s.label.toLowerCase();
          return (
            l.includes('progress') ||
            l.includes('presentation') ||
            l.includes('decision')
          );
        });
        if (match) {
          newMapping[status] = match.id;
          matchedCount++;
          return;
        }
      }

      // 6. Substring match
      const substring = stages.find(
        (s) =>
          s.label.toLowerCase().includes(status.toLowerCase()) ||
          status.toLowerCase().includes(s.label.toLowerCase()),
      );
      if (substring) {
        newMapping[status] = substring.id;
        matchedCount++;
      }
    });

    setStatusMapping(newMapping);
    showToast.success(`Auto-matched ${matchedCount} status pairs.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mapping = Object.fromEntries(
        Object.entries(statusMapping).filter(([, v]) => v),
      );
      await jobsApi.updateJob(projectId, job.id, {
        destPipelineId: pipelineId || null,
        statusMapping: Object.keys(mapping).length > 0 ? mapping : null,
        replicateSourceStatusToPipelineStage: replicateStatus,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast.success('Pipeline settings saved successfully!');
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
          <span className="text-sm">Loading pipeline configuration…</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <AlertTriangle className="text-destructive size-5" />
          <span className="text-destructive text-sm font-medium">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 size-3.5" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Context Card */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                size="xs"
                className="bg-primary/10 text-primary gap-1 font-medium"
              >
                <ShieldCheck className="size-3 shrink-0" />
                <span>Required for HubSpot {dstLabel}</span>
              </Badge>
              {pipelineId ? (
                <Badge
                  variant="outline"
                  size="xs"
                  className="text-muted-foreground font-normal"
                >
                  Configured
                </Badge>
              ) : (
                <Badge
                  variant="destructive"
                  size="xs"
                  className="animate-pulse font-normal"
                >
                  Setup Required
                </Badge>
              )}
            </div>
            {pipelines.length > 0 && (
              <Button
                variant="outline"
                size="xs"
                onClick={fetchData}
                className="text-muted-foreground hover:text-foreground h-7 cursor-pointer text-xs"
              >
                <RefreshCw className="mr-1 size-3" /> Refresh Pipelines
              </Button>
            )}
          </div>

          <HeadingPair
            visualLevel="section"
            level="h3"
            title="HubSpot Pipeline & Stage Setup"
            subtitle={
              <>
                HubSpot requires every{' '}
                <strong className="text-foreground capitalize">
                  {dstLabel}
                </strong>{' '}
                record to live in a sales/service pipeline with defined stages.
                Choose where new records are placed and how their stages update
                as work progresses in{' '}
                <strong className="text-foreground capitalize">
                  {srcLabel}
                </strong>
                .
              </>
            }
          />
        </CardContent>
      </Card>

      {/* 1. Destination Pipeline Selector */}
      <Card>
        <CardContent className="space-y-4">
          <HeadingPair
            visualLevel="card"
            level="h4"
            title="1. Destination Pipeline"
            subtitle={
              <>
                Select which HubSpot pipeline will receive synced{' '}
                <strong className="text-foreground">{dstLabel}</strong> records.
              </>
            }
          />

          {pipelines.length === 0 ? (
            <div className="space-y-3">
              {scopeError ? (
                <div className="bg-destructive/10 flex items-start gap-3 rounded-2xl p-4 text-xs">
                  <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-destructive font-semibold">
                      HubSpot Private App is missing required permissions
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Your HubSpot access token cannot view or manage{' '}
                      <strong>{dstLabel}</strong> pipelines. To resolve this:
                    </p>
                    <ol className="text-muted-foreground list-inside list-decimal space-y-1 pl-1">
                      <li>
                        Go to HubSpot → <strong>Settings</strong> →{' '}
                        <strong>Integrations</strong> →{' '}
                        <strong>Private Apps</strong>
                      </li>
                      <li>
                        Open your Synkazo connection app and go to the{' '}
                        <strong>Scopes</strong> tab
                      </li>
                      <li>
                        Enable these scopes:{' '}
                        <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-[11px]">
                          crm.objects.{dstLabel.toLowerCase()}.read
                        </code>{' '}
                        and{' '}
                        <code className="bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-[11px]">
                          crm.objects.{dstLabel.toLowerCase()}.write
                        </code>
                      </li>
                      <li>
                        Click <strong>Save changes</strong>, then click re-check
                        below.
                      </li>
                    </ol>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchData}
                      className="mt-2 text-xs"
                    >
                      <RefreshCw className="mr-1 size-3.5" /> Re-check
                      permissions
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-warning/30 bg-warning/5 space-y-3 rounded-2xl border p-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="text-foreground font-semibold">
                        No pipelines found for {dstLabel} in HubSpot
                      </p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        HubSpot requires at least one pipeline to store{' '}
                        {dstLabel} records. You can create one instantly with
                        default stages, or create one manually in HubSpot.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={provisionPipeline}
                      disabled={provisioning}
                      size="sm"
                      className="text-xs font-semibold"
                    >
                      {provisioning ? (
                        <>
                          <Spinner className="mr-1.5 size-3.5" /> Creating
                          Pipeline…
                        </>
                      ) : (
                        <>
                          <GitBranch className="mr-1.5 size-3.5" /> Auto-Create
                          Default Pipeline
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchData}
                      disabled={provisioning}
                      className="text-xs"
                    >
                      <RefreshCw className="mr-1.5 size-3.5" /> Refresh
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Select
                value={pipelineId}
                onValueChange={(v) => {
                  setPipelineId(v);
                  setStatusMapping({});
                }}
              >
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="— Select a HubSpot Pipeline —" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label} ({p.stages?.length ?? 0} stages)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Visual Pipeline Stage Funnel Preview */}
              {sortedStages.length > 0 && (
                <div className="border-border/70 bg-muted/20 space-y-2 rounded-xl border p-3.5">
                  <div className="text-muted-foreground flex items-center justify-between text-[11px] font-medium">
                    <span>
                      Stages in this pipeline ({sortedStages.length}):
                    </span>
                    <span>Order: Left to Right</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sortedStages.map((stage, idx) => (
                      <div key={stage.id} className="flex items-center gap-1.5">
                        <span className="border-border/80 bg-background text-foreground inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-2xs">
                          <span className="bg-primary/10 text-primary flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span>{stage.label}</span>
                        </span>
                        {idx < sortedStages.length - 1 && (
                          <ArrowRight className="text-muted-foreground/60 size-3 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. How should stages be updated? (Two Visual Choice Cards) */}
      {pipelines.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <HeadingPair
              visualLevel="card"
              level="h4"
              title="2. Stage Synchronization Mode"
              subtitle="Choose how statuses from your source system should reflect in HubSpot stages."
            />

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Option A: Automatic Stage Matching */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setReplicateStatus(true)}
                onKeyDown={(e) => e.key === 'Enter' && setReplicateStatus(true)}
                className={cn(
                  'flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all select-none',
                  replicateStatus
                    ? 'border-primary bg-primary/[0.03] ring-1.5 ring-primary/80 shadow-xs'
                    : 'border-border/70 hover:border-border bg-card hover:bg-muted/10',
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
                        <Sparkles className="size-4" />
                      </div>
                      <span className="text-foreground text-xs font-semibold">
                        Automatic Matching
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="bg-primary/10 text-primary text-[10px] font-medium"
                    >
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Source statuses (e.g. <em>Scheduled</em>, <em>Completed</em>
                    ) match or auto-create corresponding deal stages in HubSpot
                    by name. No manual mapping needed.
                  </p>
                </div>
                <div className="text-primary mt-4 flex items-center gap-1.5 text-[11px] font-medium">
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    {replicateStatus ? 'Selected (Active)' : 'Click to select'}
                  </span>
                </div>
              </div>

              {/* Option B: Custom Stage Mapping */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setReplicateStatus(false)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && setReplicateStatus(false)
                }
                className={cn(
                  'flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all select-none',
                  !replicateStatus
                    ? 'border-primary bg-primary/[0.03] ring-1.5 ring-primary/80 shadow-xs'
                    : 'border-border/70 hover:border-border bg-card hover:bg-muted/10',
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted text-foreground flex size-7 items-center justify-center rounded-lg">
                        <SlidersHorizontal className="size-4" />
                      </div>
                      <span className="text-foreground text-xs font-semibold">
                        Custom Stage Mapping
                      </span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Manually assign each source status to a specific stage in
                    HubSpot. Best when your source statuses and HubSpot stages
                    have different names.
                  </p>
                </div>
                <div className="text-primary mt-4 flex items-center gap-1.5 text-[11px] font-medium">
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    {!replicateStatus ? 'Selected (Active)' : 'Click to select'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Custom Status -> Stage Mapping (Visible when Custom is selected) */}
      {!replicateStatus && pipelineId && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <HeadingPair
                visualLevel="card"
                level="h4"
                title="3. Status → Stage Mapping"
                subtitle={
                  <>
                    Map each{' '}
                    <strong className="text-foreground">{srcLabel}</strong>{' '}
                    status to a stage in{' '}
                    <strong className="text-foreground">
                      {selectedPipeline?.label || 'HubSpot'}
                    </strong>
                    .
                  </>
                }
              />
              {stStatuses.length > 0 && stages.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoMatch}
                  className="cursor-pointer gap-1.5 text-xs font-medium"
                >
                  <Wand2 className="text-primary size-3.5" />
                  <span>Auto-Match Similar</span>
                </Button>
              )}
            </div>

            {stStatuses.length === 0 ? (
              <div className="border-warning/30 bg-warning/5 text-muted-foreground rounded-xl border p-4 text-xs">
                <p className="text-warning font-medium">
                  Source statuses could not be loaded
                </p>
                <p className="mt-0.5">
                  Your pipeline will be set, and new records will be placed in
                  the first stage by default.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {stStatuses.map((status) => (
                  <div
                    key={status}
                    className="border-border/70 bg-card hover:border-border flex flex-col justify-between gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:w-1/3">
                      <span className="text-foreground truncate text-xs font-semibold">
                        {status}
                      </span>
                      <Badge
                        variant="outline"
                        size="xs"
                        className="text-muted-foreground font-mono text-[10px] uppercase"
                      >
                        {srcLabel}
                      </Badge>
                    </div>

                    <div className="hidden shrink-0 items-center justify-center sm:flex">
                      <ArrowRight className="text-muted-foreground/60 size-4" />
                    </div>

                    <div className="w-full sm:w-1/2">
                      <Select
                        value={statusMapping[status] ?? '__unmapped'}
                        onValueChange={(v) =>
                          setStatusMapping((prev) => ({
                            ...prev,
                            [status]: v === '__unmapped' ? '' : v,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 w-full text-xs">
                          <SelectValue placeholder="— Use First Stage by Default —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="__unmapped"
                            className="text-muted-foreground text-xs"
                          >
                            — Use First Stage (
                            {sortedStages[0]?.label || 'Default'}) —
                          </SelectItem>
                          {sortedStages.map((s, idx) => (
                            <SelectItem
                              key={s.id}
                              value={s.id}
                              className="text-xs"
                            >
                              {idx + 1}. {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}

                <p className="text-muted-foreground flex items-center gap-1.5 pt-1 text-xs">
                  <Info className="text-primary size-3.5 shrink-0" />
                  <span>
                    Any status left unmapped will place new records into the
                    pipeline's first stage by default.
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Action Bar */}
      {pipelines.length > 0 && (
        <div className="border-border/70 bg-card flex items-center justify-between rounded-2xl border p-4 shadow-xs">
          <div className="text-muted-foreground text-xs">
            {replicateStatus
              ? 'Automatic status replication is selected'
              : `${Object.values(statusMapping).filter(Boolean).length} of ${stStatuses.length} statuses mapped`}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !pipelineId}
            className="h-9 cursor-pointer gap-2 px-5 text-xs font-semibold"
          >
            {saving ? (
              <Spinner className="size-4" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Check className="size-4" />
            )}
            {saving
              ? 'Saving Settings…'
              : saved
                ? 'Settings Saved!'
                : 'Save Pipeline Config'}
          </Button>
        </div>
      )}
    </div>
  );
}
