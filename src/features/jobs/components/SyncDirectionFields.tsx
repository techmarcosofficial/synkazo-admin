import { InfoIcon, Lock } from 'lucide-react';
import type { ReactNode } from 'react';

import TwoWayAuthNotice from './TwoWayAuthNotice';

import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { Connection } from '@/types';

export interface SyncDirectionFieldsProps {
  syncDirection: string;
  sourceOfTruth: string;
  deleteHandling: string;
  hubspotWebhookEnabled: boolean;
  syncTrigger: string;
  sourcePlatform: string;
  destPlatform: string;
  availablePlatforms: { platformId: string; label: string }[];
  sourceConnection: Connection | undefined;
  destConnection: Connection | undefined;
  projectId: string;
  onSyncDirectionChange: (value: string) => void;
  onSourceOfTruthChange: (value: string) => void;
  onDeleteHandlingChange: (value: string) => void;
  onHubspotWebhookEnabledChange: (value: boolean) => void;
  onSyncTriggerChange: (value: string) => void;
  /** Where field-mapping direction is configured — differs by context (wizard step vs. a separate tab). */
  fieldMappingLocationLabel?: string;
  /**
   * When true, the structural fields (Job Type, Source of Truth, Deletes, Job
   * Behavior) render as locked static text — they define the job and cannot be
   * changed after creation. The Enable HubSpot Webhook toggle stays editable
   * (it's operational). Used on the Job Detail page (always post-creation).
   */
  readOnly?: boolean;
  /**
   * The owning project's sync-mode gate (null on legacy/unrestricted projects).
   * When set, the Job Type field offers only the matching option — the other
   * value is removed from the DOM entirely, not merely disabled, so a job in a
   * one-way project can never be made two-way and vice versa. Ignored when
   * `readOnly` (that branch already shows locked static text).
   */
  projectSyncMode?: 'one_way' | 'two_way' | null;
}

const DIRECTION_LABELS: Record<string, string> = {
  one_way: 'One Way',
  two_way: 'Two Way',
};
const DELETE_LABELS: Record<string, string> = {
  ignore: "Don't propagate",
  soft_archive: 'Archive on other side',
  hard_delete: 'Delete on other side',
};
const TRIGGER_LABELS: Record<string, string> = {
  new: 'New Records',
  updated: 'Updated Records',
  both: 'New & Updated',
};

// A structural field's value shown as locked/static text (no input control).
function LockedValue({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-3xl px-3 py-2 text-sm">
      <Lock className="text-muted-foreground size-3.5 shrink-0" />
      <span className="font-medium">{children}</span>
    </div>
  );
}

