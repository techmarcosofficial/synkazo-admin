import { PageLoader } from '@/components/ui/brand-loader';
import { useGlobalLoaderStore } from '@/stores/useGlobalLoaderStore';

export { PageLoader } from '@/components/ui/brand-loader';

// The single full-screen loading experience in the app — shown only while
// the initial session/auth check resolves. Never trigger this for
// per-request loading; use skeletons for that instead.
export default function GlobalLoader() {
  const isVisible = useGlobalLoaderStore((s) => s.isVisible);

  if (!isVisible) return null;

  return <PageLoader />;
}
