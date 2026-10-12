import { useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { LifeBuoy } from 'lucide-react';
import OrganisationNotesCard from '@/pages/superadmin/organisations/OrganisationNotesCard';

export default function OrganisationSupportPage() {
  const { organisationId } = useParams<{ organisationId: string }>();

  if (!organisationId) {
    return (
      <EmptyState
        icon={LifeBuoy}
        title="Missing organisation id"
        description="This route requires an organisation identifier in the URL."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Record support context for the selected organisation."
      />
      <OrganisationNotesCard
        organisationId={organisationId}
        category="support"
      />
    </div>
  );
}
