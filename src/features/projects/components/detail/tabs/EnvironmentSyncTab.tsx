import { useProjectDetailContext } from '../context';

import MigrationPanel from '@/components/migration/MigrationPanel';
import { PlanFeatureGate } from '@/components/shared/PlanGate';
import { useEntitlements } from '@/queries/useEntitlements';

export default function EnvironmentSyncTab() {
  const { projectId, connections, handleTabChange } = useProjectDetailContext();
  const { envMigration } = useEntitlements();
  return (
    <PlanFeatureGate
      allowed={envMigration}
      title="Environment migration isn't on your plan"
      description="Copy a project's jobs and field mappings from your sandbox to production. Upgrade to enable sandbox → production migration."
    >
      <MigrationPanel
        projectId={projectId}
        connections={connections}
        onGoToConnections={() => handleTabChange('connections')}
      />
    </PlanFeatureGate>
  );
}
