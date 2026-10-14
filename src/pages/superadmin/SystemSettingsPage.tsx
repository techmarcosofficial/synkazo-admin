import { useState } from 'react';
import { Flag, Gauge, Lock, Store, Webhook } from 'lucide-react';

import FeatureFlagsCard from './FeatureFlagsCard';
import HubspotWebhookSettingsCard from './HubspotWebhookSettingsCard';
import MarketplaceCatalogCard from './MarketplaceCatalogCard';
import ScheduleAndTimeSettingsCard from './ScheduleAndTimeSettingsCard';
import ManageAuthPagesCard from './ManageAuthPagesCard';
import BillingRecoveryCard from './BillingRecoveryCard';

import PageHeader from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId = 'sync' | 'webhooks' | 'auth' | 'flags' | 'marketplace' | 'billing';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('sync');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'billing',
      label: 'Billing Recovery',
      icon: <Gauge className="size-4" />,
    },
    {
      id: 'sync',
      label: 'Schedule & Time',
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
        description="Configure sync schedules, billing recovery, webhooks, authentication pages, feature flags, and marketplace catalog."
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabId)}
      >
        <TabsList className="flex h-auto w-full flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2"
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          <ScheduleAndTimeSettingsCard />
        </TabsContent>
        <TabsContent value="billing">
          <BillingRecoveryCard />
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
