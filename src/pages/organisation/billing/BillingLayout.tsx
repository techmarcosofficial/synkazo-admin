import { Outlet } from 'react-router-dom';

import BillingSectionShell from './BillingSectionShell';

/**
 * Clean, full-width billing workspace without the secondary navigation rail.
 * Wraps content in BillingSectionShell for Stripe checkout returns and state hydration.
 */
export default function BillingLayout() {
  return (
    <BillingSectionShell>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </BillingSectionShell>
  );
}
