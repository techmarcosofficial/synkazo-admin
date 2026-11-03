import { Info, Link2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

import AssociationRulesList from '@/components/associations/AssociationRulesList';
import EmptyState from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSuperAdminOrganisationQuery } from '@/queries/useSuperAdmin';

export default function OrganisationProjectAssociationsPage() {
  const { organisationId, projectId } = useParams<{
    organisationId: string;
    projectId: string;
  }>();

  if (!organisationId || !projectId) {
    return (
      <EmptyState
        icon={Link2}
        title="Missing route parameters"
        description="Both organisation and project ids are required."
      />
    );
  }

  return (
    <OrganisationProjectAssociationsPanel
      organisationId={organisationId}
      projectId={projectId}
    />
  );
}

export function OrganisationProjectAssociationsPanel({
  organisationId,
  projectId,
}: {
  organisationId: string;
  projectId: string;
}) {
  const orgQuery = useSuperAdminOrganisationQuery(organisationId);

  return (
    <div className="space-y-4">
      <Alert className="border-info/20 bg-info/5 text-info">
        <Info className="size-4" />
        <AlertTitle className="text-foreground text-xs font-semibold">
          Cross-flow record associations
        </AlertTitle>
        <AlertDescription className="text-muted-foreground text-xs">
          Sync flows transfer individual objects (such as Contacts, Companies,
          or Jobs). Record associations establish relationships between those
          records so child records attach automatically to their parents
          across platforms.
        </AlertDescription>
      </Alert>

      <AssociationRulesList
        projectId={projectId}
        organisationId={organisationId}
        organisationName={orgQuery.data?.name}
      />
    </div>
  );
}
