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
import { SynkazoAuthProvider, useSynkazoAuth } from '@/lib/synkazoAuth';

// `/profile` and `/settings/billing` were merged into `/settings` (see SettingsPage's Tabs).
// This keeps old bookmarks/links working by forwarding to the right tab, preserving any
// query params (e.g. `?tab=payment`, `?checkout=success`) already on the URL.
function SettingsSectionRedirect({
  section,
}: {
  section: 'profile' | 'billing';
}) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('section', section);
  return <Navigate to={`/settings?${params.toString()}`} replace />;
}

// Global UI
import ConfirmDialog from '@/components/shared/ConfirmDialog';

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
import Register from '@/pages/auth/Register';
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
import InvitationsPage from '@/pages/organisation/InvitationsPage';
import OrganizationPage from '@/pages/organisation/OrganizationPage';
import SetupOrganisation from '@/pages/organisation/SetupOrganisation';
import ProjectConnections from '@/pages/projects/ProjectConnections';
import ProjectDetail from '@/pages/projects/ProjectDetail';
import SchedulerHealth from '@/pages/SchedulerHealth';
import SettingsPage from '@/pages/settings/SettingsPage';
import OrganisationsPage from '@/pages/superadmin/OrganisationsPage';
import PlatformAuditPage from '@/pages/superadmin/PlatformAuditPage';
import SuperAdminProjectsPage from '@/pages/superadmin/ProjectsPage';
import SuperAdminPage from '@/pages/superadmin/SuperAdminPage';
import SystemSettingsPage from '@/pages/superadmin/SystemSettingsPage';
import UsersPage from '@/pages/superadmin/UsersPage';

// App pages
import ActiveSyncs from '@/pages/sync/ActiveSyncs';
import LogsPage from '@/pages/sync/LogsPage';
import MetricsPage from '@/pages/sync/MetricsPage';
import WelcomeOnboarding from '@/pages/WelcomeOnboarding';
import RoleGuard from '@/components/auth/RoleGuard';

import PageNotFound from './lib/PageNotFound';
import ProjectsPage from './pages/projects/ProjectsPage';

// This app only ever serves app.synkazo.com — "/" has no landing page of its own,
// it just sends the visitor to whichever authenticated-vs-not page is correct.
// Preserves the query string so a HubSpot-error redirect (`?hubspot_error=...`)
// landing on bare "/" doesn't lose it.
function RootRedirect() {
  const { currentUser, isLoading } = useSynkazoAuth();
  const { search } = useLocation();
  if (isLoading) return null;
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
            <Route path="/register" element={<Register />} />
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
              <Route path="/metrics" element={<MetricsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/profile"
                element={<SettingsSectionRedirect section="profile" />}
              />
              <Route path="/editor" element={<EditorDashboard />} />

              {/* Management routes — org_admin+ only. Editors hitting these via direct
                  URL are redirected to /dashboard (backend also blocks the mutations). */}
              <Route
                element={
                  <RoleGuard minRole="org_admin" redirectTo="/dashboard" />
                }
              >
                <Route path="/organization" element={<OrganizationPage />} />
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
                  path="/team"
                  element={<Navigate to="/organization" replace />}
                />
                <Route
                  path="/setup-organisation"
                  element={<SetupOrganisation />}
                />
                <Route path="/org-admin" element={<OrgAdminDashboard />} />
                <Route path="/invitations" element={<InvitationsPage />} />
                <Route
                  path="/settings/billing"
                  element={<SettingsSectionRedirect section="billing" />}
                />
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
