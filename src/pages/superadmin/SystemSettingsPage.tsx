import { useState } from 'react';
import { CreditCard, Flag, Gauge, Lock, Store, Webhook } from 'lucide-react';

import FeatureFlagsCard from './FeatureFlagsCard';
import HubspotWebhookSettingsCard from './HubspotWebhookSettingsCard';
import MarketplaceCatalogCard from './MarketplaceCatalogCard';
import ScheduleAndTimeSettingsCard from './ScheduleAndTimeSettingsCard';
import ManageAuthPagesCard from './ManageAuthPagesCard';
import BillingRecoveryCard from './BillingRecoveryCard';
import PaymentGatewaySettingsCard from './PaymentGatewaySettingsCard';

import InfoTip from '@/components/shared/InfoTip';
import PageHeader from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabId =
  | 'sync'
  | 'webhooks'
  | 'auth'
  | 'flags'
  | 'marketplace'
  | 'billing'
  | 'payments';

// First visit defaults to Payment Gateways, but the last-selected tab is
// remembered across refreshes so an operator mid-task (e.g. on Auth Pages)
// stays where they were. Stored per-browser; reads are guarded because
// localStorage can throw or be unavailable (private windows, blocked storage).
const ACTIVE_TAB_STORAGE_KEY = 'superadmin.systemSettings.activeTab';

// "Coming soon" tabs: the Feature flags + Marketplace surfaces exist in the
// admin UI but nothing in the product consumes them yet, so they are disabled
// and shown with a "coming soon" hint instead of being selectable. Keeping the
// ids here (rather than hard-deleting the tabs) makes re-enabling a one-liner.
const DISABLED_TAB_IDS: readonly TabId[] = ['flags', 'marketplace'];

// Only enabled tabs are valid targets to open or restore. A stored value
// pointing at a now-disabled tab (e.g. saved before it was disabled) falls
// back to the default.
const SELECTABLE_TAB_IDS: readonly TabId[] = [
  'sync',
  'webhooks',
  'auth',
  'billing',
  'payments',
];

function readStoredTab(): TabId {
  try {
    const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (stored && SELECTABLE_TAB_IDS.includes(stored as TabId)) {
      return stored as TabId;
    }
  } catch {
    // ignore — fall back to the default
  }
  return 'payments';
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>(readStoredTab);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'payments',
      label: 'Payment Gateways',
      icon: <CreditCard className="size-4" />,
    },
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
        description="Configure sync schedules, payment gateways, billing recovery, webhooks, authentication pages, feature flags, and marketplace catalog."
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          const next = val as TabId;
          setActiveTab(next);
          try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, next);
          } catch {
            // ignore — persistence is best-effort
          }
        }}
      >
        <TabsList className="flex h-auto w-full flex-wrap">
          {tabs.map((tab) => {
            const isDisabled = DISABLED_TAB_IDS.includes(tab.id);

            if (isDisabled) {
              // Rendered as a static chip (not a TabsTrigger) so it can't be
              // selected and the info "i" stays hoverable — a disabled Radix
              // trigger would set pointer-events:none and swallow the hover.
              return (
                <div
                  key={tab.id}
                  aria-disabled="true"
                  className="text-foreground/40 flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap select-none"
                >
                  {tab.icon}
                  {tab.label}
                  <InfoTip label="Coming soon" side="bottom">
                    Coming soon — this feature isn&apos;t available yet.
                  </InfoTip>
                </div>
              );
            }

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          <ScheduleAndTimeSettingsCard />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentGatewaySettingsCard />
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
