import PageHeader from '@/components/shared/PageHeader';
import ProfileTab from '@/pages/settings/tabs/ProfileTab';

/** Personal account controls that do not assume a tenant organisation. */
export default function PlatformProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your platform administrator account."
      />
      <ProfileTab platform />
    </div>
  );
}
