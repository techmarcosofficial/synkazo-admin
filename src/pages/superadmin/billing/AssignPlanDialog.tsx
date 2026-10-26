import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

const MIN_REASON = 10;

export const createAssignPlanSchema = (currentPlanId: string | null) =>
  z.object({
    planId: z
      .string()
      .trim()
      .min(1, 'Please select a plan to assign')
      .refine((id) => !currentPlanId || id !== currentPlanId, {
        message: 'Selected plan is already the current plan',
      }),
    reason: z
      .string()
      .trim()
      .min(MIN_REASON, `Audit reason must be at least ${MIN_REASON} characters`),
  });

export type AssignPlanFormValues = {
  planId: string;
  reason: string;
};

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
  const schema = useMemo(
    () => createAssignPlanSchema(currentPlanId),
    [currentPlanId],
  );

  const form = useForm<AssignPlanFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      planId: '',
      reason: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        planId: '',
        reason: '',
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (errorMessage) {
      if (/plan/i.test(errorMessage)) {
        form.setError('planId', { type: 'server', message: errorMessage });
      } else if (/reason/i.test(errorMessage)) {
        form.setError('reason', { type: 'server', message: errorMessage });
      }
    }
  }, [errorMessage, form]);

  const selectedPlanId = form.watch('planId');
  const reasonValue = form.watch('reason') ?? '';

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

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit(values.planId, values.reason.trim());
  });

  const isFieldServerError =
    Boolean(errorMessage) && /plan|reason/i.test(errorMessage ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Assign plan</DialogTitle>
            <DialogDescription>
              Assign a plan to this organisation.
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

            <Field>
              <FieldLabel htmlFor="assign-plan-select">
                New plan <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <FieldContent>
                <Select
                  value={selectedPlanId}
                  onValueChange={(val) =>
                    form.setValue('planId', val, { shouldValidate: true })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="assign-plan-select"
                    aria-invalid={!!form.formState.errors.planId}
                  >
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
              </FieldContent>
              <FieldError>{form.formState.errors.planId?.message}</FieldError>
            </Field>

            {selectedPlan && diff.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <div className="border-b px-3 py-2 text-sm font-medium">
                  Limits comparison
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Feature</TableHead>
                        <TableHead className="py-2">Current</TableHead>
                        <TableHead className="py-2">New</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diff.map((row) => (
                        <TableRow
                          key={row.key}
                          className={
                            row.changed
                              ? 'bg-warning/10 hover:bg-warning/15'
                              : undefined
                          }
                        >
                          <TableCell className="py-1.5 font-medium whitespace-normal">
                            {row.label}
                          </TableCell>
                          <TableCell className="text-muted-foreground py-1.5 whitespace-normal">
                            {row.currentValue}
                          </TableCell>
                          <TableCell className="py-1.5 whitespace-normal">
                            {row.changed ? (
                              <span className="font-medium">{row.newValue}</span>
                            ) : (
                              <span className="text-muted-foreground">
                               {row.newValue}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                  <AlertTriangle
                    className="mr-1 inline size-3.5 -translate-y-0.5"
                    aria-hidden
                  />
                  Highlighted rows change with this assignment.
                </div>
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor="assign-plan-reason">
                Reason <span className="text-destructive ml-0.5">*</span>
                <span className="text-muted-foreground ml-1 text-xs">
                  (audit — min {MIN_REASON} characters)
                </span>
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="assign-plan-reason"
                  rows={2}
                  placeholder="Why is this plan being assigned?"
                  disabled={isSubmitting}
                  aria-invalid={!!form.formState.errors.reason}
                  {...form.register('reason')}
                />
              </FieldContent>
              <div className="text-muted-foreground text-xs">
                {reasonValue.trim().length}/{MIN_REASON} characters
              </div>
              <FieldError>{form.formState.errors.reason?.message}</FieldError>
            </Field>

            {errorMessage && !isFieldServerError ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning…' : 'Assign plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
