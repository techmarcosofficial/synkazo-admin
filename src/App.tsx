import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, type ReactNode } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { queryClientInstance } from '@/lib/query-client';
import { SynkazoAuthProvider, useSynkazoAuth } from '@/lib/synkazoAuth';

// Global UI
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import GlobalLoader from '@/components/shared/GlobalLoader';

// Auth pages
import AcceptInvite from '@/pages/auth/AcceptInvite';
import AuthCallback from '@/pages/auth/AuthCallback';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Login from '@/pages/auth/Login';
import RegistrationGate from '@/pages/auth/RegistrationGate';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';

// App pages
import WelcomeOnboarding from '@/pages/WelcomeOnboarding';
import ExactRoleGuard from '@/components/auth/ExactRoleGuard';
import RoleGuard from '@/components/auth/RoleGuard';
import LegacyRedirect from '@/components/routing/LegacyRedirect';

import PageNotFound from './lib/PageNotFound';
import { homeForUser } from '@/lib/workspace';

const OverviewPage = lazy(() => import('@/pages/superadmin/OverviewPage'));
const OrganisationsPage = lazy(
  () => import('@/pages/superadmin/OrganisationsPage'),
);
const OrganisationDetailPage = lazy(
  () => import('@/pages/superadmin/OrganisationDetailPage'),
);
const OrganisationActivityPage = lazy(
  () => import('@/pages/superadmin/OrganisationActivityPage'),
);
const OrganisationSupportPage = lazy(
  () => import('@/pages/superadmin/OrganisationSupportPage'),
);
const OrganisationJobDetailPage = lazy(
  () => import('@/pages/superadmin/OrganisationJobDetailPage'),
);
const OrganisationScopeLayout = lazy(
  () => import('@/pages/superadmin/OrganisationScopeLayout'),
);
const OrganisationMembersPage = lazy(
  () => import('@/pages/superadmin/OrganisationMembersPage'),
);
const OrganisationProjectsPage = lazy(
  () => import('@/pages/superadmin/OrganisationProjectsPage'),
);
const OrganisationProjectDetailPage = lazy(
  () => import('@/pages/superadmin/OrganisationProjectDetailPage'),
);
const OrganisationBillingPage = lazy(
  () => import('@/pages/superadmin/OrganisationBillingPage'),
);
const UsersPage = lazy(() => import('@/pages/superadmin/UsersPage'));
const MarketingPage = lazy(() => import('@/pages/superadmin/MarketingPage'));
const PlanManagementPage = lazy(
  () => import('@/pages/admin/PlanManagementPage'),
);
const DiscountManagementPage = lazy(
  () => import('@/pages/admin/DiscountManagementPage'),
);
const FailedPaymentsPage = lazy(
  () => import('@/pages/superadmin/FailedPaymentsPage'),
);
const SystemSettingsPage = lazy(
  () => import('@/pages/superadmin/SystemSettingsPage'),
);
const PlatformAuditPage = lazy(
  () => import('@/pages/superadmin/PlatformAuditPage'),
);
const PlatformProfilePage = lazy(
  () => import('@/pages/superadmin/PlatformProfilePage'),
);

function ProjectSettingsLegacyRedirect({
  section,
}: {
  section: 'associations' | 'environments';
}) {
  const { organisationId, projectId } = useParams();
  return (
    <Navigate
      to={`/super-admin/organisations/${organisationId}/projects/${projectId}?tab=settings&section=${section}`}
      replace
    />
  );
}
const AppLayout = lazy(() => import('@/components/layout/app-layout'));
const SuperAdminLayout = lazy(
  () => import('@/pages/superadmin/SuperAdminLayout'),
);
const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'));
const ProjectDetail = lazy(() => import('@/pages/projects/ProjectDetail'));
const JobDetail = lazy(() => import('@/pages/jobs/JobDetail'));
const Jobs = lazy(() => import('@/pages/jobs/Jobs'));
const ActiveSyncs = lazy(() => import('@/pages/sync/ActiveSyncs'));
const SchedulerHealth = lazy(() => import('@/pages/SchedulerHealth'));
const LogsPage = lazy(() => import('@/pages/sync/LogsPage'));
const EditorDashboard = lazy(() => import('@/pages/dashboard/EditorDashboard'));
const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'));
const ProfileTab = lazy(() => import('@/pages/settings/tabs/ProfileTab'));
const PreferencesTab = lazy(
  () => import('@/pages/settings/tabs/PreferencesTab'),
);
const OrganizationLayout = lazy(
  () => import('@/pages/organisation/OrganizationLayout'),
);
const OrgGeneralTab = lazy(
  () => import('@/pages/organisation/tabs/OrgGeneralTab'),
);
const OrgMembersTab = lazy(
  () => import('@/pages/organisation/tabs/OrgMembersTab'),
);
const OrgInvitationsTab = lazy(
  () => import('@/pages/organisation/tabs/OrgInvitationsTab'),
);
const BillingLayout = lazy(
  () => import('@/pages/organisation/billing/BillingLayout'),
);
const BillingOverviewTab = lazy(
  () => import('@/pages/organisation/billing/tabs/BillingOverviewTab'),
);
const SubscriptionTab = lazy(
  () => import('@/pages/organisation/billing/tabs/SubscriptionTab'),
);
const PaymentMethodsTab = lazy(
  () => import('@/pages/organisation/billing/tabs/PaymentMethodsTab'),
);
const InvoicesTab = lazy(
  () => import('@/pages/organisation/billing/tabs/InvoicesTab'),
);
const PaymentHistoryTab = lazy(
  () => import('@/pages/organisation/billing/tabs/PaymentHistoryTab'),
);
const CreateJob = lazy(() => import('@/pages/jobs/CreateJob'));
const AuditLogPage = lazy(() => import('@/pages/audit/AuditLogPage'));
const ProjectConnections = lazy(
  () => import('@/pages/projects/ProjectConnections'),
);
const ConnectionsPage = lazy(() => import('@/pages/ConnectionsPage'));
const SetupOrganisation = lazy(
  () => import('@/pages/organisation/SetupOrganisation'),
);
const OrgAdminDashboard = lazy(
  () => import('@/pages/dashboard/OrgAdminDashboard'),
);

