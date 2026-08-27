// Done

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import GlobalLoader from '../shared/GlobalLoader';
import OverLimitBanner from '../shared/OverLimitBanner';
import PastDueBanner from '../shared/PastDueBanner';
import WelcomeGuideModal from '../shared/WelcomeGuideModal';

import SiteHeader from './site-header';

import SubscriptionPaywall from '@/components/billing/SubscriptionPaywall';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { SetupWizardDialog } from '@/features/projects/components/setup';
import SourceSetupDialog from '@/features/projects/components/setup/SourceSetupDialog';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { usePlanQuery } from '@/queries/useBilling';

// Subscription states with no live billing relationship, or where renewal has fully failed
// (Stripe's retries exhausted) — these are paywalled. `past_due` is Stripe's automatic
// retry/grace window (card may still succeed on retry) and keeps dashboard access via
// PastDueBanner instead of a hard lockout. Mirrors CronGateService's own distinction between
// "syncing paused" (unpaid) and "still retrying" (past_due).
const PAYWALL_STATUSES = new Set(['none', 'canceled', 'incomplete', 'unpaid']);

export default function AppLayout() {
  const { currentUser, isLoading, hasRole } = useSynkazoAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  // Platform operators are exempt from the paywall so they can't lock themselves out of
  // admin/plan-management. Skip the plan fetch entirely for them.
  const isSuperAdmin = hasRole('super_admin');
  const planQuery = usePlanQuery({ enabled: !!currentUser && !isSuperAdmin });

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

  // Subscription gate (super_admins exempt). Wait for the plan to resolve before deciding so
  // we never flash the dashboard, then fail closed: only active/trialing orgs get through.
  if (!isSuperAdmin) {
    if (planQuery.isLoading) {
      return (
        <div className="bg-background fixed inset-0 z-[70] flex items-center justify-center">
          <Spinner className="size-6" />
        </div>
      );
    }
    if (PAYWALL_STATUSES.has(planQuery.data?.subscriptionStatus ?? 'none')) {
      return <SubscriptionPaywall />;
    }
  }

  return (
    <>
      <SidebarProvider>
        {showWelcome && (
          <WelcomeGuideModal onClose={() => setShowWelcome(false)} />
        )}
        <SetupWizardDialog />
        <SourceSetupDialog />
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="container mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
            <PastDueBanner />
            <OverLimitBanner />
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
