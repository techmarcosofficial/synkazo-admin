import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Link2,
  type LucideIcon,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { migrationApi } from '@/api/migration';
import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import SkeletonList from '@/components/shared/skeletons/SkeletonList';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ConnectionExt } from '@/features/projects/hooks';
import { useHeaderPrimaryAction } from '@/hooks/useHeaderPrimaryAction';
import { cn } from '@/lib/utils';

type FilterKey = 'all' | 'missing' | 'selected' | 'in_sync';

interface SchemaGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  items: MigrationDiffItem[];
}

interface MigrationDiffItem {
  identityKey: string;
  kind: 'custom_object' | 'property' | 'association';
  displayName: string;
  objectType?: string;
  status: 'missing' | 'in_sync' | 'conflict';
  conflictReason?: string;
}

interface MigrationDiff {
  ready: boolean;
  sandboxConnected: boolean;
  productionConnected: boolean;
  customObjects: MigrationDiffItem[];
  properties: MigrationDiffItem[];
  associations: MigrationDiffItem[];
}

interface MigrationRunItem {
  id: string;
  kind: string;
  displayName: string;
  status: string;
  errorMessage?: string | null;
}

interface MigrationRun {
  id: string;
  status: string;
  fromEnvironment: string;
  toEnvironment: string;
  startedAt: string;
  succeeded: number;
  skipped: number;
  failed: number;
}

function GroupSection({
  icon: Icon,
  title,
  trailing,
  children,
}: {
  icon: LucideIcon;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="text-muted-foreground bg-muted/50 hover:bg-muted/70 flex cursor-pointer items-center justify-between gap-2.5 px-5 py-3 text-sm font-semibold transition-colors"
      >
        <span className="flex items-center gap-2.5">
          {open ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )}
          <Icon className="size-3.5 shrink-0" />
          {title}
        </span>
        {trailing && (
          <span
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {trailing}
          </span>
        )}
      </div>
      {open && children}
    </div>
  );
}

function filterGroupItems(
  items: MigrationDiffItem[],
  filter: FilterKey,
  selected: Set<string>,
) {
  switch (filter) {
    case 'missing':
      return items.filter((i) => i.status === 'missing');
    case 'selected':
      return items.filter((i) => selected.has(i.identityKey));
    case 'in_sync':
      return items.filter((i) => i.status === 'in_sync');
    default:
      return items;
  }
}

