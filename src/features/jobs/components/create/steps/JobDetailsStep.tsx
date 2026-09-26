import { ArrowLeftRight, InfoIcon, Sparkles } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import PlatformObjectSelector from '../PlatformObjectSelector';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import SyncDirectionFields from '@/features/jobs/components/SyncDirectionFields';
import { KNOWN_PIPELINE_OBJECTS, type JobConfig } from '@/features/jobs/types';
import { supportsCustomObjects } from '@/lib/platformCapabilities';
import { cn } from '@/lib/utils';
import type { ObjectItem } from '@/queries/useConnections';
import type { Connection } from '@/types';

interface SyncRecipe {
  id: string;
  title: string;
  description: string;
  sourcePlatform: string;
  destPlatform: string;
  sourceObject: string;
  destObject: string;
  name: string;
  badge?: string;
}

const PRESET_RECIPES: SyncRecipe[] = [
  {
    id: 'st-hb-customers-contacts',
    title: 'Customers → Contacts',
    description: 'Sync homeowner and commercial client profiles into HubSpot CRM contacts.',
    sourcePlatform: 'servicetitan',
    destPlatform: 'hubspot',
    sourceObject: 'customers',
    destObject: 'contacts',
    name: 'Customers → Contacts',
    badge: 'Most Popular',
  },
  {
    id: 'st-hb-customers-companies',
    title: 'Customers → Companies',
    description: 'Sync commercial accounts and business clients into HubSpot CRM companies.',
    sourcePlatform: 'servicetitan',
    destPlatform: 'hubspot',
    sourceObject: 'customers',
    destObject: 'companies',
    name: 'Customers → Companies',
    badge: 'Most Popular',
  },
  {
    id: 'st-hb-jobs-deals',
    title: 'Jobs → Deals',
    description: 'Sync booked, active, and completed jobs into HubSpot sales pipeline deals.',
    sourcePlatform: 'servicetitan',
    destPlatform: 'hubspot',
    sourceObject: 'jobs',
    destObject: 'deals',
    name: 'Jobs → Deals',
  },
  {
    id: 'st-hb-invoices-deals',
    title: 'Invoices → Deals',
    description: 'Track invoice totals, payments, and balances directly inside HubSpot deals.',
    sourcePlatform: 'servicetitan',
    destPlatform: 'hubspot',
    sourceObject: 'invoices',
    destObject: 'deals',
    name: 'Invoices → Deals',
  },
  {
    id: 'hb-st-contacts-customers',
    title: 'Contacts → Customers',
    description: 'Sync inbound CRM marketing leads and contacts into ServiceTitan customer records.',
    sourcePlatform: 'hubspot',
    destPlatform: 'servicetitan',
    sourceObject: 'contacts',
    destObject: 'customers',
    name: 'Contacts → Customers',
    badge: 'Two-Way Sync',
  },
  {
    id: 'hb-st-companies-customers',
    title: 'Companies → Customers',
    description: 'Sync CRM company accounts into ServiceTitan customer records.',
    sourcePlatform: 'hubspot',
    destPlatform: 'servicetitan',
    sourceObject: 'companies',
    destObject: 'customers',
    name: 'Companies → Customers',
    badge: 'Two-Way Sync',
  },
];

const DEFAULT_CUSTOM_OBJECT_TOOLTIP = (side: 'source' | 'destination') =>
  `This platform's objects are fixed — custom objects must be created in the ${side} platform`;

function customObjectGating(
  platformId: string,
  connection: Connection | undefined,
  side: 'source' | 'destination',
) {
  const blocked = connection?.providerMetadata?.supportsCustomObjects === false;
  return {
    canAddCustomObject: supportsCustomObjects(platformId) && !blocked,
    customObjectTooltip: blocked
      ? (connection?.providerMetadata?.customObjectsBlockedReason ??
        "Custom objects aren't available on this HubSpot connection")
      : DEFAULT_CUSTOM_OBJECT_TOOLTIP(side),
    customObjectsWarning:
      connection?.providerMetadata?.customObjectsScopeWarning,
  };
}

