import { LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BillingToggle } from '@/components/common/BillingToggle';
import { PricingCard, type PricingCta } from '@/components/common/PricingCard';
import { Button } from '@/components/ui/button';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import type { PricingPlan, PublicBillingInterval } from '@/types/pricing';

// Kept local rather than a shared "site" module — the dashboard only ever needs this one
// address, and the rest of the marketing site's SITE constant (nav links, footer, social)
// has no reason to live in this app.
const SUPPORT_EMAIL = 'hello@synkazo.com';

/**
 * Hard paywall shown in place of the entire dashboard when a logged-in org has no active
 * subscription or trial. It is intentionally non-dismissible — there is no close affordance
 * and nothing renders behind it, so the only ways forward are to pick a plan, return to the
 * public site, or log out. Every dashboard route funnels through AppLayout, so mounting this
 * there blocks all of them at once.
 */
export default function SubscriptionPaywall() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useSynkazoAuth();
  const { plans, isLoading: plansLoading } = usePricingPlans();
  const [interval, setInterval] = useState<PublicBillingInterval>('month');

  // Mirrors PricingPage's buy CTA: admin-configured label wins, else "Subscribe".
  const buyLabel = (plan: PricingPlan): string => plan.ctaLabel ?? 'Subscribe';

  // A plan with no real entitlement wiring (not marked sellable) can't go through self-serve
  // checkout yet — mirrors PricingSection's gate so a custom admin-created plan never produces a
  // checkout link the /checkout page can't resolve.
  const ctaFor = (plan: PricingPlan): PricingCta =>
    plan.sellable
      ? {
          label: buyLabel(plan),
          // Disabled while plans are still loading from the API: `plan.id` briefly holds a
          // curated fallback slug (not a real DB id) before live data arrives, and /checkout
          // matches strictly by real id.
          disabled: plansLoading,
          onClick: () => {
            // Carry the route the paywall blocked (e.g. a HubSpot-install redirect into
            // /projects/:id/connections) through checkout so a successful purchase lands
            // the user back where they were headed instead of on /settings/billing.
            const redirect = encodeURIComponent(
              location.pathname + location.search,
            );
            navigate(
              `/checkout?plan=${plan.id}&interval=${interval}&redirect=${redirect}`,
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
    <div className="bg-background fixed inset-0 z-[70] flex flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-12 items-center justify-center rounded-2xl">
            <RefreshCw className="size-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Choose a plan to continue
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-sm sm:text-base">
              Your synkazo dashboard is locked until you start a plan. Pick one
              below to unlock syncing.
            </p>
          </div>
        </header>

        {plansLoading ? (
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
            </a>{' '}
            to get your account set up.
          </p>
        ) : (
          <>
            <BillingToggle value={interval} onChange={setInterval} />

            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
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
          </>
        )}

        <footer className="text-muted-foreground flex flex-col items-center justify-center gap-4 text-sm sm:flex-row">
          <Button asChild variant="ghost" size="sm">
            <a href={import.meta.env.VITE_FRONTEND_URL}>Return to homepage</a>
          </Button>
          <span className="hidden sm:inline">·</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" /> Log out
          </Button>
        </footer>
      </div>
    </div>
  );
}
