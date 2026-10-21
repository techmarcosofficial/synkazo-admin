import { Link } from 'react-router-dom';

import NotificationsMenu from './NotificationsMenu';

import PlanBadge from '@/components/shared/PlanBadge';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { usePlanQuery } from '@/queries/useBilling';

/** Tenant-only header controls; this module is never loaded by the platform shell. */
export default function TenantHeaderTools() {
  const { data: plan } = usePlanQuery();
  const { hasRole } = useSynkazoAuth();
  const canManageBilling = hasRole('org_admin');

  return (
    <div className="flex items-center">
      {plan &&
        (canManageBilling ? (
          <Link
            to="/organization/billing/overview"
            className="hidden sm:block"
            title="Manage billing"
          >
            <PlanBadge planName={plan.planName} />
          </Link>
        ) : (
          <span className="hidden sm:block">
            <PlanBadge planName={plan.planName} />
          </span>
        ))}
      <NotificationsMenu />
    </div>
  );
}
