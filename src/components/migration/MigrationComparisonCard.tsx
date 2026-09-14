import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  PlugZap,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import {
  filterMigrationItems,
  migrationCounts,
  migrationGroups,
  selectedKindCounts,
  type MigrationFilter,
  type MigrationGroup,
} from './migrationModel';

import type { MigrationDiff, MigrationDiffItem } from '@/api/migration';
import EmptyState from '@/components/shared/EmptyState';
import ListRow from '@/components/shared/list/ListRow';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
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
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="bg-muted/50 rounded-2xl px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DirectionSummary({
  fromLabel,
  toLabel,
  onReverse,
  disabled,
}: {
  fromLabel: string;
  toLabel: string;
  onReverse: () => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
      <div className="bg-muted/50 rounded-2xl px-4 py-3">
        <p className="text-muted-foreground text-xs font-medium uppercase">
          Source
        </p>
        <p className="mt-1 font-semibold">{fromLabel}</p>
        <p className="text-muted-foreground text-xs">Read configuration</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReverse}
        disabled={disabled}
        aria-label={`Reverse direction to ${toLabel} to ${fromLabel}`}
      >
        <ArrowLeftRight />
        Reverse
      </Button>
      <div className="bg-primary/5 border-primary/15 rounded-2xl border px-4 py-3">
        <p className="text-primary text-xs font-medium uppercase">Target</p>
        <p className="mt-1 font-semibold">{toLabel}</p>
        <p className="text-muted-foreground text-xs">Create selected items</p>
      </div>
    </div>
  );
}

