import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Legacy profile redirect for platform administrators.
 * Redirects to the unified platform settings section.
 */
export default function PlatformProfilePage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  if (tab === 'preferences') {
    return <Navigate to="/super-admin/settings/preferences" replace />;
  }
  return <Navigate to="/super-admin/settings/profile" replace />;
}
