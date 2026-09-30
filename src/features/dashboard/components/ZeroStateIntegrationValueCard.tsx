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
    <div className="flex items-center justify-center gap-2 py-1 xl:flex-col xl:gap-1 xl:py-0">
      <ArrowRight
        aria-hidden="true"
        className="text-primary hidden size-4 xl:block"
      />
      <ArrowDown aria-hidden="true" className="text-primary size-4 xl:hidden" />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

export default function ZeroStateIntegrationValueCard({
  className,
}: ZeroStateIntegrationValueCardProps) {
  return (
    <section
      aria-labelledby="integration-blueprint-title"
      className={cn(
        'w-full max-w-[1040px] space-y-6 pt-6 sm:space-y-8',
        className,
      )}
    >
      <HeadingPair
        titleId="integration-blueprint-title"
        title={
          <span className="text-lg font-bold sm:text-xl">
            What your integration will do
          </span>
        }
        subtitle={
          <span className="block text-sm leading-6 sm:text-base">
            Keep HubSpot updated with your field service data. Choose which
            records and fields to sync, then test a small sample before
            starting.
          </span>
        }
        className="max-w-[600px]"
      />

      <div className="grid items-center justify-items-center gap-3 xl:grid-cols-[minmax(0,1.2fr)_72px_minmax(0,1fr)_72px_minmax(0,1fr)] xl:gap-0">
        <div className="border-border w-full max-w-[336px] space-y-4 rounded-3xl border border-dashed p-4 sm:p-5 xl:max-w-none">
          <p className="text-muted-foreground text-sm">Choose your source</p>
          <ul className="grid grid-cols-3 gap-3">
            {SOURCES.map((source) => (
              <li
                key={source.id}
                className="flex min-w-0 flex-col items-center gap-2"
              >
                <PlatformIcon
                  platformId={source.id}
                  variant="avatar"
                  size="3xl"
                  className="size-12 sm:size-14"
                />
                <span className="text-foreground text-xs sm:text-sm">
                  {source.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <FlowConnector label="records" />

        <div className="border-border w-full max-w-[336px] space-y-3 rounded-3xl border border-dashed p-4 sm:p-5 xl:max-w-none">
          <p className="text-muted-foreground text-sm">
            Synkazo applies your rules
          </p>
          <ol className="space-y-2">
            {SYNC_RULES.map((rule, index) => (
              <li key={rule} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="border-primary text-primary flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed text-xs"
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

        <div className="border-border flex w-full max-w-[336px] flex-col items-center gap-4 rounded-3xl border border-dashed p-4 text-center sm:p-5 xl:max-w-none">
          <p className="text-muted-foreground text-sm">Updated in HubSpot</p>
          <div className="flex flex-col items-center gap-2">
            <PlatformIcon
              platformId="hubspot"
              variant="avatar"
              size="3xl"
              className="size-12 sm:size-14"
            />
            <div className="space-y-1">
              <h3 className="text-foreground text-base font-bold">
                HubSpot CRM
              </h3>
              <p className="text-muted-foreground text-sm">
                Contacts, companies, deals
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-border grid gap-5 border-t border-dashed pt-6 md:grid-cols-3 md:gap-8">
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="You control what syncs"
          subtitle={
            <span className="text-sm leading-5">
              Select records, fields, and direction.
            </span>
          }
        />
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="Match existing records"
          subtitle={
            <span className="text-sm leading-5">
              Configure how records are identified and updated.
            </span>
          }
        />
        <HeadingPair
          level="h3"
          visualLevel="card"
          title="Test before automating"
          subtitle={
            <span className="text-sm leading-5">
              Review a small sample before the full sync.
            </span>
          }
        />
      </div>
    </section>
  );
}
