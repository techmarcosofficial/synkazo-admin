import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  PlugZap,
  RefreshCw,
  Settings2,
  SquarePen,
  Wallet,
  WifiSync,
  XCircle,
} from 'lucide-react';
import type {
  CatalogMoveSummary,
  GatewayEnvironment,
  GatewayEnvironmentStatus,
  GatewayField,
  PaymentGateway,
  PaymentGatewaySettings,
  PaymentGatewaySettingsUpdate,
} from '@/api/paymentGateways';
import {
  useMoveCatalogMutation,
  usePaymentGatewaySettingsQuery,
  useSavePaymentGatewaySettingsMutation,
  useSyncRazorpayCatalogMutation,
  useTestPaymentGatewayMutation,
} from '@/queries/usePaymentGateways';
import { showToast } from '@/lib/toast';
import { createIdempotencyKey } from '@/lib/idempotency';
import { cn } from '@/lib/utils';
import ConnectionEnvDropdown from '@/components/connections/ConnectionEnvToggle';
import { KnowMore } from '@/components/connections/CredentialsModal';
import FormDialog from '@/components/form/FormDialog';
import ErrorState from '@/components/shared/ErrorState';
import HeadingPair from '@/components/shared/HeadingPair';
import StatusBadge from '@/components/shared/StatusBadge';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LifecycleConfirmDialog from './lifecycle/LifecycleConfirmDialog';

const GATEWAYS: PaymentGateway[] = ['stripe', 'razorpay'];
const LABEL: Record<PaymentGateway, string> = {
  stripe: 'Stripe',
  razorpay: 'Razorpay',
};
const ENV_LABEL: Record<GatewayEnvironment, string> = {
  sandbox: 'Sandbox',
  production: 'Production',
};
// Same environment colours as ConnectionEnvToggle (project connections).
const ENV_TONE: Record<GatewayEnvironment, string> = {
  sandbox: 'bg-warning',
  production: 'bg-success',
};

interface KeySpec {
  key: string;
  label: string;
  secret: boolean;
  placeholder: Record<GatewayEnvironment, string>;
  helpText: string;
  helpUrl: string;
}
// Where each key comes from — shown in the field's "?" help, like the connection popup.
const KEYS: Record<PaymentGateway, KeySpec[]> = {
  stripe: [
    {
      key: 'publishableKey',
      label: 'Publishable key',
      secret: false,
      placeholder: { sandbox: 'pk_test_…', production: 'pk_live_…' },
      helpText:
        'Stripe Dashboard → Developers → API keys. Use test mode for Sandbox (pk_test_…) and live mode for Production (pk_live_…).',
      helpUrl: 'https://dashboard.stripe.com/apikeys',
    },
    {
      key: 'secretKey',
      label: 'Secret key',
      secret: true,
      placeholder: { sandbox: 'sk_test_…', production: 'sk_live_…' },
      helpText:
        'Stripe Dashboard → Developers → API keys → Secret key (sk_…) or a restricted key (rk_…), from the same mode as the publishable key.',
      helpUrl: 'https://dashboard.stripe.com/apikeys',
    },
    {
      key: 'webhookSecret',
      label: 'Webhook signing secret',
      secret: true,
      placeholder: { sandbox: 'whsec_…', production: 'whsec_…' },
      helpText:
        'Add the webhook URL shown under “Webhook setup” in Stripe → Developers → Webhooks, then copy that endpoint’s signing secret (whsec_…).',
      helpUrl: 'https://dashboard.stripe.com/webhooks',
    },
  ],
  razorpay: [
    {
      key: 'keyId',
      label: 'Key ID',
      secret: false,
      placeholder: { sandbox: 'rzp_test_…', production: 'rzp_live_…' },
      helpText:
        'Razorpay Dashboard → Account & Settings → API Keys. Use Test mode for Sandbox (rzp_test_…) and Live mode for Production (rzp_live_…).',
      helpUrl:
        'https://dashboard.razorpay.com/app/website-app-settings/api-keys',
    },
    {
      key: 'keySecret',
      label: 'Key secret',
      secret: true,
      placeholder: { sandbox: 'Key secret', production: 'Key secret' },
      helpText:
        'Shown once when you generate the API key in Razorpay. If you no longer have it, regenerate the key and paste both values.',
      helpUrl:
        'https://dashboard.razorpay.com/app/website-app-settings/api-keys',
    },
    {
      key: 'webhookSecret',
      label: 'Webhook secret',
      secret: true,
      placeholder: { sandbox: 'Click Generate', production: 'Click Generate' },
      helpText:
        'You choose this value. Click Generate, then paste the same secret in Razorpay → Webhooks when adding the webhook URL shown under “Webhook setup”.',
      helpUrl: 'https://dashboard.razorpay.com/app/webhooks',
    },
  ],
};
export const RAZORPAY_WEBHOOK_EVENTS = [
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.paused',
  'subscription.resumed',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.updated',
  'payment.failed',
  'refund.processed',
];

