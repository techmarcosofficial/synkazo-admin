import { Navigate } from 'react-router-dom';

import WorkspaceShell from '@/components/layout/workspace-shell';
import GlobalLoader from '@/components/shared/GlobalLoader';
import { useSynkazoAuth } from '@/lib/synkazoAuth';

/** Route-specific gate and configuration; shell markup is shared with tenants. */
export default function SuperAdminLayout() {
  const { currentUser, isLoading } = useSynkazoAuth();

  if (isLoading) return <GlobalLoader />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== 'super_admin')
    return <Navigate to="/dashboard" replace />;

  return <WorkspaceShell kind="platform" />;
}
