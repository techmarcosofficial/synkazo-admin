import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BillingToggle } from '@/components/common/BillingToggle';
import HeadingPair from '@/components/shared/HeadingPair';
import { PricingCard, type PricingCta } from '@/components/common/PricingCard';
import { SynkazoMark } from '@/components/branding/SynkazoMark';
import { Button } from '@/components/ui/button';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { cn } from '@/lib/utils';
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
  const planViewportRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollControls = useCallback(() => {
    const viewport = planViewportRef.current;
    if (!viewport) return;
    setCanScrollBack(viewport.scrollLeft > 2);
    setCanScrollForward(
      viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2,
    );
  }, []);

  useEffect(() => {
    const viewport = planViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = 0;
    updateScrollControls();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateScrollControls);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [plans.length, updateScrollControls]);

  const scrollOnePlan = (direction: -1 | 1) => {
    const viewport = planViewportRef.current;
    if (!viewport) return;
    const cards = Array.from(
      viewport.querySelectorAll<HTMLElement>('[data-plan-slide]'),
    );
    if (cards.length < 2) return;
    const positions = cards.map(
      (card) => card.offsetLeft - cards[0].offsetLeft,
    );
    const currentIndex = positions.reduce(
      (nearest, position, index) =>
        Math.abs(position - viewport.scrollLeft) <
        Math.abs(positions[nearest] - viewport.scrollLeft)
          ? index
          : nearest,
      0,
    );
    const nextIndex = Math.max(
      0,
      Math.min(cards.length - 1, currentIndex + direction),
    );
    viewport.scrollTo({ left: positions[nextIndex], behavior: 'smooth' });
  };

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

  const planCards = plans.map((plan) => (
    <PricingCard
      key={plan.id}
      plan={plan}
      interval={interval}
      features={plan.features}
      cta={ctaFor(plan)}
    />
  ));

  return (
    <div className="bg-background fixed inset-0 z-[70] flex flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col items-center gap-4 text-center">
          <SynkazoMark className="size-12" />
          <HeadingPair
            level="h1"
            title="Choose a plan to continue"
            subtitle="Your synkazo dashboard is locked until you start a plan. Pick one below to unlock syncing."
            className="items-center"
          />
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
            <div className="relative flex flex-col items-center gap-4 sm:justify-center">
              <BillingToggle value={interval} onChange={setInterval} />
              {plans.length > 3 && (
                <div className="flex items-center gap-2 sm:absolute sm:right-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label="Previous plan"
                    aria-controls="available-plan-cards"
                    disabled={!canScrollBack}
                    onClick={() => scrollOnePlan(-1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label="Next plan"
                    aria-controls="available-plan-cards"
                    disabled={!canScrollForward}
                    onClick={() => scrollOnePlan(1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>

            {plans.length > 3 ? (
              <div
                id="available-plan-cards"
                ref={planViewportRef}
                role="region"
                aria-label="Available plans"
                tabIndex={0}
                onScroll={updateScrollControls}
                className="grid snap-x snap-mandatory [scrollbar-width:none] auto-cols-[100%] grid-flow-col items-stretch gap-6 overflow-x-auto pt-4 pb-2 sm:auto-cols-[calc((100%_-_1.5rem)/2)] lg:auto-cols-[calc((100%_-_3rem)/3)] [&::-webkit-scrollbar]:hidden"
              >
                {planCards.map((card) => (
                  <div
                    key={card.key}
                    data-plan-slide
                    className="min-w-0 snap-start"
                  >
                    {card}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  'grid grid-cols-1 items-stretch gap-6',
                  plans.length === 1 && 'mx-auto w-full max-w-sm',
                  plans.length === 2 &&
                    'mx-auto w-full max-w-3xl md:grid-cols-2',
                  plans.length === 3 && 'md:grid-cols-3',
                )}
              >
                {planCards}
              </div>
            )}
          </>
        )}

        <footer className="text-muted-foreground border-border/70 flex flex-col items-center justify-center gap-4 border-t pt-6 text-sm sm:flex-row">
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
