import HubspotWebhookSettingsCard from './HubspotWebhookSettingsCard';
import TwoWaySyncSettingsCard from './TwoWaySyncSettingsCard';

import PageHeader from '@/components/shared/PageHeader';

export default function SystemSettingsPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        backTo={{ label: 'Back to Super Admin', to: '/super-admin' }}
        title="Platform Settings"
        description="Configure global sync settings and system preferences."
      />

      <TwoWaySyncSettingsCard />
      <HubspotWebhookSettingsCard />
    </div>
  );
}
