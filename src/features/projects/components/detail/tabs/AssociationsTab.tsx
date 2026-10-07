import { Info } from 'lucide-react';
import { useProjectDetailContext } from '../context';

import AssociationRulesList from '@/components/associations/AssociationRulesList';
import { PlanFeatureGate } from '@/components/shared/PlanGate';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEntitlements } from '@/queries/useEntitlements';

export default function AssociationsTab() {
  const { projectId } = useProjectDetailContext();
  const { associationRules } = useEntitlements();
  return (
    <PlanFeatureGate
      allowed={associationRules}
      title="Association rules aren't on your plan"
      description="Association rules link related records across platforms — for example attaching a synced job to its customer. Upgrade to configure them."
    >
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

        <AssociationRulesList projectId={projectId} />
      </div>
    </PlanFeatureGate>
  );
}
