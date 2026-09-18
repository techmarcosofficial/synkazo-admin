import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface RunJobDialogValues {
  fullSync: boolean;
  maxRecords?: number;
  startDate?: string;
  endDate?: string;
}

interface RunJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobName: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: RunJobDialogValues) => void;
}

// Manual run form. Never sends an enforcement/bypass flag — the API
// derives platform_override from the caller's identity server-side
// (SA-603). Submit stays disabled while pending so double-click cannot
// bypass backend idempotency (SA-604) even at the UI layer.
export default function RunJobDialog({
  open,
  onOpenChange,
  jobName,
  isSubmitting,
  errorMessage,
  onSubmit,
}: RunJobDialogProps) {
  const [fullSync, setFullSync] = useState(false);
  const [maxRecords, setMaxRecords] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!open) {
      setFullSync(false);
      setMaxRecords('');
      setStartDate('');
      setEndDate('');
    }
  }, [open]);

  // Backend validates too, but we keep the button from firing when the
  // dates would be rejected — friendlier than a round-trip 400.
  const maxRecordsValue = maxRecords ? Number(maxRecords) : undefined;
  const maxRecordsValid = !maxRecords || Number.isFinite(maxRecordsValue);
  const datesProvided = !!startDate || !!endDate;
  const datesOnlyValidWithFullSync = !datesProvided || fullSync;
  const datesOnlyValidWithoutMaxRecords =
    !datesProvided || maxRecordsValue === undefined;
  const dateOrder =
    !startDate ||
    !endDate ||
    new Date(startDate).getTime() <= new Date(endDate).getTime();
  const canSubmit =
    maxRecordsValid &&
    datesOnlyValidWithFullSync &&
    datesOnlyValidWithoutMaxRecords &&
    dateOrder &&
    !isSubmitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      fullSync,
      maxRecords: maxRecordsValue,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run {jobName}</DialogTitle>
          <DialogDescription>
            The Super Admin operation context bypasses this
            organisation&rsquo;s plan limits for this run only. Scheduled runs
            keep enforcing the customer&rsquo;s real plan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="run-full-sync"
              checked={fullSync}
              onCheckedChange={(v) => setFullSync(!!v)}
            />
            <div className="flex flex-col">
              <Label htmlFor="run-full-sync">Full re-sync</Label>
              <span className="text-muted-foreground text-xs">
                Ignore the last-synced cursor and process every record from the
                source.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="run-max-records">Max records</Label>
            <Input
              id="run-max-records"
              type="number"
              min={1}
              value={maxRecords}
              onChange={(e) => setMaxRecords(e.target.value)}
              placeholder="Unbounded"
            />
            <span className="text-muted-foreground text-xs">
              Cap the number of records this run will read. Leave empty for no
              cap.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="run-start-date">Start date</Label>
              <Input
                id="run-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="run-end-date">End date</Label>
              <Input
                id="run-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {datesProvided && !fullSync ? (
            <Alert>
              <AlertDescription>
                Date-bounded runs require Full re-sync. Enable it or clear the
                dates.
              </AlertDescription>
            </Alert>
          ) : null}
          {datesProvided && maxRecordsValue !== undefined ? (
            <Alert>
              <AlertDescription>
                Date bounds and max records cannot both be set. Clear one.
              </AlertDescription>
            </Alert>
          ) : null}
          {!dateOrder ? (
            <Alert variant="destructive">
              <AlertDescription>
                Start date must be before end date.
              </AlertDescription>
            </Alert>
          ) : null}
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isSubmitting ? 'Queueing…' : 'Run now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
