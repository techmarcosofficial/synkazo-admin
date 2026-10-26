import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BillingRecoverySettings } from '@/api/billingRecovery';
import {
  useBillingRecoverySettingsQuery,
  useBillingRecoveryStatusQuery,
  useRunBillingRecoveryMutation,
  useSaveBillingRecoveryMutation,
} from '@/queries/useBillingRecovery';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';
import { showToast } from '@/lib/toast';
import { createIdempotencyKey } from '@/lib/idempotency';
import ErrorState from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

const schema = z.object({
  enabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  cronExpression: z.string().min(1).max(100),
  timezone: z.string().min(1).max(100),
  gracePeriodDays: z.number().int().min(0).max(365),
  batchSize: z.number().int().min(1).max(500),
  failureAction: z.literal('downgrade_to_free'),
  reason: z.string().trim().min(10, 'Enter at least 10 characters.').max(500),
});
type Values = z.infer<typeof schema>;

function SettingsForm({ settings }: { settings: BillingRecoverySettings }) {
  const save = useSaveBillingRecoveryMutation();
  const run = useRunBillingRecoveryMutation();
  const confirm = useConfirmDialogStore((s) => s.confirm);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ...settings, reason: '' },
  });
  const submit = form.handleSubmit((value) => {
    const idempotencyKey = createIdempotencyKey();
    confirm({
      title: 'Apply billing recovery policy?',
      variant: 'warning',
      description:
        'This policy controls paid access for Stripe subscriptions. Zero grace removes paid access as soon as a renewal failure is verified. Existing overdue accounts are evaluated on the next check.',
      confirmLabel: 'Apply policy',
      onConfirm: async () => {
        await save.mutateAsync({ ...value, idempotencyKey });
        showToast.success('Billing recovery policy saved.');
      },
    });
  });
  return (
    <form onSubmit={submit} className="space-y-5">
      <FieldGroup>
        {(['enabled', 'notificationsEnabled'] as const).map((name) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id={`recovery-${name}`}
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                />
                <FieldLabel htmlFor={`recovery-${name}`}>
                  {name === 'enabled'
                    ? 'Enable scheduled billing checks'
                    : 'Notify organisations when recurring payments fail'}
                </FieldLabel>
              </Field>
            )}
          />
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['gracePeriodDays', 'Renewal failure grace (days)'],
              ['batchSize', 'Organisations per check'],
              ['cronExpression', 'Check schedule'],
              ['timezone', 'Schedule timezone'],
            ] as const
          ).map(([name, label]) => {
            const numeric = name === 'gracePeriodDays' || name === 'batchSize';
            return (
              <Field key={name}>
                <FieldLabel htmlFor={`recovery-${name}`}>{label}</FieldLabel>
                <Input
                  id={`recovery-${name}`}
                  type={numeric ? 'number' : 'text'}
                  {...form.register(name, { valueAsNumber: numeric })}
                  aria-invalid={!!form.formState.errors[name]}
                />
                <FieldError errors={[form.formState.errors[name]]} />
              </Field>
            );
          })}
        </div>
        <Field>
          <FieldLabel htmlFor="recovery-reason">
            Reason for this action
          </FieldLabel>
          <Input
            id="recovery-reason"
            {...form.register('reason')}
            aria-invalid={!!form.formState.errors.reason}
          />
          <FieldError errors={[form.formState.errors.reason]} />
        </Field>
      </FieldGroup>
      {(save.isError || run.isError) && (
        <p role="alert" className="text-destructive text-sm">
          The action failed. Check the values or wait for the current check to
          finish, then try again.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending || run.isPending}>
          Save policy
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending || run.isPending}
          onClick={async () => {
            if (!(await form.trigger('reason'))) return;
            const idempotencyKey = createIdempotencyKey();
            confirm({
              title: 'Check billing now?',
              variant: 'warning',
              description:
                'Checks the next batch against Stripe. Verified overdue accounts may lose paid access and have sync execution paused.',
              confirmLabel: 'Run check',
              onConfirm: async () => {
                await run.mutateAsync({
                  reason: form.getValues('reason'),
                  idempotencyKey,
                });
                showToast.success('Billing check completed.');
              },
            });
          }}
        >
          Run now
        </Button>
      </div>
    </form>
  );
}

export default function BillingRecoveryCard() {
  const settings = useBillingRecoverySettingsQuery();
  const status = useBillingRecoveryStatusQuery();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Recovery</CardTitle>
        <CardDescription>
          Verify payments and correct subscription access automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.isLoading ? (
          <Skeleton className="h-64" />
        ) : settings.isError || !settings.data ? (
          <ErrorState onRetry={() => settings.refetch()} />
        ) : (
          <SettingsForm
            key={JSON.stringify(settings.data)}
            settings={settings.data}
          />
        )}
        <div className="mt-6 space-y-2">
          <h3 className="font-medium">Latest check</h3>
          {status.isLoading ? (
            <Skeleton className="h-12" />
          ) : status.isError ? (
            <ErrorState onRetry={() => status.refetch()} />
          ) : !status.data ? (
            <p className="text-muted-foreground text-sm">
              No billing checks have run yet.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                {new Date(status.data.completedAt).toLocaleString()} ·{' '}
                {(status.data.durationMs / 1000).toFixed(1)} seconds
              </p>
              <p className="text-sm">
                Checked {status.data.checked} · Changed {status.data.changed} ·
                Access paused {status.data.downgraded} · Recovered{' '}
                {status.data.recovered} · Errors {status.data.errors.length}
              </p>
              {status.data.errors.map((error) => (
                <p
                  key={error.organisationId}
                  className="text-destructive text-sm"
                >
                  {error.organisationId}: {error.message}
                </p>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
