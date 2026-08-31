import { useProjectDetailContext } from '../context';

import AssociationRulesList from '@/components/associations/AssociationRulesList';
import { PlanFeatureGate } from '@/components/shared/PlanGate';
import { useEntitlements } from '@/queries/useEntitlements';

export default function AssociationsTab() {
  const { projectId, connections } = useProjectDetailContext();
  const { associationRules } = useEntitlements();
  // Company-owner assignment supports ServiceTitan (CAM name-matching) and
  // Dataforma (configurable field mappings) as distinct, isolated flows —
  // see CompanyOwnerSection for the platform-specific UI each renders.
  const ownerSourcePlatform = connections.some(
    (c) => c.platformId === 'servicetitan',
  )
    ? 'servicetitan'
    : connections.some((c) => c.platformId === 'dataforma')
      ? 'dataforma'
      : null;
  return (
    <PlanFeatureGate
      allowed={associationRules}
      title="Association rules aren't on your plan"
      description="Association rules link related records across platforms — for example attaching a synced job to its customer. Upgrade to configure them."
    >
      <AssociationRulesList
        projectId={projectId}
        showCompanyOwnerSection={ownerSourcePlatform !== null}
        ownerSourcePlatform={ownerSourcePlatform}
      />
    </PlanFeatureGate>
  );
}
