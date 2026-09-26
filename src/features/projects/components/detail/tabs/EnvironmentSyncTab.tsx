import { AlertCircle } from 'lucide-react';

import { useProjectDetailContext } from '../context';
import EnvironmentOverviewCards, {
  environmentReadiness,
} from '../settings/EnvironmentOverviewCards';

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
  const isProductionReady = environmentReadiness(connections, 'production').ready;

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
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">
              Schema & custom properties transfer
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Compare and transfer HubSpot custom objects, properties, and
            association labels between Sandbox and Production without recreating
            them manually.
          </p>
        </div>

        {!isProductionReady && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-warning/30 bg-warning/[0.04] p-3 text-xs">
            <AlertCircle className="size-4 shrink-0 text-warning" />
            <p className="text-muted-foreground">
              <strong className="text-foreground font-medium">Production connection required:</strong>{' '}
              To transfer custom schema and properties, connect your live Production platforms in the environment card above first.
            </p>
          </div>
        )}

        <PlanFeatureGate
          allowed={envMigration}
          title="Environment migration isn't on your plan"
          description="Compare and transfer HubSpot custom objects, properties, and association labels between Sandbox and Production. Upgrade to enable environment migration."
        >
          <MigrationPanel
            projectId={projectId}
            connections={connections}
            isProductionReady={isProductionReady}
            onGoToConnections={() => handleTabChange('connections')}
          />
        </PlanFeatureGate>
      </section>
    </div>
  );
}
