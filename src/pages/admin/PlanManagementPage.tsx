import {
  Archive,
  ArrowLeftRight,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Package,
  PenBoxIcon,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  FEATURE_GROUPS,
  PLAN_FEATURE_FIELDS,
  SYNC_FREQUENCY_OPTIONS,
  defaultFeatureValues,
  deriveObjectsSynced,
  deriveSchedulingModes,
  fromMultiList,
  parseObjectsSynced,
  toMultiList,
  type FeatureFieldDef,
} from './planFeatureFields';

import FormDialog from '@/components/form/FormDialog';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useAdminPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeactivatePlanMutation,
  useAddPriceMutation,
  useUpdatePriceMutation,
  useUpdateFeaturesMutation,
  useResyncPlanMutation,
} from '@/queries/useBilling';
import type { AdminApiPlan, AdminApiPrice, BillingInterval } from '@/types';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);

/** Renders the right input control for a feature field's type. */
function FeatureFieldControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FeatureFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (field.type === 'checkbox') {
    const trueValue = field.trueValue ?? 'true';
    const falseValue = field.falseValue ?? 'false';
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`feat-${field.key}`}
            checked={value === trueValue}
            onCheckedChange={(v) =>
              onChange(v === true ? trueValue : falseValue)
            }
            disabled={disabled}
          />
          <Label htmlFor={`feat-${field.key}`} className="font-normal">
            {field.label}
          </Label>
        </div>
        {field.helperText && (
          <p className="text-muted-foreground text-xs">{field.helperText}</p>
        )}
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <RadioGroup value={value} onValueChange={onChange} className="gap-1.5">
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`feat-${field.key}-${opt.value}`}
              className="flex items-center gap-2 text-sm"
            >
              <RadioGroupItem
                id={`feat-${field.key}-${opt.value}`}
                value={opt.value}
                disabled={disabled}
              />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (field.type === 'multicheckbox') {
    const selected = new Set(toMultiList(value));
    const toggle = (optionValue: string, checked: boolean) => {
      const next = new Set(selected);
      if (checked) next.add(optionValue);
      else next.delete(optionValue);
      onChange(
        fromMultiList(
          (field.options ?? [])
            .filter((o) => next.has(o.value))
            .map((o) => o.value),
        ),
      );
    };
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <div className="flex flex-wrap gap-3">
          {field.options?.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-sm"
            >
              <Checkbox
                checked={selected.has(opt.value)}
                onCheckedChange={(v) => toggle(opt.value, v === true)}
                disabled={disabled}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // number
  return (
    <NumberOrUnlimitedField
      field={field}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

/** Number input with an optional "Unlimited" toggle that hides the input and stores "-1". */
function NumberOrUnlimitedField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FeatureFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isUnlimited = field.allowUnlimited && value === '-1';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`feat-${field.key}`}>{field.label}</Label>
      <div className="flex min-h-10 items-center gap-3">
        {field.allowUnlimited && (
          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={isUnlimited}
              onCheckedChange={(v) => onChange(v === true ? '-1' : '0')}
              disabled={disabled}
            />
            Unlimited
          </label>
        )}
        {!isUnlimited && (
          <Input
            id={`feat-${field.key}`}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.allowBlank ? '—' : undefined}
            className="w-28"
          />
        )}
      </div>
      {field.helperText && (
        <p className="text-muted-foreground text-xs">{field.helperText}</p>
      )}
    </div>
  );
}

/**
 * One feature field, plus its lock affordance. In create mode (`lockable`) shows a "Lock"
 * checkbox that decides whether this key goes into the new plan's permanent lock list. In
 * edit mode, `locked` disables the control and shows a "Locked" badge instead — the field
 * was locked at a prior publish and the backend rejects any attempt to change its value.
 */