function SandboxPanel({
  groups,
  filter,
  selected,
  onToggle,
  onToggleAll,
  label,
  connected,
  onConnect,
}: {
  groups: SchemaGroup[];
  filter: FilterKey;
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (items: MigrationDiffItem[]) => void;
  label: string;
  connected: boolean;
  onConnect: () => void;
}) {
  const visibleGroups = groups
    .map((g) => ({ ...g, items: filterGroupItems(g.items, filter, selected) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="bg-card h-fit overflow-hidden rounded-4xl border">
      <div className="bg-muted flex items-center justify-between border-b px-3 py-2">
        <div>
          <h3 className="text-md font-bold">{label}</h3>
          <p className="text-muted-foreground text-xs">Source</p>
        </div>
        <StatusBadge
          status={connected ? 'connected' : 'disconnected'}
          size="xs"
        />
      </div>

      {!connected ? (
        <EmptyState
          icon={PlugZap}
          title={`${label} not connected`}
          description={`Connect ${label} to compare schema changes.`}
          action={{
            label: `Connect ${label}`,
            icon: PlugZap,
            onClick: onConnect,
          }}
        />
      ) : visibleGroups.length === 0 ? (
        <div className="text-muted-foreground px-4 py-6 text-center text-xs">
          Nothing to show for this filter.
        </div>
      ) : (
        visibleGroups.map((group) => {
          const missingInGroup = group.items.filter(
            (i) => i.status === 'missing',
          );
          const selectedInGroup = missingInGroup.filter((i) =>
            selected.has(i.identityKey),
          );
          const groupChecked: boolean | 'indeterminate' =
            selectedInGroup.length === 0
              ? false
              : selectedInGroup.length === missingInGroup.length
                ? true
                : 'indeterminate';

          return (
            <GroupSection
              key={group.key}
              icon={group.icon}
              title={group.title}
              trailing={
                missingInGroup.length > 0 && (
                  <>
                    <span className="text-muted-foreground font-normal">
                      {selectedInGroup.length} / {missingInGroup.length}
                    </span>
                    <Checkbox
                      checked={groupChecked}
                      onCheckedChange={() => onToggleAll(missingInGroup)}
                    />
                  </>
                )
              }
            >
              {group.items.map((item) => (
                <ListRow key={item.identityKey} className="gap-2.5">
                  {item.status === 'missing' ? (
                    <Checkbox
                      checked={selected.has(item.identityKey)}
                      onCheckedChange={() => onToggle(item.identityKey)}
                    />
                  ) : item.status === 'conflict' ? (
                    <AlertCircle className="text-destructive size-4 shrink-0" />
                  ) : (
                    <Check className="text-success size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {item.displayName}
                  </span>
                  <StatusBadge status={item.status} size="xs" />
                </ListRow>
              ))}
            </GroupSection>
          );
        })
      )}
    </div>
  );
}

function ProductionPanel({
  groups,
  selected,
  label,
  sourceLabel,
  connected,
  onConnect,
}: {
  groups: SchemaGroup[];
  selected: Set<string>;
  label: string;
  sourceLabel: string;
  connected: boolean;
  onConnect: () => void;
}) {
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.status === 'in_sync' ||
          i.status === 'conflict' ||
          selected.has(i.identityKey),
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="bg-card h-fit overflow-hidden rounded-4xl border">
      <div className="bg-muted flex items-center justify-between border-b px-3 py-2">
        <div>
          <h3 className="text-md font-bold">{label}</h3>
          <p className="text-muted-foreground text-xs">Target</p>
        </div>
        <StatusBadge
          status={connected ? 'connected' : 'disconnected'}
          size="xs"
        />
      </div>

      {!connected ? (
        <EmptyState
          icon={PlugZap}
          title={`${label} not connected`}
          description={`Connect ${label} to compare and transfer schema changes.`}
          action={{
            label: `Connect ${label}`,
            icon: PlugZap,
            onClick: onConnect,
          }}
        />
      ) : visibleGroups.length === 0 ? (
        <div className="text-muted-foreground px-4 py-6 text-center text-xs">
          Check items in {sourceLabel} to preview them here.
        </div>
      ) : (
        visibleGroups.map((group) => (
          <GroupSection
            key={group.key}
            icon={group.icon}
            title={group.title}
            trailing={
              <span className="text-muted-foreground font-normal">
                {group.items.length}
              </span>
            }
          >
            {group.items.map((item) => {
              const pending = item.status === 'missing';
              return (
                <ListRow key={item.identityKey} className="gap-2.5">
                  {item.status === 'in_sync' ? (
                    <Check className="text-success size-4 shrink-0" />
                  ) : item.status === 'conflict' ? (
                    <AlertCircle className="text-destructive size-4 shrink-0" />
                  ) : (
                    <ArrowRight className="text-primary size-4 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-mono text-sm',
                      pending && 'text-primary',
                    )}
                  >
                    {item.displayName}
                  </span>
                  <StatusBadge
                    status={pending ? 'ready_to_transfer' : item.status}
                    size="xs"
                  />
                </ListRow>
              );
            })}
          </GroupSection>
        ))
      )}
    </div>
  );
}

function ConfirmModal({
  selected,
  diff,
  fromLabel,
  toLabel,
  onConfirm,
  onCancel,
  migrating,
}: {
  selected: Set<string>;
  diff: MigrationDiff | null;
  fromLabel: string;
  toLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  migrating: boolean;
}) {
  const countOf = (kind: string) =>
    [...selected].filter((k) => {
      const allItems = [
        ...(diff?.customObjects ?? []),
        ...(diff?.properties ?? []),
        ...(diff?.associations ?? []),
      ];
      return allItems.find((i) => i.identityKey === k)?.kind === kind;
    }).length;

  const objects = countOf('custom_object');
  const props = countOf('property');
  const assocs = countOf('association');

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-xl">
              <ShieldCheck className="text-primary size-5" />
            </div>
            <div>
              <div>Confirm Schema Sync</div>
              <p className="text-muted-foreground flex items-center gap-1 text-xs font-normal">
                {fromLabel} <ArrowRight className="size-3" /> {toLabel}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Card className="py-0">
          <CardContent className="space-y-2 p-4">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              Items to create in {toLabel}
            </p>
            {objects > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Box className="text-primary size-3.5" />
                <span>
                  {objects} Custom Object{objects !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {props > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="text-primary size-3.5" />
                <span>
                  {props} Propert{props !== 1 ? 'ies' : 'y'}
                </span>
              </div>
            )}
            {assocs > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="text-primary size-3.5" />
                <span>
                  {assocs} Association Label{assocs !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert className="bg-warning/10 border-warning/20">
          <Info className="text-warning" />
          <AlertDescription className="text-warning">
            Items that already exist in {toLabel} will be skipped. This
            operation cannot be undone.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={migrating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={migrating}
            className="bg-primary hover:bg-primary/90 flex-1"
          >
            {migrating ? (
              <Spinner />
            ) : (
              <>
                Confirm Transfer <ArrowRight />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunHistoryRow({
  run,
  projectId,
}: {
  run: MigrationRun;
  projectId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<MigrationRunItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && !items) {
      setLoading(true);
      try {
        const data = await migrationApi.getRunItems(projectId, run.id);
        setItems(data as unknown as MigrationRunItem[]);
      } catch {
        setItems([]);
      }
      setLoading(false);
    }
    setExpanded((e) => !e);
  };

  return (
    <>
      <ListRow asChild className="px-4 py-2.5 text-xs">
        <button
          type="button"
          onClick={toggle}
          className="w-full flex-wrap text-left"
        >
          {loading ? (
            <RefreshCw className="text-muted-foreground size-2.5 shrink-0 animate-spin" />
          ) : expanded ? (
            <ChevronDown className="text-muted-foreground size-2.5 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground size-2.5 shrink-0" />
          )}

          <span className="text-muted-foreground shrink-0 font-mono">
            {new Date(run.startedAt).toLocaleString()}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {run.fromEnvironment} <ArrowRight className="size-3" />{' '}
            {run.toEnvironment}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {run.succeeded > 0 && (
              <span className="text-success inline-flex items-center">
                <Check className="size-3" />
                {run.succeeded}
              </span>
            )}
            {run.skipped > 0 && (
              <span className="text-muted-foreground">–{run.skipped}</span>
            )}
            {run.failed > 0 && (
              <span className="text-destructive inline-flex items-center">
                <X className="size-3" />
                {run.failed}
              </span>
            )}
            <StatusBadge status={run.status} size="sm" />
          </div>
        </button>
      </ListRow>

      {expanded && items && (
        <div className="bg-muted/40 divide-y border-b">
          {items.length === 0 ? (
            <div className="text-muted-foreground px-4 py-2 text-xs">
              No item details.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2 text-xs"
              >
                <StatusBadge status={item.status} size="xs" />
                <Badge className="bg-muted text-muted-foreground shrink-0 rounded-full capitalize">
                  {item.kind.replace('_', ' ')}
                </Badge>
                <span className="flex-1 truncate font-mono">
                  {item.displayName}
                </span>
                {item.errorMessage && (
                  <span
                    className="text-destructive max-w-[200px] truncate"
                    title={item.errorMessage}
                  >
                    {item.errorMessage}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

export default function MigrationPanel({
  projectId,
  connections,
  onGoToConnections,
}: {
  projectId: string;
  connections?: ConnectionExt[];
  onGoToConnections: () => void;
}) {
  const [diff, setDiff] = useState<MigrationDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [migrating, setMigrating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [runs, setRuns] = useState<MigrationRun[]>([]);
  const [lastResult, setLastResult] = useState<MigrationRun | null>(null);
  // Sandbox → Production is the common case (promoting sandbox-built schema live) and stays
  // the default; Production → Sandbox lets a project pull production's schema back down to
  // rebuild/refresh a sandbox, which previously had no path in this UI at all (item 40).
  const [reversed, setReversed] = useState(false);
  const fromEnv = reversed ? 'production' : 'sandbox';
  const toEnv = reversed ? 'sandbox' : 'production';
  const fromLabel = reversed ? 'Production' : 'Sandbox';
  const toLabel = reversed ? 'Sandbox' : 'Production';
  const [filter, setFilter] = useState<FilterKey>('missing');

  const loadDiff = useCallback(() => {
    setDiffLoading(true);
    setLastResult(null);
    migrationApi
      .diff(projectId, fromEnv, toEnv)
      .then((d: unknown) => {
        setDiff(d as MigrationDiff);
        setSelected(new Set());
      })
      .catch(() => toast.error('Failed to load schema diff'))
      .finally(() => setDiffLoading(false));
  }, [projectId, fromEnv, toEnv]);

  const loadRuns = useCallback(() => {
    migrationApi
      .listRuns(projectId)
      .then((r: unknown) => setRuns(r as MigrationRun[]))
      .catch(() => {});
  }, [projectId]);

  const hubspotConnSignature = (connections ?? [])
    .filter((c) => c.platformId === 'hubspot')
    .map((c) => `${c.environment}:${c.status}`)
    .sort()
    .join(',');

  useEffect(() => {
    loadDiff();
    loadRuns();
  }, [loadDiff, loadRuns, hubspotConnSignature]);

  useHeaderPrimaryAction({
    label: 'Sync Environment',
    icon: RefreshCw,
    onClick: loadDiff,
    loading: diffLoading,
  });

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleAll = (items: MigrationDiffItem[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = items.every((i) => next.has(i.identityKey));
      items.forEach((i) =>
        allOn ? next.delete(i.identityKey) : next.add(i.identityKey),
      );
      return next;
    });

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const run = (await migrationApi.run(
        projectId,
        Array.from(selected),
        fromEnv,
        toEnv,
      )) as unknown as MigrationRun;
      setLastResult(run);
      setShowConfirm(false);
      setSelected(new Set());
      const msg = `Sync ${run.status}: ${run.succeeded} created, ${run.skipped ?? 0} skipped, ${run.failed} failed`;
      run.failed === 0 ? toast.success(msg) : toast.warning(msg);
      loadDiff();
      loadRuns();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Sync failed');
    } finally {
      setMigrating(false);
    }
  };

  if (diffLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {['Sandbox', 'Production'].map((label) => (
            <div
              key={label}
              className="bg-card overflow-hidden rounded-4xl border"
            >
              <div className="bg-muted border-b px-3 py-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-1.5 h-3 w-14" />
              </div>
              <SkeletonList count={5} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bothConnected = diff?.ready;
  const sandboxOk = diff?.sandboxConnected ?? false;
  const productionOk = diff?.productionConnected ?? false;
  const sourceOk = reversed ? productionOk : sandboxOk;
  const targetOk = reversed ? sandboxOk : productionOk;

  const groups: SchemaGroup[] = [
    {
      key: 'customObjects',
      title: 'Custom Objects',
      icon: Box,
      items: diff?.customObjects ?? [],
    },
    {
      key: 'properties',
      title: 'Custom Properties',
      icon: Tag,
      items: diff?.properties ?? [],
    },
    {
      key: 'associations',
      title: 'Association Labels',
      icon: Link2,
      items: diff?.associations ?? [],
    },
  ];
  const allItems = groups.flatMap((g) => g.items);
  const missingItems = allItems.filter((i) => i.status === 'missing');
  const inSyncCount = allItems.filter((i) => i.status === 'in_sync').length;
  const hasDifferences = missingItems.length > 0;

  const filterCounts: Record<FilterKey, number> = {
    all: allItems.length,
    missing: missingItems.length,
    selected: selected.size,
    in_sync: inSyncCount,
  };
  const visibleForFilter = filterCounts[filter];

  return (
    <div className="space-y-4">
      {showConfirm && diff && (
        <ConfirmModal
          selected={selected}
          diff={diff}
          fromLabel={fromLabel}
          toLabel={toLabel}
          migrating={migrating}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleMigrate}
        />
      )}

      <Card>
        <CardHeader className="gap-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">
              Schema Changes
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setReversed((r) => !r)}
              disabled={diffLoading || migrating}
              title={`Switch to ${toLabel} → ${fromLabel}`}
            >
              <ArrowLeftRight className="text-muted-foreground size-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            {!bothConnected && (
              <span className="text-muted-foreground text-xs">
                Connect both environments to compare configuration.
              </span>
            )}
            {bothConnected && hasDifferences && (
              <span className="text-warning text-xs">
                {missingItems.length} change
                {missingItems.length !== 1 ? 's' : ''} available
              </span>
            )}
            {bothConnected && !hasDifferences && (
              <span className="text-success text-xs">Environments in sync</span>
            )}
            {bothConnected && selected.size > 0 && (
              <span className="text-foreground text-xs font-semibold">
                · {selected.size} selected
              </span>
            )}
          </CardDescription>
          {bothConnected && (
            <CardAction>
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as FilterKey)}
              >
                <TabsList>
                  <TabsTrigger value="all">
                    All ({filterCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="missing">
                    Missing ({filterCounts.missing})
                  </TabsTrigger>
                  <TabsTrigger value="selected">
                    Selected ({filterCounts.selected})
                  </TabsTrigger>
                  <TabsTrigger value="in_sync">
                    In Sync ({filterCounts.in_sync})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {bothConnected && visibleForFilter === 0 ? (
            <EmptyState
              icon={filter === 'in_sync' ? AlertCircle : CheckCircle2}
              title={
                filter === 'selected'
                  ? 'No items selected'
                  : filter === 'in_sync'
                    ? 'Nothing in sync yet'
                    : 'Nothing to transfer'
              }
              description={
                filter === 'selected'
                  ? `Check items in ${fromLabel} to stage them for transfer.`
                  : filter === 'in_sync'
                    ? `No ${fromLabel} items match ${toLabel} yet.`
                    : `Every item in ${fromLabel} already exists in ${toLabel}.`
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SandboxPanel
                groups={groups}
                filter={filter}
                selected={selected}
                onToggle={toggle}
                onToggleAll={toggleAll}
                label={fromLabel}
                connected={sourceOk}
                onConnect={onGoToConnections}
              />
              <ProductionPanel
                groups={groups}
                selected={selected}
                label={toLabel}
                sourceLabel={fromLabel}
                connected={targetOk}
                onConnect={onGoToConnections}
              />
            </div>
          )}

          {bothConnected && (
            <>
              {lastResult && (
                <Card
                  className={cn(
                    lastResult.failed === 0
                      ? 'bg-success/10 border-success/20'
                      : 'bg-warning/10 border-warning/20',
                  )}
                >
                  <CardContent className="flex flex-wrap items-center gap-3 text-sm">
                    <StatusBadge status={lastResult.status} />
                    {lastResult.succeeded > 0 && (
                      <span className="text-success inline-flex items-center gap-1">
                        <Check className="size-3.5" /> {lastResult.succeeded}{' '}
                        created
                      </span>
                    )}
                    {(lastResult.skipped ?? 0) > 0 && (
                      <span className="text-muted-foreground">
                        – {lastResult.skipped} skipped
                      </span>
                    )}
                    {lastResult.failed > 0 && (
                      <span className="text-destructive inline-flex items-center gap-1">
                        <X className="size-3.5" /> {lastResult.failed} failed
                      </span>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="sticky bottom-0">
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-muted-foreground text-sm">
                    {selected.size === 0 ? (
                      missingItems.length === 0 ? (
                        <span className="text-success">Nothing to sync</span>
                      ) : (
                        <span>Select items to sync to {toLabel}</span>
                      )
                    ) : (
                      <>
                        <span className="text-foreground font-semibold">
                          {selected.size}
                        </span>{' '}
                        item
                        {selected.size !== 1 ? 's' : ''} selected
                      </>
                    )}
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setShowConfirm(true)}
                    disabled={selected.size === 0}
                  >
                    Transfer {selected.size > 0 ? selected.size : ''} to{' '}
                    {toLabel} <ArrowRight />
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>

      {runs.length > 0 && (
        <div className="bg-card overflow-hidden rounded-4xl border">
          <div className="bg-muted flex items-center gap-2 border-b px-3 py-2">
            <Clock className="text-muted-foreground size-3.5" />
            <h3 className="text-lg font-semibold">Sync History</h3>
            <span className="text-muted-foreground text-xs">
              {runs.length} run{runs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            {runs.map((r) => (
              <RunHistoryRow key={r.id} run={r} projectId={projectId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
