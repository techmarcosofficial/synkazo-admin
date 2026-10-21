import { ListOrdered, Shuffle } from 'lucide-react';

import { PlanLock, PlanLockBadge } from '@/components/shared/PlanGate';
import StatusBadge from '@/components/shared/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

const PRIORITY_PLAN_MESSAGE =
  "Priority scheduling isn't available on your current plan. Upgrade to run jobs sequentially in priority order.";

export default function ExecutionModeControl({
  priorityMode,
  canUsePriorityScheduling = true,
  saving,
  error,
  onToggle,
  embedded = false,
}: {
  priorityMode: boolean;
  canUsePriorityScheduling?: boolean;
  saving: boolean;
  error?: string | null;
  onToggle: () => void;
  embedded?: boolean;
}) {
  const locked = !priorityMode && !canUsePriorityScheduling;
  const content = (
    <>
      <CardHeader
        visualLevel="section"
        className={embedded ? 'px-0' : undefined}
      >
        <CardTitle>Execution mode</CardTitle>
        <CardDescription>
          Choose whether jobs follow their own schedules or run sequentially.
        </CardDescription>
      </CardHeader>
      <CardContent className={embedded ? 'space-y-4 px-0' : 'space-y-4'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
              {priorityMode ? (
                <ListOrdered className="size-5" aria-hidden />
              ) : (
                <Shuffle className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={priorityMode ? 'priority' : 'individual'}
                  size="sm"
                />
                {locked && <PlanLockBadge label="Upgrade required" />}
              </div>
              <p className="text-muted-foreground text-sm">
                {priorityMode
                  ? 'Jobs run one at a time in priority order. Saved individual schedules are temporarily ignored.'
                  : 'Each job runs independently using its saved schedule.'}
              </p>
            </div>
          </div>
          <PlanLock locked={locked} message={PRIORITY_PLAN_MESSAGE}>
            <Switch
              checked={priorityMode}
              onCheckedChange={onToggle}
              disabled={saving || locked}
              aria-label="Use priority queue execution"
            />
          </PlanLock>
        </div>
        {saving && (
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Spinner /> Updating execution mode…
          </p>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </>
  );
  return embedded ? (
    <div className="space-y-4">{content}</div>
  ) : (
    <Card>{content}</Card>
  );
}
