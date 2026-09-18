import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { useSynkazoAuth } from '@/lib/synkazoAuth';
import { type UserRole } from '@/types';

interface ExactRoleGuardProps {
  role: UserRole;
  redirectTo?: string;
}

// Guard that requires the current user's role to match `role` exactly, not
// just meet-or-exceed it (which is what RoleGuard does via ROLE_HIERARCHY).
// Used for the Super Admin workspace, whose bounded blast radius means we do
// not want a future higher role to inherit access implicitly.
export default function ExactRoleGuard({
  role,
  redirectTo = '/dashboard',
}: ExactRoleGuardProps) {
  const { currentUser, isLoading } = useSynkazoAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
