// Done

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import GlobalLoader, { PageLoader } from '../shared/GlobalLoader';
import WelcomeGuideModal from '../shared/WelcomeGuideModal';

import WorkspaceShell from './workspace-shell';

import SubscriptionPaywall from '@/components/billing/SubscriptionPaywall';
import { TenantAdminVisualContext } from '@/components/shared/TenantAdminVisualContext';
import SourceSetupDialog from '@/features/projects/components/setup/SourceSetupDialog';
import CreateProjectDialog from '@/features/projects/components/create/CreateProjectDialog';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { PLATFORM_HOME } from '@/lib/workspace';
import { usePlanQuery } from '@/queries/useBilling';

// Subscription states with no live billing relationship, or where renewal has fully failed
// (Stripe's retries exhausted) — these are paywalled. `past_due` is Stripe's automatic
// retry/grace window (card may still succeed on retry) and keeps dashboard access via
// PastDueBanner instead of a hard lockout. Mirrors CronGateService's own distinction between
// "syncing paused" (unpaid) and "still retrying" (past_due).
const PAYWALL_STATUSES = new Set(['none', 'canceled', 'incomplete', 'unpaid']);

export default function AppLayout() {
  const { currentUser, isLoading } = useSynkazoAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  const isTenant = !!currentUser && currentUser.role !== 'super_admin';
  const planQuery = usePlanQuery({ enabled: isTenant });

  useEffect(() => {
    if (!currentUser) return;
    const key = `welcome_pending_${currentUser.id}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      setShowWelcome(true);
    }
  }, [currentUser]);

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isTenant) return <Navigate to={PLATFORM_HOME} replace />;

  // Wait for the tenant plan before allowing a tenant page to paint.
  if (planQuery.isLoading) {
    return <PageLoader className="z-[70]" label="Loading subscription" />;
  }
  if (PAYWALL_STATUSES.has(planQuery.data?.subscriptionStatus ?? 'none')) {
    return <SubscriptionPaywall />;
  }

  return (
    <TenantAdminVisualContext.Provider value={true}>
      <WorkspaceShell kind="tenant">
        {showWelcome && (
          <WelcomeGuideModal onClose={() => setShowWelcome(false)} />
        )}
        <SourceSetupDialog />
        <CreateProjectDialog />
      </WorkspaceShell>
    </TenantAdminVisualContext.Provider>
  );
}