function FeatureRow({
  field,
  value,
  onChange,
  locked,
  lockable,
  lockChecked,
  onLockChange,
}: {
  field: FeatureFieldDef;
  value: string;
  onChange: (v: string) => void;
  locked?: boolean;
  lockable?: boolean;
  lockChecked?: boolean;
  onLockChange?: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border p-4',
        locked ? 'bg-muted/40' : 'hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <FeatureFieldControl
            field={field}
            value={value}
            onChange={onChange}
            disabled={locked}
          />
        </div>
        {lockable && (
          <label
            className="text-muted-foreground flex shrink-0 items-center gap-1.5 pt-0.5 text-xs"
            title="Lock this field permanently once the plan is published — it can never be edited again."
          >
            <Checkbox
              checked={lockChecked}
              onCheckedChange={(v) => onLockChange?.(v === true)}
            />
            <Lock className="size-3" />
            Lock
          </label>
        )}
        {locked && (
          <span
            className="text-muted-foreground flex shrink-0 items-center gap-1 pt-0.5 text-xs"
            title="Locked at publish — cannot be edited."
          >
            <Lock className="size-3" />
            Locked
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Merged "Sync Schedule" control — replaces the old separate Scheduling modes + Sync
 * frequency checkbox pairs with one multi-select over the 5 cadences. Writes `sync_frequency`
 * directly from what's picked and derives `scheduling_modes` from it (deriveSchedulingModes)
 * so both enforced feature keys stay correct without exposing scheduling_modes as its own
 * control.
 */
function SyncScheduleField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (frequencies: string) => void;
  disabled?: boolean;
}) {
  const selected = new Set(toMultiList(value));
  const toggle = (freq: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(freq);
    else next.delete(freq);
    onChange(
      fromMultiList(
        SYNC_FREQUENCY_OPTIONS.filter((o) => next.has(o.value)).map(
          (o) => o.value,
        ),
      ),
    );
  };
  return (
    <div className="rounded-3xl border p-4">
      <div className="space-y-1.5">
        <Label>Sync Schedule</Label>
        <p className="text-muted-foreground text-xs">
          Which cadences a project on this plan can schedule a job for.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {SYNC_FREQUENCY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-sm"
            >
              <Checkbox
                checked={selected.has(opt.value)}
                onCheckedChange={(v) => toggle(opt.value, v === true)}
                disabled={disabled}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Two toggles for the `objects_synced` scope — replaces the old 4-option radio. Core objects
 * are always included; these two just add extended and/or custom objects on top.
 */
function ObjectsScopeField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (scope: string) => void;
  disabled?: boolean;
}) {
  const { includeExtended, includeCustom } = parseObjectsSynced(value);
  const set = (extended: boolean, custom: boolean) =>
    onChange(deriveObjectsSynced(extended, custom));
  return (
    <div className="rounded-3xl border p-4">
      <div className="space-y-1.5">
        <Label>Objects synced</Label>
        <p className="text-muted-foreground text-xs">
          Core objects (primary CRM records) are always included.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={includeExtended}
              onCheckedChange={(v) => set(v === true, includeCustom)}
              disabled={disabled}
            />
            Include extended objects
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={includeCustom}
              onCheckedChange={(v) => set(includeExtended, v === true)}
              disabled={disabled}
            />
            Include custom objects
          </label>
        </div>
      </div>
    </div>
  );
}

// Feature groups folded into 2 steps after Basics (3 steps total) — grouped by what they're
// about, not just to hit a step count:
//   - Limits + Scheduling + Sync scope: quotas, cadence, and what/how data syncs
//   - Capabilities + Trial + Display: feature flags, trial length, support/pricing display
const CREATE_PLAN_STEP_GROUPS: (typeof FEATURE_GROUPS)[number][][] = [
  ['Limits', 'Scheduling & transforms', 'Sync scope'],
  ['Capabilities', 'Trial', 'Display'],
];

/**
 * Renders one create/edit-plan step's groups — each group's plain fields (FeatureRow) and its
 * composite fields (SyncScheduleField, ObjectsScopeField, in place of the hidden schema fields
 * they replace) share a single 2-up grid, so a group with one plain field and one composite
 * field lands as two side-by-side cards instead of stacking full-width.
 */
function FeatureGroupStep({
  groups,
  features,
  setFeature,
  lockedKeys,
  lockable,
  lockedSet,
  onToggleLock,
}: {
  groups: (typeof FEATURE_GROUPS)[number][];
  features: Record<string, string>;
  setFeature: (key: string, value: string) => void;
  lockedKeys?: Set<string>;
  lockable?: boolean;
  lockedSet?: Set<string>;
  onToggleLock?: (key: string, locked: boolean) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group} className="space-y-3">
          <h4 className="text-sm font-semibold">{group}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLAN_FEATURE_FIELDS.filter(
              (f) => f.group === group && !f.hidden,
            ).map((f) => (
              <FeatureRow
                key={f.key}
                field={f}
                value={features[f.key] ?? f.defaultValue}
                onChange={(v) => setFeature(f.key, v)}
                locked={lockedKeys?.has(f.key)}
                lockable={lockable}
                lockChecked={lockedSet?.has(f.key)}
                onLockChange={(v) => onToggleLock?.(f.key, v)}
              />
            ))}
            {group === 'Scheduling & transforms' && (
              <SyncScheduleField
                value={features.sync_frequency ?? ''}
                onChange={(freq) => {
                  setFeature('sync_frequency', freq);
                  setFeature(
                    'scheduling_modes',
                    deriveSchedulingModes(toMultiList(freq)),
                  );
                }}
                disabled={lockedKeys?.has('sync_frequency')}
              />
            )}
            {group === 'Sync scope' && (
              <ObjectsScopeField
                value={features.objects_synced ?? 'core'}
                onChange={(v) => setFeature('objects_synced', v)}
                disabled={lockedKeys?.has('objects_synced')}
              />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function AddPriceDialog({
  plan,
  disabled,
}: {
  plan: AdminApiPlan;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [discount, setDiscount] = useState('');
  const add = useAddPriceMutation();

  const onOpenChange = (next: boolean) => {
    if (next) {
      setAmount('');
      setAmountError(null);
      setInterval('month');
      setDiscount('');
    }
    setOpen(next);
  };

  const submit = async () => {
    const dollars = Number(amount);
    if (!amount.trim() || !Number.isFinite(dollars) || dollars < 0) {
      setAmountError('Enter a valid amount.');
      return;
    }
    try {
      await add.mutateAsync({
        id: plan.id,
        body: {
          amount: Math.round(dollars * 100), // dollars → cents
          billingInterval: interval,
          discountPercent: discount.trim() ? Number(discount) : null,
        },
      });
      showToast.success('Price added.');
      setOpen(false);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" disabled={disabled}>
          <Plus className="size-4" /> Add price
        </Button>
      </DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add price to {plan.name}</DialogTitle>
          <DialogDescription>
            Creates a recurring Stripe price (USD).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price-amount" required>
              Amount (USD / interval)
            </Label>
            <Input
              id="price-amount"
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError(null);
              }}
              placeholder="29"
              aria-invalid={!!amountError}
            />
            {amountError && (
              <p className="text-destructive text-xs">{amountError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interval</Label>
              <Select
                value={interval}
                onValueChange={(v) => setInterval(v as BillingInterval)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-discount">Discount %</Label>
              <Input
                id="price-discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="16.67"
              />
              <p className="text-muted-foreground text-xs">
                Optional, display only.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={add.isPending}>
            {add.isPending && <Loader2 className="size-4 animate-spin" />}
            Add price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const INTERVAL_LABEL: Record<BillingInterval, string> = {
  month: 'Monthly',
  year: 'Yearly',
  day: 'Daily',
};

// Canonical display order for whichever intervals a plan actually has prices in — not a fixed
// month/year tuple, so a plan with only a `day` price (or any future interval) still renders.
const ALL_BILLING_INTERVALS: BillingInterval[] = ['month', 'year', 'day'];

// The handful of feature keys shown directly on the compact plan card — the rest are only
// reachable through the full edit wizard, so the card doesn't have to enumerate all ~25
// feature/limit fields.
const SUMMARY_FEATURE_KEYS = ['sync_direction', 'max_records_monthly'] as const;

const SUMMARY_FEATURE_ICONS: Record<string, typeof ArrowLeftRight> = {
  sync_direction: ArrowLeftRight,
  max_records_monthly: Database,
};

const SUMMARY_FEATURE_LABELS: Record<string, string> = {
  sync_direction: 'Sync Direction',
  max_records_monthly: 'Records / Sync',
};

/** Renders a feature field's raw stored value the way its input type implies. */
function formatFeatureValue(
  field: FeatureFieldDef,
  raw: string | undefined,
): string {
  const value = raw ?? field.defaultValue;
  if (field.type === 'number') {
    if (field.allowUnlimited && value === '-1') return 'Unlimited';
    if (value === '') return '—';
    return Number(value).toLocaleString();
  }
  if (field.type === 'checkbox') {
    return value === (field.trueValue ?? 'true') ? 'Yes' : 'No';
  }
  if (field.type === 'multicheckbox' || field.type === 'radio') {
    const selected =
      field.type === 'multicheckbox' ? toMultiList(value) : [value];
    const labels = selected.map(
      (v) => field.options?.find((o) => o.value === v)?.label ?? v,
    );
    return labels.join(' / ') || '—';
  }
  return value || '—';
}

/** Small icon button showing a price's Stripe id on hover/focus, click-to-copy. */
function CopyPriceIdButton({ priceId }: { priceId: string }) {
  const copy = (e: React.MouseEvent) => {
    e.preventDefault(); // don't select the radio this sits inside
    e.stopPropagation();
    navigator.clipboard.writeText(priceId).then(
      () => showToast.success('Price ID copied.'),
      () => showToast.error('Could not copy — copy it manually.'),
    );
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copy}
          className="text-muted-foreground hover:text-foreground shrink-0 rounded-full p-1"
        >
          <Copy className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-xs">
        {priceId} · click to copy
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One billing interval's prices as a radio group — only one price per interval can be
 * active (it's what customers see and can buy), so picking one archives the rest. The
 * currently-active price can still be turned off directly (e.g. to stop selling an
 * interval) as long as it isn't the plan's last active price overall.
 */
function PriceGroup({
  plan,
  interval,
  prices,
  update,
  loadingPriceId,
  setLoadingPriceId,
}: {
  plan: AdminApiPlan;
  interval: BillingInterval;
  prices: AdminApiPrice[];
  update: ReturnType<typeof useUpdatePriceMutation>;
  loadingPriceId: string | null;
  setLoadingPriceId: (id: string | null) => void;
}) {
  const activeId = prices.find((p) => p.isActive)?.id ?? '';

  const activate = async (priceId: string) => {
    if (priceId === activeId || update.isPending) return;
    setLoadingPriceId(priceId);
    try {
      await update.mutateAsync({
        id: plan.id,
        priceId,
        body: { isActive: true },
      });
      showToast.success('Price activated.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    } finally {
      setLoadingPriceId(null);
    }
  };

  const deactivate = async (priceId: string) => {
    if (update.isPending) return;
    setLoadingPriceId(priceId);
    try {
      await update.mutateAsync({
        id: plan.id,
        priceId,
        body: { isActive: false },
      });
      showToast.success('Price archived.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {INTERVAL_LABEL[interval]}
      </p>
      {/* Compact single-row choice cards — same selectable-card pattern as PlatformSelector /
          SyncModeField, condensed to one line per price so a plan with several archived prices
          doesn't dominate the card. The Stripe price id moves into CopyPriceIdButton's tooltip
          instead of its own always-visible row. */}
      <RadioGroup
        value={activeId}
        onValueChange={activate}
        className="space-y-1.5"
      >
        {prices.map((price) => {
          const selected = price.id === activeId;
          return (
            <label
              key={price.id}
              htmlFor={`price-${price.id}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-3xl border px-3 py-1.5 transition-all',
                selected
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <RadioGroupItem
                id={`price-${price.id}`}
                value={price.id}
                disabled={update.isPending}
              />
              <span className="truncate text-sm font-semibold">
                {money(price.amount, price.currency)}
                <span className="text-muted-foreground font-normal">
                  /{price.billingInterval}
                </span>
              </span>
              {price.discountPercent != null && (
                <Badge
                  variant="secondary"
                  className="shrink-0 px-1.5 text-[10px]"
                >
                  {price.discountPercent}% off
                </Badge>
              )}
              <CopyPriceIdButton priceId={price.stripePriceId} />
              <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-1 text-xs">
                {!price.isActive && loadingPriceId === price.id && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                {price.isActive ? 'Active' : 'Archived'}
              </span>
              {price.isActive && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild type="button" size="xs" variant="outline">
                    <Link to={`/checkout?priceId=${price.id}`}>Buy</Link>
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={update.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      void deactivate(price.id);
                    }}
                  >
                    {loadingPriceId === price.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      'Turn off'
                    )}
                  </Button>
                </div>
              )}
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

// Feature key holding the pricing-page purchase-button label (empty = use the default).
const CTA_LABEL_KEY = 'cta_label';
// Marketing-copy feature keys the public pricing page reads (see usePricingPlans). Ride the
// same generic feature map as cta_label — no schema change needed for a plan's marketing copy
// to be admin-editable.
const TAGLINE_KEY = 'tagline';
const HIGHLIGHTED_KEY = 'highlighted';
const SELLABLE_KEY = 'sellable';
// Whether this plan appears on the public pricing/landing pages at all — independent of
// `sellable`, which only picks the CTA (buy button vs. "Contact us") on a card that's already
// showing. Fail-closed: unset means hidden, so an admin has to opt a plan into public display.
const SHOW_ON_PRICING_KEY = 'show_on_pricing';
const MARKETING_FEATURES_KEY = 'marketing_features';

// "a\nb\nc" (textarea, one bullet per line) <-> "a|b|c" (stored feature value).
const linesToValue = (text: string): string =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('|');
const valueToLines = (value: string | undefined): string =>
  value ? value.split('|').join('\n') : '';

/** Two-up selectable card, same bordered-card convention as PriceGroup, for a single boolean flag. */
function ToggleCard({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        'flex flex-col gap-1 rounded-3xl border p-3 text-left transition-all',
        checked
          ? 'border-primary bg-primary/5'
          : 'hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border',
            checked
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/40',
          )}
        >
          {checked && <Check className="size-3" />}
        </span>
        {label}
      </span>
      <span className="text-muted-foreground text-xs">{description}</span>
    </button>
  );
}

// One unified 4-step wizard used for both creating and editing a plan (replaces the old
// CreatePlanDialog / EditPlanDialog / FeaturesDialog split). Create mode is strictly
// sequential; edit mode also allows clicking any step circle to jump directly to it.
const PLAN_FORM_STEP_LABELS = [
  'Basics & Marketing',
  'Limits & Sync Scope',
  'Capabilities & Trial',
  'Price',
];
const PLAN_FORM_TOTAL_STEPS = PLAN_FORM_STEP_LABELS.length;

function PlanFormDialog(
  props: { mode: 'create' } | { mode: 'edit'; plan: AdminApiPlan },
) {
  const { mode } = props;
  const plan = mode === 'edit' ? props.plan : undefined;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [tagline, setTagline] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [highlighted, setHighlighted] = useState(false);
  const [sellable, setSellable] = useState(false);
  const [showOnPricing, setShowOnPricing] = useState(false);
  const [marketingFeatures, setMarketingFeatures] = useState('');
  const [features, setFeatures] = useState<Record<string, string>>(
    defaultFeatureValues(),
  );
  // Create mode: keys the admin picks to lock permanently once the plan is published.
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [priceAmount, setPriceAmount] = useState('');
  const [priceAmountError, setPriceAmountError] = useState<string | null>(null);
  const [priceInterval, setPriceInterval] = useState<BillingInterval>('month');
  const [priceDiscount, setPriceDiscount] = useState('');
  // Prices staged in step 4, not yet submitted — entirely optional, any number can be queued.
  const [stagedPrices, setStagedPrices] = useState<
    { amount: string; interval: BillingInterval; discount: string }[]
  >([]);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const create = useCreatePlanMutation();
  const update = useUpdatePlanMutation();
  const updateFeatures = useUpdateFeaturesMutation();
  const addPrice = useAddPriceMutation();
  const updatePrice = useUpdatePriceMutation();
  const isPending =
    create.isPending ||
    update.isPending ||
    updateFeatures.isPending ||
    addPrice.isPending;

  // Edit mode: keys already locked at a prior publish — disabled + badged, can't be changed here.
  const existingLockedKeys = useMemo(
    () => new Set(plan?.lockedFields ?? []),
    [plan?.lockedFields],
  );

  const onOpenChange = (next: boolean) => {
    if (next) {
      setStep(1);
      setNameError(null);
      setPriceAmount('');
      setPriceAmountError(null);
      setPriceInterval('month');
      setPriceDiscount('');
      setStagedPrices([]);
      if (mode === 'edit' && plan) {
        setName(plan.name);
        setDescription(plan.description ?? '');
        setSortOrder(String(plan.sortOrder));
        setIsActive(plan.isActive);
        setTagline(plan.features[TAGLINE_KEY] ?? '');
        setCtaLabel(plan.features[CTA_LABEL_KEY] ?? '');
        setHighlighted(plan.features[HIGHLIGHTED_KEY] === 'true');
        setSellable(plan.features[SELLABLE_KEY] === 'true');
        setShowOnPricing(plan.features[SHOW_ON_PRICING_KEY] === 'true');
        setMarketingFeatures(
          valueToLines(plan.features[MARKETING_FEATURES_KEY]),
        );
        // Seed every schema field from the plan's stored value, falling back to the schema
        // default for keys the plan doesn't have a row for yet (e.g. an older plan created
        // before a new feature key existed).
        const seeded = defaultFeatureValues();
        for (const f of PLAN_FEATURE_FIELDS) {
          if (plan.features[f.key] != null)
            seeded[f.key] = plan.features[f.key];
        }
        setFeatures(seeded);
        setLockedKeys(new Set());
      } else {
        setName('');
        setDescription('');
        setSortOrder('0');
        setIsActive(true);
        setTagline('');
        setCtaLabel('');
        setHighlighted(false);
        setSellable(false);
        setShowOnPricing(false);
        setMarketingFeatures('');
        setFeatures(defaultFeatureValues());
        setLockedKeys(new Set());
      }
    }
    setOpen(next);
  };

  const setFeature = (key: string, value: string) => {
    if (mode === 'edit' && existingLockedKeys.has(key)) return;
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const toggleLock = (key: string, locked: boolean) =>
    setLockedKeys((prev) => {
      const next = new Set(prev);
      if (locked) next.add(key);
      else next.delete(key);
      return next;
    });

  const goToStep = (target: number) => {
    if (mode === 'create' && target > step && step === 1 && !name.trim()) {
      setNameError('Plan name is required.');
      return;
    }
    setStep(Math.min(PLAN_FORM_TOTAL_STEPS, Math.max(1, target)));
  };

  const buildFeaturesPayload = (): Record<string, string> => ({
    ...features,
    [CTA_LABEL_KEY]: ctaLabel.trim(),
    [TAGLINE_KEY]: tagline.trim(),
    [HIGHLIGHTED_KEY]: highlighted ? 'true' : 'false',
    [SELLABLE_KEY]: sellable ? 'true' : 'false',
    [SHOW_ON_PRICING_KEY]: showOnPricing ? 'true' : 'false',
    [MARKETING_FEATURES_KEY]: linesToValue(marketingFeatures),
  });

  // Edit mode: the plan already exists, so "Add" saves the price immediately (same
  // request AddPriceDialog on the card makes) instead of silently queuing it behind
  // the wizard's final Save — queuing it was the bug: closing the dialog, navigating
  // away, or a later step's Save failing (e.g. a feature-lock conflict) would discard
  // an "added" price the admin already believed was saved. Create mode still has no
  // plan id to attach a price to, so it has no choice but to queue until the plan
  // itself is created.
  const handleAddPrice = async () => {
    const dollars = Number(priceAmount);
    if (!priceAmount.trim() || !Number.isFinite(dollars) || dollars < 0) {
      setPriceAmountError('Enter a valid price amount.');
      return;
    }
    if (mode === 'edit' && plan) {
      try {
        await addPrice.mutateAsync({
          id: plan.id,
          body: {
            amount: Math.round(dollars * 100), // dollars → cents
            billingInterval: priceInterval,
            discountPercent: priceDiscount.trim()
              ? Number(priceDiscount)
              : null,
          },
        });
        showToast.success('Price added.');
      } catch (err) {
        showToast.error(getUserFriendlyError(err as never));
        return;
      }
    } else {
      setStagedPrices((prev) => [
        ...prev,
        {
          amount: priceAmount,
          interval: priceInterval,
          discount: priceDiscount,
        },
      ]);
    }
    setPriceAmount('');
    setPriceAmountError(null);
    setPriceDiscount('');
  };

  const removeStagedPrice = (index: number) =>
    setStagedPrices((prev) => prev.filter((_, i) => i !== index));

  // Create mode only by the time this runs (edit mode's "Add" already saved each price
  // immediately, so stagedPrices stays empty there) — entirely optional either way, an
  // empty staged list submits zero requests.
  const submitStagedPrices = async (planId: string) => {
    for (const staged of stagedPrices) {
      await addPrice.mutateAsync({
        id: planId,
        body: {
          amount: Math.round(Number(staged.amount) * 100), // dollars → cents
          billingInterval: staged.interval,
          discountPercent: staged.discount.trim()
            ? Number(staged.discount)
            : null,
        },
      });
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setNameError('Plan name is required.');
      setStep(1);
      return;
    }
    try {
      if (mode === 'create') {
        const created = await create.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
          isActive,
          features: buildFeaturesPayload(),
          lockedFields: Array.from(lockedKeys),
        });
        await submitStagedPrices(created.id);
        showToast.success('Plan created.');
      } else if (plan) {
        await update.mutateAsync({
          id: plan.id,
          body: {
            name: name.trim() || plan.name,
            description: description.trim(),
            sortOrder: Number(sortOrder) || 0,
            isActive,
          },
        });
        await updateFeatures.mutateAsync({
          id: plan.id,
          features: buildFeaturesPayload(),
        });
        await submitStagedPrices(plan.id);
        showToast.success('Plan updated.');
      }
      setOpen(false);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const isLastStep = step === PLAN_FORM_TOTAL_STEPS;
  const isDirty =
    mode === 'create'
      ? name.trim() !== '' || description.trim() !== '' || step > 1
      : step > 1;

  const pricesByInterval = plan
    ? ALL_BILLING_INTERVALS.map((interval) => ({
        interval,
        prices: plan.prices.filter((p) => p.billingInterval === interval),
      })).filter((group) => group.prices.length > 0)
    : [];

  return (
    <>
      {mode === 'create' ? (
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="size-4" /> New plan
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="ghost"
          title="Edit plan"
          onClick={() => onOpenChange(true)}
        >
          <PenBoxIcon />
        </Button>
      )}
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={mode === 'create' ? 'New plan' : `Edit ${plan?.name}`}
        description={
          mode === 'create'
            ? 'Creates a Stripe product with these initial feature/limit values.'
            : existingLockedKeys.size > 0
              ? `${existingLockedKeys.size} field(s) were locked when this plan was published and can't be changed.`
              : 'Changes sync to the Stripe product.'
        }
        size="lg"
        isDirty={isDirty}
        currentStep={step}
        totalSteps={PLAN_FORM_TOTAL_STEPS}
        stepLabels={PLAN_FORM_STEP_LABELS}
        onStepClick={mode === 'edit' ? goToStep : undefined}
        footer={(requestClose) => (
          <>
            <Button
              variant="outline"
              onClick={() => (step > 1 ? goToStep(step - 1) : requestClose())}
              disabled={isPending}
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            {mode === 'edit' ? (
              // Edit mode's steps are freely navigable (clickable step circles), so Save is
              // always available here too — no need to click through to the last step just to
              // save a change made on an earlier one.
              <>
                {!isLastStep && (
                  <Button
                    variant="outline"
                    onClick={() => goToStep(step + 1)}
                    disabled={isPending}
                  >
                    Next
                  </Button>
                )}
                <Button onClick={submit} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </>
            ) : isLastStep ? (
              <Button onClick={submit} disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Create plan
              </Button>
            ) : (
              <Button onClick={() => goToStep(step + 1)}>Next</Button>
            )}
          </>
        )}
      >
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="plan-name" required>
                Name
              </Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="e.g. Growth"
                aria-invalid={!!nameError}
              />
              {nameError && (
                <p className="text-destructive text-xs">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-desc">Description</Label>
              <Textarea
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal description"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plan-order">Sort order</Label>
                <Input
                  id="plan-order"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-status">Status</Label>
                <Select
                  value={isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setIsActive(v === 'active')}
                >
                  <SelectTrigger id="plan-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {mode === 'create' && (
              <p className="text-muted-foreground -mt-4 text-xs">
                Archived plans are hidden from the pricing page and can be
                activated later by editing them.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="plan-tagline">Pricing page tagline</Label>
              <Input
                id="plan-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Short subtitle shown under the plan name"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ToggleCard
                label="Highlighted"
                description='Show a "Most Popular" badge on the pricing page.'
                checked={highlighted}
                onCheckedChange={setHighlighted}
              />
              <ToggleCard
                label="Sellable"
                description='Show a buy button instead of "Contact us".'
                checked={sellable}
                onCheckedChange={setSellable}
              />
              <ToggleCard
                label="Show on pricing page"
                description="Public plans appear on the marketing site; turn off to keep this plan admin/internal-only."
                checked={showOnPricing}
                onCheckedChange={setShowOnPricing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-label">Purchase button label</Label>
              <Input
                id="cta-label"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder='Defaults to "Subscribe"'
              />
              <p className="text-muted-foreground text-xs">
                Shown on the pricing card's buy button. Leave blank to use the
                default.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-features">
                Pricing card feature list (one per line)
              </Label>
              <Textarea
                id="marketing-features"
                value={marketingFeatures}
                onChange={(e) => setMarketingFeatures(e.target.value)}
                rows={5}
                placeholder={
                  '2 projects, 10 sync jobs\nUp to 25,000 records/month\n...'
                }
              />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            {mode === 'create' && (
              <p className="text-muted-foreground text-xs">
                Check "Lock" next to any field you never want changed again —
                once this plan is created, those fields become permanently
                read-only.
              </p>
            )}
            <FeatureGroupStep
              groups={CREATE_PLAN_STEP_GROUPS[0]}
              features={features}
              setFeature={setFeature}
              lockable={mode === 'create'}
              lockedSet={lockedKeys}
              onToggleLock={toggleLock}
              lockedKeys={mode === 'edit' ? existingLockedKeys : undefined}
            />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <FeatureGroupStep
              groups={CREATE_PLAN_STEP_GROUPS[1]}
              features={features}
              setFeature={setFeature}
              lockable={mode === 'create'}
              lockedSet={lockedKeys}
              onToggleLock={toggleLock}
              lockedKeys={mode === 'edit' ? existingLockedKeys : undefined}
            />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4 rounded-3xl border p-4">
              <div>
                <p className="text-sm font-semibold">Add a price</p>
                <p className="text-muted-foreground text-xs">
                  {mode === 'edit'
                    ? 'Totally optional — saved immediately when you click Add, same as the plan card.'
                    : 'Totally optional — queued here and created once you finish this wizard.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="staged-price-amount" required>
                    Amount (USD)
                  </Label>
                  <Input
                    id="staged-price-amount"
                    type="number"
                    value={priceAmount}
                    onChange={(e) => {
                      setPriceAmount(e.target.value);
                      if (priceAmountError) setPriceAmountError(null);
                    }}
                    placeholder="29"
                    aria-invalid={!!priceAmountError}
                  />
                  {priceAmountError && (
                    <p className="text-destructive text-xs">
                      {priceAmountError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select
                    value={priceInterval}
                    onValueChange={(v) =>
                      setPriceInterval(v as BillingInterval)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="day">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-discount">Discount %</Label>
                  <Input
                    id="price-discount"
                    type="number"
                    value={priceDiscount}
                    onChange={(e) => setPriceDiscount(e.target.value)}
                    placeholder="16.67"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddPrice}
                  disabled={mode === 'edit' && addPrice.isPending}
                >
                  {mode === 'edit' && addPrice.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Add
                </Button>
              </div>
              {stagedPrices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {stagedPrices.map((staged, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1.5 rounded-full py-1 pr-1 pl-3 text-xs"
                    >
                      {money(
                        Math.round(Number(staged.amount) * 100) || 0,
                        'usd',
                      )}
                      /{staged.interval}
                      {staged.discount.trim() && ` · ${staged.discount}% off`}
                      <button
                        type="button"
                        onClick={() => removeStagedPrice(i)}
                        className="hover:text-destructive ml-1 rounded-full"
                        title="Remove"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {mode === 'edit' && plan && pricesByInterval.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Existing prices</p>
                {pricesByInterval.map((group) => (
                  <PriceGroup
                    key={group.interval}
                    plan={plan}
                    interval={group.interval}
                    prices={group.prices}
                    update={updatePrice}
                    loadingPriceId={loadingPriceId}
                    setLoadingPriceId={setLoadingPriceId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </FormDialog>
    </>
  );
}

function DeactivatePlanButton({ plan }: { plan: AdminApiPlan }) {
  const deactivate = useDeactivatePlanMutation();
  const { confirm } = useConfirmDialog();

  const run = () => {
    confirm({
      variant: 'danger',
      title: `Deactivate ${plan.name}?`,
      description:
        'The plan is hidden from the pricing page and its Stripe product is archived. Existing subscribers are not affected. You can re-activate it later by editing it.',
      confirmLabel: 'Deactivate',
      onConfirm: () =>
        deactivate.mutate(plan.id, {
          onSuccess: () => showToast.success('Plan deactivated.'),
          onError: (err) => showToast.error(getUserFriendlyError(err as never)),
        }),
    });
  };

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className="text-destructive"
      onClick={run}
      title="Deactivate plan"
    >
      <Archive />
    </Button>
  );
}

function ResyncPlanButton({ plan }: { plan: AdminApiPlan }) {
  const resync = useResyncPlanMutation();

  const run = async () => {
    try {
      const { relinked } = await resync.mutateAsync(plan.id);
      showToast.success(
        relinked.length
          ? `Re-synced ${relinked.length} price(s).`
          : 'Already in sync.',
      );
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={run}
      disabled={!plan.stripeProductId || resync.isPending || !plan.isActive}
      title="Re-sync prices with Stripe"
    >
      {resync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
    </Button>
  );
}

function PlanCard({ plan }: { plan: AdminApiPlan }) {
  const inactive = !plan.isActive;
  // Shared across all of this plan's interval groups (Monthly/Yearly/Daily) so activating or
  // deactivating one price disables every other price-toggle button on this plan card, not
  // just the ones in the same interval — prevents overlapping/duplicate price updates.
  const priceUpdate = useUpdatePriceMutation();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  return (
    <Card className="flex flex-col">
      {/* Plan identity + content dim when archived. Edit stays outside this wrapper so it
          never gets the dimmed/disabled treatment — it's the only way to re-activate. */}
      <div
        className={cn(
          'flex flex-1 flex-col gap-(--card-spacing)',
          inactive && 'opacity-60',
        )}
      >
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 font-semibold">
            {plan.name}
            <StatusBadge
              status={plan.isActive ? 'active' : 'inactive'}
              size="sm"
            />
            {plan.features[SHOW_ON_PRICING_KEY] === 'true' ? (
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-normal"
              >
                <Eye className="size-3" /> On pricing page
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 text-[10px] font-normal"
              >
                <EyeOff className="size-3" /> Internal only
              </Badge>
            )}
            <span className="text-muted-foreground text-xs font-normal">
              #{plan.sortOrder}
            </span>
          </CardTitle>
          <CardDescription>
            {plan.description ?? 'No description'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col space-y-4">
          {/* Pricing */}
          {plan.prices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No prices yet.</p>
          ) : (
            <div className="space-y-2">
              {ALL_BILLING_INTERVALS.map((interval) => ({
                interval,
                prices: plan.prices.filter(
                  (p) => p.billingInterval === interval,
                ),
              }))
                .filter((group) => group.prices.length > 0)
                .map((group) => (
                  <PriceGroup
                    key={group.interval}
                    plan={plan}
                    interval={group.interval}
                    prices={group.prices}
                    update={priceUpdate}
                    loadingPriceId={loadingPriceId}
                    setLoadingPriceId={setLoadingPriceId}
                  />
                ))}
            </div>
          )}
          {/* Features & limits */}
          <div className="bg-muted space-y-2 rounded-4xl p-3">
            <p className="text-xs font-bold tracking-wide uppercase">
              Features & Limits
            </p>
            <div className="space-y-1.5">
              {SUMMARY_FEATURE_KEYS.map((key) => {
                const field = PLAN_FEATURE_FIELDS.find((f) => f.key === key);
                if (!field) return null;
                const Icon = SUMMARY_FEATURE_ICONS[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between border-b py-1 text-sm last:border-b-0"
                  >
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Icon className="text-primary size-3.5" />
                      {SUMMARY_FEATURE_LABELS[key]}
                    </span>
                    <span className="font-semibold">
                      {formatFeatureValue(field, plan.features[key])}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Plan actions — Edit is always enabled (it's how an archived plan gets
          reactivated); the rest disable for real (not just fade) once archived. Add price is
          the one labeled action (it's the thing an admin comes to a plan card to do most), the
          rest are compact icon buttons so the footer stays a single tidy row. */}
      <CardFooter className="justify-between gap-2 border-t">
        <AddPriceDialog plan={plan} disabled={inactive} />
        <div className="flex items-center gap-1">
          <PlanFormDialog mode="edit" plan={plan} />
          <ResyncPlanButton plan={plan} />
          {plan.isActive && <DeactivatePlanButton plan={plan} />}
        </div>
      </CardFooter>
    </Card>
  );
}

export default function PlanManagementPage() {
  const { data, isLoading, isError, refetch } = useAdminPlansQuery();

  const header = (
    <PageHeader
      backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
      title="Plan Management"
      description="Manage the plan catalogue, pricing, and feature limits. Every change syncs to Stripe."
      actions={<PlanFormDialog mode="create" />}
    />
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {header}
        <ErrorState
          description="We couldn't load the plan catalogue."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {header}
      <div className="space-y-4">
        {data.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No plans yet"
            description="Create a plan to start building your pricing catalogue."
            viewMode="card"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
