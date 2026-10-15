import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AdminApiPlan } from '@/types/billing';

export interface PlanChangeSliderProps {
  plans: AdminApiPlan[];
  currentPlanId: string | null;
  currentPlanName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePlanChange: (planId: string, reason: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  className?: string;
}

const QUICK_REASONS = [
  'Customer requested upgrade',
  'Contract & terms renewal',
  'Quota adjustment',
  'Billing dispute resolution',
];

function formatPrice(plan: AdminApiPlan): string {
  const monthly = plan.prices?.find((p) => p.billingInterval === 'month');
  if (monthly) {
    return monthly.amount === 0 ? 'Free' : `$${(monthly.amount / 100).toFixed(0)}/mo`;
  }
  const anyPrice = plan.prices?.[0];
  if (anyPrice) {
    return anyPrice.amount === 0 ? 'Free' : `$${(anyPrice.amount / 100).toFixed(0)}/${anyPrice.billingInterval}`;
  }
  return plan.name.toLowerCase().includes('free') ? 'Free' : 'Custom';
}

function formatLimit(val?: string): string {
  if (!val || val === 'null' || val === '') return 'Unlimited';
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString();
}

export default function PlanChangeSlider({
  plans,
  currentPlanId,
  currentPlanName,
  isOpen,
  onClose,
  onSavePlanChange,
  isSubmitting = false,
  errorMessage,
  className,
}: PlanChangeSliderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const activePlans = useMemo(
    () => plans.filter((p) => p.isActive),
    [plans],
  );

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(activePlans.length / pageSize));

  // Current slice of 2 cards
  const visiblePlans = useMemo(() => {
    const start = currentPage * pageSize;
    return activePlans.slice(start, start + pageSize);
  }, [activePlans, currentPage]);

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

  if (!isOpen) return null;

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const handleSelectPlan = (plan: AdminApiPlan) => {
    if (plan.id === currentPlan?.id) return;
    if (selectedPlanId === plan.id) {
      setSelectedPlanId('');
    } else {
      setSelectedPlanId(plan.id);
    }
  };

  const handleSave = async () => {
    if (!selectedPlanId || reason.trim().length < 10 || isSubmitting) return;
    await onSavePlanChange(selectedPlanId, reason.trim());
    setSelectedPlanId('');
    setReason('');
  };

  const canSave =
    Boolean(selectedPlanId) &&
    selectedPlanId !== currentPlan?.id &&
    reason.trim().length >= 10 &&
    !isSubmitting;

  return (
    <Card className={cn('p-4 space-y-4 border-primary/30 bg-card/95', className)}>
      {/* Header with Title, slide controls, and close button */}
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ArrowRightLeft className="size-3.5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Change Subscription Plan
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Showing 2 plans per slide &bull; Select a plan to continue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Paging controls */}
            <div className="flex items-center gap-1 bg-muted/60 rounded-md p-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6 text-muted-foreground hover:text-foreground"
                onClick={handlePrev}
                disabled={currentPage === 0}
                aria-label="Previous plans"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-1 font-mono text-[11px] text-muted-foreground">
                {currentPage + 1}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6 text-muted-foreground hover:text-foreground"
                onClick={handleNext}
                disabled={currentPage >= totalPages - 1}
                aria-label="Next plans"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close plan selector"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* 2-Card Slider View */}
        <div className="grid grid-cols-2 gap-2.5">
          {visiblePlans.map((plan) => {
            const isCurrent =
              plan.id === currentPlan?.id ||
              (currentPlanName &&
                plan.name.toLowerCase() === currentPlanName.toLowerCase());
            const isSelected = selectedPlanId === plan.id;
            const priceStr = formatPrice(plan);

            return (
              <div
                key={plan.id}
                onClick={() => !isCurrent && handleSelectPlan(plan)}
                className={cn(
                  'flex flex-col justify-between rounded-2xl border p-3.5 transition-all select-none text-left min-h-[145px]',
                  isCurrent
                    ? 'border-border/60 bg-muted/30 cursor-default opacity-80'
                    : isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 cursor-pointer'
                      : 'border-border hover:border-primary/60 hover:bg-muted/40 cursor-pointer',
                )}
              >
                {/* Top: Plan name & Badge/Price */}
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-xs capitalize text-foreground truncate">
                      {plan.name}
                    </h4>
                    {isCurrent ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-medium"
                      >
                        Current
                      </Badge>
                    ) : isSelected ? (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0 font-medium gap-0.5"
                      >
                        <Check className="size-2.5" />
                        Selected
                      </Badge>
                    ) : null}
                  </div>

                  {/* Price */}
                  <div className="mt-1 font-mono text-xs font-semibold text-primary">
                    {priceStr}
                  </div>

                  {/* Feature Limits summary */}
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Projects:</span>
                      <span className="font-medium text-foreground">
                        {formatLimit(plan.features?.maxProjects)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Jobs:</span>
                      <span className="font-medium text-foreground">
                        {formatLimit(plan.features?.maxJobs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Records:</span>
                      <span className="font-medium text-foreground truncate max-w-[70px]">
                        {formatLimit(plan.features?.maxRecordsPerMonth)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom button/indicator */}
                <div className="pt-2 mt-2 border-t text-[11px]">
                  {isCurrent ? (
                    <span className="text-muted-foreground font-medium">
                      Active Plan
                    </span>
                  ) : isSelected ? (
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <Check className="size-3" /> Ready to change
                    </span>
                  ) : (
                    <span className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-1">
                      Select plan &rarr;
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reason & Confirmation Section (Appears after selecting another plan card) */}
        {selectedPlan && selectedPlan.id !== currentPlan?.id && (
          <div className="rounded-2xl border bg-muted/40 p-3.5 space-y-3 animate-in fade-in-50 duration-200">
            {/* Target change summary */}
            <div className="flex items-center justify-between text-xs pb-2 border-b">
              <span className="text-muted-foreground font-medium">
                Changing plan:
              </span>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="capitalize text-muted-foreground">
                  {currentPlanName ?? 'Current'}
                </span>
                <ArrowRight className="size-3 text-muted-foreground" />
                <span className="capitalize text-foreground font-bold">
                  {selectedPlan.name} ({formatPrice(selectedPlan)})
                </span>
              </div>
            </div>

            {/* Reason input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="plan-change-reason"
                  className="text-xs font-medium"
                >
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

              {/* Quick reason helper tags */}
              <div className="flex flex-wrap gap-1">
                {QUICK_REASONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setReason(tag)}
                    className="text-[10px] bg-muted hover:bg-secondary px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
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

            {/* Actions: Cancel or Save */}
            <div className="flex items-center justify-end gap-2 pt-1">
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
      </CardContent>
    </Card>
  );
}
