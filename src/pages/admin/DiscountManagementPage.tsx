import { Loader2, PenBox, Percent, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import PageHeader from '@/components/shared/PageHeader';
import SkeletonTable from '@/components/shared/skeletons/SkeletonTable';
import StatusBadge from '@/components/shared/StatusBadge';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getUserFriendlyError } from '@/lib/errorMessages';
import { showToast } from '@/lib/toast';
import {
  useAdminCouponsQuery,
  useAdminDiscountRulesQuery,
  useAdminDiscountSettingsQuery,
  useAdminPlansQuery,
  useCreateCouponMutation,
  useCreateDiscountRuleMutation,
  useDeactivateCouponMutation,
  useDeactivateDiscountRuleMutation,
  useResyncCouponMutation,
  useUpdateCouponMutation,
  useUpdateDiscountRuleMutation,
  useUpdateDiscountSettingsMutation,
} from '@/queries/useBilling';
import type {
  Coupon,
  CouponAppliesTo,
  CouponDuration,
  CreateCouponRequest,
  CreateDiscountRuleRequest,
  DiscountRule,
  DiscountRuleScope,
  RefundPolicy,
} from '@/types';

const DURATION_LABEL: Record<CouponDuration, string> = {
  once: 'First payment only',
  repeating: 'Repeating',
  forever: 'Forever',
};

const APPLIES_TO_LABEL: Record<CouponAppliesTo, string> = {
  all: 'Any purchase',
  new_purchase: 'New purchases',
  upgrade: 'Upgrades',
};

const SCOPE_LABEL: Record<DiscountRuleScope, string> = {
  new_purchase: 'New purchases',
  upgrade: 'Upgrades',
  interval_annual: 'Annual billing',
};

const REFUND_POLICY_LABEL: Record<RefundPolicy, string> = {
  credit_balance: 'Credit balance',
  refund: 'Refund to card',
  none: 'No refund',
};

