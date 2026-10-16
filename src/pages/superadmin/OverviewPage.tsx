import { useSearchParams } from 'react-router-dom';
import LegacyOverviewPage from './LegacyOverviewPage';
import PlatformAnalyticsDashboard from './analytics/PlatformAnalyticsDashboard';

export default function OverviewPage() {
  const [params] = useSearchParams();
  const enabled =
    import.meta.env.VITE_PLATFORM_ANALYTICS_ENABLED ??
    (import.meta.env.DEV ? 'true' : 'false');
  return params.get('view') === 'classic' || enabled !== 'true' ? (
    <LegacyOverviewPage />
  ) : (
    <PlatformAnalyticsDashboard />
  );
}
