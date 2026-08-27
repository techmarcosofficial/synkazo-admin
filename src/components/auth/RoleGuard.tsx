import { type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { type UserRole, type Permission } from '@/types';

/**
 * RoleGuard — wraps routes or UI sections to enforce role/permission checks.
 *
 * Usage as route guard:
 *   <Route element={<RoleGuard minRole="org_admin" redirectTo="/dashboard" />}>
 *     <Route path="/admin" element={<AdminPage />} />
 *   </Route>
 *
 * Usage as UI guard (hides children instead of redirecting):
 *   <RoleGuard permission="user.invite" silent>
 *     <InviteButton />
 *   </RoleGuard>
 */

interface RoleGuardProps {
  minRole?: UserRole;
  permission?: Permission;
  children?: ReactNode;
  silent?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export default function RoleGuard({
  minRole,
  permission,
  children,
  silent = false,
  redirectTo = '/dashboard',
  fallback = null,
}: RoleGuardProps) {
  const { currentUser, isLoading, hasRole, hasPermission } = useSynkazoAuth();

  if (isLoading) return null;

  const allowed = (() => {
    if (!currentUser) return false;
    if (minRole && !hasRole(minRole)) return false;
    if (permission && !hasPermission(permission)) return false;
    return true;
  })();

  if (!allowed) {
    if (!silent && !children) return <Navigate to={redirectTo} replace />;
    return fallback || null;
  }

  if (!children) return <Outlet />;

  return <>{children}</>;
}
