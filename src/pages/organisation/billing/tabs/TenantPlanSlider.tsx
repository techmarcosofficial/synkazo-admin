import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
import { cn } from '@/lib/utils';
import type { ApiPlan, ApiPrice, BillingInterval } from '@/types/billing';

export interface TenantPlanSliderProps {
  plans: ApiPlan[];
  currentPlanId: string | null;
  currentPlanName: string | null;
  currentBillingInterval?: BillingInterval | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: ApiPlan, price: ApiPrice) => void;
  className?: string;
}

function formatPrice(price?: ApiPrice): string {
  if (!price) return 'Free';
  if (price.amount === 0) return 'Free';
  const unit = price.billingInterval === 'year' ? '/yr' : '/mo';
  return `$${(price.amount / 100).toFixed(0)}${unit}`;
}

function formatLimit(val?: string): string {
  if (!val || val === 'null' || val === '') return 'Unlimited';
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString();
}

export default function TenantPlanSlider({
  plans,
  currentPlanId,
  currentPlanName,
  currentBillingInterval = 'month',
  isOpen,
  onClose,
  onSelectPlan,
  className,
}: TenantPlanSliderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(
    currentBillingInterval || 'month',
  );
  const [previewPlan, setPreviewPlan] = useState<ApiPlan | null>(null);

  const activePlans = useMemo(
    () => plans.filter((p) => !p.name.toLowerCase().includes('archived')),
    [plans],
  );

  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(activePlans.length / pageSize));

  // Current slice of 2 cards
  const visiblePlans = useMemo(() => {
    const start = currentPage * pageSize;
    return activePlans.slice(start, start + pageSize);
  }, [activePlans, currentPage]);

  if (!isOpen) return null;

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
            <CardTitle className="text-sm font-semibold">Change or Upgrade Plan</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {/* Interval Toggle */}
            <div className="bg-background inline-flex rounded-lg p-0.5 border text-xs">
              <button
                type="button"
                onClick={() => setSelectedInterval('month')}
                className={cn(
                  'px-2.5 py-0.5 rounded-md font-medium transition-all text-[11px]',
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
                  'px-2.5 py-0.5 rounded-md font-medium transition-all text-[11px]',
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
          {/* Slider Container */}
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visiblePlans.map((plan) => {
                const isCurrent = plan.id === currentPlanId;
                const price =
                  plan.prices.find((p) => p.billingInterval === selectedInterval) ??
                  plan.prices[0];

                const maxRecords = plan.features?.maxRecordsPerMonth ?? 'Unlimited';
                const maxProjects = plan.features?.maxProjects ?? 'Unlimited';

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative flex flex-col justify-between rounded-xl border p-3 transition-all h-[112px] bg-card',
                      isCurrent
                        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30 hover:shadow-xs',
                    )}
                  >
                    {/* Top Row: Plan Name, Price, and Eye Preview */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs capitalize text-foreground truncate">
                            {plan.name}
                          </span>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 rounded-full font-semibold bg-primary/15 text-primary border-0"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-0.5">
                          {formatLimit(maxRecords)} recs &bull; {formatLimit(maxProjects)} projs
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-extrabold text-xs text-foreground">
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
                          title={`Preview ${plan.name} features & quotas`}
                          aria-label={`Preview ${plan.name}`}
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
                      ) : (
                        <Button
                          size="sm"
                          className="h-6 text-[11px] px-2.5 rounded-lg"
                          onClick={() => price && onSelectPlan(plan, price)}
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

            {/* Slider Navigation Arrows (if more than 2 plans) */}
            {totalPages > 1 && (
              <div className="mt-2.5 flex items-center justify-between px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] rounded-lg text-muted-foreground"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-3 mr-0.5" /> Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPage(idx)}
                      className={cn(
                        'size-1.5 rounded-full transition-all',
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next <ChevronRight className="size-3 ml-0.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Details & Quotas Preview Dialog */}
      <Dialog open={!!previewPlan} onOpenChange={(open) => !open && setPreviewPlan(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <DialogTitle className="capitalize">{previewPlan?.name} Plan Details</DialogTitle>
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
                  <span className="font-bold text-sm">
                    {formatPrice(previewPlan.prices.find((p) => p.billingInterval === 'month'))}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Annual Price
                  </span>
                  <span className="font-bold text-sm">
                    {formatPrice(previewPlan.prices.find((p) => p.billingInterval === 'year'))}
                  </span>
                </div>
              </div>

              {/* Resource Quotas */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resource Quotas
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[10px]">Monthly Records</span>
                    <span className="font-semibold text-foreground">
                      {formatLimit(previewPlan.features?.maxRecordsPerMonth)}
                    </span>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[10px]">Max Projects</span>
                    <span className="font-semibold text-foreground">
                      {formatLimit(previewPlan.features?.maxProjects)}
                    </span>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[10px]">Max Sync Jobs</span>
                    <span className="font-semibold text-foreground">
                      {formatLimit(previewPlan.features?.maxJobs)}
                    </span>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <span className="text-muted-foreground block text-[10px]">Team Members</span>
                    <span className="font-semibold text-foreground">
                      {formatLimit(previewPlan.features?.maxTeamMembers)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Included Capabilities */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Capabilities
                </h5>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b">
                    <span className="text-muted-foreground">Priority Scheduling</span>
                    <span className="font-medium">
                      {previewPlan.features?.priorityScheduling === 'true' ? 'Included' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b">
                    <span className="text-muted-foreground">Custom Objects</span>
                    <span className="font-medium">
                      {previewPlan.features?.customObjects === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Log Retention</span>
                    <span className="font-medium">
                      {previewPlan.features?.logRetentionDays
                        ? `${previewPlan.features.logRetentionDays} days`
                        : '7 days'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewPlan(null)}>
              Close
            </Button>
            {previewPlan && previewPlan.id !== currentPlanId && (
              <Button
                size="sm"
                onClick={() => {
                  const targetPrice =
                    previewPlan.prices.find((p) => p.billingInterval === selectedInterval) ??
                    previewPlan.prices[0];
                  if (targetPrice) {
                    setPreviewPlan(null);
                    onSelectPlan(previewPlan, targetPrice);
                  }
                }}
              >
                Upgrade to {previewPlan.name}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
