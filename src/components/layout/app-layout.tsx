// Done

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import GlobalLoader, { PageLoader } from '../shared/GlobalLoader';
import WelcomeGuideModal from '../shared/WelcomeGuideModal';

import SiteHeader from './site-header';

import SubscriptionPaywall from '@/components/billing/SubscriptionPaywall';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TenantAdminVisualContext } from '@/components/shared/TenantAdminVisualContext';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import SourceSetupDialog from '@/features/projects/components/setup/SourceSetupDialog';
import CreateProjectDialog from '@/features/projects/components/create/CreateProjectDialog';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { usePlanQuery } from '@/queries/useBilling';

// The API decides when renewal grace expires and returns paymentHoldActive.
// Billing remains available so an organisation can repair its payment method.
const ACCESS_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'pending_cancel',
]);

export default function AppLayout() {
  const location = useLocation();
  const { currentUser, isLoading, hasRole, hasPermission } = useSynkazoAuth();
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
      return <PageLoader className="z-[70]" label="Loading subscription" />;
    }
    if (
      !location.pathname.startsWith('/organization/billing') &&
      (planQuery.data?.paymentHoldActive ||
        !ACCESS_STATUSES.has(planQuery.data?.subscriptionStatus ?? 'none'))
    ) {
      return <SubscriptionPaywall />;
    }
  }

  return (
    <TenantAdminVisualContext.Provider value={true}>
      <SidebarProvider data-admin-shell="workspace">
        {showWelcome && (
          <WelcomeGuideModal onClose={() => setShowWelcome(false)} />
        )}
        <SourceSetupDialog />
        <CreateProjectDialog />
        <AppSidebar />
        <SidebarInset className="max-w-full min-w-0 overflow-x-clip [--app-shell-header-height:--spacing(16)]">
          <SiteHeader />
          <main className="container mx-auto flex w-full max-w-full min-w-0 flex-1 flex-col gap-4 px-5 py-4 sm:px-7 sm:py-6 lg:px-8 xl:px-10">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TenantAdminVisualContext.Provider>
  );
}
