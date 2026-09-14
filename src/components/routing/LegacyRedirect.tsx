import { Navigate, useLocation } from 'react-router-dom';

import { resolveLegacyLocation } from '@/lib/legacyRoutes';

/**
 * Forwards a pre-refactor URL to its replacement. Reads the whole location
 * rather than taking a hardcoded `section` prop, so one element covers every
 * legacy shape and new mappings are added in legacyRoutes.ts alone.
 */
export default function LegacyRedirect({
  fallback = '/dashboard',
}: {
  fallback?: string;
}) {
  const { pathname, search } = useLocation();
  const to = resolveLegacyLocation(pathname, search) ?? fallback;
  return <Navigate to={to} replace />;
}
