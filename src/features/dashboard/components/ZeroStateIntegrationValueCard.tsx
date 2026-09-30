import {
  FlaskConical,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { SynkazoMark } from '@/components/branding/SynkazoMark';
import { PlatformIcon } from '@/components/platform';
import HeadingPair from '@/components/shared/HeadingPair';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ZeroStateIntegrationValueCardProps {
  className?: string;
}

export default function ZeroStateIntegrationValueCard({
  className,
}: ZeroStateIntegrationValueCardProps) {
  return (
    <Card className={cn('relative p-4', className)}>
      <div className="space-y-4">
        <HeadingPair
          visualLevel="card"
          title="Connect Field Operations ➔ HubSpot CRM"
          subtitle="Bi-directional synchronization connecting multiple field service platforms into a unified HubSpot CRM with zero-overwrite protection."
          trailing={
            <Badge variant="secondary">
              <Sparkles aria-hidden="true" />
              Integration Blueprint
            </Badge>
          }
        />

        {/* Visual Pipeline Flow (Direct layout without redundant outer card wrapper) */}
        <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
          {/* Left: Multiple Field Sources (Small size component: rounded-2xl) */}
          <div className="bg-muted/30 border-border/70 flex flex-1 flex-col justify-between gap-2 rounded-2xl border p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="text-muted-foreground size-3.5" />
                <span className="text-foreground text-xs font-semibold">
                  Field Service Sources
                </span>
              </div>
              <Badge
                size="xs"
                variant="secondary"
                className="text-muted-foreground"
              >
                Choose Any
              </Badge>
            </div>

            <div className="space-y-1.5">
              {/* Source 1: ServiceTitan */}
              <div className="bg-background/80 border-border/50 flex items-center justify-between rounded-xl border px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <PlatformIcon
                    platformId="servicetitan"
                    variant="avatar"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium">
                      ServiceTitan
                    </p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      Customers • Locations • Invoices
                    </p>
                  </div>
                </div>
                <Badge
                  size="xs"
                  className="text-success bg-success/10 shrink-0"
                >
                  Live
                </Badge>
              </div>

              {/* Source 2: Dataforma */}
              <div className="bg-background/80 border-border/50 flex items-center justify-between rounded-xl border px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <PlatformIcon
                    platformId="dataforma"
                    variant="avatar"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium">
                      Dataforma
                    </p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      Accounts • Work Orders • Proposals
                    </p>
                  </div>
                </div>
                <Badge
                  size="xs"
                  className="text-success bg-success/10 shrink-0"
                >
                  Live
                </Badge>
              </div>

              {/* Source 3: Texada */}
              <div className="bg-background/80 border-border/50 flex items-center justify-between rounded-xl border px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <PlatformIcon
                    platformId="texada"
                    variant="avatar"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium">
                      Texada
                    </p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      Assets • Equipment • Rental Orders
                    </p>
                  </div>
                </div>
                <Badge
                  size="xs"
                  className="text-success bg-success/10 shrink-0"
                >
                  Live
                </Badge>
              </div>
            </div>

            <p className="text-muted-foreground text-center text-[10px]">
              + Salesforce, QuickBooks & Zapier coming soon
            </p>
          </div>

          {/* Center: Synkazo Middleware Logo (Decent size, calm muted styling, less focus) */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 px-1 text-center sm:px-2">
            <div className="bg-muted text-muted-foreground border-border/60 flex size-8.5 items-center justify-center rounded-xl border shadow-2xs">
              <SynkazoMark variant="badge" className="size-5 rounded-md" />
            </div>
            <div className="space-y-0.5">
              <span className="text-foreground text-[11px] font-semibold">
                Synkazo Middleware
              </span>
              <p className="text-muted-foreground max-w-[130px] text-[10px]">
                Sync Engine • Change Detection
              </p>
            </div>
          </div>

          {/* Right: Unified Destination HubSpot CRM (Small size component: rounded-2xl) */}
          <div className="bg-muted/30 border-border/70 flex flex-1 flex-col justify-between gap-2 rounded-2xl border p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="text-muted-foreground size-3.5" />
                <span className="text-foreground text-xs font-semibold">
                  Unified Destination
                </span>
              </div>
              <Badge
                size="xs"
                variant="secondary"
                className="text-muted-foreground"
              >
                Single CRM Record
              </Badge>
            </div>

            <div className="my-auto space-y-1.5 py-2 text-center">
              <div className="mx-auto flex size-10 items-center justify-center">
                <PlatformIcon platformId="hubspot" variant="avatar" size="lg" />
              </div>
              <HeadingPair
                visualLevel="item"
                level="h3"
                title="HubSpot CRM"
                subtitle="Contacts • Companies • Deals • Custom Line Items"
              />
            </div>

            <div className="bg-background/80 border-border/50 text-muted-foreground rounded-xl border px-2.5 py-1 text-center text-[10.5px]">
              All field service operations unified in one CRM
            </div>
          </div>
        </div>

        {/* 3 Visual Highlights (Muted icon wrappers & text to preserve focus on primary CTA) */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="bg-card border-border/70 flex items-center gap-2.5 rounded-2xl border p-2.5 sm:p-3">
            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-xl">
              <RefreshCw className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-foreground text-xs font-semibold">
                Continuous Sync
              </h4>
              <p className="text-muted-foreground truncate text-[10.5px]">
                Real-time delta matching
              </p>
            </div>
          </div>

          <div className="bg-card border-border/70 flex items-center gap-2.5 rounded-2xl border p-2.5 sm:p-3">
            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-xl">
              <FlaskConical className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-foreground text-xs font-semibold">
                Safe 5-Record Test
              </h4>
              <p className="text-muted-foreground truncate text-[10.5px]">
                Sandbox preview before sync
              </p>
            </div>
          </div>

          <div className="bg-card border-border/70 flex items-center gap-2.5 rounded-2xl border p-2.5 sm:p-3">
            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-xl">
              <ShieldCheck className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-foreground text-xs font-semibold">
                Zero Overwrite
              </h4>
              <p className="text-muted-foreground truncate text-[10.5px]">
                Protected system of record
              </p>
            </div>
          </div>
        </div>

        {/* Subtle Reassurance Footer (Muted icon, no duplicate button) */}
        <div className="border-border/60 text-muted-foreground flex items-center gap-2 border-t pt-3 text-[11.5px]">
          <ShieldCheck className="text-muted-foreground size-3.5 shrink-0" />
          <span>
            Follow the next step in the setup storyline above to create your
            project and begin.
          </span>
        </div>
      </div>
    </Card>
  );
}
