import { Bell, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import BillingSection from './BillingSection';
import ProfileSection from './ProfileSection';

import PageHeader from '@/components/shared/PageHeader';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { useUpdateMeMutation } from '@/queries/useUsers';
import { useDisplayPreferencesStore } from '@/stores/useDisplayPreferencesStore';
import type { User as UserType } from '@/types';

type UserWithNotifPrefs = UserType & {
  notifySyncCompleted?: boolean;
  notifySyncFailed?: boolean;
  notify_sync_completed?: boolean;
  notify_sync_failed?: boolean;
};

type NotifPrefs = { notifySyncCompleted: boolean; notifySyncFailed: boolean };

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
] as const;

function PreferencesSection({
  currentUser,
}: {
  currentUser: UserWithNotifPrefs | null;
}) {
  const { theme, setTheme } = useTheme();
  const defaultView = useDisplayPreferencesStore((state) => state.defaultView);
  const setDefaultView = useDisplayPreferencesStore(
    (state) => state.setDefaultView,
  );

  const updateMeMutation = useUpdateMeMutation();
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notifySyncCompleted: false,
    notifySyncFailed: true,
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPrefs({
        notifySyncCompleted:
          currentUser.notifySyncCompleted ??
          currentUser.notify_sync_completed ??
          false,
        notifySyncFailed:
          currentUser.notifySyncFailed ??
          currentUser.notify_sync_failed ??
          true,
      });
      setIsDirty(false);
    }
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
      } as Partial<UserType>);
      setIsDirty(false);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  const rows: { label: string; desc: string; field: keyof NotifPrefs }[] = [
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
            {rows.map((row) => (
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
          <FieldLabel>Theme</FieldLabel>
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
            <ToggleGroupItem value="card">Card</ToggleGroupItem>
            <ToggleGroupItem value="table">List</ToggleGroupItem>
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
            Theme and Default View apply immediately. Notification changes are
            saved when you click Save.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const SECTIONS = ['settings', 'profile', 'billing'] as const;
type Section = (typeof SECTIONS)[number];

export default function SettingsPage() {
  const { currentUser, hasRole } = useSynkazoAuth();
  const canBilling = hasRole('org_admin');
  const [searchParams, setSearchParams] = useSearchParams();

  const requested = searchParams.get('section');
  const section: Section =
    requested === 'billing' && !canBilling
      ? 'settings'
      : SECTIONS.includes(requested as Section)
        ? (requested as Section)
        : 'settings';

  const handleSectionChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader
        backTo={{ label: 'Back to Dashboard', to: '/dashboard' }}
        title="Settings"
        description="Manage your account, appearance, and organisation."
      />

      <Tabs value={section} onValueChange={handleSectionChange}>
        <TabsList variant="line">
          <TabsTrigger className="after:bg-primary" value="settings">
            Settings
          </TabsTrigger>
          <TabsTrigger className="after:bg-primary" value="profile">
            Profile
          </TabsTrigger>
          {canBilling && (
            <TabsTrigger className="after:bg-primary" value="billing">
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="settings" className="max-w-xl pt-4">
          <PreferencesSection currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="profile" className="pt-4">
          <ProfileSection
            onManageBilling={() => handleSectionChange('billing')}
          />
        </TabsContent>

        {canBilling && (
          <TabsContent value="billing" className="pt-4">
            <BillingSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
