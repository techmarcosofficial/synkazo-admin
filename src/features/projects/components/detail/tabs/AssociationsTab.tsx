import { useProjectDetailContext } from '../context';

import AssociationRulesList from '@/components/associations/AssociationRulesList';
import { PlanFeatureGate } from '@/components/shared/PlanGate';
import { useEntitlements } from '@/queries/useEntitlements';

export default function AssociationsTab() {
  const { projectId, connections } = useProjectDetailContext();
  const { associationRules } = useEntitlements();
  const hasServiceTitan = connections.some(
    (c) => c.platformId === 'servicetitan',
  );
  return (
    <PlanFeatureGate
      allowed={associationRules}
      title="Association rules aren't on your plan"
      description="Association rules link related records across platforms — for example attaching a synced job to its customer. Upgrade to configure them."
    >
      <AssociationRulesList
        projectId={projectId}
        showCompanyOwnerSection={hasServiceTitan}
      />
    </PlanFeatureGate>
  );
}