// This app only ever serves app.synkazo.com — "/" has no landing page of its own,
// it just sends the visitor to whichever authenticated-vs-not page is correct.
// Preserves the query string so a HubSpot-error redirect (`?hubspot_error=...`)
// landing on bare "/" doesn't lose it.
function RootRedirect() {
  const { currentUser, isLoading } = useSynkazoAuth();
  const { search } = useLocation();
  if (isLoading) return <GlobalLoader />;
  return (
    <Navigate
      to={`${currentUser ? homeForUser(currentUser) : '/login'}${search}`}
      replace
    />
  );
}

function TenantOnlyPage({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useSynkazoAuth();
  if (isLoading) return <GlobalLoader />;
  if (currentUser?.role === 'super_admin') {
    return <Navigate to={homeForUser(currentUser)} replace />;
  }
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <SynkazoAuthProvider>
          <Suspense fallback={<GlobalLoader />}>
            <Routes>
              {/* Public — no layout */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegistrationGate />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route
                path="/welcome"
                element={
                  <TenantOnlyPage>
                    <WelcomeOnboarding />
                  </TenantOnlyPage>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/checkout"
                element={
                  <TenantOnlyPage>
                    <CheckoutPage />
                  </TenantOnlyPage>
                }
              />

              {/* Protected — AppLayout checks auth and redirects to /login if not authenticated */}
              <Route element={<AppLayout />}>
                {/* Viewable by all authenticated roles (editor+) */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route
                  path="/projects/:id/jobs/:jobId"
                  element={<JobDetail />}
                />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/active-syncs" element={<ActiveSyncs />} />
                <Route path="/scheduler" element={<SchedulerHealth />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/editor" element={<EditorDashboard />} />

                {/* Settings — personal. Every authenticated role; no guard, because
                  every tab here is about the signed-in user's own account. */}
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route
                    index
                    element={<LegacyRedirect fallback="/settings/profile" />}
                  />
                  <Route path="profile" element={<ProfileTab />} />
                  <Route path="preferences" element={<PreferencesTab />} />
                  <Route
                    path="security"
                    element={<Navigate to="/settings/profile" replace />}
                  />
                  {/* Billing moved out of personal settings entirely. */}
                  <Route path="billing" element={<LegacyRedirect />} />
                  <Route
                    path="*"
                    element={<Navigate to="/settings/profile" replace />}
                  />
                </Route>

                {/* Organization — tenant. Editor+ reaches the shell; the layout
                  hides Invitations/Billing and bounces direct URLs for editors,
                  from the same role rule that draws the tab strip (lib/sectionTabs). */}
                <Route path="/organization" element={<OrganizationLayout />}>
                  <Route index element={<Navigate to="general" replace />} />
                  <Route path="general" element={<OrgGeneralTab />} />
                  <Route path="members" element={<OrgMembersTab />} />
                  <Route path="invitations" element={<OrgInvitationsTab />} />

                  {/* Billing workspace — unified single dashboard */}
                  <Route path="billing" element={<BillingLayout />}>
                    <Route index element={<BillingOverviewTab />} />
                    <Route
                      path="overview"
                      element={<Navigate to="/organization/billing" replace />}
                    />
                    <Route
                      path="subscription"
                      element={<Navigate to="/organization/billing" replace />}
                    />
                    <Route
                      path="payment-methods"
                      element={<Navigate to="/organization/billing" replace />}
                    />
                    <Route
                      path="invoices"
                      element={<Navigate to="/organization/billing" replace />}
                    />
                    <Route
                      path="payment-history"
                      element={<Navigate to="/organization/billing" replace />}
                    />
                  </Route>

                  <Route
                    path="*"
                    element={<Navigate to="/organization/general" replace />}
                  />
                </Route>

                {/* Legacy URLs — pure redirects, so the destination's own rules decide
                  who may see them (see lib/legacyRoutes for the full mapping). */}
                <Route path="/profile" element={<LegacyRedirect />} />
                <Route path="/invitations" element={<LegacyRedirect />} />
                <Route path="/team" element={<LegacyRedirect />} />

                {/* Management routes — org_admin+ only. Editors hitting these via direct
                  URL are redirected to /dashboard (backend also blocks the mutations). */}
                <Route
                  element={
                    <RoleGuard minRole="org_admin" redirectTo="/dashboard" />
                  }
                >
                  <Route
                    path="/projects/new"
                    element={<Navigate to="/projects?new=1" replace />}
                  />
                  <Route
                    path="/projects/:id/jobs/new"
                    element={<CreateJob />}
                  />
                  <Route path="/audit-logs" element={<AuditLogPage />} />
                  <Route
                    path="/projects/:id/connections"
                    element={<ProjectConnections />}
                  />
                  <Route path="/connections" element={<ConnectionsPage />} />
                  <Route
                    path="/setup-organisation"
                    element={<SetupOrganisation />}
                  />
                  <Route path="/org-admin" element={<OrgAdminDashboard />} />
                </Route>
              </Route>

              {/* Platform administration has an exact-role route boundary and uses
                the shared shell with platform navigation and data scope. */}
              <Route element={<ExactRoleGuard role="super_admin" />}>
                <Route path="/super-admin" element={<SuperAdminLayout />}>
                  <Route
                    index
                    element={<Navigate to="/super-admin/overview" replace />}
                  />
                  <Route path="overview" element={<OverviewPage />} />
                  <Route path="profile" element={<PlatformProfilePage />} />
                  <Route path="organisations" element={<OrganisationsPage />} />
                  <Route
                    path="organisations/:organisationId"
                    element={<OrganisationScopeLayout />}
                  >
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route
                      path="overview"
                      element={<OrganisationDetailPage />}
                    />
                    <Route
                      path="members"
                      element={<OrganisationMembersPage />}
                    />
                    <Route
                      path="projects"
                      element={<OrganisationProjectsPage />}
                    />
                    <Route
                      path="projects/:projectId"
                      element={<OrganisationProjectDetailPage />}
                    />
                    <Route
                      path="projects/:projectId/jobs/:jobId"
                      element={<OrganisationJobDetailPage />}
                    />
                    <Route
                      path="projects/:projectId/associations"
                      element={
                        <ProjectSettingsLegacyRedirect section="associations" />
                      }
                    />
                    <Route
                      path="projects/:projectId/migration"
                      element={
                        <ProjectSettingsLegacyRedirect section="environments" />
                      }
                    />
                    <Route
                      path="billing"
                      element={<OrganisationBillingPage />}
                    />
                    <Route
                      path="activity"
                      element={<OrganisationActivityPage />}
                    />
                    <Route
                      path="support"
                      element={<OrganisationSupportPage />}
                    />
                  </Route>
                  <Route path="users" element={<UsersPage />} />
                  <Route
                    path="super-admins"
                    element={
                      <Navigate
                        to="/super-admin/users?tab=super-admins"
                        replace
                      />
                    }
                  />
                  <Route path="marketing" element={<MarketingPage />} />
                  <Route
                    path="projects"
                    element={
                      <Navigate to="/super-admin/organisations" replace />
                    }
                  />
                  <Route path="plans" element={<PlanManagementPage />} />
                  <Route
                    path="discounts"
                    element={<DiscountManagementPage />}
                  />
                  <Route
                    path="failed-payments"
                    element={<FailedPaymentsPage />}
                  />
                  <Route path="system" element={<SystemSettingsPage />} />
                  <Route path="audit-log" element={<PlatformAuditPage />} />
                  <Route
                    path="*"
                    element={<Navigate to="/super-admin/overview" replace />}
                  />
                </Route>
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </SynkazoAuthProvider>
      </Router>
      <ConfirmDialog />
      <Toaster
        position="top-right"
        theme="light"
        closeButton
        expand={false}
        visibleToasts={4}
        duration={3500}
        richColors={true}
      />
    </QueryClientProvider>
  );
}

export default App;