export default function JobDetailsStep({
  config,
  setConfig,
  errors,
  setErrors,
  availablePlatforms,
  objectsByPlatform,
  customSourceObjects,
  customDestObjects,
  sourceConnection,
  destConnection,
  onAddCustomObject,
  projectId,
  projectSyncMode = null,
  compact = false,
  existingJobs = [],
}: {
  config: JobConfig;
  setConfig: Dispatch<SetStateAction<JobConfig>>;
  errors: Record<string, string | undefined>;
  setErrors: Dispatch<SetStateAction<Record<string, string | undefined>>>;
  availablePlatforms: { platformId: string; label: string }[];
  objectsByPlatform: Record<string, ObjectItem[]>;
  customSourceObjects: string[];
  customDestObjects: string[];
  sourceConnection?: Connection;
  destConnection?: Connection;
  onAddCustomObject: (side: 'source' | 'dest') => void;
  projectId: string;
  /** Project-level gate — locks the Job Type radio to the project's mode. Null = unrestricted. */
  projectSyncMode?: 'one_way' | 'two_way' | null;
  /** Uses tighter spacing and concise copy in the standalone create dialog. */
  compact?: boolean;
  existingJobs?: Array<{
    sourceObject?: string;
    destObject?: string;
    status?: string;
  }>;
}) {
  const relevantRecipes = PRESET_RECIPES.filter((r) => {
    if (
      r.sourcePlatform !== config.sourcePlatform ||
      r.destPlatform !== config.destPlatform
    ) {
      return false;
    }
    const alreadyExists = existingJobs.some(
      (job) =>
        job.sourceObject?.toLowerCase() === r.sourceObject.toLowerCase() &&
        job.destObject?.toLowerCase() === r.destObject.toLowerCase(),
    );
    return !alreadyExists;
  });

  const sourceGating = customObjectGating(
    config.sourcePlatform,
    sourceConnection,
    'source',
  );
  const destGating = customObjectGating(
    config.destPlatform,
    destConnection,
    'destination',
  );
  const handleObjectChange = (
    field: 'sourceObject' | 'destObject',
    val: string,
  ) => {
    const updated: JobConfig = { ...config, [field]: val };
    if (updated.sourceObject && updated.destObject) {
      const getObjLabel = (platformId: string, objId: string) =>
        (objectsByPlatform[platformId] || []).find((o) => o.id === objId)
          ?.label || objId;
      const srcLabel = getObjLabel(
        updated.sourcePlatform,
        updated.sourceObject,
      );
      const dstLabel = getObjLabel(updated.destPlatform, updated.destObject);
      const autoName = `${srcLabel} → ${dstLabel}`;
      const prevSrc = getObjLabel(config.sourcePlatform, config.sourceObject);
      const prevDst = getObjLabel(config.destPlatform, config.destObject);
      if (!config.name || config.name === `${prevSrc} → ${prevDst}`)
        updated.name = autoName;
    }
    setConfig(updated);
  };

  return (
    <div className={cn(compact ? 'space-y-4' : 'space-y-6')}>
      {/* Recommended Recipes */}
      {relevantRecipes.length > 0 && (
        <div className="rounded-2xl border bg-muted/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <Sparkles className="size-3 text-primary" />
              Recommended Sync Recipes (1-Click)
            </span>
            <span className="text-[10px] text-muted-foreground">
              Select to auto-fill records & name
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {relevantRecipes.map((recipe) => {
              const isSelected =
                config.sourceObject === recipe.sourceObject &&
                config.destObject === recipe.destObject;
              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => {
                    setConfig((c) => ({
                      ...c,
                      sourceObject: recipe.sourceObject,
                      destObject: recipe.destObject,
                      name: recipe.name,
                    }));
                    setErrors((errs) => ({
                      ...errs,
                      sourceObject: undefined,
                      destObject: undefined,
                      name: undefined,
                    }));
                  }}
                  className={cn(
                    'group flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {recipe.title}
                    </span>
                    {recipe.badge && (
                      <Badge
                        variant="secondary"
                        className="border-primary/20 bg-primary/10 text-primary px-1 py-0 text-[9px] shrink-0 font-medium leading-4"
                      >
                        {recipe.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-primary flex items-center gap-1">
                    {isSelected ? '✓ Selected' : 'Apply →'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection */}
      <div className={cn(compact ? 'space-y-2' : 'space-y-3')}>
        {!compact && (
          <div>
            <h3 className="text-sm font-semibold">Objects to sync</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose the source and destination records for this sync.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <PlatformObjectSelector
              label="Source"
              platformId={config.sourcePlatform}
              platformLabel={
                availablePlatforms.find(
                  (p) => p.platformId === config.sourcePlatform,
                )?.label ?? config.sourcePlatform
              }
              objects={objectsByPlatform[config.sourcePlatform] || []}
              object={config.sourceObject}
              onObjectChange={(val) => handleObjectChange('sourceObject', val)}
              error={errors.sourceObject}
              customObjects={customSourceObjects}
              onAddCustomObject={() => onAddCustomObject('source')}
              canAddCustomObject={sourceGating.canAddCustomObject}
              customObjectTooltip={sourceGating.customObjectTooltip}
              customObjectsWarning={sourceGating.customObjectsWarning}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                sourcePlatform: c.destPlatform,
                destPlatform: c.sourcePlatform,
                sourceObject: '',
                destObject: '',
                name: '',
              }))
            }
            title="Swap source and destination"
          >
            <ArrowLeftRight />
          </Button>

          <div>
            <PlatformObjectSelector
              label="Destination"
              platformId={config.destPlatform}
              platformLabel={
                availablePlatforms.find(
                  (p) => p.platformId === config.destPlatform,
                )?.label ?? config.destPlatform
              }
              objects={objectsByPlatform[config.destPlatform] || []}
              object={config.destObject}
              onObjectChange={(val) => handleObjectChange('destObject', val)}
              error={errors.destObject}
              customObjects={customDestObjects}
              onAddCustomObject={() => onAddCustomObject('dest')}
              canAddCustomObject={destGating.canAddCustomObject}
              customObjectTooltip={destGating.customObjectTooltip}
              customObjectsWarning={destGating.customObjectsWarning}
            />
          </div>
        </div>

        {!compact &&
          config.destObject &&
          KNOWN_PIPELINE_OBJECTS.has(config.destObject.toLowerCase()) && (
            <Alert>
              <InfoIcon />
              <AlertDescription>
                HubSpot{' '}
                <strong className="text-foreground">{config.destObject}</strong>{' '}
                use pipeline stages — the next step will let you select a
                pipeline and map statuses.
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* Job Details */}
      <div className={cn(!compact && 'space-y-3 border-t pt-6')}>
        {!compact && (
          <div>
            <h3 className="text-sm font-semibold">Job details</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Give this sync a clear name so it is easy to identify later.
            </p>
          </div>
        )}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="job-name" required>
            Job Name
          </FieldLabel>
          <Input
            id="job-name"
            value={config.name}
            onChange={(e) => {
              setConfig({ ...config, name: e.target.value });
              setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="e.g. Customers → Contacts"
            aria-invalid={!!errors.name}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
      </div>

      {/* Sync Behaviour */}
      <div className={cn(!compact && 'space-y-3 border-t pt-6')}>
        {!compact && (
          <div>
            <h3 className="text-sm font-semibold">Sync settings</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Control which changes are included in this sync.
            </p>
          </div>
        )}

        <SyncDirectionFields
          projectSyncMode={projectSyncMode}
          syncDirection={config.syncDirection}
          sourceOfTruth={config.sourceOfTruth}
          deleteHandling={config.deleteHandling}
          hubspotWebhookEnabled={config.hubspotWebhookEnabled}
          syncTrigger={config.syncTrigger}
          sourcePlatform={config.sourcePlatform}
          destPlatform={config.destPlatform}
          availablePlatforms={availablePlatforms}
          sourceConnection={sourceConnection}
          destConnection={destConnection}
          projectId={projectId}
          onSyncDirectionChange={(v) =>
            setConfig({ ...config, syncDirection: v })
          }
          onSourceOfTruthChange={(v) =>
            setConfig({ ...config, sourceOfTruth: v })
          }
          onDeleteHandlingChange={(v) =>
            setConfig({ ...config, deleteHandling: v })
          }
          onHubspotWebhookEnabledChange={(v) =>
            setConfig({ ...config, hubspotWebhookEnabled: v })
          }
          onSyncTriggerChange={(v) => setConfig({ ...config, syncTrigger: v })}
          compact={compact}
        />
      </div>
    </div>
  );
}