function GroupSection({
  group,
  filter,
  selected,
  canManage,
  onToggle,
  onToggleAll,
}: {
  group: MigrationGroup;
  filter: MigrationFilter;
  selected: Set<string>;
  canManage: boolean;
  onToggle: (key: string) => void;
  onToggleAll: (items: MigrationDiffItem[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const items = filterMigrationItems(group.items, filter, selected);
  if (items.length === 0) return null;

  const selectable = items.filter((item) => item.status === 'missing');
  const selectedCount = selectable.filter((item) =>
    selected.has(item.identityKey),
  ).length;
  const checked: boolean | 'indeterminate' =
    selectedCount === 0
      ? false
      : selectedCount === selectable.length
        ? true
        : 'indeterminate';
  const Icon = group.icon;

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="bg-muted/50 flex items-center gap-3 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-2"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${group.title}`}
        >
          {open ? <ChevronDown /> : <ChevronRight />}
        </Button>
        <Icon className="text-muted-foreground size-4" />
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-sm font-semibold"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {group.title}
        </button>
        <Badge variant="secondary">{items.length}</Badge>
        {canManage && selectable.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs sm:inline">
              {selectedCount}/{selectable.length} selected
            </span>
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggleAll(selectable)}
              aria-label={`Select all missing ${group.title}`}
            />
          </div>
        )}
      </div>

      {open && (
        <div className="divide-y">
          {items.map((item) => (
            <ListRow
              key={item.identityKey}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
            >
              {item.status === 'missing' && canManage ? (
                <Checkbox
                  className="mt-0.5"
                  checked={selected.has(item.identityKey)}
                  onCheckedChange={() => onToggle(item.identityKey)}
                  aria-label={`Select ${item.displayName}`}
                />
              ) : item.status === 'conflict' ? (
                <AlertCircle className="text-destructive mt-0.5 size-4" />
              ) : (
                <Check className="text-success mt-0.5 size-4" />
              )}
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{item.displayName}</p>
                {item.objectType && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {item.objectType}
                  </p>
                )}
                {item.conflictReason && (
                  <p className="text-destructive mt-1 text-xs">
                    {item.conflictReason}
                  </p>
                )}
              </div>
              <StatusBadge status={item.status} size="xs" />
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}

function TransferConfirmation({
  open,
  groups,
  selected,
  fromLabel,
  toLabel,
  migrating,
  migrationError,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  groups: MigrationGroup[];
  selected: Set<string>;
  fromLabel: string;
  toLabel: string;
  migrating: boolean;
  migrationError: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const counts = selectedKindCounts(groups, selected);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="bg-primary/10 flex size-10 items-center justify-center rounded-xl">
              <ShieldCheck className="text-primary size-5" />
            </span>
            Confirm configuration transfer
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {fromLabel} <ArrowRight className="size-4" /> {toLabel}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Metric label="Objects" value={counts.customObjects} />
            <Metric label="Properties" value={counts.properties} />
            <Metric label="Associations" value={counts.associations} />
          </div>
        </div>

        <Alert className="border-warning/20 bg-warning/10">
          <Info className="text-warning" />
          <AlertDescription>
            Only missing items are created. Items that appear during the run or
            already exist in {toLabel} are safely skipped. Created configuration
            is not automatically removed if you later reverse direction.
          </AlertDescription>
        </Alert>

        {migrationError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Transfer could not complete</AlertTitle>
            <AlertDescription>{migrationError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={migrating}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={migrating}>
            {migrating ? <Spinner /> : <ArrowRight />}
            {migrating ? 'Transferring…' : `Transfer to ${toLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MigrationComparisonCard({
  diff,
  diffError,
  selected,
  filter,
  reversed,
  migrating,
  migrationError,
  canManage,
  onFilterChange,
  onReverse,
  onToggle,
  onToggleAll,
  onRefresh,
  onTransfer,
  onGoToConnections,
}: {
  diff: MigrationDiff | null;
  diffError: string | null;
  selected: Set<string>;
  filter: MigrationFilter;
  reversed: boolean;
  migrating: boolean;
  migrationError: string | null;
  canManage: boolean;
  onFilterChange: (filter: MigrationFilter) => void;
  onReverse: () => void;
  onToggle: (key: string) => void;
  onToggleAll: (items: MigrationDiffItem[]) => void;
  onRefresh: () => void;
  onTransfer: () => Promise<void>;
  onGoToConnections: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fromLabel = reversed ? 'Production' : 'Sandbox';
  const toLabel = reversed ? 'Sandbox' : 'Production';
  const groups = migrationGroups(diff);
  const counts = migrationCounts(groups, selected);
  const sourceConnected = reversed
    ? diff?.productionConnected
    : diff?.sandboxConnected;
  const targetConnected = reversed
    ? diff?.sandboxConnected
    : diff?.productionConnected;
  const visibleCount = counts[filter];

  return (
    <Card>
      <TransferConfirmation
        open={confirmOpen}
        groups={groups}
        selected={selected}
        fromLabel={fromLabel}
        toLabel={toLabel}
        migrating={migrating}
        migrationError={migrationError}
        onOpenChange={(open) => !migrating && setConfirmOpen(open)}
        onConfirm={async () => {
          try {
            await onTransfer();
            setConfirmOpen(false);
          } catch {
            // The parent keeps the failure visible and preserves the selection.
          }
        }}
      />

      <CardHeader className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <CardTitle>Compare configuration</CardTitle>
          <CardDescription className="mt-1">
            Review differences first, then select only missing items to create
            in the target.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {!canManage && (
            <Badge variant="secondary">Admin access required to transfer</Badge>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw /> Refresh comparison
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <DirectionSummary
          fromLabel={fromLabel}
          toLabel={toLabel}
          onReverse={onReverse}
          disabled={migrating}
        />

        {diffError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Comparison unavailable</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{diffError}</span>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!diffError && diff && !diff.ready && (
          <Alert>
            <PlugZap />
            <AlertTitle>Connect both environments</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                {diff.message ??
                  'Sandbox and Production must both be connected before configuration can be compared.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  status={sourceConnected ? 'connected' : 'disconnected'}
                  size="sm"
                />
                <span className="text-sm">{fromLabel} source</span>
                <StatusBadge
                  status={targetConnected ? 'connected' : 'disconnected'}
                  size="sm"
                />
                <span className="text-sm">{toLabel} target</span>
                <Button size="sm" onClick={onGoToConnections}>
                  Configure connections
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!diffError && diff?.ready && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Available" value={counts.missing} tone="warning" />
              <Metric label="Selected" value={counts.selected} />
              <Metric label="In sync" value={counts.in_sync} tone="success" />
              <Metric label="Conflicts" value={counts.conflict} tone="danger" />
            </div>

            {counts.conflict > 0 && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>
                  {counts.conflict} conflicting item
                  {counts.conflict === 1 ? '' : 's'} cannot be selected. Review
                  the reason before changing either environment.
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto pb-1">
              <Tabs
                value={filter}
                onValueChange={(value) =>
                  onFilterChange(value as MigrationFilter)
                }
              >
                <TabsList>
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                  <TabsTrigger value="missing">
                    Available ({counts.missing})
                  </TabsTrigger>
                  <TabsTrigger value="selected">
                    Selected ({counts.selected})
                  </TabsTrigger>
                  <TabsTrigger value="conflict">
                    Conflicts ({counts.conflict})
                  </TabsTrigger>
                  <TabsTrigger value="in_sync">
                    In sync ({counts.in_sync})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {visibleCount === 0 ? (
              <EmptyState
                icon={filter === 'conflict' ? AlertCircle : CheckCircle2}
                title={
                  filter === 'selected'
                    ? 'No items selected'
                    : filter === 'conflict'
                      ? 'No conflicts found'
                      : filter === 'missing'
                        ? 'Environments are in sync'
                        : 'No items in this view'
                }
                description={
                  filter === 'selected'
                    ? `Select available items to stage them for ${toLabel}.`
                    : filter === 'missing'
                      ? `Every comparable ${fromLabel} item already exists in ${toLabel}.`
                      : 'Choose another filter to review the comparison.'
                }
              />
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <GroupSection
                    key={group.key}
                    group={group}
                    filter={filter}
                    selected={selected}
                    canManage={canManage}
                    onToggle={onToggle}
                    onToggleAll={onToggleAll}
                  />
                ))}
              </div>
            )}

            <div className="bg-card sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold">
                  {selected.size === 0
                    ? counts.missing === 0
                      ? 'Nothing to transfer'
                      : 'Select items to transfer'
                    : `${selected.size} item${selected.size === 1 ? '' : 's'} selected`}
                </p>
                <p className="text-muted-foreground text-xs">
                  Target: {toLabel}. Existing items are skipped safely.
                </p>
              </div>
              {canManage && (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={selected.size === 0 || migrating}
                >
                  <ArrowRight /> Transfer to {toLabel}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
