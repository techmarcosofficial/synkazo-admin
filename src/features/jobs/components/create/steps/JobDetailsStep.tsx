import { ArrowLeftRight, InfoIcon } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import PlatformObjectSelector from '../PlatformObjectSelector';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import SyncDirectionFields from '@/features/jobs/components/SyncDirectionFields';
import { KNOWN_PIPELINE_OBJECTS, type JobConfig } from '@/features/jobs/types';
import { supportsCustomObjects } from '@/lib/platformCapabilities';
import type { ObjectItem } from '@/queries/useConnections';
import type { Connection } from '@/types';

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
}) {
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
    <div className="space-y-6">
      {/* Connection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Connection</h3>

        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-3">
            <FieldLabel required>Source</FieldLabel>
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

          <div className="space-y-3">
            <FieldLabel required>Destination</FieldLabel>
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

        {config.destObject &&
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
      <div className="space-y-3">
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
      <div className="space-y-3 border-t pt-6">
        <h3 className="text-sm font-medium">Sync Behaviour</h3>

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
        />
      </div>
    </div>
  );
}
