import {
  Bell,
  LayoutGrid,
  Layers3,
  List,
  Monitor,
  Moon,
  Palette,
  PanelTop,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { useUpdateMeMutation } from '@/queries/useUsers';
import { useDisplayPreferencesStore } from '@/stores/useDisplayPreferencesStore';

type NotifPrefs = { notifySyncCompleted: boolean; notifySyncFailed: boolean };

const THEME_OPTIONS = [
  {
    id: 'light',
    label: 'Light',
    description: 'Bright and clean throughout the app',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Comfortable in low-light environments',
    icon: Moon,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Match your device appearance',
    icon: Monitor,
  },
] as const;

const VIEW_OPTIONS = [
  {
    id: 'card',
    label: 'Cards',
    description: 'Visual summaries with more context',
    icon: LayoutGrid,
  },
  {
    id: 'table',
    label: 'List',
    description: 'Compact rows for scanning more data',
    icon: List,
  },
] as const;

const LAYOUT_OPTIONS = [
  {
    id: 'contrast',
    label: 'Contrast / Border',
    description: 'Defined surfaces with clear boundaries',
    icon: PanelTop,
  },
  {
    id: 'shadow',
    label: 'Normal / Shadow',
    description: 'Softer separation with subtle depth',
    icon: Layers3,
  },
] as const;

const NOTIFICATION_ROWS: {
  label: string;
  desc: string;
  field: keyof NotifPrefs;
}[] = [
  {
    label: 'Sync completed',
    desc: 'Email when a sync job finishes successfully',
    field: 'notifySyncCompleted',
  },
  {
    label: 'Sync failed',
    desc: 'Email when a sync job fails or encounters errors',
    field: 'notifySyncFailed',
  },
];

/**
 * Personal preferences — everything here affects only the signed-in user.
 *
 * Theme, Default View and Layout Style apply immediately (they are client-only
 * state in the theme provider and the display-preferences store), so `isDirty`
 * deliberately tracks the notification switches alone: they are the only fields
 * the Save button persists. The caption below the button says so.
 */
export default function PreferencesTab() {
  const { currentUser } = useSynkazoAuth();
  const { theme, setTheme } = useTheme();
  const defaultView = useDisplayPreferencesStore((state) => state.defaultView);
  const setDefaultView = useDisplayPreferencesStore(
    (state) => state.setDefaultView,
  );
  const layoutStyle = useDisplayPreferencesStore((state) => state.layoutStyle);
  const setLayoutStyle = useDisplayPreferencesStore(
    (state) => state.setLayoutStyle,
  );

  const updateMeMutation = useUpdateMeMutation();
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notifySyncCompleted: false,
    notifySyncFailed: true,
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setPrefs({
      notifySyncCompleted: currentUser.notifySyncCompleted ?? false,
      notifySyncFailed: currentUser.notifySyncFailed ?? true,
    });
    setIsDirty(false);
  }, [currentUser]);

  const updatePref = (field: keyof NotifPrefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [field]: value }));
    setIsDirty(true);
  };

  const save = async () => {
    try {
      await updateMeMutation.mutateAsync({
        notifySyncCompleted: prefs.notifySyncCompleted,
        notifySyncFailed: prefs.notifySyncFailed,
      });
      setIsDirty(false);
      showToast.success('Preferences saved');
    } catch {
      showToast.error('Failed to save preferences');
    }
  };

  return (
    <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="text-muted-foreground size-4" /> Notifications
          </CardTitle>
          <CardDescription>
            Choose which sync updates arrive by email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-5">
          <div className="divide-border overflow-hidden rounded-3xl border">
            {NOTIFICATION_ROWS.map((row) => (
              <div
                key={row.field}
                className="flex items-center justify-between gap-6 border-b px-4 py-3.5 last:border-b-0"
              >
                <Label
                  htmlFor={`notification-${row.field}`}
                  className="min-w-0 cursor-pointer flex-col items-start gap-0.5"
                >
                  <span className="text-sm font-medium">{row.label}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {row.desc}
                  </span>
                </Label>
                <Switch
                  id={`notification-${row.field}`}
                  checked={prefs[row.field]}
                  onCheckedChange={(v) => updatePref(row.field, v)}
                  aria-label={row.label}
                />
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-2 border-t pt-4">
            <Button
              onClick={save}
              loading={updateMeMutation.isPending}
              disabled={!isDirty}
            >
              Save Notifications
            </Button>
            <p className="text-muted-foreground text-xs">
              Display preferences apply immediately. Notification changes are
              saved here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="text-muted-foreground size-4" /> Appearance &
            Display
          </CardTitle>
          <CardDescription>
            Personalize how Synkazo looks and presents your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div>
              <FieldLabel>Theme</FieldLabel>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Select the color mode that feels most comfortable.
              </p>
            </div>
            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as typeof theme)}
              className="sm:grid-cols-3"
            >
              {THEME_OPTIONS.map((option) => (
                <div key={option.id} className="relative">
                  <RadioGroupItem
                    id={`theme-${option.id}`}
                    value={option.id}
                    className="absolute top-4 right-4 z-10"
                  />
                  <Label
                    htmlFor={`theme-${option.id}`}
                    className="border-border hover:bg-muted/40 peer-data-checked:border-primary peer-data-checked:bg-primary/5 flex h-full cursor-pointer items-start gap-3 rounded-3xl border p-3.5 pr-10 transition-colors"
                  >
                    <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-2xl">
                      <option.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-4 font-normal">
                        {option.description}
                      </span>
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="border-t pt-5">
            <div className="mb-3">
              <FieldLabel>Default View</FieldLabel>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Used across management pages until a page is switched manually.
              </p>
            </div>
            <RadioGroup
              value={defaultView}
              onValueChange={(value) =>
                setDefaultView(value as typeof defaultView)
              }
              className="sm:grid-cols-2"
            >
              {VIEW_OPTIONS.map((option) => (
                <div key={option.id} className="relative">
                  <RadioGroupItem
                    id={`view-${option.id}`}
                    value={option.id}
                    className="absolute top-4 right-4 z-10"
                  />
                  <Label
                    htmlFor={`view-${option.id}`}
                    className="border-border hover:bg-muted/40 peer-data-checked:border-primary peer-data-checked:bg-primary/5 flex h-full cursor-pointer items-center gap-3 rounded-3xl border p-3.5 pr-10 transition-colors"
                  >
                    <option.icon className="text-muted-foreground size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="text-muted-foreground block text-xs font-normal">
                        {option.description}
                      </span>
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="border-t pt-5">
            <div className="mb-3">
              <FieldLabel>Layout Style</FieldLabel>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Choose how major cards, panels, drawers, and dialogs separate.
              </p>
            </div>
            <RadioGroup
              value={layoutStyle}
              onValueChange={(value) =>
                setLayoutStyle(value as typeof layoutStyle)
              }
              className="sm:grid-cols-2"
            >
              {LAYOUT_OPTIONS.map((option) => (
                <div key={option.id} className="relative">
                  <RadioGroupItem
                    id={`layout-${option.id}`}
                    value={option.id}
                    className="absolute top-4 right-4 z-10"
                  />
                  <Label
                    htmlFor={`layout-${option.id}`}
                    className="border-border hover:bg-muted/40 peer-data-checked:border-primary peer-data-checked:bg-primary/5 flex h-full cursor-pointer items-center gap-3 rounded-3xl border p-3.5 pr-10 transition-colors"
                  >
                    <option.icon className="text-muted-foreground size-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="text-muted-foreground block text-xs font-normal">
                        {option.description}
                      </span>
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
