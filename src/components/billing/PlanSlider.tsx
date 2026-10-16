import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  AdminApiPlan,
  ApiPlan,
  ApiPrice,
  BillingInterval,
} from '@/types/billing';

export interface PlanSliderProps {
  plans: (ApiPlan | AdminApiPlan)[];
  currentPlanId: string | null;
  currentPlanName: string | null;
  currentBillingInterval?: BillingInterval | string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: ApiPlan | AdminApiPlan, price: ApiPrice) => void;
  onSavePlanChange?: (planId: string, reason: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  title?: string;
  className?: string;
}

const QUICK_REASONS = [
  'Customer requested upgrade',
  'Contract & terms renewal',
  'Quota adjustment',
  'Billing dispute resolution',
];

function formatPrice(price?: ApiPrice | null): string {
  if (!price) return 'Free';
  if (price.amount === 0) return 'Free';
  const unit = price.billingInterval === 'year' ? '/yr' : '/mo';
  return `$${(price.amount / 100).toFixed(0)}${unit}`;
}

function formatLimit(val?: string | number | null): string {
  if (val == null || val === 'null' || val === '') return 'Unlimited';
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toLocaleString();
}

/**
 * Unified SaaS Plan Change / Upgrade Slider Component
 * Shared across Organisation (Tenant) Billing and Super Admin Billing
 */
