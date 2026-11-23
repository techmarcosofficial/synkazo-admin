import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import InfoTip from '@/components/shared/InfoTip';
import { PlanLock, PlanLockBadge } from '@/components/shared/PlanGate';
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { RadioGroup } from '@/components/ui/radio-group';
import { useEntitlements } from '@/queries/useEntitlements';
import type { ProjectSyncMode } from '@/types/project';

export interface SyncModeFieldProps {
  value: ProjectSyncMode | '';
  onChange: (value: ProjectSyncMode) => void;
  disabled?: boolean;
  error?: string;
}

/** One short line for the "i" beside the Sync Direction label. */
const SYNC_MODE_SUMMARY: Record<'' | ProjectSyncMode, string> = {
  '': 'How data flows between the two platforms for every job here. Project-wide and fixed once created.',
  one_way:
    'One Way selected: records only flow source → HubSpot. Project-wide and fixed once created.',
  two_way:
    'Two Way selected: changes flow both ways, per-job conflict rules. Project-wide and fixed once created.',
};

/**
 * Project-level One Way / Two Way selector. Shared by the create-project modal
 * and the HubSpot Marketplace source-setup step (SourceSetupDialog /
 * SourcePlatformPicker) so the choice — and its explanatory copy — stays
 * identical everywhere it's offered. The value gates which job sync directions
 * the project allows, and which HubSpot connection methods are offered.
 *
 * The explanation lives in one-line hover hints rather than a paragraph under
 * the cards: one on the label (what's selected right now) and one per mode.
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
        Sync Direction
        <span className="text-destructive -ml-1.5">*</span>
        <InfoTip label="About sync direction" side="right">
          {SYNC_MODE_SUMMARY[value]}
        </InfoTip>
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
              info={
                <InfoTip label="About one-way sync">
                  Source records are written into HubSpot; HubSpot edits are
                  never sent back.
                </InfoTip>
              }
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
              info={
                <InfoTip label="About two-way sync">
                  Either side updates the other. Needs HubSpot connected with
                  OAuth, not a manual token.
                </InfoTip>
              }
            />
          </PlanLock>
        </RadioGroup>
      </FieldContent>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
