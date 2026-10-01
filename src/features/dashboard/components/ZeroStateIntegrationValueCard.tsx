import { ArrowDown, ArrowRight } from 'lucide-react';

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

const SYNC_RULES = ['Choose records', 'Match fields', 'Apply sync rules'];

function FlowConnector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 xl:flex-col xl:gap-1.5 xl:py-0">
      <ArrowRight
        aria-hidden="true"
        className="text-primary hidden size-4.5 xl:block"
      />
      <ArrowDown aria-hidden="true" className="text-primary size-4.5 xl:hidden" />
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
    </div>
  );
}

export default function ZeroStateIntegrationValueCard({
  className,
}: ZeroStateIntegrationValueCardProps) {
  return (
    <section
      aria-labelledby="integration-blueprint-title"
      className={cn('w-full space-y-6 pt-4 sm:space-y-8', className)}
    >
      <HeadingPair
        titleId="integration-blueprint-title"
        title={
          <span className="text-lg font-bold sm:text-xl">
            What your integration will do
          </span>
        }
        subtitle={
          <span className="text-muted-foreground block text-sm leading-relaxed sm:text-base">
            Keep HubSpot updated with your field service data. Choose which
            records and fields to sync, then test a small sample before
            starting.
          </span>
        }
        className="max-w-3xl"
      />

      {/* 3-Stage Blueprint Flow */}
      <div className="grid items-center justify-items-center gap-4 xl:grid-cols-[minmax(0,1.2fr)_76px_minmax(0,1fr)_76px_minmax(0,1fr)] xl:gap-0">
        {/* Source Selection Card */}
        <div className="border-border bg-card/60 w-full max-w-sm space-y-4 rounded-3xl border border-dashed p-5 xl:max-w-none">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Choose your source
          </p>
          <ul className="grid grid-cols-3 gap-3">
            {SOURCES.map((source) => (
              <li
                key={source.id}
                className="flex min-w-0 flex-col items-center gap-2 text-center"
              >
                <PlatformIcon
                  platformId={source.id}
                  variant="avatar"
                  size="3xl"
                  className="size-12 sm:size-13"
                />
                <span className="text-foreground text-xs sm:text-sm font-medium">
                  {source.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <FlowConnector label="records" />

        {/* Rules Engine Card */}
        <div className="border-border bg-card/60 w-full max-w-sm space-y-3.5 rounded-3xl border border-dashed p-5 xl:max-w-none">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Synkazo applies your rules
          </p>
          <ol className="space-y-2.5">
            {SYNC_RULES.map((rule, index) => (
              <li key={rule} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="border-primary text-primary flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed text-xs font-semibold"
                >
                  {index + 1}
                </span>
                <span className="text-foreground text-sm font-semibold">
                  {rule}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <FlowConnector label="updates" />

        {/* Destination Card */}
        <div className="border-border bg-card/60 flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-dashed p-5 text-center xl:max-w-none">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Updated in HubSpot
          </p>
          <div className="flex flex-col items-center gap-2.5">
            <PlatformIcon
              platformId="hubspot"
              variant="avatar"
              size="3xl"
              className="size-12 sm:size-13"
            />
            <div className="space-y-1">
              <h3 className="text-foreground text-base font-bold">
                HubSpot CRM
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Contacts, companies, deals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Value Pillars Footer */}
      <div className="border-border grid gap-6 border-t border-dashed pt-6 md:grid-cols-3 md:gap-8">
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="You control what syncs"
          subtitle={
            <span className="text-sm leading-relaxed">
              Select records, fields, and direction.
            </span>
          }
        />
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="Match existing records"
          subtitle={
            <span className="text-sm leading-relaxed">
              Configure how records are identified and updated.
            </span>
          }
        />
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="Test before automating"
          subtitle={
            <span className="text-sm leading-relaxed">
              Review a small sample before the full sync.
            </span>
          }
        />
      </div>
    </section>
  );
}