export default function PlanSlider({
  plans,
  currentPlanId,
  currentPlanName,
  currentBillingInterval = 'month',
  isOpen,
  onClose,
  onSelectPlan,
  onSavePlanChange,
  isSubmitting = false,
  errorMessage,
  title = 'Change or Upgrade Plan',
  className,
}: PlanSliderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(
    currentBillingInterval === 'year' ? 'year' : 'month',
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [previewPlan, setPreviewPlan] = useState<
    ApiPlan | AdminApiPlan | null
  >(null);

  const activePlans = useMemo(
    () =>
      plans.filter((p) => {
        if ('isActive' in p && p.isActive === false) return false;
        return !p.name.toLowerCase().includes('archived');
      }),
    [plans],
  );

  const currentPlan = useMemo(
    () =>
      plans.find(
        (p) =>
          p.id === currentPlanId ||
          (currentPlanName &&
            p.name.toLowerCase() === currentPlanName.toLowerCase()),
      ) ?? null,
    [plans, currentPlanId, currentPlanName],
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(activePlans.length / pageSize));

  // Current slice of 2 cards
  const visiblePlans = useMemo(() => {
    const start = currentPage * pageSize;
    return activePlans.slice(start, start + pageSize);
  }, [activePlans, currentPage]);

  if (!isOpen) return null;

  const handlePrev = () => {
    setCurrentPage((p) => Math.max(0, p - 1));
  };

  const handleNext = () => {
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
  };

  const handleCardClick = (
    plan: ApiPlan | AdminApiPlan,
    price?: ApiPrice,
  ) => {
    const isCurrent =
      plan.id === currentPlan?.id ||
      (currentPlanName &&
        plan.name.toLowerCase() === currentPlanName.toLowerCase());
    if (isCurrent) return;

    if (onSavePlanChange) {
      if (selectedPlanId === plan.id) {
        setSelectedPlanId('');
      } else {
        setSelectedPlanId(plan.id);
      }
    } else if (onSelectPlan && price) {
      onSelectPlan(plan, price);
    }
  };

  const handleSave = async () => {
    if (!selectedPlanId || reason.trim().length < 10 || isSubmitting) return;
    if (onSavePlanChange) {
      await onSavePlanChange(selectedPlanId, reason.trim());
      setSelectedPlanId('');
      setReason('');
    }
  };

  const canSave =
    Boolean(selectedPlanId) &&
    selectedPlanId !== currentPlan?.id &&
    reason.trim().length >= 10 &&
    !isSubmitting;

  return (
    <>
      <Card
        className={cn(
          'p-4 transition-all shadow-md',
          className,
        )}
      >
        <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Interval Toggle */}
            <div className="bg-background inline-flex rounded-lg p-0.5 border text-xs">
              <button
                type="button"
                onClick={() => setSelectedInterval('month')}
                className={cn(
                  'px-2.5 py-0.5 rounded-md font-medium transition-all text-[11px] cursor-pointer',
                  selectedInterval === 'month'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setSelectedInterval('year')}
                className={cn(
                  'px-2.5 py-0.5 rounded-md font-medium transition-all text-[11px] cursor-pointer',
                  selectedInterval === 'year'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Yearly
              </button>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close plan selector"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-3">
          {/* 2-Card Slider View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visiblePlans.map((plan) => {
              const isCurrent =
                plan.id === currentPlan?.id ||
                (currentPlanName &&
                  plan.name.toLowerCase() === currentPlanName.toLowerCase());
              const isSelected = selectedPlanId === plan.id;
              const price =
                plan.prices.find((p) => p.billingInterval === selectedInterval) ??
                plan.prices[0];

              const maxRecords = plan.features?.maxRecordsPerMonth ?? 'Unlimited';
              const maxProjects = plan.features?.maxProjects ?? 'Unlimited';

              return (
                <div
                  key={plan.id}
                  onClick={() => handleCardClick(plan, price)}
                  className={cn(
                    'relative flex flex-col justify-between rounded-xl border p-3 transition-all h-[112px] bg-card select-none text-left',
                    isCurrent
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20 cursor-default'
                      : isSelected
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5 cursor-pointer shadow-xs'
                        : 'border-border hover:border-muted-foreground/30 hover:shadow-xs cursor-pointer',
                  )}
                >
                  {/* Top Row: Plan Name, Price, and Eye Preview */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs capitalize text-foreground truncate">
                          {plan.name}
                        </h4>
                        {isCurrent ? (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 rounded-full font-semibold bg-primary/15 text-primary border-0"
                          >
                            Current
                          </Badge>
                        ) : isSelected ? (
                          <Badge
                            variant="default"
                            className="text-[9px] px-1.5 py-0 rounded-full font-semibold gap-0.5 border-0"
                          >
                            <Check className="size-2.5" />
                            Selected
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground text-[10px] mt-0.5">
                        {formatLimit(maxRecords)} recs &bull; {formatLimit(maxProjects)} projs
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-extrabold text-xs text-foreground font-mono">
                        {formatPrice(price)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 text-muted-foreground hover:text-primary rounded-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPlan(plan);
                        }}
                        title={`View full ${plan.name} limits & details`}
                        aria-label={`View full ${plan.name} details`}
                      >
                        <Eye className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Row: Action button */}
                  <div className="pt-1 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {price?.billingInterval ? `${price.billingInterval}ly billing` : 'Standard'}
                    </span>

                    {isCurrent ? (
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Check className="size-3 text-primary" /> Active Plan
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                        <Check className="size-3" /> Selected
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="h-6 text-[11px] px-2.5 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(plan, price);
                        }}
                        disabled={!price}
                      >
                        Select Plan <ArrowRight className="size-2.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reason & Confirmation Section (For direct save mode) */}
          {onSavePlanChange && selectedPlan && selectedPlan.id !== currentPlan?.id && (
            <div className="rounded-xl border bg-muted/40 p-3 space-y-2.5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b">
                <span className="text-muted-foreground font-medium">Changing plan:</span>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="capitalize text-muted-foreground">
                    {currentPlanName ?? 'Current'}
                  </span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="capitalize text-foreground font-bold">
                    {selectedPlan.name} (
                    {formatPrice(
                      selectedPlan.prices.find(
                        (p) => p.billingInterval === selectedInterval,
                      ) ?? selectedPlan.prices[0],
                    )}
                    )
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-change-reason" className="text-xs font-medium">
                    Audit Reason <span className="text-destructive">*</span>
                  </Label>
                  <span
                    className={cn(
                      'text-[10px] font-mono',
                      reason.trim().length >= 10
                        ? 'text-success font-semibold'
                        : 'text-muted-foreground',
                    )}
                  >
                    {reason.trim().length}/10 min chars
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {QUICK_REASONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setReason(tag)}
                      className="text-[10px] bg-muted hover:bg-secondary px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>

                <Textarea
                  id="plan-change-reason"
                  placeholder="Enter justification for this plan reassignment (required for audit)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {errorMessage && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-end gap-2 pt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setSelectedPlanId('');
                    setReason('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs font-semibold"
                  disabled={!canSave}
                  onClick={handleSave}
                >
                  {isSubmitting ? 'Saving…' : 'Save & Change Plan'}
                </Button>
              </div>
            </div>
          )}

          {/* Slider Navigation Arrows & Dots */}
          {totalPages > 1 && (
            <div className="mt-2.5 flex items-center justify-between px-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] rounded-lg text-muted-foreground"
                disabled={currentPage === 0}
                onClick={handlePrev}
                aria-label="Previous plans"
              >
                <ChevronLeft className="size-3 mr-0.5" /> Previous
              </Button>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-muted-foreground mr-1">
                  {currentPage + 1}/{totalPages}
                </span>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx)}
                    className={cn(
                      'size-1.5 rounded-full transition-all cursor-pointer',
                      currentPage === idx
                        ? 'bg-primary w-3'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                    )}
                    aria-label={`Go to page ${idx + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] rounded-lg text-muted-foreground"
                disabled={currentPage >= totalPages - 1}
                onClick={handleNext}
                aria-label="Next plans"
              >
                Next <ChevronRight className="size-3 ml-0.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Details & Quotas Preview Dialog */}
      <Dialog
        open={Boolean(previewPlan)}
        onOpenChange={(open) => !open && setPreviewPlan(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <DialogTitle className="capitalize">
                {previewPlan?.name} Plan Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Review quotas, feature flags, and limits before changing subscription.
            </DialogDescription>
          </DialogHeader>

          {previewPlan && (
            <div className="space-y-4 pt-2">
              {/* Pricing breakdown */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Monthly Price
                  </span>
                  <span className="font-bold text-sm font-mono">
                    {formatPrice(
                      previewPlan.prices.find((p) => p.billingInterval === 'month'),
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Annual Price
                  </span>
                  <span className="font-bold text-sm font-mono">
                    {formatPrice(
                      previewPlan.prices.find((p) => p.billingInterval === 'year'),
                    )}
                  </span>
                </div>
              </div>

              {/* Resource Limits & Quotas */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Resource Limits &amp; Quotas
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/30 p-2.5 border border-border/60">
                    <span className="text-muted-foreground block text-[10px]">Monthly Records</span>
                    <span className="font-bold font-mono">
                      {formatLimit(previewPlan.features?.maxRecordsPerMonth)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2.5 border border-border/60">
                    <span className="text-muted-foreground block text-[10px]">Projects</span>
                    <span className="font-bold font-mono">
                      {formatLimit(previewPlan.features?.maxProjects)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2.5 border border-border/60">
                    <span className="text-muted-foreground block text-[10px]">Sync Jobs</span>
                    <span className="font-bold font-mono">
                      {formatLimit(previewPlan.features?.maxJobs)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2.5 border border-border/60">
                    <span className="text-muted-foreground block text-[10px]">Team Members</span>
                    <span className="font-bold font-mono">
                      {formatLimit(previewPlan.features?.maxTeamMembers)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {previewPlan.description && (
                <div className="rounded-lg bg-muted/20 p-2.5 border border-border/40 text-xs text-muted-foreground">
                  {previewPlan.description}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewPlan(null)}
            >
              Close
            </Button>
            {previewPlan && previewPlan.id !== currentPlan?.id && (
              <Button
                size="sm"
                onClick={() => {
                  const targetPlan = previewPlan;
                  const price =
                    targetPlan.prices.find((p) => p.billingInterval === selectedInterval) ??
                    targetPlan.prices[0];
                  setPreviewPlan(null);
                  handleCardClick(targetPlan, price);
                }}
              >
                Select this plan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
