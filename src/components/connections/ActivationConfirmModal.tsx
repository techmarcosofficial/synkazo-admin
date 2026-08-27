import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Link2,
  type LucideIcon,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  migrationApi,
  type MigrationDiffItem,
  type MigrationRun,
} from '@/api/migration';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { cn } from '@/lib/utils';
import { useEntitlements } from '@/queries/useEntitlements';
import type { ProjectEnvironment } from '@/types';

interface MigrationRunWithCounts extends MigrationRun {
  succeeded: number;
  failed: number;
  skipped?: number;
}

interface MigrationDiffResultItem extends MigrationDiffItem {
  id?: string;
  kind?: string;
  displayName?: string;
  errorMessage?: string | null;
}

const ITEM_STATUS_TONE: Record<string, string> = {
  completed: 'text-success',
  skipped: 'text-muted-foreground',
  failed: 'text-destructive',
};
const ITEM_STATUS_LABEL: Record<string, string> = {
  completed: 'Created',
  skipped: 'Skipped',
  failed: 'Failed',
};

function DiffSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: MigrationDiffItem[];
}) {
  const [open, setOpen] = useState(true);
  const missing = items.filter((i) => i.status === 'missing');
  if (missing.length === 0) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-xl border"
    >
      <CollapsibleTrigger className="bg-muted/40 flex w-full items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="text-warning size-3.5" />
          <span className="text-sm font-medium">{title}</span>
          <span className="text-warning text-xs">{missing.length} missing</span>
        </div>
        {open ? (
          <ChevronDown className="text-muted-foreground size-3.5" />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="divide-y">
        {missing.map((item) => (
          <div
            key={item.identityKey}
            className="flex items-center gap-2.5 px-4 py-2"
          >
            <span className="bg-warning size-1.5 shrink-0 rounded-full" />
            <span className="text-muted-foreground flex-1 truncate font-mono text-xs">
              {item.label ?? item.identityKey}
            </span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ActivationConfirmModalProps {
  projectId: string;
  targetEnv: ProjectEnvironment;
  currentEnv: ProjectEnvironment;
  diff?: {
    customObjects?: MigrationDiffItem[];
    properties?: MigrationDiffItem[];
    associations?: MigrationDiffItem[];
  };
  onActivate: (env: ProjectEnvironment) => void;
  activating: boolean;
  onClose: () => void;
}

export default function ActivationConfirmModal({
  projectId,
  targetEnv,
  currentEnv,
  diff,
  onActivate,
  activating,
  onClose,
}: ActivationConfirmModalProps) {
  const [step, setStep] = useState<'review' | 'migrating' | 'results'>(
    'review',
  );
  const [migrationRun, setMigrationRun] =
    useState<MigrationRunWithCounts | null>(null);
  const [runItems, setRunItems] = useState<MigrationDiffResultItem[]>([]);
  const { envMigration } = useEntitlements();
  const { prompt: promptUpgrade, dialog: upgradeDialog } =
    usePlanUpgradePrompt();
  const { confirm } = useConfirmDialog();

  const targetLabel = targetEnv === 'sandbox' ? 'Sandbox' : 'Production';
  const currentLabel = currentEnv === 'sandbox' ? 'Sandbox' : 'Production';

  const allItems = [
    ...(diff?.customObjects ?? []),
    ...(diff?.properties ?? []),
    ...(diff?.associations ?? []),
  ];
  const missingKeys = allItems
    .filter((i) => i.status === 'missing')
    .map((i) => i.identityKey);

  const missingObjects = (diff?.customObjects ?? []).filter(
    (i) => i.status === 'missing',
  );
  const missingProps = (diff?.properties ?? []).filter(
    (i) => i.status === 'missing',
  );
  const missingAssocs = (diff?.associations ?? []).filter(
    (i) => i.status === 'missing',
  );
  const totalMissing = missingKeys.length;

  const handleMigrateAndActivate = async () => {
    setStep('migrating');
    try {
      const run = await migrationApi.run(
        projectId,
        missingKeys,
        currentEnv,
        targetEnv,
      );
      setMigrationRun(run as MigrationRunWithCounts);
      try {
        const items = await migrationApi.getRunItems(projectId, run.id);
        setRunItems(items);
      } catch {
        setRunItems([]);
      }
      setStep('results');
    } catch (err) {
      setStep('review');
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(
        e?.response?.data?.message ??
          'Migration failed — see Environment Sync tab for details',
      );
    }
  };

  // Creates real, unremovable-from-here custom objects/properties/association labels in
  // targetEnv — irreversible, so it needs an explicit confirmation step rather than firing
  // straight off the button (previously it did — see item 8/9). Plan-gated first: env
  // migration is an Enterprise capability, and the button must stay clickable rather than
  // `disabled` so it can explain the lock instead of silently doing nothing.
  const confirmMigrateAndActivate = () => {
    if (!envMigration) {
      promptUpgrade(
        "Sandbox → production migration isn't available on your current plan. Upgrade to enable it.",
      );
      return;
    }
    confirm({
      variant: 'danger',
      title: `Migrate and activate ${targetLabel}?`,
      description: `This will create ${totalMissing} item${totalMissing !== 1 ? 's' : ''} in your ${targetLabel} environment. This cannot be undone from here.`,
      confirmLabel: `Migrate & Activate ${targetLabel}`,
      onConfirm: handleMigrateAndActivate,
    });
  };

  return (
    <>
      {upgradeDialog}
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent size="sm" className="flex max-h-[90vh] flex-col">
          {step === 'review' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-3">
                  <div className="bg-warning/10 mt-0.5 flex size-9 items-center justify-center rounded-xl">
                    <AlertTriangle className="text-warning size-4" />
                  </div>
                  <div>
                    <div>Activate {targetLabel}?</div>
                    <p className="text-muted-foreground text-xs font-normal">
                      Schema differences detected between environments
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 space-y-4 overflow-y-auto">
                <Alert className="bg-warning/10 border-warning/20">
                  <AlertCircle className="text-warning" />
                  <AlertDescription>
                    The{' '}
                    <span className="text-warning font-medium">
                      {currentLabel}
                    </span>{' '}
                    environment contains schema changes that do not exist in{' '}
                    <span className="text-warning font-medium">
                      {targetLabel}
                    </span>
                    . Activating without migration may affect jobs, mappings,
                    and sync functionality.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap items-center gap-2">
                  {missingObjects.length > 0 && (
                    <Badge className="bg-warning/10 text-warning gap-1.5">
                      <Box className="size-2.5" /> {missingObjects.length}{' '}
                      Custom Object
                      {missingObjects.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {missingProps.length > 0 && (
                    <Badge className="bg-warning/10 text-warning gap-1.5">
                      <Tag className="size-2.5" /> {missingProps.length} Propert
                      {missingProps.length !== 1 ? 'ies' : 'y'}
                    </Badge>
                  )}
                  {missingAssocs.length > 0 && (
                    <Badge className="bg-warning/10 text-warning gap-1.5">
                      <Link2 className="size-2.5" /> {missingAssocs.length}{' '}
                      Association
                      {missingAssocs.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Items missing in{' '}
                    <span className="text-foreground font-semibold">
                      {targetLabel}
                    </span>
                    :
                  </p>
                  <div className="space-y-2">
                    <DiffSection
                      title="Custom Objects"
                      icon={Box}
                      items={diff?.customObjects ?? []}
                    />
                    <DiffSection
                      title="Properties"
                      icon={Tag}
                      items={diff?.properties ?? []}
                    />
                    <DiffSection
                      title="Association Labels"
                      icon={Link2}
                      items={diff?.associations ?? []}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={confirmMigrateAndActivate}
                  className="bg-paused hover:bg-paused/90 w-full"
                >
                  <ShieldCheck />
                  Migrate & Activate {targetLabel}
                  <span className="text-xs opacity-70">
                    ({totalMissing} item{totalMissing !== 1 ? 's' : ''})
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onActivate(targetEnv)}
                  disabled={activating}
                  className="w-full"
                >
                  {activating ? <Spinner /> : null}
                  {activating ? 'Activating…' : 'Activate Without Migration'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="w-full"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'migrating' && (
            <div className="py-10 text-center">
              <div className="bg-paused/10 mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl">
                <Spinner className="text-paused size-6" />
              </div>
              <h3 className="mb-2 font-semibold">Migrating Schema…</h3>
              <p className="text-muted-foreground text-sm">
                Creating {totalMissing} item{totalMissing !== 1 ? 's' : ''} in{' '}
                <span className="text-foreground font-semibold">
                  {targetLabel}
                </span>
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                Do not close this window
              </p>
            </div>
          )}

          {step === 'results' && migrationRun && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl',
                      migrationRun.failed === 0
                        ? 'bg-success/10'
                        : 'bg-warning/10',
                    )}
                  >
                    {migrationRun.failed === 0 ? (
                      <CheckCircle2 className="text-success size-4" />
                    ) : (
                      <AlertTriangle className="text-warning size-4" />
                    )}
                  </div>
                  <div>
                    <div>Migration Complete</div>
                    <div className="flex items-center gap-3 text-xs font-normal">
                      {migrationRun.succeeded > 0 && (
                        <span className="text-success inline-flex items-center gap-1">
                          <Check className="size-3" /> {migrationRun.succeeded}{' '}
                          created
                        </span>
                      )}
                      {(migrationRun.skipped ?? 0) > 0 && (
                        <span className="text-muted-foreground">
                          – {migrationRun.skipped} skipped
                        </span>
                      )}
                      {migrationRun.failed > 0 && (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <X className="size-3" /> {migrationRun.failed} failed
                        </span>
                      )}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {runItems.length > 0 && (
                <div className="flex-1 divide-y overflow-y-auto">
                  {runItems.map((item) => {
                    const itemStatus = item.status as string;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 py-2 text-xs"
                      >
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            itemStatus === 'completed'
                              ? 'bg-success'
                              : itemStatus === 'failed'
                                ? 'bg-destructive'
                                : 'bg-muted-foreground',
                          )}
                        />
                        <span
                          className={cn(
                            'w-14 shrink-0 font-medium',
                            ITEM_STATUS_TONE[itemStatus] ?? 'text-success',
                          )}
                        >
                          {ITEM_STATUS_LABEL[itemStatus] ?? 'Created'}
                        </span>
                        <Badge
                          variant="secondary"
                          className="shrink-0 capitalize"
                        >
                          {item.kind?.replace('_', ' ')}
                        </Badge>
                        <span className="text-muted-foreground flex-1 truncate font-mono">
                          {item.displayName}
                        </span>
                        {item.errorMessage && (
                          <span
                            className="text-destructive max-w-[140px] truncate"
                            title={item.errorMessage}
                          >
                            {item.errorMessage}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button
                  onClick={() => onActivate(targetEnv)}
                  disabled={activating}
                  className="flex-1"
                >
                  {activating ? (
                    <Spinner />
                  ) : (
                    <>
                      Activate {targetLabel} <ArrowRight />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
