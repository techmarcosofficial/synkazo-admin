import { Lock, Plus } from 'lucide-react';

import { PlatformIcon } from '@/components/platform';
import { usePlanUpgradePrompt } from '@/components/shared/PlanGate';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ObjectItem } from '@/queries/useConnections';
import { useEntitlements } from '@/queries/useEntitlements';

// Objects outside the plan's `objects_synced` scope stay listed but unselectable, so the
// user can see what upgrading would unlock rather than wondering why an object is missing.
function ObjectOption({ obj, allowed }: { obj: ObjectItem; allowed: boolean }) {
  return (
    <SelectItem value={obj.id} disabled={!allowed}>
      <span className="flex w-full items-center gap-2">
        {obj.label}
        {!allowed && <Lock className="text-muted-foreground size-3" />}
      </span>
    </SelectItem>
  );
}

function renderObjectOptions(
  platformId: string,
  objects: ObjectItem[],
  isAllowed: (obj: ObjectItem) => boolean,
) {
  if (platformId === 'servicetitan') {
    const groups: Record<string, ObjectItem[]> = {};
    for (const obj of objects) {
      const mod = obj.module || 'Other';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(obj);
    }
    return Object.entries(groups).map(([mod, objs]) => (
      <SelectGroup key={mod}>
        <SelectLabel>{mod}</SelectLabel>
        {objs.map((o) => (
          <ObjectOption key={o.id} obj={o} allowed={isAllowed(o)} />
        ))}
      </SelectGroup>
    ));
  }
  if (platformId === 'hubspot') {
    const byGroup: Record<string, ObjectItem[]> = {};
    const customObjs: ObjectItem[] = [];
    for (const o of objects) {
      if (o.isCustom) {
        customObjs.push(o);
      } else {
        const g = o.group || 'Standard Objects';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(o);
      }
    }
    return (
      <>
        {Object.entries(byGroup).map(([groupName, groupObjs]) => (
          <SelectGroup key={groupName}>
            <SelectLabel>{groupName}</SelectLabel>
            {groupObjs.map((o) => (
              <ObjectOption key={o.id} obj={o} allowed={isAllowed(o)} />
            ))}
          </SelectGroup>
        ))}
        {customObjs.length > 0 && (
          <SelectGroup>
            <SelectLabel>Custom Objects</SelectLabel>
            {customObjs.map((o) => (
              <ObjectOption key={o.id} obj={o} allowed={isAllowed(o)} />
            ))}
          </SelectGroup>
        )}
      </>
    );
  }
  return objects.map((o) => (
    <ObjectOption key={o.id} obj={o} allowed={isAllowed(o)} />
  ));
}

export default function PlatformObjectSelector({
  label,
  platformId,
  platformLabel,
  objects = [],
  object,
  onObjectChange,
  error,
  disabled,
  customObjects = [],
  onAddCustomObject,
  canAddCustomObject = true,
  customObjectTooltip,
  customObjectsWarning,
}: {
  label: string;
  platformId: string;
  platformLabel: string;
  objects?: ObjectItem[];
  object: string;
  onObjectChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
  customObjects?: string[];
  onAddCustomObject?: () => void;
  canAddCustomObject?: boolean;
  customObjectTooltip?: string;
  /** Set when this connection's existing custom objects may be missing from the
   *  list below (e.g. a scope issue) — distinct from customObjectTooltip, which
   *  explains why creating a NEW custom object is blocked. */
  customObjectsWarning?: string;
}) {
  const entitlements = useEntitlements();
  const { prompt: promptUpgrade, dialog: upgradeDialog } =
    usePlanUpgradePrompt();
  const allObjects: ObjectItem[] = [
    ...objects,
    ...customObjects.map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, '_'),
      label: name,
      tier: 'custom' as const,
    })),
  ];

  // Objects the discovery endpoint didn't tier (legacy cached responses) are left selectable —
  // the API re-checks the scope on job create either way.
  const isAllowed = (obj: ObjectItem) =>
    obj.tier === undefined || entitlements.objectTier(obj.tier);

  // Creating a custom object is its own plan capability, on top of the object scope.
  // A plan-locked button stays clickable (a `disabled` button fires no events, so it could
  // never explain itself) — only an unsupported platform truly disables it.
  const planAllowsCustomObjects = entitlements.customObjects;
  const planLocked = canAddCustomObject && !planAllowsCustomObjects;

  const addObjectTooltip = !canAddCustomObject
    ? customObjectTooltip || 'Custom objects not supported for this platform'
    : planLocked
      ? "Custom objects aren't available on your current plan — upgrade to add them"
      : `Add custom ${label.toLowerCase()} object`;

  return (
    <div className="space-y-2">
      <Field>
        <FieldLabel>
          <PlatformIcon platformId={platformId} size={16} />
          {platformLabel}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span wrapper: a disabled button emits no pointer events, so the tooltip
                  would never open on the unsupported-platform case without it. */}
              <span
                className={
                  !canAddCustomObject ? 'cursor-not-allowed' : undefined
                }
              >
                <Button
                  type="button"
                  variant={
                    planLocked || !canAddCustomObject ? 'ghost' : 'secondary'
                  }
                  size="xs"
                  disabled={!canAddCustomObject}
                  onClick={
                    planLocked
                      ? () =>
                          promptUpgrade(
                            "Custom objects aren't available on your current plan. Upgrade to create and sync custom object schemas.",
                          )
                      : onAddCustomObject
                  }
                  className={planLocked ? 'text-muted-foreground' : undefined}
                >
                  {planLocked ? <Lock /> : <Plus />}
                  Add object
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{addObjectTooltip}</TooltipContent>
          </Tooltip>
        </FieldLabel>
      </Field>

      <Field data-invalid={!!error}>
        <Select
          value={object}
          onValueChange={onObjectChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" aria-invalid={!!error}>
            <SelectValue placeholder="Select object…" />
          </SelectTrigger>
          <SelectContent>
            {renderObjectOptions(platformId, allObjects, isAllowed)}
          </SelectContent>
        </Select>
        {disabled && (
          <p className="text-muted-foreground text-xs">
            Cannot be changed after creation
          </p>
        )}
        {customObjectsWarning && (
          <p className="text-warning text-xs">{customObjectsWarning}</p>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </Field>

      {upgradeDialog}
    </div>
  );
}
