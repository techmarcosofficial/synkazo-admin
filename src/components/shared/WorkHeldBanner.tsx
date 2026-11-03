import { CircleAlert } from 'lucide-react';
import PageContextAlert from '@/components/shared/PageContextAlert';
import { usePlanQuery } from '@/queries/useBilling';

/**
 * Tenant-facing notice rendered when a Super Admin has placed jobs on hold.
 * Informs the tenant that sync processing is temporarily paused for maintenance
 * and will automatically catch up once released.
 */
export default function WorkHeldBanner() {
  const { data } = usePlanQuery();
  if (!data?.isWorkHeld && (!data?.heldJobsCount || data.heldJobsCount <= 0)) {
    return null;
  }

  const count = data.heldJobsCount ?? 1;

  return (
    <PageContextAlert
      variant="warning"
      dismissKey="account:work-held"
      dismissible={false}
      icon={CircleAlert}
      title="Sync operations temporarily paused by Synkazo Support"
      description={
        <span>
          {count} sync flow{count === 1 ? '' : 's'} {count === 1 ? 'is' : 'are'} currently on operational hold for system maintenance or upstream API verification. Your configurations and historical data are safe. All scheduled flows will resume and catch up automatically once released.
        </span>
      }
    />
  );
}
