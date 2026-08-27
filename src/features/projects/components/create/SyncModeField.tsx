import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import { PlanLock, PlanLockBadge } from '@/components/shared/PlanGate';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { RadioGroup } from '@/components/ui/radio-group';
import { useEntitlements } from '@/queries/useEntitlements';
import type { ProjectSyncMode } from '@/types/project';

// Copy for the three states: nothing chosen yet, One Way chosen, Two Way chosen.
const SYNC_MODE_HELP: Record<'' | ProjectSyncMode, string> = {
  '': "Choose how data flows between platforms for jobs in this project. This is a project-wide setting and can't be changed after the project is created.",
  one_way:
    'Jobs sync in a single direction only — records flow from the source platform into HubSpot. Changes made in HubSpot are never written back. You can connect HubSpot manually (API token) or with OAuth.',
  two_way:
    'Jobs can sync in both directions — a change on either platform updates the other, with per-job conflict handling (source of truth, deletes) set when you create each job. HubSpot must be connected with OAuth ("Login with HubSpot") so real-time webhooks work; manual token connection isn\'t available.',
};

export interface SyncModeFieldProps {
  value: ProjectSyncMode | '';
  onChange: (value: ProjectSyncMode) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Project-level One Way / Two Way selector. Shared by the create-project modal
 * and the HubSpot Marketplace source-setup step (SourceSetupDialog /
 * SourcePlatformPicker) so the choice — and its explanatory copy — stays
 * identical everywhere it's offered. The value gates which job sync directions
 * the project allows, and which HubSpot connection methods are offered.
 *
 * Each mode is additionally gated on the org's plan (`sync_direction`): a mode the plan
 * doesn't include stays visible but inert, since sync mode is immutable once the project
 * exists and the choice is worth explaining rather than hiding.
 */
export default function SyncModeField({
  value,
  onChange,
  disabled,
  error,
}: SyncModeFieldProps) {
  const entitlements = useEntitlements();
  const canOneWay = entitlements.syncDirection('one_way');
  const canTwoWay = entitlements.syncDirection('two_way');

  return (
    <Field data-invalid={!!error}>
      <FieldLabel className="flex items-center gap-2">
        Sync Mode
        <span className="text-destructive -ml-1.5">*</span>
        {!(canOneWay && canTwoWay) && <PlanLockBadge label="Plan limited" />}
      </FieldLabel>
      <FieldContent>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as ProjectSyncMode)}
          disabled={disabled}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <PlanLock
            locked={!canOneWay}
            message="One-way sync isn't available on your current plan. Upgrade to create one-way projects."
          >
            <ChoiceCardItem
              value="one_way"
              id="project-sync-mode-one_way"
              title="One Way"
              description="Source → HubSpot"
              disabled={!canOneWay}
            />
          </PlanLock>
          <PlanLock
            locked={!canTwoWay}
            message="Two-way sync isn't available on your current plan. Upgrade to sync changes back to your source platform."
          >
            <ChoiceCardItem
              value="two_way"
              id="project-sync-mode-two_way"
              title="Two Way"
              description="Source ↔ HubSpot"
              disabled={!canTwoWay}
            />
          </PlanLock>
        </RadioGroup>
      </FieldContent>
      <FieldDescription>{SYNC_MODE_HELP[value]}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