/** A privileged change: always asks for a reason; a guarded 409 adds a typed confirmation. */
interface GatewayAction {
  title: string;
  description: string;
  actionLabel: string;
  tone?: 'warning' | 'danger';
  /** Phrase to type when the API asks for confirmation (409). */
  confirmPhrase: string;
  run: (reason: string, confirmed: boolean) => Promise<string>;
}
type OpenAction = (action: GatewayAction) => void;

type ErrorResponse = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      code?: string;
      errors?: { field?: string; message: string }[];
    };
  };
};
const GUARDED_CODES = ['ENVIRONMENT_HAS_SUBSCRIBERS', 'STRIPE_ACCOUNT_CHANGE'];

const randomSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

const fieldsOf = (status: GatewayEnvironmentStatus<string>) =>
  status.fields as Record<string, GatewayField>;

type NoticeTone = 'success' | 'warning' | 'error';
const NOTICE_TONE: Record<NoticeTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
};
const NOTICE_ICON: Record<NoticeTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

/** One look for every result on this screen: green done, amber/gold attention, red failed. */
function StatusNotice({
  tone,
  children,
  className,
}: {
  tone: NoticeTone;
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      data-tone={tone}
      className={cn(
        'flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs',
        NOTICE_TONE[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
    </div>
  );
}

function EnvDot({ env }: { env: GatewayEnvironment }) {
  return (
    <span
      aria-hidden
      className={cn('size-2 shrink-0 rounded-full', ENV_TONE[env])}
    />
  );
}

/** Brand tile, same size as PlatformIcon on connection rows (pattern: StripeSLogo). */
function GatewayLogo({ gateway }: { gateway: PaymentGateway }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm',
        gateway === 'stripe' ? 'bg-[#635BFF]' : 'bg-[#3395FF]',
      )}
    >
      {gateway === 'stripe' ? 'S' : 'R'}
    </span>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <code className="break-all">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Copy ${label}`}
        onClick={() =>
          navigator.clipboard
            .writeText(value)
            .then(() => showToast.success(`${label} copied.`))
        }
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Connect / Edit popup — same structure as the platform CredentialsModal: help per field,
 * "Verifying…" while the API checks the keys with the provider, and the failure shown here
 * (wrong keys are never saved).
 */
function GatewayCredentialsDialog({
  gateway,
  env,
  status,
  onClose,
}: {
  gateway: PaymentGateway;
  env: GatewayEnvironment;
  status: GatewayEnvironmentStatus<string>;
  onClose: () => void;
}) {
  const save = useSavePaymentGatewaySettingsMutation();
  const fields = fieldsOf(status);
  const specs = KEYS[gateway];
  const isEdit = specs.some((f) => fields[f.key].configured);
  const fromEnv = specs.some((f) => fields[f.key].source === 'env');
  const label = `${LABEL[gateway]} ${ENV_LABEL[env]}`;
  // Public keys are prefilled so they can be checked and corrected; secrets are never sent back.
  const [initial] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      specs.map((f) => [
        f.key,
        !f.secret && fields[f.key].configured
          ? (fields[f.key].preview ?? '')
          : '',
      ]),
    ),
  );
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [accountChange, setAccountChange] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  const setField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setVerifyError(null);
    setAccountChange(null);
  };

  const submit = async (confirmAccountChange = false) => {
    if (save.isPending) return;
    const required: Record<string, string> = {};
    for (const f of specs)
      if (!fields[f.key].configured && !form[f.key].trim())
        required[f.key] = 'Required';
    setErrors(required);
    if (Object.keys(required).length) return;
    const keys: Record<string, string> = {};
    for (const f of specs) {
      const value = form[f.key].trim();
      if (value && value !== initial[f.key]) keys[f.key] = value;
    }
    if (!Object.keys(keys).length) {
      showToast.info('Nothing changed.');
      onClose();
      return;
    }
    setVerifyError(null);
    try {
      const result = await save.mutateAsync({
        [gateway]: { [env]: keys },
        ...(confirmAccountChange ? { confirmAccountChange: true } : {}),
        idempotencyKey: createIdempotencyKey(),
      } as PaymentGatewaySettingsUpdate & { idempotencyKey: string });
      const ready = result.settings[gateway].environments[env].ready;
      showToast.success(
        ready
          ? `${label} connected.`
          : `${label} keys saved. Add the remaining keys to connect.`,
      );
      onClose();
    } catch (err) {
      const data = (err as ErrorResponse).response?.data;
      const message =
        data?.message ?? 'The keys could not be saved. Please try again.';
      if (data?.code === 'STRIPE_ACCOUNT_CHANGE') {
        setAccountChange(message);
        return;
      }
      const field = data?.errors?.[0]?.field;
      if (field && specs.some((f) => f.key === field))
        setErrors((e) => ({
          ...e,
          [field]:
            data?.code === 'INVALID_KEY_FORMAT'
              ? 'Wrong format for this environment'
              : 'Check this value',
        }));
      setVerifyError(message);
    }
  };

  const generate = (key: string) => {
    const secret = randomSecret();
    setField(key, secret);
    setVisible((v) => new Set(v).add(key));
    void navigator.clipboard
      ?.writeText(secret)
      .then(() =>
        showToast.success(
          'Secret generated and copied. Use the same value in the Razorpay webhook.',
        ),
      )
      .catch(() => undefined);
  };

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && !save.isPending && onClose()}
      title={isEdit ? `Edit ${label} keys` : `Connect ${label}`}
      description="Enter your API keys"
      size="sm"
      preventOutsideClose={save.isPending}
      footer={(requestClose) => (
        <>
          <Button
            variant="outline"
            onClick={requestClose}
            disabled={save.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={save.isPending}
            className="flex-1"
          >
            {save.isPending ? (
              <span className="flex items-center gap-1.5" role="status">
                <Spinner className="size-4" />
                Verifying with {LABEL[gateway]}…
              </span>
            ) : verifyError ? (
              'Retry verification'
            ) : (
              'Save & verify'
            )}
          </Button>
        </>
      )}
    >
      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        {fromEnv && (
          <StatusNotice tone="warning">
            These keys currently come from the server .env. Saving here
            overrides them for {ENV_LABEL[env]}.
          </StatusNotice>
        )}
        {verifyError && (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive border-destructive/20 flex items-start gap-2.5 rounded-2xl border p-3 text-xs"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold">Verification failed</p>
              <p className="text-destructive/90 break-words">{verifyError}</p>
            </div>
          </div>
        )}
        {accountChange && (
          <StatusNotice tone="warning">
            <p>{accountChange}</p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={save.isPending}
              onClick={() => void submit(true)}
            >
              Use this account anyway
            </Button>
          </StatusNotice>
        )}
        <FieldGroup>
          {specs.map((f) => {
            const id = `gateway-${gateway}-${env}-${f.key}`;
            const error = errors[f.key];
            const shown = visible.has(f.key);
            return (
              <Field key={f.key} data-invalid={!!error}>
                <FieldLabel htmlFor={id}>
                  {f.label}{' '}
                  <KnowMore
                    label={f.label}
                    helpText={f.helpText}
                    helpUrl={f.helpUrl}
                  />
                </FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={id}
                    type={f.secret && !shown ? 'password' : 'text'}
                    // API keys, not a login: never let the browser fill saved credentials.
                    autoComplete={f.secret ? 'new-password' : 'off'}
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    value={form[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={
                      f.secret && fields[f.key].configured
                        ? `Leave blank to keep ${fields[f.key].preview ?? 'the current value'}`
                        : f.placeholder[env]
                    }
                    disabled={save.isPending}
                    aria-invalid={!!error}
                    className={cn(
                      'min-w-0 flex-1 basis-48',
                      error && 'border-destructive',
                    )}
                  />
                  {f.secret && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`${shown ? 'Hide' : 'Show'} ${f.label}`}
                      onClick={() =>
                        setVisible((v) => {
                          const next = new Set(v);
                          if (shown) next.delete(f.key);
                          else next.add(f.key);
                          return next;
                        })
                      }
                    >
                      {shown ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  )}
                  {gateway === 'razorpay' && f.key === 'webhookSecret' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={save.isPending}
                      onClick={() => generate(f.key)}
                    >
                      Generate
                    </Button>
                  )}
                </div>
                {error && <p className="text-destructive text-xs">{error}</p>}
              </Field>
            );
          })}
        </FieldGroup>
        <p className="text-muted-foreground text-xs">
          Keys are checked with {LABEL[gateway]} before saving, then stored
          encrypted. Secrets are never shown again.
        </p>
      </form>
    </FormDialog>
  );
}

/** One gateway environment as a connection card — mirrors project ConnectionBoard + PlatformCard. */
function GatewayConnectionCard({
  gateway,
  env,
  settings,
  onEdit,
  openAction,
  onCatalogMoves,
}: {
  gateway: PaymentGateway;
  env: GatewayEnvironment;
  settings: PaymentGatewaySettings;
  onEdit: () => void;
  openAction: OpenAction;
  onCatalogMoves: (moves: CatalogMoveSummary[]) => void;
}) {
  const save = useSavePaymentGatewaySettingsMutation();
  const test = useTestPaymentGatewayMutation();
  const syncCatalog = useSyncRazorpayCatalogMutation();
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const status = settings[gateway].environments[env];
  const fields = fieldsOf(status);
  const specs = KEYS[gateway];
  const isSlot = !specs.some((f) => fields[f.key].configured);
  const ready = status.ready;
  const fromEnv = specs.some((f) => fields[f.key].source === 'env');
  const inUseEnv = settings[gateway].environment;
  const inUse = inUseEnv === env;
  const live = inUse && settings.activeGateway === gateway;
  const failed = !!testResult && !testResult.ok;
  const missing = specs
    .filter((f) => !fields[f.key].configured)
    .map((f) => f.label);
  const account = fields[specs[0].key].preview;

  const runTest = () =>
    test.mutate(
      { gateway, environment: env },
      { onSuccess: setTestResult, onError: () => setTestResult(null) },
    );

  const useEnvironment = () =>
    openAction({
      title: `Use ${ENV_LABEL[env]} for ${LABEL[gateway]}?`,
      description: `${LABEL[gateway]} switches to its ${ENV_LABEL[env]} account for checkout, renewals and webhooks. Plans, prices and coupons are re-created there, and links to customers in ${ENV_LABEL[inUseEnv]} are cleared.`,
      actionLabel: `Use ${ENV_LABEL[env]}`,
      tone: env === 'production' ? 'danger' : 'warning',
      confirmPhrase: env.toUpperCase(),
      run: async (reason, confirmed) => {
        const result = await save.mutateAsync({
          [gateway]: { environment: env },
          reason,
          confirmEnvironmentSwitch: confirmed,
          idempotencyKey: createIdempotencyKey(),
        });
        onCatalogMoves(result.catalogMoves);
        return `${LABEL[gateway]} now uses ${ENV_LABEL[env]}.`;
      },
    });

  const syncPlans = () =>
    openAction({
      title: 'Sync plans to Razorpay?',
      description: `Creates a Razorpay plan in ${ENV_LABEL[env]} for every active monthly and yearly price that does not have one yet. Daily prices are skipped (Razorpay needs at least 7 days).`,
      actionLabel: 'Sync plans',
      confirmPhrase: 'CONFIRM',
      run: async (reason) => {
        const result = await syncCatalog.mutateAsync({
          reason,
          idempotencyKey: createIdempotencyKey(),
        });
        const summary = `${result.created} created, ${result.linked} re-linked, ${result.skipped.length} skipped`;
        if (result.failed.length)
          throw new Error(
            `${summary}, ${result.failed.length} failed: ${result.failed[0].message}`,
          );
        return `Razorpay plans synced: ${summary}.`;
      },
    });

  const badgeStatus = test.isPending
    ? 'in_progress'
    : failed
      ? 'failed'
      : ready
        ? 'connected'
        : isSlot
          ? 'ready_to_connect'
          : 'partial';
  const subtitle = live
    ? 'Takes payments for new subscriptions.'
    : inUse
      ? `${LABEL[gateway]} uses these keys. Activate ${LABEL[gateway]} in Gateway settings to take new subscriptions.`
      : `Not in use — ${LABEL[gateway]} uses ${ENV_LABEL[inUseEnv]}.`;

  return (
    <Card
      surface="inner"
      data-connection-state={badgeStatus}
      className={cn(
        'relative gap-0 overflow-hidden border py-0 transition-all duration-300',
        failed && 'border-destructive/70',
        !failed && ready && 'border-primary/20',
        !failed && !ready && 'border-border/80 border-dashed',
      )}
    >
      <div className="flex flex-col justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center">
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="API keys"
          subtitle={subtitle}
        />
        <div className="flex flex-wrap items-center gap-2">
          {fromEnv && (
            <Badge tone="warning" title="Keys come from the server .env file">
              Using .env
            </Badge>
          )}
          {live && <Badge tone="success">Live</Badge>}
          <StatusBadge
            status={badgeStatus}
            label={badgeStatus === 'partial' ? 'Incomplete' : undefined}
            size="sm"
          />
        </div>
      </div>
      <Separator />
      <div className="space-y-2 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(isSlot && 'opacity-60')}>
              <GatewayLogo gateway={gateway} />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-sm font-semibold',
                  isSlot && 'text-muted-foreground',
                )}
              >
                {LABEL[gateway]}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {ENV_LABEL[env]}
                {account ? ` · ${account}` : ''}
                {test.isPending ? ' · Verifying keys…' : ''}
              </p>
            </div>
          </div>
          {isSlot || !ready ? (
            <Button
              size="sm"
              className="w-full md:ml-auto md:w-auto"
              onClick={onEdit}
            >
              <PlugZap />
              {isSlot ? `Connect ${LABEL[gateway]}` : 'Finish setup'}
            </Button>
          ) : (
            <>
              <Separator className="md:hidden" />
              <Separator
                orientation="vertical"
                className="hidden h-7 data-vertical:self-center md:ml-auto md:block"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runTest}
                  disabled={test.isPending}
                >
                  {test.isPending ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <WifiSync className="size-3.5" />
                  )}
                  {test.isPending ? 'Testing...' : 'Retest'}
                </Button>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <SquarePen className="size-3.5" />
                  Edit
                </Button>
                {!inUse && (
                  <Button variant="outline" size="sm" onClick={useEnvironment}>
                    <EnvDot env={env} />
                    Use {ENV_LABEL[env]}
                  </Button>
                )}
                {gateway === 'razorpay' && inUse && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncCatalog.isPending}
                    onClick={syncPlans}
                  >
                    Sync plans
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        {!isSlot && !ready && (
          <StatusNotice tone="warning">
            Missing: {missing.join(', ')}. Click Finish setup to add{' '}
            {missing.length === 1 ? 'it' : 'them'}.
          </StatusNotice>
        )}
        {testResult &&
          (testResult.ok ? (
            <StatusNotice tone="success">{testResult.message}</StatusNotice>
          ) : (
            <StatusNotice tone="error">
              {testResult.message} Click Edit to update the keys.
            </StatusNotice>
          ))}
      </div>
    </Card>
  );
}

function WebhookSetup({
  gateway,
  env,
  settings,
}: {
  gateway: PaymentGateway;
  env: GatewayEnvironment;
  settings: PaymentGatewaySettings;
}) {
  const url =
    gateway === 'razorpay'
      ? settings.razorpayWebhookUrl
      : settings.stripeWebhookUrl;
  return (
    <Collapsible className="rounded-2xl border">
      <CollapsibleTrigger className="group hover:bg-muted/40 focus-visible:ring-ring/50 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-[3px]">
        Webhook setup
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-4 pb-4 text-sm">
        <CopyRow label="Webhook URL" value={url} />
        <p className="text-muted-foreground">
          {gateway === 'razorpay'
            ? `In Razorpay (${env === 'sandbox' ? 'Test' : 'Live'} mode) → Webhooks → Add new webhook: paste this URL, the same Webhook secret you saved here, and tick these events: ${RAZORPAY_WEBHOOK_EVENTS.join(', ')}.`
            : `In Stripe (${env === 'sandbox' ? 'test' : 'live'} mode) → Developers → Webhooks → Add endpoint: paste this URL, then copy the endpoint's signing secret into Webhook signing secret.`}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function GatewayPanel({
  gateway,
  settings,
  openAction,
  onCatalogMoves,
}: {
  gateway: PaymentGateway;
  settings: PaymentGatewaySettings;
  openAction: OpenAction;
  onCatalogMoves: (moves: CatalogMoveSummary[]) => void;
}) {
  const [env, setEnv] = useState<GatewayEnvironment>(
    settings[gateway].environment,
  );
  const [editing, setEditing] = useState(false);
  const environments = settings[gateway].environments;
  return (
    <div className="space-y-4">
      {/* Same header + environment picker as project Connections. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <HeadingPair
          level="h3"
          visualLevel="section"
          title={`${LABEL[gateway]} connection`}
          subtitle={`Keys for ${LABEL[gateway]}'s Sandbox (test) and Production (live) accounts.`}
          trailing={
            <StatusBadge status={env} label={ENV_LABEL[env]} size="sm" />
          }
        />
        <div className="w-full sm:w-auto sm:self-start">
          <ConnectionEnvDropdown
            activeEnv={env}
            onChange={(next) => setEnv(next as GatewayEnvironment)}
            projectActiveEnv={settings[gateway].environment}
            envFullyConnected={(e) =>
              environments[e as GatewayEnvironment].ready
            }
            envHasAnyConnected={(e) =>
              Object.values(
                fieldsOf(environments[e as GatewayEnvironment]),
              ).some((f) => f.configured)
            }
          />
        </div>
      </div>
      <GatewayConnectionCard
        key={env}
        gateway={gateway}
        env={env}
        settings={settings}
        onEdit={() => setEditing(true)}
        openAction={openAction}
        onCatalogMoves={onCatalogMoves}
      />
      <WebhookSetup gateway={gateway} env={env} settings={settings} />
      {editing && (
        <GatewayCredentialsDialog
          gateway={gateway}
          env={env}
          status={environments[env]}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/** The header ⚙ dialog: exactly one gateway is active for new subscriptions. */
function GatewaySettingsDialog({
  open,
  onOpenChange,
  settings,
  openAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PaymentGatewaySettings;
  openAction: OpenAction;
}) {
  const save = useSavePaymentGatewaySettingsMutation();
  const activate = (gateway: PaymentGateway) => {
    onOpenChange(false);
    openAction({
      title: `Activate ${LABEL[gateway]}?`,
      description: `New checkouts will be processed by ${LABEL[gateway]} (${ENV_LABEL[settings[gateway].environment]}). ${LABEL[settings.activeGateway]} is deactivated for new subscriptions; existing subscriptions keep renewing, changing and cancelling on the gateway they started on.`,
      actionLabel: `Activate ${LABEL[gateway]}`,
      confirmPhrase: 'CONFIRM',
      run: async (reason) => {
        await save.mutateAsync({
          activeGateway: gateway,
          reason,
          idempotencyKey: createIdempotencyKey(),
        });
        return `${LABEL[gateway]} is now active for new subscriptions.`;
      },
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment gateway settings</DialogTitle>
          <DialogDescription>
            Exactly one gateway processes new subscriptions. A gateway can be
            activated once its environment in use is connected.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-border divide-y">
          {GATEWAYS.map((g) => {
            const env = settings[g].environment;
            const ready = settings[g].environments[env].ready;
            const active = settings.activeGateway === g;
            return (
              <li
                key={g}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <GatewayLogo gateway={g} />
                  <div className="space-y-1">
                    <p className="font-medium">{LABEL[g]}</p>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <EnvDot env={env} />
                      {ENV_LABEL[env]} · {ready ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <Switch
                  aria-label={`${LABEL[g]} active`}
                  checked={active}
                  // The active gateway is turned off by activating the other one.
                  disabled={active || !ready}
                  onCheckedChange={(on) => on && activate(g)}
                />
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function CatalogMoveResults({
  moves,
  openAction,
  onDismiss,
}: {
  moves: CatalogMoveSummary[];
  openAction: OpenAction;
  onDismiss: () => void;
}) {
  const move = useMoveCatalogMutation();
  return (
    <div className="space-y-3">
      {moves.map((m) => (
        <StatusNotice
          key={m.gateway}
          tone={m.failed.length ? 'error' : 'success'}
        >
          <p className="font-medium">
            {LABEL[m.gateway]} catalog moved: {m.created} created
            {Object.entries(m.cleared)
              .filter(([, n]) => n > 0)
              .map(([what, n]) => `, ${n} ${what} cleared`)
              .join('')}
            {m.failed.length ? `, ${m.failed.length} failed` : ''}
          </p>
          {m.gateway === 'razorpay' && (m.cleared.offers ?? 0) > 0 && (
            <p>
              Razorpay Offer IDs belong to one account. Re-enter them on the
              Discounts page for the new environment.
            </p>
          )}
          {m.failed.slice(0, 3).map((f) => (
            <p key={f.item}>
              {f.item}: {f.message}
            </p>
          ))}
          <div className="flex gap-2">
            {m.failed.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  openAction({
                    title: `Retry ${LABEL[m.gateway]} catalog move?`,
                    description: `Re-creates the catalog in the ${LABEL[m.gateway]} environment in use.`,
                    actionLabel: 'Retry',
                    confirmPhrase: 'CONFIRM',
                    run: async (reason) => {
                      const summary = await move.mutateAsync({
                        gateway: m.gateway,
                        reason,
                        idempotencyKey: createIdempotencyKey(),
                      });
                      if (summary.failed.length)
                        throw new Error(
                          `${summary.failed.length} still failing: ${summary.failed[0].message}`,
                        );
                      onDismiss();
                      return `${LABEL[m.gateway]} catalog moved.`;
                    },
                  })
                }
              >
                Retry catalog move
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </StatusNotice>
      ))}
    </div>
  );
}

function PaymentGatewayManager({
  settings,
  settingsOpen,
  onSettingsOpenChange,
}: {
  settings: PaymentGatewaySettings;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
}) {
  const [gateway, setGateway] = useState<PaymentGateway>(
    settings.activeGateway,
  );
  const [action, setAction] = useState<GatewayAction | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [moves, setMoves] = useState<CatalogMoveSummary[]>([]);

  const openAction: OpenAction = (next) => {
    setAction(next);
    setConfirmation(null);
    setError(null);
  };

  const submit = async ({ reason }: { reason: string }) => {
    if (!action) return;
    setSubmitting(true);
    setError(null);
    try {
      showToast.success(await action.run(reason, confirmation !== null));
      setAction(null);
    } catch (err) {
      const response = (err as ErrorResponse).response;
      const message =
        response?.data?.message ??
        (err instanceof Error ? err.message : 'The change could not be saved.');
      // A guarded change: keep the dialog (and reason) open and ask for the typed phrase.
      if (
        response?.status === 409 &&
        GUARDED_CODES.includes(response.data?.code ?? '') &&
        confirmation === null
      )
        setConfirmation(message);
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {moves.length > 0 && (
        <CatalogMoveResults
          moves={moves}
          openAction={openAction}
          onDismiss={() => setMoves([])}
        />
      )}

      <Tabs
        value={gateway}
        onValueChange={(v) => setGateway(v as PaymentGateway)}
      >
        <TabsList className="flex h-auto w-full flex-wrap">
          {GATEWAYS.map((g) => (
            <TabsTrigger key={g} value={g} className="flex items-center gap-2">
              {g === 'stripe' ? (
                <CreditCard className="size-4" />
              ) : (
                <Wallet className="size-4" />
              )}
              {LABEL[g]}
              {settings.activeGateway === g && (
                <Badge size="xs" tone="success">
                  Active
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {GATEWAYS.map((g) => (
          <TabsContent key={g} value={g} className="pt-4">
            <GatewayPanel
              gateway={g}
              settings={settings}
              openAction={openAction}
              onCatalogMoves={setMoves}
            />
          </TabsContent>
        ))}
      </Tabs>

      <GatewaySettingsDialog
        open={settingsOpen}
        onOpenChange={onSettingsOpenChange}
        settings={settings}
        openAction={openAction}
      />

      <LifecycleConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={action?.title ?? ''}
        description={action?.description ?? ''}
        bodyWarning={confirmation ?? undefined}
        actionLabel={action?.actionLabel ?? 'Confirm'}
        tone={confirmation ? 'danger' : (action?.tone ?? 'warning')}
        organisationName={action?.confirmPhrase ?? 'CONFIRM'}
        requiresNameConfirm={confirmation !== null}
        caseSensitiveNameConfirm
        minReasonLength={10}
        reasonPlaceholder="Recorded in the audit trail"
        isSubmitting={submitting}
        errorMessage={error}
        onSubmit={(values) => void submit(values)}
      />
    </>
  );
}

export default function PaymentGatewaySettingsCard() {
  const settings = usePaymentGatewaySettingsQuery();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Gateways</CardTitle>
        <CardDescription>
          Connect Stripe and Razorpay to take subscription payments. Keys are
          checked before saving and stored encrypted.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!settings.data}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" />
            Gateway settings
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.isLoading ? (
          <Skeleton className="h-96" />
        ) : settings.isError || !settings.data ? (
          <ErrorState onRetry={() => settings.refetch()} />
        ) : (
          <PaymentGatewayManager
            settings={settings.data}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}
      </CardContent>
    </Card>
  );
}