// Job Type (one-way/two-way) + the two-way-only Source of Truth / Delete
// Handling controls. Shared by the Create Job wizard (JobDetailsStep) and
// the Job Detail "Sync Direction" tab so both flows behave identically —
// neither should reimplement this. In `readOnly` mode the structural fields
// are locked (they can't change after creation); only the HubSpot webhook
// opt-in stays editable.
export default function SyncDirectionFields({
  syncDirection,
  sourceOfTruth,
  deleteHandling,
  hubspotWebhookEnabled,
  syncTrigger,
  sourcePlatform,
  destPlatform,
  availablePlatforms,
  sourceConnection,
  destConnection,
  projectId,
  onSyncDirectionChange,
  onSourceOfTruthChange,
  onDeleteHandlingChange,
  onHubspotWebhookEnabledChange,
  onSyncTriggerChange,
  fieldMappingLocationLabel = 'the next step',
  readOnly = false,
  projectSyncMode = null,
}: SyncDirectionFieldsProps) {
  const platformLabel = (platformId: string) =>
    availablePlatforms.find((p) => p.platformId === platformId)?.label ??
    platformId;

  return (
    <div className="space-y-6">
      {/* Creation-time warning — these settings lock permanently once the job exists. */}
      {!readOnly && (
        <Alert>
          <Lock />
          <AlertDescription>
            These settings cannot be changed after the job is created.
          </AlertDescription>
        </Alert>
      )}

      <Field>
        <FieldLabel>Job Type</FieldLabel>
        {readOnly ? (
          <LockedValue>
            {DIRECTION_LABELS[syncDirection] ?? syncDirection}
          </LockedValue>
        ) : projectSyncMode ? (
          <>
            {/* Gated by the project's sync-mode: only the allowed direction is
                offered, so a job can't diverge from its project's mode. */}
            <RadioGroup
              value={syncDirection}
              onValueChange={onSyncDirectionChange}
              className="grid grid-cols-1 gap-3"
            >
              <ChoiceCardItem
                value={projectSyncMode}
                id={`sync-direction-${projectSyncMode}`}
                title={DIRECTION_LABELS[projectSyncMode]}
                description={
                  projectSyncMode === 'one_way'
                    ? 'Source → Destination'
                    : 'Bidirectional synchronization'
                }
              />
            </RadioGroup>
            <p className="text-muted-foreground text-xs">
              This project is set to {DIRECTION_LABELS[projectSyncMode]} sync —
              chosen when the project was created and fixed for every job in it.
            </p>
          </>
        ) : (
          <RadioGroup
            value={syncDirection}
            onValueChange={onSyncDirectionChange}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <ChoiceCardItem
              value="one_way"
              id="sync-direction-one_way"
              title="One Way"
              description="Source → Destination"
            />
            <ChoiceCardItem
              value="two_way"
              id="sync-direction-two_way"
              title="Two Way"
              description="Bidirectional synchronization"
            />
          </RadioGroup>
        )}
      </Field>

      {syncDirection === 'two_way' && (
        <div className="space-y-6">
          <Alert>
            <InfoIcon />
            <AlertDescription>
              In {fieldMappingLocationLabel}, each field mapping can be set to
              sync forward only, reverse only, or both ways — new mappings
              default to both ways. If the same field changes on both platforms
              before the next sync, the source of truth below wins — the losing
              value is always logged, never silently dropped.
            </AlertDescription>
          </Alert>

          <TwoWayAuthNotice
            projectId={projectId}
            hubspotConnection={
              sourcePlatform === 'hubspot'
                ? sourceConnection
                : destPlatform === 'hubspot'
                  ? destConnection
                  : undefined
            }
          />

          <Field>
            <FieldLabel>Source of Truth</FieldLabel>
            {readOnly ? (
              <LockedValue>{platformLabel(sourceOfTruth)}</LockedValue>
            ) : (
              <RadioGroup
                value={sourceOfTruth}
                onValueChange={onSourceOfTruthChange}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {[sourcePlatform, destPlatform].map((platformId) => (
                  <ChoiceCardItem
                    key={platformId}
                    value={platformId}
                    id={`source-of-truth-${platformId}`}
                    title={platformLabel(platformId)}
                  />
                ))}
              </RadioGroup>
            )}
          </Field>

          <Field>
            <FieldLabel>Deletes</FieldLabel>
            {readOnly ? (
              <LockedValue>
                {DELETE_LABELS[deleteHandling] ?? deleteHandling}
              </LockedValue>
            ) : (
              <>
                <RadioGroup
                  value={deleteHandling}
                  onValueChange={onDeleteHandlingChange}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  <ChoiceCardItem
                    value="ignore"
                    id="delete-handling-ignore"
                    title="Don't propagate"
                  />
                  <ChoiceCardItem
                    value="soft_archive"
                    id="delete-handling-soft_archive"
                    title="Archive on other side"
                  />
                  <ChoiceCardItem
                    value="hard_delete"
                    id="delete-handling-hard_delete"
                    title="Delete on other side"
                  />
                </RadioGroup>
                <p className="text-muted-foreground text-xs">
                  ServiceTitan has no generic delete API — only a few object
                  types (e.g. Customers) support an equivalent (marking
                  inactive). Unsupported objects are skipped regardless of this
                  setting.
                </p>
              </>
            )}
          </Field>

          {/* Operational opt-in — editable even after creation. */}
          <Field>
            <FieldLabel>Enable HubSpot Webhook</FieldLabel>
            <div className="bg-card flex items-start justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Listen for HubSpot changes
                </p>
                <p className="text-muted-foreground text-xs">
                  On by default for two-way jobs. synkazo subscribes to HubSpot
                  create/update events and writes those changes back to the
                  source. Turn it off to keep this job polling-only. Only takes
                  effect once the job is Active.
                </p>
              </div>
              <Switch
                checked={hubspotWebhookEnabled}
                onCheckedChange={onHubspotWebhookEnabledChange}
                aria-label="Enable HubSpot Webhook"
              />
            </div>
          </Field>
        </div>
      )}

      <Field>
        <FieldLabel>Job Behavior</FieldLabel>
        {readOnly ? (
          <LockedValue>
            {TRIGGER_LABELS[syncTrigger] ?? syncTrigger}
          </LockedValue>
        ) : (
          <RadioGroup
            value={syncTrigger}
            onValueChange={onSyncTriggerChange}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <ChoiceCardItem
              value="new"
              id="job-behavior-new"
              title="New Records"
              description="Only records created after the job starts"
            />
            <ChoiceCardItem
              value="updated"
              id="job-behavior-updated"
              title="Updated Records"
              description="Only records changed after the job starts"
            />
            <ChoiceCardItem
              value="both"
              id="job-behavior-both"
              title="New & Updated"
              description="Both new and changed records"
            />
          </RadioGroup>
        )}
      </Field>
    </div>
  );
}
