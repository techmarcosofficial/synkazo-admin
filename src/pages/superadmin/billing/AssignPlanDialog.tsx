import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { AdminApiPlan } from '@/types/billing';

// GAP-051 / SA-702 — plan assignment dialog for the SA workspace.
// Shows a before/after limits diff so an operator can see what's
// tightening or loosening for the customer before they confirm. The
// reason field is stored client-side only (SA API doesn't currently
// accept a reason for plan changes — the server writes a generic
// assignment audit row; GAP-051 recommends threading the reason
// through as a follow-up). Diff rendering compares the two plans'
// `features` map, which the API returns as a flat Record<string,string>.

interface AssignPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: AdminApiPlan[];
  currentPlanId: string | null;
  currentPlanName: string | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (planId: string, reason: string) => void;
}

// Whitelist of feature keys we render with human-friendly labels.
// Anything else in the features map is rendered under its raw key.
const KNOWN_FEATURE_LABELS: Record<string, string> = {
  maxProjects: 'Max projects',
  maxJobs: 'Max jobs',
  maxRecordsPerMonth: 'Monthly records',
  maxTeamMembers: 'Team members',
  minIntervalMinutes: 'Min interval (minutes)',
  logRetentionDays: 'Log retention (days)',
  syncDirections: 'Sync directions',
  syncFrequencies: 'Sync frequencies',
  objectScope: 'Object scope',
  associationRules: 'Association rules',
  customObjects: 'Custom objects',
  customFields: 'Custom fields',
  jobDependencyChains: 'Job dependency chains',
  envMigration: 'Environment migration',
  priorityScheduling: 'Priority scheduling',
};

function labelFor(key: string): string {
  return KNOWN_FEATURE_LABELS[key] ?? key;
}

function formatValue(raw: string | undefined): string {
  if (raw === undefined) return '—';
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === 'null') return 'Unlimited';
  if (trimmed === 'true') return 'Yes';
  if (trimmed === 'false') return 'No';
  return trimmed;
}

interface DiffRow {
  key: string;
  label: string;
  currentValue: string;
  newValue: string;
  changed: boolean;
}

function buildDiff(
  current: Record<string, string> | null,
  next: Record<string, string> | null,
): DiffRow[] {
  const currentFeatures = current ?? {};
  const nextFeatures = next ?? {};
  const keys = Array.from(
    new Set([...Object.keys(currentFeatures), ...Object.keys(nextFeatures)]),
  ).sort((a, b) => labelFor(a).localeCompare(labelFor(b)));

  return keys.map((key) => {
    const currentRaw = currentFeatures[key];
    const nextRaw = nextFeatures[key];
    return {
      key,
      label: labelFor(key),
      currentValue: formatValue(currentRaw),
      newValue: formatValue(nextRaw),
      changed: currentRaw !== nextRaw,
    };
  });
}

export default function AssignPlanDialog({
  open,
  onOpenChange,
  plans,
  currentPlanId,
  currentPlanName,
  isSubmitting,
  errorMessage,
  onSubmit,
}: AssignPlanDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedPlanId('');
      setReason('');
    }
  }, [open]);

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === currentPlanId) ?? null,
    [plans, currentPlanId],
  );
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const diff = useMemo(
    () =>
      selectedPlan
        ? buildDiff(currentPlan?.features ?? null, selectedPlan.features)
        : [],
    [currentPlan, selectedPlan],
  );

  const reasonValid = reason.trim().length >= 10;
  const planSelectedAndDifferent =
    selectedPlanId.length > 0 && selectedPlanId !== currentPlanId;
  const canSubmit = planSelectedAndDifferent && reasonValid && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign plan</DialogTitle>
          <DialogDescription>
            Move the organisation to a different plan. The change takes effect
            immediately for entitlement checks; provider-side proration
            depends on the plan's Stripe subscription state.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Current plan</Label>
            <div className="text-sm">
              {currentPlanName ?? '—'}
              {currentPlanId ? (
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  {currentPlanId.slice(0, 8)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-plan-select">New plan</Label>
            <Select
              value={selectedPlanId}
              onValueChange={setSelectedPlanId}
            >
              <SelectTrigger id="assign-plan-select">
                <SelectValue placeholder="Choose a plan…" />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter((p) => p.isActive)
                  .map((plan) => (
                    <SelectItem
                      key={plan.id}
                      value={plan.id}
                      disabled={plan.id === currentPlanId}
                    >
                      {plan.name}
                      {plan.id === currentPlanId ? ' (current)' : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && diff.length > 0 ? (
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-sm font-medium">
                Limits comparison
              </div>
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Feature</th>
                      <th className="px-3 py-2 text-left">Current</th>
                      <th className="px-3 py-2 text-left">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((row) => (
                      <tr
                        key={row.key}
                        className={row.changed ? 'bg-amber-50' : ''}
                      >
                        <td className="px-3 py-1.5 font-medium">
                          {row.label}
                        </td>
                        <td className="text-muted-foreground px-3 py-1.5">
                          {row.currentValue}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.changed ? (
                            <span className="font-medium">{row.newValue}</span>
                          ) : (
                            <span className="text-muted-foreground">
                              {row.newValue}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t px-3 py-1.5 text-xs text-amber-900 bg-amber-50">
                <AlertTriangle
                  className="mr-1 inline size-3.5 -translate-y-0.5"
                  aria-hidden
                />
                Highlighted rows change with this assignment.
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-plan-reason">
              Reason
              <span className="text-muted-foreground ml-1 text-xs">
                (audit — min 10 characters)
              </span>
            </Label>
            <Textarea
              id="assign-plan-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this plan being assigned?"
              aria-invalid={reason.length > 0 && !reasonValid}
            />
            <div className="text-muted-foreground text-xs">
              {reason.trim().length}/10 characters
            </div>
          </div>

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
          <Button
            onClick={() => {
              if (!canSubmit) return;
              onSubmit(selectedPlanId, reason.trim());
            }}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Assigning…' : 'Assign plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
