import { Bell, Layers3, Monitor, Moon, PanelTop, Sun } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { showToast } from '@/lib/toast';
import { useUpdateMeMutation } from '@/queries/useUsers';
import { useDisplayPreferencesStore } from '@/stores/useDisplayPreferencesStore';

type NotifPrefs = { notifySyncCompleted: boolean; notifySyncFailed: boolean };

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="text-muted-foreground size-4" /> Preferences
        </CardTitle>
        <CardDescription>
          Notifications, theme, and display settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <FieldLabel>Notifications</FieldLabel>
          <div className="divide-y">
            {NOTIFICATION_ROWS.map((row) => (
              <div
                key={row.field}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-muted-foreground text-xs">{row.desc}</p>
                </div>
                <Switch
                  checked={prefs[row.field]}
                  onCheckedChange={(v) => updatePref(row.field, v)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel>Appearance</FieldLabel>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v as typeof theme)}
            variant="outline"
          >
            {THEME_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.id} value={opt.id}>
                <opt.icon /> {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <FieldLabel>Default View</FieldLabel>
          <p className="text-muted-foreground text-xs">
            Applied immediately across Projects, Users, and Connections, unless
            a page has been manually switched.
          </p>
          <ToggleGroup
            type="single"
            value={defaultView}
            onValueChange={(v) => v && setDefaultView(v as typeof defaultView)}
            variant="outline"
          >
            <ToggleGroupItem value="card">Cards</ToggleGroupItem>
            <ToggleGroupItem value="table">List</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <FieldLabel>Layout Style</FieldLabel>
          <p className="text-muted-foreground text-xs">
            Changes only major page sections, cards, panels, drawers, and
            dialogs. Inner content and controls keep their existing styling.
          </p>
          <ToggleGroup
            type="single"
            value={layoutStyle}
            onValueChange={(value) =>
              value && setLayoutStyle(value as typeof layoutStyle)
            }
            variant="outline"
          >
            <ToggleGroupItem value="contrast">
              <PanelTop /> Contrast / Border
            </ToggleGroupItem>
            <ToggleGroupItem value="shadow">
              <Layers3 /> Normal / Shadow
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Button
            onClick={save}
            loading={updateMeMutation.isPending}
            disabled={!isDirty}
          >
            Save Preferences
          </Button>
          <p className="text-muted-foreground text-xs">
            Appearance, Default View, and Layout Style apply immediately.
            Notification changes are saved when you click Save.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
