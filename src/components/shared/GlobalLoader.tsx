import { RefreshCw } from 'lucide-react';

import { Spinner } from '@/components/ui/spinner';
import { useGlobalLoaderStore } from '@/stores/useGlobalLoaderStore';

// The single full-screen loading experience in the app — shown only while
// the initial session/auth check resolves. Never trigger this for
// per-request loading; use skeletons for that instead.
export default function GlobalLoader() {
  const isVisible = useGlobalLoaderStore((s) => s.isVisible);

  if (!isVisible) return null;

  return (
    <div className="bg-background fixed inset-0 z-[60] flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="animate-sb-pulse flex flex-col items-center gap-3">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-12 items-center justify-center rounded-2xl">
          <RefreshCw className="size-6" />
        </div>
        <span className="text-lg font-bold tracking-tight">Synkazo</span>
      </div>
      <Spinner className="text-muted-foreground size-5" />
    </div>
  );
}
