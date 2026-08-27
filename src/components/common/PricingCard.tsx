import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PricingPlan, PublicBillingInterval } from '@/types/pricing';

export interface PricingCta {
  label: string;
  /** Internal route — rendered as a <Link>. */
  to?: string;
  /** Click handler — rendered as a <button>. Ignored when `to` is set. */
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface PricingCardProps {
  plan: PricingPlan;
  interval: PublicBillingInterval;
  /** Which feature list to render — the caller picks preview vs full. */
  features: string[];
  /** Omit for a display-only card (landing preview). */
  cta?: PricingCta;
}

export function PricingCard({
  plan,
  interval,
  features,
  cta,
}: PricingCardProps) {
  return (
    <Card className="relative flex h-full flex-col overflow-visible">
      {plan.highlighted && (
        <Badge className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          Most Popular
        </Badge>
      )}
      <CardContent className="flex flex-1 flex-col">
        <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
        <p className="text-muted-foreground mb-6 text-sm">{plan.tagline}</p>

        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold">
            {plan.price[interval]}
          </span>
          {plan.period[interval] && (
            <span className="text-muted-foreground text-sm">
              {plan.period[interval]}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mb-6 h-4 text-xs">
          {plan.subNote?.[interval] ?? ''}
        </p>

        <ul className="mb-8 flex flex-1 flex-col gap-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className="text-primary mt-0.5 size-3.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {cta &&
          (cta.to ? (
            <Button
              asChild
              size="lg"
              variant={plan.highlighted ? 'default' : 'outline'}
            >
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              variant={plan.highlighted ? 'default' : 'outline'}
              onClick={cta.onClick}
              disabled={cta.disabled || cta.loading}
            >
              {cta.loading ? 'Redirecting…' : cta.label}
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
