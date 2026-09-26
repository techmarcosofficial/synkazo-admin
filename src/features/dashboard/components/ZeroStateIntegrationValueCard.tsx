import {
  FlaskConical,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { SynkazoMark } from '@/components/branding/SynkazoMark';
import { PlatformIcon } from '@/components/platform';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ZeroStateIntegrationValueCardProps {
  className?: string;
}

export default function ZeroStateIntegrationValueCard({
  className,
}: ZeroStateIntegrationValueCardProps) {
  return (
    <Card
      className={cn(
        'border-border bg-card relative overflow-hidden rounded-4xl p-5 shadow-xs sm:p-6',
        className,
      )}
    >
      <div className="space-y-4">
        {/* Compact Header: muted badge, smaller title */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground text-base font-bold tracking-tight sm:text-lg">
              Connect Field Operations ➔ HubSpot CRM
            </h2>
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
              <Sparkles className="text-muted-foreground size-2.5" />
              Integration Blueprint
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Bi-directional synchronization connecting multiple field service platforms into a unified HubSpot CRM with zero-overwrite protection.
          </p>
        </div>

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
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                Choose Any
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Source 1: ServiceTitan */}
              <div className="bg-background/80 border-border/50 flex items-center justify-between rounded-xl border px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <PlatformIcon platformId="servicetitan" variant="avatar" size="sm" />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium">ServiceTitan</p>
                    <p className="text-muted-foreground truncate text-[10px]">Customers • Locations • Invoices</p>
                  </div>
                </div>
                <span className="text-success bg-success/10 shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-medium">
                  Live
                </span>
              </div>

              {/* Source 2: Dataforma */}
              <div className="bg-background/80 border-border/50 flex items-center justify-between rounded-xl border px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <PlatformIcon platformId="dataforma" variant="avatar" size="sm" />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium">Dataforma</p>
                    <p className="text-muted-foreground truncate text-[10px]">Accounts • Work Orders • Proposals</p>
                  </div>
                </div>
                <span className="text-success bg-success/10 shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-medium">
                  Live
                </span>
              </div>

              {/* Source 3: Texada */}
              <div className="bg-background/80 border-border/50 flex items-center justify-between rounded-xl border px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <PlatformIcon platformId="texada" variant="avatar" size="sm" />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs font-medium">Texada</p>
                    <p className="text-muted-foreground truncate text-[10px]">Assets • Equipment • Rental Orders</p>
                  </div>
                </div>
                <span className="text-success bg-success/10 shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-medium">
                  Live
                </span>
              </div>
            </div>

            <p className="text-muted-foreground text-center text-[10px]">
              + Salesforce, QuickBooks & Zapier coming soon
            </p>
          </div>

          {/* Center: Synkazo Middleware Logo (Decent size, calm muted styling, less focus) */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 px-1 text-center sm:px-2">
            <div className="bg-muted text-muted-foreground flex size-8.5 items-center justify-center rounded-xl border border-border/60 shadow-2xs">
              <SynkazoMark variant="badge" className="size-5 rounded-md" />
            </div>
            <div className="space-y-0.5">
              <span className="text-foreground text-[11px] font-semibold">Synkazo Middleware</span>
              <p className="text-muted-foreground text-[10px] max-w-[130px]">
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
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                Single CRM Record
              </span>
            </div>

            <div className="my-auto py-2 text-center space-y-1.5">
              <div className="mx-auto flex size-10 items-center justify-center">
                <PlatformIcon platformId="hubspot" variant="avatar" size="lg" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-foreground text-sm font-bold">HubSpot CRM</h3>
                <p className="text-muted-foreground text-[11px]">
                  Contacts • Companies • Deals • Custom Line Items
                </p>
              </div>
            </div>

            <div className="bg-background/80 border-border/50 rounded-xl border px-2.5 py-1 text-center text-[10.5px] text-muted-foreground">
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
              <h4 className="text-foreground text-xs font-semibold">Continuous Sync</h4>
              <p className="text-muted-foreground truncate text-[10.5px]">Real-time delta matching</p>
            </div>
          </div>

          <div className="bg-card border-border/70 flex items-center gap-2.5 rounded-2xl border p-2.5 sm:p-3">
            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-xl">
              <FlaskConical className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-foreground text-xs font-semibold">Safe 5-Record Test</h4>
              <p className="text-muted-foreground truncate text-[10.5px]">Sandbox preview before sync</p>
            </div>
          </div>

          <div className="bg-card border-border/70 flex items-center gap-2.5 rounded-2xl border p-2.5 sm:p-3">
            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-xl">
              <ShieldCheck className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-foreground text-xs font-semibold">Zero Overwrite</h4>
              <p className="text-muted-foreground truncate text-[10.5px]">Protected system of record</p>
            </div>
          </div>
        </div>

        {/* Subtle Reassurance Footer (Muted icon, no duplicate button) */}
        <div className="border-border/60 flex items-center gap-2 border-t pt-3 text-[11.5px] text-muted-foreground">
          <ShieldCheck className="text-muted-foreground size-3.5 shrink-0" />
          <span>
            Follow the next step in the setup storyline above to create your project and begin.
          </span>
        </div>
      </div>
    </Card>
  );
}
