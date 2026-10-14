import { Outlet, useParams } from 'react-router-dom';

import StickyDetailHeader from '@/components/shared/StickyDetailHeader';

import OrganisationContextHeader from './OrganisationContextHeader';

/** Persistent target context for platform operations scoped to one organisation. */
export default function OrganisationScopeLayout() {
  const { organisationId, projectId, jobId } = useParams<{
    organisationId: string;
    projectId: string;
    jobId: string;
  }>();

  if (!organisationId) return null;

  const projectPath = `/super-admin/organisations/${organisationId}/projects`;
  const backLabel = jobId
    ? 'Back to Sync Flows'
    : projectId
      ? 'Back to Projects'
      : 'Back to Organisations';
  const backTo = jobId
    ? `${projectPath}/${projectId}?tab=sync-rules`
    : projectId
      ? projectPath
      : '/super-admin/organisations';

  return (
    <StickyDetailHeader
      backLabel={backLabel}
      backTo={backTo}
      header={<OrganisationContextHeader />}
    >
      <Outlet />
    </StickyDetailHeader>
  );
}
