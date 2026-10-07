import { GitMerge, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import { PlatformIcon } from '@/components/platform';
import HeadingPair from '@/components/shared/HeadingPair';
import { cn } from '@/lib/utils';

export interface ZeroStateIntegrationValueCardProps {
  className?: string;
}

const SOURCES = [
  { id: 'servicetitan', name: 'ServiceTitan' },
  { id: 'dataforma', name: 'Dataforma' },
  { id: 'texada', name: 'Texada' },
] as const;

const SYNC_RULES = [
  { title: 'Choose records', desc: 'Pick what to send' },
  { title: 'Match fields', desc: 'Map source to HubSpot' },
  { title: 'Apply sync rules', desc: 'Create or update' },
];

function DashedConnector({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 self-center py-2 xl:flex-col xl:gap-1.5 xl:py-0">
      {/* Desktop Horizontal Line */}
      <svg
        className="hidden h-3 w-16 text-border xl:block"
        viewBox="0 0 64 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0 6h54"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M49 1l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Mobile Vertical Line */}
      <svg
        className="h-8 w-3 text-border xl:hidden"
        viewBox="0 0 12 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 0v24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M1 20l5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="text-muted-foreground text-[10.5px] font-semibold uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export default function ZeroStateIntegrationValueCard({
  className,
}: ZeroStateIntegrationValueCardProps) {
  return (
    <section
      aria-labelledby="integration-blueprint-title"
      className={cn('w-full flex-1 flex flex-col justify-between pt-2', className)}
    >
      <div className="space-y-6">
        <div className="text-left">
          <HeadingPair
            titleId="integration-blueprint-title"
            visualLevel="card"
            title={
              <span className="text-sm font-semibold sm:text-base">
                What your integration will do
              </span>
            }
            subtitle={
              <span className="text-muted-foreground block text-[11.5px] leading-relaxed sm:text-xs">
                Keep HubSpot updated with your field service data. Choose which
                records and fields to sync, then test a small sample before
                starting.
              </span>
            }
            className="max-w-2xl"
          />
        </div>

      {/* 3-Stage Blueprint Flow - Mockup wrapper constrained & centered */}
      <div className="mx-auto w-full max-w-4xl xl:max-w-5xl">
        <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[1fr_64px_1.15fr_64px_1fr] xl:gap-0">
          {/* Panel 1: Source Platforms */}
          <div className="bg-card/40 border-border/80 flex flex-col justify-between rounded-2xl border border-dashed p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                Step 1 · Source
              </span>
              <span className="bg-muted/80 text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
                Choose 1
              </span>
            </div>

            <p className="text-foreground my-3 text-xs font-semibold">
              Choose your source
            </p>

            <ul className="grid grid-cols-3 gap-2">
              {SOURCES.map((source) => (
                <li
                  key={source.id}
                  className="bg-background/80 border-border/70 hover:border-primary/40 flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors"
                >
                  <PlatformIcon
                    platformId={source.id}
                    variant="avatar"
                    size="xl"
                    className="size-8 rounded-lg"
                  />
                  <span className="text-foreground text-[11px] font-medium truncate w-full">
                    {source.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <DashedConnector label="records" />

          {/* Panel 2: Synkazo Rules Engine (Highlighted broken border) */}
          <div className="bg-primary/5 border-primary/50 flex flex-col justify-between rounded-2xl border border-dashed p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-primary text-[11px] font-bold uppercase tracking-wider">
                Step 2 · Rules
              </span>
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Auto-Map
              </span>
            </div>

            <p className="text-foreground my-2.5 text-xs font-bold">
              Synkazo applies your rules
            </p>

            <ol className="relative space-y-2.5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:border-l before:border-dashed before:border-primary/30">
              {SYNC_RULES.map((rule, index) => (
                <li key={rule.title} className="relative flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="border-primary/60 bg-background text-primary flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed text-[11px] font-bold shadow-2xs"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground text-xs font-semibold leading-tight">
                      {rule.title}
                    </p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {rule.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <DashedConnector label="updates" />

          {/* Panel 3: Destination HubSpot CRM */}
          <div className="bg-card/40 border-border/80 flex flex-col items-center justify-between rounded-2xl border border-dashed p-5 text-center shadow-2xs">
            <div className="flex w-full items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                Step 3 · CRM
              </span>
              <span className="bg-success/15 text-success rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Destination
              </span>
            </div>

            <p className="text-foreground self-start my-2 text-xs font-semibold">
              Updated in HubSpot
            </p>

            <div className="bg-background/80 border-border/70 my-auto flex w-full flex-col items-center gap-2 rounded-xl border p-3">
              <PlatformIcon
                platformId="hubspot"
                variant="avatar"
                size="2xl"
                className="size-10 rounded-xl"
              />
              <div className="space-y-0.5">
                <h3 className="text-foreground text-sm font-bold">
                  HubSpot CRM
                </h3>
                <p className="text-muted-foreground text-[11px]">
                  Contacts · Companies · Deals
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Trust & Safety Reassurance Footer - Option 1: Clean Full-Width Strip */}
      <footer className="border-border/80 mt-auto border-t border-dashed pt-6 pb-2 sm:pt-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-foreground text-xs font-bold sm:text-sm">
                You control what syncs
              </h3>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed sm:text-xs">
                Select records, fields, and direction.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs">
              <GitMerge className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-foreground text-xs font-bold sm:text-sm">
                Match existing records
              </h3>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed sm:text-xs">
                Configure how records are identified and updated.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-foreground text-xs font-bold sm:text-sm">
                Test before automating
              </h3>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed sm:text-xs">
                Review a small sample before the full sync.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}