function discountValue(coupon: Coupon): string {
  if (coupon.percentOff != null) return `${Number(coupon.percentOff)}% off`;
  return `$${((coupon.amountOff ?? 0) / 100).toFixed(2)} off`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Blank form state, shared by create and (seeded) edit. */
interface CouponForm {
  code: string;
  name: string;
  valueType: 'percent' | 'amount';
  value: string;
  duration: CouponDuration;
  durationInMonths: string;
  appliesTo: CouponAppliesTo;
  planIds: string[];
  maxRedemptions: string;
  maxRedemptionsPerOrg: string;
  expiresAt: string;
}

const emptyForm = (): CouponForm => ({
  code: '',
  name: '',
  valueType: 'percent',
  value: '',
  duration: 'once',
  durationInMonths: '3',
  appliesTo: 'all',
  planIds: [],
  maxRedemptions: '',
  maxRedemptionsPerOrg: '1',
  expiresAt: '',
});

/**
 * Shared create/edit dialog. `coupon` set = edit mode, where `code` is read-only (it may already
 * have been shared with customers) and a value change recreates the backing Stripe coupon.
 */
function CouponDialog({ coupon }: { coupon?: Coupon }) {
  const isEdit = !!coupon;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm());
  const [codeError, setCodeError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const plansQuery = useAdminPlansQuery();
  const create = useCreateCouponMutation();
  const update = useUpdateCouponMutation();
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'code' && codeError) setCodeError(null);
    if (key === 'value' && valueError) setValueError(null);
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      setCodeError(null);
      setValueError(null);
      setForm(
        coupon
          ? {
              code: coupon.code,
              name: coupon.name,
              valueType: coupon.percentOff != null ? 'percent' : 'amount',
              value:
                coupon.percentOff != null
                  ? String(Number(coupon.percentOff))
                  : String((coupon.amountOff ?? 0) / 100),
              duration: coupon.duration,
              durationInMonths: String(coupon.durationInMonths ?? 3),
              appliesTo: coupon.appliesTo,
              planIds: coupon.applicablePlanIds ?? [],
              maxRedemptions: coupon.maxRedemptions?.toString() ?? '',
              maxRedemptionsPerOrg: String(coupon.maxRedemptionsPerOrg),
              expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
            }
          : emptyForm(),
      );
    }
    setOpen(next);
  };

  const submit = async () => {
    if (!isEdit && !form.code.trim()) {
      setCodeError('Enter a promo code.');
      return;
    }
    const numericValue = Number(form.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setValueError('Enter a valid discount value.');
      return;
    }
    if (form.valueType === 'percent' && numericValue > 100) {
      setValueError('A percentage discount cannot exceed 100%.');
      return;
    }

    const body: CreateCouponRequest = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim() || form.code.trim().toUpperCase(),
      ...(form.valueType === 'percent'
        ? { percentOff: numericValue }
        : { amountOff: Math.round(numericValue * 100) }),
      duration: form.duration,
      ...(form.duration === 'repeating'
        ? { durationInMonths: Number(form.durationInMonths) || 1 }
        : {}),
      appliesTo: form.appliesTo,
      ...(form.planIds.length ? { applicablePlanIds: form.planIds } : {}),
      ...(form.maxRedemptions.trim()
        ? { maxRedemptions: Number(form.maxRedemptions) }
        : {}),
      maxRedemptionsPerOrg: Number(form.maxRedemptionsPerOrg) || 1,
      ...(form.expiresAt
        ? { expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString() }
        : {}),
    };

    try {
      if (isEdit) {
        const { code: _code, ...editable } = body;
        await update.mutateAsync({ id: coupon.id, body: editable });
        showToast.success('Coupon updated.');
      } else {
        await create.mutateAsync(body);
        showToast.success('Coupon created.');
      }
      setOpen(false);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const togglePlan = (planId: string, checked: boolean) =>
    setForm((prev) => ({
      ...prev,
      planIds: checked
        ? [...prev.planIds, planId]
        : prev.planIds.filter((id) => id !== planId),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon-sm" variant="ghost">
            <PenBox />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> New coupon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${coupon.code}` : 'New coupon'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Changing the discount value recreates the Stripe coupon (Stripe coupon values are immutable). Existing subscribers keep their current discount.'
              : 'Creates a Stripe coupon and promotion code. Eligibility limits are enforced here before Stripe is called.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code" required>
                Code
              </Label>
              <Input
                id="coupon-code"
                value={form.code}
                disabled={isEdit}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="SAVE10"
                className="uppercase"
                aria-invalid={!!codeError}
              />
              {isEdit && (
                <p className="text-muted-foreground text-xs">
                  The code can’t be changed once created.
                </p>
              )}
              {codeError && (
                <p className="text-destructive text-xs">{codeError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-name">Internal name</Label>
              <Input
                id="coupon-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Launch promo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label required>Discount</Label>
            <RadioGroup
              value={form.valueType}
              onValueChange={(v) => set('valueType', v as 'percent' | 'amount')}
              className="flex gap-4"
            >
              <label
                htmlFor="value-percent"
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem id="value-percent" value="percent" /> Percentage
              </label>
              <label
                htmlFor="value-amount"
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem id="value-amount" value="amount" /> Fixed amount
                (USD)
              </label>
            </RadioGroup>
            <Input
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              type="number"
              placeholder={form.valueType === 'percent' ? '10' : '20'}
              className="w-40"
              aria-invalid={!!valueError}
            />
            {valueError && (
              <p className="text-destructive text-xs">{valueError}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Applies for</Label>
              <Select
                value={form.duration}
                onValueChange={(v) => set('duration', v as CouponDuration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DURATION_LABEL) as CouponDuration[]).map(
                    (d) => (
                      <SelectItem key={d} value={d}>
                        {DURATION_LABEL[d]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {form.duration === 'repeating' && (
              <div className="space-y-2">
                <Label htmlFor="coupon-months">Number of months</Label>
                <Input
                  id="coupon-months"
                  type="number"
                  value={form.durationInMonths}
                  onChange={(e) => set('durationInMonths', e.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Redeemable on</Label>
            <Select
              value={form.appliesTo}
              onValueChange={(v) => set('appliesTo', v as CouponAppliesTo)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(APPLIES_TO_LABEL) as CouponAppliesTo[]).map(
                  (a) => (
                    <SelectItem key={a} value={a}>
                      {APPLIES_TO_LABEL[a]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Eligible plans</Label>
            <p className="text-muted-foreground text-xs">
              Leave all unchecked to allow the code on any plan.
            </p>
            <div className="space-y-2">
              {plansQuery.data?.map((plan) => (
                <div key={plan.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`plan-${plan.id}`}
                    checked={form.planIds.includes(plan.id)}
                    onCheckedChange={(v) => togglePlan(plan.id, v === true)}
                  />
                  <Label htmlFor={`plan-${plan.id}`} className="font-normal">
                    {plan.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="coupon-max">Total uses</Label>
              <Input
                id="coupon-max"
                type="number"
                value={form.maxRedemptions}
                onChange={(e) => set('maxRedemptions', e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-per-org">Uses per org</Label>
              <Input
                id="coupon-per-org"
                type="number"
                value={form.maxRedemptionsPerOrg}
                onChange={(e) => set('maxRedemptionsPerOrg', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-expiry">Expires</Label>
              <Input
                id="coupon-expiry"
                type="date"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create coupon'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CouponRow({ coupon }: { coupon: Coupon }) {
  const deactivate = useDeactivateCouponMutation();
  const resync = useResyncCouponMutation();
  const { confirm } = useConfirmDialog();

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      showToast.success(message);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
      <TableCell>
        <Badge className="bg-primary/10 text-primary">
          {discountValue(coupon)}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {APPLIES_TO_LABEL[coupon.appliesTo]}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {DURATION_LABEL[coupon.duration]}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {coupon.timesRedeemed}
        {coupon.maxRedemptions != null ? ` / ${coupon.maxRedemptions}` : ''}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(coupon.expiresAt)}
      </TableCell>
      <TableCell>
        <StatusBadge
          status={coupon.isActive ? 'active' : 'inactive'}
          size="sm"
        />
      </TableCell>
      <TableCell>
        {/* Not synced = no Stripe coupon, so the code would be rejected at checkout. */}
        {coupon.stripeCouponId ? (
          <span className="text-muted-foreground text-xs">Synced</span>
        ) : (
          <span className="text-destructive text-xs font-medium">
            Not synced
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <CouponDialog coupon={coupon} />
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={resync.isPending}
            onClick={() =>
              void run(() => resync.mutateAsync(coupon.id), 'Coupon re-synced.')
            }
          >
            <RefreshCw className="size-4" />
          </Button>
          {coupon.isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={deactivate.isPending}
              onClick={() =>
                confirm({
                  variant: 'warning',
                  title: `Disable ${coupon.code}?`,
                  description:
                    'Customers will no longer be able to redeem this coupon.',
                  confirmLabel: 'Disable',
                  onConfirm: () =>
                    run(
                      () => deactivate.mutateAsync(coupon.id),
                      'Coupon deactivated.',
                    ),
                })
              }
            >
              Disable
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Blank rule form state. */
interface RuleForm {
  name: string;
  scope: DiscountRuleScope;
  planId: string;
  fromPlanId: string;
  toPlanId: string;
  valueType: 'percent' | 'amount';
  value: string;
  duration: CouponDuration;
  durationInMonths: string;
  priority: string;
}

const ANY_PLAN = '__any__';

const emptyRuleForm = (): RuleForm => ({
  name: '',
  scope: 'new_purchase',
  planId: ANY_PLAN,
  fromPlanId: ANY_PLAN,
  toPlanId: ANY_PLAN,
  valueType: 'percent',
  value: '',
  duration: 'once',
  durationInMonths: '3',
  priority: '0',
});

/**
 * Create/edit dialog for an automatic rule. Plan scoping is conditional on the scope: an upgrade
 * rule can name a from → to path, everything else targets a single plan (or any).
 */
function RuleDialog({ rule }: { rule?: DiscountRule }) {
  const isEdit = !!rule;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyRuleForm());
  const [nameError, setNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const plansQuery = useAdminPlansQuery();
  const create = useCreateDiscountRuleMutation();
  const update = useUpdateDiscountRuleMutation();
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'name' && nameError) setNameError(null);
    if (key === 'value' && valueError) setValueError(null);
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      setNameError(null);
      setValueError(null);
      setForm(
        rule
          ? {
              name: rule.name,
              scope: rule.scope,
              planId: rule.planId ?? ANY_PLAN,
              fromPlanId: rule.fromPlanId ?? ANY_PLAN,
              toPlanId: rule.toPlanId ?? ANY_PLAN,
              valueType: rule.percentOff != null ? 'percent' : 'amount',
              value:
                rule.percentOff != null
                  ? String(Number(rule.percentOff))
                  : String((rule.amountOff ?? 0) / 100),
              duration: rule.duration,
              durationInMonths: String(rule.durationInMonths ?? 3),
              priority: String(rule.priority),
            }
          : emptyRuleForm(),
      );
    }
    setOpen(next);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setNameError('Give the rule a name.');
      return;
    }
    const numericValue = Number(form.value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setValueError('Enter a valid discount value.');
      return;
    }
    if (form.valueType === 'percent' && numericValue > 100) {
      setValueError('A percentage discount cannot exceed 100%.');
      return;
    }

    const orUndefined = (v: string) => (v === ANY_PLAN ? undefined : v);
    const body: CreateDiscountRuleRequest = {
      name: form.name.trim(),
      scope: form.scope,
      ...(form.scope === 'upgrade'
        ? {
            fromPlanId: orUndefined(form.fromPlanId),
            toPlanId: orUndefined(form.toPlanId),
          }
        : { planId: orUndefined(form.planId) }),
      ...(form.valueType === 'percent'
        ? { percentOff: numericValue }
        : { amountOff: Math.round(numericValue * 100) }),
      duration: form.duration,
      ...(form.duration === 'repeating'
        ? { durationInMonths: Number(form.durationInMonths) || 1 }
        : {}),
      priority: Number(form.priority) || 0,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: rule.id, body });
        showToast.success('Rule updated.');
      } else {
        await create.mutateAsync(body);
        showToast.success('Rule created.');
      }
      setOpen(false);
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  const planOptions = plansQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon-sm" variant="ghost">
            <PenBox />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> New rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${rule.name}` : 'New automatic rule'}
          </DialogTitle>
          <DialogDescription>
            Applied with no code entered. A customer-entered promo code always
            overrides an automatic rule — the two never stack.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name" required>
              Name
            </Label>
            <Input
              id="rule-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="10% off any upgrade"
              aria-invalid={!!nameError}
            />
            {nameError && (
              <p className="text-destructive text-xs">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Applies to</Label>
            <Select
              value={form.scope}
              onValueChange={(v) => set('scope', v as DiscountRuleScope)}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SCOPE_LABEL) as DiscountRuleScope[]).map((sc) => (
                  <SelectItem key={sc} value={sc}>
                    {SCOPE_LABEL[sc]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.scope === 'upgrade' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>From plan</Label>
                <Select
                  value={form.fromPlanId}
                  onValueChange={(v) => set('fromPlanId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_PLAN}>Any plan</SelectItem>
                    {planOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To plan</Label>
                <Select
                  value={form.toPlanId}
                  onValueChange={(v) => set('toPlanId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_PLAN}>Any plan</SelectItem>
                    {planOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={form.planId}
                onValueChange={(v) => set('planId', v)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_PLAN}>Any plan</SelectItem>
                  {planOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label required>Discount</Label>
            <RadioGroup
              value={form.valueType}
              onValueChange={(v) => set('valueType', v as 'percent' | 'amount')}
              className="flex gap-4"
            >
              <label
                htmlFor="rule-percent"
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem id="rule-percent" value="percent" /> Percentage
              </label>
              <label
                htmlFor="rule-amount"
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem id="rule-amount" value="amount" /> Fixed amount
                (USD)
              </label>
            </RadioGroup>
            <Input
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              type="number"
              placeholder={form.valueType === 'percent' ? '10' : '20'}
              className="w-40"
              aria-invalid={!!valueError}
            />
            {valueError && (
              <p className="text-destructive text-xs">{valueError}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Applies for</Label>
              <Select
                value={form.duration}
                onValueChange={(v) => set('duration', v as CouponDuration)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DURATION_LABEL) as CouponDuration[]).map(
                    (d) => (
                      <SelectItem key={d} value={d}>
                        {DURATION_LABEL[d]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {form.duration === 'repeating' && (
              <div className="space-y-2">
                <Label htmlFor="rule-months">Months</Label>
                <Input
                  id="rule-months"
                  type="number"
                  value={form.durationInMonths}
                  onChange={(e) => set('durationInMonths', e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                type="number"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              />
              <p className="text-muted-foreground text-xs">Higher wins.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ruleValue(rule: DiscountRule): string {
  if (rule.percentOff != null) return `${Number(rule.percentOff)}% off`;
  return `$${((rule.amountOff ?? 0) / 100).toFixed(2)} off`;
}

function DiscountRulesCard() {
  const rulesQuery = useAdminDiscountRulesQuery();
  const plansQuery = useAdminPlansQuery();
  const deactivate = useDeactivateDiscountRuleMutation();
  const activate = useUpdateDiscountRuleMutation();
  const { confirm } = useConfirmDialog();
  const rules = rulesQuery.data ?? [];

  const planName = (id: string | null) =>
    id ? (plansQuery.data?.find((p) => p.id === id)?.name ?? 'Unknown') : 'Any';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">
              Automatic rules
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Discounts applied with no code entered. A valid promo code always
              takes precedence over these.
            </CardDescription>
          </div>
          <RuleDialog />
        </div>
      </CardHeader>
      <CardContent>
        {rulesQuery.isLoading ? (
          <div className="overflow-hidden rounded-4xl border">
            <SkeletonTable rows={3} columns={7} />
          </div>
        ) : rulesQuery.isError ? (
          <ErrorState onRetry={() => rulesQuery.refetch()} />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Percent}
            title="No automatic rules"
            description="Customers only get a discount if they enter a promo code."
            viewMode="table"
          />
        ) : (
          <div className="overflow-hidden overflow-x-auto rounded-4xl border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Plans</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Applies for</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {SCOPE_LABEL[rule.scope]}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rule.scope === 'upgrade'
                        ? `${planName(rule.fromPlanId)} → ${planName(rule.toPlanId)}`
                        : planName(rule.planId)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary">
                        {ruleValue(rule)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {DURATION_LABEL[rule.duration]}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rule.priority}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={rule.isActive ? 'active' : 'inactive'}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <RuleDialog rule={rule} />
                        {rule.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={deactivate.isPending}
                            onClick={() =>
                              confirm({
                                variant: 'warning',
                                title: `Disable ${rule.name}?`,
                                description:
                                  'This rule will stop applying automatically to matching purchases.',
                                confirmLabel: 'Disable',
                                onConfirm: async () => {
                                  try {
                                    await deactivate.mutateAsync(rule.id);
                                    showToast.success('Rule deactivated.');
                                  } catch (err) {
                                    showToast.error(
                                      getUserFriendlyError(err as never),
                                    );
                                  }
                                },
                              })
                            }
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={activate.isPending}
                            onClick={async () => {
                              try {
                                await activate.mutateAsync({
                                  id: rule.id,
                                  body: { isActive: true },
                                });
                                showToast.success('Rule enabled.');
                              } catch (err) {
                                showToast.error(
                                  getUserFriendlyError(err as never),
                                );
                              }
                            }}
                          >
                            Enable
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Master discount switch. It lives in the Coupons card header because hiding the checkout
 * promo-code field is what admins come here to do — but it also stops automatic rules, so the
 * copy alongside it must stay explicit about that.
 */
function DiscountsEnabledToggle() {
  const { data, isLoading } = useAdminDiscountSettingsQuery();
  const update = useUpdateDiscountSettingsMutation();

  const toggle = async (enabled: boolean) => {
    try {
      await update.mutateAsync({ discountsEnabled: enabled });
      showToast.success(enabled ? 'Discounts enabled.' : 'Discounts disabled.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="discounts-enabled" className="text-sm font-semibold">
        Discounts enabled
      </Label>
      <Switch
        id="discounts-enabled"
        checked={data?.discountsEnabled ?? true}
        disabled={isLoading || update.isPending}
        onCheckedChange={(v) => void toggle(v)}
        size="sm"
      />
    </div>
  );
}

function DiscountSettingsCard() {
  const { data, isLoading, isError, refetch } = useAdminDiscountSettingsQuery();
  const update = useUpdateDiscountSettingsMutation();

  const [transferFeeDraft, setTransferFeeDraft] = useState('');
  const [refundPolicyDraft, setRefundPolicyDraft] =
    useState<RefundPolicy>('credit_balance');
  const [loadedFrom, setLoadedFrom] = useState<typeof data>(undefined);

  if (data && data !== loadedFrom) {
    setLoadedFrom(data);
    setTransferFeeDraft(String(data.transferFeePercent));
    setRefundPolicyDraft(data.refundPolicy);
  }

  const isDirty =
    !!data &&
    (transferFeeDraft !== String(data.transferFeePercent) ||
      refundPolicyDraft !== data.refundPolicy);

  const save = async () => {
    const n = Number(transferFeeDraft);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      showToast.error('Enter a percentage between 0 and 100.');
      return;
    }
    try {
      await update.mutateAsync({
        transferFeePercent: n,
        refundPolicy: refundPolicyDraft,
      });
      showToast.success('Settings updated.');
    } catch (err) {
      showToast.error(getUserFriendlyError(err as never));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Discount settings
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          How credit is carried across plan changes. The master discounts switch
          lives in the Coupons card above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="block" htmlFor="transfer-fee">
                  Transfer fee
                </Label>
                <p className="text-muted-foreground text-xs">
                  % deducted from a plan change's remaining credit before it's
                  applied to the new plan. Every upgrade or downgrade takes
                  effect immediately using this formula.
                </p>
              </div>
              <Input
                id="transfer-fee"
                type="number"
                min={0}
                max={100}
                value={transferFeeDraft}
                disabled={update.isPending}
                className="w-32"
                onChange={(e) => setTransferFeeDraft(e.target.value)}
              />
            </div>
            <div className="flex justify-between">
              <div className="space-y-2">
                <Label>Credit overflow policy</Label>
                <p className="text-muted-foreground text-xs">
                  What happens when a plan change's final credit is larger than
                  the new plan's price — e.g. downgrading to a much cheaper plan
                  early in the cycle. Card refunds carry more friction on
                  India-based accounts, so credit balance is the default.
                </p>
              </div>
              <Select
                value={refundPolicyDraft}
                disabled={update.isPending}
                onValueChange={(v) => setRefundPolicyDraft(v as RefundPolicy)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REFUND_POLICY_LABEL) as RefundPolicy[]).map(
                    (p) => (
                      <SelectItem key={p} value={p}>
                        {REFUND_POLICY_LABEL[p]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-xs font-semibold">
              Applied after an upgrade that produces surplus credit. If a refund
              can’t be issued (no matching charge found), the surplus is left as
              account credit and the fallback is recorded in the billing
              history.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={() => void save()}
                disabled={!isDirty || update.isPending}
              >
                {update.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save changes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DiscountManagementPage() {
  const couponsQuery = useAdminCouponsQuery();
  const coupons = useMemo(() => couponsQuery.data ?? [], [couponsQuery.data]);

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
        title="Discounts"
        description="Promo codes and global discount behaviour"
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                Create & manage coupons.
              </CardTitle>
              <CardDescription className="text-muted-foreground max-w-4xl text-xs">
                Codes customers can enter at checkout. Usage limits are enforced
                before Stripe is called. Turning discounts off removes the
                promo-code field from checkout, rejects any code submitted
                directly, and stops the automatic rules below.
              </CardDescription>
              <DiscountsEnabledToggle />
            </div>
            <CouponDialog />
            {/* <div className="flex items-center gap-4">
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          {couponsQuery.isLoading ? (
            <div className="overflow-hidden rounded-4xl border">
              <SkeletonTable rows={4} columns={8} />
            </div>
          ) : couponsQuery.isError ? (
            <ErrorState onRetry={() => couponsQuery.refetch()} />
          ) : coupons.length === 0 ? (
            <EmptyState
              icon={Percent}
              title="No coupons yet"
              description="Create one to start offering promo codes."
              viewMode="table"
            />
          ) : (
            <div className="overflow-hidden overflow-x-auto rounded-4xl border">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted/50">
                    <TableHead>Code</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Redeemable on</TableHead>
                    <TableHead>Applies for</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stripe</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <CouponRow key={coupon.id} coupon={coupon} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DiscountRulesCard />

      <DiscountSettingsCard />
    </div>
  );
}
