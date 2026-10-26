import { ArrowRight, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { PlatformAnalyticsResponse } from '@/types/platformAnalytics';
import { AnalyticsSection } from './AnalyticsSection';
import { fullNumber } from './analyticsDisplay';

type Customers = NonNullable<
  PlatformAnalyticsResponse['sections']['customers']
>;
export default function CustomerPortfolio({
  customers,
  loading,
  error,
}: {
  customers?: Customers | null;
  loading: boolean;
  error?: string;
}) {
  const paid = customers?.paidOrganisations;
  return (
    <div id="overview-customers" className="min-w-0 scroll-mt-4">
      <AnalyticsSection
        title="Customer portfolio"
        icon={CreditCard}
        description="Current organisations by plan."
        loading={loading}
        error={error}
        action={
          <Button size="sm" variant="outline" asChild>
            <Link to="/super-admin/organisations">
              Organisations
              <ArrowRight />
            </Link>
          </Button>
        }
      >
        {!customers ? (
          <p className="text-muted-foreground py-6 text-sm">
            Customer distribution unavailable.
          </p>
        ) : !customers.total ? (
          <p className="text-muted-foreground py-6 text-sm">
            No organisations in this cohort.
          </p>
        ) : (
          <div className="max-h-48 space-y-2.5 overflow-y-auto pr-1">
            {customers.byPlan.map((plan) => {
              const width = `${(100 * plan.count) / customers.total}%`;
              const contents = (
                <>
                  <span
                    className="w-24 shrink-0 truncate text-xs"
                    title={plan.name}
                  >
                    {plan.name}
                  </span>
                  <span className="bg-muted/70 h-3.5 min-w-0 flex-1 overflow-hidden rounded-sm">
                    <span
                      className="bg-primary block h-full rounded-sm"
                      style={{ width }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-xs font-medium tabular-nums">
                    {fullNumber(plan.count)}
                  </span>
                </>
              );
              const targetPlanId = plan.planId ?? 'unassigned';
              return (
                <Link
                  key={targetPlanId}
                  to={`/super-admin/organisations?planId=${targetPlanId}`}
                  className="group hover:bg-accent/50 focus-visible:ring-ring focus-visible:outline-hidden flex items-center gap-3 rounded-xl p-1.5 transition-colors focus-visible:ring-2"
                  aria-label={`Filter by ${plan.name} plan: ${plan.count} organisations`}
                >
                  {contents}
                </Link>
              );
            })}
          </div>
        )}
        <div className="border-border/70 mt-4 grid grid-cols-3 gap-2 border-t pt-3">
          {[
            {
              label: 'Total organisations',
              value: customers ? fullNumber(customers.total) : '—',
            },
            {
              label: 'Confirmed paid',
              value: paid ? fullNumber(paid.confirmed) : '—',
            },
            {
              label: 'Payment unverified',
              value: paid ? fullNumber(paid.unverified) : '—',
            },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-sm font-semibold tabular-nums">{item.value}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-4">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Paid counts require a positive payment on the current subscription
          period. Plan access alone is not payment.
        </p>
      </AnalyticsSection>
    </div>
  );
}
