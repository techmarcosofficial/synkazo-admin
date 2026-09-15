import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { type UserRole } from '@/types';

/**
 * Route guard for whole areas that a role cannot reach at all.
 *
 *   <Route element={<RoleGuard minRole="org_admin" redirectTo="/dashboard" />}>
 *     <Route path="/audit-logs" element={<AuditLogPage />} />
 *   </Route>
 *
 * Not for gating parts of a page. Sections whose tabs vary by role
 * (/settings, /organization) are driven by lib/sectionTabs instead, so the tab
 * strip and the route protection read one rule rather than two; use
 * useSectionAccess() for view-vs-edit within a tab.
 */
interface RoleGuardProps {
  minRole: UserRole;
  redirectTo?: string;
}

export default function RoleGuard({
  minRole,
  redirectTo = '/dashboard',
}: RoleGuardProps) {
  const { currentUser, isLoading, hasRole } = useSynkazoAuth();

  // Unreachable in practice — AppLayout resolves the session before rendering
  // any of these routes. Kept as a shell-consistent fallback rather than a bare
  // null, so a future route restructure cannot produce a blank main region.
  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!currentUser || !hasRole(minRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
