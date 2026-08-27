import { ChoiceCardItem } from '@/components/form/ChoiceCard';
import { PlanLock, PlanLockBadge } from '@/components/shared/PlanGate';
import { RadioGroup } from '@/components/ui/radio-group';
import {
  FREQUENCY_PRESETS,
  FREQUENCY_PRESET_ORDER,
  SCHEDULE_MODE_OPTIONS,
  type FrequencyPreset,
} from '@/features/jobs/utils';
import { useEntitlements } from '@/queries/useEntitlements';

/**
 * Plan-aware schedule controls, shared by the create-job wizard's Schedule step, the job
 * detail Schedule tab and the setup wizard's schedule form — all three previously carried
 * an identical hardcoded copy of the mode list with no plan awareness.
 *
 * Two layers:
 *  - `FrequencyPresetPicker` offers the fixed cadences the plan grants (`sync_frequency`).
 *    Choosing one writes a schedule the user can't tune.
 *  - `ScheduleModeCards` is the hand-built editor's mode selector, shown when the plan
 *    includes the `custom` frequency, and gated per mode by `scheduling_modes`.
 */

export function FrequencyPresetPicker({
  value,
  onSelect,
}: {
  /** The preset key currently matching the schedule, or "custom". */
  value: string;
  onSelect: (key: string, preset: FrequencyPreset | null) => void;
}) {
  const entitlements = useEntitlements();
  const canCustomise = entitlements.frequency('custom');
  const available = FREQUENCY_PRESET_ORDER.filter((k) =>
    entitlements.frequency(k),
  );

  // Nothing to choose between: the plan grants only the custom editor.
  if (available.length === 0 && canCustomise) return null;

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        Sync Frequency
        {!canCustomise && <PlanLockBadge label="Fixed by plan" />}
      </h3>
      <RadioGroup
        value={value}
        onValueChange={(key) => onSelect(key, FREQUENCY_PRESETS[key] ?? null)}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {FREQUENCY_PRESET_ORDER.map((key) => {
          const preset = FREQUENCY_PRESETS[key];
          const allowed = entitlements.frequency(key);
          return (
            <PlanLock
              key={key}
              locked={!allowed}
              message={`The "${preset.label}" sync frequency isn't available on your current plan. Upgrade to use it.`}
            >
              <ChoiceCardItem
                value={key}
                id={`sched-freq-${key}`}
                title={preset.label}
                description={preset.desc}
                disabled={!allowed}
              />
            </PlanLock>
          );
        })}
        <PlanLock
          locked={!canCustomise}
          message="Custom schedules aren't available on your current plan. Upgrade to set your own times, intervals and weekdays."
        >
          <ChoiceCardItem
            value="custom"
            id="sched-freq-custom"
            title="Custom"
            description="Set your own times, interval or weekdays"
            disabled={!canCustomise}
          />
        </PlanLock>
      </RadioGroup>
    </div>
  );
}

export function ScheduleModeCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (mode: string) => void;
}) {
  const entitlements = useEntitlements();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Schedule Mode</h3>
      <RadioGroup value={value} onValueChange={onChange} className="gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SCHEDULE_MODE_OPTIONS.map((opt) => {
            const allowed = entitlements.schedulingMode(opt.id);
            return (
              <PlanLock
                key={opt.id}
                locked={!allowed}
                message={`The "${opt.label}" schedule mode isn't available on your current plan. Upgrade to use it.`}
              >
                <ChoiceCardItem
                  value={opt.id}
                  id={`sched-mode-${opt.id}`}
                  title={opt.label}
                  description={opt.desc}
                  disabled={!allowed}
                />
              </PlanLock>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}
