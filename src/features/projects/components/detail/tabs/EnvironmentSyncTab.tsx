import { AlertCircle } from 'lucide-react';

import { useProjectDetailContext } from '../context';
import EnvironmentOverviewCards, {
  environmentReadiness,
} from '../settings/EnvironmentOverviewCards';
import WorkspaceInventory from '../settings/WorkspaceInventory';
import WorkspaceJobCopy from '../settings/WorkspaceJobCopy';

import MigrationPanel from '@/components/migration/MigrationPanel';
import HeadingPair from '@/components/shared/HeadingPair';
import { PlanFeatureGate } from '@/components/shared/PlanGate';
import { Badge } from '@/components/ui/badge';
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
  const isProductionReady = environmentReadiness(
    connections,
    'production',
  ).ready;

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

      <WorkspaceInventory projectId={projectId} />

      <WorkspaceJobCopy projectId={projectId} />

      <section className="space-y-4 border-t pt-6">
        <HeadingPair
          level="h3"
          title="Standard-object custom fields transfer"
          subtitle="Optionally copy HubSpot custom fields on standard objects. Create custom object schemas, related fields, associations, and their jobs manually in each workspace."
          trailing={
            <Badge size="xs" variant="secondary">
              Optional
            </Badge>
          }
        />

        {!isProductionReady && (
          <div className="border-warning/30 bg-warning/[0.04] flex items-center gap-2.5 rounded-2xl border p-3 text-xs">
            <AlertCircle className="text-warning size-4 shrink-0" />
            <p className="text-muted-foreground">
              <strong className="text-foreground font-medium">
                Production connection required:
              </strong>{' '}
              To transfer standard-object custom fields, connect your live
              Production platforms in the environment card above first.
            </p>
          </div>
        )}

        <PlanFeatureGate
          allowed={envMigration}
          title="Environment migration isn't on your plan"
          description="Copy HubSpot custom fields on standard objects between Sandbox and Production. Custom object schemas and their jobs require manual setup. Upgrade to enable environment migration."
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
