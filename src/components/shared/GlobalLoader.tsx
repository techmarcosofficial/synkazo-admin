import { SynkazoWordmark } from '@/components/branding/SynkazoMark';
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
      <div className="animate-sb-pulse">
        <SynkazoWordmark
          className="h-10 w-auto text-foreground"
          tone="auto"
        />
      </div>
      <Spinner className="text-muted-foreground size-5" />
    </div>
  );
}
