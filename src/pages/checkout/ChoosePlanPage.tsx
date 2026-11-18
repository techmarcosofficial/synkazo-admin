import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BillingToggle } from '@/components/common/BillingToggle';
import { PricingCard, type PricingCta } from '@/components/common/PricingCard';
import { SynkazoMark } from '@/components/branding/SynkazoMark';
import HeadingPair from '@/components/shared/HeadingPair';
import { Button } from '@/components/ui/button';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import type { PricingPlan, PublicBillingInterval } from '@/types/pricing';

const SUPPORT_EMAIL = 'hello@synkazo.com';

/**
 * In-app plan picker. Lists the public plan catalogue (the same cards the
 * paywall shows) and sends the chosen plan into the existing /checkout flow,
 * so changing or choosing a plan never leaves the app for the marketing site.
 */
export default function ChoosePlanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { plans, isLoading } = usePricingPlans();
  const [interval, setInterval] = useState<PublicBillingInterval>('month');

  // Carry a post-purchase redirect target through checkout when one was passed.
  const redirectParam = params.get('redirect');

  const ctaFor = (plan: PricingPlan): PricingCta =>
    plan.sellable
      ? {
          label: plan.ctaLabel ?? 'Choose plan',
          disabled: isLoading,
          onClick: () => {
            const redirect = redirectParam
              ? `&redirect=${encodeURIComponent(redirectParam)}`
              : '';
            navigate(
              `/checkout?plan=${plan.id}&interval=${interval}${redirect}`,
            );
          },
        }
      : {
          label: plan.ctaLabel ?? 'Contact us',
          onClick: () => {
            window.location.href = `mailto:${SUPPORT_EMAIL}?subject=synkazo ${plan.name}`;
          },
        };

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <BillingToggle value={interval} onChange={setInterval} />
        </div>

        <header className="flex flex-col items-center gap-4 text-center">
          <SynkazoMark className="size-12" />
          <HeadingPair
            level="h1"
            title="Choose your plan"
            subtitle="Pick the plan that fits. You can change it any time."
            className="items-center"
          />
        </header>

        {isLoading ? (
          <p className="text-muted-foreground text-center text-sm">
            Loading plans…
          </p>
        ) : plans.length === 0 ? (
          <p className="text-muted-foreground mx-auto max-w-xl text-center text-sm">
            No plans are available right now. Please{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=synkazo plan enquiry`}
              className="text-primary hover:underline"
            >
              contact support
            </a>
            .
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                interval={interval}
                features={plan.features}
                cta={ctaFor(plan)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
