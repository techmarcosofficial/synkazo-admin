import { useState } from 'react';
import { Flag, Gauge, Lock, Store, Webhook } from 'lucide-react';

import FeatureFlagsCard from './FeatureFlagsCard';
import HubspotWebhookSettingsCard from './HubspotWebhookSettingsCard';
import MarketplaceCatalogCard from './MarketplaceCatalogCard';
import TwoWaySyncSettingsCard from './TwoWaySyncSettingsCard';
import ManageAuthPagesCard from './ManageAuthPagesCard';

import PageHeader from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId = 'sync' | 'webhooks' | 'auth' | 'flags' | 'marketplace';

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
    // GAP-023 — global feature flags (separate table from
    // membership_features so rollout and paid-plan permissions never
    // become mixed concepts).
    {
      id: 'flags',
      label: 'Feature flags',
      icon: <Flag className="size-4" />,
    },
    // GAP-023 — presentation overlay for the customer-facing marketplace.
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: <Store className="size-4" />,
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
        title="Platform Settings"
        description="Configure global sync settings, webhooks, authentication pages, feature flags, and marketplace catalog."
      />

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabId)}>
        <TabsList className="grid w-full grid-cols-5">
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

        <TabsContent value="flags" className="space-y-6">
          <FeatureFlagsCard />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <MarketplaceCatalogCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
