import { useState } from 'react';
import { Gauge, Lock, Webhook } from 'lucide-react';

import HubspotWebhookSettingsCard from './HubspotWebhookSettingsCard';
import TwoWaySyncSettingsCard from './TwoWaySyncSettingsCard';
import ManageAuthPagesCard from './ManageAuthPagesCard';

import PageHeader from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId = 'sync' | 'webhooks' | 'auth';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('sync');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'sync',
      label: 'Two-Way Sync',
      icon: <Gauge className="size-4" />,
    },
    {
      id: 'webhooks',
      label: 'HubSpot Webhook',
      icon: <Webhook className="size-4" />,
    },
    {
      id: 'auth',
      label: 'Auth Pages',
      icon: <Lock className="size-4" />,
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
        title="Platform Settings"
        description="Configure global sync settings, webhooks, and authentication pages."
      />

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabId)}>
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          <TwoWaySyncSettingsCard />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <HubspotWebhookSettingsCard />
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <ManageAuthPagesCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
