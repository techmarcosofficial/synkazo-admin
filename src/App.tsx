import { QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { Toaster } from '@/components/ui/sonner';
import { queryClientInstance } from '@/lib/query-client';
import { SETTINGS_SECTION } from '@/lib/sectionTabs';
import { SynkazoAuthProvider, useSynkazoAuth } from '@/lib/synkazoAuth';

// Global UI
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import GlobalLoader from '@/components/shared/GlobalLoader';

// Layout
// import AppLayout from '@/components/layout/AppLayout';
import AppLayout from './components/layout/app-layout';

// Auth pages
import DiscountManagementPage from '@/pages/admin/DiscountManagementPage';
import PlanManagementPage from '@/pages/admin/PlanManagementPage';
import AuditLogPage from '@/pages/audit/AuditLogPage';
import AcceptInvite from '@/pages/auth/AcceptInvite';
import AuthCallback from '@/pages/auth/AuthCallback';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import Login from '@/pages/auth/Login';
import RegistrationGate from '@/pages/auth/RegistrationGate';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import CheckoutPage from '@/pages/checkout/CheckoutPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import Dashboard from '@/pages/dashboard/Dashboard';
import EditorDashboard from '@/pages/dashboard/EditorDashboard';
import OrgAdminDashboard from '@/pages/dashboard/OrgAdminDashboard';
import CreateJob from '@/pages/jobs/CreateJob';
import JobDetail from '@/pages/jobs/JobDetail';
import Jobs from '@/pages/jobs/Jobs';
import BillingLayout from '@/pages/organisation/billing/BillingLayout';
import BillingOverviewTab from '@/pages/organisation/billing/tabs/BillingOverviewTab';
import InvoicesTab from '@/pages/organisation/billing/tabs/InvoicesTab';
import PaymentHistoryTab from '@/pages/organisation/billing/tabs/PaymentHistoryTab';
import PaymentMethodsTab from '@/pages/organisation/billing/tabs/PaymentMethodsTab';
import SubscriptionTab from '@/pages/organisation/billing/tabs/SubscriptionTab';
import OrganizationLayout from '@/pages/organisation/OrganizationLayout';
import SetupOrganisation from '@/pages/organisation/SetupOrganisation';
import OrgGeneralTab from '@/pages/organisation/tabs/OrgGeneralTab';
import OrgInvitationsTab from '@/pages/organisation/tabs/OrgInvitationsTab';
import OrgMembersTab from '@/pages/organisation/tabs/OrgMembersTab';
import ProjectConnections from '@/pages/projects/ProjectConnections';
import ProjectDetail from '@/pages/projects/ProjectDetail';
import SchedulerHealth from '@/pages/SchedulerHealth';
import PreferencesTab from '@/pages/settings/tabs/PreferencesTab';
import ProfileTab from '@/pages/settings/tabs/ProfileTab';
import SecurityTab from '@/pages/settings/tabs/SecurityTab';
import OrganisationsPage from '@/pages/superadmin/OrganisationsPage';
import MarketingPage from '@/pages/superadmin/MarketingPage';
import PlatformAuditPage from '@/pages/superadmin/PlatformAuditPage';
import SuperAdminProjectsPage from '@/pages/superadmin/ProjectsPage';
import SuperAdminPage from '@/pages/superadmin/SuperAdminPage';
import SystemSettingsPage from '@/pages/superadmin/SystemSettingsPage';
import UsersPage from '@/pages/superadmin/UsersPage';

// App pages
import ActiveSyncs from '@/pages/sync/ActiveSyncs';
import LogsPage from '@/pages/sync/LogsPage';
import WelcomeOnboarding from '@/pages/WelcomeOnboarding';
import RoleGuard from '@/components/auth/RoleGuard';
import SectionTabsLayout from '@/components/layout/SectionTabsLayout';
import LegacyRedirect from '@/components/routing/LegacyRedirect';

import PageNotFound from './lib/PageNotFound';
import ProjectsPage from './pages/projects/ProjectsPage';

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
      to={`${currentUser ? '/dashboard' : '/login'}${search}`}
      replace
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <SynkazoAuthProvider>
          <Routes>
            {/* Public — no layout */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegistrationGate />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/welcome" element={<WelcomeOnboarding />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* Protected — AppLayout checks auth and redirects to /login if not authenticated */}
            <Route element={<AppLayout />}>
              {/* Viewable by all authenticated roles (editor+) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/jobs/:jobId" element={<JobDetail />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/active-syncs" element={<ActiveSyncs />} />
              <Route path="/scheduler" element={<SchedulerHealth />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/editor" element={<EditorDashboard />} />

              {/* Settings — personal. Every authenticated role; no guard, because
                  every tab here is about the signed-in user's own account. */}
              <Route
                path="/settings"
                element={<SectionTabsLayout section={SETTINGS_SECTION} />}
              >
                <Route
                  index
                  element={<LegacyRedirect fallback="/settings/preferences" />}
                />
                <Route path="preferences" element={<PreferencesTab />} />
                <Route path="profile" element={<ProfileTab />} />
                <Route path="security" element={<SecurityTab />} />
                {/* Billing moved out of personal settings entirely. */}
                <Route path="billing" element={<LegacyRedirect />} />
                <Route
                  path="*"
                  element={<Navigate to="/settings/preferences" replace />}
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

                {/* Third level — sub-views of one area, so a rail beside the
                    content rather than a second tab row (see BillingLayout). */}
                <Route path="billing" element={<BillingLayout />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<BillingOverviewTab />} />
                  <Route path="subscription" element={<SubscriptionTab />} />
                  <Route
                    path="payment-methods"
                    element={<PaymentMethodsTab />}
                  />
                  <Route path="invoices" element={<InvoicesTab />} />
                  <Route
                    path="payment-history"
                    element={<PaymentHistoryTab />}
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
                <Route path="/projects/:id/jobs/new" element={<CreateJob />} />
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

              {/* Platform administration — super_admin only */}
              <Route
                element={
                  <RoleGuard minRole="super_admin" redirectTo="/dashboard" />
                }
              >
                <Route path="/super-admin" element={<SuperAdminPage />} />
                <Route
                  path="/super-admin/organisations"
                  element={<OrganisationsPage />}
                />
                <Route path="/super-admin/users" element={<UsersPage />} />
                <Route
                  path="/super-admin/marketing"
                  element={<MarketingPage />}
                />
                <Route
                  path="/super-admin/projects"
                  element={<SuperAdminProjectsPage />}
                />
                <Route
                  path="/super-admin/plans"
                  element={<PlanManagementPage />}
                />
                <Route
                  path="/super-admin/discounts"
                  element={<DiscountManagementPage />}
                />
                <Route
                  path="/super-admin/system"
                  element={<SystemSettingsPage />}
                />
                <Route
                  path="/super-admin/audit-log"
                  element={<PlatformAuditPage />}
                />
              </Route>
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
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
