import { useProjectDetailContext } from '../context';
import EnvironmentOverviewCards from '../settings/EnvironmentOverviewCards';

import MigrationPanel from '@/components/migration/MigrationPanel';
import { PlanFeatureGate } from '@/components/shared/PlanGate';
import { useEntitlements } from '@/queries/useEntitlements';

export default function EnvironmentSyncTab() {
  const {
    projectId,
    project,
    connections,
    handleTabChange,
    projectActiveEnv,
    envActivating,
    environmentActivationError,
    clearEnvironmentActivationError,
    onActivateEnv,
  } = useProjectDetailContext();
  const { envMigration } = useEntitlements();
  return (
    <div className="space-y-6">
      <EnvironmentOverviewCards
        project={project}
        connections={connections}
        activeEnvironment={projectActiveEnv}
        activating={envActivating}
        activationError={environmentActivationError}
        clearActivationError={clearEnvironmentActivationError}
        onActivate={onActivateEnv}
        onGoToConnections={() => handleTabChange('connections')}
      />

      <section className="space-y-4 border-t pt-6">
        <div>
          <h3 className="text-base font-semibold">
            Schema and configuration sync
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and transfer configuration separately from the environment
            used by sync runs.
          </p>
        </div>
        <PlanFeatureGate
          allowed={envMigration}
          title="Environment migration isn't on your plan"
          description="Compare and transfer HubSpot custom objects, properties, and association labels between Sandbox and Production. Upgrade to enable environment migration."
        >
          <MigrationPanel
            projectId={projectId}
            connections={connections}
            onGoToConnections={() => handleTabChange('connections')}
          />
        </PlanFeatureGate>
      </section>
    </div>
  );
}
